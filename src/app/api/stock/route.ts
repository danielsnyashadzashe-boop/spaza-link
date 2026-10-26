import { NextResponse } from "next/server";
import { ObjectId, MongoServerError } from "mongodb";
import { HttpError, readJson, withShop } from "@/lib/api";
import { verifiedCatalogue } from "@/lib/catalogue";
import { listStock } from "@/lib/stock";
import { stockCreateSchema } from "@/lib/validation";

export const GET = withShop(async (_req, ctx) => NextResponse.json({ items: await listStock(ctx) }));

export const POST = withShop(async (req, ctx) => {
  const input = stockCreateSchema.parse(await readJson(req));
  const productId = new ObjectId(input.productId);
  const [product] = await verifiedCatalogue(ctx.db, [productId]);
  if (!product) throw new HttpError(400, "That product is not in the verified catalogue.");
  try {
    await ctx.w("stock_items").insertOne({
      productId,
      name: product.name,
      unit: product.unit,
      quantity: input.quantity,
      fullCapacity: input.fullCapacity,
      updatedAt: new Date(),
    });
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      throw new HttpError(409, `${product.name} is already on your stock list.`);
    }
    throw err;
  }
  return NextResponse.json({ items: await listStock(ctx) }, { status: 201 });
});
