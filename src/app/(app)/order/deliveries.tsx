"use client";

import { useState } from "react";
import { Check, ChevronDown, PackageCheck, Truck, Warehouse, ClipboardCheck, FastForward } from "lucide-react";
import { api } from "@/lib/client";
import { formatRand, ORDER_STATUS_LABELS, PAYMENT_METHODS, type OrderStatus, type PaymentMethod } from "@/lib/rules";
import type { Order } from "@/lib/types";
import { useToast } from "@/components/toast";
import { Button, Card, cn, Pill, SectionTitle, Skeleton } from "@/components/kit";

const STEP_ICONS: Record<OrderStatus, typeof Check> = {
  PLACED: ClipboardCheck,
  PACKING: Warehouse,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: PackageCheck,
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function Deliveries({
  orders,
  highlight,
  onChange,
}: {
  orders: Order[] | null;
  highlight: string | null;
  onChange: () => Promise<void>;
}) {
  const [showPast, setShowPast] = useState(false);
  const active = (orders ?? []).filter((o) => o.status !== "DELIVERED");
  const past = (orders ?? []).filter((o) => o.status === "DELIVERED");

  return (
    <section>
      <SectionTitle
        eyebrow="Delivery tracking"
        title="Your orders"
        action={<Pill tone="brand"><span className="size-1.5 animate-pulse rounded-full bg-brand" /> Live</Pill>}
      />
      {orders === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {active.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">No deliveries on the way. Orders you place show up here.</Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {active.map((o) => (
                <OrderCard key={o.id} order={o} highlight={o.id === highlight} onChange={onChange} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowPast((s) => !s)}
                className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-ink"
              >
                <ChevronDown className={cn("size-4 transition", showPast && "rotate-180")} />
                {showPast ? "Hide" : "Show"} {past.length} delivered order{past.length === 1 ? "" : "s"}
              </button>
              {showPast && (
                <Card className="mt-3 divide-y divide-line/70">
                  {past.map((o) => (
                    <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                      <span className="font-semibold">{o.orderNumber}</span>
                      <span className="text-muted-foreground">{fmtTime(o.createdAt)}</span>
                      <span className="text-muted-foreground">{PAYMENT_METHODS[o.paymentMethod as PaymentMethod]}</span>
                      <Pill tone="ok">Delivered</Pill>
                      <span className="num font-bold">{formatRand(o.total)}</span>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function OrderCard({ order: o, highlight, onChange }: { order: Order; highlight: boolean; onChange: () => Promise<void> }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const currentIdx = o.timeline.findIndex((s) => s.status === o.status);

  async function advance() {
    setBusy(true);
    try {
      await api(`/api/orders/${o.id}/advance`, { method: "POST" });
      await onChange();
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={cn("p-5 transition", highlight && "ring-2 ring-mustard ring-offset-2 ring-offset-paper")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold">{o.orderNumber}</p>
          <p className="text-xs text-muted-foreground">
            {fmtTime(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? "" : "s"} ·{" "}
            {PAYMENT_METHODS[o.paymentMethod as PaymentMethod]}
          </p>
        </div>
        <div className="text-right">
          <p className="num font-display text-lg font-extrabold">{formatRand(o.total)}</p>
          {o.discount > 0 && <p className="num text-xs font-semibold text-ok">saved {formatRand(o.discount)}</p>}
        </div>
      </div>

      <ol className="mt-5 space-y-0">
        {o.timeline.map((step, i) => {
          const Icon = STEP_ICONS[step.status];
          const done = i < currentIdx;
          const current = i === currentIdx;
          const last = i === o.timeline.length - 1;
          return (
            <li key={step.status} className="relative flex gap-3 pb-5 last:pb-0">
              {!last && (
                <span
                  className={cn("absolute left-[17px] top-9 h-[calc(100%-28px)] w-0.5", i < currentIdx ? "bg-brand" : "bg-line")}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition",
                  done && "border-brand bg-brand text-white",
                  current && "animate-pulse-ring border-brand bg-white text-brand",
                  !done && !current && "border-line bg-white text-muted-foreground/50",
                )}
              >
                {done ? <Check className="size-4" /> : <Icon className="size-4" />}
              </span>
              <div className="pt-1.5">
                <p className={cn("text-sm font-semibold", !done && !current && "text-muted-foreground/70")}>
                  {ORDER_STATUS_LABELS[step.status]}
                  {current && <span className="ml-2 text-xs font-medium text-brand">Current step</span>}
                </p>
                {step.at && <p className="text-xs text-muted-foreground">{fmtTime(step.at)}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-dashed border-line pt-3">
        <p className="text-[11px] text-muted-foreground">Demo: act as the wholesaler</p>
        <Button size="sm" variant="secondary" onClick={advance} loading={busy}>
          <FastForward className="size-4" /> Next status
        </Button>
      </div>
    </Card>
  );
}
