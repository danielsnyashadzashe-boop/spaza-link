"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import type { Compliance, Shop } from "@/lib/types";

type CartLine = { productId: string; quantity: number };

/** Who is looking: their own shop, or the shared view only demo shop. */
export type ViewInfo = { demo: boolean; hasOwnShop: boolean; isNewShop: boolean };
type MeResponse = { shop: Shop; compliance: Compliance } & ViewInfo;

type ShopState = {
  shop: Shop | null;
  view: ViewInfo | null;
  compliance: Compliance | null;
  setCompliance: (c: Compliance) => void;
  refresh: () => Promise<void>;
  cart: CartLine[];
  cartCount: number;
  addToCart: (productId: string, quantity: number) => void;
  setCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const ShopContext = createContext<ShopState | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [compliance, setCompliance] = useState<Compliance | null>(null);
  const [view, setView] = useState<ViewInfo | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartKeyLoaded, setCartKeyLoaded] = useState<string | null>(null);
  const loadingKey = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await api<MeResponse>("/api/me");
    setShop(data.shop);
    setCompliance(data.compliance);
    setView({ demo: data.demo, hasOwnShop: data.hasOwnShop, isNewShop: data.isNewShop });
  }, []);

  useEffect(() => {
    api<MeResponse>("/api/me")
      .then((data) => {
        setShop(data.shop);
        setCompliance(data.compliance);
        setView({ demo: data.demo, hasOwnShop: data.hasOwnShop, isNewShop: data.isNewShop });
      })
      .catch(() => undefined);
  }, []);

  // The cart lives on the device (low data) and is keyed per shop so accounts never share one.
  const cartKey = shop ? `spazalink:cart:${shop.id}` : null;
  useEffect(() => {
    if (!cartKey || loadingKey.current === cartKey) return;
    loadingKey.current = cartKey;
    let saved: CartLine[] = [];
    try {
      const raw = localStorage.getItem(cartKey);
      if (raw) saved = JSON.parse(raw) as CartLine[];
    } catch {
      /* storage unavailable or corrupt: start empty */
    }
    // Merge with anything added before storage loaded (e.g. a Quick Fix tap).
    setCart((current) => {
      const merged = [...saved];
      for (const l of current) {
        const hit = merged.find((m) => m.productId === l.productId);
        if (hit) hit.quantity += l.quantity;
        else merged.push(l);
      }
      return merged;
    });
    setCartKeyLoaded(cartKey);
  }, [cartKey]);
  useEffect(() => {
    if (!cartKey || cartKeyLoaded !== cartKey) return;
    try {
      localStorage.setItem(cartKey, JSON.stringify(cart));
    } catch {
      /* storage unavailable: cart stays in memory */
    }
  }, [cart, cartKey, cartKeyLoaded]);

  const addToCart = useCallback((productId: string, quantity: number) => {
    setCart((c) => {
      const hit = c.find((l) => l.productId === productId);
      if (hit) return c.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l));
      return [...c, { productId, quantity }];
    });
  }, []);
  const setCartQuantity = useCallback((productId: string, quantity: number) => {
    setCart((c) =>
      quantity <= 0
        ? c.filter((l) => l.productId !== productId)
        : c.some((l) => l.productId === productId)
          ? c.map((l) => (l.productId === productId ? { ...l, quantity } : l))
          : [...c, { productId, quantity }],
    );
  }, []);
  const clearCart = useCallback(() => setCart([]), []);

  const value = useMemo(
    () => ({
      shop,
      view,
      compliance,
      setCompliance,
      refresh,
      cart,
      cartCount: cart.reduce((a, l) => a + l.quantity, 0),
      addToCart,
      setCartQuantity,
      clearCart,
    }),
    [shop, view, compliance, refresh, cart, addToCart, setCartQuantity, clearCart],
  );
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside ShopProvider");
  return ctx;
}
