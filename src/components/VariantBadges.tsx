import { RefreshCw, FileText, Flame } from "lucide-react";

/** Original/Modified pill — used wherever an exercise title carries a
 * variant marker (see src/lib/exercise-variant.ts). Distinct colors so a
 * pair is instantly scannable when rendered stacked/adjacent. */
export function VariantBadge({ variant }: { variant: "original" | "modified" }) {
  if (variant === "original") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400">
        <FileText className="h-2.5 w-2.5" /> Original
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400">
      <RefreshCw className="h-2.5 w-2.5" /> Modified
    </span>
  );
}

/** Eye-catching "NEW" tag for exercises whose title carries a "( Neu ... )"
 * marker — always placed at the far right of its row per design spec. */
export function NewBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
      <Flame className="h-2.5 w-2.5" /> New
    </span>
  );
}
