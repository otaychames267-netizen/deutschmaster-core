import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/BrandMark";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { MUENDLICH_ENABLED, isPlanPurchasable, LEMONSQUEEZY_VISIBLE, CARD_PAYMENTS_ENABLED } from "@/lib/features";
import { useMuendlichVisible } from "@/lib/useMuendlichVisible";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import i18n from "@/lib/i18n";
import {
  BookOpen, Headphones, PenLine, Mic,
  Globe, Moon, Sun, ChevronRight, Check, Star, ArrowRight,
  Zap, Shield, Clock, TrendingUp, Award, Play,
  ChevronDown, Menu, X, Landmark, CreditCard,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

/* ─── Data ─────────────────────────────────────────────────────────── */

const PLANS = [
  {
    key: "schriftlich",
    name: "Schriftlich",
    price: "30",
    period: " TND",
    desc: "Master all written exam components",
    features: [
      "Lesen — Teil 1, 2, 3",
      "Hören — Teil 1, 2, 3",
      "Sprachbausteine — Teil 1, 2",
      "Schreiben — Beschwerde & Bitte",
    ],
    highlighted: false,
    badge: null,
    save: null,
  },
  {
    key: "komplett",
    name: "Komplett",
    price: "30",
    period: " TND",
    desc: "Complete preparation for both written and spoken",
    features: [
      "Lesen, Hören, Sprachbausteine & Schreiben",
      "Mündlich — full preparation",
      "Full exam simulations",
      "Priority support",
      "Progress analytics",
    ],
    highlighted: true,
    badge: "Full access",
    save: null,
  },
  {
    key: "muendlich",
    name: "Mündlich",
    price: "55",
    period: " TND",
    desc: "Perfect your speaking and oral skills",
    features: [
      "Präsentation practice",
      "Gespräch simulation",
      "Gemeinsam planen",
      "AI-powered feedback",
    ],
    highlighted: false,
    badge: null,
    save: null,
  },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "Lesen",
    desc: "Three reading modules with authentic TELC-style texts and multiple-choice questions.",
    color: "bg-blue-500/10 text-blue-500",
    border: "hover:border-blue-500/30",
  },
  {
    icon: Headphones,
    title: "Hören",
    desc: "Real listening comprehension with timed audio and structured answer formats.",
    color: "bg-violet-500/10 text-violet-500",
    border: "hover:border-violet-500/30",
  },
  {
    icon: PenLine,
    title: "Sprachbausteine",
    desc: "Vocabulary-in-context exercises covering all grammar patterns tested in TELC.",
    color: "bg-emerald-500/10 text-emerald-500",
    border: "hover:border-emerald-500/30",
  },
  {
    icon: PenLine,
    title: "Schreiben",
    desc: "Guided writing tasks — formal complaint letters, requests, and structured responses.",
    color: "bg-amber-500/10 text-amber-500",
    border: "hover:border-amber-500/30",
  },
  {
    icon: Mic,
    title: "Mündlich",
    desc: "Presentation, conversation, and collaborative planning — all exam scenarios covered.",
    color: "bg-rose-500/10 text-rose-500",
    border: "hover:border-rose-500/30",
  },
  {
    icon: TrendingUp,
    title: "Analytics",
    desc: "Track your progress, identify weak spots, and see your readiness score improve.",
    color: "bg-cyan-500/10 text-cyan-500",
    border: "hover:border-cyan-500/30",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Get started",
    desc: "Set your exam date to activate a personalised TELC B2 study plan.",
  },
  {
    number: "02",
    title: "Practice every section",
    desc: "Work through Lesen, Hören, Schreiben, Sprachbausteine, and Mündlich — in any order.",
  },
  {
    number: "03",
    title: "Simulate the real exam",
    desc: "Take a full timed Prüfungssimulation and receive an instant, detailed score report.",
  },
];

const STATS = [
  { value: "500+", label: "Practice exercises", icon: BookOpen },
  { value: "4",    label: "Exam sections live", icon: Award },
  { value: "7",    label: "UI languages",       icon: Globe },
];

const FAQ_ITEMS = [
  {
    q: "Which exam level does AuraLingovia cover?",
    a: "AuraLingovia currently focuses exclusively on TELC B2, with every section — Lesen, Hören, Sprachbausteine, Schreiben, and Mündlich — built to that standard.",
  },
  {
    q: "How is my score calculated?",
    a: "After each exam simulation, our engine checks your answers against the official TELC answer key structure and returns a score broken down by section — identical to how the real exam is graded.",
  },
  {
    q: "Is payment secure?",
    a: "Yes. Students in Tunisia can pay via D17 mobile transfer, verified by our team — usually within moments, up to 8 working hours for manual review. Card payments via Lemon Squeezy are coming soon; your card details are never stored on our servers.",
  },
  {
    q: "Which languages is the interface available in?",
    a: "English, German, Arabic, French, Spanish, Italian, and Turkish. All German-language exam content remains in German as required for authentic preparation.",
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes — contact support any time and we'll cancel your subscription right away, no questions asked and no hidden fees. Your access remains active until the end of the billing period you've already paid for.",
  },
];

/* ─── Navbar ────────────────────────────────────────────────────────── */

function Navbar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-sm">
            <BrandMark className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            <span className="bg-gradient-to-br from-[#a9782c] via-[#e7bb54] to-[#9c6d28] bg-clip-text text-transparent">Aura</span>
            <span className="text-foreground">Lingovia</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
          <a href="#features" className="transition-colors hover:text-foreground">{t("nav.features")}</a>
          <a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#pricing" className="transition-colors hover:text-foreground">{t("nav.pricing")}</a>
          <a href="#faq" className="transition-colors hover:text-foreground">{t("nav.faq")}</a>
          <Link to="/contact" className="transition-colors hover:text-foreground">{t("nav.contact")}</Link>
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2.5">
          {/* Language picker */}
          <div className="relative hidden sm:block">
            <select
              className="cursor-pointer appearance-none rounded-lg border border-border bg-background py-1.5 pl-3 pr-7 text-xs text-muted-foreground transition-colors hover:border-primary/40 focus:outline-none"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
              ))}
            </select>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <Link
              to="/dashboard"
              className="hidden items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 sm:inline-flex"
            >
              Dashboard <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("nav.login")}
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-background/95 px-4 pb-4 pt-2 lg:hidden">
          <nav className="flex flex-col gap-1">
            {["features", "how-it-works", "pricing", "faq"].map((id) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {id === "how-it-works" ? "How it works" : id.charAt(0).toUpperCase() + id.slice(1)}
              </a>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t("nav.contact")}
            </Link>
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ─── Hero ──────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="hero-gradient relative overflow-hidden pb-28 pt-20 sm:pb-36 sm:pt-32">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-gold/5 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        {/* Badge */}
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
          <Zap className="h-3.5 w-3.5 text-gold" />
          TELC B2 · Professional Exam Preparation
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Ace your German exam
          <br />
          <span className="gradient-text">with confidence</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          AuraLingovia covers every section of the TELC B2 exam — Lesen,
          Hören, Schreiben, Sprachbausteine, and Mündlich — with authentic
          practice material and full exam simulations.
        </p>

        {/* CTA buttons */}
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-primary/30"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-7 py-3.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted"
          >
            <Play className="h-4 w-4 fill-current" />
            See how it works
          </a>
        </div>

        {/* Trust line */}
        <p className="mt-5 text-xs text-muted-foreground">
          Secure payments · Cancel anytime
        </p>
      </div>

      {/* Stats bar */}
      <div className="relative mx-auto mt-20 max-w-3xl px-4">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-md sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center gap-1 bg-card/80 px-4 py-5 backdrop-blur-sm">
              <s.icon className="mb-0.5 h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold tracking-tight text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ──────────────────────────────────────────────────── */

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Simple process
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From signup to exam-ready in days
          </h2>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={i} className="relative flex flex-col">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="absolute left-8 top-8 hidden h-px w-full bg-border sm:block" />
              )}
              <div className="relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                <span className="font-mono text-xl font-bold text-primary">{step.number}</span>
              </div>
              <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ──────────────────────────────────────────────────────── */

function Features() {
  const muendlichVisible = useMuendlichVisible();
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            What's covered
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Every exam section. Fully covered.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            AuraLingovia is the only platform built exclusively around the TELC B2 exam structure — nothing extra, nothing missing.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Mündlich card is hidden until the speaking module ships (features.ts),
              with a per-account developer preview for admins via useMuendlichVisible. */}
          {FEATURES.filter((f) => muendlichVisible || f.title !== "Mündlich").map((f) => (
            <div
              key={f.title}
              className={`group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-md ${f.border}`}
            >
              <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Trust signals row */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          {[
            { icon: Shield, text: "Bank-grade security" },
            { icon: Clock, text: "Instant access after signup" },
            { icon: Globe, text: "Available in 7 languages" },
            { icon: Award, text: "Built to the real TELC B2 exam structure" },
          ].map((t) => (
            <div key={t.text} className="flex items-center gap-1.5">
              <t.icon className="h-3.5 w-3.5 text-primary" />
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ───────────────────────────────────────────────────────── */

function Pricing() {
  const { t } = useTranslation();

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Simple pricing
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("pricing.title")}
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Choose the plan that matches your exam goals.
          </p>
        </div>

        {/* Only purchasable plans are shown. While Mündlich is disabled, that's
            Schriftlich alone — Komplett/Mündlich both grant speaking access. */}
        <div className={`mt-12 grid gap-6 ${MUENDLICH_ENABLED ? "sm:grid-cols-3" : "mx-auto max-w-sm"}`}>
          {PLANS.filter((plan) => isPlanPurchasable(plan.key)).map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl border p-7 transition-all hover:-translate-y-1 hover:shadow-xl ${
                plan.highlighted
                  ? "border-primary bg-primary text-primary-foreground shadow-xl shadow-primary/20"
                  : "border-border bg-card"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold px-3 py-0.5 text-xs font-semibold text-gold-foreground shadow-sm">
                    <Star className="h-3 w-3 fill-current" /> {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className={`text-xs font-semibold uppercase tracking-widest ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.name}
                </p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`text-4xl font-bold tracking-tight ${plan.highlighted ? "text-primary-foreground" : "text-foreground"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`mt-2 text-xs leading-relaxed ${plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {plan.desc}
                </p>
                {plan.save && (
                  <p className="mt-3 inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-xs font-semibold text-primary-foreground">
                    <Star className="h-3 w-3 fill-current" /> {plan.save}
                  </p>
                )}
              </div>

              <ul className="mb-7 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? "text-primary-foreground" : "text-emerald-500"}`} />
                    <span className={plan.highlighted ? "text-primary-foreground/90" : "text-foreground"}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                  plan.highlighted
                    ? "bg-white text-primary shadow-sm hover:bg-white/95"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                Get Started <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>

        {/* Guarantee note */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Cancel anytime — no questions asked.
        </p>

        {/* Accepted payment methods */}
        <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card/50 px-6 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Accepted payment methods
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Landmark className="h-4 w-4 text-muted-foreground" /> D17 Mobile Transfer
            </div>
            {LEMONSQUEEZY_VISIBLE && (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-muted-foreground" /> Lemon Squeezy
                {!CARD_PAYMENTS_ENABLED && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    Coming soon
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ───────────────────────────────────────────────────────────── */

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="border-t border-border bg-muted/20 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            FAQ
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Common questions
          </h2>
        </div>

        <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="border-t border-border bg-muted/30 px-6 py-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Banner ────────────────────────────────────────────────────── */

function CTABanner() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center shadow-2xl shadow-primary/20 sm:px-14">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,oklch(1_0_0/0.08),transparent)]" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
              <Zap className="h-3.5 w-3.5 text-gold" />
              Start for free today
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your exam preparation starts now
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
              Structured, exam-aligned practice for every part of the TELC B2 exam — start today.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-primary shadow-lg transition-all hover:-translate-y-0.5 hover:bg-white/95"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/15"
              >
                View plans
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────────────────── */

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm">
                <BrandMark className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">
                <span className="bg-gradient-to-br from-[#a9782c] via-[#e7bb54] to-[#9c6d28] bg-clip-text text-transparent">Aura</span>
                <span className="text-foreground">Lingovia</span>
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Professional TELC B2 exam preparation. Structured, authentic, effective.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Platform</p>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>

          {/* Account */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Account</p>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
              <Link to="/register" className="hover:text-foreground transition-colors">Create account</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Legal</p>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
              <Link to="/refund" className="hover:text-foreground transition-colors">{t("footer.refund")}</Link>
              <Link to="/cookies" className="hover:text-foreground transition-colors">{t("footer.cookies")}</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AuraLingovia. {t("footer.rights")}.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            Secured by Supabase · Payments via D17 & Lemon Squeezy
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Pricing />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
