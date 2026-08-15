/**
 * Fixed accessible highlight palette for evidence-in-text marks. Distinct
 * from the colors EvidenceBlock's own icons use (blue/amber/violet/indigo/
 * emerald/rose) so a highlighted sentence never visually collides with the
 * Warum-card chrome pointing at it. Classes are written out literally (not
 * built from interpolated color names) so Tailwind's JIT scanner picks them
 * up — a dynamic `bg-${color}-500/10` string would get purged in production.
 */
export interface EvidenceColor {
  /** Classes for the highlighted <mark> span inside the passage/transcript. */
  mark: string;
  /** Classes for the small "Beleg für Frage N" tag next to a mark. */
  badge: string;
}

const PALETTE: EvidenceColor[] = [
  {
    mark: "bg-teal-500/15 dark:bg-teal-400/20 ring-1 ring-teal-500/30 dark:ring-teal-400/30",
    badge: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25",
  },
  {
    mark: "bg-orange-500/15 dark:bg-orange-400/20 ring-1 ring-orange-500/30 dark:ring-orange-400/30",
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25",
  },
  {
    mark: "bg-cyan-500/15 dark:bg-cyan-400/20 ring-1 ring-cyan-500/30 dark:ring-cyan-400/30",
    badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
  },
  {
    mark: "bg-fuchsia-500/15 dark:bg-fuchsia-400/20 ring-1 ring-fuchsia-500/30 dark:ring-fuchsia-400/30",
    badge: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/25",
  },
  {
    mark: "bg-lime-500/15 dark:bg-lime-400/20 ring-1 ring-lime-500/30 dark:ring-lime-400/30",
    badge: "bg-lime-500/10 text-lime-700 dark:text-lime-300 border-lime-500/25",
  },
  {
    mark: "bg-sky-500/15 dark:bg-sky-400/20 ring-1 ring-sky-500/30 dark:ring-sky-400/30",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
  },
  {
    mark: "bg-pink-500/15 dark:bg-pink-400/20 ring-1 ring-pink-500/30 dark:ring-pink-400/30",
    badge: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/25",
  },
  {
    mark: "bg-purple-500/15 dark:bg-purple-400/20 ring-1 ring-purple-500/30 dark:ring-purple-400/30",
    badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25",
  },
];

export function getEvidenceColor(index: number): EvidenceColor {
  return PALETTE[index % PALETTE.length];
}
