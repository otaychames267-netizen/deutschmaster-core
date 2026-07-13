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
