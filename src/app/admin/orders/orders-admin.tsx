"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FastForward, Search } from "lucide-react";
import type { allOrders } from "@/lib/admin";
import { api } from "@/lib/client";
import { formatRand, ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/rules";
import { Button, Card, Input, Pill, Skeleton } from "@/components/kit";
import { useToast } from "@/components/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_TONE } from "../overview";
import { PageHeader } from "../page-header";
import { Bars, ChartCard, COLORS, compactRand, Donut } from "../charts";

type OrderRow = Awaited<ReturnType<typeof allOrders>>[number];
type Filter = "ALL" | OrderStatus;

const PAY_TONE = { "Paid on time": "ok", "Paid late": "bad", Pending: "mustard", None: "neutral" } as const;

export function OrdersAdmin() {
  const toast = useToast();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    () => api<{ orders: OrderRow[] }>("/api/admin/orders").then(({ orders }) => setOrders(orders)),
    [],
  );
  useEffect(() => {
    api<{ orders: OrderRow[] }>("/api/admin/orders")
      .then(({ orders }) => setOrders(orders))
      .catch((e: Error) => toast(e.message, "bad"));
  }, [toast]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: orders?.length ?? 0, PLACED: 0, PACKING: 0, OUT_FOR_DELIVERY: 0, DELIVERED: 0 };
    for (const o of orders ?? []) c[o.status]++;
    return c;
  }, [orders]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (orders ?? []).filter(
      (o) => (filter === "ALL" || o.status === filter) && (!q || `${o.orderNumber} ${o.shop}`.toLowerCase().includes(q)),
    );
  }, [orders, filter, query]);

  async function advance(o: OrderRow) {
    setBusy(o.id);
    try {
      const { status } = await api<{ status: OrderStatus }>(`/api/admin/orders/${o.id}/advance`, { method: "POST" });
      toast(`${o.orderNumber} is now ${ORDER_STATUS_LABELS[status]}`);
      await load();
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin portal"
        title="Orders and deliveries"
        explainer={
          <>
            <p>
              Every order placed by every shop. Each one moves through four steps: Order Placed, Packing, Out for Delivery and
              Delivered. The shop owner sees each step live on their delivery timeline.
            </p>
            <p className="text-muted-foreground">
              Use <strong>Move on</strong> to act as the wholesaler. On delivery, Cash on Delivery is marked paid and the
              stock goes back onto the shop&apos;s shelf.
            </p>
          </>
        }
      />

      {orders && (
        <section className="grid gap-6 lg:grid-cols-2">
          <ChartCard eyebrow="Deliveries" title="Where orders are right now" description="Share of the latest 200 orders at each delivery step.">
            <Donut
              centerLabel="orders"
              data={[
                { key: "placed", label: ORDER_STATUS_LABELS.PLACED, value: counts.PLACED, color: COLORS.navy },
                { key: "packing", label: ORDER_STATUS_LABELS.PACKING, value: counts.PACKING, color: COLORS.mustard },
                { key: "out", label: ORDER_STATUS_LABELS.OUT_FOR_DELIVERY, value: counts.OUT_FOR_DELIVERY, color: COLORS.pink },
                { key: "delivered", label: ORDER_STATUS_LABELS.DELIVERED, value: counts.DELIVERED, color: COLORS.ok },
              ]}
            />
          </ChartCard>
          <ChartCard eyebrow="Payments" title="Order value by payment outcome" description="Paid on time, paid late, or still waiting for cash on delivery.">
            <Bars
              data={(["Paid on time", "Paid late", "Pending"] as const).map((k) => ({
                outcome: k,
                value: Math.round(orders.filter((o) => o.paymentStatus === k).reduce((a, o) => a + o.total, 0)),
              }))}
              x="outcome"
              y="value"
              name="Order value"
              colors={[COLORS.ok, COLORS.bad, COLORS.mustard]}
              format={compactRand}
              height={240}
            />
          </ChartCard>
        </section>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-auto flex-wrap rounded-xl bg-paper-2 p-1">
            {(["ALL", ...ORDER_STATUSES] as Filter[]).map((f) => (
              <TabsTrigger key={f} value={f} className="rounded-lg px-3 py-1.5 data-[state=active]:bg-brand data-[state=active]:text-white">
                {f === "ALL" ? "All" : ORDER_STATUS_LABELS[f]} <span className="num ml-1 opacity-70">{counts[f]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Order number or shop" className="pl-10" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {!orders ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-paper-2/50">
                <TableHead className="pl-6">Order</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="pr-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="pl-6 font-mono text-xs">{o.orderNumber}</TableCell>
                  <TableCell className="font-medium">{o.shop}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.lines} lines, {o.units} units
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-muted-foreground">{o.paymentMethod}</p>
                    <Pill tone={PAY_TONE[o.paymentStatus as keyof typeof PAY_TONE] ?? "neutral"}>{o.paymentStatus}</Pill>
                  </TableCell>
                  <TableCell>
                    <Pill tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Pill>
                  </TableCell>
                  <TableCell className="num text-right font-semibold">
                    {formatRand(o.total)}
                    {o.discount > 0 && <p className="text-[11px] font-normal text-ok">saved {formatRand(o.discount)}</p>}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    {o.status !== "DELIVERED" ? (
                      <Button size="sm" variant="secondary" loading={busy === o.id} onClick={() => advance(o)}>
                        <FastForward className="size-4" /> Move on
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Complete</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No orders match.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
