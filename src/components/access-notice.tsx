"use client";

import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { CheckCircle2, Clock3, KeyRound, ShieldCheck } from "lucide-react";
import { ROLES, roleOf } from "@/lib/rbac";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrandStripe } from "./logo";
import { Button, Pill } from "./kit";

/**
 * Shown once per sign-in session: explains that access is role based today and that every
 * backend action will require an explicit RBAC permission as the platform grows.
 */
export function AccessNotice() {
  const { sessionId, isLoaded } = useAuth();
  const { user } = useUser();
  const role = roleOf(user?.publicMetadata);
  // One notice per sign-in session, remembered for the tab until it is dismissed.
  const key = isLoaded && sessionId ? `spazalink:access-notice:${sessionId}` : null;
  const [closedKey, setClosedKey] = useState<string | null>(null);
  const open = key !== null && closedKey !== key && !wasSeen(key);

  function close() {
    if (!key) return;
    try {
      sessionStorage.setItem(key, "seen");
    } catch {
      /* storage blocked: it simply shows again next visit */
    }
    setClosedKey(key);
    window.dispatchEvent(new Event("spazalink:notice-closed"));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <BrandStripe className="h-1.5 rounded-none" />
        <div className="space-y-5 p-6">
          <DialogHeader className="text-left">
            <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-brand text-mustard">
              <ShieldCheck className="size-6" />
            </span>
            <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-brand">
              Your access is protected by roles
            </DialogTitle>
            <DialogDescription className="text-base">
              Welcome{user?.firstName ? `, ${user.firstName}` : ""}. You are signed in as{" "}
              <Pill tone="pink" className="align-middle">
                {ROLES[role].label}
              </Pill>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-600">Protected today</p>
            {[
              "Every page and every request needs a signed in session.",
              "Each shop sees only its own stock, orders, documents and reports.",
              "The admin portal and its data are open to the Platform admin role only.",
            ].map((t) => (
              <p key={t} className="flex gap-2.5 text-sm text-ink">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> {t}
              </p>
            ))}
          </div>

          <div className="space-y-2.5 rounded-xl bg-paper-2/70 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              <Clock3 className="size-4" /> Coming next: full RBAC
            </p>
            <p className="text-sm text-muted-foreground">
              No one will reach the backend without proper authorization. Every action will check a named permission for
              each role: Shop owner, Wholesaler, Bank or lender, and Platform admin, with an audit trail of who did what.
            </p>
          </div>

          <DialogFooter className="m-0 rounded-none border-0 bg-transparent p-0 pt-1">
            <Button variant="primary" className="w-full sm:w-auto" onClick={close}>
              <KeyRound className="size-4" /> I understand
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function wasSeen(key: string) {
  try {
    return typeof window !== "undefined" && sessionStorage.getItem(key) === "seen";
  } catch {
    return false;
  }
}
