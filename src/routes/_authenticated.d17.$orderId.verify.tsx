import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { submitVerificationAttempt } from "@/lib/d17/verify.functions";
import { getD17Order } from "@/lib/d17/orders.functions";
import { buildScreenshotPath } from "@/lib/d17/storage-path";
import { getOrCreateD17DeviceFingerprint, computeD17BrowserFingerprint } from "@/lib/d17/client-fingerprint";
import { UPLOAD_ACCEPTING_STATUSES } from "@/lib/d17/status";
import { VerificationChecklist } from "@/components/d17/VerificationChecklist";
import { toast } from "sonner";
import { Upload, ImageIcon, ArrowLeft, Loader2, ShieldCheck, Clock, FlaskConical } from "lucide-react";

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
  session_token: string | null;
  maxAttemptsPerOrder: number;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function D17VerifyPage() {
  const { orderId } = useParams({ from: "/_authenticated/d17/$orderId/verify" });
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
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Canonical, server-authoritative fetch (same function the status page
    // and the payment-details page use) instead of a raw client query —
    // this applies the same lazy expiry/under-review-flip business rules
    // everywhere, so this page's displayed status can never silently drift
    // from what the rest of the app considers current.
    getD17Order({ data: { order_id: orderId } })
      .then((data) => {
        setOrder(data as D17Order);
        setLoading(false);
        if (data && !(UPLOAD_ACCEPTING_STATUSES as readonly string[]).includes(data.status)) {
          nav({ to: "/d17/$orderId/status", params: { orderId } });
        }
      })
      .catch(() => {
        setOrder(null);
        setLoading(false);
      });
  }, [orderId]);

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
    if (!file1 || !file2) return;
    await submitFile(file1, file2, reference);
  }

  /**
   * Takes explicit params rather than reading `file1`/`file2`/`reference`
   * state so the admin-only fixture buttons (below) can trigger a
   * submission immediately without waiting on a setState round trip.
   */
  async function submitFile(submitTarget1: File, submitTarget2: File, submitReference: string) {
    if (!user || !order) return;
    if (!order.session_token) {
      toast.error("This order is missing a valid session. Please reload the page.");
      return;
    }
    if (submitReference.trim().length < 4) {
      toast.error("Please enter the Transaction ID / Authorization Number from your D17 confirmation.");
      return;
    }

    setSubmitting(true);
    setUploaded(false);
    setDone(false);

    try {
      const attemptNumber = order.attempts_used + 1;
      const storagePath = buildScreenshotPath(user.id, order.id, attemptNumber, 1);
      const storagePath2 = buildScreenshotPath(user.id, order.id, attemptNumber, 2);
      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(storagePath, submitTarget1, { contentType: submitTarget1.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const { error: uploadError2 } = await supabase.storage
        .from("payment-screenshots")
        .upload(storagePath2, submitTarget2, { contentType: submitTarget2.type, upsert: false });
      if (uploadError2) throw new Error(uploadError2.message);
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
      setDone(true);

      await new Promise((r) => setTimeout(r, 900));
      void attempt;
      nav({ to: "/d17/$orderId/status", params: { orderId } });
    } catch (err) {
      console.error("[D17 verify]", err);
      // Server-side throws in this flow are meant to already be user-safe, but
      // this is a payment-critical path — never trust that unconditionally.
      // Rate-limit/duplicate/attempt-limit messages are the known safe cases
      // users need to actually see; anything else falls back to a generic message.
      const safeMessage = err instanceof Error && /attempt|limit|duplicate|already|expired|locked/i.test(err.message)
        ? err.message
        : "Verification failed. Please try again.";
      toast.error(safeMessage);
      setSubmitting(false);
      setUploaded(false);
      setDone(false);
    }
  }

  // Fixtures live in a private, admin-only storage bucket (not public/) —
  // these images are deliberately "baked to pass" the real verification
  // pipeline, so they must never be reachable by a direct unauthenticated
  // URL. createSignedUrl itself is storage-RLS-gated to admins, giving a
  // second enforcement layer beyond this route's client-side isAdmin check.
  async function fetchFixtureFile(path: string): Promise<File> {
    const { data, error } = await supabase.storage.from("d17-test-fixtures").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) throw new Error("Could not load test fixture");
    const res = await fetch(data.signedUrl);
    const blob = await res.blob();
    return new File([blob], path, { type: "image/png" });
  }

  async function handleUseFixture(name: "sample-pass" | "sample-duplicate" | "sample-mismatch") {
    // Single-image legacy fixtures — the same synthetic image is reused for
    // both slots. See handleUseFixturePair below for genuine two-image pairs.
    const fixtureFile = await fetchFixtureFile(`${name}.png`);
    await submitFile(fixtureFile, fixtureFile, "482193");
  }

  async function handleUseFixturePair(name: "consistent-pass" | "mismatched" | "wrong-destination") {
    const [file1, file2] = await Promise.all([
      fetchFixtureFile(`pair-${name}-1.png`),
      fetchFixtureFile(`pair-${name}-2.png`),
    ]);
    await submitFile(file1, file2, "778899");
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

  const attemptsRemaining = order.maxAttemptsPerOrder - order.attempts_used;

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-10">
      <Link to="/billing" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to billing
      </Link>

      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Payment Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload both required screenshots from your D17 app to verify your transfer.
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

      {!submitting ? (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Screenshot 1 — "Payment Success" screen
            </label>
            <p className="mb-2 text-xs text-muted-foreground">
              The D17 confirmation screen showing successful transfer, the official number, the exact amount, and the
              Transaction Authorization Number.
            </p>
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
                  <span className="text-sm font-medium text-foreground">Click to upload Screenshot 1</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG, or WEBP — up to 10 MB</span>
                </>
              )}
            </button>
            <input ref={fileInputRef1} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange1} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Screenshot 2 — D17 Transaction History / Journal D17
            </label>
            <p className="mb-2 text-xs text-muted-foreground">
              The D17 app's transaction history entry showing the date, time, official number, amount, and
              Authorization Number.
            </p>
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
                  <span className="text-sm font-medium text-foreground">Click to upload Screenshot 2</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG, or WEBP — up to 10 MB</span>
                </>
              )}
            </button>
            <input ref={fileInputRef2} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange2} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Transaction ID / Authorization Number (Numéro d'autorisation)
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
              {attemptsRemaining} of {order.maxAttemptsPerOrder} upload attempts remaining for this order.
            </span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!file1 || !file2 || reference.trim().length < 4}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            Submit for verification
          </button>

          {isAdmin && (
            <div className="rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                <FlaskConical className="h-3.5 w-3.5" /> Admin: test with a synthetic screenshot
              </p>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Runs the exact same pipeline unchanged — only the image is synthetic. "Pass" is baked for a
                Schriftlich (30 TND) order.
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleUseFixture("sample-pass")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  Use "pass" fixture
                </button>
                <button onClick={() => handleUseFixture("sample-duplicate")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  Use "duplicate" fixture
                </button>
                <button onClick={() => handleUseFixture("sample-mismatch")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  Use "mismatch" fixture
                </button>
              </div>

              <p className="mb-2 mt-4 text-[11px] font-semibold text-muted-foreground">
                Two-screenshot pairs (genuinely distinct Screenshot 1 / Screenshot 2 images):
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleUseFixturePair("consistent-pass")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  Pair: consistent pass
                </button>
                <button onClick={() => handleUseFixturePair("mismatched")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  Pair: screenshots mismatched
                </button>
                <button onClick={() => handleUseFixturePair("wrong-destination")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  Pair: wrong destination
                </button>
              </div>
            </div>
          )}
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
