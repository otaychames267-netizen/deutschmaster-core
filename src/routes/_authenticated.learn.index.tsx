import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/learn/")({
  component: LearnIndex,
});

function LearnIndex() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [profileLevel, setProfileLevel] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("level").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfileLevel(data?.level ?? null));
  }, [user]);

  const pickLevel = async (lv: "TELC_B1" | "TELC_B2") => {
    if (!user) return;
    setSaving(lv);
    const { error } = await supabase.from("profiles").update({ level: lv, target_level: lv }).eq("id", user.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    setProfileLevel(lv);
    nav({ to: "/learn/$level", params: { level: lv === "TELC_B1" ? "b1" : "b2" } });
  };

  const LEVELS = [
    { code: "TELC_B1", label: "TELC B1", slug: "b1", desc: "Intermediate German — independent user. Build confidence in everyday topics, structured writing, and clear conversation.", tag: "Most popular" },
    { code: "TELC_B2", label: "TELC B2", slug: "b2", desc: "Upper-intermediate — strong everyday and professional German. Master complex texts, formal letters, and structured speaking.", tag: "Advanced" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-accent" /> Choose your level</h1>
        <p className="text-muted-foreground">Pick a TELC exam to open its sections, exercises, models, and progress tracking.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {LEVELS.map((l) => {
          const isCurrent = profileLevel === l.code;
          return (
            <Card key={l.code} className={isCurrent ? "border-accent" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{l.label}</CardTitle>
                  <span className="text-xs px-2 py-0.5 rounded bg-accent/15 text-accent-foreground">{l.tag}</span>
                </div>
                <CardDescription>{l.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Schriftlich: Lesen, Hören, Sprachbausteine, Schreiben</li>
                  <li>• Mündlich: Sprechen</li>
                  <li>• Models, exercises & progress inside the matching exam area</li>
                </ul>
                <div className="flex gap-2">
                  <Button asChild className="flex-1" variant={isCurrent ? "default" : "outline"}>
                    <Link to="/learn/$level" params={{ level: l.slug }}>
                      Open {l.label} <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                  {!isCurrent && (
                    <Button variant="ghost" disabled={saving === l.code} onClick={() => pickLevel(l.code)}>
                      {saving === l.code ? "Saving…" : "Set as my level"}
                    </Button>
                  )}
                  {isCurrent && <span className="inline-flex items-center text-xs text-accent-foreground gap-1 px-2"><Check className="h-3 w-3" /> Your level</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}