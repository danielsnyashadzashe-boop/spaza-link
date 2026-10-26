import { z } from "zod";
import { DOCUMENT_TYPES, PAYMENT_METHODS } from "./rules";

/**
 * Clean text: strip control characters and angle brackets, collapse whitespace, trim.
 * Values are stored as plain text and React escapes them on display, so markup or
 * SQL/NoSQL fragments typed into a field do nothing.
 */
export function cleanText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const text = (min: number, max: number) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().min(min, `must be at least ${min} characters`).max(max, `must be at most ${max} characters`));

/** South African mobile number, normalised to +27XXXXXXXXX. */
export const saPhone = z
  .string()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^(\+27|0)[6-8]\d{8}$/, "must be a valid SA mobile number, e.g. 082 123 4567"))
  .transform((v) => (v.startsWith("0") ? `+27${v.slice(1)}` : v));

/** Shop registration after Clerk sign-up — identity lives in Clerk, the business lives here. */
export const shopSchema = z.object({
  ownerName: text(2, 80),
  shopName: text(2, 80),
  location: text(2, 120),
  phone: saPhone,
});

export const objectIdString = z.string().regex(/^[a-f0-9]{24}$/i, "is not a valid id");

const qty = z.coerce.number().int("must be a whole number").min(0).max(100_000);

export const stockCreateSchema = z
  .object({
    productId: objectIdString,
    quantity: qty,
    fullCapacity: qty.pipe(z.number().min(1, "must be at least 1")),
  })
  .refine((v) => v.quantity <= v.fullCapacity, {
    message: "cannot be more than full capacity",
    path: ["quantity"],
  });

export const stockUpdateSchema = z
  .object({ quantity: qty.optional(), fullCapacity: qty.pipe(z.number().min(1)).optional() })
  .refine((v) => v.quantity !== undefined || v.fullCapacity !== undefined, "Nothing to update");

export const documentTypeSchema = z.enum(Object.keys(DOCUMENT_TYPES) as [keyof typeof DOCUMENT_TYPES]);

export const orderCreateSchema = z
  .object({
    items: z
      .array(z.object({ productId: objectIdString, quantity: z.coerce.number().int().min(1).max(10_000) }))
      .min(1, "Your cart is empty")
      .max(50),
    paymentMethod: z.enum(Object.keys(PAYMENT_METHODS) as [keyof typeof PAYMENT_METHODS], {
      error: "Choose a payment method",
    }),
    payshapPhone: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.paymentMethod !== "PAYSHAP") return;
    const r = saPhone.safeParse(v.payshapPhone ?? "");
    if (!r.success) ctx.addIssue({ code: "custom", path: ["payshapPhone"], message: "PayShap needs a valid SA mobile number" });
  });

// ─── Admin forms ────────────────────────────────────────────────────────────────

export const VERIFICATION_STATUSES = ["VERIFIED", "PENDING", "REJECTED"] as const;
export const SUPPLIER_BADGES = ["Verified Supplier", "BBBEE Level 1", "Cold Chain Certified", "Fresh Produce Certified"] as const;
export const PRODUCT_BADGES = ["SABS Approved", "NRCS Compliant", "Halaal", "Fortified", "Fresh Produce Certified"] as const;
export const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
] as const;

export const supplierCreateSchema = z.object({
  name: text(2, 80),
  region: z.enum(PROVINCES, { error: "Choose a province" }),
  verificationStatus: z.enum(VERIFICATION_STATUSES),
  badges: z.array(z.enum(SUPPLIER_BADGES)).max(SUPPLIER_BADGES.length).default([]),
});

export const supplierUpdateSchema = z
  .object({
    verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
    badges: z.array(z.enum(SUPPLIER_BADGES)).max(SUPPLIER_BADGES.length).optional(),
  })
  .refine((v) => v.verificationStatus !== undefined || v.badges !== undefined, "Nothing to update");

const price = z.coerce.number().min(0.5, "must be at least R0.50").max(100_000).transform((n) => Math.round(n * 100) / 100);
const bulkRule = z
  .object({
    minQty: z.coerce.number().int().min(2, "must be at least 2").max(1000),
    percentOff: z.coerce.number().min(1, "must be at least 1%").max(50, "cannot be more than 50%"),
  })
  .nullable();

export const productCreateSchema = z.object({
  supplierId: objectIdString,
  name: text(2, 80),
  unit: text(1, 40),
  category: text(2, 40),
  price,
  bulkRule: bulkRule.default(null),
  badges: z.array(z.enum(PRODUCT_BADGES)).max(PRODUCT_BADGES.length).default([]),
  verificationStatus: z.enum(VERIFICATION_STATUSES),
});

export const productUpdateSchema = z
  .object({
    price: price.optional(),
    bulkRule: bulkRule.optional(),
    verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");
