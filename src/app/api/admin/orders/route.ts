import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api";
import { allOrders } from "@/lib/admin";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/rules";

export const GET = withAdmin(async (req, { db }) => {
  const status = req.nextUrl.searchParams.get("status");
  const filter = ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;
  return NextResponse.json({ orders: await allOrders(db, filter) });
});
