import type { Metadata } from "next";
import { ToastProvider } from "@/components/toast";
import { AdminShell } from "./admin-shell";

export const metadata: Metadata = { title: { default: "Admin portal", template: "%s · SpazaLink Admin" } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
