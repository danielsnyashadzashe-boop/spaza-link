"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BadgeCheck, Factory, MapPin, Package, Plus } from "lucide-react";
import type { allSuppliers } from "@/lib/admin";
import { api } from "@/lib/client";
import { formatRand } from "@/lib/rules";
import { PROVINCES, SUPPLIER_BADGES } from "@/lib/validation";
import { Button, Card, ErrorNote, Field, Input, Pill, Skeleton } from "@/components/kit";
import { useToast } from "@/components/toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bars, ChartCard, COLORS, compactRand, Donut } from "../charts";
import { BadgePicker, StatusPill, StatusSelect, type Verification } from "../form-bits";
import { PageHeader } from "../page-header";
import supplierPhoto from "../../../../public/images/supplier-delivery.webp";

type Supplier = Awaited<ReturnType<typeof allSuppliers>>[number];

export function SuppliersAdmin() {
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api<{ suppliers: Supplier[] }>("/api/admin/suppliers")
      .then(({ suppliers }) => setSuppliers(suppliers))
      .catch((e: Error) => toast(e.message, "bad"));
  }, [toast]);

  async function setStatus(s: Supplier, verificationStatus: Verification) {
    setSaving(s.id);
    try {
      const { suppliers } = await api<{ suppliers: Supplier[] }>(`/api/admin/suppliers/${s.id}`, {
        method: "PATCH",
        json: { verificationStatus },
      });
      setSuppliers(suppliers);
      toast(
        verificationStatus === "VERIFIED"
          ? `${s.name} is verified. Its verified products are now listed for shops.`
          : `${s.name} is no longer verified. Its products are hidden from shops.`,
      );
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin portal"
        title="Wholesalers"
        explainer={
          <>
            <p>
              The suppliers allowed to sell to spaza shops. Verifying a wholesaler is the first safety gate: until it is{" "}
              <strong>Verified</strong>, none of its products reach a shop, no matter what.
            </p>
            <p className="text-muted-foreground">Changing a status applies to every shop straight away.</p>
          </>
        }
        action={<SupplierForm suppliers={suppliers ?? []} onSaved={setSuppliers} />}
        image={supplierPhoto}
        imageAlt="A supplier carrying boxes of fresh produce into a shop"
      />

      {!suppliers ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard eyebrow="Verification" title="Wholesalers by status" description="Only verified wholesalers can sell to shops.">
              <Donut
                centerLabel="wholesalers"
                data={[
                  { key: "verified", label: "Verified", value: suppliers.filter((x) => x.verificationStatus === "VERIFIED").length, color: COLORS.ok },
                  { key: "pending", label: "Pending review", value: suppliers.filter((x) => x.verificationStatus === "PENDING").length, color: COLORS.mustard },
                  { key: "rejected", label: "Rejected", value: suppliers.filter((x) => x.verificationStatus === "REJECTED").length, color: COLORS.bad },
                ]}
              />
            </ChartCard>
            <ChartCard eyebrow="Reach" title="Wholesalers per province" description="Where SpazaLink's supply network is based.">
              <ProvinceChart suppliers={suppliers} />
            </ChartCard>
          </section>

          <ChartCard eyebrow="Business" title="Order value per wholesaler" description="Which suppliers SpazaLink shops are buying from.">
            <Bars
              data={suppliers.filter((s) => s.revenue > 0).sort((a, b) => b.revenue - a.revenue)}
              x="name"
              y="revenue"
              name="Order value"
              color={COLORS.pink}
              format={compactRand}
              horizontal
              height={Math.max(180, suppliers.length * 34)}
            />
          </ChartCard>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {suppliers.map((s) => (
              <Card key={s.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-mustard">
                    <Factory className="size-5" />
                  </span>
                  <StatusPill status={s.verificationStatus} />
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-brand">{s.name}</h3>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" /> {s.region}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.badges.length ? (
                    s.badges.map((b) => (
                      <Pill key={b} tone="brand">
                        <BadgeCheck className="size-3" /> {b}
                      </Pill>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No badges yet</span>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-paper-2/60 p-3">
                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground">
                      <Package className="size-3" /> Products
                    </p>
                    <p className="num font-display text-lg font-extrabold text-brand">
                      {s.productsVerified}/{s.products}
                    </p>
                    <p className="text-[11px] text-muted-foreground">verified</p>
                  </div>
                  <div className="rounded-xl bg-paper-2/60 p-3">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Order value</p>
                    <p className="num font-display text-lg font-extrabold text-brand">{formatRand(s.revenue)}</p>
                  </div>
                </div>
                <div className="mt-auto pt-4">
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Verification</p>
                  <StatusSelect
                    value={s.verificationStatus}
                    onChange={(v) => v !== s.verificationStatus && setStatus(s, v)}
                    className={saving === s.id ? "opacity-60" : ""}
                  />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const EMPTY = { name: "", region: "", badges: ["Verified Supplier"] as string[], status: "PENDING" as Verification };

function SupplierForm({ suppliers, onSaved }: { suppliers: Supplier[]; onSaved: (s: Supplier[]) => void }) {
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
      const { suppliers } = await api<{ suppliers: Supplier[] }>("/api/admin/suppliers", {
        method: "POST",
        json: { name: f.name, region: f.region, badges: f.badges, verificationStatus: f.status },
      });
      onSaved(suppliers);
      toast(`${f.name} added`);
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
          <Plus className="size-4" /> Add supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-extrabold text-brand">Add a wholesaler</DialogTitle>
          <DialogDescription>New suppliers usually start as Pending review until their paperwork is checked.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <ErrorNote message={error} />
          <Field label="Business name">
            <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Soweto Wholesale Traders" />
          </Field>
          <Field label="Province">
            <Select value={f.region} onValueChange={(v) => setF({ ...f, region: v })}>
              <SelectTrigger className="h-11! w-full rounded-xl bg-white" aria-label="Province">
                <SelectValue placeholder="Choose a province" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="rounded-xl border border-line p-4">
            <p className="text-sm font-semibold text-ink">Existing wholesalers per province</p>
            <p className="text-xs text-muted-foreground">{f.region ? `${f.region} is highlighted.` : "Choose a province to compare."}</p>
            <ProvinceChart suppliers={suppliers} highlight={f.region} height={200} />
          </div>
          <Field label="Badges">
            <BadgePicker options={SUPPLIER_BADGES} value={f.badges} onChange={(b) => setF({ ...f, badges: b })} />
          </Field>
          <Field label="Verification">
            <StatusSelect value={f.status} onChange={(s) => setF({ ...f, status: s })} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!f.region}>
            Save supplier
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Wholesalers per province, optionally highlighting one (used on the page and inside the form). */
function ProvinceChart({ suppliers, highlight, height = 240 }: { suppliers: Supplier[]; highlight?: string; height?: number }) {
  const provinces = [...new Set([...suppliers.map((x) => x.region), ...(highlight ? [highlight] : [])])].sort();
  const data = provinces.map((p) => ({ province: p, count: suppliers.filter((x) => x.region === p).length }));
  return (
    <Bars
      data={data}
      x="province"
      y="count"
      name="Wholesalers"
      colors={data.map((d) => (highlight && d.province === highlight ? COLORS.pink : COLORS.navy))}
      horizontal
      height={Math.max(height, data.length * 34)}
    />
  );
}
