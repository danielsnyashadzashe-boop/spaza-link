import type { Metadata } from "next";
import { Store } from "lucide-react";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Register your shop" };

export default function OnboardingPage() {
  return (
    <div className="rounded-3xl border border-line bg-white px-6 py-10 shadow-card sm:px-10">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-pink text-white">
        <Store className="size-6" />
      </span>
      <p className="mt-5 text-sm font-semibold text-pink-600">Last step</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-brand">Tell us about your shop</h1>
      <p className="mt-3 text-muted-foreground">
        Wholesalers deliver here, and your Financial Health Report carries these details to the bank.
      </p>
      <OnboardingForm />
    </div>
  );
}
