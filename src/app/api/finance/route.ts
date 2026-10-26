import { NextResponse } from "next/server";
import { withShop } from "@/lib/api";
import { getFinancials } from "@/lib/services";

export const GET = withShop(async (_req, ctx) => NextResponse.json(await getFinancials(ctx)));
