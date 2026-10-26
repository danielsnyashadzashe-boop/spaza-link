// Seeds the whole platform: wholesalers, the catalogue, eight spaza shops with stock, orders,
// payments and compliance documents, and the demo users in Clerk (two shop owners and an admin).
// Usage: npm run seed   (re-runnable: shops are rebuilt, catalogue ids stay stable)
import { mkdir, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createClerkClient } from "@clerk/backend";
import { GridFSBucket, MongoClient } from "mongodb";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { EXTRA_PRODUCTS } from "./catalogue-extra.mjs";

const DEMO_PASSWORD = "Spaza@2026";
const WALLED = ["compliance_documents", "stock_items", "orders", "order_items", "order_status_events", "payments"];
const STEPS = ["PLACED", "PACKING", "OUT_FOR_DELIVERY", "DELIVERED"];

// ─── Wholesalers ────────────────────────────────────────────────────────────────
const SUPPLIERS = [
  { key: "masakhane", name: "Masakhane Wholesale", region: "Gauteng", verificationStatus: "VERIFIED", badges: ["Verified Supplier", "BBBEE Level 1"] },
  { key: "ubuntu", name: "Ubuntu Cash & Carry", region: "Western Cape", verificationStatus: "VERIFIED", badges: ["Verified Supplier"] },
  { key: "sizwe", name: "Sizwe Foods Distributors", region: "KwaZulu Natal", verificationStatus: "VERIFIED", badges: ["Verified Supplier", "Cold Chain Certified"] },
  { key: "kasifresh", name: "Kasi Fresh Produce", region: "Gauteng", verificationStatus: "VERIFIED", badges: ["Verified Supplier", "Fresh Produce Certified"] },
  { key: "mzansihome", name: "Mzansi Home Care", region: "Eastern Cape", verificationStatus: "VERIFIED", badges: ["Verified Supplier"] },
  // Not verified: their products must never appear in the shop app.
  { key: "quicksave", name: "QuickSave Traders", region: "Gauteng", verificationStatus: "PENDING", badges: [] },
  { key: "bargainbulk", name: "Bargain Bulk Traders", region: "Free State", verificationStatus: "REJECTED", badges: [] },
];

// ─── Catalogue ──────────────────────────────────────────────────────────────────
const P = (sku, supplier, name, unit, category, price, bulk, badges, extra = {}) => ({
  sku, supplier, name, unit, category, price,
  bulkRule: bulk ? { minQty: bulk[0], percentOff: bulk[1] } : null,
  badges, ...extra,
});
const PRODUCTS = [
  // Bakery
  P("BRD-WHT-700", "masakhane", "White Bread", "700g loaf", "Bakery", 17.99, [20, 5], ["SABS Approved"]),
  P("BRD-BRN-700", "masakhane", "Brown Bread", "700g loaf", "Bakery", 16.49, [20, 5], ["SABS Approved"]),
  P("ROLLS-6", "masakhane", "Soft Bread Rolls", "pack of 6", "Bakery", 21.99, [12, 5], ["SABS Approved"]),
  P("VETKOEK-MIX", "sizwe", "Vetkoek Flour Mix", "2.5kg bag", "Bakery", 44.99, [10, 6], ["SABS Approved"]),
  // Staples
  P("MAIZE-10", "sizwe", "Super Maize Meal", "10kg bag", "Staples", 109.99, [5, 7], ["SABS Approved", "Fortified"]),
  P("MAIZE-5", "sizwe", "Super Maize Meal", "5kg bag", "Staples", 62.99, [8, 6], ["SABS Approved", "Fortified"]),
  P("OIL-SUN-2L", "ubuntu", "Sunflower Cooking Oil", "2L bottle", "Staples", 64.99, [6, 6], ["SABS Approved"]),
  P("OIL-SUN-750", "ubuntu", "Sunflower Cooking Oil", "750ml bottle", "Staples", 29.99, [12, 5], ["SABS Approved"]),
  P("SUGAR-2.5", "sizwe", "White Sugar", "2.5kg bag", "Staples", 52.49, [10, 5], ["SABS Approved"]),
  P("RICE-2", "ubuntu", "Long Grain Rice", "2kg bag", "Staples", 41.99, [10, 5], ["SABS Approved"]),
  P("SAMP-2", "sizwe", "Samp", "2kg bag", "Staples", 34.99, [10, 5], ["SABS Approved"]),
  P("CAKEFLOUR-2.5", "masakhane", "Cake Flour", "2.5kg bag", "Staples", 39.99, [10, 5], ["SABS Approved", "Fortified"]),
  P("SALT-1", "ubuntu", "Iodated Table Salt", "1kg bag", "Staples", 12.99, [24, 8], ["SABS Approved"]),
  P("TEA-100", "masakhane", "Rooibos Tea Bags", "box of 100", "Staples", 49.99, [10, 5], ["SABS Approved"]),
  P("COFFEE-250", "masakhane", "Instant Coffee", "250g tin", "Staples", 74.99, [6, 5], ["SABS Approved"]),
  // Fresh
  P("POTATO-7", "kasifresh", "Potatoes", "7kg pocket", "Fresh", 69.99, [5, 6], ["Fresh Produce Certified"]),
  P("ONION-3", "kasifresh", "Onions", "3kg pocket", "Fresh", 36.99, [8, 5], ["Fresh Produce Certified"]),
  P("TOMATO-1", "kasifresh", "Tomatoes", "1kg punnet", "Fresh", 24.99, [10, 5], ["Fresh Produce Certified"]),
  P("CABBAGE", "kasifresh", "Cabbage", "each", "Fresh", 17.99, [10, 5], ["Fresh Produce Certified"]),
  // Dairy and eggs
  P("MILK-UHT-6", "sizwe", "Long Life Full Cream Milk", "6 x 1L", "Dairy", 96.99, [4, 4], ["SABS Approved", "Halaal"]),
  P("MAAS-2", "sizwe", "Amasi Fermented Milk", "2L bottle", "Dairy", 38.99, [6, 5], ["Halaal"]),
  P("EGGS-30", "masakhane", "Large Eggs", "tray of 30", "Dairy", 84.99, [5, 5], ["NRCS Compliant"]),
  P("MARG-500", "sizwe", "Brick Margarine", "500g", "Dairy", 32.99, [12, 6], ["SABS Approved"]),
  // Tinned
  P("PILCH-400", "ubuntu", "Pilchards in Tomato Sauce", "400g tin", "Tinned", 26.99, [24, 8], ["NRCS Compliant", "Halaal"]),
  P("BEANS-410", "ubuntu", "Baked Beans", "410g tin", "Tinned", 15.99, [24, 8], ["NRCS Compliant"]),
  P("CHAKALAKA-410", "ubuntu", "Chakalaka Mild", "410g tin", "Tinned", 17.49, [24, 8], ["NRCS Compliant"]),
  P("FISHPASTE", "ubuntu", "Tinned Fish Paste", "75g jar", "Tinned", 13.99, [24, 6], ["NRCS Compliant"]),
  // Drinks
  P("COLD-2L", "masakhane", "Cola Soft Drink", "2L bottle", "Drinks", 21.99, [12, 6], ["SABS Approved"]),
  P("ORANGE-2L", "masakhane", "Orange Soft Drink", "2L bottle", "Drinks", 19.99, [12, 6], ["SABS Approved"]),
  P("JUICE-1L", "sizwe", "Mixed Fruit Juice", "1L carton", "Drinks", 24.99, [12, 5], ["SABS Approved"]),
  P("WATER-5L", "ubuntu", "Still Spring Water", "5L bottle", "Drinks", 22.99, [10, 5], ["SABS Approved"]),
  P("MAHEWU-1L", "sizwe", "Mahewu Maize Drink", "1L carton", "Drinks", 16.99, [12, 5], ["SABS Approved"]),
  // Snacks
  P("CHIPS-36", "masakhane", "Maize Snack Chips", "box of 36", "Snacks", 59.99, [5, 6], ["SABS Approved"]),
  P("BISCUIT-200", "masakhane", "Tennis Biscuits", "200g", "Snacks", 18.99, [24, 6], ["SABS Approved"]),
  P("SWEETS-100", "masakhane", "Assorted Sweets", "jar of 100", "Snacks", 54.99, [6, 5], ["SABS Approved"]),
  // Household
  P("SOAP-175", "mzansihome", "Antibacterial Bath Soap", "175g bar", "Household", 13.49, [24, 10], ["SABS Approved"]),
  P("WASH-2", "mzansihome", "Washing Powder", "2kg box", "Household", 74.99, [6, 5], ["SABS Approved"]),
  P("DISH-750", "mzansihome", "Dishwashing Liquid", "750ml", "Household", 27.99, [12, 6], ["SABS Approved"]),
  P("CANDLE-6", "mzansihome", "Household Candles", "pack of 6", "Household", 24.99, [10, 5], ["SABS Approved"]),
  P("MATCH-10", "mzansihome", "Safety Matches", "pack of 10", "Household", 11.99, [20, 8], ["SABS Approved"]),
  P("PARAFFIN-1", "mzansihome", "Illuminating Paraffin", "1L bottle", "Household", 29.99, [12, 5], ["SABS Approved", "NRCS Compliant"]),
  // Personal care
  P("TOOTH-100", "mzansihome", "Fluoride Toothpaste", "100ml", "Personal care", 22.99, [12, 6], ["SABS Approved"]),
  P("PETJEL-250", "mzansihome", "Petroleum Jelly", "250ml", "Personal care", 26.49, [12, 6], ["SABS Approved"]),
  P("NAPPY-30", "sizwe", "Baby Nappies Size 4", "pack of 30", "Personal care", 129.99, [4, 5], ["SABS Approved"]),
  // The wider catalogue (scripts/catalogue-extra.mjs).
  ...EXTRA_PRODUCTS.map((row) => P(...row)),
  // Unverified listings: excluded by the catalogue query and visible only to admins.
  P("OIL-NONAME", "quicksave", "Cheap Cooking Oil", "2L bottle", "Staples", 39.99, null, []),
  P("SUGAR-BULK", "bargainbulk", "Unbranded Sugar", "10kg bag", "Staples", 129.99, null, []),
  P("MAIZE-UNV", "masakhane", "Unbranded Maize Meal", "10kg bag", "Staples", 79.99, null, [], { verificationStatus: "PENDING" }),
];

// ─── Shops ──────────────────────────────────────────────────────────────────────
// [sku, quantity, fullCapacity]. Thandi's list is fixed for the live demo script.
const THANDI_STOCK = [
  ["BRD-WHT-700", 42, 50], ["BRD-BRN-700", 30, 40], ["MAIZE-10", 19, 24], ["EGGS-30", 9, 12],
  ["MILK-UHT-6", 8, 10], ["COLD-2L", 30, 36], ["POTATO-7", 7, 10], ["TEA-100", 9, 12],
  ["OIL-SUN-2L", 5, 12], ["RICE-2", 8, 20], ["PILCH-400", 14, 48], ["BEANS-410", 15, 48], ["CANDLE-6", 4, 10],
  ["SUGAR-2.5", 2, 20], ["SOAP-175", 4, 36], ["PARAFFIN-1", 1, 12],
];

const SHOPS = [
  {
    login: { email: "thandi+clerk_test@spazalink.co.za", username: "thandi_spaza", testPhone: "+15555550101" },
    ownerName: "Thandi Mokoena", name: "Thandi's Spaza", location: "Orlando East, Soweto", phone: "+27821234567",
    // The shared, view only demo shop every signed-in visitor can explore.
    isDemo: true,
    monthsTrading: 6, documents: ["CIPC", "BEE"], stock: THANDI_STOCK, extraStock: 30, ordersPerMonth: [3, 5], lateRate: 0, inFlight: 1,
  },
  {
    login: { email: "sipho+clerk_test@spazalink.co.za", username: "sipho_store", testPhone: "+15555550102" },
    ownerName: "Sipho Ndlovu", name: "Sipho's Corner Store", location: "Site C, Khayelitsha", phone: "+27731234567",
    monthsTrading: 2, documents: [], stockCount: 24, ordersPerMonth: [2, 4], lateRate: 0.1, inFlight: 1,
  },
  { ownerName: "Nomsa Dlamini", name: "Mama Nomsa's Tuck Shop", location: "Ivory Park, Tembisa", phone: "+27824445566",
    monthsTrading: 6, documents: ["CIPC", "BEE", "TAX"], stockCount: 42, ordersPerMonth: [4, 6], lateRate: 0, inFlight: 2 },
  { ownerName: "Lerato Mahlangu", name: "Lerato's Corner Spaza", location: "Extension 5, Mamelodi", phone: "+27719988776",
    monthsTrading: 5, documents: ["CIPC"], stockCount: 32, ordersPerMonth: [2, 4], lateRate: 0.05, inFlight: 1 },
  { ownerName: "Joseph Mokoena", name: "Bra Joe's Spaza", location: "Ext 7, Alexandra", phone: "+27832221100",
    monthsTrading: 4, documents: [], stockCount: 28, ordersPerMonth: [1, 3], lateRate: 0.45, inFlight: 1 },
  { ownerName: "Zanele Khumalo", name: "Zanele General Dealer", location: "U Section, Umlazi", phone: "+27765554433",
    monthsTrading: 6, documents: ["CIPC", "BEE"], stockCount: 45, ordersPerMonth: [3, 6], lateRate: 0.03, inFlight: 2 },
  { ownerName: "Kagiso Molefe", name: "Kasi Kwik Shop", location: "Block L, Soshanguve", phone: "+27723337788",
    monthsTrading: 3, documents: ["BEE"], stockCount: 30, ordersPerMonth: [2, 3], lateRate: 0.25, inFlight: 0 },
  { ownerName: "Thabo Nkosi", name: "Thabo's Mini Market", location: "NU 3, Mdantsane", phone: "+27846667788",
    monthsTrading: 6, documents: ["CIPC", "BEE", "TAX"], stockCount: 38, ordersPerMonth: [3, 5], lateRate: 0, inFlight: 1 },
];

const ADMIN = {
  email: "admin+clerk_test@spazalink.co.za", username: "spazalink_admin", testPhone: "+15555550109",
  ownerName: "Platform Admin",
};

// Deterministic pseudo random, so every seed produces the same platform.
let rngState = 20261026;
const rand = () => ((rngState = (rngState * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => rand() - 0.5);
const round2 = (n) => Math.round(n * 100) / 100;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing, run with: npm run seed");
  if (!process.env.CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY missing, run: npx clerk@latest env pull");
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const client = await new MongoClient(uri).connect();
  const db = client.db(process.env.MONGODB_DB ?? "spazalink");
  const bucket = new GridFSBucket(db, { bucketName: "documents" });

  // Catalogue: upsert by key / sku so ids stay stable across reseeds.
  const supplierByKey = {};
  for (const { key, ...s } of SUPPLIERS) {
    supplierByKey[key] = await db.collection("suppliers").findOneAndUpdate(
      { key },
      { $set: { key, ...s }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: "after" },
    );
  }
  const products = {};
  for (const { supplier, ...p } of PRODUCTS) {
    const doc = { verificationStatus: "VERIFIED", ...p, supplierId: supplierByKey[supplier]._id };
    products[p.sku] = await db.collection("products").findOneAndUpdate(
      { sku: p.sku },
      { $set: doc, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: "after" },
    );
    products[p.sku].supplierName = supplierByKey[supplier].name;
  }
  const sellable = PRODUCTS.filter((p) => !p.verificationStatus && supplierByKey[p.supplier].verificationStatus === "VERIFIED").map((p) => p.sku);
  console.log(`✓ ${SUPPLIERS.length} suppliers, ${PRODUCTS.length} products (${sellable.length} verified and sellable)`);

  const samples = { CIPC: await samplePdf("CIPC"), BEE: await samplePdf("BEE"), TAX: await samplePdf("TAX") };
  await mkdir("samples", { recursive: true });
  await writeFile("samples/sample_cipc_certificate.pdf", samples.CIPC);
  await writeFile("samples/sample_bee_affidavit.pdf", samples.BEE);
  await writeFile("samples/sample_tax_clearance.pdf", samples.TAX);

  await removeLegacyShops(db, bucket);
  const seeded = await db.collection("shops").find({ seeded: true }).toArray();
  for (const s of seeded) await removeShop(db, bucket, s._id);

  const now = new Date();
  let totals = { stock: 0, orders: 0 };
  for (const spec of SHOPS) {
    const ownerUserId = spec.login ? await ensureClerkUser(clerk, { ...spec.login, ownerName: spec.ownerName }) : `seed_${slug(spec.name)}`;
    if (spec.login) await removeShopOf(db, bucket, ownerUserId);
    const createdAt = new Date(now.getFullYear(), now.getMonth() - spec.monthsTrading, between(2, 12));
    const { insertedId: shopId } = await db.collection("shops").insertOne({
      ownerUserId, ownerName: spec.ownerName, name: spec.name, location: spec.location, phone: spec.phone, createdAt,
      ...(spec.login ? {} : { seeded: true }),
      ...(spec.isDemo ? { isDemo: true } : {}),
    });

    for (const type of spec.documents) {
      const filename = { CIPC: "CIPC_Registration_Certificate.pdf", BEE: "BBBEE_Sworn_Affidavit.pdf", TAX: "SARS_Tax_Clearance.pdf" }[type];
      const up = bucket.openUploadStream(filename, { metadata: { shopId, type, contentType: "application/pdf" } });
      await pipeline(Readable.from(samples[type]), up);
      await db.collection("compliance_documents").insertOne({
        shopId, type, fileId: up.id, filename, mime: "application/pdf", size: samples[type].length,
        uploadedAt: new Date(createdAt.getTime() + between(1, 20) * 86400000),
      });
    }

    // Fixed demo lines first (Thandi's script relies on them), then a wide random spread of the catalogue.
    const fixed = spec.stock ?? [];
    const pool = sellable.filter((sku) => !fixed.some(([f]) => f === sku));
    const stock = [...fixed, ...randomStock(pool, spec.extraStock ?? spec.stockCount ?? 0)];
    await db.collection("stock_items").insertMany(
      stock.map(([sku, quantity, fullCapacity]) => ({
        shopId, productId: products[sku]._id, name: products[sku].name, unit: products[sku].unit, quantity, fullCapacity,
        updatedAt: new Date(now.getTime() - between(0, 72) * 3600000),
      })),
    );

    const orderCount = await seedOrders(db, shopId, spec, stock.map(([sku]) => sku), products, now);
    totals = { stock: totals.stock + stock.length, orders: totals.orders + orderCount };
    console.log(`✓ ${spec.name.padEnd(26)} ${String(stock.length).padStart(2)} stock items, ${String(orderCount).padStart(3)} orders, ${spec.documents.length} documents${spec.login ? "  (has login)" : ""}`);
  }

  await ensureClerkUser(clerk, ADMIN, { role: "admin" });
  console.log(`✓ Admin user ${ADMIN.email} (role: admin)`);
  console.log(`\nTotals: ${SHOPS.length} shops, ${totals.stock} stock items, ${totals.orders} orders`);
  console.log(`\nDemo logins (password for all: ${DEMO_PASSWORD})`);
  for (const s of SHOPS.filter((x) => x.login)) console.log(`  shop owner  ${s.login.email}`);
  console.log(`  admin       ${ADMIN.email}`);
  console.log("Sample upload files written to ./samples/");
  await client.close();
}

/** A shop's own shelf: a random spread of verified products across green, yellow and red. */
function randomStock(skus, count) {
  return shuffle(skus).slice(0, count).map((sku) => {
    const fullCapacity = pick([10, 12, 20, 24, 36, 48, 50]);
    const band = rand();
    const ratio = band < 0.2 ? 0.05 + rand() * 0.12 : band < 0.5 ? 0.22 + rand() * 0.26 : 0.55 + rand() * 0.45;
    return [sku, Math.max(0, Math.round(fullCapacity * ratio)), fullCapacity];
  });
}

async function seedOrders(db, shopId, spec, shopSkus, products, now) {
  const methods = ["PAYSHAP", "PAYSHAP", "EFT", "COD"];
  const orders = [];
  for (let back = spec.monthsTrading - 1; back >= 0; back--) {
    const perMonth = between(...spec.ordersPerMonth);
    for (let n = 0; n < perMonth; n++) {
      const lastDay = back === 0 ? Math.max(1, now.getDate() - 1) : 28;
      const createdAt = new Date(now.getFullYear(), now.getMonth() - back, between(1, lastDay), between(7, 17), between(0, 59));
      if (createdAt > now) continue;
      orders.push(createdAt);
    }
  }
  orders.sort((a, b) => a - b);

  const docs = { orders: [], items: [], events: [], payments: [] };
  orders.forEach((createdAt, idx) => {
    const fromEnd = orders.length - idx;
    // The newest orders are still on their way; everything older has been delivered.
    const status = fromEnd <= spec.inFlight ? STEPS[between(0, 2)] : "DELIVERED";
    const method = pick(methods);
    const lineSkus = [...new Set(Array.from({ length: between(2, 5) }, () => pick(shopSkus)))];
    const lines = lineSkus.map((sku) => {
      const p = products[sku];
      const quantity = p.bulkRule && rand() > 0.45 ? p.bulkRule.minQty + between(0, 4) : between(2, 8);
      const gross = round2(p.price * quantity);
      const discount = p.bulkRule && quantity >= p.bulkRule.minQty ? round2(gross * (p.bulkRule.percentOff / 100)) : 0;
      return { productId: p._id, name: p.name, unit: p.unit, supplierName: p.supplierName, quantity, unitPrice: p.price, discount, lineTotal: round2(gross - discount), gross };
    });
    const subtotal = round2(lines.reduce((a, l) => a + l.gross, 0));
    const discount = round2(lines.reduce((a, l) => a + l.discount, 0));
    const total = round2(subtotal - discount);
    docs.orders.push({
      shopId, orderNumber: `SL${createdAt.getTime().toString(36).toUpperCase()}${idx}`, subtotal, discount, total,
      paymentMethod: method, payshapPhone: method === "PAYSHAP" ? spec.phone : null, status, createdAt, updatedAt: createdAt,
      _lines: lines,
    });
  });

  if (!docs.orders.length) return 0;
  const { insertedIds } = await db.collection("orders").insertMany(docs.orders.map((o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== "_lines"))));
  docs.orders.forEach((o, i) => {
    const orderId = insertedIds[i];
    for (const l of o._lines) {
      docs.items.push({ shopId, orderId, productId: l.productId, name: l.name, unit: l.unit, supplierName: l.supplierName, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount, lineTotal: l.lineTotal });
    }
    STEPS.slice(0, STEPS.indexOf(o.status) + 1).forEach((s, k) =>
      docs.events.push({ shopId, orderId, status: s, changedAt: new Date(o.createdAt.getTime() + k * between(3, 9) * 3600000) }),
    );
    const settled = o.paymentMethod !== "COD" || o.status === "DELIVERED";
    const late = settled && rand() < spec.lateRate;
    docs.payments.push({
      shopId, orderId, method: o.paymentMethod, amount: o.total, sandbox: true,
      status: settled ? "PAID" : "PENDING",
      paidAt: settled ? new Date(o.createdAt.getTime() + (late ? between(5, 14) * 86400000 : between(0, 20) * 3600000)) : null,
      paidOnTime: settled ? !late : null,
      createdAt: o.createdAt,
    });
  });
  await db.collection("order_items").insertMany(docs.items);
  await db.collection("order_status_events").insertMany(docs.events);
  await db.collection("payments").insertMany(docs.payments);
  return docs.orders.length;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Find a demo user in Clerk by email, creating them (or resetting the password) as needed. */
async function ensureClerkUser(clerk, spec, publicMetadata = { role: "shop_owner" }) {
  const [firstName, ...rest] = spec.ownerName.split(" ");
  const { data } = await clerk.users.getUserList({ emailAddress: [spec.email] });
  if (data[0]) {
    await clerk.users.updateUser(data[0].id, { password: DEMO_PASSWORD, skipPasswordChecks: true });
    await clerk.users.updateUserMetadata(data[0].id, { publicMetadata });
    return data[0].id;
  }
  const base = { emailAddress: [spec.email], password: DEMO_PASSWORD, firstName, lastName: rest.join(" "), skipPasswordChecks: true, publicMetadata };
  try {
    return (await clerk.users.createUser(base)).id;
  } catch (err) {
    // Instance still requires username / phone at sign up: satisfy it with a username and one of
    // Clerk's reserved test numbers (+1 555 0100 to 0199, code 424242) rather than a real phone.
    if (!err.errors?.some((e) => e.code === "form_data_missing")) throw err;
    return (await clerk.users.createUser({ ...base, username: spec.username, phoneNumber: [spec.testPhone] })).id;
  }
}

async function removeShopOf(db, bucket, ownerUserId) {
  const shop = await db.collection("shops").findOne({ ownerUserId });
  if (shop) await removeShop(db, bucket, shop._id);
}

/** Shops from before the Clerk migration were owned by a Mongo user id; clear them and the old users collection. */
async function removeLegacyShops(db, bucket) {
  const legacy = await db.collection("shops").find({ ownerUserId: { $type: "objectId" } }).toArray();
  for (const shop of legacy) await removeShop(db, bucket, shop._id);
  await db.collection("users").drop().catch(() => {});
}

async function removeShop(db, bucket, shopId) {
  const docs = await db.collection("compliance_documents").find({ shopId }).toArray();
  for (const d of docs) await bucket.delete(d.fileId).catch(() => {});
  for (const c of WALLED) await db.collection(c).deleteMany({ shopId });
  await db.collection("shops").deleteOne({ _id: shopId });
}

async function samplePdf(type) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const title = {
    CIPC: "Certificate of Incorporation (Sample)",
    BEE: "BBBEE Sworn Affidavit (Sample)",
    TAX: "SARS Tax Compliance Status PIN (Sample)",
  }[type];
  const lines = {
    CIPC: ["Registration number: 2024/123456/07", "Enterprise name: Demo Spaza (Pty) Ltd", "Enterprise type: Private Company", "Issued by the Companies and Intellectual Property Commission (sample)."],
    BEE: ["Annual turnover: below R10 million (EME)", "BBBEE status: Level 1 contributor", "Black ownership: 100%", "Sworn before a Commissioner of Oaths (sample)."],
    TAX: ["Tax compliance status: Compliant", "PIN: SAMPLE 0000 1111", "Valid for 12 months from issue", "Issued by the South African Revenue Service (sample)."],
  }[type];
  page.drawRectangle({ x: 0, y: 782, width: 595, height: 60, color: rgb(0.024, 0.149, 0.329) });
  page.drawText("SAMPLE DOCUMENT, FOR DEMO USE ONLY", { x: 40, y: 806, size: 12, font: bold, color: rgb(1, 1, 1) });
  page.drawText(title, { x: 40, y: 730, size: 20, font: bold });
  lines.forEach((l, i) => page.drawText(l, { x: 40, y: 690 - i * 22, size: 12, font }));
  return Buffer.from(await pdf.save());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
