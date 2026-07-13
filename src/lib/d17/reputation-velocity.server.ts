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
  /** Distinct OTHER user_ids seen submitting with this same device
   * fingerprint — "multiple accounts sharing a device" per rule-engine.ts's
   * velocity_signal check. 0 if no fingerprint was supplied (older clients,
   * or fingerprinting unavailable). */
  sharedDeviceAccountCount: number;
  /** Distinct OTHER user_ids seen submitting from this same IP address.
   * Weaker signal than the device fingerprint (NAT/shared wifi/mobile
   * carrier CGNAT routinely put unrelated people behind one IP), so
   * rule-engine.ts weights it lower — kept as a separate field rather than
   * folded into sharedDeviceAccountCount so each signal stays individually
   * inspectable in the admin UI and in alerting.server.ts. */
  sharedIpAccountCount: number;
}

export async function computeReputationVelocity(
  supabaseAdmin: any,
  params: { userId: string; orderId: string; attemptsInLastHour: number; deviceFingerprint: string | null; ipAddress: string | null },
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

  let sharedDeviceAccountCount = 0;
  if (params.deviceFingerprint) {
    const { data: rows } = await supabaseAdmin
      .from("d17_verification_attempts")
      .select("user_id")
      .eq("device_fingerprint", params.deviceFingerprint)
      .neq("user_id", params.userId)
      .limit(50);
    sharedDeviceAccountCount = new Set((rows ?? []).map((r: { user_id: string }) => r.user_id)).size;
  }

  let sharedIpAccountCount = 0;
  if (params.ipAddress) {
    const { data: rows } = await supabaseAdmin
      .from("d17_verification_attempts")
      .select("user_id")
      .eq("ip_address", params.ipAddress)
      .neq("user_id", params.userId)
      .limit(50);
    sharedIpAccountCount = new Set((rows ?? []).map((r: { user_id: string }) => r.user_id)).size;
  }

  return {
    priorApprovedCount: priorApprovedCount ?? 0,
    priorConfirmedDuplicateCount: suspension?.confirmed_duplicate_count ?? 0,
    attemptsInLastHour: params.attemptsInLastHour,
    sharedDeviceAccountCount,
    sharedIpAccountCount,
  };
}
