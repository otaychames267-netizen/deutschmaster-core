import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GraduationCap, Check, Sparkles, Clock, Lock, Rocket } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — DeutschMaster" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState<"TELC_B1" | "TELC_B2" | "">("");
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!user) return;
    if (!level) return toast.error("Please choose your level");
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      level, target_level: level,
      onboarding_completed: true,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("You're all set — welcome to DeutschMaster!");
    nav({ to: "/dashboard", replace: true });
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 md:py-16">
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1.5 w-16 rounded-full transition-all ${step >= s ? "bg-accent" : "bg-muted"}`} />
        ))}
      </div>
      <Card className="border-border/60 shadow-xl">
        {step === 1 && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/30">
                <GraduationCap className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="text-2xl">Choose your TELC level</CardTitle>
              <CardDescription>This sets up your entire learning path. You can change it later in your profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  { lv: "TELC_B1", title: "TELC B1", tag: "Intermediate", desc: "Independent user. Everyday situations, work, travel." },
                  { lv: "TELC_B2", title: "TELC B2", tag: "Upper-intermediate", desc: "Professional German, complex topics, Ausbildung." },
                ] as const).map((opt) => (
                  <button
                    key={opt.lv}
                    type="button"
                    onClick={() => setLevel(opt.lv)}
                    className={`group relative p-5 border-2 rounded-xl text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      level === opt.lv ? "border-accent bg-accent/5 shadow-md" : "border-border hover:border-accent/50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl font-bold">{opt.title}</span>
                      {level === opt.lv && <div className="rounded-full bg-accent p-0.5"><Check className="h-3 w-3 text-accent-foreground" /></div>}
                    </div>
                    <p className="text-xs font-medium text-accent mb-1.5">{opt.tag}</p>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep(2)} disabled={!level} size="lg">Continue →</Button>
              </div>
            </CardContent>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/30">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="text-2xl">Your 3-day free trial is active</CardTitle>
              <CardDescription>Full access to {level.replace("_", " ")} — no card required.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <TrialFact icon={Clock} title="3 full days" desc="Starting today, ending in 72 hours." />
                <TrialFact icon={Rocket} title="Full access" desc="Every Schriftlich & Mündlich module unlocked." />
                <TrialFact icon={Lock} title="No surprises" desc="Trial ends automatically. No charge." />
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium mb-1">What happens after day 3?</p>
                <p className="text-muted-foreground">Your content stays visible but locks. Upgrade anytime to keep going — your progress is saved.</p>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
                <Button onClick={finish} disabled={saving} size="lg">{saving ? "Setting up…" : "Start learning →"}</Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

function TrialFact({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <Icon className="h-5 w-5 text-accent mb-2" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}