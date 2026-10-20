import { supabase } from "@/integrations/supabase/client";

/** Row shape the bell and the notifications page read. `kind`/`item_count` are
 * set by the content notifier (see migration 20261020120000) and are not in the
 * generated types yet, hence the untyped client below. */
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

export async function fetchNotifications(userId: string, limit: number): Promise<AppNotification[]> {
  const { data } = await (supabase as any)
    .from("notifications")
    .select("id, type, title, body, read, action_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AppNotification[];
}

/** Only in-app paths are ever navigated to. The DB already refuses anything else
 * on broadcast, this is the second, independent check on the reading side. */
export function internalPath(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/") && !url.startsWith("//") ? url : null;
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.round(m)} min ago`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)} h ago`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)} d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
