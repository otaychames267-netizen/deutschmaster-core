import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const WHATSAPP_SETTING_KEY = "whatsapp_contact_number";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

/**
 * Admin-editable WhatsApp contact number, stored in the existing generic
 * platform_settings key/value store (same pattern as the D17 kill switch —
 * see platform-settings.functions.ts). The student-facing header button
 * reads this directly via the public get_platform_setting RPC (grantable to
 * `authenticated`, unlike the admin-only table SELECT) and hides itself
 * whenever the value is unset — no number is hardcoded anywhere.
 */
export const setWhatsAppNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { number: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const digits = data.number.replace(/[^\d+]/g, "");
    const { error } = await supabaseAdmin.rpc("set_platform_setting", {
      p_key: WHATSAPP_SETTING_KEY,
      p_value: digits || null,
      p_admin_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { number: digits || null };
  });
