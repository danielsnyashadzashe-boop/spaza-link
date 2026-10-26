import { NextResponse } from "next/server";
import { MongoServerError } from "mongodb";
import { HttpError, readJson, requireRole, withUser } from "@/lib/api";
import { shopSchema } from "@/lib/validation";
import { DEMO_VIEW_COOKIE } from "@/lib/view";

/** Has the signed-in Clerk user registered a shop yet? Admins are routed to the admin portal instead. */
export const GET = withUser(async (_req, { db, userId }) => {
  const [shop, { role }] = await Promise.all([
    db.collection("shops").findOne({ ownerUserId: userId }, { projection: { _id: 1 } }),
    requireRole(),
  ]);
  return NextResponse.json({ registered: Boolean(shop), role });
});

/** Register the signed-in user's shop (one per Clerk user). */
export const POST = withUser(async (req, { db, userId }) => {
  const input = shopSchema.parse(await readJson(req));
  try {
    await db.collection("shops").insertOne({
      ownerUserId: userId,
      ownerName: input.ownerName,
      name: input.shopName,
      location: input.location,
      phone: input.phone,
      createdAt: new Date(),
    });
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      throw new HttpError(409, "You have already registered a shop.", "SHOP_EXISTS");
    }
    throw err;
  }
  // From now on they see their own shop, never the demo shop's data.
  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(DEMO_VIEW_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
});
