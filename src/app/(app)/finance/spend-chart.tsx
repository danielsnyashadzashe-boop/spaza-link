"use client";

import { compactRand, TrendLine } from "@/components/charts";
import type { Financials } from "@/lib/types";

/** The shop's monthly spend as a shadcn line chart. */
export function SpendChart({ data }: { data: Financials["monthly"] }) {
  return <TrendLine data={data} x="month" y="total" name="Spend" color="#062654" format={compactRand} height={288} />;
}
