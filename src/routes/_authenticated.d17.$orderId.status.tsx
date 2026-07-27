import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getD17Order } from "@/lib/d17/orders.functions";
import {
  CheckCircle2, Clock, XCircle, AlertTriangle,
  Loader2, MessageCircle, Upload, PartyPopper,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/d17/$orderId/status")({
  component: D17StatusPage,
});

interface D17Order {
  id: string;
  plan_code: string;
  amount_tnd: number;
  currency: string;
  status: string;
  attempts_used: number;
  manual_review_deadline: string | null;
  maxAttemptsPerOrder: number;
}

function useCountdown(deadline: string | null) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) {
      setRemainingMs(null);
      return;
    }
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

function D17StatusPage() {
  const { orderId } = useParams({ from: "/_authenticated/d17/$orderId/status" });
  const nav = useNavigate();
  const [order, setOrder] = useState<D17Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Canonical server-authoritative fetch — see verify.tsx for why this
      // replaced a raw client query.
      try {
        const data = await getD17Order({ data: { order_id: orderId } });
        if (!cancelled) {
          setOrder(data as D17Order);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setOrder(null);
          setLoading(false);
        }
      }
    }
    load();
    // Poll every 20s so the page reflects an admin's manual approve/reject
    // without the student needing to refresh.
    const interval = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]);

  const countdown = useCountdown(order?.manual_review_deadline ?? null);

  useEffect(() => {
    if (order?.status === "awaiting_payment") {
      nav({ to: "/d17/$orderId/verify", params: { orderId } });
    }
  }, [order?.status]);

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
        <Link to="/billing" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to billing
        </Link>
      </div>
    );
  }

  const attemptsRemaining = order.maxAttemptsPerOrder - order.attempts_used;
  // Self-service upload is only ever offered pre-first-attempt (order is
  // `under_review` because the 10-minute confirmation window lapsed with
  // nothing uploaded yet — no verification session exists to lock). Once an
  // actual attempt has been submitted and the order sits in `manual_review`,
  // no further re-upload is offered here — only an admin decision moves it
  // forward (see UPLOAD_ACCEPTING_STATUSES / status.ts for the full rule).
  const canUploadFirstAttempt = order.status === "under_review" && order.attempts_used === 0 && attemptsRemaining > 0;

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Payment Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order for <span className="capitalize font-medium">{order.plan_code}</span> — {order.amount_tnd} {order.currency}
        </p>
      </div>

      {(order.status === "auto_approved" || order.status === "admin_approved") && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <PartyPopper className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-3 text-lg font-black text-foreground">Payment verified!</p>
          <p className="mt-1 text-sm text-muted-foreground">Your subscription is active. Good luck with your exam prep.</p>
          <Link
            to="/billing"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
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
                {order.status === "under_review" && order.attempts_used === 0 ? "Payment Confirmation Needed" : "Additional Verification Required"}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.status === "under_review" && order.attempts_used === 0
                  ? "We haven't received your payment screenshots yet. A team member will follow up, or you can upload now."
                  : "Your payment is being reviewed manually. This usually takes between 1 and 8 hours — we'll notify you by email as soon as it's confirmed."}
              </p>
            </div>
          </div>

          {countdown && (
            <div className="mt-4 flex flex-col items-center rounded-xl bg-amber-500/10 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Estimated review time
              </p>
              <p className="mt-1 font-mono text-3xl font-black text-amber-600 dark:text-amber-400">{countdown}</p>
            </div>
          )}

          <div className="mt-5 space-y-2">
            <ProgressStep label="Payment received" done />
            <ProgressStep
              label={order.status === "under_review" && order.attempts_used === 0 ? "Screenshots uploaded" : "AI verification completed"}
              done={order.attempts_used > 0}
            />
            <ProgressStep label="Manual review" pending />
          </div>

          {canUploadFirstAttempt && (
            <Link
              to="/d17/$orderId/verify"
              params={{ orderId }}
              className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <Upload className="h-4 w-4" />
              Upload your screenshots ({attemptsRemaining} attempts)
            </Link>
          )}
          {order.status === "manual_review" && (
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Your screenshots are under review — no further upload is needed or possible while a decision is
              pending. We'll notify you as soon as it's resolved.
            </p>
          )}
        </div>
      )}

      {order.status === "rejected" && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <p className="mt-3 font-black text-foreground">Payment couldn't be verified</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please contact support, or start a new payment to try again.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {/* This order is terminal (rejected) — retrying means starting a
                brand-new order/session from Billing, not re-uploading here.
                That new order gets its own independent attempt count, so
                there's no "attempts remaining" gate on this link itself;
                the usual submission rate limits still apply per account. */}
            <Link
              to="/billing"
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              <Upload className="h-4 w-4" /> Start a new payment
            </Link>
            <a
              href="https://t.me/+21620046880"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <MessageCircle className="h-4 w-4" /> Contact support
            </a>
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
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : pending ? (
        <Clock className="h-4 w-4 shrink-0 text-amber-500" />
      ) : (
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      )}
      <span className={done ? "text-foreground" : pending ? "font-medium text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}
