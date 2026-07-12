/**
 * reputation-velocity.server.ts — computes the two DB-dependent signals fed
 * into rule-engine.ts's reputation_signal and velocity_signal checks.
 * Kept separate from rule-engine.ts (which stays a pure, zero-I/O function)
 * so the scoring logic itself remains fully unit-testable with hand-built
 * fixtures — this file is the only thing that talks to Postgres.
 *
 * `attemptsInLastHour` is NOT re-queried here — src/lib/d17/verify.functions.ts
 * already fetches that count for its hourly-rate-limit gate, so it's passed
 * straight through to avoid a duplicate query.
 */

export interface ReputationVelocitySignals {
  priorApprovedCount: number;
  priorConfirmedDuplicateCount: number;
  attemptsInLastHour: number;
}

export async function computeReputationVelocity(
  supabaseAdmin: any,
  params: { userId: string; orderId: string; attemptsInLastHour: number },
): Promise<ReputationVelocitySignals> {
  const { count: priorApprovedCount } = await supabaseAdmin
    .from("d17_orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", params.userId)
    .in("status", ["auto_approved", "admin_approved"])
    .neq("id", params.orderId);

  const { data: suspension } = await supabaseAdmin
    .from("d17_fraud_suspensions")
    .select("confirmed_duplicate_count")
    .eq("user_id", params.userId)
    .maybeSingle();

  return {
    priorApprovedCount: priorApprovedCount ?? 0,
    priorConfirmedDuplicateCount: suspension?.confirmed_duplicate_count ?? 0,
    attemptsInLastHour: params.attemptsInLastHour,
  };
}
