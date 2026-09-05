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

/**
 * Diagnostic: cross-checks our own "sent" status (which only means Resend's
 * API *accepted* the send request) against Resend's actual delivery events
 * (delivered / bounced / complained / delivery_delayed) for the most recent
 * rows that have a provider_message_id. This is the one signal this app
 * never had before — "sent" in auth_email_log has always meant "Resend said
 * 200 OK", never "the recipient's mail server actually accepted it".
 */
export const checkResendDeliveryStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const limit = Math.min(data.limit ?? 25, 50);
    const { data: rows, error } = await supabaseAdmin
      .from("auth_email_log")
      .select("id, email, provider_message_id, created_at, status")
      .eq("status", "sent")
      .not("provider_message_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not configured on this deployment.");

    // Sequential with a small delay, not Promise.all — Resend's retrieve
    // endpoint rate-limits at ~2 req/s, and firing 25 requests in parallel
    // was producing spurious "HTTP 429" rows that looked like delivery
    // failures but were actually just this diagnostic tripping over itself.
    const results: { email: string; created_at: string; resend_status: string; error: boolean }[] = [];
    for (const row of (rows ?? []) as { id: string; email: string; provider_message_id: string | null; created_at: string }[]) {
      try {
        const res = await fetch(`https://api.resend.com/emails/${row.provider_message_id}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          results.push({ email: row.email, created_at: row.created_at, resend_status: `HTTP ${res.status}`, error: true });
        } else {
          const body = await res.json();
          results.push({ email: row.email, created_at: row.created_at, resend_status: body.last_event ?? "unknown", error: false });
        }
      } catch (e) {
        results.push({ email: row.email, created_at: row.created_at, resend_status: e instanceof Error ? e.message : "fetch failed", error: true });
      }
      await new Promise((resolve) => setTimeout(resolve, 550));
    }

    return { results };
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
