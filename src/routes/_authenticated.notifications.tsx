import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell, CheckCircle2, AlertCircle, Info,
  Zap, Calendar, BellOff, Check,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "system";
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

/* Placeholder data until the notifications table is fully wired */
function buildDefaultNotifications(
  sub: { status: string; expires_at: string } | null
): Notification[] {
  const now = new Date().toISOString();
  const notes: Notification[] = [
    {
      id: "welcome",
      type: "success",
      title: "Welcome to AuraLingovia 🎉",
      body: "Your account is ready. Start with a quick practice session to calibrate your level.",
      created_at: now,
      read: false,
    },
  ];

  if (sub?.status === "trial") {
    const days = Math.ceil(
      (new Date(sub.expires_at).getTime() - Date.now()) / 86400000
    );
    notes.push({
      id: "trial",
      type: "warning",
      title: "Trial ending soon",
      body: `Your free trial expires in ${days} day${days !== 1 ? "s" : ""}. Upgrade now to keep full access.`,
      created_at: now,
      read: false,
    });
  }

  return notes;
}

const TYPE_CONFIG = {
  info:    { icon: Info,         bg: "bg-blue-500/10",    text: "text-blue-500"    },
  success: { icon: CheckCircle2, bg: "bg-emerald-500/10", text: "text-emerald-500" },
  warning: { icon: AlertCircle,  bg: "bg-amber-500/10",   text: "text-amber-500"   },
  system:  { icon: Zap,          bg: "bg-primary/10",     text: "text-primary"     },
};

function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems]   = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("subscriptions")
      .select("status, expires_at")
      .eq("user_id", user.id)
      .in("status", ["active", "trial"])
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setItems(buildDefaultNotifications(data));
        setLoading(false);
      });
  }, [user?.id]);

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
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
            const cfg = TYPE_CONFIG[item.type];
            const IconComp = cfg.icon;
            return (
              <div
                key={item.id}
                className={`flex items-start gap-4 rounded-2xl border p-5 transition-colors ${
                  item.read ? "border-border bg-card opacity-70" : "border-border bg-card shadow-sm"
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                  <IconComp className={`h-4.5 w-4.5 ${cfg.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${item.read ? "text-muted-foreground" : "text-foreground"}`}>
                      {item.title}
                    </p>
                    {!item.read && (
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(item.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preferences section */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Notification preferences</p>
        </div>
        <div className="space-y-3">
          {[
            { label: "Subscription & billing alerts", sub: "Renewal reminders, payment confirmations" },
            { label: "Study reminders",               sub: "Daily streak reminders and practice suggestions" },
            { label: "New content alerts",            sub: "When new practice exams are added" },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-foreground">{pref.label}</p>
                <p className="text-xs text-muted-foreground">{pref.sub}</p>
              </div>
              <button
                disabled
                className="relative inline-flex h-5 w-9 shrink-0 rounded-full border border-border bg-muted cursor-not-allowed"
                title="Coming soon"
              />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Email notification settings coming in Phase 2.
        </p>
      </div>
    </div>
  );
}
