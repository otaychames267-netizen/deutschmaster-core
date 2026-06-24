import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Mic, GraduationCap, ChevronRight, Presentation, MessageSquare, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/muendlich/")({
  component: MuendlichIndexPage,
});

function MuendlichIndexPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("sidebar.muendlich")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Oral exam preparation — practice individual speaking tasks or run a full simulation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/muendlich/vorbereitung"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <Mic className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">{t("sidebar.vorbereitung")}</p>
            <p className="text-xs text-muted-foreground">Practice individual speaking tasks</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>

        <Link
          to="/muendlich/pruefung"
          className="group flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 transition-all hover:bg-primary/10 hover:-translate-y-0.5"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">{t("sidebar.pruefung")}</p>
            <p className="text-xs text-muted-foreground">Full oral exam simulation</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </div>

      {/* Simulation preview */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-3 text-sm font-medium text-foreground">Prüfungssimulation includes</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Presentation,   label: "Teil 1", sub: "Präsentation" },
            { icon: MessageSquare,  label: "Teil 2", sub: "Gespräch über ein Thema" },
            { icon: Users,          label: "Teil 3", sub: "Gemeinsam planen" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
              <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
