import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTrackLesson } from "@/lib/useLastLesson";
import { VorbereitungMaterials } from "@/components/muendlich/VorbereitungMaterials";

export const Route = createFileRoute("/_authenticated/muendlich/vorbereitung/teil-3")({
  component: Teil3Page,
});

function Teil3Page() {
  useTrackLesson();
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <Link to="/muendlich/vorbereitung" className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <ArrowLeft className="h-4 w-4" /> Back to Mündlich Vorbereitung
        </Link>
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <Link to="/muendlich" className="hover:text-foreground">Mündlich</Link><span>/</span>
          <Link to="/muendlich/vorbereitung" className="hover:text-foreground">Vorbereitung</Link><span>/</span>
          <span className="font-semibold text-rose-500">Teil 3</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500/70">Teil 3</p>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Gemeinsam planen</h1>
        <p className="mt-1 text-sm text-muted-foreground">Study materials — read the uploaded PDFs (Themen, häufige Fragen, Tipps, Redemittel).</p>
      </div>

      <VorbereitungMaterials teil={3} categories={["themen", "repeated_questions", "tipps", "redemittel"]} />

      <div className="flex items-center justify-start">
        <Link to="/muendlich/vorbereitung/teil-2" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <ArrowLeft className="h-4 w-4" /> Teil 2
        </Link>
      </div>
    </div>
  );
}
