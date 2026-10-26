// Business rules shared by the server (source of truth) and the client (instant UI feedback).

export type StockBand = "green" | "yellow" | "red";

/** Red under 20% of full capacity, Yellow from 20% to 50%, Green above 50%. */
export const RED_BELOW = 0.2;
export const GREEN_ABOVE = 0.5;

export function stockRatio(quantity: number, fullCapacity: number): number {
  if (fullCapacity <= 0) return 0;
  return Math.max(0, Math.min(1, quantity / fullCapacity));
}

export function stockBand(quantity: number, fullCapacity: number): StockBand {
  const r = stockRatio(quantity, fullCapacity);
  if (r < RED_BELOW) return "red";
  if (r <= GREEN_ABOVE) return "yellow";
  return "green";
}

export const DOCUMENT_TYPES = {
  CIPC: { label: "CIPC registration certificate", weight: 35 },
  BEE: { label: "BBBEE affidavit or certificate", weight: 35 },
  TAX: { label: "SARS tax clearance PIN", weight: 15 },
} as const;
export type DocumentType = keyof typeof DOCUMENT_TYPES;
export const PROFILE_WEIGHT = 15;

/**
 * Compliance score out of 100: a complete shop profile is worth 15,
 * CIPC 35, BEE 35 and tax clearance 15 — so CIPC + BEE lands on "85% Ready".
 */
export function complianceScore(profileComplete: boolean, uploadedTypes: Iterable<string>): number {
  const types = new Set(uploadedTypes);
  let score = profileComplete ? PROFILE_WEIGHT : 0;
  for (const [type, { weight }] of Object.entries(DOCUMENT_TYPES)) {
    if (types.has(type)) score += weight;
  }
  return score;
}

export type BulkRule = { minQty: number; percentOff: number };

export function lineDiscount(unitPrice: number, quantity: number, rule?: BulkRule | null): number {
  if (!rule || quantity < rule.minQty) return 0;
  return round2(unitPrice * quantity * (rule.percentOff / 100));
}

export const PAYMENT_METHODS = {
  PAYSHAP: "PayShap",
  EFT: "Instant EFT",
  COD: "Cash on Delivery",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const ORDER_STATUSES = ["PLACED", "PACKING", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: "Order Placed",
  PACKING: "Packing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

export type CreditHealth = "Good" | "Fair" | "At Risk";

/**
 * Alternative credit score (0–100) from trading history:
 *  - 50 pts: share of payments made on time
 *  - 30 pts: months of trading activity in the last 6 months
 *  - 20 pts: spend consistency (low month-to-month variation)
 * Good ≥ 70, Fair ≥ 45, otherwise At Risk. No history at all is At Risk.
 */
export function creditHealth(onTimeRate: number | null, monthlyTotals: number[]) {
  const active = monthlyTotals.filter((v) => v > 0);
  if (onTimeRate === null || active.length === 0) {
    return { score: 0, status: "At Risk" as CreditHealth };
  }
  const mean = active.reduce((a, b) => a + b, 0) / active.length;
  const sd = Math.sqrt(active.reduce((a, b) => a + (b - mean) ** 2, 0) / active.length);
  const cv = mean > 0 ? sd / mean : 1;
  const consistency = active.length < 2 ? 0.5 : Math.max(0, 1 - cv);
  const score = Math.round(
    onTimeRate * 50 + (Math.min(active.length, 6) / 6) * 30 + consistency * 20,
  );
  const status: CreditHealth = score >= 70 ? "Good" : score >= 45 ? "Fair" : "At Risk";
  return { score, status };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatRand(n: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(n);
}
