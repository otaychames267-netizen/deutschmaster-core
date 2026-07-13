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

const KEYS = ["d17_payment_number", "d17_payment_iban", "d17_payment_account_holder"] as const;

function nonEmpty(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

export async function getD17PaymentConfig(supabaseAdmin: any): Promise<D17PaymentConfig> {
  const { data } = await supabaseAdmin.from("platform_settings").select("key, value").in("key", KEYS);
  const byKey: Record<string, unknown> = {};
  for (const row of data ?? []) byKey[row.key] = row.value;

  return {
    number: nonEmpty(byKey.d17_payment_number) ?? nonEmpty(process.env.D17_OFFICIAL_NUMBER) ?? null,
    iban: nonEmpty(byKey.d17_payment_iban) ?? nonEmpty(process.env.D17_OFFICIAL_IBAN) ?? null,
    accountHolder: nonEmpty(byKey.d17_payment_account_holder),
  };
}
