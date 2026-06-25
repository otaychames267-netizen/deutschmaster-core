import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Lightbulb, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/muendlich/vorbereitung/teil-3")({
  component: Teil3Page,
});

const REDEMITTEL = [
  { category: "Vorschläge machen", phrases: ["Wir könnten doch …", "Wie wäre es, wenn …?", "Ich schlage vor, dass …", "Was halten Sie davon, …?"] },
  { category: "Auf Vorschläge reagieren", phrases: ["Das klingt gut.", "Das finde ich eine gute Idee.", "Ja, das wäre eine Möglichkeit.", "Das ist leider nicht so praktisch, weil …"] },
  { category: "Kompromisse finden", phrases: ["Wir könnten uns vielleicht auf … einigen.", "Was wäre, wenn wir … und … kombinieren?", "Als Kompromiss könnten wir …"] },
  { category: "Absagen / Ablehnen (höflich)", phrases: ["Das geht leider nicht, weil …", "Das ist leider nicht möglich.", "Das wäre zwar schön, aber …"] },
  { category: "Entscheidung treffen", phrases: ["Also, dann einigen wir uns auf …", "Wir haben uns entschieden, …", "Das ist unser Plan: …"] },
];

const TIPPS = [
  "Lesen Sie die Aufgabe sorgfältig — Sie müssen eine GEMEINSAME Entscheidung treffen.",
  "Machen Sie konkrete Vorschläge — und begründen Sie sie kurz.",
  "Hören Sie Ihrem Partner zu — gehen Sie auf seine/ihre Ideen ein.",
  "Einigen Sie sich am Ende — auch ein Kompromiss ist eine gültige Lösung.",
  "Zeigen Sie Gesprächsbereitschaft — Monologe führen zu Punktabzug.",
];

function Teil3Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Link to="/muendlich/vorbereitung" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Mündlich Vorbereitung
        </Link>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Teil 3</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">Etwas gemeinsam planen</h1>
        <p className="text-sm text-muted-foreground">Studiumsmaterialien — Tipps und Redemittel für gemeinsames Planen</p>
      </div>

      {/* Task description */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-foreground">Aufgabenbeschreibung</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sie und Ihr Prüfungspartner erhalten eine gemeinsame Aufgabe: etwas zu planen (z.B. ein Fest organisieren, eine Reise planen). Beide diskutieren und einigen sich auf eine gemeinsame Lösung.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              {[["Lesezeit", "1 min"], ["Planung", "4–5 min"]].map(([label, time]) => (
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
          <p className="font-semibold text-foreground">Tipps für gemeinsames Planen</p>
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
        <p className="text-sm font-medium text-foreground">Planungsaufgaben kommen bald</p>
        <p className="mt-1 text-xs text-muted-foreground">Beispielaufgaben mit Musterlösungen werden nach dem PDF-Import verfügbar sein.</p>
      </div>
    </div>
  );
}
