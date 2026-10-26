import { NextResponse } from "next/server";
import { withShop } from "@/lib/api";
import { getCompliance, getShop } from "@/lib/services";

export const GET = withShop(async (_req, ctx) => {
  const shop = await getShop(ctx);
  const compliance = await getCompliance(ctx, shop);
  const [ownShop, stockCount, orderCount] = await Promise.all([
    ctx.demo ? ctx.db.collection("shops").findOne({ ownerUserId: ctx.userId }, { projection: { _id: 1 } }) : Promise.resolve(true),
    ctx.w("stock_items").countDocuments(),
    ctx.w("orders").countDocuments(),
  ]);
  return NextResponse.json({
    demo: ctx.demo,
    hasOwnShop: Boolean(ownShop),
    isNewShop: !ctx.demo && stockCount === 0 && orderCount === 0,
    shop: {
      id: shop._id.toString(),
      name: shop.name,
      ownerName: shop.ownerName,
      location: shop.location,
      phone: shop.phone,
      createdAt: shop.createdAt.toISOString(),
    },
    compliance,
  });
});
