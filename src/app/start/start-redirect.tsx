"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { roleOf } from "@/lib/rbac";
import { Logo } from "@/components/logo";

export function StartRedirect() {
  const router = useRouter();
  const { isLoaded, user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(roleOf(user?.publicMetadata) === "admin" ? "/admin" : "/dashboard");
  }, [isLoaded, user, router]);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6">
      <Logo priority className="h-12 animate-pulse" />
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Opening your shop
      </p>
    </div>
  );
}
