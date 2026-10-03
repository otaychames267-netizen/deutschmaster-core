import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  adminListManualPaymentOrders, adminApproveManualPaymentOrder, adminRejectManualPaymentOrder,
  type ManualPaymentOrderAdminRow,
} from "@/lib/payment/manual-orders.functions";
import { CheckCircle2, XCircle, Clock, Loader2, Landmark, Wallet, Smartphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/manual-payments")({
  component: ManualPaymentsAdminPage,
});

const PLAN_LABEL: Record<string, string> = { schriftlich: "Schriftlich", muendlich: "Mündlich", komplett: "Komplett" };
const STATUS_TABS = [
  { key: "pending_verification", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
] as const;

function ManualPaymentsAdminPage() {
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["key"]>("pending_verification");
  const [orders, setOrders] = useState<ManualPaymentOrderAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const rows = await adminListManualPaymentOrders({ data: { status: tab } });
      setOrders(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await adminApproveManualPaymentOrder({ data: { order_id: id } });
      toast.success("Approved — subscription activated.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Reason for rejection (optional):") ?? "";
    setBusyId(id);
    try {
      await adminRejectManualPaymentOrder({ data: { order_id: id, reason } });
      toast.success("Order rejected.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rejection failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-black text-foreground">Manual Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">D17, Virement Postal & Virement Bancaire — review and activate.</p>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              tab === t.key ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">No orders here.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    {o.method === "d17" ? <Smartphone className="h-4.5 w-4.5 text-primary" /> : o.method === "postal" ? <Landmark className="h-4.5 w-4.5 text-primary" /> : <Wallet className="h-4.5 w-4.5 text-primary" />}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{o.full_name ?? o.email ?? o.user_id}</p>
                    <p className="text-xs text-muted-foreground">{o.email}</p>
                    <p className="mt-1 text-sm text-foreground">
                      {PLAN_LABEL[o.plan_code] ?? o.plan_code} · <span className="font-bold">{Number(o.amount_tnd).toFixed(0)} TND</span> ·{" "}
                      <span className="capitalize">{o.method === "d17" ? "D17" : o.method === "postal" ? "Virement Postal" : "Virement Bancaire"}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                    {o.rejection_reason && <p className="mt-1 text-xs text-rose-500">Reason: {o.rejection_reason}</p>}
                  </div>
                </div>

                {o.status === "pending_verification" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(o.id)}
                      disabled={busyId === o.id}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                    </button>
                    <button
                      onClick={() => reject(o.id)}
                      disabled={busyId === o.id}
                      className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-muted disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                ) : (
                  <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    o.status === "approved" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  }`}>
                    {o.status === "approved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />} {o.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
