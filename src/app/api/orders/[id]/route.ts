import { NextResponse } from "next/server";
import { HttpError, parseId, withShop } from "@/lib/api";
import { listOrders } from "@/lib/orders";

export const GET = withShop<{ id: string }>(async (_req, ctx, { id }) => {
  const [order] = await listOrders(ctx, { ids: [parseId(id)] });
  if (!order) throw new HttpError(404, "Order not found.");
  return NextResponse.json({ order });
});
