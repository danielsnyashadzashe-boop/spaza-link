"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import { BookOpen, Factory, LayoutDashboard, Loader2, Package, ShieldAlert, ShieldCheck, Store, Truck } from "lucide-react";
import { BrandStripe, Logo } from "@/components/logo";
import { AccessNotice } from "@/components/access-notice";
import { SiteFooter } from "@/components/site-footer";
import { Card, cn } from "@/components/kit";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, blurb: "Platform health at a glance" },
  { href: "/admin/shops", label: "Shops", icon: Store, blurb: "Every spaza shop and its scores" },
  { href: "/admin/orders", label: "Orders", icon: Truck, blurb: "All orders and deliveries" },
  { href: "/admin/products", label: "Products", icon: Package, blurb: "Catalogue, prices and verification" },
  { href: "/admin/suppliers", label: "Suppliers", icon: Factory, blurb: "Wholesaler verification" },
  { href: "/admin/guide", label: "Guide", icon: BookOpen, blurb: "How SpazaLink works" },
] as const;

type Access = "checking" | "granted" | "denied";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [access, setAccess] = useState<Access>("checking");
  const [name, setName] = useState("");

  // The server decides: /api/admin/me answers 200 only for the admin role.
  useEffect(() => {
    fetch("/api/admin/me", { cache: "no-store" })
      .then(async (res) => {
        if (res.ok) {
          setName(((await res.json()) as { name: string }).name);
          setAccess("granted");
        } else if (res.status === 401) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign(`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`);
        } else {
          setAccess("denied");
        }
      })
      .catch(() => setAccess("denied"));
  }, []);

  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AccessNotice />
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="SpazaLink home page" title="SpazaLink home page" className="flex items-center gap-3">
            <Logo priority className="h-8" />
            <span className="hidden rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white sm:inline">
              Admin
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            {access === "granted" && (
              <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-ok-50 px-3 py-1 text-xs font-semibold text-ok md:flex">
                <ShieldCheck className="size-3.5" /> Platform admin
              </span>
            )}
            <span className="hidden whitespace-nowrap text-sm font-semibold text-ink sm:block">{name}</span>
            <UserButton />
          </div>
        </div>
        <BrandStripe className="h-1 rounded-none" />
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-[68px] hidden h-[calc(100vh-68px)] w-64 shrink-0 border-r border-line bg-white/60 p-4 lg:block">
          <nav className="space-y-1" aria-label="Admin">
            {ADMIN_NAV.map(({ href, label, icon: Icon, blurb }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition",
                  active(href) ? "bg-brand text-white shadow-lift" : "text-ink hover:bg-pink-50",
                )}
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", active(href) ? "text-mustard" : "text-pink-600")} />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className={cn("block text-xs", active(href) ? "text-white/70" : "text-muted-foreground")}>{blurb}</span>
                </span>
              </Link>
            ))}
          </nav>
          <div className="mt-6 rounded-xl bg-paper-2/70 p-3 text-xs text-muted-foreground">
            Everything here reads live from the database. Changes you make apply to every shop immediately.
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <nav className="flex gap-1.5 overflow-x-auto border-b border-line bg-white/60 px-4 py-2 [scrollbar-width:none] lg:hidden" aria-label="Admin mobile">
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
                  active(href) ? "bg-brand text-white" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            ))}
          </nav>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
            {access === "checking" && (
              <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" /> Checking your role
              </div>
            )}
            {access === "denied" && <Denied />}
            {access === "granted" && children}
          </main>
          <SiteFooter variant="compact" />
        </div>
      </div>
    </div>
  );
}

function Denied() {
  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-bad-50 text-bad">
        <ShieldAlert className="size-7" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-extrabold text-brand">Admins only</h1>
      <p className="mt-2 text-muted-foreground">
        The admin portal is open to the Platform admin role. Your account is a shop owner account, so none of the platform
        data was loaded. Ask a SpazaLink admin if you need access.
      </p>
      <Link href="/dashboard" className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white">
        Back to my shop
      </Link>
    </Card>
  );
}
