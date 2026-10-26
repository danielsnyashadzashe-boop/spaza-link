import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api";

/** Lets the admin portal confirm, server side, that the signed-in user holds the admin role. */
export const GET = withAdmin(async (_req, { name }) => NextResponse.json({ name, role: "admin" }));
