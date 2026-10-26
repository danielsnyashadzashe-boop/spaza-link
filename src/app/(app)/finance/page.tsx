import type { Metadata } from "next";
import { FinanceScreen } from "./finance-screen";

export const metadata: Metadata = { title: "Financial portal" };

export default function FinancePage() {
  return <FinanceScreen />;
}
