"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

/** Mounts shadcn's Sonner toaster in SpazaLink colours. */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        theme="light"
        position="bottom-center"
        offset={88}
        toastOptions={{ classNames: { toast: "rounded-xl! border-line! shadow-lift! font-medium!" } }}
      />
    </>
  );
}

const notify = (message: string, tone: "ok" | "bad" = "ok") =>
  tone === "ok" ? toast.success(message) : toast.error(message);

export const useToast = () => notify;
