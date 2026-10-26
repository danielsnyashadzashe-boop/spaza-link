import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { HttpError, readJson, withAdmin } from "@/lib/api";
import { allProducts } from "@/lib/admin";
import { productCreateSchema } from "@/lib/validation";

export const GET = withAdmin(async (_req, { db }) => NextResponse.json({ products: await allProducts(db) }));

export const POST = withAdmin(async (req, { db, userId }) => {
  const input = productCreateSchema.parse(await readJson(req));
  const supplierId = new ObjectId(input.supplierId);
  if (!(await db.collection("suppliers").findOne({ _id: supplierId }))) throw new HttpError(400, "That supplier does not exist.");
  const sku = `${input.name}${input.unit}`.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 24) + Date.now().toString(36).toUpperCase();
  await db.collection("products").insertOne({ ...input, supplierId, sku, createdAt: new Date(), createdBy: userId });
  return NextResponse.json({ products: await allProducts(db) }, { status: 201 });
});
