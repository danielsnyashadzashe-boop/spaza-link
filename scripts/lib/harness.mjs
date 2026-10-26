// Shared helpers for the end-to-end test scripts: Clerk sessions, HTTP calls, checks and cleanup.
import { createClerkClient } from "@clerk/backend";
import { MongoClient, ObjectId } from "mongodb";

export const BASE = process.env.BASE_URL ?? "http://localhost:3000";
export const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/** A signed-in Clerk session; its bearer token is re-minted before the 60 s expiry. */
export async function signInAs(userId) {
  const session = await clerk.sessions.createSession({ userId });
  let jwt = null;
  let mintedAt = 0;
  const token = async () => {
    if (!jwt || Date.now() - mintedAt > 40_000) {
      jwt = (await clerk.sessions.getToken(session.id)).jwt;
      // Tolerate a local clock that runs behind Clerk's: wait until the token's issue time has passed here.
      const { iat } = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
      const wait = iat * 1000 - Date.now() + 250;
      if (wait > 0) await new Promise((r) => setTimeout(r, Math.min(wait, 30_000)));
      mintedAt = Date.now();
    }
    return jwt;
  };
  token.revoke = () => clerk.sessions.revokeSession(session.id).catch(() => {});
  return token;
}

export async function userIdFor(email) {
  const { data } = await clerk.users.getUserList({ emailAddress: [email] });
  if (!data[0]) throw new Error(`${email} not found in Clerk, run npm run seed first`);
  return data[0].id;
}

/** Throwaway Clerk user (username / test phone only if the instance still demands them). */
export async function createTestUser(email, firstName = "Test") {
  const base = { emailAddress: [email], password: `T${Date.now()}x!secure`, firstName, lastName: "Shop", skipPasswordChecks: true };
  try {
    return await clerk.users.createUser(base);
  } catch (err) {
    if (!err.errors?.some((e) => e.code === "form_data_missing")) throw err;
    const n = String(Date.now() % 100).padStart(2, "0");
    return clerk.users.createUser({ ...base, username: `test_${Date.now()}`, phoneNumber: [`+155555501${n}`] });
  }
}

export async function call(path, { as, json, body, method, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method: method ?? (json || body ? "POST" : "GET"),
    redirect: "manual",
    headers: {
      ...(as ? { authorization: `Bearer ${await as()}` } : {}),
      ...(json ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: json ? JSON.stringify(json) : body,
  });
  const type = res.headers.get("content-type") ?? "";
  const data = type.includes("json") ? await res.json() : null;
  return { status: res.status, data, res };
}

export const pdfBytes = (size = 2000) => {
  const b = Buffer.alloc(size, 0x20);
  Buffer.from("%PDF-1.4\n").copy(b);
  return b;
};

export function upload(as, filename, bytes, type, docType = "CIPC") {
  const form = new FormData();
  form.set("type", docType);
  form.set("file", new File([bytes], filename, { type }));
  return call("/api/documents", { as, body: form, method: "POST" });
}

/** Collects pass / fail results grouped under the brief's headings. */
export function recorder() {
  const results = [];
  let section = "General";
  return {
    results,
    section(name) {
      section = name;
      console.log(`\n${name}`);
    },
    check(item, ok, evidence = "") {
      results.push({ section, item, ok: Boolean(ok), evidence: String(evidence) });
      console.log(`${ok ? "  PASS" : "  FAIL"}  ${item}${evidence ? `  (${evidence})` : ""}`);
    },
  };
}

export async function withMongo(fn) {
  const client = await new MongoClient(process.env.MONGODB_URI).connect();
  try {
    return await fn(client.db(process.env.MONGODB_DB ?? "spazalink"), ObjectId);
  } finally {
    await client.close();
  }
}

/** Remove a throwaway user's shop data from MongoDB and the user from Clerk. */
export async function removeTestShop(userId) {
  await withMongo(async (db) => {
    const shop = await db.collection("shops").findOne({ ownerUserId: userId });
    if (shop) {
      for (const c of ["compliance_documents", "stock_items", "orders", "order_items", "order_status_events", "payments"]) {
        await db.collection(c).deleteMany({ shopId: shop._id });
      }
      const files = await db.collection("documents.files").find({ "metadata.shopId": shop._id }).toArray();
      for (const f of files) {
        await db.collection("documents.chunks").deleteMany({ files_id: f._id });
        await db.collection("documents.files").deleteOne({ _id: f._id });
      }
      await db.collection("shops").deleteOne({ _id: shop._id });
    }
  });
  await clerk.users.deleteUser(userId).catch(() => {});
}
