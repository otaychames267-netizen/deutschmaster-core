import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { submitVerificationAttempt } from "@/lib/d17/verify.functions";
import { buildScreenshotPath } from "@/lib/d17/storage-path";
import { VerificationChecklist } from "@/components/d17/VerificationChecklist";
import { toast } from "sonner";
import { Upload, ImageIcon, ArrowLeft, Loader2, ShieldCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/d17/$orderId/verify")({
  component: D17VerifyPage,
});

interface D17Order {
  id: string;
  plan_code: string;
  amount_tnd: number;
  currency: string;
  status: string;
  attempts_used: number;
}

const ACTIVE_STATUSES = ["awaiting_payment", "manual_review", "under_review"];
const MAX_ATTEMPTS = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const D17_PAYMENT_INSTRUCTIONS =
  (import.meta.env.VITE_D17_PAYMENT_INSTRUCTIONS as string | undefined) ??
  "Contact support for the current D17 number / bank transfer details for this payment.";

function D17VerifyPage() {
  const { orderId } = useParams({ from: "/_authenticated/d17/$orderId/verify" });
  const { user } = useAuth();
  const nav = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [order, setOrder] = useState<D17Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase
      .from("d17_orders")
      .select("id, plan_code, amount_tnd, currency, status, attempts_used")
      .eq("id", orderId)
      .maybeSingle()
      .then(({ data }) => {
        setOrder(data);
        setLoading(false);
        if (data && !ACTIVE_STATUSES.includes(data.status)) {
          nav({ to: "/d17/$orderId/status", params: { orderId } });
        }
      });
  }, [orderId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      toast.error("Please upload a PNG, JPG, or WEBP screenshot.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      toast.error("Screenshot must be under 10 MB.");
      return;
    }
    setFile(f);
  }

  async function handleSubmit() {
    if (!file || !user || !order) return;
    if (reference.trim().length < 4) {
      toast.error("Please enter at least the last 4 digits of the transaction reference.");
      return;
    }

    setSubmitting(true);
    setUploaded(false);
    setDone(false);

    try {
      const attemptNumber = order.attempts_used + 1;
      const storagePath = buildScreenshotPath(user.id, order.id, attemptNumber);
      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      setUploaded(true);

      const attempt = await submitVerificationAttempt({
        data: { order_id: order.id, storage_path: storagePath, user_entered_reference: reference.trim() },
      });
      setDone(true);

      await new Promise((r) => setTimeout(r, 900));
      void attempt;
      nav({ to: "/d17/$orderId/status", params: { orderId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed. Please try again.");
      setSubmitting(false);
      setUploaded(false);
      setDone(false);
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
        <Link to="/billing" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to billing
        </Link>
      </div>
    );
  }

  const attemptsRemaining = MAX_ATTEMPTS - order.attempts_used;

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-10">
      <Link to="/billing" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to billing
      </Link>

      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Payment Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a screenshot of your D17 or bank-transfer payment confirmation.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Plan</span>
          <span className="font-semibold capitalize text-foreground">{order.plan_code}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className="font-semibold text-foreground">
            {order.amount_tnd} {order.currency}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Order ID</span>
          <span className="font-mono text-xs text-muted-foreground">{order.id}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-foreground">
        <p className="font-semibold">How to pay</p>
        <p className="mt-1 text-muted-foreground">{D17_PAYMENT_INSTRUCTIONS}</p>
      </div>

      {!submitting ? (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Payment screenshot</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              {file ? (
                <>
                  <ImageIcon className="h-8 w-8 text-emerald-500" />
                  <span className="text-sm font-medium text-foreground">{file.name}</span>
                  <span className="text-xs text-muted-foreground">Click to choose a different file</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Click to upload a screenshot</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG, or WEBP — up to 10 MB</span>
                </>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Transaction reference (Réf) — last 4-6 digits
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 482193"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              maxLength={20}
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {attemptsRemaining} of {MAX_ATTEMPTS} upload attempts remaining for this order.
            </span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!file || reference.trim().length < 4}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            Submit for verification
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <p className="font-bold text-foreground">Verifying your payment…</p>
          </div>
          <VerificationChecklist uploaded={uploaded} done={done} />
        </div>
      )}
    </div>
  );
}
