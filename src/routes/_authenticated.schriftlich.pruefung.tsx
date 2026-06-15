import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, Clock, Sparkles } from "lucide-react";
import { SectionHeader } from "@/components/section/SectionShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { startExam } from "@/lib/exercises/exam.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/schriftlich/pruefung")({
  head: () => ({ meta: [{ title: "Schriftlich — Prüfungssimulation" }] }),
  component: SchriftlichPruefung,
});

function SchriftlichPruefung() {
  const { user } = useAuth();
  const [level, setLevel] = useState<"b1" | "b2">("b2");
  const [starting, setStarting] = useState(false);
  const nav = useNavigate();
  const start = useServerFn(startExam);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("level").eq("id", user.id).maybeSingle()
      .then(({ data }) => setLevel(data?.level === "TELC_B1" ? "b1" : "b2"));
  }, [user]);

  const begin = async () => {
    setStarting(true);
    try {
      const r = await start({ data: { level, mode: "schriftlich" } });
      nav({ to: "/exam/$id", params: { id: r.session.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Konnte Prüfung nicht starten");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SectionHeader
        icon={ClipboardList}
        title="Prüfungssimulation — Schriftlich"
        subtitle="Eine vollständige schriftliche TELC-Prüfung unter realen Bedingungen."
        backTo="/schriftlich"
        backLabel="Zurück zu Schriftlich"
      />
      <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <CardTitle className="text-lg">Vollständige schriftliche Prüfung — {level.toUpperCase()}</CardTitle>
          </div>
          <CardDescription>
            Komplette TELC-Prüfung aus der Übungsdatenbank: Lesen, Sprachbausteine, Hören
            und Schreiben — mit Prüfungstimer und automatischer Auswertung. Offene Texte werden vom Lehrteam korrigiert.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> Dauer: 2 h 45 min · 165 Minuten gesamt
          </div>
          <Button onClick={begin} disabled={starting}>{starting ? "Wird gestartet…" : "Prüfung starten"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}