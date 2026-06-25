// Error reporting — uses Supabase and console; no external dependency.
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  console.error("[AuraLingovia] Unhandled error", { error, ...context });
}
