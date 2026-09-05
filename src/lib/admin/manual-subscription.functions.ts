import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Manual subscription activation for off-platform payments (virement, cash,
 * or a D17 transfer confirmed manually) — the fast path for launch, before
 * every payment method runs through the automated D17 pipeline.
 *
 * Deliberately thin: all the actual state-mutation + audit-logging logic
 * lives in the admin_manual_subscription_action() Postgres function (see
 * migration 20260804230000), which writes to the exact same `subscriptions`
 * table and calls the exact same provision_essay_credits/
 * provision_muendlich_subscription RPCs the real D17 auto-approval path
 * uses — this file's job is only: authenticate as admin, translate a
 * duration choice into a concrete date, and shuttle the result back.
 */

export type ManualPlanCode = "schriftlich" | "muendlich" | "komplett";
export type ManualDurationKey = "trial_3d" | "1m" | "3m" | "6m" | "12m";
export type ManualPaymentMethod = "virement" | "cash" | "d17" | "other";

const DURATION_DAYS: Record<ManualDurationKey, number> = {
  trial_3d: 3,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "12m": 365,
};

export const DURATION_LABELS: Record<ManualDurationKey, string> = {
  trial_3d: "3-day trial",
  "1m": "1 month",
  "3m": "3 months",
  "6m": "6 months",
  "12m": "12 months",
};

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

export interface ManualSubUser {
  id: string;
  email: string | null;
  full_name: string | null;
  level: string | null;
}

export interface ManualSubSummary {
  status: string;
  plan_code: string;
  expires_at: string;
  is_trial: boolean;
}

export interface ManualSubSearchResult extends ManualSubUser {
  subscription: ManualSubSummary | null;
}

async function attachLatestSubscriptions(supabaseAdmin: any, users: ManualSubUser[]): Promise<ManualSubSearchResult[]> {
  if (!users.length) return [];
  const ids = users.map((u) => u.id);
  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id, status, plan_code, expires_at, is_trial, created_at")
    .in("user_id", ids)
    .order("created_at", { ascending: false });
  const latestByUser = new Map<string, ManualSubSummary>();
  for (const s of (subs ?? []) as any[]) {
    if (!latestByUser.has(s.user_id)) {
      latestByUser.set(s.user_id, { status: s.status, plan_code: s.plan_code, expires_at: s.expires_at, is_trial: s.is_trial });
    }
  }
  return users.map((u) => ({ ...u, subscription: latestByUser.get(u.id) ?? null }));
}

/**
 * Two separate ilike queries + merge, rather than a single `.or()` filter
 * string built from raw admin input — PostgREF's `.or()` syntax treats
 * comma/parenthesis as structural, so interpolating unescaped user input
 * into it risks a malformed or attacker-widened filter. Two plain `.eq`/
 * `.ilike` calls need no escaping at all.
 */
export const searchUsersForManualSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string }) => d)
  .handler(async ({ data, context }): Promise<ManualSubSearchResult[]> => {
    await assertAdmin(context);
    const q = data.query.trim();
    if (q.length < 2) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    if (isUuid) {
      const { data: users, error } = await supabaseAdmin
        .from("profiles").select("id, email, full_name, level").eq("id", q).limit(1);
      if (error) throw new Error(error.message);
      return attachLatestSubscriptions(supabaseAdmin, (users ?? []) as ManualSubUser[]);
    }

    const [byEmail, byName] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name, level").ilike("email", `%${q}%`).limit(15),
      supabaseAdmin.from("profiles").select("id, email, full_name, level").ilike("full_name", `%${q}%`).limit(15),
    ]);
    if (byEmail.error) throw new Error(byEmail.error.message);
    if (byName.error) throw new Error(byName.error.message);

    const merged = new Map<string, ManualSubUser>();
    for (const u of [...(byEmail.data ?? []), ...(byName.data ?? [])] as ManualSubUser[]) merged.set(u.id, u);
    return attachLatestSubscriptions(supabaseAdmin, [...merged.values()].slice(0, 15));
  });

export const getUserSubscriptionSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }): Promise<ManualSubSearchResult | null> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: user, error } = await supabaseAdmin
      .from("profiles").select("id, email, full_name, level").eq("id", data.user_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!user) return null;
    const [result] = await attachLatestSubscriptions(supabaseAdmin, [user as ManualSubUser]);
    return result;
  });

interface ApplyActionInput {
  user_id: string;
  action: "grant" | "extend" | "remove";
  plan_code?: ManualPlanCode;
  duration_key?: ManualDurationKey;
  /** ISO date string (yyyy-mm-dd) — grant only, alternative to duration_key. */
  custom_expires_at?: string;
  payment_method?: ManualPaymentMethod;
  reference?: string;
  notes?: string;
}

export const applyManualSubscriptionAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ApplyActionInput) => d)
  .handler(async ({ data, context }): Promise<ManualSubSearchResult | null> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rpcBase = {
      p_admin_id: context.userId,
      p_user_id: data.user_id,
      p_payment_method: data.payment_method ?? undefined,
      p_reference: data.reference?.trim() || undefined,
      p_notes: data.notes?.trim() || undefined,
    };

    if (data.action === "remove") {
      const { error } = await supabaseAdmin.rpc("admin_manual_subscription_action", {
        ...rpcBase,
        p_action: "remove",
        p_action_label: "remove",
      });
      if (error) throw new Error(error.message);
      return getUserSubscriptionSummaryImpl(supabaseAdmin, data.user_id);
    }

    if (!data.plan_code) throw new Error("A plan is required.");

    if (data.action === "grant") {
      let newExpiresAt: string;
      let isTrial = false;
      let actionLabel: string;
      if (data.custom_expires_at) {
        const d = new Date(`${data.custom_expires_at}T23:59:59.000Z`);
        if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
          throw new Error("Custom expiration date must be a valid date in the future.");
        }
        newExpiresAt = d.toISOString();
        actionLabel = "grant_custom";
      } else {
        if (!data.duration_key) throw new Error("A duration is required.");
        const days = DURATION_DAYS[data.duration_key];
        isTrial = data.duration_key === "trial_3d";
        newExpiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
        actionLabel = `grant_${data.duration_key}`;
      }
      const { error } = await supabaseAdmin.rpc("admin_manual_subscription_action", {
        ...rpcBase,
        p_action: "grant",
        p_action_label: actionLabel,
        p_plan_code: data.plan_code,
        p_is_trial: isTrial,
        p_new_expires_at: newExpiresAt,
      });
      if (error) throw new Error(error.message);
      return getUserSubscriptionSummaryImpl(supabaseAdmin, data.user_id);
    }

    // extend
    if (!data.duration_key) throw new Error("A duration is required to extend.");
    const days = DURATION_DAYS[data.duration_key];
    const { error } = await supabaseAdmin.rpc("admin_manual_subscription_action", {
      ...rpcBase,
      p_action: "extend",
      p_action_label: `extend_${data.duration_key}`,
      p_plan_code: data.plan_code,
      p_extend_days: days,
    });
    if (error) throw new Error(error.message);
    return getUserSubscriptionSummaryImpl(supabaseAdmin, data.user_id);
  });

async function getUserSubscriptionSummaryImpl(supabaseAdmin: any, userId: string): Promise<ManualSubSearchResult | null> {
  const { data: user } = await supabaseAdmin
    .from("profiles").select("id, email, full_name, level").eq("id", userId).maybeSingle();
  if (!user) return null;
  const [result] = await attachLatestSubscriptions(supabaseAdmin, [user as ManualSubUser]);
  return result;
}

export interface ManualSubActionLogRow {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  action_label: string;
  plan_code: string | null;
  previous_status: string | null;
  new_status: string | null;
  previous_expires_at: string | null;
  new_expires_at: string | null;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export const getManualSubscriptionHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }): Promise<ManualSubActionLogRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("manual_subscription_actions")
      .select("id, admin_id, action, action_label, plan_code, previous_status, new_status, previous_expires_at, new_expires_at, payment_method, reference, notes, created_at")
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    const adminIds = [...new Set((rows ?? []).map((r: any) => r.admin_id).filter(Boolean))];
    const { data: admins } = adminIds.length
      ? await supabaseAdmin.from("profiles").select("id, email").in("id", adminIds)
      : { data: [] as { id: string; email: string | null }[] };
    const adminEmailById = new Map((admins ?? []).map((a: any) => [a.id, a.email as string | null]));
    return (rows ?? []).map((r: any) => ({ ...r, admin_email: r.admin_id ? (adminEmailById.get(r.admin_id) ?? null) : null }));
  });
