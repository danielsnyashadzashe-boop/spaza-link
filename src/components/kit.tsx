"use client";

// SpazaLink's small UI kit, built on shadcn/ui primitives (src/components/ui).
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button as UiButton } from "@/components/ui/button";
import { Card as UiCard } from "@/components/ui/card";
import { Input as UiInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton as UiSkeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export { cn };

const VARIANT = {
  primary: { variant: "default", className: "shadow-lift hover:bg-brand-600" },
  pink: { variant: "pink", className: "" },
  mustard: { variant: "mustard", className: "" },
  secondary: { variant: "outline", className: "bg-card hover:border-pink/40 hover:bg-pink-50" },
  ghost: { variant: "ghost", className: "text-muted-foreground" },
  danger: { variant: "destructive", className: "bg-transparent" },
} as const;

const SIZE = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", lg: "h-14 px-6 text-base" } as const;

type ButtonProps = Omit<ComponentProps<typeof UiButton>, "variant" | "size"> & {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...props },
  ref,
) {
  const v = VARIANT[variant];
  return (
    <UiButton
      ref={ref}
      variant={v.variant}
      disabled={disabled || loading}
      className={cn("gap-2 rounded-xl font-semibold active:scale-[0.98]", SIZE[size], v.className, className)}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </UiButton>
  );
});

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <UiCard className={cn("block gap-0 rounded-2xl py-0 shadow-card ring-line", className)}>{children}</UiCard>;
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-600">{eyebrow}</p>}
        <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentProps<typeof UiInput>>(function Input({ className, ...props }, ref) {
  return <UiInput ref={ref} className={cn("h-11 rounded-xl bg-white px-3.5", className)} {...props} />;
});

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Label className="block space-y-1.5 font-normal">
      <span className="block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </Label>
  );
}

const TONE = {
  neutral: "bg-paper-2 text-muted-foreground",
  ok: "bg-ok-50 text-ok",
  warn: "bg-warn-50 text-mustard-700",
  bad: "bg-bad-50 text-bad",
  brand: "bg-brand-50 text-brand",
  pink: "bg-pink-50 text-pink-600",
  mustard: "bg-mustard-50 text-mustard-700",
} as const;

export function Pill({ tone = "neutral", children, className }: { tone?: keyof typeof TONE; children: ReactNode; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("h-auto rounded-full px-2.5 py-0.5 font-semibold", TONE[tone], className)}>
      {children}
    </Badge>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-bad/20 bg-bad-50 px-3 py-2 text-sm text-bad">
      {message}
    </p>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <UiSkeleton className={cn("rounded-xl bg-paper-2", className)} />;
}

/** Destructive confirmation (shadcn AlertDialog) wrapped around any trigger. */
export function ConfirmAction({
  title,
  description,
  confirmLabel = "Remove",
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  children: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="rounded-xl bg-bad text-white hover:bg-bad/90">
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
