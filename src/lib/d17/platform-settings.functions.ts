import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
// notifyTelegram (a *.server.* module) is dynamically imported below rather
// than statically here — see the equivalent comment in verify.functions.ts.

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

/**
 * set_platform_setting is service-role-only (revoked from authenticated) so
 * every toggle flip is provably admin-attributed server-side rather than
 * trusting a client-supplied admin id — this is the sole write path.
 */
export const setD17KillSwitch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { enabled: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("set_platform_setting", {
      p_key: "payment_verification_kill_switch",
      p_value: data.enabled,
      p_admin_id: context.userId,
    });
    if (error) throw new Error(error.message);

    const { notifyTelegram } = await import("@/lib/notify/telegram.server");
    const telegramSent = await notifyTelegram(
      `[INFO] kill_switch_toggled: D17 payment verification kill switch turned ${data.enabled ? "ON" : "OFF"}.`,
    );
    await supabaseAdmin.from("d17_alerts").insert({
      severity: "info",
      category: "kill_switch_toggled",
      message: `Kill switch turned ${data.enabled ? "ON" : "OFF"} by admin ${context.userId}.`,
      telegram_sent: telegramSent,
    });

    return { enabled: data.enabled };
  });

/**
 * Emergency D17-only switch — distinct from setD17KillSwitch above. The
 * kill switch routes verification ATTEMPTS to manual review while the D17
 * payment option stays visible; this instead hides the "Manual Payment
 * (D17 Mobile Transfer)" button on /billing and rejects new-order creation
 * server-side (orders.functions.ts), while leaving Lemon Squeezy and any
 * already-in-flight D17 order completely unaffected.
 */
export const setD17DisabledSwitch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { disabled: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("set_platform_setting", {
      p_key: "d17_disabled",
      p_value: data.disabled,
      p_admin_id: context.userId,
    });
    if (error) throw new Error(error.message);

    const { notifyTelegram } = await import("@/lib/notify/telegram.server");
    const telegramSent = await notifyTelegram(
      `[INFO] d17_disabled_toggled: D17 manual payment ${data.disabled ? "DISABLED (button hidden, no new orders)" : "RE-ENABLED"}.`,
    );
    await supabaseAdmin.from("d17_alerts").insert({
      severity: "info",
      category: "d17_disabled_toggled",
      message: `D17 manual payment ${data.disabled ? "disabled" : "re-enabled"} by admin ${context.userId}.`,
      telegram_sent: telegramSent,
    });

    return { disabled: data.disabled };
  });

/**
 * Generic setter for the dynamic risk-config values (src/lib/d17/config.ts)
 * — auto-approve threshold, attempt caps, review windows, suspension
 * durations, etc. Every change is logged to platform_settings_history
 * automatically (set_platform_setting itself does this — see
 * 20260714030000_d17_v3_dynamic_config.sql), so no setting is ever
 * silently overwritten without a preserved previous value.
 */
export const setD17ConfigValue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("set_platform_setting", {
      p_key: data.key,
      p_value: data.value,
      p_admin_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { key: data.key, value: data.value };
  });

/** Read-only fetch of every dynamic D17 config value, for the admin UI. */
export const getD17ConfigValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getD17Config } = await import("./config");
    return getD17Config(supabaseAdmin);
  });

/**
 * Admin-only read of the current D17 destination phone/IBAN/account holder.
 * Students never call this directly — they only ever see the values already
 * snapshotted onto their own order (getD17Order), which is exactly what
 * keeps existing orders unaffected when an admin changes these values.
 */
export const getD17PaymentConfigValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getD17PaymentConfig } = await import("./payment-config");
    return getD17PaymentConfig(supabaseAdmin);
  });

/**
 * Admin-only write for the D17 destination phone/IBAN/account holder.
 * Reuses set_platform_setting (service-role-only, auto-history-logged) —
 * only affects NEW orders created after the change; every existing order
 * keeps the destination values it snapshotted at its own creation time.
 */
export const setD17PaymentConfigValue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { field: "number" | "iban" | "accountHolder"; value: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const key = { number: "d17_payment_number", iban: "d17_payment_iban", accountHolder: "d17_payment_account_holder" }[data.field];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("set_platform_setting", {
      p_key: key,
      p_value: data.value.trim(),
      p_admin_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { field: data.field, value: data.value.trim() };
  });
