import { NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { HttpError, parseId, withAdmin } from "@/lib/api";
import { advanceOrder } from "@/lib/orders";
import { walled } from "@/lib/walled";

/** Admin moves any order one step along its timeline, working inside that order's own shop wall. */
export const POST = withAdmin<{ id: string }>(async (_req, { db }, { id }) => {
  const orderId = parseId(id);
  const order = await db.collection("orders").findOne({ _id: orderId }, { projection: { shopId: 1 } });
  if (!order) throw new HttpError(404, "Order not found.");
  const status = await advanceOrder(walled(db, order.shopId as ObjectId), orderId);
  return NextResponse.json({ status });
});
