import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ObjectId, type Db } from "mongodb";
import { ZodError } from "zod";
import { getDb } from "./db";
import { walled } from "./walled";
import { roleOf, type Role } from "./rbac";
import { DEMO_VIEW_COOKIE } from "./view";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export type ShopContext = {
  db: Db;
  shopId: ObjectId;
  /** Clerk user id of the signed-in owner */
  userId: string;
  /** True while a visitor is exploring the shared, view only demo shop instead of their own. */
  demo: boolean;
  /** Shop-walled collection accessor — see walled.ts */
  w: ReturnType<typeof walled>;
};

type Handler<P> = (req: NextRequest, ctx: ShopContext, params: P) => Promise<Response>;

/** Clerk user id of the current request, or a 401. */
export async function requireUser(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new HttpError(401, "Please sign in.");
  return userId;
}

/**
 * Wraps a route handler: requires a Clerk session, finds the shop that user owns and
 * hands the handler a shop-walled DB context. Signed in but no shop yet: 409 NO_SHOP,
 * which sends the client to onboarding.
 */
export function withShop<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: NextRequest, route: { params: Promise<P> }) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) assertSameOrigin(req);
      const userId = await requireUser();
      const db = await getDb();

      // Which shop does this request see?
      //  1. A user with their own shop sees it, unless they chose to look at the demo (cookie).
      //  2. A user without a shop yet sees the demo shop by default (Thandi's Spaza, sample data).
      // The demo shop is view only for everyone but its owner, and every other shop stays walled.
      const own = await db.collection("shops").findOne({ ownerUserId: userId }, { projection: { _id: 1 } });
      const wantsDemo = !own || req.cookies.get(DEMO_VIEW_COOKIE)?.value === "1";
      if (wantsDemo) {
        const demoShop = await db.collection("shops").findOne({ isDemo: true }, { projection: { _id: 1, ownerUserId: 1 } });
        if (demoShop && demoShop.ownerUserId !== userId) {
          if (!["GET", "HEAD"].includes(req.method)) {
            throw new HttpError(
              403,
              own
                ? "This is Thandi's demo shop, so it is view only. Switch back to your own shop to make changes."
                : "This is Thandi's demo shop, so it is view only. Register your own shop to start making changes.",
              "DEMO_READ_ONLY",
            );
          }
          const shopId = demoShop._id as ObjectId;
          return await handler(req, { db, shopId, userId, demo: true, w: walled(db, shopId) }, await route.params);
        }
      }

      if (!own) throw new HttpError(409, "Register your shop to continue.", "NO_SHOP");
      const shopId = own._id as ObjectId;
      const ctx = { db, shopId, userId, demo: false, w: walled(db, shopId) };
      return await handler(req, ctx, await route.params);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** Wraps a route handler that only needs a signed-in Clerk user (e.g. shop registration). */
export function withUser<P = Record<string, never>>(
  handler: (req: NextRequest, ctx: { db: Db; userId: string }, params: P) => Promise<Response>,
) {
  return async (req: NextRequest, route: { params: Promise<P> }) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) assertSameOrigin(req);
      const userId = await requireUser();
      return await handler(req, { db: await getDb(), userId }, await route.params);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** Role of the signed-in user, read server side from Clerk (users cannot set their own role). */
export async function requireRole(): Promise<{ userId: string; role: Role; name: string }> {
  const userId = await requireUser();
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in.");
  return { userId, role: roleOf(user.publicMetadata), name: user.fullName ?? user.username ?? "Admin" };
}

/** Wraps an admin route: platform admins only. Every other role gets 403. */
export function withAdmin<P = Record<string, never>>(
  handler: (req: NextRequest, ctx: { db: Db; userId: string; name: string }, params: P) => Promise<Response>,
) {
  return async (req: NextRequest, route: { params: Promise<P> }) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) assertSameOrigin(req);
      const { userId, role, name } = await requireRole();
      if (role !== "admin") throw new HttpError(403, "This area is for platform admins only.", "FORBIDDEN");
      return await handler(req, { db: await getDb(), userId, name }, await route.params);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** CSRF defence in depth on top of Clerk's SameSite session cookies. */
function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) throw new HttpError(403, "Cross-site request refused.");
}

export function errorResponse(err: unknown) {
  // Let Next.js control-flow signals (e.g. prerender bail-out on request data) through.
  unstable_rethrow(err);
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first?.path.join(".");
    return NextResponse.json(
      { error: field ? `${field}: ${first.message}` : (first?.message ?? "Invalid input") },
      { status: 400 },
    );
  }
  console.error("[api] unhandled error", err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export function parseId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new HttpError(404, "Not found.");
  return new ObjectId(id);
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}
