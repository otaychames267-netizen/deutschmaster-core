import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-authored dashboard announcements. Publish sets expires_at server-side
 * (now() + 24h) so expiry is authoritative in the DB, not a frontend timer —
 * the same row, same timestamp, is what every device/session/refresh sees.
 * Read-side visibility for students is handled entirely by the
 * dashboard_announcements RLS policy (active-subscribers-only, non-expired);
 * this file only covers the admin publish + admin history list.
 */

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

export interface DashboardAnnouncement {
  id: string;
  message: string;
  published_at: string;
  expires_at: string;
  created_by: string | null;
}

const MAX_MESSAGE_LENGTH = 500;

export const publishDashboardAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { message: string }) => d)
  .handler(async ({ data, context }): Promise<DashboardAnnouncement> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const message = data.message.trim();
    if (!message) throw new Error("Message cannot be empty.");
    if (message.length > MAX_MESSAGE_LENGTH) throw new Error(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: row, error } = await db
      .from("dashboard_announcements")
      .insert({
        message,
        published_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        created_by: context.userId,
      })
      .select("id, message, published_at, expires_at, created_by")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to publish announcement.");
    return row as DashboardAnnouncement;
  });

export const adminListDashboardAnnouncements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardAnnouncement[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data, error } = await db
      .from("dashboard_announcements")
      .select("id, message, published_at, expires_at, created_by")
      .order("published_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as DashboardAnnouncement[];
  });
