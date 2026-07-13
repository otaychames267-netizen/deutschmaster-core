import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

/**
 * Production-audit fix: the Admin Settings "Billing & Plans" price fields
 * previously had no save path at all — the page's handleSave() only
 * toggled a local "Saved!" label with no server call, so admins editing
 * prices there had zero effect. plans.price_tnd is the single source of
 * truth both checkout paths already read live (D17's createD17OrderImpl,
 * Lemon Squeezy's createCheckoutSessionImpl) and each order/checkout
 * snapshots its own amount_tnd/custom_price at creation time — so writing
 * here only ever affects orders created AFTER the change, never past ones.
 */
export const updatePlanPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan_code: "schriftlich" | "muendlich" | "komplett"; price_tnd: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!Number.isFinite(data.price_tnd) || data.price_tnd <= 0) {
      throw new Error("Price must be a positive number.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("plans").update({ price_tnd: data.price_tnd }).eq("code", data.plan_code);
    if (error) throw new Error(error.message);
    return { plan_code: data.plan_code, price_tnd: data.price_tnd };
  });

export const getPlanPrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("plans").select("code, price_tnd").in("code", ["schriftlich", "muendlich", "komplett"]);
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((p: { code: string; price_tnd: number }) => [p.code, p.price_tnd]));
  });
