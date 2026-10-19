/**
 * content-protection/suspension.server.ts — escalating anti-scraping
 * suspension ladder, sibling to src/lib/d17/fraud-suspension.server.ts (same
 * shape, deliberately a separate table — see the migration's header comment
 * for why the D17 payment-fraud table wasn't reused).
 *
 * Design choice (per explicit product decision): automated action stays
 * temporary at every tier. A 3rd-tier account gets a temporary lock AND is
 * flagged pending_permanent_review — an actual permanent ban with zero
 * refund is never automatic, it requires an admin to act on that flag (see
 * admin-actions.functions.ts). This avoids permanently banning a paying
 * customer over false positives (DevTools left open, an ad blocker, a fast
 * connection) with nobody in the loop.
 *
 * Not every event type counts toward the ladder:
 * - 'devtools_heuristic' is logged for visibility only and NEVER escalates.
 *   Window-size-based DevTools detection is well known to false-positive on
 *   any resized/docked panel, narrow window, or mobile browser chrome, and
 *   plenty of legitimate users (developers, people using accessibility
 *   tools) keep DevTools open for reasons that have nothing to do with
 *   scraping.
 * - 'contextmenu_blocked' / 'copy_blocked' / 'keyboard_shortcut_blocked' /
 *   'print_attempt' only count in bulk (see BURST_THRESHOLD) — a curious
 *   student right-clicking or hitting Ctrl+P once is not an attack; a
 *   script firing 20+ of these in a few minutes is.
 * - 'high_speed_access' (the behavioral pace signal from a rate-limit trip
 *   on real content fetches) always counts — that's the strongest signal
 *   this suite has for actual bulk extraction.
 */

const ROLLING_WINDOW_HOURS = 24;
const BURST_WINDOW_MINUTES = 5;
const BURST_THRESHOLD = 20; // DOM-defense trips within BURST_WINDOW_MINUTES to count as one escalation-worthy event

const TIER1_HOURS = 1;
const TIER2_HOURS = 24;
const TIER3_HOURS = 72; // temporary even at tier 3 — permanent ban requires an explicit admin action

const STRONG_SIGNAL_TYPES = new Set(["high_speed_access"]);
const BURST_ONLY_TYPES = new Set(["contextmenu_blocked", "copy_blocked", "keyboard_shortcut_blocked", "print_attempt"]);

export interface SuspensionStatus {
  accountLocked: boolean;
  suspendedUntil: string | null;
  pendingPermanentReview: boolean;
}

export async function checkContentSuspension(supabaseAdmin: any, userId: string): Promise<SuspensionStatus> {
  const { data } = await supabaseAdmin
    .from("content_protection_suspensions")
    .select("account_locked, suspended_until, pending_permanent_review")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { accountLocked: false, suspendedUntil: null, pendingPermanentReview: false };
  return {
    accountLocked: data.account_locked,
    suspendedUntil: data.suspended_until,
    pendingPermanentReview: data.pending_permanent_review,
  };
}

export async function recordIncident(
  supabaseAdmin: any,
  params: { userId: string; eventType: string; route: string | null; metadata?: Record<string, unknown> },
): Promise<{ escalated: boolean; status: SuspensionStatus }> {
  const { data: incident } = await supabaseAdmin
    .from("content_protection_incidents")
    .insert({
      user_id: params.userId,
      event_type: params.eventType,
      route: params.route,
      metadata: params.metadata ?? {},
    })
    .select("id")
    .single();

  if (params.eventType === "devtools_heuristic") {
    return { escalated: false, status: await checkContentSuspension(supabaseAdmin, params.userId) };
  }

  const shouldEvaluate = await isEscalationWorthy(supabaseAdmin, params.userId, params.eventType);
  if (!shouldEvaluate) {
    return { escalated: false, status: await checkContentSuspension(supabaseAdmin, params.userId) };
  }

  const result = await escalate(supabaseAdmin, params.userId, incident?.id ?? null);
  return { escalated: true, status: result };
}

async function isEscalationWorthy(supabaseAdmin: any, userId: string, eventType: string): Promise<boolean> {
  if (STRONG_SIGNAL_TYPES.has(eventType)) return true;
  if (!BURST_ONLY_TYPES.has(eventType)) return false;

  const since = new Date(Date.now() - BURST_WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await supabaseAdmin
    .from("content_protection_incidents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("event_type", Array.from(BURST_ONLY_TYPES))
    .gte("created_at", since);

  return (count ?? 0) >= BURST_THRESHOLD;
}

async function escalate(supabaseAdmin: any, userId: string, lastIncidentId: string | null): Promise<SuspensionStatus> {
  const { data: existing } = await supabaseAdmin
    .from("content_protection_suspensions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // Already locked by an earlier escalation and still within the temporary
  // window, or already flagged pending permanent review — don't re-escalate
  // past what an admin hasn't yet acted on.
  if (existing?.pending_permanent_review) {
    return {
      accountLocked: existing.account_locked,
      suspendedUntil: existing.suspended_until,
      pendingPermanentReview: true,
    };
  }

  const since = new Date(Date.now() - ROLLING_WINDOW_HOURS * 3600_000).toISOString();
  const { count } = await supabaseAdmin
    .from("content_protection_incidents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  const incidentCount = count ?? 0;

  const priorTier = existing?.tier ?? 0;
  let tier = priorTier;
  let suspendedUntil: string | null = existing?.suspended_until ?? null;
  let accountLocked = existing?.account_locked ?? false;
  let pendingPermanentReview = false;

  if (incidentCount >= 30 && priorTier < 3) {
    tier = 3;
    accountLocked = true;
    suspendedUntil = new Date(Date.now() + TIER3_HOURS * 3600_000).toISOString();
    pendingPermanentReview = true;
  } else if (incidentCount >= 15 && priorTier < 2) {
    tier = 2;
    suspendedUntil = new Date(Date.now() + TIER2_HOURS * 3600_000).toISOString();
  } else if (incidentCount >= 5 && priorTier < 1) {
    tier = 1;
    suspendedUntil = new Date(Date.now() + TIER1_HOURS * 3600_000).toISOString();
  }

  const row = {
    user_id: userId,
    incident_count: incidentCount,
    tier,
    suspended_until: suspendedUntil,
    account_locked: accountLocked,
    pending_permanent_review: pendingPermanentReview || (existing?.pending_permanent_review ?? false),
    locked_reason: accountLocked ? "Automated content-protection threshold reached — flagged for admin review." : existing?.locked_reason ?? null,
    last_incident_id: lastIncidentId,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabaseAdmin.from("content_protection_suspensions").update(row).eq("id", existing.id);
  } else {
    await supabaseAdmin.from("content_protection_suspensions").insert(row);
  }

  return { accountLocked, suspendedUntil, pendingPermanentReview: row.pending_permanent_review };
}

/** Admin-only manual unlock — clears the active consequence, keeps the
 * historical incident rows and does not clear pending_permanent_review
 * unless the admin explicitly dismisses it (a separate action). */
export async function clearContentSuspension(supabaseAdmin: any, userId: string): Promise<void> {
  await supabaseAdmin
    .from("content_protection_suspensions")
    .update({ suspended_until: null, account_locked: false, pending_permanent_review: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}
