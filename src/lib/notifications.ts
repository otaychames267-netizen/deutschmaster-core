import { supabase } from "@/integrations/supabase/client";

import { type AppNotification } from "@/lib/notification-format";
export { internalPath, timeAgo, type AppNotification } from "@/lib/notification-format";

export async function fetchNotifications(userId: string, limit: number): Promise<AppNotification[]> {
  const { data } = await (supabase as any)
    .from("notifications")
    .select("id, type, title, body, read, action_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AppNotification[];
}
