import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard, CheckCircle2, AlertCircle, Star,
  Check, Shield, Zap, Clock, RefreshCw,
  Crown, Calendar, TrendingUp, BookOpen,
  Mic, PenLine, ChevronRight, ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
});

/* ── Plan definitions ─────────────────────────────────────────── */
const PLANS = [
  {
    code: "schriftlich",
    name: "Schriftlich",
    icon: PenLine,
    price_tnd: 25,
    period: "/month",
    tagline: "Master all written exam components",
    color: "blue",
    gradientFrom: "#1d4ed8",
    gradientTo: "#3b82f6",
    features: [
      "Lesen — Teil 1, 2, 3",
      "Hören — Teil 1, 2, 3",
      "Sprachbausteine — Teil 1, 2",
      "Schreiben — Beschwerde & Bitte",
      "Progress analytics",
      "Practice exams (PDF library)",
    ],
    highlighted: false,
    badge: null as string | null,
  },
  {
    code: "komplett",
    name: "Komplett",
    icon: Crown,
    price_tnd: 60,
    period: "/month",
    tagline: "Everything — written and spoken",
    color: "violet",
    gradientFrom: "#6d28d9",
    gradientTo: "#8b5cf6",
    features: [
      "Everything in Schriftlich",
      "Mündlich — full preparation",
      "Prüfungssimulation — full exam",
      "Priority support",
      "Advanced analytics",
      "All future content included",
    ],
    highlighted: true,
    badge: "Best value",
  },
  {
    code: "muendlich",
    name: "Mündlich",
    icon: Mic,
    price_tnd: 45,
    period: "/month",
    tagline: "Perfect your speaking skills",
    color: "rose",
    gradientFrom: "#be123c",
    gradientTo: "#f43f5e",
    features: [
      "Präsentation (Teil 1)",
      "Über ein Thema sprechen (Teil 2)",
      "Gemeinsam planen (Teil 3)",
      "Speaking progress tracking",
      "Oral exam simulations",
      "Practice feedback tools",
    ],
    highlighted: false,
    badge: null,
  },
];

const COLOR_CLASSES: Record<string, { ring: string; bg: string; text: string; btn: string }> = {
  blue:   { ring: "ring-blue-500/30",   bg: "bg-blue-500/5",   text: "text-blue-600 dark:text-blue-400",   btn: "bg-blue-600 hover:bg-blue-700"   },
  violet: { ring: "ring-violet-500/30", bg: "bg-violet-500/5", text: "text-violet-600 dark:text-violet-400", btn: "bg-violet-600 hover:bg-violet-700" },
  rose:   { ring: "ring-rose-500/30",   bg: "bg-rose-500/5",   text: "text-rose-600 dark:text-rose-400",   btn: "bg-rose-600 hover:bg-rose-700"   },
};

interface Subscription {
  status: string;
  plan_code: string;
  expires_at: string;
}

function daysRemaining(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
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

  const isActive = subscription?.status === "active";
  const isTrial  = subscription?.status === "trial";
  const daysLeft = subscription ? daysRemaining(subscription.expires_at) : 0;
  const renewDate = subscription
    ? new Date(subscription.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Billing & Subscription</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your plan, view payment history, and upgrade.</p>
        </div>
        <Link to="/profile" className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          Account settings <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── Current subscription status card ─────────────────── */}
      {!loading && (isActive || isTrial) && subscription && (
        <div className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm ${
          isTrial ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"
        }`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isTrial ? "bg-amber-500/15" : "bg-emerald-500/15"
              }`}>
                {isTrial
                  ? <Clock className="h-6 w-6 text-amber-500" />
                  : <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-foreground text-base">
                    {isTrial ? "Free Trial" : "Active Subscription"}
                  </p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isTrial
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {isTrial ? "Trial" : "Active"}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Plan: <span className="font-semibold capitalize text-foreground">{subscription.plan_code}</span>
                  {renewDate ? ` · ${isTrial ? "Expires" : "Renews"} ${renewDate}` : ""}
                </p>
              </div>
            </div>

            {/* Days remaining counter */}
            <div className={`flex flex-col items-center rounded-2xl px-6 py-3 text-center ${
              isTrial ? "bg-amber-500/10" : "bg-emerald-500/10"
            }`}>
              <p className={`text-3xl font-black ${isTrial ? "text-amber-500" : "text-emerald-500"}`}>
                {daysLeft}
              </p>
              <p className="text-xs font-semibold text-muted-foreground">days remaining</p>
            </div>
          </div>

          {isTrial && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Your trial gives full access. Subscribe before it ends to avoid interruption.
              </p>
            </div>
          )}

          {/* Renewal date warning */}
          {isActive && daysLeft <= 7 && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Your subscription renews in {daysLeft} day{daysLeft !== 1 ? "s" : ""}. Make sure payment is set up.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── No subscription ───────────────────────────────────── */}
      {!loading && !subscription && (
        <div className="flex items-start gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15">
            <AlertCircle className="h-6 w-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-black text-foreground">No active subscription</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a plan below to start your 3-day free trial — no credit card required.
            </p>
          </div>
        </div>
      )}

      {/* ── Plan comparison ───────────────────────────────────── */}
      <div>
        <div className="mb-2">
          <h2 className="text-lg font-black text-foreground">Available plans</h2>
          <p className="text-sm text-muted-foreground">Choose the plan that fits your exam goals. Cancel anytime.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = subscription?.plan_code === plan.code;
            const c = COLOR_CLASSES[plan.color];
            return (
              <div
                key={plan.code}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  plan.highlighted
                    ? `ring-2 ${c.ring} border-transparent ${c.bg} shadow-lg`
                    : "border-border bg-card hover:border-border/80 hover:shadow-md"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-black text-white shadow-sm`}
                      style={{ background: `linear-gradient(135deg, ${plan.gradientFrom}, ${plan.gradientTo})` }}>
                      <Star className="h-2.5 w-2.5 fill-current" /> {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${c.bg} ring-1 ${c.ring}`}>
                      <plan.icon className={`h-4.5 w-4.5 ${c.text}`} />
                    </div>
                    <p className={`text-sm font-black uppercase tracking-widest ${c.text}`}>{plan.name}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tight text-foreground">{plan.price_tnd}</span>
                    <span className="text-sm font-semibold text-muted-foreground">TND{plan.period}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
                </div>

                {/* Features */}
                <ul className="mb-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-foreground leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Current plan
                  </div>
                ) : (
                  <button
                    disabled
                    title="Stripe integration coming soon — contact support to subscribe"
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${c.btn}`}
                  >
                    <CreditCard className="h-4 w-4" />
                    {subscription ? "Switch plan" : "Start free trial"}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Benefits overview ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Zap,       title: "Instant access",     desc: "Full access granted the moment your trial starts.",              color: "text-amber-500 bg-amber-500/10" },
          { icon: Shield,    title: "Secure payments",    desc: "Stripe-powered — your card details are never stored here.",       color: "text-blue-500 bg-blue-500/10"   },
          { icon: RefreshCw, title: "Cancel anytime",     desc: "No lock-in. Cancel in one click, no questions asked.",           color: "text-emerald-500 bg-emerald-500/10" },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.color.split(" ")[1]}`}>
              <item.icon className={`h-4.5 w-4.5 ${item.color.split(" ")[0]}`} />
            </div>
            <p className="font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Quick links ───────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Link to="/profile" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <BookOpen className="h-4 w-4" /> Profile
        </Link>
        <Link to="/security" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Shield className="h-4 w-4" /> Security settings
        </Link>
        <Link to="/notifications" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <TrendingUp className="h-4 w-4" /> Notifications
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Stripe payment integration will activate once your Stripe account is connected via Admin → Settings.
        <br />
        During this phase, free trials are granted automatically at registration.
      </p>
    </div>
  );
}
