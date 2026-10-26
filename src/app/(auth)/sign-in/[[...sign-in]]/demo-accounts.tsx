"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";

// Shown on the sign-in page so judges can test straight away.
const DEMO = [
  { label: "Demo shop", shop: "Thandi's Spaza", email: "thandi+clerk_test@spazalink.co.za" },
  { label: "Second shop", shop: "Sipho's Corner Store", email: "sipho+clerk_test@spazalink.co.za" },
  { label: "Admin portal", shop: "Platform admin", email: "admin+clerk_test@spazalink.co.za" },
];
const PASSWORD = "Spaza@2026";

export function DemoAccounts() {
  return (
    <div className="rounded-2xl border border-dashed border-mustard/70 bg-mustard-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-mustard-700">
        <Sparkles className="size-4" /> Judges: try a demo shop
      </p>
      <ul className="mt-3 space-y-2">
        {DEMO.map((d) => (
          <li key={d.email} className="rounded-xl bg-white/80 px-3 py-2 text-sm">
            <p className="text-xs font-medium text-muted-foreground">
              {d.label} · {d.shop}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <CopyValue value={d.email} />
              <CopyValue value={PASSWORD} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-mustard-700/80">If asked for a verification code, enter 424242.</p>
    </div>
  );
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-md font-mono text-xs text-ink hover:text-brand"
      title="Copy"
    >
      {value}
      {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5 text-muted-foreground" />}
    </button>
  );
}
