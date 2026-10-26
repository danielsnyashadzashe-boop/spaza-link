"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { ArrowLeftRight, Eye, Sparkles, Store } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrandStripe } from "./logo";
import { Button } from "./kit";
import { useShop } from "./shop-context";
import { useToast } from "./toast";

/** Switch into the view only demo shop, or back to the visitor's own shop. Full reload so no state leaks. */
export async function switchView(mode: "demo" | "own") {
  const res = await fetch("/api/view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Could not switch shops.");
  const { next } = (await res.json()) as { next: string };
  window.location.assign(next);
}

/** Banner across the app while exploring the demo shop. */
export function DemoBanner() {
  const { view, shop } = useShop();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!view?.demo) return null;

  async function leave() {
    setBusy(true);
    try {
      await switchView("own");
    } catch (e) {
      toast((e as Error).message, "bad");
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-mustard/40 bg-mustard-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
        <p className="flex flex-1 items-center gap-2.5 text-sm text-ink">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-mustard text-ink">
            <Eye className="size-4" />
          </span>
          <span>
            You are exploring <strong>{shop?.name ?? "the demo shop"}</strong>, a demo shop filled with sample data. It is view
            only, so changes are switched off.
          </span>
        </p>
        <Button size="sm" variant="primary" loading={busy} onClick={leave} className="shrink-0">
          <ArrowLeftRight className="size-4" />
          {view.hasOwnShop ? "Back to my shop" : "Register my own shop"}
        </Button>
      </div>
    </div>
  );
}

/**
 * One welcome per user, after the sign-in access notice has been dismissed:
 *  - no shop yet: "you are looking at Thandi's demo shop, register yours when ready"
 *  - brand new, empty shop: "want to see a busy shop first?"
 */
export function WelcomeDemo() {
  const { view } = useShop();
  const { user } = useUser();
  const { sessionId } = useAuth();
  const toast = useToast();
  const [noticeDone, setNoticeDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  const visitor = Boolean(view?.demo && !view.hasOwnShop);
  const newShop = Boolean(view?.isNewShop);
  const key = user ? `spazalink:welcome:${visitor ? "visitor" : "new-shop"}:${user.id}` : null;

  useEffect(() => {
    const done = () => setNoticeDone(true);
    window.addEventListener("spazalink:notice-closed", done);
    return () => window.removeEventListener("spazalink:notice-closed", done);
  }, []);

  const noticeAlreadySeen = sessionId ? readStorage(sessionStorage, `spazalink:access-notice:${sessionId}`) === "seen" : false;
  const open = Boolean((visitor || newShop) && key && !dismissed && readStorage(localStorage, key) !== "seen" && (noticeDone || noticeAlreadySeen));

  function close() {
    if (key) writeStorage(key);
    setDismissed(true);
  }

  async function primary() {
    setBusy(true);
    if (key) writeStorage(key);
    try {
      // Full reload so no demo shop data stays in memory.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (visitor) window.location.assign("/onboarding");
      else await switchView("demo");
    } catch (e) {
      toast((e as Error).message, "bad");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <BrandStripe className="h-1.5 rounded-none" />
        <div className="space-y-6 p-6">
          <DialogHeader className="text-left">
            <span className="mb-2 flex size-12 animate-pop items-center justify-center rounded-2xl bg-pink text-white">
              <Sparkles className="size-6" />
            </span>
            <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-brand">
              {visitor ? "Welcome to SpazaLink!" : "Your shop is open!"}
            </DialogTitle>
            <DialogDescription className="text-base">
              {visitor
                ? "While you settle in, you are looking around Thandi's Spaza, our demo shop. Register your own shop whenever you are ready and it becomes yours alone."
                : "It is empty for now. Want to see what a busy SpazaLink shop looks like first?"}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-paper-2/70 p-4 text-sm text-ink">
            <p className="font-semibold text-brand">Thandi&apos;s Spaza, Orlando East</p>
            <p className="mt-1 text-muted-foreground">
              Six months of trading: shelves in green, yellow and red, a live low stock alert, orders on the way and a bank
              ready Financial Health Report. View only, so explore freely.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="pink" className="w-full sm:flex-1" loading={busy} onClick={primary}>
              {visitor ? <Store className="size-4" /> : <Eye className="size-4" />}
              {visitor ? "Register my own shop" : "Explore the demo shop"}
            </Button>
            <Button variant="secondary" className="w-full sm:flex-1" onClick={close}>
              {visitor ? <Eye className="size-4" /> : <Store className="size-4" />}
              {visitor ? "Explore the demo first" : "Set up my own shop"}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {visitor ? "Your own shop is private: no one else sees its data." : "You can switch back to your own shop at any time."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Header switch for shop owners: peek at the demo shop. */
export function DemoToggle() {
  const { view } = useShop();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!view || view.demo || !view.hasOwnShop) return null;
  return (
    <button
      onClick={async () => {
        setBusy(true);
        try {
          await switchView("demo");
        } catch (e) {
          toast((e as Error).message, "bad");
          setBusy(false);
        }
      }}
      disabled={busy}
      className="flex h-10 items-center gap-2 rounded-xl border border-line bg-card px-3 text-sm font-semibold text-muted-foreground transition hover:border-pink/40 hover:text-pink-600"
      title="Look around Thandi's demo shop"
    >
      <Eye className="size-4" />
      <span className="hidden lg:inline">Demo shop</span>
    </button>
  );
}

function readStorage(store: Storage | undefined, key: string) {
  try {
    return typeof window !== "undefined" ? store?.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string) {
  try {
    localStorage.setItem(key, "seen");
  } catch {
    /* storage blocked: the popup may show again next visit */
  }
}
