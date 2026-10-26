import type { Metadata } from "next";
import { Suspense } from "react";
import { Show, SignIn } from "@clerk/nextjs";
import { AlreadySignedIn } from "@/components/already-signed-in";
import { DemoAccounts } from "./demo-accounts";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <Suspense>
      <Show when="signed-out">
        <div className="space-y-8">
          <SignIn />
          <DemoAccounts />
        </div>
      </Show>
      <Show when="signed-in">
        <AlreadySignedIn />
      </Show>
    </Suspense>
  );
}
