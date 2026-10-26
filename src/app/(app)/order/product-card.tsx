"use client";

import { BadgeCheck, Minus, Plus, ShieldCheck, Tag } from "lucide-react";
import { formatRand } from "@/lib/rules";
import type { Product } from "@/lib/types";
import { useShop } from "@/components/shop-context";
import { Card } from "@/components/kit";

export function TrustBadge({ label }: { label: string }) {
  const supplier = label === "Verified Supplier";
  return (
    <span
      className={
        supplier
          ? "inline-flex items-center gap-1 rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-white"
          : "inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand"
      }
    >
      {supplier ? <BadgeCheck className="size-3" /> : <ShieldCheck className="size-3" />}
      {label}
    </span>
  );
}

export function ProductCard({ product: p }: { product: Product }) {
  const { cart, addToCart, setCartQuantity } = useShop();
  const inCart = cart.find((l) => l.productId === p.id)?.quantity ?? 0;
  const badges = [...new Set([...p.supplier.badges.filter((b) => b === "Verified Supplier"), ...p.badges])];

  return (
    <Card className="flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex flex-wrap gap-1">
        {badges.map((b) => (
          <TrustBadge key={b} label={b} />
        ))}
      </div>
      <h3 className="mt-3 font-semibold leading-snug">{p.name}</h3>
      <p className="text-xs text-muted-foreground">
        {p.unit} · {p.supplier.name}
      </p>
      <div className="mt-auto pt-4">
        {p.bulkRule && (
          <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-mustard-50 px-2 py-0.5 text-[11px] font-semibold text-mustard-700">
            <Tag className="size-3" /> Buy {p.bulkRule.minQty}+ and save {p.bulkRule.percentOff}%
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="num font-display text-xl font-extrabold">{formatRand(p.price)}</p>
          {inCart > 0 ? (
            <div className="flex items-center gap-1 rounded-xl bg-brand p-1 text-white">
              <button
                onClick={() => setCartQuantity(p.id, inCart - 1)}
                className="flex size-8 items-center justify-center rounded-lg hover:bg-white/15"
                aria-label={`One less ${p.name}`}
              >
                <Minus className="size-4" />
              </button>
              <span className="num w-7 text-center text-sm font-bold">{inCart}</span>
              <button
                onClick={() => addToCart(p.id, 1)}
                className="flex size-8 items-center justify-center rounded-lg hover:bg-white/15"
                aria-label={`One more ${p.name}`}
              >
                <Plus className="size-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(p.id, 1)}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-brand/30 px-3 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
            >
              <Plus className="size-4" /> Add
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
