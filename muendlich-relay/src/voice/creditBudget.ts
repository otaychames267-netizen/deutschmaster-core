/**
 * Hard cap enforcement for the 60,000-credit-per-user ElevenLabs allowance.
 * Separate from (and additive to) the existing minutes-based
 * muendlich_credits/deduct_muendlich_minutes_dual system — see the
 * migration's header comment for why these aren't merged.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { USER_CREDIT_ALLOWANCE, type ExamUsage, computeExamCost } from "./costAccounting.js";

export interface BudgetCheck {
  allowed: boolean;
  creditsUsed: number;
  creditsRemaining: number;
}

export async function checkCreditBudget(admin: SupabaseClient, userId: string): Promise<BudgetCheck> {
  const { data, error } = await admin.rpc("get_muendlich_elevenlabs_credits_used", { p_user_id: userId });
  if (error) {
    // Fail CLOSED on a real error (not "no rows" — the RPC already
    // coalesces that to 0) — an accounting failure should never silently
    // grant unlimited usage.
    console.error(`[credits] failed to read usage for user ${userId}:`, error.message);
    return { allowed: false, creditsUsed: USER_CREDIT_ALLOWANCE, creditsRemaining: 0 };
  }
  const creditsUsed = Number(data ?? 0);
  const creditsRemaining = Math.max(0, USER_CREDIT_ALLOWANCE - creditsUsed);
  return { allowed: creditsRemaining > 0, creditsUsed, creditsRemaining };
}

/** Records ONE participant's SHARE of a shared exam session's usage.
 * Upsert on (user_id, session_key) so repeated calls during a long exam
 * update the same row with the latest running total rather than
 * double-counting.
 *
 * `usage` is the WHOLE room's total consumption (one shared examiner voice,
 * one shared conversation, heard/transcribed for both candidates) — NOT
 * per-participant. Splitting it 50/50 happens HERE, once, centrally, so
 * every call site (server.ts's periodic tick, endRoom's final snapshot)
 * automatically gets it right by construction, rather than relying on each
 * call site to remember to divide by two. This was a real bug in the first
 * version of this file: it stored the FULL exam cost against BOTH
 * participants' ledgers, which would have silently double-billed every
 * shared exam (2,000-credit exam -> 2,000 charged to A AND 2,000 to B,
 * instead of 1,000 each) — caught from the explicit product requirement,
 * not from a test, so there's no live-billing evidence this ever shipped;
 * fixed before any real usage could hit it. */
const PARTICIPANTS_PER_EXAM = 2;

export async function recordExamUsage(admin: SupabaseClient, userId: string, sessionKey: string, usage: ExamUsage): Promise<void> {
  const fullCost = computeExamCost(usage);
  const share = {
    ttsCredits: fullCost.ttsCredits / PARTICIPANTS_PER_EXAM,
    sttCredits: fullCost.sttCredits / PARTICIPANTS_PER_EXAM,
    totalCredits: fullCost.totalCredits / PARTICIPANTS_PER_EXAM,
  };
  const { error } = await admin.from("muendlich_elevenlabs_usage").upsert(
    {
      user_id: userId,
      session_key: sessionKey,
      // Raw usage columns also store the PARTICIPANT'S SHARE (halved), so
      // this table's own numbers are internally consistent (tts_credits ==
      // tts_characters * 0.5, not off by the shared/individual mismatch) —
      // anyone reading this table later doesn't need to know the 50/50 rule
      // to reconstruct the right totals from it.
      tts_characters: Math.round(usage.ttsCharacters / PARTICIPANTS_PER_EXAM),
      stt_minutes: usage.sttMinutes / PARTICIPANTS_PER_EXAM,
      tts_credits: share.ttsCredits,
      stt_credits: share.sttCredits,
      total_credits: share.totalCredits,
    },
    { onConflict: "user_id,session_key" },
  );
  if (error) console.error(`[credits] failed to record usage for user ${userId}, session ${sessionKey}:`, error.message);
}
