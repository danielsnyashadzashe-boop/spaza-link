import "server-only";
import type { ObjectId, WithId, Document } from "mongodb";
import { HttpError } from "./api";
import type { walled } from "./walled";
import type { ShopContext } from "./api";
import { ORDER_STATUSES, type OrderStatus } from "./rules";

export async function listOrders(ctx: ShopContext, opts: { limit?: number; ids?: ObjectId[] } = {}) {
  const orders = await ctx
    .w("orders")
    .find(opts.ids ? { _id: { $in: opts.ids } } : {}, { sort: { createdAt: -1 }, limit: opts.limit ?? 20 })
    .toArray();
  const orderIds = orders.map((o) => o._id);
  const [items, events, payments] = await Promise.all([
    ctx.w("order_items").find({ orderId: { $in: orderIds } }).toArray(),
    ctx.w("order_status_events").find({ orderId: { $in: orderIds } }, { sort: { changedAt: 1 } }).toArray(),
    ctx.w("payments").find({ orderId: { $in: orderIds } }).toArray(),
  ]);
  const forOrder = (rows: WithId<Document>[], id: ObjectId) => rows.filter((r) => id.equals(r.orderId));

  return orders.map((o) => {
    const payment = forOrder(payments, o._id)[0];
    const orderEvents = forOrder(events, o._id);
    return {
      id: o._id.toString(),
      orderNumber: o.orderNumber as string,
      status: o.status as OrderStatus,
      subtotal: o.subtotal as number,
      discount: o.discount as number,
      total: o.total as number,
      paymentMethod: o.paymentMethod as string,
      createdAt: (o.createdAt as Date).toISOString(),
      items: forOrder(items, o._id).map((i) => ({
        name: i.name as string,
        unit: i.unit as string,
        supplierName: i.supplierName as string,
        quantity: i.quantity as number,
        unitPrice: i.unitPrice as number,
        discount: i.discount as number,
        lineTotal: i.lineTotal as number,
      })),
      timeline: ORDER_STATUSES.map((status) => {
        const e = orderEvents.find((ev) => ev.status === status);
        return { status, at: e ? (e.changedAt as Date).toISOString() : null };
      }),
      payment: payment
        ? {
            status: payment.status as "PAID" | "PENDING",
            paidOnTime: (payment.paidOnTime as boolean | null) ?? null,
            paidAt: payment.paidAt ? (payment.paidAt as Date).toISOString() : null,
          }
        : null,
    };
  });
}

export type OrderView = Awaited<ReturnType<typeof listOrders>>[number];

/**
 * Moves an order one step along Order Placed, Packing, Out for Delivery, Delivered.
 * On delivery, Cash on Delivery is settled and the delivered stock goes back onto the shelf.
 * `w` is the order's own shop wall, so this can never touch another shop's rows.
 */
export async function advanceOrder(w: ReturnType<typeof walled>, orderId: ObjectId) {
  const order = await w("orders").findOne({ _id: orderId });
  if (!order) throw new HttpError(404, "Order not found.");
  const next = ORDER_STATUSES[ORDER_STATUSES.indexOf(order.status as OrderStatus) + 1];
  if (!next) throw new HttpError(409, "This order has already been delivered.");

  const now = new Date();
  // Conditional on the current status, so two quick taps can't skip a step.
  const { modifiedCount } = await w("orders").updateOne(
    { _id: orderId, status: order.status },
    { $set: { status: next, updatedAt: now } },
  );
  if (!modifiedCount) throw new HttpError(409, "This order was just updated. Refreshing.");
  await w("order_status_events").insertOne({ orderId, status: next, changedAt: now });

  if (next === "DELIVERED") {
    await w("payments").updateOne({ orderId, status: "PENDING" }, { $set: { status: "PAID", paidAt: now, paidOnTime: true } });
    const items = await w("order_items").find({ orderId }).toArray();
    for (const item of items) {
      const stock = await w("stock_items").findOne({ productId: item.productId });
      if (!stock) continue;
      const quantity = stock.quantity + item.quantity;
      await w("stock_items").updateOne(
        { _id: stock._id },
        { $set: { quantity, fullCapacity: Math.max(stock.fullCapacity, quantity), updatedAt: now } },
      );
    }
  }
  return next;
}
