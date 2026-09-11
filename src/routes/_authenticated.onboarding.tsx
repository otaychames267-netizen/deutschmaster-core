import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { GraduationCap, Loader2, Moon, Sun, CheckCircle2, BookOpen, Headphones, PenLine, Mic } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

type Level = "TELC_B1" | "TELC_B2";

// This is the only place level is ever set, once, for the lifetime of the
// account (see src/lib/useActiveLevel.ts) — an existing account can't switch
// levels here after onboarding, only by leaving its course via /dashboard.
// Gradients match the admin course-switcher's palette (_authenticated.dashboard.tsx)
// so the same level reads as the same color everywhere in the app.
// cefrStep marks how far along the six-level CEFR scale (A1..C2) this course
// sits — real signal about relative difficulty, not a decorative dot row.
const LEVELS: { value: Level; labelKey: string; descKey: string; badge: string; gradient: string; ring: string; cefrStep: number }[] = [
  {
    value: "TELC_B1",
    labelKey: "onboarding.b1",
    descKey: "onboarding.b1_desc",
    badge: "B1",
    gradient: "from-blue-600 via-blue-500 to-cyan-500",
    ring: "ring-blue-500/40",
    cefrStep: 3,
  },
  {
    value: "TELC_B2",
    labelKey: "onboarding.b2",
    descKey: "onboarding.b2_desc",
    badge: "B2",
    gradient: "from-rose-700 via-rose-500 to-pink-400",
    ring: "ring-rose-500/40",
    cefrStep: 4,
  },
];

const CEFR_SCALE = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SKILL_ICONS = [BookOpen, Headphones, PenLine, Mic];

function OnboardingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  const [selected, setSelected] = useState<Level | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleContinue() {
    if (!selected || !user) return;
    setLoading(true);

    // upsert + .select().single(), not .update(): a plain UPDATE whose
    // WHERE/RLS predicate matches zero rows (e.g. no profiles row exists yet
    // for this user) returns error: null with 0 rows changed in PostgREST —
    // a silent no-op that looked like success, sent the user to /dashboard,
    // got bounced straight back here by _authenticated.tsx's onboarding
    // check, and reset `selected` to null. Confirmed live: this is why
    // users got permanently stuck in an onboarding loop with no error ever
    // shown. .select().single() throws a real, catchable error whenever the
    // write didn't actually land.
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, level: selected, target_level: selected, onboarding_completed: true },
        { onConflict: "id" },
      )
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }

    toast.success("Level set! Welcome to AuraLingovia.");
    // A real navigation, not TanStack Router's client-side nav(): _authenticated.tsx's
    // onboarding-check effect only depends on [user?.id, emailVerified] (deliberately, to
    // avoid an earlier documented bug — see that file's comment history), so a client-side
    // nav() here does NOT re-run it. checkedForRef is already claimed for this user from the
    // FIRST check (which correctly found needsOnboarding=true before this form was filled),
    // so the stale needsOnboarding=true state persists and the declarative <Navigate> guard
    // bounces the user straight back to /onboarding — reproduced live: every single
    // onboarding completion looped back to this page instead of reaching the dashboard. A
    // hard navigation forces _authenticated.tsx to remount and re-fetch the profile fresh,
    // the same fix already proven reliable for the analogous problem in login.tsx.
    window.location.href = "/dashboard";
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Ambient background wash — fixed, decorative only, never blocks content or scroll. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-[100px] dark:bg-blue-500/[0.08]" />
        <div className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-rose-500/10 blur-[100px] dark:bg-rose-500/[0.08]" />
      </div>

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">AuraLingovia</span>
        </div>
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-3xl">
          {/* Progress indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <div className="h-2 w-8 rounded-full bg-primary" />
            <div className="h-2 w-2 rounded-full bg-muted" />
          </div>

          <h1 className="text-balance text-center text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {t("onboarding.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-balance text-center text-sm text-muted-foreground sm:text-base">
            {t("onboarding.subtitle")}
          </p>

          {/* Level cards — two clearly separate, equally-weighted premium
              choices, never a connected pair: full gap-6/gap-8 between them
              at every breakpoint, each its own elevated surface. */}
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
            {LEVELS.map((level) => {
              const isSelected = selected === level.value;
              return (
                <button
                  key={level.value}
                  onClick={() => setSelected(level.value)}
                  aria-pressed={isSelected}
                  className={`group relative flex flex-col items-start gap-5 overflow-hidden rounded-3xl border-2 p-7 text-left transition-all duration-300 ease-out sm:p-8 ${
                    isSelected
                      ? `border-transparent bg-gradient-to-br ${level.gradient} text-white shadow-xl ring-4 ${level.ring} hover:-translate-y-1.5 hover:shadow-2xl`
                      : "border-border bg-card text-foreground hover:-translate-y-1 hover:border-foreground/20 hover:shadow-xl"
                  }`}
                >
                  {/* Decorative glow + dot texture, selected state only. */}
                  {isSelected && (
                    <>
                      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
                      <div
                        className="pointer-events-none absolute inset-0 opacity-[0.06]"
                        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "22px 22px" }}
                      />
                    </>
                  )}

                  <div className="relative flex w-full items-start justify-between">
                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black transition-transform duration-300 group-hover:scale-105 ${
                        isSelected ? "bg-white/20 text-white ring-1 ring-white/25 backdrop-blur-sm" : "bg-muted text-foreground"
                      }`}
                    >
                      {level.badge}
                    </div>
                    <CheckCircle2
                      className={`h-6 w-6 shrink-0 transition-all duration-300 ${
                        isSelected ? "scale-100 text-white opacity-100" : "scale-75 text-transparent opacity-0"
                      }`}
                    />
                  </div>

                  <div className="relative">
                    <p className="text-xl font-black tracking-tight sm:text-2xl">{t(level.labelKey)}</p>
                    <p className={`mt-1.5 text-sm ${isSelected ? "text-white/75" : "text-muted-foreground"}`}>
                      {t(level.descKey)}
                    </p>
                  </div>

                  {/* CEFR ladder — real signal (this course's position on the
                      six-level European scale), not a decorative dot row. */}
                  <div className="relative mt-auto w-full pt-1">
                    <div className="flex gap-1">
                      {CEFR_SCALE.map((step, i) => (
                        <div
                          key={step}
                          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                            i < level.cefrStep
                              ? isSelected ? "bg-white" : "bg-foreground/70"
                              : isSelected ? "bg-white/25" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <div className={`mt-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-white/60" : "text-muted-foreground/70"}`}>
                      <span>A1</span>
                      <span className={isSelected ? "text-white" : "text-foreground"}>{level.badge}</span>
                      <span>C2</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* What's included */}
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-border bg-card/60 px-6 py-5 backdrop-blur-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Includes
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm text-foreground sm:grid-cols-3">
              {["Lesen", "Hören", "Sprachbausteine", "Schreiben", "Mündlich", "Prüfungssimulation"].map((item, i) => {
                const Icon = SKILL_ICONS[i % SKILL_ICONS.length];
                return (
                  <span key={item} className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-primary" /> {item}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="mx-auto mt-7 max-w-2xl">
            <button
              onClick={handleContinue}
              disabled={!selected || loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("onboarding.continue")}
            </button>
            {!selected && (
              <p className="mt-2.5 text-center text-xs text-muted-foreground">
                Please select your exam level to continue.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
