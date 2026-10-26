"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, MapPin, Phone, Search, X } from "lucide-react";
import type { shopSummaries } from "@/lib/admin";
import { api } from "@/lib/client";
import { DOCUMENT_TYPES, formatRand, type DocumentType } from "@/lib/rules";
import { Card, cn, Input, Pill, Skeleton } from "@/components/kit";
import { useToast } from "@/components/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bars, ChartCard, COLORS, compactRand, Donut } from "../charts";
import { PageHeader } from "../page-header";
import ownerPhoto from "../../../../public/images/shop-owner-doorway.webp";

type ShopRow = Awaited<ReturnType<typeof shopSummaries>>[number];

const HEALTH_TONE = { Good: "ok", Fair: "warn", "At Risk": "bad" } as const;
const MONTH_LABELS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - (5 - i));
  return d.toLocaleDateString("en-ZA", { month: "short", timeZone: "UTC" });
});

export function ShopsAdmin() {
  const toast = useToast();
  const [shops, setShops] = useState<ShopRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  // Captured once so "New" badges are stable across renders.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    api<{ shops: ShopRow[] }>("/api/admin/shops")
      .then(({ shops }) => setShops(shops))
      .catch((e: Error) => toast(e.message, "bad"));
  }, [toast]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (shops ?? []).filter((s) => !q || `${s.name} ${s.ownerName} ${s.location}`.toLowerCase().includes(q));
  }, [shops, query]);
  const current = shops?.find((s) => s.id === selected) ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin portal"
        title="Spaza shops"
        explainer={
          <>
            <p>
              Every shop registered on SpazaLink. <strong>Compliance</strong> shows how much paperwork a shop has uploaded,{" "}
              <strong>Stock</strong> shows its shelves in green, yellow and red, and <strong>Credit health</strong> is the
              alternative credit score a bank sees on the shop&apos;s Financial Health Report.
            </p>
            <p className="text-muted-foreground">Select a shop to see its monthly spending.</p>
          </>
        }
        image={ownerPhoto}
        imageAlt="A shop owner standing in his doorway"
      />

      {shops && (
        <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <ChartCard eyebrow="Lending" title="Credit health" description="How a bank would rate each shop today.">
            <Donut
              centerLabel="shops"
              data={[
                { key: "good", label: "Good", value: shops.filter((s) => s.creditHealth === "Good").length, color: COLORS.ok },
                { key: "fair", label: "Fair", value: shops.filter((s) => s.creditHealth === "Fair").length, color: COLORS.warn },
                { key: "risk", label: "At Risk", value: shops.filter((s) => s.creditHealth === "At Risk").length, color: COLORS.bad },
              ]}
            />
          </ChartCard>
          <ChartCard eyebrow="Compliance" title="Paperwork per shop" description="Compliance score out of 100 for every registered shop.">
            <Bars
              data={shops.map((s) => ({ shop: s.name, score: s.compliance }))}
              x="shop"
              y="score"
              name="Compliance"
              color={COLORS.pink}
              format={(n) => `${n}%`}
              horizontal
              height={Math.max(240, shops.length * 30)}
            />
          </ChartCard>
        </section>
      )}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by shop, owner or area" className="pl-10" />
      </div>

      {current && <ShopDetail shop={current} onClose={() => setSelected(null)} />}

      <Card className="overflow-hidden">
        {!shops ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-paper-2/50">
                <TableHead className="pl-6">Shop</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">On time</TableHead>
                <TableHead className="pr-6">Credit health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((s) => (
                <TableRow
                  key={s.id}
                  onClick={() => setSelected(s.id === selected ? null : s.id)}
                  className={cn("cursor-pointer", s.id === selected && "bg-pink-50")}
                >
                  <TableCell className="pl-6">
                    <p className="flex items-center gap-1.5 font-semibold text-ink">
                      {s.name}
                      {s.hasLogin && <KeyRound className="size-3.5 text-pink" aria-label="Has a login" />}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.ownerName} · {s.location}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <p className="text-sm">{new Date(s.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</p>
                    {now - new Date(s.createdAt).getTime() < 14 * 86_400_000 && <Pill tone="pink">New</Pill>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-paper-2">
                        <div className="h-full rounded-full bg-gradient-to-r from-pink to-mustard" style={{ width: `${s.compliance}%` }} />
                      </div>
                      <span className="num text-xs font-semibold">{s.compliance}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StockBar stock={s.stock} />
                  </TableCell>
                  <TableCell className="num text-right">{s.orderCount}</TableCell>
                  <TableCell className="num text-right font-semibold">{formatRand(s.totalSpent)}</TableCell>
                  <TableCell className="num text-right">{s.onTimeRate === null ? "None" : `${Math.round(s.onTimeRate * 100)}%`}</TableCell>
                  <TableCell className="pr-6">
                    <Pill tone={HEALTH_TONE[s.creditHealth]}>
                      {s.creditHealth} · {s.creditScore}
                    </Pill>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function StockBar({ stock }: { stock: ShopRow["stock"] }) {
  if (!stock.total) return <span className="text-xs text-muted-foreground">No stock yet</span>;
  const seg = (n: number, cls: string) => n > 0 && <div className={cls} style={{ width: `${(n / stock.total) * 100}%` }} />;
  return (
    <div className="space-y-1">
      <div className="flex h-2 w-28 gap-px overflow-hidden rounded-full">
        {seg(stock.green, "bg-ok")}
        {seg(stock.yellow, "bg-warn")}
        {seg(stock.red, "bg-bad")}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {stock.total} lines · <span className="font-semibold text-bad">{stock.red} critical</span>
      </p>
    </div>
  );
}

function ShopDetail({ shop, onClose }: { shop: ShopRow; onClose: () => void }) {
  return (
    <div className="grid animate-fade-up gap-6 lg:grid-cols-[1fr_1.4fr]">
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-600">Selected shop</p>
            <h2 className="font-display text-2xl font-extrabold text-brand">{shop.name}</h2>
            <p className="text-sm text-muted-foreground">Owner: {shop.ownerName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-paper-2" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 space-y-1.5 text-sm">
          <p className="flex items-center gap-2"><MapPin className="size-4 text-pink" /> {shop.location}</p>
          <p className="flex items-center gap-2"><Phone className="size-4 text-pink" /> {shop.phone}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Total spend" value={formatRand(shop.totalSpent)} />
          <Stat label="Orders" value={String(shop.orderCount)} />
          <Stat label="Credit score" value={`${shop.creditScore}/100`} />
          <Stat label="Payments pending" value={String(shop.paymentsPending)} />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Documents on file</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(DOCUMENT_TYPES) as DocumentType[]).map((t) => (
            <Pill key={t} tone={shop.documents.includes(t) ? "ok" : "neutral"}>
              {t} {shop.documents.includes(t) ? "uploaded" : "missing"}
            </Pill>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          On SpazaLink since {new Date(shop.createdAt).toLocaleDateString("en-ZA", { dateStyle: "long" })}
          {shop.lastOrderAt && `. Last order ${new Date(shop.lastOrderAt).toLocaleDateString("en-ZA", { dateStyle: "medium" })}`}.
        </p>
      </Card>
      <ChartCard eyebrow="Spending" title="Monthly spend, last six months" description="What the shop's Financial Health Report shows its bank.">
        <Bars data={shop.monthly.map((total, i) => ({ month: MONTH_LABELS[i], total }))} x="month" y="total" name="Spend" color={COLORS.pink} format={compactRand} height={240} />
      </ChartCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper-2/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="num font-display text-lg font-extrabold text-brand">{value}</p>
    </div>
  );
}
