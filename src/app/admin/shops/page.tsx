import type { Metadata } from "next";
import { ShopsAdmin } from "./shops-admin";

export const metadata: Metadata = { title: "Shops" };

export default function AdminShopsPage() {
  return <ShopsAdmin />;
}
