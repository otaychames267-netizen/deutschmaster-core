import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Calendar, Target, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — DeutschMaster" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState<"TELC_B1" | "TELC_B2" | "">("");
  const [examDate, setExamDate] = useState("");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!user) return;
    if (!level) return toast.error("Please choose your level");
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      level, target_level: level,
      exam_date: examDate || null,
      study_goal: goal || null,
      onboarding_completed: true,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome to DeutschMaster!");
    nav({ to: "/dashboard", replace: true });
  };

  return (
    <div className="container mx-auto max-w-xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Let's personalize your prep</CardTitle>
          <CardDescription>Step {step} of 3 — takes about 30 seconds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Choose your target exam</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["TELC_B1","TELC_B2"] as const).map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setLevel(lv)}
                    className={`p-4 border rounded-lg text-left transition ${level === lv ? "border-accent bg-accent/10" : "hover:bg-muted"}`}
                  >
                    <div className="font-semibold flex items-center justify-between">
                      {lv.replace("_", " ")}
                      {level === lv && <Check className="h-4 w-4 text-accent" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lv === "TELC_B1" ? "Intermediate German — independent user" : "Upper-intermediate — strong everyday and professional German"}
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep(2)} disabled={!level}>Continue</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Exam date (optional)</Label>
              <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Helps us pace your prep. You can change it later.</p>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)}>Continue</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Target className="h-4 w-4" /> Your study goal</Label>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Pass TELC B2 for my Ausbildung application" />
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={finish} disabled={saving}>{saving ? "Saving…" : "Finish setup"}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}