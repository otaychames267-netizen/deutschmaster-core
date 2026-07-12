import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Download, TrendingUp, Users, BookOpen, CreditCard, ShieldAlert, Copy, Loader2, ScanSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getWeeklyReconciliation } from "@/lib/d17/reconciliation.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReportsPage,
});

const REPORTS = [
  {
    icon: Users,
    title: "User Growth Report",
    desc: "New registrations, active users, churn, and retention metrics by period.",
    color: "text-blue-500 bg-blue-500/10",
    badge: "Monthly",
  },
  {
    icon: CreditCard,
    title: "Revenue Report",
    desc: "Subscription revenue, plan distribution, upgrade/downgrade events.",
    color: "text-amber-500 bg-amber-500/10",
    badge: "Monthly",
  },
  {
    icon: BookOpen,
    title: "Learning Activity Report",
    desc: "Exercise completions, session durations, section popularity, pass rates.",
    color: "text-violet-500 bg-violet-500/10",
    badge: "Weekly",
  },
  {
    icon: TrendingUp,
    title: "Performance Report",
    desc: "Average scores, improvement trends, level distribution by user cohort.",
    color: "text-emerald-500 bg-emerald-500/10",
    badge: "Monthly",
  },
];

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  return lines.join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function D17ReportCard() {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    autoApproved: 0, manualReview: 0, rejected: 0, duplicateAttempts: 0, fraudAttempts: 0,
    avgVerificationMs: 0, approvalRate: 0, rejectionRate: 0,
    crossCheckInconsistentCount: 0, crossCheckInconsistentRate: 0,
    activeSuspensions: 0, lockedAccounts: 0,
  });
  const [rows, setRows] = useState<Record<string, string | number>[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const fromIso = new Date(`${from}T00:00:00`).toISOString();
    const toIso = new Date(`${to}T23:59:59`).toISOString();

    const [{ data: orders }, { data: attempts }, { data: suspensions }] = await Promise.all([
      supabase.from("d17_orders").select("id, status").gte("created_at", fromIso).lte("created_at", toIso),
      supabase
        .from("d17_verification_attempts")
        .select("id, decision, verification_duration_ms, risk_score, ai_confidence, created_at, cross_check_consistent")
        .gte("created_at", fromIso)
        .lte("created_at", toIso),
      // Current suspension state is a live snapshot, not date-ranged — an
      // account either is or isn't suspended/locked right now.
      supabase.from("d17_fraud_suspensions").select("account_locked, suspended_until"),
    ]);

    const approved = (orders ?? []).filter((o) => o.status === "auto_approved" || o.status === "admin_approved").length;
    const manualReview = (orders ?? []).filter((o) => o.status === "manual_review" || o.status === "under_review").length;
    const rejected = (orders ?? []).filter((o) => o.status === "rejected").length;
    const duplicateAttempts = (attempts ?? []).filter((a) => a.decision === "auto_rejected_duplicate").length;
    const fraudAttempts = (attempts ?? []).filter((a) => a.decision === "auto_rejected_fraud").length;
    const durations = (attempts ?? []).map((a) => a.verification_duration_ms).filter((d): d is number => typeof d === "number");
    const avgVerificationMs = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0;
    const resolved = approved + rejected;
    const approvalRate = resolved ? Math.round((approved / resolved) * 100) : 0;
    const rejectionRate = resolved ? Math.round((rejected / resolved) * 100) : 0;

    // Only attempts that got far enough to run the two-screenshot cross-check
    // (i.e. cross_check_consistent is not null — duplicate/kill-switch/
    // budget/Gemini-error short-circuits never populate it) count toward
    // the denominator, so the rate reflects genuine inconsistency, not
    // attempts that never reached that stage.
    const crossCheckable = (attempts ?? []).filter((a) => a.cross_check_consistent !== null);
    const crossCheckInconsistentCount = crossCheckable.filter((a) => a.cross_check_consistent === false).length;
    const crossCheckInconsistentRate = crossCheckable.length ? Math.round((crossCheckInconsistentCount / crossCheckable.length) * 100) : 0;

    const now = Date.now();
    const lockedAccounts = (suspensions ?? []).filter((s) => s.account_locked).length;
    const activeSuspensions = (suspensions ?? []).filter((s) => !s.account_locked && s.suspended_until && new Date(s.suspended_until).getTime() > now).length;

    setStats({
      autoApproved: approved, manualReview, rejected, duplicateAttempts, fraudAttempts, avgVerificationMs, approvalRate, rejectionRate,
      crossCheckInconsistentCount, crossCheckInconsistentRate, activeSuspensions, lockedAccounts,
    });
    setRows(
      (attempts ?? []).map((a) => ({
        id: a.id, decision: a.decision, risk_score: a.risk_score ?? "", ai_confidence: a.ai_confidence ?? "",
        verification_duration_ms: a.verification_duration_ms ?? "",
        cross_check_consistent: a.cross_check_consistent === null ? "" : String(a.cross_check_consistent),
        created_at: a.created_at,
      })),
    );
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <ShieldAlert className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground">D17 Verification Report</p>
            <p className="text-xs text-muted-foreground">Auto/manual/rejected breakdown, fraud &amp; duplicate attempts, verification speed.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs" />
          <span className="text-xs text-muted-foreground">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Auto/admin approved", value: stats.autoApproved },
              { label: "Manual review", value: stats.manualReview },
              { label: "Rejected", value: stats.rejected },
              { label: "Duplicate attempts", value: stats.duplicateAttempts },
              { label: "Fraud attempts", value: stats.fraudAttempts },
              { label: "Avg. verification time", value: `${stats.avgVerificationMs} ms` },
              { label: "Approval rate", value: `${stats.approvalRate}%` },
              { label: "Rejection rate", value: `${stats.rejectionRate}%` },
              { label: "Cross-screenshot inconsistent", value: `${stats.crossCheckInconsistentCount} (${stats.crossCheckInconsistentRate}%)` },
              { label: "Currently suspended", value: stats.activeSuspensions },
              { label: "Currently locked", value: stats.lockedAccounts },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-black text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => downloadCsv(`d17-verification-report-${from}-to-${to}.csv`, toCsv(rows))}
            disabled={rows.length === 0}
            className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Download CSV ({rows.length} attempts)
          </button>
        </>
      )}
    </div>
  );
}

interface ReconciliationResult {
  missingSubscription: { id: string; user_id: string; plan_code: string; amount_tnd: number }[];
  mismatched: { id: string; user_id: string; plan_code: string }[];
  checkedAt: string;
}

function D17ReconciliationCard() {
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const r = await getWeeklyReconciliation();
      setResult(r);
      const issues = r.missingSubscription.length + r.mismatched.length;
      if (issues === 0) toast.success("No reconciliation issues found.");
      else toast.warning(`${issues} reconciliation issue(s) found.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reconciliation check failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
            <ScanSearch className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground">D17 Reconciliation</p>
            <p className="text-xs text-muted-foreground">
              Internal-consistency check only — flags approved orders with a missing or mismatched subscription.
              No bank-statement feed exists in this app to reconcile against real deposits.
            </p>
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />} Run check
        </button>
      </div>

      {result && (
        <div className="space-y-2 text-xs">
          <p className="text-muted-foreground">Checked at {new Date(result.checkedAt).toLocaleString()}</p>
          {result.missingSubscription.length === 0 && result.mismatched.length === 0 ? (
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">No issues found.</p>
          ) : (
            <>
              {result.missingSubscription.map((o) => (
                <div key={o.id} className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-red-700 dark:text-red-400">
                  Order {o.id} is approved but has no linked subscription ({o.plan_code}, {o.amount_tnd} TND).
                </div>
              ))}
              {result.mismatched.map((o) => (
                <div key={o.id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-amber-700 dark:text-amber-400">
                  Order {o.id}'s subscription doesn't match its plan ({o.plan_code}).
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AdminReportsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
            <ClipboardList className="h-5 w-5 text-amber-500" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground">Reports</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">Download detailed reports about platform performance.</p>
      </div>

      <D17ReportCard />
      <D17ReconciliationCard />

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <div key={r.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.color.split(" ")[1]}`}>
                <r.icon className={`h-5 w-5 ${r.color.split(" ")[0]}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{r.title}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    {r.badge}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
              </div>
            </div>
            <button
              onClick={() => {}}
              disabled
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 py-2 text-xs font-semibold text-muted-foreground cursor-not-allowed"
              title="Available when Stripe + full analytics are connected"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV — coming soon
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Full report exports will be available once Stripe and the analytics pipeline are connected.
          Reports will be downloadable as CSV and PDF.
        </p>
      </div>
    </div>
  );
}
