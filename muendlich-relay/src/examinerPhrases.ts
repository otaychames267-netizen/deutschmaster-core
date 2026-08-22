/**
 * examinerPhrases.ts — controlled variation pools for the three moments in
 * Teil 1 where the AI examiner is currently told to say an exact, hardcoded
 * sentence: the opening welcome, the Person A -> Person B handoff, and the
 * Teil 1 -> Teil 2 transition. Every session used to hear byte-identical
 * wording at all three points — this file is the fix, NOT a rewrite of the
 * exam architecture: server.ts still injects the result as a plain
 * `[SYSTEM] ...` text turn exactly as before, only the sentence itself now
 * comes from a small, hand-written, exam-appropriate pool instead of one
 * fixed string.
 *
 * "Controlled variation," deliberately not free-form model improvisation:
 * every variant below is fully pre-written and reviewed, so quality/register
 * never depends on what an LLM decides to generate for the wording. The only
 * thing chosen at runtime is WHICH pre-written variant to use.
 */

export interface OpeningVars { aName: string; bName: string; topicA: string }
export interface HandoffVars { bName: string; topicB: string }
export interface TransitionVars { teil2Topic: string }

// Teil 2 topics in particular are often phrased as yes/no discussion
// questions ("Sollte man ... verbieten?") — several variant templates below
// immediately follow the interpolated topic with their own punctuation
// (". Sie haben..."), which produced an awkward "?." when the topic already
// ended in "?" (caught by actually printing the constructed sentences, not
// just eyeballing the template strings). Strip the topic's own trailing
// sentence punctuation before interpolating so the template's punctuation is
// always the one that lands.
function cleanTopic(topic: string): string {
  return topic.trim().replace(/[.!?]+$/, "");
}

const OPENING_VARIANTS: ((v: OpeningVars) => string)[] = [
  (v) => `Herzlich willkommen, ${v.aName} und ${v.bName}. Wir beginnen jetzt mit Teil 1, der Präsentation. ${v.aName}, bitte präsentieren Sie jetzt Ihr Thema: ${v.topicA}. Sie haben dafür etwa anderthalb Minuten.`,
  (v) => `Guten Tag, ${v.aName} und ${v.bName}. Wir starten nun mit Ihrer Präsentation. ${v.aName}, Sie beginnen: Ihr Thema lautet ${v.topicA}. Sie haben dafür etwa anderthalb Minuten.`,
  (v) => `Willkommen zur Prüfung. Wir kommen jetzt zu Teil 1. ${v.aName}, bitte präsentieren Sie Ihr Thema: ${v.topicA}. Dafür haben Sie etwa anderthalb Minuten.`,
  (v) => `Guten Tag zusammen. Beginnen wir mit dem ersten Teil der Prüfung: ${v.aName}, Sie können jetzt Ihre Präsentation zum Thema ${v.topicA} halten. Sie haben dafür etwa anderthalb Minuten.`,
  (v) => `Herzlich willkommen zur mündlichen Prüfung. Wir starten mit Teil 1. ${v.aName}, bitte beginnen Sie mit Ihrer Präsentation zum Thema ${v.topicA}. Sie haben dafür etwa anderthalb Minuten.`,
  (v) => `Guten Tag, ${v.aName} und ${v.bName}. Dann kommen wir jetzt zu Teil 1, Ihrer Präsentation. ${v.aName}, Sie fangen an: Ihr Thema ist ${v.topicA}. Sie haben dafür etwa anderthalb Minuten.`,
];

const HANDOFF_VARIANTS: ((v: HandoffVars) => string)[] = [
  (v) => `Vielen Dank. Damit ist dieser Teil abgeschlossen. ${v.bName}, jetzt sind Sie dran. Bitte präsentieren Sie Ihr Thema: ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.`,
  (v) => `Gut, das reicht für diesen Teil. ${v.bName}, jetzt kommen Sie an die Reihe. Ihr Thema lautet ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.`,
  (v) => `Danke. Wir wechseln jetzt zu ${v.bName}. Bitte präsentieren Sie Ihr Thema: ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.`,
  (v) => `Vielen Dank für Ihre Präsentation. ${v.bName}, nun sind Sie an der Reihe: Ihr Thema ist ${v.topicB}. Dafür haben Sie etwa anderthalb Minuten.`,
  (v) => `Gut. ${v.bName}, jetzt sind Sie dran. Bitte präsentieren Sie Ihr Thema: ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.`,
];
const TRANSITION_VARIANTS: ((v: TransitionVars) => string)[] = [
  (v) => `Vielen Dank für Ihre Präsentationen. Damit ist Teil 1 abgeschlossen. Wir kommen jetzt zu Teil 2: Sprechen Sie gemeinsam über folgendes Thema: ${v.teil2Topic}.`,
  (v) => `Danke. Teil 1 ist damit beendet. Wir machen nun mit Teil 2 weiter. Das Thema für dieses Gespräch lautet: ${v.teil2Topic}.`,
  (v) => `Vielen Dank. Wir gehen jetzt zum zweiten Teil der Prüfung über. Bitte sprechen Sie gemeinsam über das Thema: ${v.teil2Topic}.`,
  (v) => `Gut, damit ist der erste Teil abgeschlossen. Als Nächstes folgt Teil 2. Ihr Thema: ${v.teil2Topic}.`,
  (v) => `Vielen Dank für Ihre Präsentationen. Kommen wir nun zu Teil 2. Diskutieren Sie bitte über: ${v.teil2Topic}.`,
];

// Avoid the SAME variant twice in a row for a given category — tracked at
// module scope (per relay process, not per room, since each category only
// fires once per exam; this is about not repeating across consecutive
// exams, e.g. a candidate retrying). Resets on relay restart, which is fine
// for what is fundamentally a variety/naturalness feature, not a security
// or correctness one.
const lastUsedIndex = new Map<string, number>();

function pickIndex(category: string, poolSize: number): number {
  if (poolSize <= 1) return 0;
  const last = lastUsedIndex.get(category);
  let index = Math.floor(Math.random() * poolSize);
  if (index === last) index = (index + 1) % poolSize; // single reroll, not a loop — good enough with pools this size
  lastUsedIndex.set(category, index);
  return index;
}

export function pickOpening(v: OpeningVars): string {
  const clean = { ...v, topicA: cleanTopic(v.topicA) };
  return OPENING_VARIANTS[pickIndex("opening", OPENING_VARIANTS.length)](clean);
}

export function pickHandoff(v: HandoffVars): string {
  const clean = { ...v, topicB: cleanTopic(v.topicB) };
  return HANDOFF_VARIANTS[pickIndex("handoff", HANDOFF_VARIANTS.length)](clean);
}

export function pickTransition(v: TransitionVars): string {
  const clean = { ...v, teil2Topic: cleanTopic(v.teil2Topic) };
  return TRANSITION_VARIANTS[pickIndex("transition", TRANSITION_VARIANTS.length)](clean);
}
