import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminApproveOrder, adminRejectOrder, adminAdjustGrant, adminClearSuspension, adminReplayVerification, adminAddNote } from "@/lib/d17/admin-actions.functions";
import { ADMIN_ACTIONABLE_STATUSES } from "@/lib/d17/status";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Image as ImageIcon, ShieldAlert, Sliders, ShieldBan, Unlock, RefreshCw, StickyNote,
  ZoomIn, ZoomOut, RotateCw, Maximize2, X, Download,
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
  storage_path_2: string;
  user_entered_reference: string;
  normalized_identifier: string | null;
  screenshot_type: string | null;
  screenshot_type_2: string | null;
  confidence_authorization_number: number | null;
  confidence_amount: number | null;
  confidence_currency: number | null;
  confidence_destination: number | null;
  confidence_payment_datetime: number | null;
  ocr_raw_text: string | null;
  ocr_confidence: number | null;
  ocr_amount: number | null;
  ocr_currency: string | null;
  ocr_payment_datetime: string | null;
  ocr_reference: string | null;
  ocr_authorization_number: string | null;
  ocr_authorization_number_2: string | null;
  ocr_amount_2: number | null;
  ocr_currency_2: string | null;
  ocr_payment_datetime_2: string | null;
  ocr_destination_2: string | null;
  ocr_destination_number: string | null;
  ocr_destination_iban: string | null;
  ocr_transaction_id: string | null;
  cross_check_consistent: boolean | null;
  cross_check_summary: { consistent: boolean; notes: string } | null;
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

interface FraudSuspension {
  confirmed_duplicate_count: number;
  suspended_until: string | null;
  account_locked: boolean;
  updated_at: string;
}

function confidenceColor(v: number | null): string {
  if (v === null) return "text-muted-foreground";
  if (v >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (v >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function ScreenshotTypeBadge({ detected, expected }: { detected: string | null; expected: string }) {
  const ok = detected === expected;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ok ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-red-500/15 text-red-700 dark:text-red-400"}`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {detected ? detected.replace(/_/g, " ") : "unknown"}
    </span>
  );
}

function AdminD17OrderDetail() {
  const { orderId } = useParams({ from: "/_authenticated/admin/d17/$orderId" });
  const [order, setOrder] = useState<Order | null>(null);
  const [student, setStudent] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [suspension, setSuspension] = useState<FraudSuspension | null>(null);
  const [imageUrl1, setImageUrl1] = useState<string | null>(null);
  const [imageUrl2, setImageUrl2] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [adjustMinutes, setAdjustMinutes] = useState("");
  const [adjustCredits, setAdjustCredits] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [standaloneNote, setStandaloneNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: o } = await supabase.from("d17_orders").select("*").eq("id", orderId).maybeSingle();
    if (!o) {
      setOrder(null);
      setLoading(false);
      return;
    }
    setOrder(o);

    const [{ data: p }, { data: a }, { data: ac }, { data: susp }] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", o.user_id).maybeSingle(),
      supabase.from("d17_verification_attempts").select("*").eq("order_id", orderId).order("attempt_number", { ascending: false }),
      supabase.from("d17_admin_actions").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
      supabase.from("d17_fraud_suspensions").select("confirmed_duplicate_count, suspended_until, account_locked, updated_at").eq("user_id", o.user_id).maybeSingle(),
    ]);
    setStudent(p ?? null);
    setAttempts((a ?? []) as unknown as Attempt[]);
    setActions(ac ?? []);
    setSuspension((susp as FraudSuspension | null) ?? null);

    // Both screenshots — the previous version of this page only ever signed
    // and displayed Screenshot 1, which meant an admin reviewing a
    // two-screenshot submission could never actually see the Journal D17
    // evidence (Screenshot 2) through this UI at all.
    if (a && a.length > 0) {
      const path1: string | null = a[0].storage_path;
      const path2: string | null = a[0].storage_path_2;
      const [signed1, signed2] = await Promise.all([
        path1 ? supabase.storage.from("payment-screenshots").createSignedUrl(path1, 3600) : Promise.resolve({ data: null }),
        path2 ? supabase.storage.from("payment-screenshots").createSignedUrl(path2, 3600) : Promise.resolve({ data: null }),
      ]);
      setImageUrl1(signed1.data?.signedUrl ?? null);
      setImageUrl2(signed2.data?.signedUrl ?? null);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  function openLightbox(url: string | null, label: string) {
    if (!url) return;
    setZoom(1);
    setRotation(0);
    setLightbox({ url, label });
  }

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

  async function handleClearSuspension() {
    if (!order) return;
    setBusy(true);
    try {
      await adminClearSuspension({ data: { user_id: order.user_id, order_id: orderId } });
      toast.success("Suspension cleared.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear suspension.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddNote() {
    if (!standaloneNote.trim()) {
      toast.error("Note cannot be empty.");
      return;
    }
    setBusy(true);
    try {
      await adminAddNote({ data: { order_id: orderId, note: standaloneNote.trim() } });
      toast.success("Note added.");
      setStandaloneNote("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add note.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReplay() {
    setBusy(true);
    try {
      const result = await adminReplayVerification({ data: { order_id: orderId } });
      toast.success(`Replay complete — new decision: ${result.decision.replace(/_/g, " ")}.`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replay failed.");
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
  const canAct = (ADMIN_ACTIONABLE_STATUSES as readonly string[]).includes(order.status);
  const authMismatch = Boolean(
    latest?.ocr_authorization_number &&
    latest.user_entered_reference &&
    latest.ocr_authorization_number.trim().toLowerCase().replace(/[\s-]/g, "") !== latest.user_entered_reference.trim().toLowerCase().replace(/[\s-]/g, ""),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <Link to="/admin/payments" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to queue
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground">Order {order.id}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {student?.full_name ?? "—"} · {student?.email ?? "—"} · <span className="capitalize">{order.plan_code}</span> · {order.amount_tnd} {order.currency}
          </p>
          {order.manual_review_deadline && (
            <p className="mt-1 text-xs text-muted-foreground">
              Review deadline: {new Date(order.manual_review_deadline).toLocaleString()}
            </p>
          )}
        </div>
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold capitalize text-foreground">{order.status.replace(/_/g, " ")}</span>
      </div>

      {suspension && (suspension.account_locked || (suspension.suspended_until && new Date(suspension.suspended_until).getTime() > Date.now()) || suspension.confirmed_duplicate_count > 0) && (
        <div className={`rounded-2xl border p-5 ${suspension.account_locked ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
          <p className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${suspension.account_locked ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
            <ShieldBan className="h-3.5 w-3.5" /> Fraud / suspension status
          </p>
          <div className="space-y-1 text-sm text-foreground">
            <p>Confirmed duplicate submissions: <span className="font-bold">{suspension.confirmed_duplicate_count}</span></p>
            {suspension.account_locked ? (
              <p className="font-semibold text-red-700 dark:text-red-400">Account is LOCKED pending admin review.</p>
            ) : suspension.suspended_until && new Date(suspension.suspended_until).getTime() > Date.now() ? (
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                New submissions suspended until {new Date(suspension.suspended_until).toLocaleString()}.
              </p>
            ) : (
              <p className="text-muted-foreground">No active suspension.</p>
            )}
          </div>
          {(suspension.account_locked || (suspension.suspended_until && new Date(suspension.suspended_until).getTime() > Date.now())) && (
            <button
              onClick={handleClearSuspension}
              disabled={busy}
              className="mt-3 flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background hover:opacity-90 disabled:opacity-50"
            >
              <Unlock className="h-4 w-4" /> Clear suspension
            </button>
          )}
        </div>
      )}

      {latest && (
        <>
          {/* Both screenshots, side by side, with a zoom/rotate/fullscreen viewer */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5" /> Screenshot 1 — Payment Success
                </p>
                <ScreenshotTypeBadge detected={latest.screenshot_type} expected="payment_success" />
              </div>
              {imageUrl1 ? (
                <button onClick={() => openLightbox(imageUrl1, "Screenshot 1 — Payment Success")} className="block w-full">
                  <img src={imageUrl1} alt="Payment success screenshot" className="w-full rounded-xl border border-border transition-opacity hover:opacity-90" />
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">No image.</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5" /> Screenshot 2 — Journal D17
                </p>
                <ScreenshotTypeBadge detected={latest.screenshot_type_2} expected="journal" />
              </div>
              {imageUrl2 ? (
                <button onClick={() => openLightbox(imageUrl2, "Screenshot 2 — Journal D17")} className="block w-full">
                  <img src={imageUrl2} alt="Journal D17 screenshot" className="w-full rounded-xl border border-border transition-opacity hover:opacity-90" />
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">No image.</p>
              )}
            </div>
          </div>

          {/* Authorization number — the single most important field — with an
              explicit, unmissable OCR-vs-student-entered comparison. */}
          <div className={`rounded-2xl border p-5 ${authMismatch ? "border-red-500/40 bg-red-500/5" : "border-border bg-card"}`}>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Authorization Number</p>
            {authMismatch && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Mismatch between OCR and student-entered value
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailRow label="OCR (Screenshot 1)" value={latest.ocr_authorization_number ?? "not detected"} />
              <DetailRow label="OCR (Screenshot 2)" value={latest.ocr_authorization_number_2 ?? "not detected"} />
              <DetailRow label="Student entered" value={latest.user_entered_reference} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              Field confidence:
              <span className={`font-bold ${confidenceColor(latest.confidence_authorization_number)}`}>
                {latest.confidence_authorization_number !== null ? `${latest.confidence_authorization_number}%` : "—"}
              </span>
            </div>
          </div>

          {/* Cross-screenshot field comparison + per-field confidence */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cross-screenshot comparison</p>
            {latest.cross_check_summary && (
              <p className={`mb-3 text-sm ${latest.cross_check_consistent === false ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                {latest.cross_check_consistent === false ? "⚠ " : "✓ "}
                {latest.cross_check_summary.notes || (latest.cross_check_consistent ? "Consistent." : "Inconsistent.")}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-4">Field</th>
                    <th className="py-1.5 pr-4">Screenshot 1</th>
                    <th className="py-1.5 pr-4">Screenshot 2</th>
                    <th className="py-1.5">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="py-1.5 pr-4 text-muted-foreground">Amount</td>
                    <td className="py-1.5 pr-4 font-medium text-foreground">{latest.ocr_amount ?? "—"} {latest.ocr_currency ?? ""}</td>
                    <td className="py-1.5 pr-4 font-medium text-foreground">{latest.ocr_amount_2 ?? "—"} {latest.ocr_currency_2 ?? ""}</td>
                    <td className={`py-1.5 font-bold ${confidenceColor(latest.confidence_amount)}`}>{latest.confidence_amount !== null ? `${latest.confidence_amount}%` : "—"}</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="py-1.5 pr-4 text-muted-foreground">Currency</td>
                    <td className="py-1.5 pr-4 font-medium text-foreground">{latest.ocr_currency ?? "—"}</td>
                    <td className="py-1.5 pr-4 font-medium text-foreground">{latest.ocr_currency_2 ?? "—"}</td>
                    <td className={`py-1.5 font-bold ${confidenceColor(latest.confidence_currency)}`}>{latest.confidence_currency !== null ? `${latest.confidence_currency}%` : "—"}</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="py-1.5 pr-4 text-muted-foreground">Date / time</td>
                    <td className="py-1.5 pr-4 font-medium text-foreground">{latest.ocr_payment_datetime ? new Date(latest.ocr_payment_datetime).toLocaleString() : "—"}</td>
                    <td className="py-1.5 pr-4 font-medium text-foreground">{latest.ocr_payment_datetime_2 ? new Date(latest.ocr_payment_datetime_2).toLocaleString() : "—"}</td>
                    <td className={`py-1.5 font-bold ${confidenceColor(latest.confidence_payment_datetime)}`}>{latest.confidence_payment_datetime !== null ? `${latest.confidence_payment_datetime}%` : "—"}</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="py-1.5 pr-4 text-muted-foreground">Destination</td>
                    <td className="py-1.5 pr-4 font-medium text-foreground">{latest.ocr_destination_number ?? latest.ocr_destination_iban ?? "—"}</td>
                    <td className="py-1.5 pr-4 font-medium text-foreground">{latest.ocr_destination_2 ?? "—"}</td>
                    <td className={`py-1.5 font-bold ${confidenceColor(latest.confidence_destination)}`}>{latest.confidence_destination !== null ? `${latest.confidence_destination}%` : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Latest attempt (#{latest.attempt_number})</p>
              <DetailRow label="Notification source" value={latest.ocr_notification_source ?? "—"} />
              <DetailRow label="Language" value={latest.ocr_language_detected ?? "—"} />
              <DetailRow label="Overall risk score" value={String(latest.risk_score)} />
              <DetailRow label="AI confidence" value={`${latest.ai_confidence}%`} />
              <DetailRow label="Overall OCR confidence" value={latest.ocr_confidence !== null ? `${latest.ocr_confidence}%` : "—"} />
              <DetailRow label="Fraud score" value={latest.fraud_score !== null ? String(latest.fraud_score) : "—"} />
              <DetailRow label="Fraud flags" value={latest.fraud_flags?.length ? latest.fraud_flags.join(", ") : "none"} />
              <DetailRow label="Screenshot integrity" value={latest.screenshot_integrity_ok === null ? "—" : latest.screenshot_integrity_ok ? "OK" : "flagged"} />
              <DetailRow label="Decision" value={latest.decision.replace(/_/g, " ")} />
              <DetailRow label="Reason" value={latest.decision_reason} />
              <DetailRow label="AI / OCR version" value={`${latest.ai_version} / ${latest.ocr_version}`} />
              <DetailRow label="Duration" value={latest.verification_duration_ms ? `${latest.verification_duration_ms} ms` : "—"} />
              <DetailRow label="Gemini tokens" value={latest.gemini_token_count !== null ? String(latest.gemini_token_count) : "0 (skipped)"} />
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">OCR text (Screenshot 1)</p>
              <p className="whitespace-pre-wrap text-xs text-foreground">{latest.ocr_raw_text || "—"}</p>
            </div>
          </div>
        </>
      )}

      {latest?.rule_engine_result?.checks && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Risk score breakdown</p>
            <p className="text-xs text-muted-foreground">
              Total: <span className="font-bold text-foreground">{latest.risk_score}</span> pts
              {latest.rule_engine_result.hardGate && (
                <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:text-red-400">
                  hard gate: {String(latest.rule_engine_result.hardGate).replace(/_/g, " ")}
                </span>
              )}
            </p>
          </div>
          <div className="space-y-2">
            {latest.rule_engine_result.checks.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  {c.result === "pass" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : c.result === "fail" ? <XCircle className="h-4 w-4 text-red-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  <span className="font-medium text-foreground">{c.label}</span>
                </span>
                <span className="text-xs text-muted-foreground">{c.detail} ({c.points >= 0 ? "+" : ""}{c.points} pts)</span>
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
            {attempts.length > 0 && (
              <button
                onClick={handleReplay}
                disabled={busy}
                title="Re-runs OCR + AI on the already-uploaded screenshots — the student never re-uploads."
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" /> Replay verification
              </button>
            )}
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

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <StickyNote className="h-3.5 w-3.5" /> Add a review note
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            value={standaloneNote}
            onChange={(e) => setStandaloneNote(e.target.value)}
            placeholder="Annotate this order — e.g. contacted the student, awaiting a reply…"
            className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            rows={2}
          />
          <button
            onClick={handleAddNote}
            disabled={busy || !standaloneNote.trim()}
            className="shrink-0 self-end rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-50"
          >
            Add note
          </button>
        </div>
      </div>

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

      {/* Lightweight zoom/rotate/fullscreen image viewer */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm font-semibold text-white">{lightbox.label}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20" title="Zoom in">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))} className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20" title="Zoom out">
                <ZoomOut className="h-4 w-4" />
              </button>
              <button onClick={() => setRotation((r) => (r + 90) % 360)} className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20" title="Rotate">
                <RotateCw className="h-4 w-4" />
              </button>
              <a href={lightbox.url} download target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20" title="Download original">
                <Download className="h-4 w-4" />
              </a>
              <a href={lightbox.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20" title="Open original resolution in new tab">
                <Maximize2 className="h-4 w-4" />
              </a>
              <button onClick={() => setLightbox(null)} className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20" title="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-6">
            <img
              src={lightbox.url}
              alt={lightbox.label}
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: "transform 150ms ease" }}
              className="max-h-full max-w-full rounded-lg"
            />
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
