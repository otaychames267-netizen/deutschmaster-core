/**
 * The ONE thing the 1:1 tutor may do besides asking its questions (owner 2026-10-06): when the student says they did not understand a
 * question, ask the SAME question again in simpler words. Nothing else is ever allowed — no corrections, no hints, no vocabulary, no
 * answer. Detection is deterministic (a regex on what the student just said), not left to the model, so the question counters in
 * server.ts stay exact: a simplified repeat does NOT use up one of the Teil's questions.
 */

// explicit requests about the question
const STRONG: RegExp[] = [
  /\b(die\s+frage|ihre\s+frage|das|es|sie)\s+(leider\s+)?nicht\s+(richtig\s+|ganz\s+|so\s+|wirklich\s+)?verstanden\b/i, // "Ich habe die Frage nicht verstanden"
  /\b(verstehe|verstand)\s+(ich\s+)?(die\s+frage|ihre\s+frage|das|sie)\s+(leider\s+)?nicht\b/i, // "Ich verstehe die Frage nicht"
  /\bfrage\s+verstehe\s+ich\s+nicht\b/i, // "Die Frage verstehe ich nicht"
  /\bwie\s+bitte\b/i,
  /\b(noch\s?mal|nochmals|noch\s+einmal)\b.*\b(wiederholen|sagen|fragen|erklären)\b/i,
  /\b(wiederholen|erklären|umformulieren)\s+sie\b/i,
  /\bk[öo]nnen\s+sie\b.*\b(wiederholen|einfacher|erklären|anders|langsamer)\b/i,
  /\bbitte\s+(einfacher|langsamer|anders)\b/i,
  /\banders\s+(fragen|formulieren|sagen)\b/i,
  /\bwas\s+(meinen|bedeutet)\s+sie\b/i,
];

// bare "I don't understand" — only when that is practically ALL the student said (otherwise it is an opinion: "Ich verstehe nicht, warum…")
const BARE = /^(?:\W|entschuldigung|ähm|äh|sorry|bitte|tut mir leid)*(?:ich\s+)?(?:verstehe|verstand)(?:\s+ich)?\s+(?:das\s+|es\s+)?nicht\W*$/i;
const BARE_HABE = /^(?:\W|entschuldigung|sorry|bitte|leider|tut mir leid)*(?:ich\s+)?habe\s+(?:leider\s+)?nicht\s+(?:richtig\s+|ganz\s+)?verstanden\W*$/i;

export function asksForSimplerQuestion(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (BARE.test(t) || BARE_HABE.test(t)) return true;
  // a long answer that merely contains such a phrase is an answer, not a request
  if (t.split(" ").length > 30) return false;
  return STRONG.some((re) => re.test(t));
}

export function simplifyInstruction(studentName: string): string {
  return `${studentName} hat Ihre letzte Frage (bzw. Ihren letzten Beitrag) nicht verstanden. Wiederholen Sie GENAU DIESELBE Frage bzw. DENSELBEN Beitrag jetzt noch einmal, aber einfacher: kürzere Sätze und einfachere Wörter (höchstens 12 Wörter). Sonst NICHTS: keine Antwort, keine Beispiele, keine Vokabelhilfe, keine Korrektur, keine Erklärung des Themas. Erwähnen Sie nicht, dass Sie die Frage vereinfachen.`;
}

/** At most one simplified repeat per question, and a small cap per session, so a student can not stall the whole exam. */
export const MAX_SIMPLIFICATIONS_PER_SESSION = 4;
