import { createFileRoute, Link } from "@tanstack/react-router";
import { Presentation, MessageCircle, Users, ChevronRight, Info, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/muendlich/pruefung")({
  component: MuendlichPruefungPage,
});

const PARTS = [
  {
    teil: "Teil 1",
    title: "Präsentation",
    duration: "2–3 min",
    description: "Sie präsentieren ein Thema anhand eines Spickzettels. Danach stellt Ihr Partner Rückfragen.",
    icon: Presentation,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    steps: [
      "Spickzettel lesen und Präsentation vorbereiten (2 min)",
      "Thema frei präsentieren — Struktur: Einleitung → Hauptteil → Schluss",
      "Rückfragen des Partners beantworten",
    ],
  },
  {
    teil: "Teil 2",
    title: "Über ein Thema sprechen",
    duration: "3–4 min",
    description: "Sie erhalten einen Textimpuls und diskutieren spontan mit Ihrem Partner.",
    icon: MessageCircle,
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    steps: [
      "Textimpuls lesen (1–2 min)",
      "Meinung äußern und diskutieren",
      "Auf Argumente des Partners eingehen",
    ],
  },
  {
    teil: "Teil 3",
    title: "Etwas gemeinsam planen",
    duration: "4–5 min",
    description: "Sie und Ihr Partner erhalten eine Planungsaufgabe und einigen sich gemeinsam auf eine Lösung.",
    icon: Users,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    steps: [
      "Aufgabe lesen (1 min)",
      "Vorschläge machen und diskutieren",
      "Gemeinsame Entscheidung treffen",
    ],
  },
];

function MuendlichPruefungPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Prüfungssimulation — Mündlich</h1>
        <p className="text-sm text-muted-foreground">Ablauf der mündlichen Prüfung: 3 Teile, ca. 15 Minuten gesamt.</p>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-foreground">Hinweis zur Simulation</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Die mündliche Simulation hilft Ihnen, den Prüfungsablauf zu verstehen und zu üben. Für echtes Sprechenüben nutzen Sie die <strong className="text-foreground">Vorbereitung</strong>-Materialien zusammen mit einem Partner.
            </p>
          </div>
        </div>
      </div>

      {/* Total time */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[["Gesamtdauer", "~15 min"], ["Teile", "3"], ["Prüfer", "2"]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-2xl font-bold text-primary">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Parts */}
      <div className="space-y-4">
        {PARTS.map((part, idx) => {
          const Icon = part.icon;
          return (
            <div key={part.teil} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${part.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{part.teil}</p>
                      <p className="mt-0.5 font-semibold text-foreground">{part.title}</p>
                    </div>
                    <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {part.duration}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{part.description}</p>
                  <div className="mt-4 space-y-2">
                    {part.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
                        <span className="text-foreground">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA to study materials */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Vorbereitung zuerst?</p>
            <p className="text-xs text-muted-foreground">Studieren Sie Tipps und Redemittel für jeden Teil.</p>
          </div>
        </div>
        <Link
          to="/muendlich/vorbereitung"
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Vorbereitung <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
