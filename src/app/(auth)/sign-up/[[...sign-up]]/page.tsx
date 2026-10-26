import type { Metadata } from "next";
import { Suspense } from "react";
import { Show, SignUp } from "@clerk/nextjs";
import { AlreadySignedIn } from "@/components/already-signed-in";

export const metadata: Metadata = { title: "Register your shop" };

export default function SignUpPage() {
  return (
    <Suspense>
      <Show when="signed-out">
        <SignUp />
      </Show>
      <Show when="signed-in">
        <AlreadySignedIn />
      </Show>
    </Suspense>
  );
}
