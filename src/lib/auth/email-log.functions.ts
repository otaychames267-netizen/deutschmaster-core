import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

/**
 * Admin visibility into the confirmation-email pipeline (auth_email_log,
 * see the migration of the same name + confirmation-email.server.ts).
 * Goes through supabaseAdmin rather than a client RLS policy — the table
 * is service_role-only at the DB level (email addresses are sensitive),
 * so this server function is the only read path, admin-gated explicitly.
 */
export const listAuthEmailLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: "retrying" | "sent" | "failed" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("auth_email_log")
      .select("id, user_id, email, email_type, status, provider, provider_message_id, error_message, attempt_count, created_at, last_attempted_at, sent_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const { count: totalCount } = await supabaseAdmin.from("auth_email_log").select("id", { count: "exact", head: true });
    const { count: failedCount } = await supabaseAdmin.from("auth_email_log").select("id", { count: "exact", head: true }).eq("status", "failed");
    const { count: sentCount } = await supabaseAdmin.from("auth_email_log").select("id", { count: "exact", head: true }).eq("status", "sent");

    return { rows: rows ?? [], stats: { total: totalCount ?? 0, failed: failedCount ?? 0, sent: sentCount ?? 0 } };
  });

/** Manual retry button for a failed row — re-runs the exact same
 * generate-link + send pipeline a real resend would, targeting the row's
 * stored email address. Uses the resend (magiclink) path since by
 * definition this is always for an existing account. */
export const adminRetryEmailLogRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const siteUrl = (process.env.VITE_SITE_URL ?? "").trim().replace(/\/$/, "");
    const { resendConfirmationEmail } = await import("./confirmation-email.server");
    const result = await resendConfirmationEmail(supabaseAdmin, { email: data.email, redirectTo: siteUrl ? `${siteUrl}/dashboard` : undefined });
    if (!result.ok) throw new Error(result.message);
    return { ok: true };
  });
