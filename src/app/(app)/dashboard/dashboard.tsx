"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import { stockBand, stockRatio, type StockBand } from "@/lib/rules";
import type { StockItem } from "@/lib/types";
import { useShop } from "@/components/shop-context";
import { useToast } from "@/components/toast";
import { ComplianceCard } from "./compliance-card";
import { LowStockAlert } from "./low-stock-alert";
import { StockTracker } from "./stock-tracker";

export function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const { shop, addToCart } = useShop();
  const [items, setItems] = useState<StockItem[] | null>(null);
  const [alertId, setAlertId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const previousBands = useRef(new Map<string, StockBand>());
  const latest = useRef<StockItem[]>([]);
  const saveSeq = useRef(0);

  // Raise the alert the moment any item crosses into Red; never for Green or Yellow.
  const applyItems = useCallback((next: StockItem[]) => {
    const prev = previousBands.current;
    const crossed = next.find((i) => i.band === "red" && prev.has(i.id) && prev.get(i.id) !== "red");
    previousBands.current = new Map(next.map((i) => [i.id, i.band]));
    latest.current = next;
    setItems(next);
    if (crossed) {
      setAlertId(crossed.id);
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    api<{ items: StockItem[] }>("/api/stock")
      .then(({ items }) => applyItems(items))
      .catch((e: Error) => toast(e.message, "bad"));
  }, [applyItems, toast]);

  /** Optimistic local update so the bar colour (and alert) change instantly, then persist. */
  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      const before = latest.current;
      applyItems(
        before.map((i) =>
          i.id === id
            ? { ...i, quantity, ratio: stockRatio(quantity, i.fullCapacity), band: stockBand(quantity, i.fullCapacity) }
            : i,
        ),
      );
      // Only the newest save may write back, so quick taps never flicker to an older value.
      const seq = ++saveSeq.current;
      try {
        const { items: saved } = await api<{ items: StockItem[] }>(`/api/stock/${id}`, {
          method: "PATCH",
          json: { quantity },
        });
        if (seq === saveSeq.current) applyItems(saved);
      } catch (e) {
        if (seq === saveSeq.current) applyItems(before);
        toast((e as Error).message, "bad");
      }
    },
    [applyItems, toast],
  );

  const redItems = useMemo(() => (items ?? []).filter((i) => i.band === "red"), [items]);
  const featured = redItems.find((i) => i.id === alertId) ?? redItems[0] ?? null;

  function quickFix(item: StockItem) {
    const missing = item.fullCapacity - item.quantity;
    if (missing <= 0) return;
    addToCart(item.productId, missing);
    router.push("/order?from=quickfix");
  }

  const firstName = shop?.ownerName.split(" ")[0];

  return (
    <div className="space-y-6">
      <LowStockAlert
        item={dismissed ? null : featured}
        others={redItems.length - 1}
        onQuickFix={quickFix}
        onDismiss={() => setDismissed(true)}
      />

      <div className="animate-fade-up">
        <p className="text-sm font-semibold text-pink-600">Sawubona{firstName ? `, ${firstName}` : ""} 👋</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          {shop?.name ?? "Your shop"} <span className="text-muted-foreground/60">at a glance</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <ComplianceCard />
        <StockTracker
          items={items}
          onItems={applyItems}
          onQuantity={updateQuantity}
          onQuickFix={quickFix}
        />
      </div>
    </div>
  );
}
