"use client";

import { useRef, useState, type DragEvent } from "react";
import { CheckCircle2, Eye, FileUp, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { DOCUMENT_TYPES, PROFILE_WEIGHT, type DocumentType } from "@/lib/rules";
import type { Compliance } from "@/lib/types";
import { useShop } from "@/components/shop-context";
import { useToast } from "@/components/toast";
import { Card, cn, Pill, Skeleton, ConfirmAction } from "@/components/kit";
import { CountUp } from "@/components/motion";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

export function ComplianceCard() {
  const { compliance, setCompliance } = useShop();
  const score = compliance?.score ?? 0;
  const tone = score >= 85 ? "ok" : score >= 50 ? "warn" : "bad";

  return (
    <Card className="overflow-hidden">
      <div className="relative bg-brand p-6 text-white">
        <div className="bg-weave absolute inset-0 opacity-30 invert" aria-hidden />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mustard">Compliance score</p>
            {compliance ? (
              <p className="num mt-1 font-display text-5xl font-extrabold tracking-tight">
                <CountUp value={score} format={(n) => `${Math.round(n)}%`} /> <span className="text-2xl font-bold text-white/70">Ready</span>
              </p>
            ) : (
              <Skeleton className="mt-2 h-12 w-40 bg-white/15" />
            )}
          </div>
          <ShieldCheck className="size-10 text-mustard" />
        </div>
        <div
          className="relative mt-5 h-3 overflow-hidden rounded-full bg-white/15"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Compliance score"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out",
              tone === "bad" ? "bg-[#ff8a73]" : "bg-gradient-to-r from-pink to-mustard",
            )}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="relative mt-3 text-sm text-white/75">
          {score >= 85
            ? "Wholesalers and lenders can see you are a registered, compliant business."
            : "Upload your CIPC and BEE documents to unlock verified wholesale pricing."}
        </p>
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-sm">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className={cn("size-4", compliance?.profileComplete ? "text-ok" : "text-muted-foreground/50")} />
            Shop profile complete
          </span>
          <Pill tone={compliance?.profileComplete ? "ok" : "neutral"}>+{PROFILE_WEIGHT}%</Pill>
        </div>
        {(Object.keys(DOCUMENT_TYPES) as DocumentType[]).map((type) => (
          <DocumentSlot key={type} type={type} compliance={compliance} onChange={setCompliance} />
        ))}
        <p className="px-1 text-xs text-muted-foreground">PDF, PNG or JPEG · max 5 MB · stored privately for your shop only</p>
      </div>
    </Card>
  );
}

function DocumentSlot({
  type,
  compliance,
  onChange,
}: {
  type: DocumentType;
  compliance: Compliance | null;
  onChange: (c: Compliance) => void;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const doc = compliance?.documents.find((d) => d.type === type);
  const { label, weight } = DOCUMENT_TYPES[type];

  async function upload(file: File) {
    // Quick client-side check for a friendly message; the server re-checks type, real content and size.
    if (file.size > MAX_BYTES) return toast("File is too large. The limit is 5 MB.", "bad");
    if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) return toast("Only PDF, PNG or JPEG files are accepted.", "bad");
    setBusy(true);
    try {
      const body = new FormData();
      body.set("type", type);
      body.set("file", file);
      onChange(await api<Compliance>("/api/documents", { method: "POST", body }));
      toast(`${label} uploaded`);
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    if (!doc) return;
    setBusy(true);
    try {
      onChange(await api<Compliance>(`/api/documents/${doc.id}`, { method: "DELETE" }));
      toast("Document removed");
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-xl border p-3.5 transition",
        doc ? "border-ok/25 bg-ok-50/50" : "border-dashed border-line",
        dragging && "border-brand bg-brand-50",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            doc ? "bg-ok text-white" : "bg-paper-2 text-muted-foreground",
          )}
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : doc ? <CheckCircle2 className="size-5" /> : <FileUp className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {type} <Pill tone={doc ? "ok" : "neutral"}>+{weight}%</Pill>
          </p>
          <p className="truncate text-xs text-muted-foreground">{doc ? doc.filename : label}</p>
        </div>
        {doc ? (
          <div className="flex items-center gap-1">
            <a
              href={`/api/documents/${doc.id}/file`}
              target="_blank"
              rel="noopener"
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-white hover:text-ink"
              aria-label={`View ${label}`}
            >
              <Eye className="size-4" />
            </a>
            <ConfirmAction
              title={`Remove your ${type} document?`}
              description="Your compliance score drops straight away. You can upload it again whenever you like."
              onConfirm={remove}
            >
              <button
                disabled={busy}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-bad-50 hover:text-bad"
                aria-label={`Remove ${label}`}
              >
                <Trash2 className="size-4" />
              </button>
            </ConfirmAction>
          </div>
        ) : (
          <button
            onClick={() => input.current?.click()}
            disabled={busy || !compliance}
            className="h-9 rounded-lg bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            Upload
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </div>
    </div>
  );
}
