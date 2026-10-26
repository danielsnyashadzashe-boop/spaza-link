import { NextResponse } from "next/server";
import { HttpError, parseId, readJson, withAdmin } from "@/lib/api";
import { allSuppliers } from "@/lib/admin";
import { supplierUpdateSchema } from "@/lib/validation";

/** Verify, hold or reject a wholesaler. Products of unverified wholesalers vanish from every shop at once. */
export const PATCH = withAdmin<{ id: string }>(async (req, { db, userId }, { id }) => {
  const input = supplierUpdateSchema.parse(await readJson(req));
  const { matchedCount } = await db
    .collection("suppliers")
    .updateOne({ _id: parseId(id) }, { $set: { ...input, updatedAt: new Date(), updatedBy: userId } });
  if (!matchedCount) throw new HttpError(404, "Supplier not found.");
  return NextResponse.json({ suppliers: await allSuppliers(db) });
});
