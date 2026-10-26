import { NextResponse } from "next/server";
import { parseId, withShop } from "@/lib/api";
import { advanceOrder, listOrders } from "@/lib/orders";

/** Demo stand-in for the wholesaler's dispatch system (admins have the same action in the portal). */
export const POST = withShop<{ id: string }>(async (_req, ctx, { id }) => {
  const orderId = parseId(id);
  await advanceOrder(ctx.w, orderId);
  const [view] = await listOrders(ctx, { ids: [orderId] });
  return NextResponse.json({ order: view });
});
