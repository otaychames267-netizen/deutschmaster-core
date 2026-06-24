import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import i18n from "@/lib/i18n";
import {
  BookOpen, Headphones, PenLine, Mic, GraduationCap,
  Globe, Moon, Sun, ChevronRight, Check, Star, ArrowRight, Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const PLANS = [
  {
    key: "schriftlich",
    name: "Schriftlich",
    price: "€6",
    period: "/mo",
    descKey: "pricing.schriftlich_desc",
    features: ["Lesen — Teil 1, 2, 3", "Hören — Teil 1, 2, 3", "Sprachbausteine — Teil 1, 2", "Schreiben — Beschwerde & Bitte"],
    highlighted: false,
  },
  {
    key: "komplett",
    name: "Komplett",
    price: "€12",
    period: "/mo",
    descKey: "pricing.komplett_desc",
    features: ["Everything in Schriftlich", "Mündlich — Vorbereitung", "Prüfungssimulation — full", "Priority support"],
    highlighted: true,
  },
  {
    key: "muendlich",
    name: "Mündlich",
    price: "€6",
    period: "/mo",
    descKey: "pricing.muendlich_desc",
    features: ["Präsentation practice", "Gespräch simulation", "Gemeinsam planen", "Speaking feedback"],
    highlighted: false,
  },
];

const FEATURE_LIST = [
  { icon: BookOpen,  key: "reading",        colorClass: "text-blue-500" },
  { icon: Headphones, key: "listening",     colorClass: "text-violet-500" },
  { icon: PenLine,  key: "sprachbausteine", colorClass: "text-emerald-500" },
  { icon: PenLine,  key: "writing",         colorClass: "text-amber-500" },
  { icon: Mic,      key: "speaking",        colorClass: "text-rose-500" },
  { icon: Globe,    key: "multi",           colorClass: "text-cyan-500" },
];

const STATS = [
  { value: "10,000+", label: "Students" },
  { value: "500+",    label: "Practice exams" },
  { value: "7",       label: "Languages" },
  { value: "94%",     label: "Pass rate" },
];

function Navbar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            AuraLingovia
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">{t("nav.features")}</a>
          <a href="#pricing" className="transition-colors hover:text-foreground">{t("nav.pricing")}</a>
          <a href="#faq" className="transition-colors hover:text-foreground">{t("nav.faq")}</a>
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Language picker */}
          <div className="relative hidden sm:block">
            <select
              className="cursor-pointer appearance-none rounded-md border border-border bg-background py-1.5 pl-3 pr-7 text-xs text-muted-foreground transition-colors hover:border-primary focus:outline-none"
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
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("nav.dashboard")} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("nav.login")}
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("hero.cta_trial")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { t } = useTranslation();

  return (
    <section className="hero-gradient relative overflow-hidden pb-24 pt-20 sm:pb-32 sm:pt-28">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
          <Zap className="h-3.5 w-3.5 text-gold" />
          TELC B1 & B2 — Professional Exam Preparation
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {t("app.name")}
          <br />
          <span className="gradient-text">{t("hero.subtitle")}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {t("hero.description")}
        </p>

        {/* CTA buttons */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            {t("hero.cta_trial")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted hover:-translate-y-0.5"
          >
            {t("hero.cta_plans")}
          </a>
        </div>

        {/* Trust badge */}
        <p className="mt-5 text-xs text-muted-foreground">
          3-day free trial · No credit card required · Cancel anytime
        </p>
      </div>

      {/* Stats bar */}
      <div className="mx-auto mt-16 max-w-3xl px-4">
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card/60 p-6 shadow-sm backdrop-blur-sm sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold tracking-tight text-foreground">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const { t } = useTranslation();

  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("features.title")}
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Every component of the TELC exam — covered, structured, practiced.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_LIST.map(({ icon: Icon, key, colorClass }) => (
            <div
              key={key}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${colorClass}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{t(`features.${key}`)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(`features.${key}_desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const { t } = useTranslation();

  return (
    <section id="pricing" className="bg-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("pricing.title")}
          </h2>
          <p className="mt-3 text-base text-muted-foreground">{t("pricing.trial")}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${
                plan.highlighted
                  ? "border-primary bg-primary text-primary-foreground shadow-xl shadow-primary/20"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold px-3 py-0.5 text-xs font-semibold text-gold-foreground">
                    <Star className="h-3 w-3" /> Best value
                  </span>
                </div>
              )}

              <div className="mb-4">
                <p className={`text-xs font-medium uppercase tracking-widest ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.name}
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className={`text-4xl font-bold tracking-tight ${plan.highlighted ? "text-primary-foreground" : "text-foreground"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`mt-2 text-xs ${plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {t(plan.descKey)}
                </p>
              </div>

              <ul className="mb-6 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? "text-primary-foreground" : "text-emerald-500"}`} />
                    <span className={plan.highlighted ? "text-primary-foreground/90" : "text-foreground"}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                  plan.highlighted
                    ? "bg-white text-primary hover:bg-white/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {t("pricing.choose")} <ChevronRight className="ml-1.5 h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const { t } = useTranslation();
  const items = [
    { q: "What is included in the free trial?", a: "You get full access to all features for 3 days. No credit card required. After the trial, choose a plan that fits your preparation goals." },
    { q: "Can I switch between TELC B1 and B2?", a: "Yes. You can change your level at any time from your profile settings. Your progress in each level is tracked separately." },
    { q: "How does the PDF Import Engine work?", a: "Admins upload official TELC exam PDFs. Our engine extracts the exam structure, questions, and answer keys automatically. Answer keys are always stored separately and never shown to students before submission." },
    { q: "Is my payment information secure?", a: "Payments are processed by Stripe, the industry standard for secure payment processing. We never store your card details." },
    { q: "Which languages is the platform available in?", a: "The interface is available in English, German, Arabic, French, Spanish, Italian, and Turkish. German content is always in German as required for exam preparation." },
  ];

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("faq.title")}
        </h2>
        <div className="mt-12 space-y-4">
          {items.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-border bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-medium text-foreground">
                {item.q}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="px-5 pb-5 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">AuraLingovia</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <Link to="/privacy"  className="hover:text-foreground">{t("footer.privacy")}</Link>
            <Link to="/terms"    className="hover:text-foreground">{t("footer.terms")}</Link>
            <Link to="/refund"   className="hover:text-foreground">{t("footer.refund")}</Link>
            <Link to="/cookies"  className="hover:text-foreground">{t("footer.cookies")}</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AuraLingovia. {t("footer.rights")}.
          </p>
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
