import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getD17Order } from "@/lib/d17/orders.functions";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Copy, Check, AlertTriangle, Smartphone, Landmark, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/d17/$orderId/")({
  component: D17PaymentDetailsPage,
});

interface D17Order {
  id: string;
  plan_code: string;
  amount_tnd: number;
  currency: string;
  status: string;
  attempts_used: number;
  destination_number: string | null;
  destination_iban: string | null;
  destination_account_holder: string | null;
}

const TERMINAL_STATUSES = ["auto_approved", "admin_approved", "rejected", "expired"];

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

function D17PaymentDetailsPage() {
  const { orderId } = useParams({ from: "/_authenticated/d17/$orderId/" });
  const nav = useNavigate();
  const [order, setOrder] = useState<D17Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getD17Order({ data: { order_id: orderId } })
      .then((o: any) => {
        if (cancelled) return;
        if (TERMINAL_STATUSES.includes(o.status)) {
          nav({ to: "/d17/$orderId/status", params: { orderId } });
          return;
        }
        if (o.attempts_used > 0) {
          nav({ to: "/d17/$orderId/verify", params: { orderId } });
          return;
        }
        setOrder(o);
        setLoading(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not load order.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

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

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-10">
      <Link to="/billing" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to billing
      </Link>

      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Manual Payment (D17 Mobile Transfer)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Transfer the subscription amount directly from the D17 mobile app to the official number below — no visit
          to a post office or bank branch required.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Plan</span>
          <span className="font-semibold capitalize text-foreground">{order.plan_code}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount to transfer</span>
          <span className="text-lg font-black text-foreground">
            {order.amount_tnd} {order.currency}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment details</p>
        {order.destination_number ? (
          <CopyField label="Official D17 Phone Number" value={order.destination_number} icon={Smartphone} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            The official D17 number has not been configured yet — please contact support before paying.
          </div>
        )}
        {order.destination_iban && (
          <CopyField label="Official IBAN (Optional Alternative)" value={order.destination_iban} icon={Landmark} />
        )}
        {order.destination_account_holder && (
          <CopyField label="Account Holder Name" value={order.destination_account_holder} icon={User} />
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="text-sm">
          <p className="font-bold text-amber-700 dark:text-amber-400">Important</p>
          <ul className="mt-1.5 space-y-1 text-amber-700/90 dark:text-amber-400/90">
            <li>Please transfer <strong>exactly {order.amount_tnd} {order.currency}</strong> — not more, not less.</li>
            <li>Even a small difference (including decimals) may prevent automatic verification.</li>
            <li>Only send to the official D17 number or IBAN shown above — payments to any other destination cannot be verified.</li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        Most payments are verified automatically within moments. If our AI needs a second look, manual verification
        usually takes between 1 and 8 hours — we'll notify you as soon as it's resolved.
      </div>

      <Link
        to="/d17/$orderId/verify"
        params={{ orderId }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
      >
        Continue to Verification
      </Link>
    </div>
  );
}
