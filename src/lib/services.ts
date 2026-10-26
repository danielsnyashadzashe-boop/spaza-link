import "server-only";
import type { ObjectId } from "mongodb";
import type { ShopContext } from "./api";
import { HttpError } from "./api";
import { complianceScore, creditHealth, DOCUMENT_TYPES, round2, type DocumentType } from "./rules";

export type ShopDoc = {
  _id: ObjectId;
  // Clerk user id of the owner
  ownerUserId: string;
  ownerName: string;
  name: string;
  location: string;
  phone: string;
  createdAt: Date;
};

export async function getShop(ctx: ShopContext) {
  // `shops` is keyed by its own _id; the session's shopId is the wall. The demo shop is the one
  // shop a visitor may read without owning it (see withShop).
  const shop = await ctx.db
    .collection<ShopDoc>("shops")
    .findOne(ctx.demo ? { _id: ctx.shopId, isDemo: true } : { _id: ctx.shopId, ownerUserId: ctx.userId });
  if (!shop) throw new HttpError(401, "Please sign in.");
  return shop;
}

export function profileComplete(shop: ShopDoc) {
  return Boolean(shop.name && shop.location && shop.phone && shop.ownerName);
}

export async function getCompliance(ctx: ShopContext, shop?: ShopDoc) {
  shop ??= await getShop(ctx);
  const docs = await ctx.w("compliance_documents").find({}, { sort: { uploadedAt: -1 } }).toArray();
  const score = complianceScore(
    profileComplete(shop),
    docs.map((d) => d.type as string),
  );
  return {
    score,
    profileComplete: profileComplete(shop),
    documents: docs.map((d) => ({
      id: d._id.toString(),
      type: d.type as DocumentType,
      label: DOCUMENT_TYPES[d.type as DocumentType]?.label ?? d.type,
      filename: d.filename as string,
      size: d.size as number,
      mime: d.mime as string,
      uploadedAt: (d.uploadedAt as Date).toISOString(),
    })),
  };
}

const MONTHS_SHOWN = 6;

export async function getFinancials(ctx: ShopContext) {
  const now = new Date();
  // Month buckets use UTC on both sides so Mongo's $month and the JS keys agree.
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_SHOWN - 1), 1));

  const [byMonth, totals, payments] = await Promise.all([
    ctx
      .w("orders")
      .aggregate<{ _id: { y: number; m: number }; total: number; count: number }>([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    ctx
      .w("orders")
      .aggregate<{ total: number; count: number; discount: number }>([
        { $group: { _id: null, total: { $sum: "$total" }, discount: { $sum: "$discount" }, count: { $sum: 1 } } },
      ])
      .toArray(),
    ctx
      .w("payments")
      .aggregate<{ settled: number; onTime: number; pending: number }>([
        {
          $group: {
            _id: null,
            settled: { $sum: { $cond: [{ $eq: ["$status", "PAID"] }, 1, 0] } },
            onTime: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "PAID"] }, "$paidOnTime"] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
          },
        },
      ])
      .toArray(),
  ]);

  const monthly = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const hit = byMonth.find((b) => b._id.y === d.getUTCFullYear() && b._id.m === d.getUTCMonth() + 1);
    return {
      month: d.toLocaleDateString("en-ZA", { month: "short", year: "2-digit", timeZone: "UTC" }),
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      total: round2(hit?.total ?? 0),
      orders: hit?.count ?? 0,
    };
  });

  const t = totals[0] ?? { total: 0, count: 0, discount: 0 };
  const p = payments[0] ?? { settled: 0, onTime: 0, pending: 0 };
  const onTimeRate = p.settled > 0 ? p.onTime / p.settled : null;
  const health = creditHealth(onTimeRate, monthly.map((m) => m.total));
  const activeMonths = monthly.filter((m) => m.total > 0).length;

  return {
    monthly,
    scorecard: {
      totalSpent: round2(t.total),
      totalSaved: round2(t.discount),
      orderCount: t.count,
      paymentsSettled: p.settled,
      paymentsOnTime: p.onTime,
      paymentsPending: p.pending,
      onTimeRate,
      activeMonths,
      averageMonthlySpend: activeMonths ? round2(monthly.reduce((a, m) => a + m.total, 0) / activeMonths) : 0,
      creditScore: health.score,
      creditHealth: health.status,
    },
  };
}
