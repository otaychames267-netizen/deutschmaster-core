import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, Clock, XCircle, AlertTriangle,
  Loader2, Mail, Upload, PartyPopper,
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
}

const MAX_ATTEMPTS = 3;
const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) ?? "Support@auralingoviatestdeutsch.academy";

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
      const { data } = await supabase
        .from("d17_orders")
        .select("id, plan_code, amount_tnd, currency, status, attempts_used, manual_review_deadline")
        .eq("id", orderId)
        .maybeSingle();
      if (!cancelled) {
        setOrder(data);
        setLoading(false);
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

  const attemptsRemaining = MAX_ATTEMPTS - order.attempts_used;
  const canRetry = attemptsRemaining > 0;

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

          {canRetry && (
            <Link
              to="/d17/$orderId/verify"
              params={{ orderId }}
              className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <Upload className="h-4 w-4" />
              {order.attempts_used === 0 ? `Upload your screenshots (${attemptsRemaining} attempts)` : `Upload a clearer screenshot (${attemptsRemaining} left)`}
            </Link>
          )}
        </div>
      )}

      {order.status === "rejected" && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <p className="mt-3 font-black text-foreground">Payment couldn't be verified</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please upload another payment notification or contact support.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {canRetry && (
              <Link
                to="/d17/$orderId/verify"
                params={{ orderId }}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                <Upload className="h-4 w-4" /> Upload another screenshot
              </Link>
            )}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Payment issue — Order ${order.id}`)}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <Mail className="h-4 w-4" /> Contact support
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
