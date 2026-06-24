import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { CreditCard, CheckCircle2, Clock, AlertCircle, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
});

const PLANS = [
  {
    code: "schriftlich",
    name: "Schriftlich",
    price_tnd: 20,
    description: "Written exam — Lesen, Hören, Sprachbausteine, Schreiben",
  },
  {
    code: "muendlich",
    name: "Mündlich",
    price_tnd: 20,
    description: "Oral exam — speaking simulation and practice",
  },
  {
    code: "komplett",
    name: "Komplett",
    price_tnd: 40,
    description: "Full access — written + oral, complete preparation",
    highlighted: true,
  },
];

function BillingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<{
    status: string;
    plan_code: string;
    expires_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("subscriptions")
      .select("status, plan_code, expires_at")
      .eq("user_id", user.id)
      .in("status", ["active", "trial"])
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setSubscription(data);
        setLoading(false);
      });
  }, [user?.id]);

  const expiresDate = subscription?.expires_at
    ? new Date(subscription.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Abonnement</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Manage your subscription and billing.</p>
      </div>

      {/* Current subscription */}
      {!loading && subscription && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-medium text-foreground">
                {subscription.status === "trial" ? "Free trial active" : "Subscription active"}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Plan: <strong>{subscription.plan_code}</strong> · Expires {expiresDate}
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && !subscription && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-foreground">No active subscription</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Choose a plan below to start your 3-day free trial.
            </p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.code}
            className={`relative flex flex-col rounded-2xl border p-5 ${
              (plan as { highlighted?: boolean }).highlighted
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            {(plan as { highlighted?: boolean }).highlighted && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                Best value
              </span>
            )}
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{plan.name}</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">{plan.price_tnd} TND</span>
              <span className="text-xs text-muted-foreground">/mo</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>
            <button
              disabled
              className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground opacity-60"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Coming soon
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Payment processing (Stripe) will be activated in Phase 3. 3-day free trial available for all plans.
      </p>
    </div>
  );
}
