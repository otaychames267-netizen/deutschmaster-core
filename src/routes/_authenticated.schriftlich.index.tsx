import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BookOpen, Headphones, PenLine, Wrench, GraduationCap, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/schriftlich/")({
  component: SchriftlichIndexPage,
});

const SECTIONS = [
  { icon: BookOpen,   label: "Lesen",           sub: "Teil 1 · Teil 2 · Teil 3", to: "/schriftlich/vorbereitung/lesen/teil-1",      color: "bg-blue-500/10 text-blue-500" },
  { icon: Headphones, label: "Hören",            sub: "Teil 1 · Teil 2 · Teil 3", to: "/schriftlich/vorbereitung/hoeren/teil-1",      color: "bg-violet-500/10 text-violet-500" },
  { icon: Wrench,     label: "Sprachbausteine",  sub: "Teil 1 · Teil 2",          to: "/schriftlich/vorbereitung/sprachbausteine/teil-1", color: "bg-emerald-500/10 text-emerald-500" },
  { icon: PenLine,    label: "Schreiben",        sub: "Beschwerde · Bitte um Info", to: "/schriftlich/vorbereitung/schreiben/beschwerde", color: "bg-amber-500/10 text-amber-500" },
];

function SchriftlichIndexPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("sidebar.schriftlich")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Written exam preparation — choose a section or run a full simulation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Vorbereitung sections */}
        {SECTIONS.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}

        {/* Prüfungssimulation */}
        <Link
          to="/schriftlich/pruefung"
          className="group col-span-full flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 transition-all hover:bg-primary/10 hover:-translate-y-0.5"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">{t("sidebar.pruefung")}</p>
            <p className="text-xs text-muted-foreground">
              Complete a full written TELC exam under realistic conditions — timed, structured, scored.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </div>
    </div>
  );
}
