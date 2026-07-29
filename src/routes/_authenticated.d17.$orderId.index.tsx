import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getD17Order } from "@/lib/d17/orders.functions";
import { submitVerificationAttempt } from "@/lib/d17/verify.functions";
import { buildScreenshotPath } from "@/lib/d17/storage-path";
import { getOrCreateD17DeviceFingerprint, computeD17BrowserFingerprint } from "@/lib/d17/client-fingerprint";
import { TERMINAL_STATUSES, UPLOAD_ACCEPTING_STATUSES } from "@/lib/d17/status";
import { VerificationChecklist, type VerificationOutcome } from "@/components/d17/VerificationChecklist";
import { PaymentStepper } from "@/components/d17/PaymentStepper";
import { ExampleSuccessScreenshot, ExampleHistoryScreenshot, UploadGuidance } from "@/components/d17/ExampleScreenshot";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Copy, Check, AlertTriangle, Smartphone, Landmark, User,
  Upload, ImageIcon, ShieldCheck, Clock, FlaskConical, PartyPopper, XCircle,
  Timer, Lock, MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/d17/$orderId/")({
  component: D17PaymentFlowPage,
});

interface D17Order {
  id: string;
  plan_code: string;
  amount_tnd: number;
  currency: string;
  status: string;
  attempts_used: number;
  session_token: string | null;
  destination_number: string | null;
  destination_iban: string | null;
  destination_account_holder: string | null;
  manual_review_deadline: string | null;
  maxAttemptsPerOrder: number;
  confirmationWindowMinutes: number;
  manualReviewWindowHours: number;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function CopyField({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — please copy manually.");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-lg font-bold text-foreground">{value}</span>
        <button
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function useCountdown(deadline: string | null) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) { setRemainingMs(null); return; }
    const target = new Date(deadline).getTime();
    const tick = () => setRemainingMs(Math.max(0, target - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);
  if (remainingMs === null) return null;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function D17PaymentFlowPage() {
  const { orderId } = useParams({ from: "/_authenticated/d17/$orderId/" });
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const [order, setOrder] = useState<D17Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [outcome, setOutcome] = useState<VerificationOutcome | null>(null);

  useEffect(() => {
    let cancelled = false;
    getD17Order({ data: { order_id: orderId } })
      .then((data) => {
        if (cancelled) return;
        setOrder(data as D17Order);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Could not load order.");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [orderId]);

  // Once submitted, keep the order's own status in sync via the same
  // polling the old dedicated status page used — an admin approve/reject
  // while this tab is open should update in place, not require a refresh.
  useEffect(() => {
    if (!order || submitting) return;
    if (TERMINAL_STATUSES.includes(order.status as (typeof TERMINAL_STATUSES)[number])) return;
    if (order.attempts_used === 0) return; // nothing to poll yet — still in the "upload" step
    const interval = setInterval(() => {
      getD17Order({ data: { order_id: orderId } }).then((data) => setOrder(data as D17Order)).catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [order, orderId, submitting]);

  // Called unconditionally (before any early return below) — Rules of Hooks.
  const countdown = useCountdown(order?.manual_review_deadline ?? null);

  // Once a decision comes back, show it in the checklist for a beat (longer
  // for a rejection, so the reason is actually readable) then hand off to
  // the same terminal/waiting render branch every other visit uses — driven
  // by the order's real status, never a client-guessed "you can retry this"
  // affordance. A hard-reject (auto_rejected_duplicate/fraud) sets the order
  // itself to the terminal `rejected` status server-side regardless of
  // remaining attempts (see verify.functions.ts) — there is no in-place
  // retry for those, only "start a new payment" from the terminal view.
  useEffect(() => {
    if (!outcome) return;
    const isRejected = outcome.decision === "auto_rejected_duplicate" || outcome.decision === "auto_rejected_fraud";
    const timer = setTimeout(() => {
      getD17Order({ data: { order_id: orderId } })
        .then((fresh) => {
          setOrder(fresh as D17Order);
          setSubmitting(false);
          setUploaded(false);
          setOutcome(null);
          setFile1(null);
          setFile2(null);
          setReference("");
        })
        .catch(() => {});
    }, isRejected ? 3500 : 1200);
    return () => clearTimeout(timer);
  }, [outcome, orderId]);

  function validateFile(f: File): boolean {
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      toast.error("Please upload a PNG, JPG, or WEBP screenshot.");
      return false;
    }
    if (f.size > MAX_FILE_BYTES) {
      toast.error("Screenshot must be under 10 MB.");
      return false;
    }
    return true;
  }

  function handleFileChange1(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !validateFile(f)) return;
    setFile1(f);
  }
  function handleFileChange2(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !validateFile(f)) return;
    setFile2(f);
  }

  async function handleSubmit() {
    if (!file1) return;
    await submitFile(file1, file2, reference);
  }

  async function submitFile(submitTarget1: File, submitTarget2: File | null, submitReference: string) {
    if (!user || !order) return;
    if (!order.session_token) {
      toast.error("This order is missing a valid session. Please reload the page.");
      return;
    }
    if (submitReference.trim().length < 4) {
      toast.error("Please enter the Authorization Number from your D17 confirmation.");
      return;
    }

    setSubmitting(true);
    setUploaded(false);
    setOutcome(null);

    try {
      const attemptNumber = order.attempts_used + 1;
      const storagePath = buildScreenshotPath(user.id, order.id, attemptNumber, 1);
      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(storagePath, submitTarget1, { contentType: submitTarget1.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      let storagePath2: string | undefined;
      if (submitTarget2) {
        storagePath2 = buildScreenshotPath(user.id, order.id, attemptNumber, 2);
        const { error: uploadError2 } = await supabase.storage
          .from("payment-screenshots")
          .upload(storagePath2, submitTarget2, { contentType: submitTarget2.type, upsert: false });
        if (uploadError2) throw new Error(uploadError2.message);
      }
      setUploaded(true);

      const deviceFingerprint = getOrCreateD17DeviceFingerprint();
      const browserFingerprint = await computeD17BrowserFingerprint();

      const attempt = await submitVerificationAttempt({
        data: {
          order_id: order.id,
          session_token: order.session_token!,
          storage_path: storagePath,
          storage_path_2: storagePath2,
          user_entered_reference: submitReference.trim(),
          device_fingerprint: deviceFingerprint,
          browser_fingerprint: browserFingerprint,
        },
      });
      const decision = attempt.decision as VerificationOutcome["decision"];
      setOutcome({
        decision,
        reason: attempt.decision_reason,
        hardGate: (attempt.rule_engine_result as { hardGate?: string | null } | null)?.hardGate ?? null,
      });
      // Refresh the order so the post-submit panel reflects real status
      // (auto_approved / manual_review / rejected) instead of stale state.
      const fresh = await getD17Order({ data: { order_id: orderId } });
      setOrder(fresh as D17Order);
    } catch (err) {
      console.error("[D17 verify]", err);
      const safeMessage = err instanceof Error && /attempt|limit|duplicate|already|expired|locked/i.test(err.message)
        ? err.message
        : "Verification failed. Please try again.";
      toast.error(safeMessage);
      setSubmitting(false);
      setUploaded(false);
      setOutcome(null);
    }
  }

  async function fetchFixtureFile(path: string): Promise<File> {
    const { data, error } = await supabase.storage.from("d17-test-fixtures").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) throw new Error("Could not load test fixture");
    const res = await fetch(data.signedUrl);
    const blob = await res.blob();
    return new File([blob], path, { type: "image/png" });
  }
  async function handleUseFixture(name: "sample-pass" | "sample-duplicate" | "sample-mismatch") {
    const fixtureFile = await fetchFixtureFile(`${name}.png`);
    await submitFile(fixtureFile, fixtureFile, "482193");
  }
  async function handleUseFixturePair(name: "consistent-pass" | "mismatched" | "wrong-destination") {
    const [f1, f2] = await Promise.all([
      fetchFixtureFile(`pair-${name}-1.png`),
      fetchFixtureFile(`pair-${name}-2.png`),
    ]);
    await submitFile(f1, f2, "778899");
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
        <Link to="/billing" className="mt-3 inline-block text-sm text-primary hover:underline">Back to billing</Link>
      </div>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(order.status as (typeof TERMINAL_STATUSES)[number]);
  const canUpload = (UPLOAD_ACCEPTING_STATUSES as readonly string[]).includes(order.status) && order.attempts_used === 0 && !submitting && !outcome;
  const isWaitingReview = !isTerminal && (order.attempts_used > 0 || !canUpload) && !submitting;
  const attemptsRemaining = order.maxAttemptsPerOrder - order.attempts_used;

  // ── Step 3 view: submitting / just-decided ──────────────────────────────
  if (submitting) {
    return (
      <div className="mx-auto max-w-lg space-y-6 pb-10">
        <PaymentStepper current={3} />
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <p className="font-bold text-foreground">Verifying your payment…</p>
          </div>
          <VerificationChecklist uploaded={uploaded} outcome={outcome} />

          {outcome && (
            <div className="mt-5 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-muted-foreground">
                {outcome.decision === "auto_approved" ? "One moment…" : "Taking you to your payment status…"}
              </p>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step 3 view: terminal or waiting-for-review (no active upload) ─────
  if (isTerminal || isWaitingReview) {
    return (
      <div className="mx-auto max-w-lg space-y-6 pb-10">
        <PaymentStepper current={3} />

        {(order.status === "auto_approved" || order.status === "admin_approved") && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <PartyPopper className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-3 text-lg font-black text-foreground">Payment verified!</p>
            <p className="mt-1 text-sm text-muted-foreground">Your subscription is active right now. Good luck with your exam prep.</p>
            <Link to="/billing" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
              Go to dashboard
            </Link>
          </div>
        )}

        {(order.status === "manual_review" || order.status === "under_review") && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-black text-foreground">
                  {order.status === "under_review" && order.attempts_used === 0 ? "Payment confirmation needed" : "A quick human check is in progress"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.status === "under_review" && order.attempts_used === 0
                    ? "We haven't received your payment screenshots yet."
                    : `This usually takes between 1 and ${order.manualReviewWindowHours} hours — we'll email you the moment it's confirmed. Your subscription activates automatically the instant it's approved, no further action needed.`}
                </p>
              </div>
            </div>

            {countdown && (
              <div className="mt-4 flex flex-col items-center rounded-xl bg-amber-500/10 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Estimated review time remaining</p>
                <p className="mt-1 font-mono text-3xl font-black text-amber-600 dark:text-amber-400">{countdown}</p>
              </div>
            )}

            <div className="mt-5 space-y-2">
              <ProgressStep label="Payment received" done />
              <ProgressStep label={order.status === "under_review" && order.attempts_used === 0 ? "Screenshots uploaded" : "AI verification completed"} done={order.attempts_used > 0} />
              <ProgressStep label="Manual review" pending />
            </div>

            {order.status === "under_review" && order.attempts_used === 0 && (
              <button
                onClick={() => { setOrder({ ...order, status: "awaiting_payment" }); }}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <Upload className="h-4 w-4" /> Upload your screenshots ({attemptsRemaining} attempts)
              </button>
            )}
            {order.status === "manual_review" && (
              <p className="mt-5 text-center text-xs text-muted-foreground">
                Your screenshots are with our review team — no further upload is needed while a decision is pending.
              </p>
            )}
          </div>
        )}

        {order.status === "rejected" && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <p className="mt-3 font-black text-foreground">Payment couldn't be verified</p>
            <p className="mt-1 text-sm text-muted-foreground">Please contact support, or start a new payment to try again.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link to="/billing" className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                <Upload className="h-4 w-4" /> Start a new payment
              </Link>
              <a href="https://t.me/+21620046880" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
                <MessageCircle className="h-4 w-4" /> Contact support
              </a>
            </div>
          </div>
        )}

        {order.status === "expired" && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <Timer className="mx-auto h-10 w-10 text-destructive" />
            <p className="mt-3 font-black text-foreground">This payment window expired</p>
            <p className="mt-1 text-sm text-muted-foreground">No problem — start a new payment whenever you're ready.</p>
            <Link to="/billing" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              Start a new payment
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ── Step 1 + 2 combined: the actual one-page payment flow ──────────────
  return (
    <div className="mx-auto max-w-lg space-y-6 pb-10">
      <Link to="/billing" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to billing
      </Link>

      <PaymentStepper current={2} />

      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Complete your payment</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Takes about 2 minutes</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Verified securely</span>
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Plan</span>
          <span className="font-semibold capitalize text-foreground">{order.plan_code}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount to transfer</span>
          <span className="text-lg font-black text-foreground">{order.amount_tnd} {order.currency}</span>
        </div>
      </div>

      {/* ── Step 1: pay ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">1</span>
          Send the payment from your D17 app
        </p>
        {order.destination_number ? (
          <CopyField label="Official D17 Phone Number" value={order.destination_number} icon={Smartphone} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            The official D17 number has not been configured yet — please contact support before paying.
          </div>
        )}
        {order.destination_iban && <CopyField label="Official IBAN (Optional Alternative)" value={order.destination_iban} icon={Landmark} />}
        {order.destination_account_holder && <CopyField label="Account Holder Name" value={order.destination_account_holder} icon={User} />}

        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="text-sm">
            <p className="font-bold text-amber-700 dark:text-amber-400">Important</p>
            <ul className="mt-1.5 space-y-1 text-amber-700/90 dark:text-amber-400/90">
              <li>Transfer <strong>exactly {order.amount_tnd} {order.currency}</strong> — not more, not less.</li>
              <li>Only send to the official number or IBAN above — other destinations can't be verified.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Step 2: confirm & upload ────────────────────────────────── */}
      <section className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">2</span>
          Confirm your payment
        </p>
        <p className="text-xs text-muted-foreground">
          We ask for a screenshot so we can confirm your payment automatically — most students are approved
          within moments, with no waiting at all.
        </p>

        <div>
          <button
            type="button"
            onClick={() => fileInputRef1.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            {file1 ? (
              <>
                <ImageIcon className="h-8 w-8 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">{file1.name}</span>
                <span className="text-xs text-muted-foreground">Click to choose a different file</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Upload Screenshot 1 — Payment Success (required)</span>
                <span className="text-xs text-muted-foreground">PNG, JPG, or WEBP — up to 10 MB</span>
              </>
            )}
          </button>
          <input ref={fileInputRef1} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange1} />
          <div className="mt-3">
            <UploadGuidance
              title="Payment Success screen"
              example={<ExampleSuccessScreenshot />}
              explanation='Right after sending the transfer, D17 shows a confirmation screen. Take a screenshot of that whole screen — it should show the green success mark, the exact amount, the destination number, and the Authorization Number.'
              mistakes={[
                "Cropping out the amount or Authorization Number",
                "Screenshotting the app's home screen instead of the confirmation screen",
                "A blurry or partially covered screenshot",
              ]}
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => fileInputRef2.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            {file2 ? (
              <>
                <ImageIcon className="h-8 w-8 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">{file2.name}</span>
                <span className="text-xs text-muted-foreground">Click to choose a different file</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Upload Screenshot 2 — Transaction History (optional, recommended)</span>
                <span className="text-xs text-muted-foreground">PNG, JPG, or WEBP — up to 10 MB</span>
              </>
            )}
          </button>
          <input ref={fileInputRef2} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange2} />
          <div className="mt-3">
            <UploadGuidance
              title="Transaction History entry"
              example={<ExampleHistoryScreenshot />}
              explanation="In the D17 app, open your transaction history and screenshot the entry for this transfer — the date, amount, and Authorization Number should all be visible. Adding this screenshot usually means instant approval instead of a review wait."
              mistakes={[
                "Screenshotting a different transaction than this payment",
                "Cutting off the date/time or Authorization Number",
                "Skipping this — it's optional, but instant approval needs it",
              ]}
            />
          </div>
          {!file2 && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Without this screenshot, a team member will manually confirm your payment instead of it happening instantly.
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">
            Authorization Number (Numéro d'autorisation)
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. 482193"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
            maxLength={20}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">Found on both screenshots — the same short code confirms your identity as the sender.</p>
        </div>
      </section>

      {/* ── Trust / security recap ──────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Your payment is protected</p>
          <p className="mt-1 leading-relaxed">
            Every submission is automatically checked for duplicate use, tampering, and mismatched details before
            approval. If anything can't be confirmed automatically, a real team member reviews it by hand — your
            subscription activates the instant it's approved, and we'll email you either way.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{attemptsRemaining} of {order.maxAttemptsPerOrder} upload attempts remaining for this order.</span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!file1 || reference.trim().length < 4}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
      >
        {file2 ? "Submit for instant verification" : "Submit Screenshot 1 for manual review"}
      </button>

      {isAdmin && (
        <div className="rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
            <FlaskConical className="h-3.5 w-3.5" /> Admin: test with a synthetic screenshot
          </p>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Runs the exact same pipeline unchanged — only the image is synthetic. "Pass" is baked for a Schriftlich (30 TND) order.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleUseFixture("sample-pass")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">Use "pass" fixture</button>
            <button onClick={() => handleUseFixture("sample-duplicate")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">Use "duplicate" fixture</button>
            <button onClick={() => handleUseFixture("sample-mismatch")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">Use "mismatch" fixture</button>
          </div>
          <p className="mb-2 mt-4 text-[11px] font-semibold text-muted-foreground">Two-screenshot pairs:</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleUseFixturePair("consistent-pass")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">Pair: consistent pass</button>
            <button onClick={() => handleUseFixturePair("mismatched")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">Pair: mismatched</button>
            <button onClick={() => handleUseFixturePair("wrong-destination")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">Pair: wrong destination</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressStep({ label, done, pending }: { label: string; done?: boolean; pending?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {done ? (
        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : pending ? (
        <Clock className="h-4 w-4 shrink-0 text-amber-500" />
      ) : (
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      )}
      <span className={done ? "text-foreground" : pending ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
