import "server-only";
import type { Db, ObjectId } from "mongodb";
import type { BulkRule } from "./rules";

export type ProductDoc = {
  _id: ObjectId;
  supplierId: ObjectId;
  name: string;
  unit: string;
  category: string;
  price: number;
  bulkRule: BulkRule | null;
  badges: string[];
  verificationStatus: "VERIFIED" | "PENDING" | "REJECTED";
};

export type SupplierDoc = {
  _id: ObjectId;
  name: string;
  region: string;
  verificationStatus: "VERIFIED" | "PENDING" | "REJECTED";
  badges: string[];
};

export type CatalogueProduct = {
  id: string;
  name: string;
  unit: string;
  category: string;
  price: number;
  bulkRule: BulkRule | null;
  badges: string[];
  supplier: { id: string; name: string; region: string; badges: string[] };
};

/** Only verified products from verified wholesalers are ever listed or sold. */
export async function verifiedCatalogue(db: Db, ids?: ObjectId[]): Promise<CatalogueProduct[]> {
  const suppliers = await db
    .collection<SupplierDoc>("suppliers")
    .find({ verificationStatus: "VERIFIED" })
    .toArray();
  const byId = new Map(suppliers.map((s) => [s._id.toString(), s]));
  const products = await db
    .collection<ProductDoc>("products")
    .find({
      verificationStatus: "VERIFIED",
      supplierId: { $in: suppliers.map((s) => s._id) },
      ...(ids ? { _id: { $in: ids } } : {}),
    })
    .sort({ category: 1, name: 1 })
    .toArray();

  return products.map((p) => {
    const s = byId.get(p.supplierId.toString())!;
    return {
      id: p._id.toString(),
      name: p.name,
      unit: p.unit,
      category: p.category,
      price: p.price,
      bulkRule: p.bulkRule,
      badges: p.badges,
      supplier: { id: s._id.toString(), name: s.name, region: s.region, badges: s.badges },
    };
  });
}
