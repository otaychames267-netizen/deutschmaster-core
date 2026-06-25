import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Lightbulb, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/muendlich/vorbereitung/teil-2")({
  component: Teil2Page,
});

const REDEMITTEL = [
  { category: "Meinung äußern", phrases: ["Ich bin der Meinung, dass …", "Meiner Ansicht nach …", "Ich halte … für (sehr) wichtig / problematisch.", "Ich sehe das anders."] },
  { category: "Zustimmung", phrases: ["Da stimme ich Ihnen völlig zu.", "Das sehe ich genauso.", "Sie haben völlig recht.", "Genau, das ist auch mein Eindruck."] },
  { category: "Widerspruch (höflich)", phrases: ["Das sehe ich ein bisschen anders.", "Ich bin da anderer Meinung.", "Da muss ich widersprechen.", "Das stimmt zwar, aber …"] },
  { category: "Nachfragen", phrases: ["Was meinen Sie genau damit?", "Können Sie das näher erläutern?", "Ich habe Sie nicht ganz verstanden. Meinen Sie …?"] },
  { category: "Zusammenfassen", phrases: ["Also, wenn ich das richtig verstehe, …", "Zusammenfassend können wir sagen, dass …", "Das heißt also, …"] },
];

const TIPPS = [
  "Lesen Sie den Textimpuls sorgfältig — markieren Sie Schlüsselaussagen.",
  "Reagieren Sie auf den Textimpuls UND auf Ihren Gesprächspartner.",
  "Zeigen Sie Interesse: Nicken, kurze Reaktionen wie 'ja', 'genau', 'interessant'.",
  "Widersprechen ist erlaubt — aber höflich und mit Begründung.",
  "Stellen Sie Rückfragen — das zeigt aktives Zuhören.",
];

function Teil2Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Link to="/muendlich/vorbereitung" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Mündlich Vorbereitung
        </Link>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Teil 2</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">Über ein Thema sprechen</h1>
        <p className="text-sm text-muted-foreground">Studiumsmaterialien — Tipps und Redemittel für die Diskussion</p>
      </div>

      {/* Task description */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-foreground">Aufgabenbeschreibung</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sie erhalten einen kurzen Textimpuls (Zitat, Schlagzeile, Statistik). Beide Teilnehmer lesen ihn und diskutieren dann spontan. <strong className="text-foreground">Kein Spickzettel</strong> — freies Sprechen gefragt.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              {[["Lesezeit", "1–2 min"], ["Diskussion", "3–4 min"]].map(([label, time]) => (
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
          <p className="font-semibold text-foreground">Tipps für die Diskussion</p>
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
        <p className="text-sm font-medium text-foreground">Beispiel-Textimpulse kommen bald</p>
        <p className="mt-1 text-xs text-muted-foreground">Übungsimpulse mit Musterdiskussionen werden nach dem PDF-Import verfügbar sein.</p>
      </div>
    </div>
  );
}
