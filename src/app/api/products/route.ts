import { NextResponse } from "next/server";
import { withShop } from "@/lib/api";
import { verifiedCatalogue } from "@/lib/catalogue";

export const GET = withShop(async (_req, ctx) => NextResponse.json({ products: await verifiedCatalogue(ctx.db) }));
