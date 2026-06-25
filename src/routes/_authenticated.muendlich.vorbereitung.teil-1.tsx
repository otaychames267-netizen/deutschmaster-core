import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Lightbulb, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/muendlich/vorbereitung/teil-1")({
  component: Teil1Page,
});

const REDEMITTEL = [
  { category: "Einleitung", phrases: ["Ich möchte Ihnen heute etwas über … vorstellen.", "Mein Thema heute ist …", "Ich werde über … sprechen.", "Zunächst möchte ich kurz erklären, was … bedeutet."] },
  { category: "Hauptteil — Meinung", phrases: ["Ich bin der Meinung, dass …", "Meiner Ansicht nach …", "Ich denke / glaube / finde, dass …", "Aus meiner Sicht …"] },
  { category: "Argumente", phrases: ["Einerseits … andererseits …", "Ein weiterer Vorteil / Nachteil ist …", "Dazu kommt, dass …", "Das bedeutet, dass …"] },
  { category: "Beispiele", phrases: ["Zum Beispiel …", "Als Beispiel kann ich … nennen.", "Ich kenne einen Fall, in dem …", "Das zeigt sich zum Beispiel daran, dass …"] },
  { category: "Schluss", phrases: ["Zusammenfassend kann ich sagen, dass …", "Abschließend möchte ich betonen, dass …", "Ich hoffe, ich konnte Ihnen zeigen, dass …", "Haben Sie noch Fragen dazu?"] },
];

const TIPPS = [
  "Nutzen Sie den Spickzettel — er enthält Stichpunkte, keine ganzen Sätze.",
  "Sprechen Sie 2–3 Minuten — zu kurz bedeutet Punktabzug.",
  "Schauen Sie Ihren Gesprächspartner an — Augenkontakt ist wichtig.",
  "Wenn Sie ein Wort vergessen, umschreiben Sie es.",
  "Zeigen Sie Struktur: 'Erstens … Zweitens … Abschließend …'",
  "Die Prüfer helfen Ihnen mit Rückfragen — das ist normal.",
];

function Teil1Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Link to="/muendlich/vorbereitung" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Mündlich Vorbereitung
        </Link>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Teil 1</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">Präsentation</h1>
        <p className="text-sm text-muted-foreground">Studiumsmaterialien — Tipps und Redemittel für Ihre Präsentation</p>
      </div>

      {/* Task description */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-foreground">Aufgabenbeschreibung</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sie erhalten einen Spickzettel mit einem Thema und Stichpunkten. Sie haben <strong className="text-foreground">2 Minuten Vorbereitungszeit</strong> und präsentieren dann <strong className="text-foreground">2–3 Minuten</strong> lang. Danach stellt Ihr Gesprächspartner Rückfragen.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[["Vorbereitung", "2 min"], ["Präsentation", "2–3 min"], ["Rückfragen", "1–2 min"]].map(([label, time]) => (
                <div key={label} className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-lg font-bold text-primary">{time}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tipps */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <p className="font-semibold text-foreground">Tipps für die Präsentation</p>
        </div>
        <ul className="space-y-2.5">
          {TIPPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Redemittel */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <MessageSquare className="h-5 w-5 text-primary" />
          <p className="font-semibold text-foreground">Redemittel</p>
        </div>
        <div className="space-y-5">
          {REDEMITTEL.map((section) => (
            <div key={section.category}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.category}</p>
              <div className="flex flex-wrap gap-2">
                {section.phrases.map((phrase) => (
                  <span key={phrase} className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-foreground">
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 text-center">
        <p className="text-sm font-medium text-foreground">Mehr Materialien kommen bald</p>
        <p className="mt-1 text-xs text-muted-foreground">Beispielpräsentationen mit Musterlösungen werden nach dem PDF-Import verfügbar sein.</p>
      </div>
    </div>
  );
}
