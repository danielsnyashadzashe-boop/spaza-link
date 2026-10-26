import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { HttpError, readJson, withShop } from "@/lib/api";
import { verifiedCatalogue } from "@/lib/catalogue";
import { listOrders } from "@/lib/orders";
import { lineDiscount, round2 } from "@/lib/rules";
import { orderCreateSchema, saPhone } from "@/lib/validation";

export const GET = withShop(async (_req, ctx) => NextResponse.json({ orders: await listOrders(ctx) }));

export const POST = withShop(async (req, ctx) => {
  const input = orderCreateSchema.parse(await readJson(req));

  // Merge duplicate lines, then price everything from the verified catalogue — never from the client.
  const qty = new Map<string, number>();
  for (const { productId, quantity } of input.items) qty.set(productId, (qty.get(productId) ?? 0) + quantity);
  const catalogue = await verifiedCatalogue(ctx.db, [...qty.keys()].map((id) => new ObjectId(id)));
  if (catalogue.length !== qty.size) {
    throw new HttpError(400, "Some items are no longer available from a verified supplier. Please review your cart.");
  }

  const now = new Date();
  const lines = catalogue.map((p) => {
    const quantity = qty.get(p.id)!;
    const gross = round2(p.price * quantity);
    const discount = lineDiscount(p.price, quantity, p.bulkRule);
    return {
      productId: new ObjectId(p.id),
      name: p.name,
      unit: p.unit,
      supplierName: p.supplier.name,
      quantity,
      unitPrice: p.price,
      discount,
      lineTotal: round2(gross - discount),
      gross,
    };
  });
  const subtotal = round2(lines.reduce((a, l) => a + l.gross, 0));
  const discount = round2(lines.reduce((a, l) => a + l.discount, 0));
  const total = round2(subtotal - discount);
  const instant = input.paymentMethod !== "COD"; // sandbox: PayShap and EFT settle immediately

  const { insertedId: orderId } = await ctx.w("orders").insertOne({
    orderNumber: `SL${now.getTime().toString(36).toUpperCase()}`,
    subtotal,
    discount,
    total,
    paymentMethod: input.paymentMethod,
    payshapPhone: input.paymentMethod === "PAYSHAP" ? saPhone.parse(input.payshapPhone) : null,
    status: "PLACED",
    createdAt: now,
    updatedAt: now,
  });
  await Promise.all([
    ctx.w("order_items").insertMany(lines.map(({ productId, name, unit, supplierName, quantity, unitPrice, discount, lineTotal }) => ({
        orderId, productId, name, unit, supplierName, quantity, unitPrice, discount, lineTotal,
      }))),
    ctx.w("order_status_events").insertOne({ orderId, status: "PLACED", changedAt: now }),
    ctx.w("payments").insertOne({
      orderId,
      method: input.paymentMethod,
      amount: total,
      sandbox: true,
      status: instant ? "PAID" : "PENDING",
      paidAt: instant ? now : null,
      paidOnTime: instant ? true : null,
      createdAt: now,
    }),
  ]);

  const [order] = await listOrders(ctx, { ids: [orderId] });
  return NextResponse.json({ order }, { status: 201 });
});
