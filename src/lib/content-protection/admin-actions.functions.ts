import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

export interface ContentSuspensionRow {
  userId: string;
  email: string | null;
  incidentCount: number;
  tier: number;
  suspendedUntil: string | null;
  accountLocked: boolean;
  pendingPermanentReview: boolean;
  lockedReason: string | null;
  updatedAt: string;
}

/** Lists only accounts with an active or historical consequence — not every
 * account that ever tripped a single logged event (most incidents never
 * escalate; this view is for the ones that did). */
export const listContentSuspensions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("content_protection_suspensions")
      .select("*")
      .or("account_locked.eq.true,pending_permanent_review.eq.true,suspended_until.not.is.null")
      .order("updated_at", { ascending: false });

    const rows: ContentSuspensionRow[] = [];
    for (const r of data ?? []) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      rows.push({
        userId: r.user_id,
        email: userData?.user?.email ?? null,
        incidentCount: r.incident_count,
        tier: r.tier,
        suspendedUntil: r.suspended_until,
        accountLocked: r.account_locked,
        pendingPermanentReview: r.pending_permanent_review,
        lockedReason: r.locked_reason,
        updatedAt: r.updated_at,
      });
    }
    return rows;
  });

export const clearContentSuspensionAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { clearContentSuspension } = await import("./suspension.server");
    await clearContentSuspension(supabaseAdmin, data.userId);
  });

/**
 * The only path to a PERMANENT content-access lock — never automatic (see
 * suspension.server.ts's header comment). Requires an admin to have looked
 * at the flagged account (pending_permanent_review) and decided. This only
 * revokes future content access at the application gate
 * (getContentAccessGate) — it does not touch billing/subscription state or
 * issue any refund action, which stays a separate, manual decision.
 */
export const permanentlyBanForScraping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; reason: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.reason?.trim()) throw new Error("A reason is required for a permanent ban.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    await supabaseAdmin
      .from("content_protection_suspensions")
      .update({
        account_locked: true,
        pending_permanent_review: false,
        suspended_until: null,
        locked_reason: `Permanently banned by ${adminUser?.user?.email ?? context.userId}: ${data.reason.trim()}`,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", data.userId);
  });
