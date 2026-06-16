import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Headphones, Puzzle, Edit3, Speech, MessageSquare, Users, ClipboardList, PenLine, Mic, Construction, Sparkles, ArrowRight, GraduationCap } from "lucide-react";

type Section = "schriftlich" | "muendlich" | "pruefung";

const SCHRIFTLICH_MODULES = [
  { label: "Lesen", icon: BookOpen, desc: "Reading comprehension and model texts." },
  { label: "Hören", icon: Headphones, desc: "Listening tasks with audio practice." },
  { label: "Sprachbausteine", icon: Puzzle, desc: "Grammar patterns and gap-fill practice." },
  { label: "Schreiben", icon: Edit3, desc: "Letters, emails and formal writing." },
];

const MUENDLICH_MODULES = [
  { label: "Teil 1 — Präsentation", icon: Speech, desc: "Structured presentation with templates." },
  { label: "Teil 2 — Diskussion", icon: MessageSquare, desc: "Arguments and counter-arguments." },
  { label: "Teil 3 — Gemeinsam planen", icon: Users, desc: "Plan something together with a partner." },
];

export function LearnSection({ section }: { section: Section }) {
  const { user } = useAuth();
  const [level, setLevel] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("level").eq("id", user.id).maybeSingle()
      .then(({ data }) => setLevel(data?.level ?? null));
  }, [user?.id]);

  const levelLabel = level === "TELC_B2" ? "TELC B2" : level === "TELC_B1" ? "TELC B1" : "—";

  if (section === "pruefung") {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Header icon={ClipboardList} title="Prüfungssimulation" level={levelLabel} subtitle="Realistische Prüfungserfahrung — Schriftlich & Mündlich" />
        <div className="grid gap-5 md:grid-cols-2">
          <SimCard icon={PenLine} title="Prüfungssimulation Schriftlich" desc="Kompletter schriftlicher Prüfungsteil im TELC-Format: Lesen, Hören, Sprachbausteine und Schreiben mit Prüfungstimer." />
          <SimCard icon={Mic} title="Prüfungssimulation Mündlich" desc="Gesamter mündlicher Prüfungsteil: Präsentation, Diskussion und gemeinsame Planung als realistische Simulation." />
        </div>
        <ComingSoonNote />
      </div>
    );
  }

  const isSchriftlich = section === "schriftlich";
  const modules = isSchriftlich ? SCHRIFTLICH_MODULES : MUENDLICH_MODULES;
  const Icon = isSchriftlich ? PenLine : Mic;
  const title = isSchriftlich ? "Schriftlich" : "Mündlich";
  const subtitle = isSchriftlich
    ? "Schriftlicher Prüfungsteil — Lesen, Hören, Sprachbausteine, Schreiben"
    : "Mündlicher Prüfungsteil — Präsentation, Diskussion, gemeinsame Planung";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Header icon={Icon} title={title} level={levelLabel} subtitle={subtitle} />

      {/* Vorbereitung */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-accent" /> Vorbereitung
            </h2>
            <p className="text-xs text-muted-foreground">Übungen, Modelle und Strategien für jeden Prüfungsteil.</p>
          </div>
          <Badge variant="secondary" className="text-[10px]">Content wird ausgebaut</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {modules.map((m) => (
            <Card key={m.label} className="transition hover:border-accent/50 hover:shadow-md">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-accent/15 p-2.5 text-accent ring-1 ring-accent/30">
                    <m.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{m.label}</p>
                    <p className="text-sm text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  <Construction className="mr-1 inline h-3.5 w-3.5" /> Inhalte werden in Phase 2 ergänzt.
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Prüfungssimulation */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-accent" /> Prüfungssimulation {title}
        </h2>
        <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Vollständige {title}-Prüfung
            </CardTitle>
            <CardDescription>
              {isSchriftlich
                ? "Generiert eine vollständige schriftliche TELC-Prüfung mit realistischem Timer."
                : "Verbindet alle drei mündlichen Teile zu einer vollständigen Sprechprüfung."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/pruefung">Zur Prüfungssimulation <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Header({ icon: Icon, title, level, subtitle }: { icon: any; title: string; level: string; subtitle: string }) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-accent/15 p-3 text-accent ring-1 ring-accent/30">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Badge variant="outline" className="text-xs">{level}</Badge>
    </div>
  );
}

function SimCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <Card className="relative overflow-hidden border-border/60 hover:border-accent/50 transition hover:shadow-xl hover:-translate-y-0.5">
      <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      <CardHeader>
        <div className="rounded-lg bg-accent/15 p-3 text-accent w-fit ring-1 ring-accent/30">
          <Icon className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl mt-2">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary" className="text-[10px]">Phase 2 — Demnächst</Badge>
      </CardContent>
    </Card>
  );
}

function ComingSoonNote() {
  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="pt-5 text-sm text-muted-foreground">
        Die vollständige Prüfungssimulation wird in Phase 2 implementiert. Sie generiert eine realistische TELC-Prüfung aus der Übungsdatenbank inklusive Timer und Bewertung.
      </CardContent>
    </Card>
  );
}