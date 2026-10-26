"use client";

import { useState } from "react";
import { ChevronDown, Download, FileText, Presentation } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./kit";
import { useToast } from "./toast";

type Format = "pdf" | "pptx";

const FORMATS: { format: Format; label: string; hint: string; icon: typeof FileText }[] = [
  { format: "pdf", label: "PDF document", hint: "Best for printing and the bank", icon: FileText },
  { format: "pptx", label: "PowerPoint slides", hint: "Editable charts for presenting", icon: Presentation },
];

/** Download a report in the format of the user's choice. `endpoint` must accept ?format=pdf|pptx. */
export function ReportDownload({
  endpoint,
  filename,
  label = "Download report",
  variant = "mustard",
  size = "lg",
  className,
}: {
  endpoint: string;
  filename: string;
  label?: string;
  variant?: "mustard" | "primary" | "pink";
  size?: "md" | "lg";
  className?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<Format | null>(null);

  async function get(format: Format) {
    setBusy(format);
    try {
      const res = await fetch(`${endpoint}?format=${format}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not create the report. Please try again.");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast(format === "pdf" ? "PDF report downloaded" : "PowerPoint report downloaded");
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setBusy(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} loading={busy !== null} className={className}>
          {busy === null && <Download className="size-5" />}
          {label}
          <ChevronDown className="size-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl p-2">
        <DropdownMenuLabel className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Choose a format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FORMATS.map(({ format, label: l, hint, icon: Icon }) => (
          <DropdownMenuItem key={format} onSelect={() => get(format)} className="cursor-pointer gap-3 rounded-lg p-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand">
              <Icon className="size-5" />
            </span>
            <span>
              <span className="block font-semibold text-ink">{l}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
