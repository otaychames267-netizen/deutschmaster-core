import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PushToggle } from "@/components/PushToggle";
import { fetchNotifications, internalPath, timeAgo, type AppNotification } from "@/lib/notifications";
import {
  CheckCircle2, AlertCircle, Info, Zap, BellOff, Check, Sparkles, Megaphone, ChevronRight, Clock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

const TYPE_CONFIG: Record<string, { icon: typeof Info; bg: string; text: string }> = {
  info:         { icon: Info,         bg: "bg-blue-500/10",    text: "text-blue-500"    },
  success:      { icon: CheckCircle2, bg: "bg-emerald-500/10", text: "text-emerald-500" },
  warning:      { icon: AlertCircle,  bg: "bg-amber-500/10",   text: "text-amber-500"   },
  error:        { icon: AlertCircle,  bg: "bg-red-500/10",     text: "text-red-500"     },
  system:       { icon: Zap,          bg: "bg-primary/10",     text: "text-primary"     },
  content:      { icon: Sparkles,     bg: "bg-primary/10",     text: "text-primary"     },
  announcement: { icon: Megaphone,    bg: "bg-amber-500/10",   text: "text-amber-500"   },
};

function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchNotifications(user.id, 100)
      .then((rows) => { if (alive) setItems(rows); })
      .catch(() => { /* empty state below */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user?.id]);

  async function markAllRead() {
    if (!user) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  }

  async function open(item: AppNotification) {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      await supabase.from("notifications").update({ read: true }).eq("id", item.id);
    }
    const to = internalPath(item.action_url);
    if (to) navigate({ to: to as never });
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Check className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>

      <PushToggle variant="card" />

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16">
          <BellOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.info;
            const IconComp = cfg.icon;
            const target = internalPath(item.action_url);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => open(item)}
                className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-colors hover:bg-muted/40 ${
                  item.read ? "border-border bg-card opacity-70" : "border-border bg-card shadow-sm"
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                  <IconComp className={`h-4 w-4 ${cfg.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p dir="auto" className={`text-sm font-medium ${item.read ? "text-muted-foreground" : "text-foreground"}`}>
                      {item.title}
                    </p>
                    {!item.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p dir="auto" className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(item.created_at)}</span>
                    {target && <span className="flex items-center gap-0.5 font-medium text-primary">Open <ChevronRight className="h-3 w-3" /></span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
