import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminApproveOrder, adminRejectOrder, adminAdjustGrant } from "@/lib/d17/admin-actions.functions";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Image as ImageIcon, ShieldAlert, Sliders,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/d17/$orderId")({
  component: AdminD17OrderDetail,
});

interface Order {
  id: string;
  user_id: string;
  plan_code: string;
  amount_tnd: number;
  currency: string;
  status: string;
  attempts_used: number;
  manual_review_deadline: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

interface Attempt {
  id: string;
  attempt_number: number;
  storage_path: string;
  user_entered_reference: string;
  ocr_raw_text: string | null;
  ocr_confidence: number | null;
  ocr_amount: number | null;
  ocr_currency: string | null;
  ocr_payment_datetime: string | null;
  ocr_reference: string | null;
  ocr_notification_source: string | null;
  ocr_language_detected: string | null;
  fraud_score: number | null;
  fraud_flags: string[] | null;
  screenshot_integrity_ok: boolean | null;
  risk_score: number;
  ai_confidence: number;
  rule_engine_result: any;
  decision: string;
  decision_reason: string;
  ai_version: string;
  ocr_version: string;
  verification_duration_ms: number | null;
  gemini_token_count: number | null;
  created_at: string;
}

interface AdminAction {
  id: string;
  action: string;
  note: string | null;
  granted_minutes_override: number | null;
  granted_credits_override: number | null;
  created_at: string;
  admin_id: string;
}

const ACTIONABLE_STATUSES = ["manual_review", "under_review", "rejected", "auto_approved", "admin_approved"];

function AdminD17OrderDetail() {
  const { orderId } = useParams({ from: "/_authenticated/admin/d17/$orderId" });
  const [order, setOrder] = useState<Order | null>(null);
  const [student, setStudent] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [adjustMinutes, setAdjustMinutes] = useState("");
  const [adjustCredits, setAdjustCredits] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: o } = await supabase.from("d17_orders").select("*").eq("id", orderId).maybeSingle();
    if (!o) {
      setOrder(null);
      setLoading(false);
      return;
    }
    setOrder(o);

    const [{ data: p }, { data: a }, { data: ac }] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", o.user_id).maybeSingle(),
      supabase.from("d17_verification_attempts").select("*").eq("order_id", orderId).order("attempt_number", { ascending: false }),
      supabase.from("d17_admin_actions").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
    ]);
    setStudent(p ?? null);
    setAttempts((a ?? []) as unknown as Attempt[]);
    setActions(ac ?? []);

    if (a && a.length > 0) {
      const { data: signed } = await supabase.storage.from("payment-screenshots").createSignedUrl(a[0].storage_path, 3600);
      setImageUrl(signed?.signedUrl ?? null);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove() {
    setBusy(true);
    try {
      await adminApproveOrder({ data: { order_id: orderId } });
      toast.success("Order approved and subscription provisioned.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectNote.trim()) {
      toast.error("A rejection note is required.");
      return;
    }
    setBusy(true);
    try {
      await adminRejectOrder({ data: { order_id: orderId, note: rejectNote.trim() } });
      toast.success("Order rejected.");
      setShowReject(false);
      setRejectNote("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdjustGrant() {
    const minutes = adjustMinutes.trim() ? parseInt(adjustMinutes, 10) : undefined;
    const credits = adjustCredits.trim() ? parseInt(adjustCredits, 10) : undefined;
    if (minutes === undefined && credits === undefined) {
      toast.error("Enter minutes and/or credits to grant.");
      return;
    }
    setBusy(true);
    try {
      await adminAdjustGrant({ data: { order_id: orderId, minutes, credits, note: adjustNote.trim() || undefined } });
      toast.success("Grant adjusted.");
      setAdjustMinutes("");
      setAdjustCredits("");
      setAdjustNote("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Adjust grant failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-semibold text-foreground">Order not found</p>
        <Link to="/admin/payments" className="mt-3 inline-block text-sm text-primary hover:underline">Back to queue</Link>
      </div>
    );
  }

  const latest = attempts[0];
  const canAct = ACTIONABLE_STATUSES.includes(order.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <Link to="/admin/payments" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to queue
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground">Order {order.id}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {student?.full_name ?? "—"} · {student?.email ?? "—"} · <span className="capitalize">{order.plan_code}</span> · {order.amount_tnd} {order.currency}
          </p>
        </div>
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold capitalize text-foreground">{order.status.replace(/_/g, " ")}</span>
      </div>

      {latest && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Latest attempt (#{latest.attempt_number})</p>
            <DetailRow label="OCR Amount" value={latest.ocr_amount !== null ? `${latest.ocr_amount} ${latest.ocr_currency ?? ""}` : "—"} />
            <DetailRow label="OCR Payment time" value={latest.ocr_payment_datetime ? new Date(latest.ocr_payment_datetime).toLocaleString() : "—"} />
            <DetailRow label="OCR Reference" value={latest.ocr_reference ?? "not found"} />
            <DetailRow label="Entered reference" value={latest.user_entered_reference} />
            <DetailRow label="Notification source" value={latest.ocr_notification_source ?? "—"} />
            <DetailRow label="Language" value={latest.ocr_language_detected ?? "—"} />
            <DetailRow label="Risk score" value={String(latest.risk_score)} />
            <DetailRow label="AI confidence" value={`${latest.ai_confidence}%`} />
            <DetailRow label="OCR confidence" value={latest.ocr_confidence !== null ? `${latest.ocr_confidence}%` : "—"} />
            <DetailRow label="Fraud score" value={latest.fraud_score !== null ? String(latest.fraud_score) : "—"} />
            <DetailRow label="Fraud flags" value={latest.fraud_flags?.length ? latest.fraud_flags.join(", ") : "none"} />
            <DetailRow label="Screenshot integrity" value={latest.screenshot_integrity_ok === null ? "—" : latest.screenshot_integrity_ok ? "OK" : "flagged"} />
            <DetailRow label="Decision" value={latest.decision.replace(/_/g, " ")} />
            <DetailRow label="Reason" value={latest.decision_reason} />
            <DetailRow label="AI / OCR version" value={`${latest.ai_version} / ${latest.ocr_version}`} />
            <DetailRow label="Duration" value={latest.verification_duration_ms ? `${latest.verification_duration_ms} ms` : "—"} />
            <DetailRow label="Gemini tokens" value={latest.gemini_token_count !== null ? String(latest.gemini_token_count) : "0 (skipped)"} />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" /> Screenshot
              </p>
              {imageUrl ? (
                <img src={imageUrl} alt="Payment screenshot" className="w-full rounded-xl border border-border" />
              ) : (
                <p className="text-sm text-muted-foreground">No image.</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">OCR text</p>
              <p className="whitespace-pre-wrap text-xs text-foreground">{latest.ocr_raw_text || "—"}</p>
            </div>
          </div>
        </div>
      )}

      {latest?.rule_engine_result?.checks && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Rule engine breakdown</p>
          <div className="space-y-2">
            {latest.rule_engine_result.checks.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  {c.result === "pass" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : c.result === "fail" ? <XCircle className="h-4 w-4 text-red-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  <span className="font-medium text-foreground">{c.label}</span>
                </span>
                <span className="text-xs text-muted-foreground">{c.detail} ({c.points} pts)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {canAct && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Actions</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleApprove}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={() => setShowReject((s) => !s)}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
          </div>

          {showReject && (
            <div className="mt-3 space-y-2">
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Rejection reason (required, shown internally)…"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                rows={2}
              />
              <button
                onClick={handleReject}
                disabled={busy}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm reject
              </button>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              <Sliders className="h-3.5 w-3.5" /> Manually adjust grant
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="number"
                value={adjustMinutes}
                onChange={(e) => setAdjustMinutes(e.target.value)}
                placeholder="Minutes (optional)"
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              <input
                type="number"
                value={adjustCredits}
                onChange={(e) => setAdjustCredits(e.target.value)}
                placeholder="Credits (optional)"
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              <input
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Note (optional)"
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <button
              onClick={handleAdjustGrant}
              disabled={busy}
              className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              <ShieldAlert className="h-4 w-4" /> Apply grant
            </button>
          </div>
        </div>
      )}

      {attempts.length > 1 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Attempt history</p>
          <div className="space-y-2">
            {attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-sm">
                <span>Attempt #{a.attempt_number} — {a.decision.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Admin action log</p>
          <div className="space-y-2">
            {actions.map((a) => (
              <div key={a.id} className="rounded-xl border border-border px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize text-foreground">{a.action.replace(/_/g, " ")}</span>
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                {a.note && <p className="mt-1 text-xs text-muted-foreground">{a.note}</p>}
                {(a.granted_minutes_override !== null || a.granted_credits_override !== null) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.granted_minutes_override !== null && `${a.granted_minutes_override} minutes `}
                    {a.granted_credits_override !== null && `${a.granted_credits_override} credits`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
