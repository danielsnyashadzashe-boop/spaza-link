"use client";

import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { ArrowRight, LogOut, UserCheck } from "lucide-react";
import { roleOf } from "@/lib/rbac";
import { Button } from "./kit";

/** Shown on the sign-in and sign-up pages when a session already exists, instead of an empty page. */
export function AlreadySignedIn() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const isAdmin = roleOf(user?.publicMetadata) === "admin";
  const destination = isAdmin ? "/admin" : "/dashboard";

  return (
    <div className="rounded-3xl border border-line bg-white px-6 py-10 text-center shadow-card sm:px-10">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-ok-50 text-ok">
        <UserCheck className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-brand">You are already signed in</h1>
      <p className="mt-2 text-muted-foreground">
        {user?.primaryEmailAddress?.emailAddress ? (
          <>
            Signed in as <span className="font-semibold text-ink">{user.primaryEmailAddress.emailAddress}</span>.
          </>
        ) : (
          "Your session is still active."
        )}
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href={destination}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-lift hover:bg-brand-600"
        >
          {isAdmin ? "Go to the admin portal" : "Go to my shop"} <ArrowRight className="size-4" />
        </Link>
        <Button variant="secondary" onClick={() => signOut({ redirectUrl: "/sign-in" })}>
          <LogOut className="size-4" /> Sign out and use another account
        </Button>
      </div>
    </div>
  );
}
