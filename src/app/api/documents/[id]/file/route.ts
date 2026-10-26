import { Readable } from "node:stream";
import { getFileBucket } from "@/lib/db";
import { HttpError, parseId, withShop } from "@/lib/api";

export const GET = withShop<{ id: string }>(async (_req, ctx, { id }) => {
  // The walled lookup proves this shop owns the record before any bytes are served.
  const doc = await ctx.w("compliance_documents").findOne({ _id: parseId(id) });
  if (!doc) throw new HttpError(404, "Document not found.");
  const stream = (await getFileBucket()).openDownloadStream(doc.fileId);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `inline; filename="${doc.filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
});
