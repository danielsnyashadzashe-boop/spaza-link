import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api";
import { shopSummaries } from "@/lib/admin";

export const GET = withAdmin(async (_req, { db }) => NextResponse.json({ shops: await shopSummaries(db) }));
