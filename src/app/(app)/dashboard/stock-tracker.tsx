"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Minus, Package, Pencil, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { api } from "@/lib/client";
import { RED_BELOW, GREEN_ABOVE, type StockBand } from "@/lib/rules";
import type { Product, StockItem } from "@/lib/types";
import { useToast } from "@/components/toast";
import { Button, Card, cn, Input, Pill, Skeleton, ConfirmAction } from "@/components/kit";
import { CountUp } from "@/components/motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BAND = {
  green: { bar: "bg-ok", soft: "bg-ok-50", text: "text-ok", label: "Healthy", tone: "ok" },
  yellow: { bar: "bg-warn", soft: "bg-warn-50", text: "text-mustard-700", label: "Running low", tone: "warn" },
  red: { bar: "bg-bad", soft: "bg-bad-50", text: "text-bad", label: "Critical", tone: "bad" },
} as const;

export function StockTracker({
  items,
  onItems,
  onQuantity,
  onQuickFix,
}: {
  items: StockItem[] | null;
  onItems: (items: StockItem[]) => void;
  onQuantity: (id: string, quantity: number) => void;
  onQuickFix: (item: StockItem) => void;
}) {
  const [adding, setAdding] = useState(false);
  const counts = useMemo(() => {
    const c: Record<StockBand, number> = { green: 0, yellow: 0, red: 0 };
    for (const i of items ?? []) c[i.band]++;
    return c;
  }, [items]);
  const sorted = useMemo(() => {
    const order: Record<StockBand, number> = { red: 0, yellow: 1, green: 2 };
    return [...(items ?? [])].sort((a, b) => order[a.band] - order[b.band] || a.name.localeCompare(b.name));
  }, [items]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-600">Stock tracker</p>
          <h2 className="font-display text-xl font-bold tracking-tight">What is on your shelves</h2>
        </div>
        <Button size="sm" variant={adding ? "secondary" : "primary"} onClick={() => setAdding((a) => !a)}>
          {adding ? <X className="size-4" /> : <Plus className="size-4" />}
          {adding ? "Close" : "Add item"}
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        {(["green", "yellow", "red"] as const).map((b) => (
          <div key={b} className={cn("rounded-xl px-3 py-2.5", BAND[b].soft)}>
            <p className={cn("num font-display text-2xl font-extrabold", BAND[b].text)}>
              <CountUp value={counts[b]} />
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              {BAND[b].label}
              <span className="hidden sm:inline">
                {b === "green" && ` · over ${GREEN_ABOVE * 100}%`}
                {b === "yellow" && ` · ${RED_BELOW * 100} to ${GREEN_ABOVE * 100}%`}
                {b === "red" && ` · under ${RED_BELOW * 100}%`}
              </span>
            </p>
          </div>
        ))}
      </div>

      {adding && <AddItemForm existing={items ?? []} onAdded={(next) => (onItems(next), setAdding(false))} />}

      {items === null ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[72px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-line py-12 text-center">
          <Package className="size-10 text-muted-foreground/50" />
          <p className="mt-3 font-semibold">No stock yet</p>
          <p className="text-sm text-muted-foreground">Add the products you sell to start tracking them.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line/70">
          {sorted.map((item) => (
            <StockRow key={item.id} item={item} onItems={onItems} onQuantity={onQuantity} onQuickFix={onQuickFix} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function StockRow({
  item,
  onItems,
  onQuantity,
  onQuickFix,
}: {
  item: StockItem;
  onItems: (items: StockItem[]) => void;
  onQuantity: (id: string, quantity: number) => void;
  onQuickFix: (item: StockItem) => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(item.quantity));
  const [cap, setCap] = useState(String(item.fullCapacity));
  const [busy, setBusy] = useState(false);
  const band = BAND[item.band];
  const pct = Math.round(item.ratio * 100);

  function startEditing() {
    setQty(String(item.quantity));
    setCap(String(item.fullCapacity));
    setEditing(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { items } = await api<{ items: StockItem[] }>(`/api/stock/${item.id}`, {
        method: "PATCH",
        json: { quantity: Number(qty), fullCapacity: Number(cap) },
      });
      onItems(items);
      setEditing(false);
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      const { items } = await api<{ items: StockItem[] }>(`/api/stock/${item.id}`, { method: "DELETE" });
      onItems(items);
      toast(`${item.name} removed`);
    } catch (err) {
      toast((err as Error).message, "bad");
    }
  }

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", band.soft, band.text)}>
          <Package className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-semibold">{item.name}</p>
            <Pill tone={band.tone}>
              {item.band === "red" && <span className="size-1.5 animate-blink rounded-full bg-bad" aria-hidden />}
              {band.label}
            </Pill>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {item.unit}
            {item.product && ` · ${item.product.supplier.name}`}
          </p>
        </div>
        {!editing && (
          <div className="flex items-center gap-1 rounded-xl border border-line bg-paper p-1">
            <button
              onClick={() => onQuantity(item.id, Math.max(0, item.quantity - 1))}
              disabled={item.quantity <= 0}
              className="flex size-8 items-center justify-center rounded-lg text-ink hover:bg-white disabled:opacity-30"
              aria-label={`One less ${item.name}`}
            >
              <Minus className="size-4" />
            </button>
            <span className="num w-14 text-center text-sm font-bold">
              {item.quantity}
              <span className="font-normal text-muted-foreground">/{item.fullCapacity}</span>
            </span>
            <button
              onClick={() => onQuantity(item.id, Math.min(item.fullCapacity, item.quantity + 1))}
              disabled={item.quantity >= item.fullCapacity}
              className="flex size-8 items-center justify-center rounded-lg text-ink hover:bg-white disabled:opacity-30"
              aria-label={`One more ${item.name}`}
            >
              <Plus className="size-4" />
            </button>
          </div>
        )}
        <div className="hidden items-center sm:flex">
          {!editing && (
            <button
              onClick={startEditing}
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-paper-2 hover:text-ink"
              aria-label={`Edit ${item.name}`}
            >
              <Pencil className="size-4" />
            </button>
          )}
          <ConfirmAction
            title={`Remove ${item.name}?`}
            description="It comes off your stock list. You can add it again from the catalogue at any time."
            onConfirm={remove}
          >
            <button
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-bad-50 hover:text-bad"
              aria-label={`Remove ${item.name}`}
            >
              <Trash2 className="size-4" />
            </button>
          </ConfirmAction>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-2"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${item.name} stock level`}
        >
          <div
            className={cn("h-full origin-left animate-grow-x rounded-full transition-[width,background-color] duration-500", band.bar)}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
        <span className={cn("num w-10 text-right text-xs font-bold", band.text)}>{pct}%</span>
        {item.band === "red" && item.product && (
          <button
            onClick={() => onQuickFix(item)}
            className="flex items-center gap-1 rounded-lg bg-mustard-50 px-2 py-1 text-xs font-semibold text-mustard-700 hover:bg-mustard/25"
          >
            <ShoppingCart className="size-3.5" /> Restock
          </button>
        )}
        <button
          onClick={() => (editing ? setEditing(false) : startEditing())}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline sm:hidden"
        >
          Edit
        </button>
      </div>

      {editing && (
        <form onSubmit={save} className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-paper p-3 animate-fade-up">
          <label className="w-28">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">On shelf</span>
            <Input type="number" min={0} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="h-9" />
          </label>
          <label className="w-28">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Full capacity</span>
            <Input type="number" min={1} inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} className="h-9" />
          </label>
          <Button type="submit" size="sm" loading={busy}>
            <Check className="size-4" /> Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <ConfirmAction
            title={`Remove ${item.name}?`}
            description="It comes off your stock list. You can add it again from the catalogue at any time."
            onConfirm={remove}
          >
            <Button type="button" size="sm" variant="danger" className="ml-auto sm:hidden">
              <Trash2 className="size-4" /> Remove
            </Button>
          </ConfirmAction>
        </form>
      )}
    </li>
  );
}

function AddItemForm({ existing, onAdded }: { existing: StockItem[]; onAdded: (items: StockItem[]) => void }) {
  const toast = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [capacity, setCapacity] = useState("20");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ products: Product[] }>("/api/products")
      .then(({ products }) => setProducts(products))
      .catch((e: Error) => toast(e.message, "bad"));
  }, [toast]);

  const available = (products ?? []).filter((p) => !existing.some((i) => i.productId === p.id));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { items } = await api<{ items: StockItem[] }>("/api/stock", {
        method: "POST",
        json: { productId, quantity: Number(quantity), fullCapacity: Number(capacity) },
      });
      onAdded(items);
      toast("Item added to your stock list");
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-5 grid animate-fade-up gap-3 rounded-xl border border-brand/20 bg-brand-50/60 p-4 sm:grid-cols-[1fr_110px_110px_auto] sm:items-end">
      <div>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Product from the verified catalogue</span>
        <Select value={productId} onValueChange={setProductId} disabled={!products}>
          <SelectTrigger className="h-11! w-full rounded-xl bg-white" aria-label="Product">
            <SelectValue placeholder={products ? "Choose a product" : "Loading"} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {available.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} <span className="text-muted-foreground">({p.unit})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">On shelf</span>
        <Input type="number" min={0} required inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Full capacity</span>
        <Input type="number" min={1} required inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </label>
      <Button type="submit" loading={busy} disabled={!productId}>
        Add
      </Button>
    </form>
  );
}
