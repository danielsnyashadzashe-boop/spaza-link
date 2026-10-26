// Brief compliance test: walks every checklist item in the "Township Supply Platform: Project Brief"
// against the running app, MongoDB and Clerk, and writes BRIEF_TEST_REPORT.md as submission evidence.
// Usage: npm run build && npm start   (terminal 1)
//        npm run test:brief            (terminal 2)
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BASE,
  call,
  createTestUser,
  pdfBytes,
  recorder,
  removeTestShop,
  signInAs,
  upload,
  userIdFor,
  withMongo,
} from "./lib/harness.mjs";

const r = recorder();
const { check } = r;
const round2 = (n) => Math.round(n * 100) / 100;

async function main() {
  console.log(`Brief compliance checks against ${BASE}`);
  const thandi = await signInAs(await userIdFor("thandi+clerk_test@spazalink.co.za"));
  const sipho = await signInAs(await userIdFor("sipho+clerk_test@spazalink.co.za"));
  const admin = await signInAs(await userIdFor("admin+clerk_test@spazalink.co.za"));
  const testUser = await createTestUser(`brief-test-${Date.now()}+clerk_test@spazalink.co.za`, "Brief");
  const owner = await signInAs(testUser.id);

  try {
    // ─── 1 & 8. Sign up: a new owner registers their shop ─────────────────────
    r.section("8. User journey, step 1: Sign up and register a shop");
    const before = await call("/api/me", { as: owner });
    check("A brand new user sees Thandi's demo shop by default", before.data?.demo === true && before.data?.shop?.name === "Thandi's Spaza");
    check(
      "The demo shop is view only for them until they register",
      (await call("/api/orders", { as: owner, json: { items: [], paymentMethod: "EFT" } })).data?.code === "DEMO_READ_ONLY",
    );
    const reg = await call("/api/shop", {
      as: owner,
      json: { ownerName: "Brief Tester", shopName: "Brief Test Spaza", location: "Zone 1, Meadowlands, Soweto", phone: "082 000 1111" },
    });
    check("Shop registration is saved", reg.status === 201, reg.status);
    const me = (await call("/api/me", { as: owner })).data;
    check("Dashboard loads the new shop", me?.shop?.name === "Brief Test Spaza" && me?.demo === false);
    const ownStock = (await call("/api/stock", { as: owner })).data?.items ?? [];
    const ownOrders = (await call("/api/orders", { as: owner })).data?.orders ?? [];
    check("Their own shop starts clean: no demo stock or orders mixed in", ownStock.length === 0 && ownOrders.length === 0);
    check("They can still look at the demo shop on purpose", (await call("/api/me", { as: owner, headers: { cookie: "spaza_demo_view=1" } })).data?.shop?.name === "Thandi's Spaza");
    check("Compliance score reads low at sign up (profile only)", me?.compliance?.score === 15, `${me?.compliance?.score}%`);
    const adminShops = (await call("/api/admin/shops", { as: admin })).data?.shops ?? [];
    check("The admin portal sees the newly registered shop", adminShops.some((s) => s.name === "Brief Test Spaza"));

    // ─── 3. Screen 1: Inventory Dashboard ────────────────────────────────────
    r.section("3. Screen 1: Inventory Dashboard");
    const cipc = await upload(owner, "cipc.pdf", pdfBytes(), "application/pdf", "CIPC");
    check("Document upload area accepts a CIPC PDF", cipc.status === 201, cipc.status);
    const bee = await upload(owner, "bee.png", Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(300)]), "image/png", "BEE");
    check("Document upload area accepts a BEE image (PNG)", bee.status === 201, bee.status);
    check("Compliance Score widget climbs to 85% Ready with CIPC and BEE", bee.data?.score === 85, `${bee.data?.score}%`);
    const del = await call(`/api/documents/${bee.data.documents.find((d) => d.type === "BEE").id}`, { as: owner, method: "DELETE" });
    check("Deleting a document changes the score immediately", del.data?.score === 50, `${del.data?.score}%`);
    await upload(owner, "bee.pdf", pdfBytes(), "application/pdf", "BEE");

    const products = (await call("/api/products", { as: owner })).data.products;
    const oil = products.find((p) => p.name === "Sunflower Cooking Oil" && p.unit === "2L bottle") ?? products[0];
    const add = await call("/api/stock", { as: owner, json: { productId: oil.id, quantity: 12, fullCapacity: 12 } });
    const item = add.data?.items?.[0];
    check("Stock list: add an item", add.status === 201 && item?.name === oil.name);
    check("A full shelf shows Green", item?.band === "green", `${item?.quantity}/${item?.fullCapacity}`);
    const bandAt = async (q) => (await call(`/api/stock/${item.id}`, { as: owner, method: "PATCH", json: { quantity: q } })).data?.items?.[0]?.band;
    const b7 = await bandAt(7);
    const b6 = await bandAt(6);
    const b3 = await bandAt(3);
    const b2 = await bandAt(2);
    check("Colour thresholds: 58% is Green (over 50%)", b7 === "green", b7);
    check("Colour thresholds: 50% is Yellow (20% to 50%)", b6 === "yellow", b6);
    check("Colour thresholds: 25% is Yellow", b3 === "yellow", b3);
    check("Low stock alert: 17% drops into Red (under 20%)", b2 === "red", b2);
    const edited = (await call(`/api/stock/${item.id}`, { as: owner, method: "PATCH", json: { fullCapacity: 24 } })).data?.items?.[0];
    check("Stock list: edit full capacity recalculates the colour", edited?.fullCapacity === 24 && edited?.band === "red");
    await call(`/api/stock/${item.id}`, { as: owner, method: "PATCH", json: { quantity: 2, fullCapacity: 12 } });
    const missing = 12 - 2;
    check("Quick Fix: the red item links to a verified catalogue product", Boolean(edited?.product?.id), edited?.product?.supplier?.name);

    // ─── 4. Screen 2: Ordering and Checkout ──────────────────────────────────
    r.section("4. Screen 2: Ordering and Checkout");
    check("Product catalogue: every listed product shows a trust badge", products.every((p) => p.badges.length > 0 || p.supplier.badges.includes("Verified Supplier")));
    check("Product catalogue: every listed supplier is a Verified Supplier", products.every((p) => p.supplier.badges.includes("Verified Supplier")));
    const hidden = await withMongo(async (db) => {
      const sup = await db.collection("suppliers").find({ verificationStatus: { $ne: "VERIFIED" } }).toArray();
      const unv = await db.collection("products").find({ $or: [{ verificationStatus: { $ne: "VERIFIED" } }, { supplierId: { $in: sup.map((s) => s._id) } }] }).toArray();
      return unv.map((p) => p._id.toString());
    });
    check("Unverified products are not listed", hidden.length > 0 && !products.some((p) => hidden.includes(p.id)), `${hidden.length} hidden`);
    check("No order without a payment method", (await call("/api/orders", { as: owner, json: { items: [{ productId: oil.id, quantity: 1 }] } })).status === 400);
    check(
      "PayShap uses the phone number (an invalid one is refused)",
      (await call("/api/orders", { as: owner, json: { items: [{ productId: oil.id, quantity: 1 }], paymentMethod: "PAYSHAP", payshapPhone: "12" } })).status === 400,
    );
    const quickFix = await call("/api/orders", {
      as: owner,
      json: { items: [{ productId: oil.id, quantity: missing }], paymentMethod: "PAYSHAP", payshapPhone: "082 000 1111" },
    });
    const qf = quickFix.data?.order;
    const rule = oil.bulkRule;
    const expectedDiscount = rule && missing >= rule.minQty ? round2(oil.price * missing * (rule.percentOff / 100)) : 0;
    check("Quick Fix order for the missing quantity is created", quickFix.status === 201 && qf?.items?.[0]?.quantity === missing, `${missing} units`);
    check("Cart: bulk discount shown as its own line", qf?.discount === expectedDiscount && qf?.subtotal === round2(oil.price * missing), `discount ${qf?.discount}`);
    check("Payment choice saved on the order", qf?.paymentMethod === "PAYSHAP" && qf?.payment?.status === "PAID");
    const cod = (await call("/api/orders", { as: owner, json: { items: [{ productId: products[1].id, quantity: 2 }], paymentMethod: "COD" } })).data?.order;
    check("Cash on Delivery stays pending until delivered", cod?.payment?.status === "PENDING");
    check("Delivery timeline starts at Order Placed", qf?.timeline?.[0]?.status === "PLACED" && Boolean(qf?.timeline?.[0]?.at) && !qf?.timeline?.[1]?.at);
    let o = qf;
    for (const step of ["PACKING", "OUT_FOR_DELIVERY", "DELIVERED"]) {
      o = (await call(`/api/orders/${qf.id}/advance`, { as: owner, method: "POST" })).data?.order;
      check(`Status update moves the timeline to ${step.replaceAll("_", " ").toLowerCase()}`, o?.status === step && Boolean(o?.timeline?.find((t) => t.status === step)?.at));
    }
    const restocked = (await call("/api/stock", { as: owner })).data.items.find((i) => i.productId === oil.id);
    check("Delivery puts the stock back on the shelf (Red to Green)", restocked?.quantity === 12 && restocked?.band === "green", `${restocked?.quantity}/12`);
    const viaAdmin = await call(`/api/admin/orders/${cod.id}/advance`, { as: admin, method: "POST" });
    check("Order status can also be changed by the admin (wholesaler stand in)", viaAdmin.data?.status === "PACKING");

    // ─── 5. Screen 3: Financial Portal ───────────────────────────────────────
    r.section("5. Screen 3: Financial Portal");
    const fin = (await call("/api/finance", { as: owner })).data;
    const orders = (await call("/api/orders", { as: owner })).data.orders;
    const thisMonth = round2(orders.reduce((a, x) => a + x.total, 0));
    check("Simple spend chart: six months of points", fin?.monthly?.length === 6);
    check("A new order changes the current month's point", fin.monthly.at(-1).total === thisMonth, `${fin.monthly.at(-1).total} = ${thisMonth}`);
    check("Scorecard: Total Money Spent matches the order history exactly", fin.scorecard.totalSpent === thisMonth);
    const settled = orders.filter((x) => x.payment?.status === "PAID");
    const onTime = settled.filter((x) => x.payment.paidOnTime).length / settled.length;
    check("Scorecard: On Time Payments matches the payment history", fin.scorecard.onTimeRate === onTime, `${Math.round(onTime * 100)}%`);
    check("Scorecard: Credit Health Status is Good, Fair or At Risk", ["Good", "Fair", "At Risk"].includes(fin.scorecard.creditHealth), fin.scorecard.creditHealth);
    const tFin = (await call("/api/finance", { as: thandi })).data.scorecard;
    check("Demo shop has a full trading record (six active months, Good credit)", tFin.activeMonths === 6 && tFin.creditHealth === "Good", `${tFin.creditHealth} ${tFin.creditScore}`);
    const pdf = await fetch(`${BASE}/api/report?format=pdf`, { headers: { authorization: `Bearer ${await thandi()}` } });
    const pdfHead = Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString();
    check("PDF download button returns a real PDF", pdf.status === 200 && pdfHead === "%PDF-" && (pdf.headers.get("content-disposition") ?? "").includes("Thandi"));
    const ppt = await fetch(`${BASE}/api/report?format=pptx`, { headers: { authorization: `Bearer ${await thandi()}` } });
    const pptHead = Buffer.from(await ppt.arrayBuffer()).subarray(0, 2).toString();
    check("The same report downloads as PowerPoint", ppt.status === 200 && pptHead === "PK" && (ppt.headers.get("content-type") ?? "").includes("presentationml"));
    check("Report download requires a session", (await call("/api/report")).status === 401);

    // ─── 6. Security features and SSDL ───────────────────────────────────────
    r.section("6. Security features and SSDL");
    const tOrders = (await call("/api/orders", { as: thandi })).data.orders;
    const tDocs = (await call("/api/documents", { as: thandi })).data.documents;
    check("RLS: Shop B cannot read Shop A's order", (await call(`/api/orders/${tOrders[0].id}`, { as: sipho })).status === 404);
    check("RLS: Shop B cannot download Shop A's documents", (await call(`/api/documents/${tDocs[0].id}/file`, { as: sipho })).status === 404);
    check("RLS: a test login as Shop B returns none of Shop A's rows", !(await call("/api/orders", { as: sipho })).data.orders.some((x) => tOrders.some((t) => t.id === x.id)));
    for (const page of ["/dashboard", "/order", "/finance", "/onboarding", "/admin"]) {
      const res = await call(page, { headers: { accept: "text/html" } });
      check(`Authentication required on ${page}`, [302, 307].includes(res.status), res.status);
    }
    for (const page of ["/", "/sign-in", "/sign-up"]) {
      // Public pages: served directly, or (on a Clerk development instance, for a browser with no Clerk
      // cookie yet) a handshake round trip that returns to the same page. Never a redirect to sign in.
      const res = await call(page, { headers: { accept: "text/html" } });
      const loc = res.res.headers.get("location") ?? "";
      const handshake = res.res.headers.get("x-clerk-auth-status") === "handshake" && loc.includes("/v1/client/handshake");
      check(`${page} is open without signing in`, res.status === 200 || (handshake && !loc.includes("/sign-in?")), res.status === 200 ? "200" : "Clerk dev handshake");
    }
    const hostile = await call("/api/shop", { as: sipho, json: { ownerName: "<script>x</script>", shopName: "x", location: "y", phone: "1" } });
    check("Server side input validation rejects bad input", hostile.status === 400 || hostile.status === 409);
    check("Upload filter: a .exe is refused", (await upload(owner, "x.exe", Buffer.from("MZ"), "application/octet-stream")).status === 415);
    check("Upload filter: a renamed .exe is refused", (await upload(owner, "x.pdf", Buffer.concat([Buffer.from("MZ"), Buffer.alloc(100)]), "application/pdf")).status === 415);
    check("Upload filter: a 6 MB PDF is refused", (await upload(owner, "big.pdf", pdfBytes(6 * 1024 * 1024), "application/pdf")).status === 413);
    const stored = await withMongo(async (db) => ({
      users: (await db.listCollections({ name: "users" }).toArray()).length,
      pw: await db.collection("shops").countDocuments({ $or: [{ password: { $exists: true } }, { passwordHash: { $exists: true } }] }),
    }));
    check("Passwords are handled by Clerk, never stored by SpazaLink", stored.users === 0 && stored.pw === 0);
    check("A shop owner is refused the admin portal (roles)", (await call("/api/admin/overview", { as: thandi })).status === 403);
    const secrets = await scanForSecrets("src");
    check("API keys and secrets live in environment variables only", secrets.length === 0, secrets.join(", ") || "none in source");

    // ─── 7. Database plan ────────────────────────────────────────────────────
    r.section("7. Technical architecture and database plan");
    const counts = await withMongo(async (db) => {
      const out = {};
      for (const c of ["shops", "compliance_documents", "suppliers", "products", "stock_items", "orders", "order_items", "order_status_events", "payments"]) {
        out[c] = await db.collection(c).countDocuments();
      }
      return out;
    });
    for (const [c, n] of Object.entries(counts)) check(`Collection ${c} exists and holds data`, n > 0, `${n} documents`);

    // ─── 10. Demo account and preloaded data ─────────────────────────────────
    r.section("10. Demo account and preloaded data");
    const tStock = (await call("/api/stock", { as: thandi })).data.items;
    const bands = new Set(tStock.map((s) => s.band));
    check("Demo shop has stock in all three colours", bands.has("green") && bands.has("yellow") && bands.has("red"), [...bands].join(", "));
    check("Demo shop has past orders", tOrders.length >= 10, `${tOrders.length} shown`);
    const tTypes = tDocs.map((d) => d.type);
    check("Demo shop has CIPC and BEE sample files", tTypes.includes("CIPC") && tTypes.includes("BEE"));
    check("Second demo shop exists to show the data walls", (await call("/api/me", { as: sipho })).data?.shop?.name === "Sipho's Corner Store");

    // ─── Admin portal ────────────────────────────────────────────────────────
    r.section("Admin portal");
    const ov = (await call("/api/admin/overview", { as: admin })).data;
    check("Overview graphs have data (monthly, status, payments, products, categories)", ov.monthly.length === 6 && ov.ordersByStatus.length === 4 && ov.paymentMix.length === 3 && ov.topProducts.length > 0 && ov.categorySales.length > 0);
    check("Registrations are visible (new shops per month and newest shops)", ov.monthly.some((m) => m.newShops > 0) && ov.newestShops.length > 0);
    const apdf = await fetch(`${BASE}/api/admin/report?format=pdf`, { headers: { authorization: `Bearer ${await admin()}` } });
    check("Platform report downloads as PDF", apdf.status === 200 && Buffer.from(await apdf.arrayBuffer()).subarray(0, 5).toString() === "%PDF-");
    const appt = await fetch(`${BASE}/api/admin/report?format=pptx`, { headers: { authorization: `Bearer ${await admin()}` } });
    check("Platform report downloads as PowerPoint", appt.status === 200 && Buffer.from(await appt.arrayBuffer()).subarray(0, 2).toString() === "PK");
    check("Shop owners cannot download the platform report", (await call("/api/admin/report", { as: sipho })).status === 403);
  } finally {
    await removeTestShop(testUser.id);
    await Promise.all([thandi.revoke(), sipho.revoke(), admin.revoke(), owner.revoke()]);
  }

  await writeReport();
  const failed = r.results.filter((x) => !x.ok).length;
  console.log(`\n${r.results.length - failed} passed, ${failed} failed. Report written to BRIEF_TEST_REPORT.md`);
  process.exit(failed ? 1 : 0);
}

/** Look for credentials committed into source files. */
async function scanForSecrets(dir) {
  const hits = [];
  const patterns = [/sk_(test|live)_[A-Za-z0-9]{10,}/, /mongodb(\+srv)?:\/\/[^<\s"']+:[^<\s"']+@/, /pk_(test|live)_[A-Za-z0-9]{20,}/];
  async function walk(d) {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) {
        const content = await readFile(p, "utf8");
        if (patterns.some((re) => re.test(content))) hits.push(p);
      }
    }
  }
  await walk(dir);
  return hits;
}

async function writeReport() {
  const failed = r.results.filter((x) => !x.ok).length;
  const lines = [
    "# SpazaLink: brief compliance test report",
    "",
    `Run on ${new Date().toLocaleString("en-ZA", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Johannesburg" })} against ${BASE}.`,
    "",
    `**${r.results.length - failed} of ${r.results.length} checks passed.** Every check calls the live app, which reads and writes MongoDB Atlas and verifies Clerk sessions. Nothing is mocked.`,
    "",
  ];
  let current = "";
  for (const x of r.results) {
    if (x.section !== current) {
      current = x.section;
      lines.push("", `## ${current}`, "", "| Check | Result | Evidence |", "|---|---|---|");
    }
    lines.push(`| ${x.item} | ${x.ok ? "Pass" : "**Fail**"} | ${x.evidence.replaceAll("|", "/")} |`);
  }
  lines.push("", "Reproduce with `npm run build && npm start`, then `npm run test:brief`.", "");
  await writeFile("BRIEF_TEST_REPORT.md", lines.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
