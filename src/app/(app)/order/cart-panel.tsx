"use client";

import { useState } from "react";
import { Banknote, Check, Landmark, Minus, Plus, ShoppingBasket, Smartphone, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { formatRand, lineDiscount, PAYMENT_METHODS, round2, type PaymentMethod } from "@/lib/rules";
import type { Order, Product } from "@/lib/types";
import { useShop } from "@/components/shop-context";
import { useToast } from "@/components/toast";
import { Button, Card, cn, ErrorNote, Input, Skeleton } from "@/components/kit";

const METHOD_META: Record<PaymentMethod, { icon: typeof Smartphone; hint: string }> = {
  PAYSHAP: { icon: Smartphone, hint: "Instant, using your phone number" },
  EFT: { icon: Landmark, hint: "Pay from your banking app" },
  COD: { icon: Banknote, hint: "Pay the driver on delivery" },
};

/** "+27821234567" → "082 123 4567" */
const localPhone = (p: string) => (p.startsWith("+27") ? `0${p.slice(3)}`.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3") : p);

export function CartPanel({ products, onPlaced }: { products: Product[] | null; onPlaced: (o: Order) => void }) {
  const toast = useToast();
  const { cart, setCartQuantity, addToCart, clearCart, shop } = useShop();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [phoneInput, setPhone] = useState<string | null>(null);
  const phone = phoneInput ?? (shop ? localPhone(shop.phone) : "");
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const lines = cart
    .map((l) => {
      const p = products?.find((x) => x.id === l.productId);
      if (!p) return null;
      const gross = round2(p.price * l.quantity);
      const discount = lineDiscount(p.price, l.quantity, p.bulkRule);
      return { product: p, quantity: l.quantity, gross, discount };
    })
    .filter((l) => l !== null);
  const subtotal = round2(lines.reduce((a, l) => a + l.gross, 0));
  const discount = round2(lines.reduce((a, l) => a + l.discount, 0));
  const total = round2(subtotal - discount);

  async function placeOrder() {
    if (!method) return;
    setError(null);
    setPlacing(true);
    try {
      const { order } = await api<{ order: Order }>("/api/orders", {
        method: "POST",
        json: {
          items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
          paymentMethod: method,
          payshapPhone: method === "PAYSHAP" ? phone : undefined,
        },
      });
      clearCart();
      setMethod(null);
      onPlaced(order);
      toast(`Order ${order.orderNumber} placed`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <ShoppingBasket className="size-5 text-brand" /> Your cart
        </h2>
        {lines.length > 0 && (
          <button onClick={clearCart} className="text-xs font-semibold text-muted-foreground hover:text-bad">
            Clear
          </button>
        )}
      </div>

      {products === null && cart.length > 0 ? (
        <div className="space-y-2 p-5">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : lines.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <ShoppingBasket className="mx-auto size-10 text-muted-foreground/40" />
          <p className="mt-2 font-semibold">Your cart is empty</p>
          <p className="text-sm text-muted-foreground">Add products, or tap Quick Fix on a low stock alert.</p>
        </div>
      ) : (
        <>
          <ul className="max-h-[38vh] divide-y divide-line/70 overflow-y-auto px-5">
            {lines.map(({ product: p, quantity, gross, discount: d }) => (
              <li key={p.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRand(p.price)} × {quantity}
                    </p>
                  </div>
                  <p className="num text-sm font-bold">{formatRand(gross)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-lg border border-line">
                    <button
                      onClick={() => setCartQuantity(p.id, quantity - 1)}
                      className="flex size-7 items-center justify-center text-muted-foreground hover:text-ink"
                      aria-label={`One less ${p.name}`}
                    >
                      {quantity === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
                    </button>
                    <span className="num w-7 text-center text-xs font-bold">{quantity}</span>
                    <button
                      onClick={() => addToCart(p.id, 1)}
                      className="flex size-7 items-center justify-center text-muted-foreground hover:text-ink"
                      aria-label={`One more ${p.name}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  {d > 0 ? (
                    <span className="text-xs font-semibold text-ok">You save {formatRand(d)}</span>
                  ) : p.bulkRule ? (
                    <button
                      onClick={() => setCartQuantity(p.id, p.bulkRule!.minQty)}
                      className="text-xs font-medium text-mustard-700 underline-offset-2 hover:underline"
                    >
                      Add {p.bulkRule.minQty - quantity} more to save {p.bulkRule.percentOff}%
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <dl className="space-y-1.5 border-t border-line bg-paper/60 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="num">{formatRand(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-ok">
              <dt>Bulk discount saved</dt>
              <dd className="num font-semibold">{formatRand(discount)}</dd>
            </div>
            <div className="flex justify-between pt-1.5 font-display text-lg font-extrabold">
              <dt>Total</dt>
              <dd className="num">{formatRand(total)}</dd>
            </div>
          </dl>

          <div className="space-y-3 border-t border-line px-5 py-4">
            <p className="text-sm font-semibold">How would you like to pay?</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
              {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((m) => {
                const { icon: Icon } = METHOD_META[m];
                const active = method === m;
                return (
                  <button
                    key={m}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMethod(m)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition",
                      active ? "border-brand bg-brand-50 text-brand ring-2 ring-brand/15" : "border-line hover:border-brand/40",
                    )}
                  >
                    {active && (
                      <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-brand text-white">
                        <Check className="size-3" />
                      </span>
                    )}
                    <Icon className="size-5" />
                    {PAYMENT_METHODS[m]}
                  </button>
                );
              })}
            </div>
            {method && <p className="text-xs text-muted-foreground">{METHOD_META[method].hint}</p>}
            {method === "PAYSHAP" && (
              <label className="block animate-fade-up">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">PayShap phone number</span>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="082 123 4567" />
              </label>
            )}
            <ErrorNote message={error} />
            <Button size="lg" className="w-full" disabled={!method} loading={placing} onClick={placeOrder}>
              {method ? `Place order · ${formatRand(total)}` : "Choose a payment method"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
