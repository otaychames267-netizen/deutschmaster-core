/**
 * usage-budget.server.ts — shared daily AI-spend cap, used by every feature
 * that calls a paid model (Schreiben grading, Mündlich evaluation, D17
 * payment verification). Previously lived inside essay-grader-gemini.ts and
 * was imported cross-feature by src/lib/d17/verify.functions.ts — moved out
 * so D17 (and any future caller) doesn't depend on the Schreiben grader
 * module. Provider-agnostic: token counts from Claude and Gemini both feed
 * the same ledger (api_usage_ledger via record_api_usage/get_today_api_usage).
 */

/** Global daily token spend cap across all AI features (see api_usage_ledger).
 * Callers should check this BEFORE spending anything charge-worthy (a
 * student credit, a Mündlich minute) so a budget-exceeded rejection never
 * costs the student. Unset/non-finite cap = no limit enforced. */
export async function isBudgetExceeded(supabase: any): Promise<boolean> {
  const cap = Number(process.env.AI_DAILY_TOKEN_CAP ?? process.env.GEMINI_DAILY_TOKEN_CAP ?? Infinity);
  if (!Number.isFinite(cap)) return false;
  const { data } = await supabase.rpc("get_today_api_usage");
  return typeof data === "number" && data >= cap;
}

export async function recordUsage(supabase: any, tokens: number): Promise<void> {
  if (!tokens) return;
  await supabase.rpc("record_api_usage", { p_tokens: tokens });
}
