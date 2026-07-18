/**
 * config.ts — reads dynamic D17 risk-configuration values from
 * platform_settings (the same table/RPC the kill switch already uses).
 * Every value has a hardcoded fallback matching what was hardcoded before
 * this existed, so a missing/unset key never breaks the pipeline. Not a
 * *.server.* file — get_platform_setting is a plain RPC call, no Node-only
 * APIs, safe to import from anywhere.
 */

const DEFAULTS = {
  d17_auto_approve_threshold: 90,
  d17_max_attempts_per_order: 3,
  d17_manual_review_window_hours: 8,
  d17_ten_minute_submission_limit: 3,
  d17_hourly_submission_limit: 5,
  d17_confirmation_window_minutes: 10,
  d17_suspension_tier1_hours: 1,
  d17_suspension_tier2_hours: 24,
} as const;

export type D17ConfigKey = keyof typeof DEFAULTS;

/** Fetches every known D17 config key in one query (not N round-trips). */
export async function getD17Config(supabaseAdmin: any): Promise<Record<D17ConfigKey, number>> {
  const { data } = await supabaseAdmin
    .from("platform_settings")
    .select("key, value")
    .in("key", Object.keys(DEFAULTS));

  const result: Record<D17ConfigKey, number> = { ...DEFAULTS };
  for (const row of data ?? []) {
    const key = row.key as D17ConfigKey;
    if (key in DEFAULTS && typeof row.value === "number") {
      result[key] = row.value;
    }
  }
  return result;
}
