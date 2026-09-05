/**
 * payment-config.ts — reads the D17 destination phone number/IBAN/account
 * holder from platform_settings (admin-editable, same mechanism as
 * config.ts's dynamic risk values), falling back to the D17_OFFICIAL_NUMBER/
 * D17_OFFICIAL_IBAN env vars when an admin hasn't set a platform_settings
 * value yet — so a fresh deploy with only the env vars configured keeps
 * working exactly as before this existed. Not a *.server.* file — plain
 * table read, safe to import anywhere.
 */

export interface D17PaymentConfig {
  number: string | null;
  iban: string | null;
  accountHolder: string | null;
}

/**
 * The ONE canonical official D17 recipient number for AuraLingovia. This is
 * the single source of truth for "where money must be sent" and "the only
 * recipient we ever accept" — deliberately a hardcoded constant, NOT just an
 * admin-editable platform_setting, so that a mis-set or blanked config value
 * can never (a) hide the real number from paying customers, or (b) cause the
 * verification engine to start accepting transfers to some other number. The
 * rule engine's recipient hard-gate (src/lib/d17/rule-engine.ts) compares the
 * extracted recipient against THIS value; anything else is auto-rejected.
 *
 * If this number ever changes, it must be changed HERE (one place) — do not
 * rely on the platform_settings override alone for the security check.
 */
export const OFFICIAL_D17_RECIPIENT = "20046880";

const KEYS = ["d17_payment_number", "d17_payment_iban", "d17_payment_account_holder"] as const;

function nonEmpty(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

export async function getD17PaymentConfig(supabaseAdmin: any): Promise<D17PaymentConfig> {
  const { data } = await supabaseAdmin.from("platform_settings").select("key, value").in("key", KEYS);
  const byKey: Record<string, unknown> = {};
  for (const row of data ?? []) byKey[row.key] = row.value;

  return {
    // The canonical constant is the final fallback so the number displayed to
    // customers ALWAYS matches the number the security gate enforces, even on
    // a fresh deploy with no platform_settings/env configured. An admin may
    // still override the *displayed* number via platform_settings, but the
    // security gate always enforces OFFICIAL_D17_RECIPIENT regardless.
    number: nonEmpty(byKey.d17_payment_number) ?? nonEmpty(process.env.D17_OFFICIAL_NUMBER) ?? OFFICIAL_D17_RECIPIENT,
    iban: nonEmpty(byKey.d17_payment_iban) ?? nonEmpty(process.env.D17_OFFICIAL_IBAN) ?? null,
    accountHolder: nonEmpty(byKey.d17_payment_account_holder),
  };
}
