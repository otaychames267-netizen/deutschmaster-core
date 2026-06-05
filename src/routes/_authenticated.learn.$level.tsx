import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PenLine, Mic, Puzzle, FileText, Dumbbell, LineChart, ArrowLeft, Construction } from "lucide-react";

export const Route = createFileRoute("/_authenticated/learn/$level")({
  component: LevelPage,
});

const SECTIONS = [
  { id: "schriftlich", label: "Schriftlich", icon: PenLine, desc: "Writing — Briefe, E-Mails, structured composition." },
  { id: "muendlich", label: "Mündlich", icon: Mic, desc: "Speaking — Vorstellung, Diskussion, Präsentation." },
  { id: "sprachbausteine", label: "Sprachbausteine", icon: Puzzle, desc: "Grammar and language elements — fill-in and choice tasks." },
  { id: "models", label: "Models", icon: FileText, desc: "Past exam models with full answer keys." },
  { id: "exercises", label: "Exercises", icon: Dumbbell, desc: "Targeted drills for every skill." },
  { id: "progress", label: "Progress", icon: LineChart, desc: "Your activity, accuracy, and skill breakdown." },
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
        <TabsList className="flex flex-wrap h-auto">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.id} value={s.id} className="flex items-center gap-1.5">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SECTIONS.map((s) => (
          <TabsContent key={s.id} value={s.id} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><s.icon className="h-5 w-5 text-accent" /> {s.label} — {label}</CardTitle>
                <CardDescription>{s.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border border-dashed p-6 text-center space-y-2 bg-muted/30">
                  <Construction className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="font-medium">Content arriving in the next phase</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    The {s.label.toLowerCase()} module structure is in place. Lessons, exercises, and model tasks will land here next.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}