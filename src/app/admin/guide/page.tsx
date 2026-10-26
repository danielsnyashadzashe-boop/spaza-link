import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock3,
  Factory,
  FileCheck2,
  KeyRound,
  LayoutDashboard,
  Lock,
  Package,
  ShieldCheck,
  ShoppingCart,
  Store,
  TrendingUp,
  Truck,
} from "lucide-react";
import { BrandStripe, Logo } from "@/components/logo";
import { ROLES, type Role } from "@/lib/rbac";
import { DOCUMENT_TYPES, PROFILE_WEIGHT, type DocumentType } from "@/lib/rules";

export const metadata: Metadata = { title: "Guide" };

const SCREENS = [
  {
    icon: LayoutDashboard,
    title: "Inventory Dashboard",
    who: "Shop owner",
    body: "Shows how ready the shop is and what needs restocking. Uploading CIPC and BEE papers raises the Compliance Score. Every product on the shelf has a coloured bar, and when one drops into the red a banner slides down with a Quick Fix button that fills the cart with exactly what is missing.",
  },
  {
    icon: ShoppingCart,
    title: "Ordering and Checkout",
    who: "Shop owner",
    body: "A catalogue of verified products only, each with its trust badges. The cart shows bulk savings as their own line, the owner picks PayShap, Instant EFT or Cash on Delivery, and a live timeline follows the order to the door.",
  },
  {
    icon: TrendingUp,
    title: "Financial Portal",
    who: "Shop owner",
    body: "Turns every order into evidence a bank can trust: a monthly spend chart, a bank scorecard and a one tap Financial Health Report PDF with an integrity code.",
  },
];

const ADMIN_AREAS = [
  { icon: LayoutDashboard, title: "Overview", body: "Key figures and graphs for the whole network: order value, orders, deliveries, payments, best sellers, stock health, credit health and compliance." },
  { icon: Store, title: "Shops", body: "Every spaza shop with its compliance, stock, spend, on time payments and credit health. Select one to see its monthly spend." },
  { icon: Truck, title: "Orders", body: "Every order on the platform, filtered by delivery step. Move on acts as the wholesaler and pushes an order to its next step." },
  { icon: Package, title: "Products", body: "The catalogue. Add products, set prices and bulk deals, and verify or reject listings." },
  { icon: Factory, title: "Suppliers", body: "The wholesalers. Verify, hold or reject them; unverified suppliers disappear from every shop at once." },
];

const STEPS = ["Order Placed", "Packing", "Out for Delivery", "Delivered"];

export default function GuidePage() {
  return (
    <article className="mx-auto max-w-4xl space-y-10 pb-12">
      <header className="overflow-hidden rounded-3xl bg-white shadow-card">
        <BrandStripe className="h-1.5 rounded-none" />
        <div className="grid items-center gap-6 p-8 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-pink-600">
              <BookOpen className="size-4" /> Guide
            </p>
            <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-brand">How SpazaLink works</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Everything in one place: who uses the platform, what each screen does, the rules behind every number, and how
              access is kept safe.
            </p>
          </div>
          <Logo variant="full" className="hidden h-32 w-auto sm:block" />
        </div>
      </header>

      <Section n="1" title="The big picture">
        <p>
          Township spaza shops feed whole neighbourhoods, yet they struggle with three things: <strong>empty shelves</strong>{" "}
          from unreliable supply, <strong>unsafe or counterfeit food</strong> from unknown sellers, and{" "}
          <strong>no formal proof of income</strong> when they ask a bank for a loan.
        </p>
        <p>
          SpazaLink links each shop to verified wholesalers, tracks its stock, and turns its everyday buying into a trading
          record a bank can believe. The idea comes from Rethabile Madonsela, the founder.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { t: "Shop owners", b: "Run their shop from the three screens below.", i: Store },
            { t: "Wholesalers", b: "Supply verified, safety compliant stock.", i: Factory },
            { t: "Banks and lenders", b: "Read the Financial Health Report.", i: FileCheck2 },
          ].map(({ t, b, i: Icon }) => (
            <div key={t} className="rounded-2xl bg-white p-4 shadow-card">
              <Icon className="size-5 text-pink" />
              <p className="mt-2 font-semibold text-ink">{t}</p>
              <p className="text-sm text-muted-foreground">{b}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section n="2" title="The three shop screens">
        <div className="space-y-3">
          {SCREENS.map(({ icon: Icon, title, who, body }) => (
            <div key={title} className="flex gap-4 rounded-2xl bg-white p-5 shadow-card">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-mustard">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-brand">
                  {title} <span className="ml-1 text-xs font-semibold text-pink-600">{who}</span>
                </p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section n="3" title="The rules behind the numbers">
        <Rule title="Stock colours">
          Each shelf compares what is left with its full capacity. <Band cls="bg-ok">Green</Band> is over 50%,{" "}
          <Band cls="bg-warn">Yellow</Band> is 20% to 50%, and <Band cls="bg-bad">Red</Band> is under 20%. Only red raises the
          alert and the Quick Fix button.
        </Rule>
        <Rule title="Compliance score">
          A complete shop profile is worth {PROFILE_WEIGHT}%.{" "}
          {(Object.entries(DOCUMENT_TYPES) as [DocumentType, { label: string; weight: number }][])
            .map(([, d]) => `${d.label} adds ${d.weight}%`)
            .join(", ")}
          . A profile with CIPC and BEE lands on 85% Ready.
        </Rule>
        <Rule title="Bulk discounts">
          Each product can carry a deal such as buy 6 or more and save 6%. The saving shows as its own line in the cart, and
          the server always recalculates prices from the catalogue so a cart can never set its own price.
        </Rule>
        <Rule title="Credit health">
          A score out of 100 built only from logged trading: on time payments count for 50, months with orders in the last
          six count for 30, and steady monthly spending counts for 20. Good is 70 and above, Fair is 45 and above, anything
          lower is At Risk.
        </Rule>
        <Rule title="Payments">
          PayShap and Instant EFT settle when the order is placed; Cash on Delivery settles when the order is delivered. In
          this demo every payment runs in sandbox mode, so no real money moves.
        </Rule>
      </Section>

      <Section n="4" title="The life of an order">
        <ol className="grid gap-3 sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s} className="rounded-2xl bg-white p-4 text-center shadow-card">
              <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-pink font-display font-extrabold text-white">
                {i + 1}
              </span>
              <p className="mt-2 font-semibold text-ink">{s}</p>
            </li>
          ))}
        </ol>
        <p>
          The shop owner sees the current step live. When an order is delivered, its stock is added back onto the shop&apos;s
          shelves and the order feeds that month&apos;s spend and the shop&apos;s credit health.
        </p>
      </Section>

      <Section n="5" title="Two safety gates for every product">
        <p className="flex gap-3">
          <BadgeCheck className="mt-0.5 size-5 shrink-0 text-ok" />
          <span>
            A product reaches a shop only when <strong>the wholesaler is verified</strong> and{" "}
            <strong>the product itself is verified</strong>. Rejecting either one removes it from every shop at once. Trust
            badges such as SABS Approved, NRCS Compliant and Halaal travel with the product to the shelf.
          </span>
        </p>
      </Section>

      <Section n="6" title="Who can see what">
        <div className="space-y-2">
          {[
            "Sign in is handled by Clerk, with breached password checks, lockout after repeated failures and new device verification.",
            "Every page and every request needs a signed in session.",
            "Each shop's data is walled: stock, orders, documents and reports are filtered by the signed in owner's shop on the server, so Shop B can never see Shop A.",
            "Roles are set on the user by an admin and read on the server. Users cannot give themselves a role.",
          ].map((t) => (
            <p key={t} className="flex gap-2.5">
              <Lock className="mt-0.5 size-4 shrink-0 text-brand" /> {t}
            </p>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-line bg-paper-2/60 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span>Role and what it may do</span>
            <span>Status</span>
          </div>
          {(Object.entries(ROLES) as [Role, (typeof ROLES)[Role]][]).map(([key, r]) => (
            <div key={key} className="grid grid-cols-[1fr_auto] gap-3 border-b border-line px-5 py-4 last:border-0">
              <div>
                <p className="font-semibold text-ink">{r.label}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                  {r.can.map((c) => (
                    <li key={c} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
              <span
                className={`h-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.live ? "bg-ok-50 text-ok" : "bg-mustard-50 text-mustard-700"}`}
              >
                {r.live ? "Live" : "Planned"}
              </span>
            </div>
          ))}
        </div>
        <p className="flex gap-3 rounded-2xl bg-brand p-5 text-white">
          <Clock3 className="mt-0.5 size-5 shrink-0 text-mustard" />
          <span>
            <strong>Coming next: full RBAC.</strong> No one will reach the backend without proper authorization. Every
            endpoint will check a named permission for the caller&apos;s role, wholesalers and lenders will get their own
            scoped views, and every admin action will be written to an audit trail.
          </span>
        </p>
      </Section>

      <Section n="7" title="The admin portal">
        <div className="grid gap-3 sm:grid-cols-2">
          {ADMIN_AREAS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-white p-4 shadow-card">
              <p className="flex items-center gap-2 font-semibold text-brand">
                <Icon className="size-4 text-pink" /> {title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section n="8" title="Demo accounts">
        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          {[
            { who: "Shop owner, Thandi's Spaza", email: "thandi+clerk_test@spazalink.co.za" },
            { who: "Shop owner, Sipho's Corner Store", email: "sipho+clerk_test@spazalink.co.za" },
            { who: "Platform admin", email: "admin+clerk_test@spazalink.co.za" },
          ].map((a) => (
            <div key={a.email} className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3 last:border-0">
              <span className="flex items-center gap-2 font-medium">
                <KeyRound className="size-4 text-pink" /> {a.who}
              </span>
              <code className="text-sm text-muted-foreground">{a.email}</code>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          The password for all three is Spaza@2026. If Clerk asks for a verification code, enter 424242.
        </p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-ok" /> Six more community shops are loaded with data for the graphs; they have no
          login.
        </p>
      </Section>
    </article>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-3 font-display text-2xl font-extrabold tracking-tight text-brand">
        <span className="flex size-9 items-center justify-center rounded-xl bg-mustard text-base text-ink">{n}</span>
        {title}
      </h2>
      <div className="space-y-4 text-ink">{children}</div>
    </section>
  );
}

function Rule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border-l-4 border-pink bg-white p-4 shadow-card">
      <p className="font-semibold text-brand">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Band({ cls, children }: { cls: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-ink">
      <span className={`size-2.5 rounded-full ${cls}`} />
      {children}
    </span>
  );
}
