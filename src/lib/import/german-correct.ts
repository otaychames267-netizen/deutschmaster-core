/**
 * german-correct.ts — CONSERVATIVE, deterministic OCR fixes for German text.
 *
 * Strict policy (per spec): never change wording or structure. Only repair
 * unambiguous OCR character artifacts where the corrected form is essentially
 * the only valid German reading. Anything ambiguous is left untouched and the
 * coherence layer flags it for manual review.
 */

export interface CorrectionResult {
  text: string;
  changes: Array<{ from: string; to: string; rule: string }>;
}

/**
 * Apply only high-confidence character repairs:
 *  - "ii" → "ü"  (the digraph "ii" virtually never occurs in German; Tesseract
 *    routinely renders ü as "ii": Wiirttemberg→Württemberg, Plastiktiiten→Plastiktüten)
 *  - "äu"/"ö" ligature artifacts are NOT touched (ambiguous).
 *  - We do NOT change "B"→"ß" or "i"→"ä" (too ambiguous; flagged instead).
 *
 * Returns the corrected text and a log of every change for transparency.
 */
export function conservativeCorrect(input: string): CorrectionResult {
  const changes: CorrectionResult["changes"] = [];
  let text = input;

  // Rule 1: "ii" → "ü" inside words (not at token boundaries with digits).
  text = text.replace(/([A-Za-zÄÖÜäöß])ii([A-Za-zÄÖÜäöüß])/g, (m, a, b) => {
    const to = `${a}ü${b}`;
    changes.push({ from: m, to, rule: "ii→ü" });
    return to;
  });

  // Rule 2: stray standalone "|" used as I/l inside a word → drop only if it
  // sits between letters (clear OCR vertical-bar artifact).
  text = text.replace(/([A-Za-zÄÖÜäöüß])\|([A-Za-zÄÖÜäöüß])/g, (m, a, b) => {
    const to = `${a}l${b}`;
    changes.push({ from: m, to, rule: "|→l" });
    return to;
  });

  return { text, changes };
}
