import type { Metadata } from "next";
import { ProductsAdmin } from "./products-admin";

export const metadata: Metadata = { title: "Products" };

export default function AdminProductsPage() {
  return <ProductsAdmin />;
}
