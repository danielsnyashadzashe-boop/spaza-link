import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Lock, ShieldCheck } from "lucide-react";
import { BrandStripe, Logo } from "./logo";
import { cn } from "@/lib/utils";

const YEAR = 2026;

const COLUMNS = [
  {
    title: "SpazaLink",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/#about", label: "About us" },
      { href: "/sign-up", label: "Register your shop" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
  {
    title: "For shop owners",
    links: [
      { href: "/dashboard", label: "Inventory dashboard" },
      { href: "/order", label: "Order stock" },
      { href: "/finance", label: "Financial Health Report" },
      { href: "/onboarding", label: "Shop details" },
    ],
  },
  {
    title: "Trust and safety",
    links: [
      { href: "/#about", label: "Verified wholesalers" },
      { href: "/sign-in", label: "Try the demo shop" },
      { href: "/admin", label: "Admin portal" },
    ],
  },
];

/** The full site footer (landing page) or a compact one (inside the app). */
export function SiteFooter({ variant = "full", className }: { variant?: "full" | "compact"; className?: string }) {
  if (variant === "compact") {
    return (
      <footer className={cn("mt-auto border-t border-line bg-white/70", className)}>
        <BrandStripe className="h-1 rounded-none" />
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6 md:flex-row">
          <div className="flex items-center gap-3">
            <Image src="/brand/mark.png" alt="" width={28} height={28} className="size-7" />
            <span>
              © {YEAR} SpazaLink. <span className="hidden sm:inline">Built for township traders.</span>
            </span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Footer">
            <Link href="/" className="transition hover:text-pink-600">Home</Link>
            <Link href="/dashboard" className="transition hover:text-pink-600">Inventory</Link>
            <Link href="/order" className="transition hover:text-pink-600">Order</Link>
            <Link href="/finance" className="transition hover:text-pink-600">Finance</Link>
            <span className="flex items-center gap-1.5 text-xs">
              <Lock className="size-3.5 text-ok" /> Your data stays yours
            </span>
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer className={cn("mt-auto bg-brand text-white/75", className)}>
      <BrandStripe className="h-1.5 rounded-none" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-10 pt-16 sm:px-6 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm">
          <Logo onDark className="px-4" />
          <p className="mt-6 text-sm leading-relaxed">
            The digital bridge between township spaza shops and verified wholesalers: full shelves, safe stock and a trading
            record the bank believes.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
              <ShieldCheck className="size-3.5 text-mustard" /> Verified suppliers only
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
              <Lock className="size-3.5 text-mustard" /> Each shop&apos;s data walled off
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mustard">{col.title}</p>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="group inline-flex items-center gap-1 transition hover:text-white">
                      {l.label}
                      <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs sm:px-6 md:flex-row">
          <p className="flex items-center gap-2">
            <Image src="/brand/mark.png" alt="" width={22} height={22} className="size-5 rounded bg-white p-0.5" />© {YEAR}{" "}
            SpazaLink. All rights reserved. Founded by Rethabile Madonsela.
          </p>
          <p className="text-white/55">Made with ubuntu in Mzansi · Payments in the demo run in sandbox mode</p>
        </div>
      </div>
    </footer>
  );
}
