import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { DollarSign, Search, CheckCircle2, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: AdminPaymentsPage,
});

interface OrderRow {
  id: string;
  user_id: string;
  plan_code: string;
  amount_tnd: number;
  currency: string;
  status: string;
  attempts_used: number;
  created_at: string;
  locked_for_admin_only: boolean;
  student_email: string | null;
  student_name: string | null;
  risk_score: number | null;
  ai_confidence: number | null;
  decision: string | null;
  decision_reason: string | null;
}

const STATUS_ICON: Record<string, { icon: string; label: string; color: string }> = {
  awaiting_payment: { icon: "⚪", label: "Awaiting payment", color: "text-muted-foreground" },
  under_review: { icon: "🟡", label: "Under review", color: "text-amber-600 dark:text-amber-400" },
  manual_review: { icon: "🟡", label: "Manual review", color: "text-amber-600 dark:text-amber-400" },
  auto_approved: { icon: "🟢", label: "Auto approved", color: "text-emerald-600 dark:text-emerald-400" },
  admin_approved: { icon: "🟢", label: "Admin approved", color: "text-emerald-600 dark:text-emerald-400" },
  rejected: { icon: "🔴", label: "Rejected", color: "text-red-600 dark:text-red-400" },
  expired: { icon: "⚫", label: "Expired", color: "text-muted-foreground" },
};

const STATUS_FILTERS = ["all", "manual_review", "auto_approved", "admin_approved", "rejected", "awaiting_payment"] as const;
const PENDING_STATUSES = new Set(["manual_review", "under_review"]);

/**
 * Triage order for the queue: orders actually needing admin action surface
 * above resolved ones, attempts-exhausted (locked_for_admin_only) orders
 * are the most urgent within that group, then highest fraud risk first —
 * fraud-risk-first-then-oldest, but scoped so an old low-risk resolved
 * order never buries a fresh high-risk pending one and vice versa.
 */
function queueSort(a: OrderRow, b: OrderRow): number {
  const aPending = PENDING_STATUSES.has(a.status);
  const bPending = PENDING_STATUSES.has(b.status);
  if (aPending !== bPending) return aPending ? -1 : 1;
  if (a.locked_for_admin_only !== b.locked_for_admin_only) return a.locked_for_admin_only ? -1 : 1;
  const riskDiff = (b.risk_score ?? -1) - (a.risk_score ?? -1);
  if (riskDiff !== 0) return riskDiff;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function AdminPaymentsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState({ autoApprovedToday: 0, manualReviewPending: 0, rejectedToday: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const { data: orderRows } = await supabase
      .from("d17_orders")
      .select("id, user_id, plan_code, amount_tnd, currency, status, attempts_used, created_at, locked_for_admin_only")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!orderRows || orderRows.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const orderIds = orderRows.map((o) => o.id);
    const userIds = [...new Set(orderRows.map((o) => o.user_id))];

    const [{ data: attempts }, { data: profiles }] = await Promise.all([
      supabase
        .from("d17_verification_attempts")
        .select("order_id, risk_score, ai_confidence, decision, decision_reason, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email").in("id", userIds),
    ]);

    const latestAttemptByOrder = new Map<string, NonNullable<typeof attempts>[number]>();
    for (const a of attempts ?? []) {
      if (!latestAttemptByOrder.has(a.order_id)) latestAttemptByOrder.set(a.order_id, a);
    }
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    setOrders(
      orderRows.map((o) => {
        const latest = latestAttemptByOrder.get(o.id);
        const profile = profileById.get(o.user_id);
        return {
          ...o,
          student_email: profile?.email ?? null,
          student_name: profile?.full_name ?? null,
          risk_score: latest?.risk_score ?? null,
          ai_confidence: latest?.ai_confidence ?? null,
          decision: latest?.decision ?? null,
          decision_reason: latest?.decision_reason ?? null,
        };
      }),
    );
    setLoading(false);
  }, []);

  const loadStats = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [{ count: approved }, { count: pending }, { count: rejected }] = await Promise.all([
      supabase.from("d17_orders").select("id", { count: "exact", head: true }).in("status", ["auto_approved", "admin_approved"]).gte("resolved_at", todayStart.toISOString()),
      supabase.from("d17_orders").select("id", { count: "exact", head: true }).eq("status", "manual_review"),
      supabase.from("d17_orders").select("id", { count: "exact", head: true }).eq("status", "rejected").gte("resolved_at", todayStart.toISOString()),
    ]);
    setStats({ autoApprovedToday: approved ?? 0, manualReviewPending: pending ?? 0, rejectedToday: rejected ?? 0 });
  }, []);

  useEffect(() => {
    load();
    loadStats();
  }, [load, loadStats]);

  const filtered = orders
    .filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return o.student_email?.toLowerCase().includes(q) || o.student_name?.toLowerCase().includes(q) || o.id.includes(q);
      }
      return true;
    })
    .sort(queueSort);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div>
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
            <DollarSign className="h-5 w-5 text-amber-500" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground">Payments — D17 Verification Queue</h1>
        </div>
        <p className="ml-12 text-sm text-muted-foreground">Review and act on D17/bank-transfer payment verification attempts.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Auto/admin approved today", value: stats.autoApprovedToday, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Pending manual review", value: stats.manualReviewPending, icon: Clock, color: "text-amber-500 bg-amber-500/10" },
          { label: "Rejected today", value: stats.rejectedToday, icon: XCircle, color: "text-red-500 bg-red-500/10" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color.split(" ")[1]}`}>
                <Icon className={`h-4 w-4 ${color.split(" ")[0]}`} />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student email, name, or order ID…"
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {f === "all" ? "All" : STATUS_ICON[f]?.label ?? f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Status", "Student", "Plan", "Amount", "Risk", "AI Confidence", "Recommendation", "Created"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No orders match.</td></tr>
              ) : (
                filtered.map((o) => {
                  const s = STATUS_ICON[o.status] ?? { icon: "⚪", label: o.status, color: "text-muted-foreground" };
                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link to="/admin/d17/$orderId" params={{ orderId: o.id }} className="flex items-center gap-1.5 font-medium">
                          <span>{s.icon}</span>
                          <span className={s.color}>{s.label}</span>
                          {o.locked_for_admin_only && (
                            <span title="Upload attempts exhausted — locked pending admin review" className="text-xs">🔒</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-foreground">{o.student_name ?? "—"}</span>
                        <span className="text-muted-foreground"> · {o.student_email}</span>
                      </td>
                      <td className="px-5 py-3.5 capitalize text-foreground">{o.plan_code}</td>
                      <td className="px-5 py-3.5 text-foreground">{o.amount_tnd} {o.currency}</td>
                      <td className="px-5 py-3.5 text-foreground">{o.risk_score ?? "—"}</td>
                      <td className="px-5 py-3.5 text-foreground">{o.ai_confidence ?? "—"}%</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-xs truncate" title={o.decision_reason ?? ""}>
                        {o.decision_reason ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
