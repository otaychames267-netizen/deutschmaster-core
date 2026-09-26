import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin override for the "webhook failed / needs manual reconciliation" case:
 * force-activates a student's subscription and hard-provisions their wallet
 * balance(s) directly, bypassing Lemon Squeezy entirely. Uses the same
 * hard-reset provisioning RPCs the webhook itself calls
 * (provision_muendlich_subscription/provision_essay_credits) — those are
 * service-role-only, so this function authenticates the caller as an admin
 * first (via the has_role RPC, same pattern as collections.functions.ts),
 * then performs the actual writes with the service-role client.
 */

type PlanCode = "schriftlich" | "muendlich" | "komplett";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

export const forceProvisionSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { student_id: string; plan_code: PlanCode; note?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const reason = data.note?.trim() || "admin_force_provision";

    // subscriptions.user_id is not unique (a user can accumulate multiple
    // rows over time — past cancelled/expired subscriptions, etc.), so this
    // is a read-then-write, same pattern as the Lemon Squeezy webhook, not
    // a plain upsert on user_id.
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", data.student_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const subRow = {
      user_id: data.student_id,
      plan_code: data.plan_code,
      status: "active" as const,
      is_trial: false,
      expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
    };
    const { error: subError } = existingSub
      ? await supabaseAdmin.from("subscriptions").update(subRow).eq("id", existingSub.id)
      : await supabaseAdmin.from("subscriptions").insert({ ...subRow, started_at: new Date().toISOString() });
    if (subError) throw new Error(`Failed to activate subscription: ${subError.message}`);

    const results: { minutes?: number; credits?: number } = {};
    if (data.plan_code === "muendlich" || data.plan_code === "komplett") {
      const { data: minutes, error } = await supabaseAdmin.rpc("provision_muendlich_subscription", {
        p_user_id: data.student_id,
        p_minutes: 300,
        p_reason: reason,
      });
      if (error) throw new Error(`Failed to provision minutes: ${error.message}`);
      results.minutes = minutes as number;
    }
    if (data.plan_code === "schriftlich" || data.plan_code === "komplett") {
      const { data: credits, error } = await supabaseAdmin.rpc("provision_essay_credits", {
        p_user_id: data.student_id,
        p_amount: 30,
        p_reason: reason,
      });
      if (error) throw new Error(`Failed to provision credits: ${error.message}`);
      results.credits = credits as number;
    }

    return results;
  });
