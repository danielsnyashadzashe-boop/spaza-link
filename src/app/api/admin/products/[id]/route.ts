import { NextResponse } from "next/server";
import { HttpError, parseId, readJson, withAdmin } from "@/lib/api";
import { allProducts } from "@/lib/admin";
import { productUpdateSchema } from "@/lib/validation";

/** Change a product's price, bulk deal or verification. Shops see the change on their next page load. */
export const PATCH = withAdmin<{ id: string }>(async (req, { db, userId }, { id }) => {
  const input = productUpdateSchema.parse(await readJson(req));
  const set = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
  const { matchedCount } = await db
    .collection("products")
    .updateOne({ _id: parseId(id) }, { $set: { ...set, updatedAt: new Date(), updatedBy: userId } });
  if (!matchedCount) throw new HttpError(404, "Product not found.");
  return NextResponse.json({ products: await allProducts(db) });
});
