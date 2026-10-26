import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, readJson, withUser } from "@/lib/api";
import { DEMO_VIEW_COOKIE } from "@/lib/view";

const schema = z.object({ mode: z.enum(["demo", "own"]) });

/** Switch between exploring the view only demo shop and the signed-in owner's own shop. */
export const POST = withUser(async (req, { db, userId }) => {
  const { mode } = schema.parse(await readJson(req));
  const ownShop = await db.collection("shops").findOne({ ownerUserId: userId }, { projection: { _id: 1 } });

  if (mode === "demo") {
    if (!(await db.collection("shops").findOne({ isDemo: true }, { projection: { _id: 1 } }))) {
      throw new HttpError(404, "The demo shop is not available right now.");
    }
    const res = NextResponse.json({ mode, next: "/dashboard" });
    res.cookies.set(DEMO_VIEW_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  }

  const res = NextResponse.json({ mode, next: ownShop ? "/dashboard" : "/onboarding" });
  res.cookies.set(DEMO_VIEW_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
});
