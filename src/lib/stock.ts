import "server-only";
import type { ShopContext } from "./api";
import { verifiedCatalogue } from "./catalogue";
import { stockBand, stockRatio } from "./rules";

export async function listStock(ctx: ShopContext) {
  const items = await ctx.w("stock_items").find({}, { sort: { name: 1 } }).toArray();
  const catalogue = await verifiedCatalogue(ctx.db, items.map((i) => i.productId));
  const byId = new Map(catalogue.map((p) => [p.id, p]));
  return items.map((i) => ({
    id: i._id.toString(),
    productId: i.productId.toString(),
    name: i.name as string,
    unit: i.unit as string,
    quantity: i.quantity as number,
    fullCapacity: i.fullCapacity as number,
    ratio: stockRatio(i.quantity, i.fullCapacity),
    band: stockBand(i.quantity, i.fullCapacity),
    updatedAt: (i.updatedAt as Date).toISOString(),
    product: byId.get(i.productId.toString()) ?? null,
  }));
}
