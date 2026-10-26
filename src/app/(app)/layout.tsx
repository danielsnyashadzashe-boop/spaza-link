import { AppShell } from "@/components/app-shell";
import { ShopProvider } from "@/components/shop-context";
import { ToastProvider } from "@/components/toast";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ShopProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </ShopProvider>
  );
}
