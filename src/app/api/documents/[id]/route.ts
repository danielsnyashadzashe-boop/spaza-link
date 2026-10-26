import { NextResponse } from "next/server";
import { getFileBucket } from "@/lib/db";
import { HttpError, parseId, withShop } from "@/lib/api";
import { getCompliance } from "@/lib/services";

export const DELETE = withShop<{ id: string }>(async (_req, ctx, { id }) => {
  const doc = await ctx.w("compliance_documents").findOne({ _id: parseId(id) });
  if (!doc) throw new HttpError(404, "Document not found.");
  await ctx.w("compliance_documents").deleteOne({ _id: doc._id });
  await (await getFileBucket()).delete(doc.fileId).catch(() => undefined);
  return NextResponse.json(await getCompliance(ctx));
});
