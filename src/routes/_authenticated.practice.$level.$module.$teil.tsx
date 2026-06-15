import { createFileRoute, Link } from "@tanstack/react-router";
import { ExerciseSession } from "@/components/exercise/ExerciseSession";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/practice/$level/$module/$teil")({
  head: () => ({ meta: [{ title: "Übung — Lingovia" }] }),
  component: PracticePage,
});

function PracticePage() {
  const { level, module, teil } = Route.useParams();
  const lv = (level === "b1" ? "b1" : "b2") as "b1" | "b2";
  const mod = module as "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich";
  const t = Math.max(1, parseInt(teil, 10) || 1);
  const backTo = mod === "muendlich" ? "/muendlich/vorbereitung" : "/schriftlich/vorbereitung";
  const moduleLabel = ({
    lesen: "Lesen", sprachbausteine: "Sprachbausteine", hoeren: "Hören", schreiben: "Schreiben", muendlich: "Mündlich",
  } as const)[mod];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={backTo}><ArrowLeft className="size-4 mr-1" /> Zurück</Link>
        </Button>
        <div className="text-sm text-muted-foreground">
          {lv.toUpperCase()} · {moduleLabel} · Teil {t}
        </div>
      </div>
      <ExerciseSession level={lv} module={mod} teil={t} />
    </div>
  );
}