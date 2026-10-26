// End-to-end security checks against a running app (SSDL "Testing" evidence).
// Usage: npm run seed && npm run build && npm start   (in one terminal)
//        npm run test:security                         (in another; BASE_URL defaults to http://localhost:3000)
// Signs in as Clerk users by minting short-lived session tokens with the Clerk Backend API.
import { createClerkClient } from "@clerk/backend";
import { MongoClient } from "mongodb";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const createdProductIds = [];
let passed = 0;
let failed = 0;

function check(name, ok, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
}

/** A signed-in Clerk session; its bearer token is re-minted before the 60 s expiry. */
async function signInAs(userId) {
  const session = await clerk.sessions.createSession({ userId });
  let jwt = null;
  let mintedAt = 0;
  const token = async () => {
    if (!jwt || Date.now() - mintedAt > 40_000) {
      jwt = (await clerk.sessions.getToken(session.id)).jwt;
      mintedAt = Date.now();
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

async function userIdFor(email) {
  const { data } = await clerk.users.getUserList({ emailAddress: [email] });
  if (!data[0]) throw new Error(`${email} not found in Clerk — run npm run seed first`);
  return data[0].id;
}

/** Throwaway Clerk user for write tests (username/test phone only if the instance demands them). */
async function createTestUser(email) {
  const base = { emailAddress: [email], password: `T${Date.now()}x!secure`, firstName: "Security", lastName: "Test", skipPasswordChecks: true };
  try {
    return await clerk.users.createUser(base);
  } catch (err) {
    if (!err.errors?.some((e) => e.code === "form_data_missing")) throw err;
    const n = String(Date.now() % 100).padStart(2, "0");
    return clerk.users.createUser({ ...base, username: `sectest_${Date.now()}`, phoneNumber: [`+155555501${n}`] });
  }
}

async function call(path, { as, json, body, method, headers = {} } = {}) {
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

const pdfBytes = (size = 2000) => {
  const b = Buffer.alloc(size, 0x20);
  Buffer.from("%PDF-1.4\n").copy(b);
  return b;
};
const upload = (as, filename, bytes, type, docType = "CIPC") => {
  const form = new FormData();
  form.set("type", docType);
  form.set("file", new File([bytes], filename, { type }));
  return call("/api/documents", { as, body: form, method: "POST" });
};

async function main() {
  console.log(`Security checks against ${BASE}\n`);

  console.log("Authentication (Clerk)");
  check("API refuses requests without a session", (await call("/api/stock")).status === 401);
  const page = await call("/dashboard", { headers: { accept: "text/html" } });
  const location = page.res.headers.get("location") ?? "";
  check(
    "App pages send signed-out visitors to sign in",
    [302, 307].includes(page.status) && !location.startsWith("/dashboard"),
    `${page.status} ${location}`,
  );
  const forged = async () => "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyX2Zha2UifQ.invalidsig";
  check("Forged session token is rejected", (await call("/api/me", { as: forged })).status === 401);

  const thandi = await signInAs(await userIdFor("thandi+clerk_test@spazalink.co.za"));
  const sipho = await signInAs(await userIdFor("sipho+clerk_test@spazalink.co.za"));
  check("A real Clerk session reaches its own shop", (await call("/api/me", { as: thandi })).data?.shop?.name === "Thandi's Spaza");

  console.log("\nData walls (Shop B must never see Shop A's rows)");
  const tStock = (await call("/api/stock", { as: thandi })).data.items;
  const tOrders = (await call("/api/orders", { as: thandi })).data.orders;
  const tDocs = (await call("/api/documents", { as: thandi })).data.documents;
  const sStock = (await call("/api/stock", { as: sipho })).data.items;
  const sOrders = (await call("/api/orders", { as: sipho })).data.orders;
  const tIds = new Set([...tStock, ...tOrders, ...tDocs].map((r) => r.id));
  check("Shop B's lists contain none of Shop A's rows", ![...sStock, ...sOrders].some((r) => tIds.has(r.id)));
  check("Shop B cannot read Shop A's order", (await call(`/api/orders/${tOrders[0].id}`, { as: sipho })).status === 404);
  check("Shop B cannot advance Shop A's order", (await call(`/api/orders/${tOrders[0].id}/advance`, { as: sipho, method: "POST" })).status === 404);
  check("Shop B cannot edit Shop A's stock", (await call(`/api/stock/${tStock[0].id}`, { as: sipho, method: "PATCH", json: { quantity: 0 } })).status === 404);
  check("Shop B cannot delete Shop A's stock", (await call(`/api/stock/${tStock[0].id}`, { as: sipho, method: "DELETE" })).status === 404);
  if (tDocs[0]) {
    check("Shop B cannot download Shop A's document", (await call(`/api/documents/${tDocs[0].id}/file`, { as: sipho })).status === 404);
    check("Shop B cannot delete Shop A's document", (await call(`/api/documents/${tDocs[0].id}`, { as: sipho, method: "DELETE" })).status === 404);
  }
  const tFin = (await call("/api/finance", { as: thandi })).data.scorecard;
  const sFin = (await call("/api/finance", { as: sipho })).data.scorecard;

  console.log("\nRole based access (admin portal)");
  const admin = await signInAs(await userIdFor("admin+clerk_test@spazalink.co.za"));
  check("Signed out callers cannot reach admin data", (await call("/api/admin/overview")).status === 401);
  check("A shop owner is refused the admin overview", (await call("/api/admin/overview", { as: thandi })).status === 403);
  check("A shop owner is refused the admin shop list", (await call("/api/admin/shops", { as: sipho })).status === 403);
  check(
    "A shop owner cannot add products",
    (await call("/api/admin/products", { as: thandi, json: { name: "Hack", unit: "x", category: "x", price: 1, supplierId: "0".repeat(24), verificationStatus: "VERIFIED" } })).status === 403,
  );
  check(
    "A shop owner cannot use the admin route to move another shop's order",
    (await call(`/api/admin/orders/${sOrders[0]?.id ?? "0".repeat(24)}/advance`, { as: thandi, method: "POST" })).status === 403,
  );
  const overview = await call("/api/admin/overview", { as: admin });
  const adminShops = (await call("/api/admin/shops", { as: admin })).data?.shops ?? [];
  const o = overview.data ?? {};
  check("The admin role is allowed in", overview.status === 200 && (await call("/api/admin/me", { as: admin })).status === 200);
  check("Admin sees every seeded shop", o.kpis?.shops >= 8 && adminShops.length === o.kpis.shops, `${o.kpis?.shops} / ${adminShops.length}`);
  check("Six months of platform figures", o.monthly?.length === 6);
  check(
    "Each shop's own scorecard matches the admin's count of its orders exactly",
    adminShops.find((x) => x.name === "Thandi's Spaza")?.orderCount === tFin.orderCount &&
      adminShops.find((x) => x.name === "Sipho's Corner Store")?.orderCount === sFin.orderCount &&
      tFin.orderCount !== sFin.orderCount,
    `${tFin.orderCount} / ${sFin.orderCount}`,
  );
  check("Orders by status add up to all orders", o.ordersByStatus?.reduce((a, x) => a + x.count, 0) === o.kpis?.ordersTotal);
  check(
    "Platform order value equals the sum of every shop's spend",
    Math.abs(adminShops.reduce((a, x) => a + x.totalSpent, 0) - o.kpis?.gmvTotal) < 0.05,
  );
  check("Admin owns no shop, so shop pages show the view only demo", (await call("/api/me", { as: admin })).data?.demo === true);
  check(
    "Admin product form rejects a negative price",
    (await call("/api/admin/products", { as: admin, json: { supplierId: "0".repeat(24), name: "Bad", unit: "x", category: "Test", price: -5, verificationStatus: "VERIFIED" } })).status === 400,
  );
  check(
    "Admin supplier form rejects an unknown status",
    (await call(`/api/admin/suppliers/${"0".repeat(24)}`, { as: admin, method: "PATCH", json: { verificationStatus: "TRUSTED" } })).status === 400,
  );

  console.log("\nVerification gates (admin changes reach shops)");
  const suppliersList = (await call("/api/admin/suppliers", { as: admin })).data.suppliers;
  const verifiedSupplier = suppliersList.find((x) => x.verificationStatus === "VERIFIED");
  const pendingSupplier = suppliersList.find((x) => x.verificationStatus !== "VERIFIED");
  const probeName = `Gate Test ${Date.now()}`;
  const created = await call("/api/admin/products", {
    as: admin,
    json: { supplierId: verifiedSupplier.id, name: probeName, unit: "1 unit", category: "Test", price: 9.99, bulkRule: null, badges: ["SABS Approved"], verificationStatus: "VERIFIED" },
  });
  const probe = created.data?.products?.find((p) => p.name === probeName);
  createdProductIds.push(probe?.id);
  const listedNow = async (name) => ((await call("/api/products", { as: thandi })).data.products ?? []).some((p) => p.name === name);
  check("A verified product from a verified supplier appears in shops", created.status === 201 && (await listedNow(probeName)));
  await call(`/api/admin/products/${probe.id}`, { as: admin, method: "PATCH", json: { verificationStatus: "PENDING" } });
  check("Setting it to pending hides it from every shop", !(await listedNow(probeName)));
  const hidden = await call("/api/admin/products", {
    as: admin,
    json: { supplierId: pendingSupplier.id, name: `${probeName} B`, unit: "1 unit", category: "Test", price: 9.99, bulkRule: null, badges: [], verificationStatus: "VERIFIED" },
  });
  createdProductIds.push(hidden.data?.products?.find((p) => p.name === `${probeName} B`)?.id);
  check("A verified product from an unverified supplier stays hidden", hidden.status === 201 && !(await listedNow(`${probeName} B`)));

  console.log("\nDemo shop (view only)");
  const demo = { cookie: "spaza_demo_view=1" };
  const demoMe = await call("/api/me", { as: sipho, headers: demo });
  check("Demo mode shows Thandi's Spaza to another signed in user", demoMe.data?.shop?.name === "Thandi's Spaza" && demoMe.data?.demo === true);
  const demoStock = (await call("/api/stock", { as: sipho, headers: demo })).data?.items ?? [];
  check("Demo mode shows the same shelves Thandi sees", demoStock.length === tStock.length && demoStock.every((i) => tStock.some((t) => t.id === i.id)));
  check("Demo mode cannot change stock", (await call(`/api/stock/${tStock[0].id}`, { as: sipho, method: "PATCH", json: { quantity: 1 }, headers: demo })).data?.code === "DEMO_READ_ONLY");
  check("Demo mode cannot place orders", (await call("/api/orders", { as: sipho, json: { items: [], paymentMethod: "EFT" }, headers: demo })).status === 403);
  check("Demo mode cannot delete documents", (await call(`/api/documents/${tDocs[0].id}`, { as: sipho, method: "DELETE", headers: demo })).status === 403);
  check("Demo mode cannot move deliveries", (await call(`/api/orders/${tOrders[0].id}/advance`, { as: sipho, method: "POST", headers: demo })).status === 403);
  const otherOrder = (await call("/api/admin/orders", { as: admin })).data.orders.find((o) => o.shop !== "Thandi's Spaza");
  check("Demo mode never opens any other shop's data", (await call(`/api/orders/${otherOrder.id}`, { as: sipho, headers: demo })).status === 404);
  check("Without demo mode the visitor is back in their own shop", (await call("/api/me", { as: sipho })).data?.shop?.name === "Sipho's Corner Store");
  check("Thandi keeps full control of her own shop even with the demo cookie", (await call("/api/me", { as: thandi, headers: demo })).data?.demo === false);
  check("Switching into demo mode needs a session", (await call("/api/view", { json: { mode: "demo" } })).status === 401);

  console.log("\nCross-site requests");
  check(
    "POST from another origin is refused",
    (await call("/api/stock", { as: sipho, json: {}, headers: { origin: "https://evil.example" } })).status === 403,
  );

  // A throwaway Clerk user and shop for write tests, so the demo shops stay untouched.
  const testUser = await createTestUser(`security-test-${Date.now()}+clerk_test@spazalink.co.za`);
  const test = await signInAs(testUser.id);
  let failure = null;
  try {
    console.log("\nShop registration and clean text fields");
    const before = await call("/api/me", { as: test });
    check("Signed in without a shop sees Thandi's demo shop by default", before.data?.demo === true && before.data?.hasOwnShop === false && before.data?.shop?.name === "Thandi's Spaza");
    check(
      "Without a shop, the demo is view only (register first to make changes)",
      (await call("/api/stock", { as: test, json: { productId: "0".repeat(24), quantity: 1, fullCapacity: 2 } })).data?.code === "DEMO_READ_ONLY",
    );
    check(
      "Invalid phone number is rejected",
      (await call("/api/shop", { as: test, json: { ownerName: "A B", shopName: "Shop", location: "Here", phone: "12345" } })).status === 400,
    );
    const register = await call("/api/shop", {
      as: test,
      json: {
        ownerName: "Test <b>Owner</b>",
        shopName: "<script>alert('x')</script> Robert'); DROP TABLE shops;--",
        location: "Test   location\u0000",
        phone: "082 555 1234",
      },
    });
    check("Registration with hostile text succeeds safely", register.status === 201);
    check("A second shop for the same user is refused", (await call("/api/shop", { as: test, json: { ownerName: "A B", shopName: "Shop", location: "Here", phone: "0825551234" } })).status === 409);
    const me = (await call("/api/me", { as: test })).data.shop;
    check("Angle brackets are stripped before saving", !/[<>]/.test(me.name) && !/[<>]/.test(me.ownerName), me.name);
    check("SQL-like text is stored as plain text", me.name.includes("DROP TABLE"), me.name);
    check("Control characters and extra spaces are removed", me.location === "Test location", JSON.stringify(me.location));
    const products = (await call("/api/products", { as: test })).data.products;
    check(
      "Operator objects in numeric fields are rejected",
      (await call("/api/stock", { as: test, json: { productId: products[0].id, quantity: { $gt: 0 }, fullCapacity: 10 } })).status === 400,
    );
    check(
      "Malformed JSON is rejected cleanly",
      (await call("/api/stock", { as: test, body: "{not json", method: "POST", headers: { "content-type": "application/json" } })).status === 400,
    );

    console.log("\nFile upload filters");
    check("A .exe file is refused", (await upload(test, "tool.exe", Buffer.from("MZ\x90\x00"), "application/octet-stream")).status === 415);
    check("An .exe renamed to .pdf is refused", (await upload(test, "cert.pdf", Buffer.concat([Buffer.from("MZ\x90\x00"), Buffer.alloc(500)]), "application/pdf")).status === 415);
    check("A 6 MB PDF is refused", (await upload(test, "big.pdf", pdfBytes(6 * 1024 * 1024), "application/pdf")).status === 413);
    check("A PNG named .pdf is refused", (await upload(test, "img.pdf", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]), "application/pdf")).status === 415);
    const good = await upload(test, "cipc.pdf", pdfBytes(), "application/pdf");
    check("A real PDF under 5 MB is accepted and raises the score", good.status === 201 && good.data.score === 50, `${good.status} ${good.data?.score}`);
    const bee = await upload(test, "bee.pdf", pdfBytes(), "application/pdf", "BEE");
    check("CIPC + BEE + profile = 85% Ready", bee.data.score === 85, bee.data?.score);
    const del = await call(`/api/documents/${bee.data.documents.find((d) => d.type === "BEE").id}`, { as: test, method: "DELETE" });
    check("Deleting a document lowers the score immediately", del.data.score === 50, del.data?.score);

    console.log("\nOrders");
    check("Order without a payment method is refused", (await call("/api/orders", { as: test, json: { items: [{ productId: products[0].id, quantity: 1 }] } })).status === 400);
    check(
      "PayShap without a valid phone is refused",
      (await call("/api/orders", { as: test, json: { items: [{ productId: products[0].id, quantity: 1 }], paymentMethod: "PAYSHAP", payshapPhone: "123" } })).status === 400,
    );
    const p = products.find((x) => x.bulkRule);
    const order = await call("/api/orders", {
      as: test,
      json: { items: [{ productId: p.id, quantity: p.bulkRule.minQty, price: 0.01 }], paymentMethod: "EFT" },
    });
    const expectedGross = Math.round(p.price * p.bulkRule.minQty * 100) / 100;
    check("Prices come from the catalogue, not the client", order.status === 201 && order.data.order.subtotal === expectedGross, JSON.stringify(order.data));
    check("Bulk discount applied as a separate line", order.data.order.discount > 0);
    const advanced = await call(`/api/orders/${order.data.order.id}/advance`, { as: test, method: "POST" });
    check("Order status moves Placed -> Packing", advanced.data.order.status === "PACKING");
    const adminMove = await call(`/api/admin/orders/${order.data.order.id}/advance`, { as: admin, method: "POST" });
    check("Admin moves any shop's order along (Packing to Out for Delivery)", adminMove.data?.status === "OUT_FOR_DELIVERY");
    const fin = (await call("/api/finance", { as: test })).data;
    check("New order shows up in this month's spend", fin.monthly.at(-1).total === order.data.order.total, `${fin.monthly.at(-1).total}`);
  } catch (err) {
    failure = err;
  } finally {
    await cleanup(testUser.id);
  }
  if (failure) throw failure;

  console.log("\nFinancial Health Report");
  const pdf = await fetch(BASE + "/api/report", { headers: { authorization: `Bearer ${await thandi()}` } });
  const head = Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString();
  check("Report downloads as a real PDF", pdf.status === 200 && head === "%PDF-");
  check("Report is not cached", (pdf.headers.get("cache-control") ?? "").includes("no-store"));
  check("Report requires a session", (await call("/api/report")).status === 401);

  await removeProducts(createdProductIds);
  await Promise.all([thandi.revoke(), sipho.revoke(), admin.revoke()]);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

/** Delete products the gate tests created. */
async function removeProducts(ids) {
  const real = ids.filter(Boolean);
  if (!process.env.MONGODB_URI || !real.length) return;
  const { ObjectId } = await import("mongodb");
  const client = await new MongoClient(process.env.MONGODB_URI).connect();
  await client.db(process.env.MONGODB_DB ?? "spazalink").collection("products").deleteMany({ _id: { $in: real.map((i) => new ObjectId(i)) } });
  await client.close();
}

/** Remove the throwaway shop's data from MongoDB and the throwaway user from Clerk. */
async function cleanup(userId) {
  if (process.env.MONGODB_URI) {
    const client = await new MongoClient(process.env.MONGODB_URI).connect();
    const db = client.db(process.env.MONGODB_DB ?? "spazalink");
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
    await client.close();
  }
  await clerk.users.deleteUser(userId).catch(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
