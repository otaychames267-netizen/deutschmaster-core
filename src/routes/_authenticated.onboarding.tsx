import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { GraduationCap, Loader2, Moon, Sun, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

type Level = "TELC_B1" | "TELC_B2";

const LEVELS: { value: Level; labelKey: string; descKey: string; badge: string }[] = [
  {
    value: "TELC_B1",
    labelKey: "onboarding.b1",
    descKey: "onboarding.b1_desc",
    badge: "B1",
  },
  {
    value: "TELC_B2",
    labelKey: "onboarding.b2",
    descKey: "onboarding.b2_desc",
    badge: "B2",
  },
];

function OnboardingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();

  const [selected, setSelected] = useState<Level | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleContinue() {
    if (!selected || !user) return;
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        level: selected,
        target_level: selected,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }

    toast.success("Level set! Welcome to AuraLingovia.");
    nav({ to: "/dashboard" });
  }

  async function handleSkip() {
    if (!user) return;
    setLoading(true);
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
    setLoading(false);
    nav({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {/* Progress indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <div className="h-2 w-8 rounded-full bg-primary" />
            <div className="h-2 w-2 rounded-full bg-muted" />
          </div>

          <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("onboarding.title")}
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {t("onboarding.subtitle")}
          </p>

          {/* Level cards */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {LEVELS.map((level) => {
              const isSelected = selected === level.value;
              return (
                <button
                  key={level.value}
                  onClick={() => setSelected(level.value)}
                  className={`relative flex flex-col items-start gap-3 rounded-2xl border-2 p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {isSelected && (
                    <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-primary" />
                  )}

                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {level.badge}
                  </div>

                  <div>
                    <p className="font-semibold text-foreground">{t(level.labelKey)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t(level.descKey)}</p>
                  </div>

                  {/* Visual indicator of difficulty */}
                  <div className="mt-auto flex gap-1">
                    {[1, 2, 3, 4, 5].map((dot) => (
                      <div
                        key={dot}
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                          level.value === "TELC_B1"
                            ? dot <= 3 ? "bg-primary" : "bg-muted"
                            : dot <= 4 ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* What's included */}
          <div className="mt-6 rounded-xl border border-border bg-muted/40 px-5 py-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Includes
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground">
              {["Lesen", "Hören", "Sprachbausteine", "Schreiben", "Mündlich", "Prüfungssimulation"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-primary" /> {item}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleContinue}
              disabled={!selected || loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("onboarding.continue")}
            </button>
            <button
              onClick={handleSkip}
              disabled={loading}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("onboarding.skip")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
