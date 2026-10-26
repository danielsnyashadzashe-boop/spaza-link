"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlaskConical, Search, Zap } from "lucide-react";
import { api } from "@/lib/client";
import type { Order, Product } from "@/lib/types";
import { useToast } from "@/components/toast";
import { cn, Pill, Skeleton } from "@/components/kit";
import { useShop } from "@/components/shop-context";
import { ProductCard } from "./product-card";
import { CartPanel } from "./cart-panel";
import { Deliveries } from "./deliveries";
import handover from "../../../../public/images/delivery-handover.webp";

const POLL_MS = 4000;

export function OrderScreen() {
  const toast = useToast();
  const params = useSearchParams();
  const fromQuickFix = params.get("from") === "quickfix";
  const { cart } = useShop();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [highlight, setHighlight] = useState<string | null>(null);
  const deliveriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ products: Product[] }>("/api/products")
      .then(({ products }) => setProducts(products))
      .catch((e: Error) => toast(e.message, "bad"));
  }, [toast]);

  const loadOrders = useCallback(
    () => api<{ orders: Order[] }>("/api/orders").then(({ orders }) => setOrders(orders)),
    [],
  );

  // Keep the delivery timeline live: poll while the tab is visible.
  useEffect(() => {
    api<{ orders: Order[] }>("/api/orders")
      .then(({ orders }) => setOrders(orders))
      .catch((e: Error) => toast(e.message, "bad"));
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadOrders().catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [loadOrders, toast]);

  const categories = useMemo(() => ["All", ...new Set((products ?? []).map((p) => p.category))], [products]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.supplier.name.toLowerCase().includes(q)),
    );
  }, [products, query, category]);

  function onPlaced(order: Order) {
    setOrders((o) => [order, ...(o ?? [])]);
    setHighlight(order.id);
    setTimeout(() => deliveriesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  return (
    <div className="space-y-8">
      <div className="grid animate-fade-up overflow-hidden rounded-3xl border border-line bg-card shadow-card lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col justify-center gap-4 p-7 sm:p-10">
          <p className="text-sm font-semibold text-pink-600">Ordering and checkout</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand sm:text-4xl">Buy from verified wholesalers</h1>
          <p className="max-w-xl text-muted-foreground">
            Every product here comes from a supplier we have checked, so what reaches your shelf is genuine and safe.
            Your order is tracked all the way to your counter.
          </p>
          <Pill tone="mustard" className="w-fit py-1.5">
            <FlaskConical className="size-3.5" /> Payments run in sandbox mode
          </Pill>
        </div>
        <div className="relative hidden min-h-56 lg:block">
          <Image
            src={handover}
            alt="A shop owner receiving a packed order across the counter"
            fill
            sizes="40vw"
            placeholder="blur"
            className="object-cover object-[55%_35%]"
          />
        </div>
      </div>

      {fromQuickFix && cart.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-mustard/40 bg-mustard-50 px-4 py-3 text-sm animate-fade-up">
          <Zap className="size-5 shrink-0 text-mustard-700" />
          <span>
            <strong>Quick Fix applied.</strong> The missing stock is in your cart. Choose how to pay and place the order.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_400px]">
        <section aria-label="Catalogue" className="order-2 min-w-0 lg:order-1">
          <div className="mb-5 flex min-w-0 flex-col gap-3">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products or suppliers"
                className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>
            <div className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1 [mask-image:linear-gradient(90deg,#000_88%,transparent)] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:[mask-image:none]">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition",
                    category === c ? "bg-ink text-white" : "border border-line bg-white text-muted-foreground hover:text-ink",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {products === null
              ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-48" />)
              : visible.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {products && visible.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">No verified products match your search.</p>
          )}
        </section>

        <div className="order-1 min-w-0 lg:order-2 lg:sticky lg:top-24">
          <CartPanel products={products} onPlaced={onPlaced} />
        </div>
      </div>

      <div ref={deliveriesRef} className="scroll-mt-24">
        <Deliveries orders={orders} highlight={highlight} onChange={loadOrders} />
      </div>
    </div>
  );
}
