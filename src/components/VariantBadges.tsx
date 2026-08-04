import { RefreshCw, FileText, Sparkles } from "lucide-react";

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

/** Premium "NEU" tag for exercises whose title carries a "( Neu ... )"
 * marker — always placed at the far opposite side of the row from the title
 * (right-aligned, immediately before the row's trailing icon) per design
 * spec, never bunched in next to the heading. */
export function NewBadge() {
  return (
    <span className="relative inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md shadow-rose-500/30 ring-1 ring-white/25">
      <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600 opacity-60 blur-[5px]" />
      <Sparkles className="h-2.5 w-2.5" /> Neu
    </span>
  );
}
