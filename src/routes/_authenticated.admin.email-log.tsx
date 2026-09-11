import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Mail, RefreshCw, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listAuthEmailLog, adminRetryEmailLogRow, checkResendDeliveryStatuses } from "@/lib/auth/email-log.functions";

export const Route = createFileRoute("/_authenticated/admin/email-log")({
  component: AdminEmailLogPage,
});

interface LogRow {
  id: string;
  user_id: string | null;
  email: string;
  email_type: string;
  status: "retrying" | "sent" | "failed";
  provider: string;
  provider_message_id: string | null;
  error_message: string | null;
  attempt_count: number;
  created_at: string;
  last_attempted_at: string | null;
  sent_at: string | null;
}

const STATUS_FILTERS = ["all", "failed", "retrying", "sent"] as const;

const STATUS_BADGE: Record<LogRow["status"], { icon: typeof CheckCircle2; label: string; color: string }> = {
  sent: { icon: CheckCircle2, label: "Sent", color: "text-emerald-600 dark:text-emerald-400" },
  failed: { icon: XCircle, label: "Failed", color: "text-red-600 dark:text-red-400" },
  retrying: { icon: Clock, label: "Retrying", color: "text-amber-600 dark:text-amber-400" },
};

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function AdminEmailLogPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [stats, setStats] = useState({ total: 0, failed: 0, sent: 0 });
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [deliveryResults, setDeliveryResults] = useState<
    { email: string; created_at: string; resend_status: string; error: boolean }[] | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAuthEmailLog({ data: { status: filter === "all" ? undefined : filter } });
      setRows(result.rows as LogRow[]);
      setStats(result.stats);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load email log.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleCheckDelivery() {
    setCheckingDelivery(true);
    try {
      const result = await checkResendDeliveryStatuses({ data: { limit: 25 } });
      setDeliveryResults(result.results);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not check delivery status.");
    } finally {
      setCheckingDelivery(false);
    }
  }

  async function handleRetry(email: string) {
    setRetrying(email);
    try {
      await adminRetryEmailLogRow({ data: { email } });
      toast.success(`Confirmation email re-sent to ${email}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed.");
    } finally {
      setRetrying(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
          <Mail className="h-6 w-6" /> Email Delivery
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every confirmation-email attempt this app has made on its own (bypassing Supabase Auth's own SMTP-triggered
          mailer) — see the root-cause investigation for why this exists.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total attempts (last 200)" value={stats.total} color="text-foreground" />
        <StatCard label="Sent" value={stats.sent} color="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Failed" value={stats.failed} color="text-red-600 dark:text-red-400" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={handleCheckDelivery}
          disabled={checkingDelivery}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
        >
          {checkingDelivery ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
          Check real delivery status (last 25 sent)
        </button>
      </div>

      {deliveryResults && (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Sent at</th>
                <th className="px-4 py-3">Real Resend status</th>
              </tr>
            </thead>
            <tbody>
              {deliveryResults.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{r.email}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td
                    className={`px-4 py-3 font-semibold ${
                      r.resend_status === "delivered"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : r.error || r.resend_status === "bounced" || r.resend_status === "complained"
                          ? "text-red-600 dark:text-red-400"
                          : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {r.resend_status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Error</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No email attempts logged yet.</td></tr>
            ) : (
              rows.map((r) => {
                const badge = STATUS_BADGE[r.status];
                const Icon = badge.icon;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{r.email}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.email_type}</td>
                    <td className={`px-4 py-3 font-semibold ${badge.color}`}>
                      <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.attempt_count}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-red-600 dark:text-red-400" title={r.error_message ?? ""}>
                      {r.error_message ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "failed" && (
                        <button
                          onClick={() => handleRetry(r.email)}
                          disabled={retrying === r.email}
                          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                        >
                          {retrying === r.email ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
