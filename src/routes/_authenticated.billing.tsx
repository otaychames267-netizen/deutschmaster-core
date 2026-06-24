import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard, CheckCircle2, AlertCircle, Star,
  Check, Shield, Zap, Clock, RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
});

const PLANS = [
  {
    code: "schriftlich",
    name: "Schriftlich",
    price_eur: 6,
    price_tnd: 20,
    period: "/mo",
    desc: "Master all written exam components",
    features: [
      "Lesen — Teil 1, 2, 3",
      "Hören — Teil 1, 2, 3",
      "Sprachbausteine — Teil 1, 2",
      "Schreiben — Beschwerde & Bitte",
      "Progress analytics",
    ],
    highlighted: false,
    badge: null as string | null,
  },
  {
    code: "komplett",
    name: "Komplett",
    price_eur: 12,
    price_tnd: 40,
    period: "/mo",
    desc: "Complete preparation — written and spoken",
    features: [
      "Everything in Schriftlich",
      "Mündlich — full preparation",
      "Prüfungssimulation — full",
      "Priority support",
      "Advanced analytics",
    ],
    highlighted: true,
    badge: "Best value",
  },
  {
    code: "muendlich",
    name: "Mündlich",
    price_eur: 6,
    price_tnd: 20,
    period: "/mo",
    desc: "Perfect your speaking and oral skills",
    features: [
      "Präsentation practice",
      "Gespräch simulation",
      "Gemeinsam planen",
      "Speaking progress tracking",
      "Progress analytics",
    ],
    highlighted: false,
    badge: null,
  },
];

interface Subscription {
  status: string;
  plan_code: string;
  expires_at: string;
}

function BillingPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
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
    ? new Date(subscription.expires_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const isActive = subscription?.status === "active";
  const isTrial  = subscription?.status === "trial";

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Billing &amp; subscription</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your plan and payment details.
        </p>
      </div>

      {/* Current subscription card */}
      {!loading && (isActive || isTrial) && subscription && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {isTrial ? "Free trial" : "Subscription"} active
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Plan:{" "}
                  <span className="font-medium capitalize text-foreground">{subscription.plan_code}</span>
                  {" "}· {isTrial ? "Trial ends" : "Renews"} {expiresDate}
                </p>
                {isTrial && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your trial gives you full access. Upgrade before it ends to keep access without interruption.
                  </p>
                )}
              </div>
            </div>
            {isTrial && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3" /> Trial
              </span>
            )}
            {isActive && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Active
              </span>
            )}
          </div>
        </div>
      )}

      {!loading && !subscription && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-foreground">No active subscription</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Choose a plan below to start your 3-day free trial — no credit card required.
            </p>
          </div>
        </div>
      )}

      {/* Plan selector */}
      <div>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Available plans</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = subscription?.plan_code === plan.code;
            return (
              <div
                key={plan.code}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  plan.highlighted
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border bg-card"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
                      <Star className="h-2.5 w-2.5 fill-current" /> {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {plan.name}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-foreground">€{plan.price_eur}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">≈ {plan.price_tnd} TND / month</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{plan.desc}</p>
                </div>

                <ul className="mb-6 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Current plan
                  </div>
                ) : (
                  <button
                    disabled
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                      plan.highlighted
                        ? "bg-primary text-primary-foreground opacity-60"
                        : "bg-primary text-primary-foreground opacity-60"
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Subscribe — Stripe coming soon
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Zap,
            title: "Instant activation",
            desc: "Access is granted the moment your payment is confirmed.",
            color: "text-amber-500 bg-amber-500/10",
          },
          {
            icon: Shield,
            title: "Secured by Stripe",
            desc: "Your card details are never stored on our servers.",
            color: "text-blue-500 bg-blue-500/10",
          },
          {
            icon: RefreshCw,
            title: "Cancel anytime",
            desc: "No lock-ins. Cancel from here with one click, no questions asked.",
            color: "text-emerald-500 bg-emerald-500/10",
          },
        ].map((card) => (
          <div key={card.title} className="rounded-xl border border-border bg-card p-4">
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
              <card.icon className="h-4.5 w-4.5" />
            </div>
            <p className="text-sm font-medium text-foreground">{card.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Stripe payment integration will be activated once your Stripe account is connected via the Admin panel.
        <br />
        During this phase, free trials are granted automatically at registration.
      </p>
    </div>
  );
}
