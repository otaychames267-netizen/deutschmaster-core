/**
 * coherence.ts — deterministic detection of transcription corruption in German
 * article text. Catches the structural signals of OCR/vision errors: dropped
 * words, duplicated fragments, broken/merged sentences, dangling fragments.
 *
 * This cannot prove perfect verbatim fidelity, but it reliably flags the
 * corruption patterns we observed so corrupted articles are held for review
 * rather than imported.
 */

export interface CoherenceReport {
  ok: boolean;
  issues: string[];   // human-readable problems
  score: number;      // 0..1 rough cleanliness score
}

// Common German function words — a sentence with none is suspicious.
const FUNCTION_WORDS = /\b(der|die|das|und|oder|in|im|auf|mit|für|von|zu|den|dem|ein|eine|einen|ist|sind|war|hat|haben|wird|werden|nicht|auch|sich|aus|bei|nach|über|als|wie|dass|man|sie|er|es)\b/i;

export function checkCoherence(text: string | null | undefined): CoherenceReport {
  const issues: string[] = [];
  const t = (text ?? "").trim();
  if (!t) return { ok: false, issues: ["empty"], score: 0 };

  // 1) Adjacent duplicated word ("können ... können", "in Schweden in Schweden")
  const dupWord = t.match(/\b([A-Za-zÄÖÜäöüß]{3,})\s+\1\b/i);
  if (dupWord) issues.push(`adjacent_duplicate_word("${dupWord[1]}")`);

  // 2) Duplicated short phrase (2-4 words repeated back-to-back)
  const dupPhrase = t.match(/\b(\w+(?:\s+\w+){1,3})\s+\1\b/i);
  if (dupPhrase) issues.push(`duplicated_phrase("${dupPhrase[1].slice(0, 40)}")`);

  // 3) Dangling fragments / broken hyphenation
  if (/\w-[,.;]/.test(t)) issues.push("broken_hyphenation");
  if (/\s-\s*["„]/.test(t)) issues.push("dangling_dash");

  // 4) Alternate-reading artifact
  if (/\b[Oo]der\s*\(/.test(t) || /\(\s*(?:oder|bzw)\b/i.test(t)) issues.push("alternate_reading");

  // 5) Sentence-level checks: split into sentences, look for ones lacking any
  //    function word (a strong sign of garbled/merged text) or absurdly long
  //    run-ons without punctuation.
  const sentences = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  let noFuncWord = 0;
  let runOns = 0;
  for (const s of sentences) {
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length >= 5 && !FUNCTION_WORDS.test(s)) noFuncWord++;
    if (words.length > 60) runOns++; // a clause with no sentence break for 60+ words
  }
  if (noFuncWord > 0) issues.push(`sentences_without_function_words:${noFuncWord}`);
  if (runOns > 0) issues.push(`run_on_sentences:${runOns}`);

  // 6) Ends mid-word / no terminal punctuation on a long text
  if (t.length > 200 && !/[.!?"”»]\s*$/.test(t)) issues.push("no_terminal_punctuation");

  // 7) [unleserlich] markers from the verbatim extractor
  const illeg = (t.match(/\[unleserlich\]/gi) || []).length;
  if (illeg > 0) issues.push(`illegible_markers:${illeg}`);

  // 8) Cut sentence: text starts mid-word/lowercase (missing leading text).
  //    (We deliberately do NOT flag "word- und" suspended hyphens — those are
  //    valid German and would be false positives.)
  if (/^[a-zäöüß,;:]/.test(t)) issues.push("starts_midsentence");

  // Score: start at 1, subtract per issue class
  const score = Math.max(0, 1 - issues.length * 0.2);
  // "ok" requires no hard-corruption signals.
  const hard = issues.some((i) =>
    i.startsWith("adjacent_duplicate_word") || i.startsWith("duplicated_phrase") ||
    i.startsWith("sentences_without_function_words") || i === "broken_hyphenation" || i === "empty");
  return { ok: !hard, issues, score };
}
