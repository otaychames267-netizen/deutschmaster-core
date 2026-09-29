import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useTrackLesson } from "@/lib/useLastLesson";
import { useActiveLevel, useLevelSegment } from "@/lib/useActiveLevel";
import { VorbereitungMaterials } from "@/components/muendlich/VorbereitungMaterials";
import { MuendlichTeil1Themen } from "@/components/muendlich/MuendlichTeil1Themen";

export const Route = createFileRoute("/_authenticated/$level/muendlich/vorbereitung/teil-1")({
  component: Teil1Page,
});

// B1's real Teil 1 is Bildbeschreibung (describe a photo), not Präsentation
// (B2's own choose-a-topic-and-present format) — these are genuinely
// different exam tasks, not just a label difference, so the level decides
// both the heading and the description text, not just cosmetics.
function Teil1Page() {
  useTrackLesson();
  const seg = useLevelSegment();
  const level = useActiveLevel();
  const isB1 = level === "TELC_B1";
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <Link to={`/${seg}/muendlich/vorbereitung` as never} className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <ArrowLeft className="h-4 w-4" /> Back to Mündlich Vorbereitung
        </Link>
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <Link to={`/${seg}/muendlich` as never} className="hover:text-foreground">Mündlich</Link><span>/</span>
          <Link to={`/${seg}/muendlich/vorbereitung` as never} className="hover:text-foreground">Vorbereitung</Link><span>/</span>
          <span className="font-semibold text-rose-500">Teil 1</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500/70">Teil 1</p>
        <h1 className="text-2xl font-black tracking-tight text-foreground">{isB1 ? "Bildbeschreibung" : "Präsentation"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isB1
            ? "Beschreiben Sie ein Foto: Struktur, Redemittel und Wortschatz zum Üben."
            : "Wählen Sie ein Thema und üben Sie Ihre Präsentation dazu."}
        </p>
      </div>

      <MuendlichTeil1Themen />
      <VorbereitungMaterials teil={1} categories={["tipps", "redemittel"]} />

      <div className="flex items-center justify-end">
        <Link to={`/${seg}/muendlich/vorbereitung/teil-2` as never} className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-600 transition-colors">
          Next: Teil 2 <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
