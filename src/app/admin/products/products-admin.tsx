"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Eye, EyeOff, Pencil, Plus, Search, Tag } from "lucide-react";
import type { allProducts, allSuppliers } from "@/lib/admin";
import { api } from "@/lib/client";
import { formatRand } from "@/lib/rules";
import { PRODUCT_BADGES } from "@/lib/validation";
import { Button, Card, ErrorNote, Field, Input, Pill, Skeleton } from "@/components/kit";
import { useToast } from "@/components/toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BadgePicker, StatusPill, StatusSelect, type Verification } from "../form-bits";
import { Bars, ChartCard, COLORS, Donut } from "../charts";
import { PageHeader } from "../page-header";

type Product = Awaited<ReturnType<typeof allProducts>>[number];
type Supplier = Awaited<ReturnType<typeof allSuppliers>>[number];

export function ProductsAdmin() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | "LISTED" | "HIDDEN">("ALL");

  useEffect(() => {
    Promise.all([api<{ products: Product[] }>("/api/admin/products"), api<{ suppliers: Supplier[] }>("/api/admin/suppliers")])
      .then(([p, s]) => {
        setProducts(p.products);
        setSuppliers(s.suppliers);
      })
      .catch((e: Error) => toast(e.message, "bad"));
  }, [toast]);

  const categories = useMemo(() => [...new Set((products ?? []).map((p) => p.category))].sort(), [products]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        (status === "ALL" || (status === "LISTED" ? p.listed : !p.listed)) &&
        (!q || `${p.name} ${p.supplierName} ${p.category}`.toLowerCase().includes(q)),
    );
  }, [products, query, status]);
  const counts = {
    listed: products?.filter((p) => p.listed).length ?? 0,
    pending: products?.filter((p) => p.verificationStatus === "PENDING").length ?? 0,
    rejected: products?.filter((p) => p.verificationStatus === "REJECTED").length ?? 0,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin portal"
        title="Product catalogue"
        explainer={
          <>
            <p>
              Every product a wholesaler offers. A product is <strong>listed</strong> for shop owners only when the product
              and its wholesaler are both verified, which keeps counterfeit and unsafe goods out of the community.
            </p>
            <p className="text-muted-foreground">
              Prices and bulk deals you set here are what shops pay. The server always recalculates totals from this
              catalogue, never from the shop&apos;s cart.
            </p>
          </>
        }
        action={<ProductForm suppliers={suppliers} categories={categories} products={products ?? []} onSaved={setProducts} />}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <Count label="Listed for shops" value={counts.listed} tone="ok" />
        <Count label="Waiting for review" value={counts.pending} tone="mustard" />
        <Count label="Rejected" value={counts.rejected} tone="bad" />
      </div>

      {products && (
        <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <ChartCard eyebrow="Verification" title="Catalogue by status" description="Only verified products from verified suppliers reach shops.">
            <Donut
              centerLabel="products"
              data={[
                { key: "listed", label: "Listed for shops", value: counts.listed, color: COLORS.ok },
                { key: "hidden", label: "Verified, supplier not", value: products.filter((p) => !p.listed && p.verificationStatus === "VERIFIED").length, color: COLORS.navy },
                { key: "pending", label: "Pending review", value: counts.pending, color: COLORS.mustard },
                { key: "rejected", label: "Rejected", value: counts.rejected, color: COLORS.bad },
              ]}
            />
          </ChartCard>
          <ChartCard eyebrow="Range" title="Products per category" description="How deep each aisle of the catalogue is.">
            <Bars
              data={categories.map((c) => ({ category: c, count: products.filter((p) => p.category === c).length }))}
              x="category"
              y="count"
              name="Products"
              color={COLORS.pink}
              horizontal
              height={Math.max(220, categories.length * 30)}
            />
          </ChartCard>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Product, supplier or category" className="pl-10" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-11! w-full rounded-xl bg-white sm:w-56" aria-label="Filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="ALL">All products</SelectItem>
            <SelectItem value="LISTED">Listed for shops</SelectItem>
            <SelectItem value="HIDDEN">Hidden from shops</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {!products ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-paper-2/50">
                <TableHead className="pl-6">Product</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Bulk deal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="pr-6 text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-6">
                    <p className="flex items-center gap-1.5 font-semibold">
                      {p.listed ? <Eye className="size-3.5 text-ok" aria-label="Listed" /> : <EyeOff className="size-3.5 text-muted-foreground" aria-label="Hidden" />}
                      {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.unit} · {p.category}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{p.supplierName}</p>
                    {p.supplierStatus !== "VERIFIED" && <p className="text-[11px] text-bad">Supplier not verified</p>}
                  </TableCell>
                  <TableCell className="num text-right font-semibold">{formatRand(p.price)}</TableCell>
                  <TableCell>
                    {p.bulkRule ? (
                      <Pill tone="mustard">
                        <Tag className="size-3" /> {p.bulkRule.minQty}+ saves {p.bulkRule.percentOff}%
                      </Pill>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={p.verificationStatus} />
                  </TableCell>
                  <TableCell className="num text-right">
                    <p>{p.units} units</p>
                    <p className="text-[11px] text-muted-foreground">{formatRand(p.revenue)}</p>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <EditProduct product={p} onSaved={setProducts} />
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

function Count({ label, value, tone }: { label: string; value: number; tone: "ok" | "mustard" | "bad" }) {
  const cls = { ok: "bg-ok-50 text-ok", mustard: "bg-mustard-50 text-mustard-700", bad: "bg-bad-50 text-bad" }[tone];
  return (
    <div className={`rounded-2xl px-4 py-3 ${cls}`}>
      <p className="num font-display text-3xl font-extrabold">{value}</p>
      <p className="text-xs font-semibold">{label}</p>
    </div>
  );
}

const EMPTY = { supplierId: "", name: "", unit: "", category: "", price: "", bulk: false, minQty: "10", percentOff: "5", badges: [] as string[], status: "VERIFIED" as Verification };

function ProductForm({
  suppliers,
  categories,
  products,
  onSaved,
}: {
  suppliers: Supplier[];
  categories: string[];
  products: Product[];
  onSaved: (p: Product[]) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { products } = await api<{ products: Product[] }>("/api/admin/products", {
        method: "POST",
        json: {
          supplierId: f.supplierId,
          name: f.name,
          unit: f.unit,
          category: f.category,
          price: f.price,
          bulkRule: f.bulk ? { minQty: f.minQty, percentOff: f.percentOff } : null,
          badges: f.badges,
          verificationStatus: f.status,
        },
      });
      onSaved(products);
      toast(`${f.name} added to the catalogue`);
      setF(EMPTY);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="pink">
          <Plus className="size-4" /> Add product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-extrabold text-brand">Add a product</DialogTitle>
          <DialogDescription>It appears in every shop&apos;s catalogue once the product and its supplier are verified.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <ErrorNote message={error} />
          <Field label="Supplier">
            <Select value={f.supplierId} onValueChange={(v) => setF({ ...f, supplierId: v })}>
              <SelectTrigger className="h-11! w-full rounded-xl bg-white" aria-label="Supplier">
                <SelectValue placeholder="Choose a wholesaler" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.verificationStatus !== "VERIFIED" && "(not verified)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name">
              <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Brown Sugar" />
            </Field>
            <Field label="Unit">
              <Input required value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="2kg bag" />
            </Field>
            <Field label="Category">
              <Input required list="product-categories" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Staples" />
              <datalist id="product-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Price (Rand)">
              <Input required type="number" min="0.5" step="0.01" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="49.99" />
            </Field>
          </div>
          <PriceCheck category={f.category} price={Number(f.price)} products={products} />
          <div className="rounded-xl border border-line p-4">
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">
              Bulk discount
              <Switch checked={f.bulk} onCheckedChange={(v) => setF({ ...f, bulk: v })} />
            </label>
            {f.bulk && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="From quantity">
                  <Input type="number" min="2" value={f.minQty} onChange={(e) => setF({ ...f, minQty: e.target.value })} />
                </Field>
                <Field label="Percent off">
                  <Input type="number" min="1" max="50" step="0.5" value={f.percentOff} onChange={(e) => setF({ ...f, percentOff: e.target.value })} />
                </Field>
              </div>
            )}
          </div>
          <Field label="Trust badges">
            <BadgePicker options={PRODUCT_BADGES} value={f.badges} onChange={(b) => setF({ ...f, badges: b })} />
          </Field>
          <Field label="Verification">
            <StatusSelect value={f.status} onChange={(s) => setF({ ...f, status: s })} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!f.supplierId}>
            Save product
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditProduct({ product, onSaved }: { product: Product; onSaved: (p: Product[]) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(String(product.price));
  const [bulk, setBulk] = useState(Boolean(product.bulkRule));
  const [minQty, setMinQty] = useState(String(product.bulkRule?.minQty ?? 10));
  const [percentOff, setPercentOff] = useState(String(product.bulkRule?.percentOff ?? 5));
  const [status, setStatus] = useState(product.verificationStatus as Verification);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { products } = await api<{ products: Product[] }>(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        json: { price, bulkRule: bulk ? { minQty, percentOff } : null, verificationStatus: status },
      });
      onSaved(products);
      toast(`${product.name} updated`);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`Edit ${product.name}`}>
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold text-brand">{product.name}</DialogTitle>
          <DialogDescription>
            {product.unit} from {product.supplierName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <ErrorNote message={error} />
          <Field label="Price (Rand)">
            <Input type="number" min="0.5" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <div className="rounded-xl border border-line p-4">
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">
              Bulk discount
              <Switch checked={bulk} onCheckedChange={setBulk} />
            </label>
            {bulk && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="From quantity">
                  <Input type="number" min="2" value={minQty} onChange={(e) => setMinQty(e.target.value)} />
                </Field>
                <Field label="Percent off">
                  <Input type="number" min="1" max="50" step="0.5" value={percentOff} onChange={(e) => setPercentOff(e.target.value)} />
                </Field>
              </div>
            )}
          </div>
          <Field label="Verification" hint="Only verified products from verified suppliers are listed for shops.">
            <StatusSelect value={status} onChange={setStatus} />
          </Field>
          <Button type="submit" className="w-full" loading={busy}>
            Save changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Live chart in the add product form: the new price against the rest of its category. */
function PriceCheck({ category, price, products }: { category: string; price: number; products: Product[] }) {
  const peers = products.filter((p) => p.category.toLowerCase() === category.trim().toLowerCase());
  if (!category.trim() || !peers.length) {
    return (
      <p className="rounded-xl bg-paper-2/60 p-4 text-sm text-muted-foreground">
        Pick an existing category to see how your price compares with similar products.
      </p>
    );
  }
  const prices = peers.map((p) => p.price);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const rows = [
    { label: "Lowest", value: Math.min(...prices) },
    { label: "Average", value: Math.round(avg * 100) / 100 },
    { label: "Highest", value: Math.max(...prices) },
    ...(price > 0 ? [{ label: "This product", value: price }] : []),
  ];
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-sm font-semibold text-ink">Price check against {peers.length} {category} products</p>
      <Bars
        data={rows}
        x="label"
        y="value"
        name="Price"
        colors={[COLORS.navy, COLORS.navy, COLORS.navy, COLORS.pink]}
        format={(n) => `R${n.toFixed(2)}`}
        height={180}
      />
    </div>
  );
}
