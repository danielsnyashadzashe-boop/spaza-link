import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getFileBucket } from "@/lib/db";
import { HttpError, withShop } from "@/lib/api";
import { getCompliance } from "@/lib/services";
import { inspectUpload, MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { documentTypeSchema } from "@/lib/validation";

export const GET = withShop(async (_req, ctx) => NextResponse.json(await getCompliance(ctx)));

export const POST = withShop(async (req, ctx) => {
  // Refuse obviously oversized bodies before buffering them.
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) throw new HttpError(413, "File is too large. The limit is 5 MB.");

  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Upload must be sent as a form.");
  });
  const type = documentTypeSchema.parse(form.get("type"));
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose a file to upload.");
  const { bytes, mime, filename } = await inspectUpload(file);

  const bucket = await getFileBucket();
  const upload = bucket.openUploadStream(filename, {
    metadata: { shopId: ctx.shopId, type, contentType: mime },
  });
  await pipeline(Readable.from(bytes), upload);

  // One live document per type: replace any earlier upload.
  const previous = await ctx.w("compliance_documents").find({ type }).toArray();
  await ctx.w("compliance_documents").insertOne({
    type,
    fileId: upload.id,
    filename,
    mime,
    size: bytes.length,
    uploadedAt: new Date(),
  });
  for (const doc of previous) {
    await ctx.w("compliance_documents").deleteOne({ _id: doc._id });
    await bucket.delete(doc.fileId).catch(() => undefined);
  }

  return NextResponse.json(await getCompliance(ctx), { status: 201 });
});
