"use client";

/** Fetch JSON from our API, surfacing the server's friendly error message on failure. */
export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (typeof window !== "undefined") {
    // Full reloads here so no stale shop data survives in memory.
    if (res.status === 401) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`;
    } else if (res.status === 409 && data.code === "NO_SHOP") {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/onboarding";
    }
  }
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data as T;
}
