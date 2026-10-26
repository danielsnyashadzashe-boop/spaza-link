"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, FileCheck2, Info, PiggyBank, ReceiptText, ShieldAlert, ShieldCheck, Wallet } from "lucide-react";
import { api } from "@/lib/client";
import { formatRand } from "@/lib/rules";
import type { Financials } from "@/lib/types";
import { useShop } from "@/components/shop-context";
import { useToast } from "@/components/toast";
import { Card, cn, SectionTitle, Skeleton } from "@/components/kit";
import { ReportDownload } from "@/components/report-download";
import { CountUp } from "@/components/motion";
import { SpendChart } from "./spend-chart";

const HEALTH = {
  Good: { icon: ShieldCheck, cls: "bg-ok-50 text-ok border-ok/25", note: "Consistent trading and payments a lender can rely on." },
  Fair: { icon: ShieldCheck, cls: "bg-warn-50 text-mustard-700 border-warn/30", note: "Building a record. Keep ordering and paying on time." },
  "At Risk": { icon: ShieldAlert, cls: "bg-bad-50 text-bad border-bad/25", note: "Not enough on time trading history yet." },
} as const;

export function FinanceScreen() {
  const toast = useToast();
  const { shop } = useShop();
  const [data, setData] = useState<Financials | null>(null);

  useEffect(() => {
    api<Financials>("/api/finance")
      .then(setData)
      .catch((e: Error) => toast(e.message, "bad"));
  }, [toast]);

  const s = data?.scorecard;
  const health = s ? HEALTH[s.creditHealth] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm font-semibold text-pink-600">Financial portal</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Your trading record</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Every order you place builds verified proof of income. Take it to the bank in one tap.
          </p>
        </div>
      </div>

      <Card className="relative overflow-hidden border-0 bg-ink p-6 text-white sm:p-8">
        <div className="bg-weave absolute inset-0 opacity-25 invert" aria-hidden />
        <div className="absolute -right-20 -top-28 size-80 rounded-full bg-mustard/25 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-mustard text-ink">
              <FileCheck2 className="size-7" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold">Financial Health Report</h2>
              <p className="mt-1 max-w-lg text-sm text-white/70">
                Your shop details, monthly spend, payment record and credit health, signed with an integrity code. Download it as a
                PDF for the bank or as PowerPoint slides to present.
              </p>
            </div>
          </div>
          <ReportDownload
            endpoint="/api/report"
            filename={`Financial_Health_Report_${(shop?.name ?? "shop").replace(/[^\w]+/g, "_")}`}
            label="Download report"
            className="h-16 px-8 text-lg"
          />
        </div>
      </Card>

      <section aria-label="Bank scorecard">
        <SectionTitle eyebrow="Bank scorecard" title="What a lender sees" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={Wallet} label="Total money spent" value={s && formatRand(s.totalSpent)} count={s ? { value: s.totalSpent, format: formatRand } : undefined} sub={s && `${s.orderCount} verified orders`} />
          <Stat
            icon={CalendarCheck}
            label="On time payments"
            value={s && (s.onTimeRate === null ? "None yet" : `${Math.round(s.onTimeRate * 100)}%`)}
            sub={s && `${s.paymentsOnTime} of ${s.paymentsSettled} settled${s.paymentsPending ? ` · ${s.paymentsPending} pending` : ""}`}
          />
          <Stat icon={ReceiptText} label="Average monthly spend" value={s && formatRand(s.averageMonthlySpend)} count={s ? { value: s.averageMonthlySpend, format: formatRand } : undefined} sub={s && `${s.activeMonths} active months`} />
          <Card className={cn("border p-5", health?.cls)}>
            {s && health ? (
              <>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] opacity-80">
                  <health.icon className="size-4" /> Credit health status
                </p>
                <p className="mt-2 font-display text-3xl font-extrabold">{s.creditHealth}</p>
                <p className="num text-sm font-semibold opacity-90">Score {s.creditScore}/100</p>
                <p className="mt-1 text-xs opacity-80">{health.note}</p>
              </>
            ) : (
              <Skeleton className="h-24" />
            )}
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <Card className="p-5 sm:p-6">
          <SectionTitle
            eyebrow="Monthly store spending"
            title="Spend over the last 6 months"
            action={s ? <span className="flex items-center gap-1.5 text-sm text-ok"><PiggyBank className="size-4" /> {formatRand(s.totalSaved)} saved in bulk</span> : null}
          />
          {data ? <SpendChart data={data.monthly} /> : <Skeleton className="h-72" />}
          {data && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Monthly spend table</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 font-semibold">Month</th>
                    <th className="py-2 text-right font-semibold">Orders</th>
                    <th className="py-2 text-right font-semibold">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.map((m) => (
                    <tr key={m.key} className="border-b border-line/60 last:border-0">
                      <td className="py-2">{m.month}</td>
                      <td className="num py-2 text-right">{m.orders}</td>
                      <td className="num py-2 text-right font-semibold">{formatRand(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="h-fit p-5 sm:p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <Info className="size-5 text-brand" /> How credit health is worked out
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">An alternative credit score out of 100, built only from your logged trading:</p>
          <ul className="mt-4 space-y-3 text-sm">
            <Weight pct={50} label="On time payments" body="Share of settled payments made on time." />
            <Weight pct={30} label="Months of activity" body="Months with orders, out of the last six." />
            <Weight pct={20} label="Consistency" body="How steady your monthly spend is." />
          </ul>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <span className="rounded-lg bg-ok-50 py-2 text-ok">Good ≥ 70</span>
            <span className="rounded-lg bg-warn-50 py-2 text-mustard-700">Fair ≥ 45</span>
            <span className="rounded-lg bg-bad-50 py-2 text-bad">At Risk</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  count,
}: {
  icon: typeof Wallet;
  label: string;
  value?: string | null;
  sub?: string | null;
  count?: { value: number; format: (n: number) => string };
}) {
  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="size-4 text-brand" /> {label}
      </p>
      {value ? (
        <>
          <p className="num mt-2 font-display text-3xl font-extrabold tracking-tight">{count ? <CountUp {...count} /> : value}</p>
          <p className="text-sm text-muted-foreground">{sub}</p>
        </>
      ) : (
        <Skeleton className="mt-3 h-14" />
      )}
    </Card>
  );
}

function Weight({ pct, label, body }: { pct: number; label: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="num flex h-8 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand">
        {pct}%
      </span>
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="text-muted-foreground">{body}</span>
      </span>
    </li>
  );
}
