"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck,
  Factory,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import type { platformOverview } from "@/lib/admin";
import { api } from "@/lib/client";
import { formatRand, ORDER_STATUS_LABELS } from "@/lib/rules";
import { Card, cn, Pill, Skeleton } from "@/components/kit";
import { useToast } from "@/components/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bars, ChartCard, COLORS, compactRand, StockStack, TrendLine } from "./charts";
import { PageHeader } from "./page-header";
import { ReportDownload } from "@/components/report-download";
import { CountUp } from "@/components/motion";

type OverviewData = Awaited<ReturnType<typeof platformOverview>>;

export const STATUS_TONE = { PLACED: "brand", PACKING: "mustard", OUT_FOR_DELIVERY: "pink", DELIVERED: "ok" } as const;

export function Overview() {
  const toast = useToast();
  const [d, setD] = useState<OverviewData | null>(null);

  useEffect(() => {
    api<OverviewData>("/api/admin/overview")
      .then(setD)
      .catch((e: Error) => toast(e.message, "bad"));
  }, [toast]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin portal"
        title="Platform overview"
        action={<ReportDownload endpoint="/api/admin/report" filename="SpazaLink_Platform_Report" label="Platform report" variant="primary" size="md" />}
        explainer={
          <>
            <p>
              This is the whole SpazaLink network on one page: every spaza shop, order, payment and stock shelf, read live
              from the database. Use it to spot shops that need help, suppliers that need verifying and stock that is about
              to run out.
            </p>
            <p className="text-muted-foreground">
              Money figures are the value of orders placed through SpazaLink (payments run in sandbox mode).
            </p>
          </>
        }
      />

      {!d ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key figures">
            <Kpi icon={Store} label="Spaza shops" value={d.kpis.shops} sub={`${d.kpis.activeShops} ordered in the last 30 days`} />
            <Kpi
              icon={Wallet}
              label="Order value this month"
              value={d.kpis.gmvThisMonth}
              format={formatRand}
              change={pctChange(d.kpis.gmvThisMonth, d.kpis.gmvLastMonth)}
              sub={`${formatRand(d.kpis.gmvTotal)} over six months`}
            />
            <Kpi
              icon={Receipt}
              label="Orders this month"
              value={d.kpis.ordersThisMonth}
              change={pctChange(d.kpis.ordersThisMonth, d.kpis.ordersLastMonth)}
              sub={`Average order ${formatRand(d.kpis.avgOrderValue)}`}
            />
            <Kpi icon={PiggyBank} label="Bulk savings for shops" value={d.kpis.savingsTotal} format={formatRand} sub="Discounts passed on to shop owners" />
            <Kpi
              icon={CalendarCheck}
              label="Payments on time"
              value={d.kpis.onTimeRate === null ? "None yet" : `${Math.round(d.kpis.onTimeRate * 100)}%`}
              sub="Across every settled payment"
            />
            <Kpi icon={ShieldCheck} label="Average compliance" value={d.kpis.avgCompliance} format={(n) => `${Math.round(n)}%`} sub="CIPC, BEE, tax and profile" />
            <Kpi icon={Truck} label="Deliveries in progress" value={d.kpis.inFlight} sub="Placed, packing or on the road" />
            <Kpi
              icon={AlertTriangle}
              label="Critical stock lines"
              value={d.kpis.redItems}
              sub={`of ${d.kpis.stockItems} shelves tracked`}
              tone={d.kpis.redItems ? "bad" : undefined}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <ChartCard eyebrow="Registrations" title="New shops per month" description="Shop owners who registered on SpazaLink each month.">
              <Bars data={d.monthly} x="month" y="newShops" name="New shops" color={COLORS.mustard} height={240} />
            </ChartCard>
            <ChartCard eyebrow="Registrations" title="Newest shops" description="The most recently registered spaza shops, newest first.">
              <ul className="divide-y divide-line">
                {d.newestShops.map((s) => (
                  <li key={s.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 font-display text-sm font-extrabold text-pink-600">
                      {s.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {s.name} {isNew(s.createdAt) && <Pill tone="pink">New</Pill>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.ownerName} · {s.location}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Joined {new Date(s.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</p>
                      <p>
                        {s.compliance}% compliant · {s.orderCount} orders
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/admin/shops" className="mt-4 inline-block text-sm font-semibold text-pink-600 hover:underline">
                See all shops
              </Link>
            </ChartCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard eyebrow="Growth" title="Order value per month" description="Total value of orders placed through SpazaLink each month.">
              <TrendLine data={d.monthly} x="month" y="gmv" name="Order value" format={compactRand} />
            </ChartCard>
            <ChartCard eyebrow="Activity" title="Orders per month" description="How many orders shops placed each month.">
              <Bars data={d.monthly} x="month" y="orders" name="Orders" color={COLORS.pink} />
            </ChartCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard eyebrow="Deliveries" title="Orders by status" description="Where every order is on its delivery timeline right now.">
              <Bars
                data={d.ordersByStatus.map((s) => ({ status: ORDER_STATUS_LABELS[s.status], count: s.count }))}
                x="status"
                y="count"
                name="Orders"
                colors={[COLORS.navy, COLORS.mustard, COLORS.pink, COLORS.ok]}
              />
            </ChartCard>
            <ChartCard eyebrow="Payments" title="Order value by payment method" description="Which way shop owners prefer to pay.">
              <Bars data={d.paymentMix} x="method" y="amount" name="Order value" color={COLORS.mustard} format={compactRand} horizontal height={200} />
              <div className="mt-3 flex flex-wrap gap-2">
                {d.paymentMix.map((p) => (
                  <Pill key={p.method} tone="neutral">
                    {p.method}: {p.orders} orders
                  </Pill>
                ))}
              </div>
            </ChartCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard eyebrow="Catalogue" title="Best selling products" description="The eight products bringing in the most order value.">
              <Bars data={d.topProducts} x="name" y="revenue" name="Order value" format={compactRand} horizontal height={320} />
            </ChartCard>
            <ChartCard eyebrow="Catalogue" title="Sales by category" description="Which aisles of the spaza shop sell the most.">
              <Bars data={d.categorySales} x="category" y="revenue" name="Order value" color={COLORS.pink} format={compactRand} horizontal height={320} />
            </ChartCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <ChartCard
              eyebrow="Shelves"
              title="Stock health in every shop"
              description="Each bar is a shop. Red lines are under 20% of capacity and trigger a Quick Fix alert for the owner."
            >
              <StockStack data={d.stockByShop} height={Math.max(260, d.stockByShop.length * 38)} />
            </ChartCard>
            <div className="grid gap-6">
              <ChartCard eyebrow="Lending" title="Credit health of shops" description="From on time payments, active months and steady spending.">
                <Bars
                  data={d.creditDistribution.map((c) => ({ label: c.key, count: c.count }))}
                  x="label"
                  y="count"
                  name="Shops"
                  colors={[COLORS.ok, COLORS.warn, COLORS.bad]}
                  height={170}
                />
              </ChartCard>
              <ChartCard eyebrow="Compliance" title="Compliance scores" description="How many shops have their paperwork in order.">
                <Bars
                  data={d.complianceDistribution.map((c) => ({ label: c.key, count: c.count }))}
                  x="label"
                  y="count"
                  name="Shops"
                  color={COLORS.navy}
                  height={170}
                />
              </ChartCard>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard eyebrow="Wholesalers" title="Order value by supplier" description="How much business each verified wholesaler receives.">
              <Bars data={d.supplierRevenue} x="supplier" y="revenue" name="Order value" color={COLORS.navy} format={compactRand} horizontal height={240} />
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Pill tone="ok">
                  <BadgeCheck className="size-3" /> {d.kpis.suppliersVerified} verified suppliers
                </Pill>
                {d.kpis.suppliersPending > 0 && (
                  <Link href="/admin/suppliers">
                    <Pill tone="mustard">
                      <Factory className="size-3" /> {d.kpis.suppliersPending} waiting for review
                    </Pill>
                  </Link>
                )}
                <Pill tone="neutral">{d.kpis.productsVerified} products listed</Pill>
              </div>
            </ChartCard>

            <ChartCard eyebrow="Needs attention" title="Most critical stock" description="The emptiest shelves across all shops.">
              {d.lowStock.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No shelf is in the red. Lovely.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.lowStock.map((s) => (
                      <TableRow key={`${s.shop}${s.item}`}>
                        <TableCell className="font-medium">{s.shop}</TableCell>
                        <TableCell className="text-muted-foreground">{s.item}</TableCell>
                        <TableCell className="text-right">
                          <span className="num font-semibold text-bad">
                            {s.quantity}/{s.fullCapacity}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground">({s.pct}%)</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ChartCard>
          </section>

          <ChartCard eyebrow="Latest" title="Recent orders" description="The newest orders on the platform.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                    <TableCell className="font-medium">{o.shop}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("en-ZA")}</TableCell>
                    <TableCell>
                      <Pill tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Pill>
                    </TableCell>
                    <TableCell className="num text-right font-semibold">{formatRand(o.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Link href="/admin/orders" className="mt-3 inline-block text-sm font-semibold text-pink-600 hover:underline">
              See all orders
            </Link>
          </ChartCard>
        </>
      )}
    </div>
  );
}

function pctChange(now: number, before: number) {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

function Kpi({
  icon: Icon,
  label,
  value,
  format = (n: number) => String(Math.round(n)),
  sub,
  change,
  tone,
}: {
  icon: typeof Store;
  label: string;
  /** Numbers count up on load; text is shown as is. */
  value: string | number;
  format?: (n: number) => string;
  sub: string;
  change?: number | null;
  tone?: "bad";
}) {
  return (
    <Card className="p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <span className={cn("flex size-10 items-center justify-center rounded-xl", tone === "bad" ? "bg-bad-50 text-bad" : "bg-brand-50 text-brand")}>
          <Icon className="size-5" />
        </span>
        {change !== undefined && change !== null && (
          <span className={cn("flex items-center gap-0.5 text-xs font-semibold", change >= 0 ? "text-ok" : "text-bad")}>
            {change >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(change)}% vs last month
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={cn("num mt-1 font-display text-3xl font-extrabold tracking-tight", tone === "bad" ? "text-bad" : "text-brand")}>
        {typeof value === "number" ? <CountUp value={value} format={format} /> : value}
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
    </Card>
  );
}

/** Registered within the last 14 days. */
function isNew(iso: string) {
  return Date.now() - new Date(iso).getTime() < 14 * 86_400_000;
}
