import { NextResponse } from "next/server";
import { MongoServerError } from "mongodb";
import { HttpError, readJson, withAdmin } from "@/lib/api";
import { allSuppliers } from "@/lib/admin";
import { supplierCreateSchema } from "@/lib/validation";

export const GET = withAdmin(async (_req, { db }) => NextResponse.json({ suppliers: await allSuppliers(db) }));

export const POST = withAdmin(async (req, { db, userId }) => {
  const input = supplierCreateSchema.parse(await readJson(req));
  const key = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  try {
    await db.collection("suppliers").insertOne({ key, ...input, createdAt: new Date(), createdBy: userId });
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) throw new HttpError(409, "A supplier with that name already exists.");
    throw err;
  }
  return NextResponse.json({ suppliers: await allSuppliers(db) }, { status: 201 });
});
