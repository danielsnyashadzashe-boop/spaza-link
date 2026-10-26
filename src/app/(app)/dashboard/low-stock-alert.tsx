"use client";

import { AlertTriangle, ArrowRight, X } from "lucide-react";
import type { StockItem } from "@/lib/types";
import { Button } from "@/components/kit";

export function LowStockAlert({
  item,
  others,
  onQuickFix,
  onDismiss,
}: {
  item: StockItem | null;
  others: number;
  onQuickFix: (item: StockItem) => void;
  onDismiss: () => void;
}) {
  if (!item) return null;
  const missing = item.fullCapacity - item.quantity;
  const pct = Math.round(item.ratio * 100);

  return (
    <div className="sticky top-19 z-30 flex justify-center">
      <div
        key={item.id}
        role="alert"
        className="relative w-full animate-slide-down overflow-hidden rounded-2xl border border-bad/25 bg-white shadow-[0_24px_60px_-20px_rgb(214_58_47/0.45)]"
      >
        <div className="absolute inset-y-0 left-0 w-1.5 bg-bad" aria-hidden />
        <div className="flex flex-col gap-4 p-4 pl-6 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-bad-50 text-bad">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-bold leading-tight">
                {item.name} is running out
              </p>
              <p className="text-sm text-muted-foreground">
                Only <span className="num font-semibold text-bad">{item.quantity}</span> of {item.fullCapacity} left ({pct}%).
                {others > 0 && ` ${others} more item${others > 1 ? "s are" : " is"} low too.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="mustard"
              size="lg"
              className="flex-1 sm:flex-none"
              onClick={() => onQuickFix(item)}
              disabled={!item.product || missing <= 0}
            >
              Quick Fix: restock {missing}
              <ArrowRight className="size-4" />
            </Button>
            <button
              onClick={onDismiss}
              className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-paper-2"
              aria-label="Dismiss alert"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
