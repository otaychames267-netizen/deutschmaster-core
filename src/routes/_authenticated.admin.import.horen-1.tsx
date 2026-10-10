import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { HoerenExerciseForm } from "@/components/admin/HoerenExerciseForm";

export const Route = createFileRoute("/_authenticated/admin/import/horen-1")({
  component: ImportHorenT1Page,
});

function ImportHorenT1Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex items-start gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-foreground">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-semibold">Add Hören Teil 1</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">Hören Teil 1 — Add Exercise</h1>
          <p className="text-sm text-muted-foreground mt-1">Manual entry · 5 Richtig/Falsch statements</p>
        </div>
      </div>
      <HoerenExerciseForm teil={1} />
    </div>
  );
}
