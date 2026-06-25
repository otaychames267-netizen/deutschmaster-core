import { createFileRoute, Link } from "@tanstack/react-router";
import { Presentation, MessageCircle, Users, ChevronRight, BookOpen, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_authenticated/muendlich/vorbereitung")({
  component: MuendlichVorbereitungPage,
});

const PARTS = [
  {
    teil: "Teil 1",
    title: "Präsentation",
    description: "Ein Thema anhand eines Spickzettels präsentieren (2–3 Minuten)",
    icon: Presentation,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    to: "/muendlich/vorbereitung/teil-1",
    points: ["Einleitung, Hauptteil, Schluss strukturieren", "Redemittel zur Präsentation verwenden", "Auf Rückfragen eingehen"],
  },
  {
    teil: "Teil 2",
    title: "Über ein Thema sprechen",
    description: "Einen Textimpuls kommentieren und diskutieren",
    icon: MessageCircle,
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    to: "/muendlich/vorbereitung/teil-2",
    points: ["Meinung äußern und begründen", "Auf den Gesprächspartner eingehen", "Redemittel für Zustimmung/Widerspruch"],
  },
  {
    teil: "Teil 3",
    title: "Etwas gemeinsam planen",
    description: "Eine gemeinsame Aufgabe mit dem Partner besprechen und eine Lösung finden",
    icon: Users,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    to: "/muendlich/vorbereitung/teil-3",
    points: ["Vorschläge machen und bewerten", "Kompromisse finden", "Höfliche Ablehnung und Zustimmung"],
  },
];

function MuendlichVorbereitungPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Mündlich — Vorbereitung</h1>
        <p className="text-sm text-muted-foreground">
          Studienmaterilaen für die mündliche Prüfung — Tipps, Redemittel und Beispiele für alle 3 Teile.
        </p>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Wie nutze ich diese Sektion?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Diese Sektion enthält ausschließlich Lernmaterialien — Tipps, Redemittel und Beispiele.
              Wählen Sie einen Teil, studieren Sie die Materialien, und üben Sie dann mit der
              <strong className="text-foreground"> Prüfungssimulation</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {PARTS.map((part) => {
          const Icon = part.icon;
          return (
            <Link
              key={part.teil}
              to={part.to as never}
              className="flex items-center gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${part.color}`}>
                <Icon className="h-6 w-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{part.teil}</span>
                </div>
                <p className="mt-0.5 font-semibold text-foreground">{part.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{part.description}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {part.points.map((p) => (
                    <span key={p} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="h-1 w-1 rounded-full bg-primary" /> {p}
                    </span>
                  ))}
                </div>
              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
