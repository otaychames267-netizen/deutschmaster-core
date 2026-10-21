import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { createManualPaymentOrder, type ManualMethod } from "@/lib/payment/manual-orders.functions";
import { isPlanPurchasable } from "@/lib/features";
import { toast } from "sonner";
import {
  CreditCard, CheckCircle2, AlertCircle, Star,
  Check, Shield, Zap, Clock, RefreshCw,
  Award, Gem, Calendar, TrendingUp, BookOpen,
  Mic, PenLine, ChevronRight, ArrowUpRight, Loader2,
  Landmark, Smartphone, Building2, ShieldCheck,
} from "lucide-react";
import { PlanBenefits, SCHRIFTLICH_BENEFITS, KOMPLETT_BENEFITS, schriftlichBenefits, type PlanBenefit } from "@/components/plans/PlanBenefits";
import { TermToggle, PriceBlock } from "@/components/plans/PlanPrice";
import { PlanHeader, PlanDivider } from "@/components/plans/PlanCard";
import { usePlanPricing, termOf, availableMonths, type Months, type SellablePlan } from "@/lib/plans/pricing";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
});

/* ── Plan definitions ─────────────────────────────────────────── */
const PLANS = [
  {
    code: "schriftlich",
    name: "Gold",
    tag: "Schriftlich + Mündlich" as string | null,
    icon: Award,
    tagline: "Written exam + Mündlich preparation, no AI",
    taglineAr: null as string | null,
    color: "violet",
    gradientFrom: "#6d28d9",
    gradientTo: "#8b5cf6",
    features: [] as string[],
    benefits: SCHRIFTLICH_BENEFITS as PlanBenefit[] | null,
    highlighted: true,
    badge: "TELC B2 preparation" as string | null,
  },
  {
    code: "komplett_ai",
    name: "Platinum",
    tag: "Komplett · mit KI" as string | null,
    icon: Gem,
    tagline: "Everything in Gold + your own AI examiner and practice partner",
    taglineAr: null as string | null,
    benefits: KOMPLETT_BENEFITS as PlanBenefit[] | null,
    color: "violet",
    gradientFrom: "#6d28d9",
    gradientTo: "#8b5cf6",
    features: [] as string[],
    highlighted: true,
    badge: "Most complete" as string | null,
  },
];

/** How an active subscription's plan code is shown to the student. */
const PLAN_DISPLAY: Record<string, string> = {
  schriftlich: "Gold — Schriftlich + Mündlich (ohne KI)",
  komplett: "Komplett",
  komplett_ai: "Platinum — Komplett mit KI-Sprachtrainer",
  muendlich: "Mündlich",
  premium: "Premium",
};

/** The three ways a student can pay today — all manual transfers verified by our team (the order screen then shows the account details). */
const PAYMENT_METHODS: { id: ManualMethod; name: string; note: string; icon: typeof Landmark }[] = [
  { id: "d17", name: "D17 Mobile Transfer", note: "Pay from your phone", icon: Smartphone },
  { id: "postal", name: "Virement Postal", note: "La Poste Tunisienne", icon: Landmark },
  { id: "bancaire", name: "Virement Bancaire", note: "Bank transfer (RIB)", icon: Building2 },
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
  const { user, level: profileLevel } = useAuth();
  const nav = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [d17Disabled, setD17Disabled] = useState(false);
  const [manualPlan, setManualPlan] = useState<string | null>(null);
  const [manualMethod, setManualMethod] = useState<ManualMethod | null>(null);
  const pricing = usePlanPricing();
  const [months, setMonths] = useState<Months>(1);

  async function handleManualPayment(planCode: SellablePlan, method: ManualMethod) {
    setManualPlan(planCode);
    setManualMethod(method);
    try {
      const order = await createManualPaymentOrder({ data: { plan_code: planCode, method, months } });
      nav({ to: "/paiement/$orderId", params: { orderId: order.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start payment. Please try again.");
      setManualPlan(null);
      setManualMethod(null);
    }
  }

  useEffect(() => {
    supabase
      .rpc("get_platform_setting", { p_key: "d17_disabled" })
      .then(({ data }) => setD17Disabled(data === true));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("subscriptions")
      .select("status, plan_code, expires_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setSubscription(data);
        setLoading(false);
      });
  }, [user?.id]);

  const isActive = subscription?.status === "active";
  // Launch gate: only sellable plans are shown. While Mündlich is disabled,
  // this is just Schriftlich (Komplett/Mündlich both grant speaking access).
  // Platinum (the AI Sprachtrainer) exists for B2 only: a B1 student is offered Gold alone.
  const visiblePlans = PLANS.filter((p) => isPlanPurchasable(p.code) && !(profileLevel === "TELC_B1" && p.code === "komplett_ai"));
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
      {!loading && isActive && subscription && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-foreground text-base">Active Subscription</p>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Plan: <span className="font-semibold text-foreground">{PLAN_DISPLAY[subscription.plan_code] ?? subscription.plan_code}</span>
                  {renewDate ? ` · Renews ${renewDate}` : ""}
                </p>
              </div>
            </div>

            {/* Days remaining counter */}
            <div className="flex flex-col items-center rounded-2xl px-6 py-3 text-center bg-emerald-500/10">
              <p className="text-3xl font-black text-emerald-500">
                {daysLeft}
              </p>
              <p className="text-xs font-semibold text-muted-foreground">days remaining</p>
            </div>
          </div>

          {/* Renewal date warning */}
          {daysLeft <= 7 && (
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
              Choose a plan below to unlock practice exercises, exam simulations, and AI features.
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
        {availableMonths(pricing).length > 1 && (
          <div className="mt-6 pb-1">
            <TermToggle months={months} onChange={setMonths} pricing={pricing} />
          </div>
        )}

        <div className={`grid gap-5 pt-4 ${visiblePlans.length === 1 ? "mx-auto max-w-md grid-cols-1" : "mx-auto max-w-4xl md:grid-cols-2"}`}>
          {visiblePlans.map((plan) => {
            const isCurrent = subscription?.plan_code === plan.code;
            const c = COLOR_CLASSES[plan.color];
            const premium = !!plan.benefits;
            return (
              <div
                key={plan.code}
                className={`relative flex flex-col rounded-2xl border transition-all ${
                  premium
                    ? `border-gold/45 bg-card shadow-xl shadow-black/10${plan.code === "komplett_ai" ? " tier-platinum" : ""}`
                    : `p-6 ${plan.highlighted
                        ? `ring-2 ${c.ring} border-transparent ${c.bg} shadow-lg`
                        : "border-border bg-card hover:border-border/80 hover:shadow-md"}`
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-black shadow-sm ${premium ? "bg-gold text-gold-foreground" : "text-white"}`}
                      style={premium ? undefined : { background: `linear-gradient(135deg, ${plan.gradientFrom}, ${plan.gradientTo})` }}>
                      <Star className="h-2.5 w-2.5 fill-current" /> {plan.code === "schriftlich" ? (profileLevel === "TELC_B1" ? "TELC B1 preparation" : profileLevel === "TELC_B2" ? "TELC B2 preparation" : "TELC B1 & B2 preparation") : plan.badge}
                    </span>
                  </div>
                )}

                <div className={premium ? `plan-premium plan-premium--top flex-1 rounded-t-2xl p-6 sm:p-7${plan.code === "komplett_ai" ? " plan-premium--platinum" : ""}` : "flex flex-1 flex-col"}>
                {/* Plan header */}
                <div className="mb-1">
                  <PlanHeader name={plan.name} tag={plan.tag} tagline={plan.tagline} icon={plan.icon} />
                  <div className="mt-6 md:min-h-[9.5rem]">
                    <PriceBlock term={termOf(pricing, plan.code as SellablePlan, months)} offerEndsAt={pricing[plan.code as SellablePlan].offerEndsAt} />
                  </div>
                  <PlanDivider />
                </div>

                {/* Features */}
                <div className={premium ? "space-y-3" : "mb-5 flex-1 space-y-3"}>
                  {plan.benefits && <PlanBenefits benefits={plan.code === "schriftlich" ? schriftlichBenefits(profileLevel === "TELC_B1" || profileLevel === "TELC_B2" ? profileLevel : "BOTH") : plan.benefits} accent={c} onPrimary={premium} />}
                  {plan.benefits ? null : (
                    <ul className="space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <span className="text-foreground leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                </div>

                {/* CTA */}
                <div className={premium ? "p-6" : ""}>
                {isCurrent ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Current plan
                  </div>
                ) : !pricing[plan.code as SellablePlan].open ? (
                  <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-4 text-center">
                    <p className="text-sm font-bold text-foreground">Opens this evening</p>
                    <p dir="rtl" lang="ar" className="mt-1 text-sm font-semibold text-foreground">يفتح هذا المساء</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">We are finishing the last checks on the AI Sprachtrainer. You will be able to subscribe to Platinum here as soon as it opens.</p>
                  </div>
                ) : (
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Choose how to pay</p>
                    <p className="mb-2.5 text-xs text-muted-foreground">
                      You pay <b className="text-foreground">{termOf(pricing, plan.code as SellablePlan, months).price} TND</b> once for {months === 1 ? "1 month" : `${months} months`} of access.
                    </p>
                    <div className="space-y-2">
                      {PAYMENT_METHODS.map((m) => {
                        const unavailable = m.id === "d17" && d17Disabled;
                        const busy = manualPlan === plan.code && manualMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleManualPayment(plan.code as SellablePlan, m.id)}
                            disabled={manualPlan !== null || unavailable}
                            title={unavailable ? "D17 is temporarily unavailable — please use another method." : `Pay with ${m.name}, then send your receipt on WhatsApp.`}
                            className={`group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:shadow-none ${premium ? "hover:border-gold/60" : "hover:border-foreground/25"}`}
                          >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${premium ? (plan.code === "komplett_ai" ? "bg-slate-500/15 text-slate-600 dark:text-slate-300" : "bg-gold/15 text-amber-600 dark:text-amber-400") : `${c.bg} ${c.text}`}`}>
                              <m.icon className="h-4.5 w-4.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold leading-tight text-foreground">{m.name}</span>
                              <span className="block text-xs text-muted-foreground">{unavailable ? "Temporarily unavailable" : m.note}</span>
                            </span>
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-disabled:hidden" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[11px] leading-snug text-muted-foreground">
                      <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>Verified by our team before access is granted — usually within minutes.</span>
                    </p>
                  </div>
                )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Benefits overview ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Zap,       title: "Fast verification",  desc: "Send your receipt on WhatsApp — most payments are confirmed within minutes.",  color: "text-amber-500 bg-amber-500/10" },
          { icon: Shield,    title: "Secure by design",   desc: "Your payment is reviewed before any access is granted — we never store card details.", color: "text-blue-500 bg-blue-500/10"   },
          { icon: RefreshCw, title: "Cancel anytime",     desc: "No lock-in. Contact support and we'll cancel it right away, no questions asked.", color: "text-emerald-500 bg-emerald-500/10" },
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
        After you pay, send your receipt on WhatsApp — payments are verified by our team, usually within moments (up to 8 working hours if a manual review is needed).
      </p>
    </div>
  );
}
