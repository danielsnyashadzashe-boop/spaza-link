"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { Eye, Store } from "lucide-react";
import { api } from "@/lib/client";
import { Button, ErrorNote, Field, Input } from "@/components/kit";
import { switchView } from "@/components/demo-mode";

type Form = { ownerName: string; shopName: string; location: string; phone: string };

export function OnboardingForm() {
  const router = useRouter();
  const { user } = useUser();
  const [form, setForm] = useState<Partial<Form>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exploring, setExploring] = useState(false);

  // Already registered (e.g. a returning owner hit this page): go straight in. Admins own no shop.
  useEffect(() => {
    api<{ registered: boolean; role: string }>("/api/shop")
      .then(({ registered, role }) => {
        if (registered) router.replace("/dashboard");
        else if (role === "admin") router.replace("/admin");
      })
      .catch(() => undefined);
  }, [router]);

  // Prefill from the Clerk profile until the owner types their own value.
  const values: Form = {
    ownerName: form.ownerName ?? user?.fullName ?? "",
    shopName: form.shopName ?? "",
    location: form.location ?? "",
    phone: form.phone ?? user?.primaryPhoneNumber?.phoneNumber ?? "",
  };
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/shop", { method: "POST", json: values });
      router.replace("/dashboard");
    } catch (err) {
      if ((err as Error).message.includes("already registered")) return router.replace("/dashboard");
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-6">
      <ErrorNote message={error} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Your name">
          <Input autoComplete="name" required maxLength={80} value={values.ownerName} onChange={set("ownerName")} />
        </Field>
        <Field label="Shop name">
          <Input
            autoComplete="organization"
            required
            maxLength={80}
            placeholder="Thandi's Spaza"
            value={values.shopName}
            onChange={set("shopName")}
          />
        </Field>
      </div>
      <Field label="Location" hint="Township and street, e.g. Orlando East, Soweto">
        <Input autoComplete="street-address" required maxLength={120} value={values.location} onChange={set("location")} />
      </Field>
      <Field label="Mobile number" hint="Used for PayShap payments and delivery updates">
        <Input type="tel" autoComplete="tel" required placeholder="082 123 4567" value={values.phone} onChange={set("phone")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        <Store className="size-4" /> Open my shop
      </Button>
      <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        loading={exploring}
        onClick={async () => {
          setExploring(true);
          try {
            await switchView("demo");
          } catch (err) {
            setError((err as Error).message);
            setExploring(false);
          }
        }}
      >
        <Eye className="size-4" /> Explore Thandi&apos;s demo shop first
      </Button>
    </form>
  );
}
