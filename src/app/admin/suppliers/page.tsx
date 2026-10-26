import type { Metadata } from "next";
import { SuppliersAdmin } from "./suppliers-admin";

export const metadata: Metadata = { title: "Suppliers" };

export default function AdminSuppliersPage() {
  return <SuppliersAdmin />;
}
