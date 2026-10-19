import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getD17ReconciliationList, adminMarkReconciled } from "@/lib/d17/reconciliation.functions";
import { adminRejectOrder } from "@/lib/d17/admin-actions.functions";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, ShieldCheck,
  Calendar, RefreshCw, ExternalLink, Coins, ListChecks,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reconciliation")({
  component: ReconciliationPage,
});

interface Row {
  orderId: string;
  userId: string;
  studentName: string | null;
  studentEmail: string | null;
  planCode: string;
  amountTnd: number;
  currency: string;
  status: string;
  subscriptionId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  authorizationNumber: string | null;
  enteredReference: string | null;
  ocrAmount: number | null;
  paymentDatetime: string | null;
  approvedAutomatically: boolean;
  reconciledAt: string | null;
}

interface Report {
  from: string;
  to: string;
  rows: Row[];
  summary: { count: number; reconciled: number; pending: number; totalTnd: number };
}

function todayISODate() {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}-${String(n.getUTCDate()).padStart(2, "0")}`;
}

const normalizeNum = (s: string) => s.replace(/[\s-]/g, "").toLowerCase();

function ReconciliationPage() {
  const [date, setDate] = useState(todayISODate());
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [receivedAuths, setReceivedAuths] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(`${date}T00:00:00.000Z`).toISOString();
      const res = await getD17ReconciliationList({ data: { from } });
      setReport(res as Report);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load reconciliation list.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // Optional semi-automatic matching: paste any authorization numbers you can
  // read on your side (e.g. from the general Historique) — rows whose auth
  // number is NOT in that set are highlighted as candidates to revoke.
  const receivedSet = useMemo(() => {
    const nums = receivedAuths.split(/[^0-9A-Za-z]+/).map(normalizeNum).filter((s) => s.length >= 4);
    return new Set(nums);
  }, [receivedAuths]);
  const hasReceivedInput = receivedSet.size > 0;

  async function handleMarkReconciled(orderId: string) {
    setBusyOrder(orderId);
    try {
      await adminMarkReconciled({ data: { order_id: orderId } });
      toast.success("Marked as reconciled.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark reconciled.");
    } finally {
      setBusyOrder(null);
    }
  }

  async function handleRevoke(orderId: string) {
    if (!revokeReason.trim()) {
      toast.error("A reason is required to revoke.");
      return;
    }
    setBusyOrder(orderId);
    try {
      await adminRejectOrder({ data: { order_id: orderId, note: `Reconciliation revoke: ${revokeReason.trim()}` } });
      toast.success("Subscription revoked and student notified.");
      setRevoking(null);
      setRevokeReason("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke failed.");
    } finally {
      setBusyOrder(null);
    }
  }

  const s = report?.summary;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <Link to="/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to admin
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Daily Payment Reconciliation</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every <strong>approved</strong> D17 order for the chosen day. Compare each against your real D17 app,
            then mark it reconciled — or revoke any that has no matching real payment. D17 has no received-payments
            feed, so this is a manual check; nothing here is automatic.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={date}
              max={todayISODate()}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm text-foreground outline-none"
            />
          </div>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      {s && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Approved this day", value: s.count, icon: ListChecks, color: "text-blue-500 bg-blue-500/10" },
            { label: "Reconciled", value: s.reconciled, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
            { label: "Pending check", value: s.pending, icon: ShieldCheck, color: "text-amber-500 bg-amber-500/10" },
            { label: "Total (TND)", value: s.totalTnd, icon: Coins, color: "text-violet-500 bg-violet-500/10" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
              <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${c.color.split(" ")[1]}`}>
                <c.icon className={`h-4 w-4 ${c.color.split(" ")[0]}`} />
              </div>
              <p className="text-2xl font-black text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Optional semi-automatic matching */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Optional: paste received authorization numbers</p>
        <p className="mb-2 text-xs text-muted-foreground">
          If you can read any authorization numbers on your side (e.g. from the general Historique), paste them here —
          rows whose number is <strong>not</strong> in your list get flagged as candidates to revoke.
        </p>
        <textarea
          value={receivedAuths}
          onChange={(e) => setReceivedAuths(e.target.value)}
          placeholder="e.g. 984081, 771230, 553019 …"
          rows={2}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !report || report.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center text-sm text-muted-foreground">
          No approved D17 orders on this day.
        </div>
      ) : (
        <div className="space-y-3">
          {report.rows.map((r) => {
            const matched = hasReceivedInput && r.authorizationNumber ? receivedSet.has(normalizeNum(r.authorizationNumber)) : null;
            const flagged = hasReceivedInput && matched === false;
            return (
              <div
                key={r.orderId}
                className={`rounded-2xl border p-4 ${flagged ? "border-red-500/40 bg-red-500/5" : r.reconciledAt ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground">{r.studentName ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{r.studentEmail ?? "—"}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold capitalize text-foreground">{r.planCode}</span>
                      {r.approvedAutomatically
                        ? <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">auto-approved</span>
                        : <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">admin-approved</span>}
                      {r.reconciledAt && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ reconciled</span>}
                      {flagged && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">not in your list</span>}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                      <Field label="Auth №" value={r.authorizationNumber ?? "—"} strong />
                      <Field label="Amount" value={`${r.amountTnd} ${r.currency}`} />
                      <Field label="OCR amount" value={r.ocrAmount !== null ? String(r.ocrAmount) : "—"} />
                      <Field label="Payment time" value={r.paymentDatetime ? new Date(r.paymentDatetime).toLocaleString() : "—"} />
                      <Field label="Approved at" value={r.resolvedAt ? new Date(r.resolvedAt).toLocaleString() : "—"} />
                      <Field label="Order" value={r.orderId.slice(0, 8)} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Link to="/admin/d17/$orderId" params={{ orderId: r.orderId }} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                      Open order <ExternalLink className="h-3 w-3" />
                    </Link>
                    <div className="flex gap-2">
                      {!r.reconciledAt && (
                        <button onClick={() => handleMarkReconciled(r.orderId)} disabled={busyOrder === r.orderId} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Reconciled
                        </button>
                      )}
                      <button onClick={() => { setRevoking(revoking === r.orderId ? null : r.orderId); setRevokeReason(""); }} disabled={busyOrder === r.orderId} className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                        <XCircle className="h-3.5 w-3.5" /> Revoke
                      </button>
                    </div>
                  </div>
                </div>

                {revoking === r.orderId && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3 sm:flex-row">
                    <input
                      value={revokeReason}
                      onChange={(e) => setRevokeReason(e.target.value)}
                      placeholder="Reason (e.g. no matching D17 payment received)"
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <button onClick={() => handleRevoke(r.orderId)} disabled={busyOrder === r.orderId} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                      Confirm revoke
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className={strong ? "font-mono font-bold text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}
