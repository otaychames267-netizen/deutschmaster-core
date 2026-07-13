/**
 * fraud-suspension.server.ts — the escalating anti-fraud suspension ladder.
 * "Confirmed duplicate" is precisely the existing `auto_rejected_duplicate`
 * decision (src/lib/d17/duplicate-check.server.ts's hard gate, covering all
 * six DuplicateMatchType variants) — no new concept, no new detection logic
 * here. This file only tracks the escalating consequence:
 *   1st confirmed duplicate -> suspend new submissions for 1 hour
 *   2nd                     -> suspend for 24 hours
 *   3rd+                    -> lock the account pending admin review
 * One row per user in d17_fraud_suspensions (upserted), never deleted —
 * a permanent record even after the account is otherwise in good standing
 * again once a suspension window lapses.
 */

export interface SuspensionStatus {
  accountLocked: boolean;
  suspendedUntil: string | null;
}

export async function checkSuspension(supabaseAdmin: any, userId: string): Promise<SuspensionStatus> {
  const { data } = await supabaseAdmin
    .from("d17_fraud_suspensions")
    .select("account_locked, suspended_until")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { accountLocked: false, suspendedUntil: null };
  return { accountLocked: data.account_locked, suspendedUntil: data.suspended_until };
}

export interface EscalationResult {
  confirmedDuplicateCount: number;
  accountLocked: boolean;
  suspendedUntil: string | null;
  /** Escalation tier just applied — used by verify.functions.ts to decide
   * whether to alert (only 2nd/3rd; a single duplicate is common/low-signal
   * — an accidental double-submit, not worth paging anyone). */
  tier: 1 | 2 | 3;
}

export async function escalateSuspension(
  supabaseAdmin: any,
  params: { userId: string; attemptId: string },
): Promise<EscalationResult> {
  const { getD17Config } = await import("./config");
  const config = await getD17Config(supabaseAdmin);

  const { data: existing } = await supabaseAdmin
    .from("d17_fraud_suspensions")
    .select("*")
    .eq("user_id", params.userId)
    .maybeSingle();

  const newCount = (existing?.confirmed_duplicate_count ?? 0) + 1;
  const alreadyLocked = existing?.account_locked ?? false;

  let suspendedUntil: string | null = null;
  let accountLocked = alreadyLocked;
  let tier: 1 | 2 | 3;
  if (alreadyLocked) {
    tier = 3;
  } else if (newCount === 1) {
    suspendedUntil = new Date(Date.now() + config.d17_suspension_tier1_hours * 3600_000).toISOString();
    tier = 1;
  } else if (newCount === 2) {
    suspendedUntil = new Date(Date.now() + config.d17_suspension_tier2_hours * 3600_000).toISOString();
    tier = 2;
  } else {
    accountLocked = true;
    tier = 3;
  }

  const row = {
    user_id: params.userId,
    confirmed_duplicate_count: newCount,
    suspended_until: suspendedUntil,
    account_locked: accountLocked,
    last_confirmed_duplicate_attempt_id: params.attemptId,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabaseAdmin.from("d17_fraud_suspensions").update(row).eq("id", existing.id);
  } else {
    await supabaseAdmin.from("d17_fraud_suspensions").insert(row);
  }

  return { confirmedDuplicateCount: newCount, accountLocked, suspendedUntil, tier };
}

/** Admin-only manual unlock — locked accounts have no automatic unlock
 * path by design. Does NOT reset confirmed_duplicate_count (the historical
 * count is a permanent record); only clears the active consequence. */
export async function clearSuspension(supabaseAdmin: any, userId: string): Promise<void> {
  await supabaseAdmin
    .from("d17_fraud_suspensions")
    .update({ suspended_until: null, account_locked: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}
