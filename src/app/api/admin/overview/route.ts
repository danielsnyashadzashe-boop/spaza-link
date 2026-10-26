import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api";
import { platformOverview } from "@/lib/admin";

export const GET = withAdmin(async (_req, { db }) => NextResponse.json(await platformOverview(db)));
