import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isAppPage = createRouteMatcher(["/dashboard(.*)", "/order(.*)", "/finance(.*)", "/onboarding(.*)", "/admin(.*)", "/start(.*)"]);

/**
 * Signed-out visitors can only reach the landing, sign-in and sign-up pages; app pages
 * redirect to sign-in. API routes are not redirected here — each one re-checks the
 * Clerk session itself (lib/api.ts) and answers 401 JSON.
 */
export default clerkMiddleware(
  async (auth, req) => {
    if (isAppPage(req)) await auth.protect();
  },
  {
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
    // Only for machines whose clock drifts (see README). Unset means Clerk's strict 5 second default.
    clockSkewInMs: Number(process.env.CLERK_CLOCK_SKEW_MS) || undefined,
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
