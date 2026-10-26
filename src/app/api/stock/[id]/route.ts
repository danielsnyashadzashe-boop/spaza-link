import { NextResponse } from "next/server";
import { HttpError, parseId, readJson, withShop } from "@/lib/api";
import { listStock } from "@/lib/stock";
import { stockUpdateSchema } from "@/lib/validation";

export const PATCH = withShop<{ id: string }>(async (req, ctx, { id }) => {
  const input = stockUpdateSchema.parse(await readJson(req));
  const current = await ctx.w("stock_items").findOne({ _id: parseId(id) });
  if (!current) throw new HttpError(404, "Stock item not found.");
  const quantity = input.quantity ?? current.quantity;
  const fullCapacity = input.fullCapacity ?? current.fullCapacity;
  if (quantity > fullCapacity) throw new HttpError(400, "quantity: cannot be more than full capacity");
  await ctx.w("stock_items").updateOne(
    { _id: current._id },
    { $set: { quantity, fullCapacity, updatedAt: new Date() } },
  );
  return NextResponse.json({ items: await listStock(ctx) });
});

export const DELETE = withShop<{ id: string }>(async (_req, ctx, { id }) => {
  const { deletedCount } = await ctx.w("stock_items").deleteOne({ _id: parseId(id) });
  if (!deletedCount) throw new HttpError(404, "Stock item not found.");
  return NextResponse.json({ items: await listStock(ctx) });
});
