/**
 * Single neutral highlight style for evidence-in-text marks. Deliberately
 * NOT green or red — those are reserved for the correct/wrong indicator on
 * the answer itself, and reusing them on the evidence mark would make
 * students read "this sentence is correct" instead of "this sentence is
 * the evidence". One consistent amber "highlighter" color (rather than a
 * per-question rotating palette) also reads better now that Lösung
 * anzeigen reveals every question's evidence at once — the numbered badge
 * on each mark (see HighlightedText) is what distinguishes which question
 * a given mark belongs to, not the color.
 */
export interface EvidenceColor {
  /** Classes for the highlighted <mark> span inside the passage/transcript. */
  mark: string;
  /** Classes for the small "Beleg für Frage N" tag next to a mark. */
  badge: string;
}

const EVIDENCE_COLOR: EvidenceColor = {
  mark: "bg-amber-400/25 dark:bg-amber-300/25 ring-1 ring-amber-500/40 dark:ring-amber-300/40",
  badge: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
};

export function getEvidenceColor(): EvidenceColor {
  return EVIDENCE_COLOR;
}
