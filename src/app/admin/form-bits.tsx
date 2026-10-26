"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill } from "@/components/kit";

export const STATUS_LABEL = { VERIFIED: "Verified", PENDING: "Pending review", REJECTED: "Rejected" } as const;
export type Verification = keyof typeof STATUS_LABEL;
export const STATUS_PILL = { VERIFIED: "ok", PENDING: "mustard", REJECTED: "bad" } as const;

export function StatusPill({ status }: { status: string }) {
  const s = (status in STATUS_LABEL ? status : "PENDING") as Verification;
  return <Pill tone={STATUS_PILL[s]}>{STATUS_LABEL[s]}</Pill>;
}

export function StatusSelect({ value, onChange, className }: { value: string; onChange: (v: Verification) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Verification)}>
      <SelectTrigger className={`h-11! w-full rounded-xl bg-white ${className ?? ""}`} aria-label="Verification status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        {(Object.keys(STATUS_LABEL) as Verification[]).map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A set of checkbox chips for picking badges. */
export function BadgePicker({ options, value, onChange }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <label
            key={o}
            className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              on ? "border-brand bg-brand-50 text-brand" : "border-line bg-white text-muted-foreground"
            }`}
          >
            <Checkbox checked={on} onCheckedChange={(c) => onChange(c ? [...value, o] : value.filter((x) => x !== o))} />
            {o}
          </label>
        );
      })}
    </div>
  );
}
