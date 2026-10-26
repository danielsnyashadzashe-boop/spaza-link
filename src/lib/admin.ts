import "server-only";
import type { Db, Document, ObjectId, WithId } from "mongodb";
import {
  complianceScore,
  creditHealth,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  round2,
  stockBand,
  stockRatio,
  type CreditHealth,
  type OrderStatus,
  type PaymentMethod,
  type StockBand,
} from "./rules";

/*
 * Platform wide reporting for the admin portal. This is the ONLY code that reads across shops,
 * and it is reachable only through withAdmin() (lib/api.ts), which requires the admin role.
 */

const MONTHS = 6;
const DAY = 86_400_000;

function monthBuckets(now = new Date()) {
  return Array.from({ length: MONTHS }, (_, i) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1 - i), 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    return { start, end, label: start.toLocaleDateString("en-ZA", { month: "short", year: "2-digit", timeZone: "UTC" }) };
  });
}

type Raw = WithId<Document>;
const idStr = (id: unknown) => String(id);

async function loadAll(db: Db) {
  const [shops, docs, stock, orders, payments] = await Promise.all([
    db.collection("shops").find().toArray(),
    db.collection("compliance_documents").find({}, { projection: { shopId: 1, type: 1 } }).toArray(),
    db.collection("stock_items").find().toArray(),
    db.collection("orders").find({}, { sort: { createdAt: -1 } }).toArray(),
    db.collection("payments").find().toArray(),
  ]);
  return { shops, docs, stock, orders, payments };
}

function groupBy<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, T[]>();
  for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
  return m;
}

/** One row per shop with everything an admin needs to judge its health at a glance. */
function summarise(data: Awaited<ReturnType<typeof loadAll>>) {
  const months = monthBuckets();
  const docsBy = groupBy(data.docs, (d) => idStr(d.shopId));
  const stockBy = groupBy(data.stock, (s) => idStr(s.shopId));
  const ordersBy = groupBy(data.orders, (o) => idStr(o.shopId));
  const paysBy = groupBy(data.payments, (p) => idStr(p.shopId));

  return data.shops.map((shop) => {
    const id = idStr(shop._id);
    const types = (docsBy.get(id) ?? []).map((d) => d.type as string);
    const profile = Boolean(shop.name && shop.location && shop.phone && shop.ownerName);
    const items = stockBy.get(id) ?? [];
    const bands: Record<StockBand, number> = { green: 0, yellow: 0, red: 0 };
    for (const s of items) bands[stockBand(s.quantity, s.fullCapacity)]++;
    const orders = ordersBy.get(id) ?? [];
    const pays = paysBy.get(id) ?? [];
    const settled = pays.filter((p) => p.status === "PAID");
    const onTimeRate = settled.length ? settled.filter((p) => p.paidOnTime).length / settled.length : null;
    const monthly = months.map((m) =>
      round2(orders.filter((o) => o.createdAt >= m.start && o.createdAt < m.end).reduce((a, o) => a + o.total, 0)),
    );
    const health = creditHealth(onTimeRate, monthly);
    return {
      id,
      name: shop.name as string,
      ownerName: shop.ownerName as string,
      location: shop.location as string,
      phone: shop.phone as string,
      createdAt: (shop.createdAt as Date).toISOString(),
      hasLogin: !shop.seeded,
      compliance: complianceScore(profile, types),
      documents: [...new Set(types)].sort(),
      stock: { ...bands, total: items.length },
      orderCount: orders.length,
      totalSpent: round2(orders.reduce((a, o) => a + o.total, 0)),
      lastOrderAt: orders[0] ? (orders[0].createdAt as Date).toISOString() : null,
      onTimeRate,
      paymentsPending: pays.filter((p) => p.status === "PENDING").length,
      creditScore: health.score,
      creditHealth: health.status as CreditHealth,
      monthly,
    };
  });
}

export async function shopSummaries(db: Db) {
  return summarise(await loadAll(db)).sort((a, b) => b.totalSpent - a.totalSpent);
}

export async function platformOverview(db: Db) {
  const data = await loadAll(db);
  const shops = summarise(data);
  const months = monthBuckets();
  const now = new Date();
  const [suppliers, products, topProducts, categorySales, supplierRevenue] = await Promise.all([
    db.collection("suppliers").find().toArray(),
    db.collection("products").find({}, { projection: { verificationStatus: 1, supplierId: 1 } }).toArray(),
    db
      .collection("order_items")
      .aggregate([
        { $group: { _id: "$productId", name: { $first: "$name" }, unit: { $first: "$unit" }, revenue: { $sum: "$lineTotal" }, units: { $sum: "$quantity" } } },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ])
      .toArray(),
    db
      .collection("order_items")
      .aggregate([
        { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "p" } },
        { $unwind: "$p" },
        { $group: { _id: "$p.category", revenue: { $sum: "$lineTotal" }, units: { $sum: "$quantity" } } },
        { $sort: { revenue: -1 } },
      ])
      .toArray(),
    db
      .collection("order_items")
      .aggregate([
        { $group: { _id: "$supplierName", revenue: { $sum: "$lineTotal" }, orders: { $addToSet: "$orderId" } } },
        { $project: { revenue: 1, orders: { $size: "$orders" } } },
        { $sort: { revenue: -1 } },
      ])
      .toArray(),
  ]);

  const inMonth = (o: Raw, i: number) => o.createdAt >= months[i].start && o.createdAt < months[i].end;
  const monthly = months.map((m, i) => {
    const os = data.orders.filter((o) => inMonth(o, i));
    return {
      month: m.label,
      gmv: round2(os.reduce((a, o) => a + o.total, 0)),
      orders: os.length,
      savings: round2(os.reduce((a, o) => a + o.discount, 0)),
      newShops: data.shops.filter((s) => s.createdAt >= m.start && s.createdAt < m.end).length,
    };
  });
  const [thisMonth, lastMonth] = [monthly[MONTHS - 1], monthly[MONTHS - 2]];

  const gmvTotal = round2(data.orders.reduce((a, o) => a + o.total, 0));
  const settled = data.payments.filter((p) => p.status === "PAID");
  const statusCounts = ORDER_STATUSES.map((s) => ({ status: s as OrderStatus, count: data.orders.filter((o) => o.status === s).length }));
  const paymentMix = (Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((m) => {
    const os = data.orders.filter((o) => o.paymentMethod === m);
    return { method: PAYMENT_METHODS[m], orders: os.length, amount: round2(os.reduce((a, o) => a + o.total, 0)) };
  });

  const shopName = new Map(data.shops.map((s) => [idStr(s._id), s.name as string]));
  const lowStock = data.stock
    .filter((s) => stockBand(s.quantity, s.fullCapacity) === "red")
    .map((s) => ({
      shop: shopName.get(idStr(s.shopId)) ?? "Unknown shop",
      item: s.name as string,
      quantity: s.quantity as number,
      fullCapacity: s.fullCapacity as number,
      pct: Math.round(stockRatio(s.quantity, s.fullCapacity) * 100),
    }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 10);

  const countBy = <K extends string>(keys: readonly K[], value: (k: K) => number) => keys.map((k) => ({ key: k, count: value(k) }));

  return {
    kpis: {
      shops: shops.length,
      activeShops: shops.filter((s) => s.lastOrderAt && now.getTime() - new Date(s.lastOrderAt).getTime() < 30 * DAY).length,
      gmvTotal,
      gmvThisMonth: thisMonth.gmv,
      gmvLastMonth: lastMonth.gmv,
      ordersTotal: data.orders.length,
      ordersThisMonth: thisMonth.orders,
      ordersLastMonth: lastMonth.orders,
      avgOrderValue: data.orders.length ? round2(gmvTotal / data.orders.length) : 0,
      savingsTotal: round2(data.orders.reduce((a, o) => a + o.discount, 0)),
      onTimeRate: settled.length ? settled.filter((p) => p.paidOnTime).length / settled.length : null,
      avgCompliance: shops.length ? Math.round(shops.reduce((a, s) => a + s.compliance, 0) / shops.length) : 0,
      inFlight: data.orders.filter((o) => o.status !== "DELIVERED").length,
      stockItems: data.stock.length,
      redItems: data.stock.filter((s) => stockBand(s.quantity, s.fullCapacity) === "red").length,
      suppliersVerified: suppliers.filter((s) => s.verificationStatus === "VERIFIED").length,
      suppliersPending: suppliers.filter((s) => s.verificationStatus === "PENDING").length,
      productsVerified: products.filter((p) => p.verificationStatus === "VERIFIED").length,
      productsPending: products.filter((p) => p.verificationStatus !== "VERIFIED").length,
    },
    monthly,
    ordersByStatus: statusCounts,
    paymentMix,
    topProducts: topProducts.map((p) => ({ name: `${p.name} (${p.unit})`, revenue: round2(p.revenue), units: p.units as number })),
    categorySales: categorySales.map((c) => ({ category: c._id as string, revenue: round2(c.revenue), units: c.units as number })),
    supplierRevenue: supplierRevenue.map((s) => ({ supplier: s._id as string, revenue: round2(s.revenue), orders: s.orders as number })),
    stockByShop: shops.map((s) => ({ shop: s.name, green: s.stock.green, yellow: s.stock.yellow, red: s.stock.red })),
    creditDistribution: countBy(["Good", "Fair", "At Risk"] as const, (k) => shops.filter((s) => s.creditHealth === k).length),
    complianceDistribution: countBy(["Under 50%", "50 to 84%", "85 to 99%", "100%"] as const, (k) =>
      shops.filter((s) =>
        k === "Under 50%" ? s.compliance < 50 : k === "50 to 84%" ? s.compliance < 85 && s.compliance >= 50 : k === "85 to 99%" ? s.compliance >= 85 && s.compliance < 100 : s.compliance === 100,
      ).length,
    ),
    lowStock,
    newestShops: [...shops]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map((s) => ({ id: s.id, name: s.name, ownerName: s.ownerName, location: s.location, createdAt: s.createdAt, hasLogin: s.hasLogin, compliance: s.compliance, orderCount: s.orderCount })),
    recentOrders: data.orders.slice(0, 8).map((o) => ({
      id: idStr(o._id),
      orderNumber: o.orderNumber as string,
      shop: shopName.get(idStr(o.shopId)) ?? "Unknown shop",
      total: o.total as number,
      status: o.status as OrderStatus,
      createdAt: (o.createdAt as Date).toISOString(),
    })),
  };
}

export async function allOrders(db: Db, status?: OrderStatus) {
  const [orders, shops] = await Promise.all([
    db.collection("orders").find(status ? { status } : {}, { sort: { createdAt: -1 }, limit: 200 }).toArray(),
    db.collection("shops").find({}, { projection: { name: 1 } }).toArray(),
  ]);
  const ids = orders.map((o) => o._id as ObjectId);
  const [items, payments] = await Promise.all([
    db.collection("order_items").aggregate([{ $match: { orderId: { $in: ids } } }, { $group: { _id: "$orderId", lines: { $sum: 1 }, units: { $sum: "$quantity" } } }]).toArray(),
    db.collection("payments").find({ orderId: { $in: ids } }).toArray(),
  ]);
  const shopName = new Map(shops.map((s) => [idStr(s._id), s.name as string]));
  const itemsBy = new Map(items.map((i) => [idStr(i._id), i]));
  const payBy = new Map(payments.map((p) => [idStr(p.orderId), p]));
  return orders.map((o) => {
    const pay = payBy.get(idStr(o._id));
    return {
      id: idStr(o._id),
      orderNumber: o.orderNumber as string,
      shop: shopName.get(idStr(o.shopId)) ?? "Unknown shop",
      status: o.status as OrderStatus,
      paymentMethod: PAYMENT_METHODS[o.paymentMethod as PaymentMethod] ?? (o.paymentMethod as string),
      paymentStatus: pay ? (pay.status === "PENDING" ? "Pending" : pay.paidOnTime ? "Paid on time" : "Paid late") : "None",
      lines: itemsBy.get(idStr(o._id))?.lines ?? 0,
      units: itemsBy.get(idStr(o._id))?.units ?? 0,
      discount: o.discount as number,
      total: o.total as number,
      createdAt: (o.createdAt as Date).toISOString(),
    };
  });
}

export async function allSuppliers(db: Db) {
  const [suppliers, products, revenue] = await Promise.all([
    db.collection("suppliers").find({}, { sort: { name: 1 } }).toArray(),
    db.collection("products").find({}, { projection: { supplierId: 1, verificationStatus: 1 } }).toArray(),
    db.collection("order_items").aggregate([{ $group: { _id: "$supplierName", revenue: { $sum: "$lineTotal" } } }]).toArray(),
  ]);
  const rev = new Map(revenue.map((r) => [r._id as string, round2(r.revenue)]));
  return suppliers.map((s) => {
    const ps = products.filter((p) => idStr(p.supplierId) === idStr(s._id));
    return {
      id: idStr(s._id),
      name: s.name as string,
      region: s.region as string,
      verificationStatus: s.verificationStatus as string,
      badges: (s.badges ?? []) as string[],
      products: ps.length,
      productsVerified: ps.filter((p) => p.verificationStatus === "VERIFIED").length,
      revenue: rev.get(s.name as string) ?? 0,
    };
  });
}

export async function allProducts(db: Db) {
  const [products, suppliers, sales] = await Promise.all([
    db.collection("products").find({}, { sort: { category: 1, name: 1 } }).toArray(),
    db.collection("suppliers").find({}, { projection: { name: 1, verificationStatus: 1 } }).toArray(),
    db.collection("order_items").aggregate([{ $group: { _id: "$productId", revenue: { $sum: "$lineTotal" }, units: { $sum: "$quantity" } } }]).toArray(),
  ]);
  const sup = new Map(suppliers.map((s) => [idStr(s._id), s]));
  const sold = new Map(sales.map((s) => [idStr(s._id), s]));
  return products.map((p) => {
    const s = sup.get(idStr(p.supplierId));
    const sale = sold.get(idStr(p._id));
    return {
      id: idStr(p._id),
      sku: (p.sku as string) ?? "",
      name: p.name as string,
      unit: p.unit as string,
      category: p.category as string,
      price: p.price as number,
      bulkRule: (p.bulkRule ?? null) as { minQty: number; percentOff: number } | null,
      badges: (p.badges ?? []) as string[],
      verificationStatus: p.verificationStatus as string,
      supplierId: idStr(p.supplierId),
      supplierName: (s?.name as string) ?? "Unknown",
      supplierStatus: (s?.verificationStatus as string) ?? "UNKNOWN",
      listed: p.verificationStatus === "VERIFIED" && s?.verificationStatus === "VERIFIED",
      units: (sale?.units as number) ?? 0,
      revenue: round2((sale?.revenue as number) ?? 0),
    };
  });
}
