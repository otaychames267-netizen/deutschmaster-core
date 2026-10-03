import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useTrackLesson } from "@/lib/useLastLesson";
import { useLevelSegment } from "@/lib/useActiveLevel";
import { MuendlichTeil2Themen } from "@/components/muendlich/MuendlichTeil2Themen";

export const Route = createFileRoute("/_authenticated/$level/muendlich/vorbereitung/teil-2")({
  component: Teil2Page,
});

function Teil2Page() {
  useTrackLesson();
  const seg = useLevelSegment();
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <Link to={`/${seg}/muendlich/vorbereitung` as never} className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <ArrowLeft className="h-4 w-4" /> Back to Mündlich Vorbereitung
        </Link>
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <Link to={`/${seg}/muendlich` as never} className="hover:text-foreground">Mündlich</Link><span>/</span>
          <Link to={`/${seg}/muendlich/vorbereitung` as never} className="hover:text-foreground">Vorbereitung</Link><span>/</span>
          <span className="font-semibold text-rose-500">Teil 2</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500/70">Teil 2</p>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Diskussion</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ihre Sprech-Toolbox: Themen nach Thema geordnet, mit Ideen, Redemitteln und Wortschatz zum Üben.</p>
      </div>

      <MuendlichTeil2Themen />

      <div className="flex items-center justify-between">
        <Link to={`/${seg}/muendlich/vorbereitung/teil-1` as never} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <ArrowLeft className="h-4 w-4" /> Teil 1
        </Link>
        <Link to={`/${seg}/muendlich/vorbereitung/teil-3` as never} className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-600 transition-colors">
          Next: Teil 3 <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
