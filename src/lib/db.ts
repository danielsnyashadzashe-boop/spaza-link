import "server-only";
import { MongoClient, type Db, GridFSBucket } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "spazalink";

declare global {
  var _mongoClient: Promise<MongoClient> | undefined;
  var _indexesReady: Promise<void> | undefined;
}

function client(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI is not set");
  // Reuse one connection pool across hot reloads and warm serverless invocations.
  // A failed attempt (Atlas unreachable, IP not yet allowed) is forgotten so the next request retries
  // instead of replaying the same error until the server restarts.
  global._mongoClient ??= new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 10_000 })
    .connect()
    .catch((err) => {
      global._mongoClient = undefined;
      throw err;
    });
  return global._mongoClient;
}

export async function getDb(): Promise<Db> {
  const db = (await client()).db(dbName);
  // Make sure indexes exist, in the background: requests never wait on it (they already exist after the
  // first run, and the unique indexes are created by the seed before any traffic).
  global._indexesReady ??= ensureIndexes(db).catch((err) => {
    global._indexesReady = undefined;
    console.warn("[db] index check failed; will retry on the next request:", err?.message ?? err);
  });
  return db;
}

export async function getFileBucket(): Promise<GridFSBucket> {
  return new GridFSBucket(await getDb(), { bucketName: "documents" });
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("shops").createIndex({ ownerUserId: 1 }, { unique: true }),
    db.collection("suppliers").createIndex({ key: 1 }, { unique: true }),
    db.collection("products").createIndex({ sku: 1 }, { unique: true }),
    db.collection("compliance_documents").createIndex({ shopId: 1, type: 1 }),
    db.collection("stock_items").createIndex({ shopId: 1, productId: 1 }, { unique: true }),
    db.collection("orders").createIndex({ shopId: 1, createdAt: -1 }),
    db.collection("order_items").createIndex({ shopId: 1, orderId: 1 }),
    db.collection("order_status_events").createIndex({ shopId: 1, orderId: 1, changedAt: 1 }),
    db.collection("payments").createIndex({ shopId: 1, orderId: 1 }),
  ]);
}
