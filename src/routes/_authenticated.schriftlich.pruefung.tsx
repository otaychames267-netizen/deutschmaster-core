import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Clock, Sparkles } from "lucide-react";
import { SectionHeader } from "@/components/section/SectionShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/schriftlich/pruefung")({
  head: () => ({ meta: [{ title: "Schriftlich — Prüfungssimulation" }] }),
  component: SchriftlichPruefung,
});

function SchriftlichPruefung() {
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
            <CardTitle className="text-lg">Vollständige schriftliche Prüfung</CardTitle>
          </div>
          <CardDescription>
            Generiert eine komplette TELC-Prüfung aus der Übungsdatenbank: Lesen, Sprachbausteine, Hören
            und Schreiben — mit echtem Prüfungstimer und automatischer Auswertung.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Dauer: ca. 2 h 15 min · Realistische Prüfungsbedingungen</span>
          </div>
          <div className="flex items-center gap-2">
            <Button disabled>Prüfung starten</Button>
            <Badge variant="secondary" className="text-[10px]">Phase 2 — Demnächst</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}