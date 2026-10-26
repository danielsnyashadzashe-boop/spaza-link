import "server-only";
import type { Db, Document, Filter, FindOptions, ObjectId, OptionalUnlessRequiredId, UpdateFilter } from "mongodb";

/**
 * Application-level Row Level Security.
 *
 * MongoDB has no RLS, so every shop-owned collection is reached only through this
 * wrapper. It forces `shopId` (taken from the signed session, never from the request)
 * into every filter, insert and aggregation — written last so a caller can't override it.
 */
export const WALLED_COLLECTIONS = [
  "compliance_documents",
  "stock_items",
  "orders",
  "order_items",
  "order_status_events",
  "payments",
] as const;
export type WalledCollection = (typeof WALLED_COLLECTIONS)[number];

export function walled(db: Db, shopId: ObjectId) {
  return function collection<T extends Document = Document>(name: WalledCollection) {
    const c = db.collection<T>(name);
    const wall = (filter: Filter<T> = {}) => ({ ...filter, shopId }) as Filter<T>;
    return {
      find: (filter?: Filter<T>, options?: FindOptions) => c.find(wall(filter), options),
      findOne: (filter?: Filter<T>) => c.findOne(wall(filter)),
      countDocuments: (filter?: Filter<T>) => c.countDocuments(wall(filter)),
      insertOne: (doc: Omit<T, "_id" | "shopId">) =>
        c.insertOne({ ...doc, shopId } as unknown as OptionalUnlessRequiredId<T>),
      insertMany: (docs: Omit<T, "_id" | "shopId">[]) =>
        c.insertMany(docs.map((d) => ({ ...d, shopId })) as unknown as OptionalUnlessRequiredId<T>[]),
      updateOne: (filter: Filter<T>, update: UpdateFilter<T>) => c.updateOne(wall(filter), update),
      deleteOne: (filter: Filter<T>) => c.deleteOne(wall(filter)),
      aggregate: <R extends Document>(pipeline: Document[]) =>
        c.aggregate<R>([{ $match: { shopId } }, ...pipeline]),
    };
  };
}
