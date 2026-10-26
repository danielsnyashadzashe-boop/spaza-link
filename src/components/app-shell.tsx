"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { LayoutDashboard, ShieldCheck, ShoppingCart, Store, TrendingUp } from "lucide-react";
import { roleOf } from "@/lib/rbac";
import { AccessNotice } from "./access-notice";
import { DemoBanner, DemoToggle, WelcomeDemo } from "./demo-mode";
import { SiteFooter } from "./site-footer";
import { Logo } from "./logo";
import { useShop } from "./shop-context";
import { cn } from "./kit";

const NAV = [
  { href: "/dashboard", label: "Inventory", icon: LayoutDashboard },
  { href: "/order", label: "Order", icon: ShoppingCart },
  { href: "/finance", label: "Finance", icon: TrendingUp },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { shop, cartCount } = useShop();
  const { user } = useUser();
  const isAdmin = roleOf(user?.publicMetadata) === "admin";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AccessNotice />
      <WelcomeDemo />
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="SpazaLink home page" title="SpazaLink home page">
            <Logo priority className="h-8 sm:h-9" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition",
                    active ? "bg-brand text-white" : "text-muted-foreground hover:bg-paper-2 hover:text-ink",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <DemoToggle />
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden h-10 items-center gap-2 rounded-xl bg-pink px-3.5 text-sm font-semibold text-white hover:bg-pink-600 sm:flex"
              >
                <ShieldCheck className="size-4" /> Admin
              </Link>
            )}
            <Link
              href="/order"
              className="relative flex size-10 items-center justify-center rounded-xl border border-line bg-card transition hover:border-brand/40"
              aria-label={`Cart, ${cartCount} items`}
            >
              <ShoppingCart className="size-[18px]" />
              {cartCount > 0 && (
                <span className="num absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-mustard px-1 text-[11px] font-bold text-ink">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
            <div className="hidden items-center gap-2.5 rounded-xl border border-line bg-card py-1 pl-1 pr-3 sm:flex">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand">
                <Store className="size-4" />
              </span>
              <span className="max-w-40 truncate text-sm font-semibold">{shop?.name ?? "…"}</span>
            </div>
            <span className="flex size-10 items-center justify-center">
              <UserButton />
            </span>
          </div>
        </div>
        <DemoBanner />
      </header>

      <main key={pathname} className="mx-auto w-full max-w-7xl flex-1 animate-fade-up px-4 pb-12 pt-6 sm:px-6">
        {children}
      </main>
      <SiteFooter variant="compact" className="mb-[68px] md:mb-0" />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Main mobile"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                active ? "text-brand" : "text-muted-foreground",
              )}
            >
              <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-brand-50")}>
                <Icon className="size-[18px]" />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
