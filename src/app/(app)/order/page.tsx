import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderScreen } from "./order-screen";

export const metadata: Metadata = { title: "Order" };

export default function OrderPage() {
  return (
    <Suspense>
      <OrderScreen />
    </Suspense>
  );
}
