/** Runs once when the server starts: open the MongoDB connection early so the first visitor is not kept waiting. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getDb } = await import("./lib/db");
  getDb().catch((err) => console.warn("[db] warm up failed; requests will retry:", err?.message ?? err));
}
