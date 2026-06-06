import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PenLine, Mic, BookOpen, Headphones, Puzzle, Edit3, Speech, ArrowLeft, Construction, MessageSquare, Users, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_authenticated/learn/$level")({
  component: LevelPage,
});

const EXAM_AREAS = [
  {
    id: "schriftlich",
    label: "Schriftlich",
    icon: PenLine,
    desc: "Written TELC exam area with reading, listening, language elements, and writing.",
    modules: [
      { label: "Lesen", icon: BookOpen, desc: "Reading comprehension tasks and model texts." },
      { label: "Hören", icon: Headphones, desc: "Listening comprehension tasks and audio practice." },
      { label: "Sprachbausteine", icon: Puzzle, desc: "Language elements, grammar patterns, and gap-fill practice." },
      { label: "Schreiben", icon: Edit3, desc: "Letters, emails, formal writing, and scoring structure." },
    ],
  },
  {
    id: "muendlich",
    label: "Mündlich",
    icon: Mic,
    desc: "Oral TELC exam area focused on speaking performance.",
    modules: [
      { label: "Teil 1 — Über eine Erfahrung sprechen (Präsentation)", icon: Speech, desc: "Structured presentation. Includes tips & structure templates." },
      { label: "Teil 2 — Diskussion", icon: MessageSquare, desc: "Debate a topic with arguments and counter-arguments. Tips & structure included." },
      { label: "Teil 3 — Gemeinsam etwas planen", icon: Users, desc: "Plan something together with a partner. Tips & structure included." },
      { label: "Prüfungssimulation Mündlich", icon: ClipboardList, desc: "Full oral exam simulation across all three Teile." },
    ],
  },
] as const;

function LevelPage() {
  const { level } = Route.useParams();
  const nav = useNavigate();
  const slug = level.toLowerCase();
  if (slug !== "b1" && slug !== "b2") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Unknown level "{level}".</p>
        <Button asChild><Link to="/learn">Back to level picker</Link></Button>
      </div>
    );
  }
  const label = slug === "b1" ? "TELC B1" : "TELC B2";
  const [tab, setTab] = useState<string>("schriftlich");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <button onClick={() => nav({ to: "/learn" })} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" /> All levels
          </button>
          <h1 className="text-2xl font-bold">{label} <span className="text-muted-foreground font-normal text-base">preparation</span></h1>
        </div>
        <Badge variant="secondary">Foundation ready · content coming</Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          {EXAM_AREAS.map((area) => (
            <TabsTrigger key={area.id} value={area.id} className="flex items-center gap-1.5">
              <area.icon className="h-3.5 w-3.5" /> {area.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {EXAM_AREAS.map((area) => (
          <TabsContent key={area.id} value={area.id} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><area.icon className="h-5 w-5 text-accent" /> {area.label} — {label}</CardTitle>
                <CardDescription>{area.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {area.modules.map((module) => (
                    <Card key={module.label} className="bg-muted/20">
                      <CardContent className="pt-5 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-md bg-accent/10 p-2 text-accent-foreground"><module.icon className="h-5 w-5" /></div>
                          <div>
                            <p className="font-medium">{module.label}</p>
                            <p className="text-sm text-muted-foreground">{module.desc}</p>
                          </div>
                        </div>
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          <Construction className="mr-1 inline h-4 w-4" /> Lessons, model tasks, exercises, and progress tracking will be added here in Phase 2.
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}