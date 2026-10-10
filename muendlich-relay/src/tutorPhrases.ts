/**
 * Scripted, varied phrase pools for the AI Voice Tutor's Teil transitions
 * and session ending — a sibling to examinerPhrases.ts, not a reuse of its
 * pools. Those are written for the real 2-candidate exam ("Sprechen Sie
 * gemeinsam", "beide", "Prüfung") and don't fit a solo 1:1 session: Teil 2
 * here is still examiner-led (no second candidate to talk to), and Teil 3
 * introduces something the exam never needs — the SAME AI voice explicitly
 * switching from examiner to a "study partner" persona, which needs its own
 * transition language entirely. Reuses the exam's own generic variety
 * mechanism (pickVariant/assignPhraseStyle) — that part has no 2-candidate
 * coupling at all.
 */
import { pickVariant } from "./voice/phraseLibrary/phraseSelection.js";
import { assignPhraseStyle } from "./voice/phraseLibrary/voiceStyle.js";
import type { PhraseStyle } from "./voice/phraseLibrary/phraseTypes.js";

interface Variant<V> { id: string; style: PhraseStyle; render: (v: V) => string }

function pick<V>(category: string, variants: Variant<V>[], voiceId: string, vars: V): string {
  return pickVariant(category, variants, assignPhraseStyle(voiceId)).render(vars);
}

const TEIL1_TO_TEIL2_VARIANTS: Variant<{ teil2Topic: string }>[] = [
  { id: "tutor_t1t2_formal_01", style: "formal", render: (v) => `Vielen Dank für Ihre Präsentation. Damit ist Teil eins abgeschlossen. Wir kommen jetzt zu Teil zwei — dazu stelle ich Ihnen einige Fragen zum Thema: ${v.teil2Topic}.` },
  { id: "tutor_t1t2_formal_02", style: "formal", render: (v) => `Danke, Teil eins ist beendet. Es folgt nun Teil zwei. Das Thema dafür lautet: ${v.teil2Topic}.` },
  { id: "tutor_t1t2_formal_03", style: "formal", render: (v) => `Vielen Dank. Wir gehen jetzt zu Teil zwei über. Ich werde Ihnen dazu Fragen zum folgenden Thema stellen: ${v.teil2Topic}.` },
  { id: "tutor_t1t2_warm_01", style: "warm", render: (v) => `Das haben Sie schön gemacht, vielen Dank. Jetzt geht's weiter mit Teil zwei — dazu habe ich einige Fragen zum Thema: ${v.teil2Topic}.` },
  { id: "tutor_t1t2_warm_02", style: "warm", render: (v) => `Gut gemacht! Teil eins ist geschafft. Kommen wir zu Teil zwei — Ihr Thema dafür: ${v.teil2Topic}.` },
  { id: "tutor_t1t2_calm_01", style: "calm", render: (v) => `Danke schön. Wir beginnen nun mit Teil zwei. Dazu bekommen Sie Fragen zu diesem Thema: ${v.teil2Topic}.` },
];

/** The one transition with no real equivalent anywhere in the 2-candidate
 * exam: the SAME voice explicitly announces it's now playing a different
 * role. Kept short and clear rather than trying to disguise the switch —
 * the product's own correction/feedback pass already tells the student this
 * is practice, so naming the mechanic plainly is more honest than pretending
 * a second person just arrived. */
const TEIL2_TO_TEIL3_VARIANTS: Variant<{ teil3Topic: string }>[] = [
  { id: "tutor_t2t3_formal_01", style: "formal", render: (v) => `Vielen Dank für das Gespräch. Damit ist Teil zwei abgeschlossen. Für Teil drei bin ich jetzt nicht mehr Ihre Prüferin, sondern Ihr Übungspartner — gemeinsam planen wir: ${v.teil3Topic}.` },
  { id: "tutor_t2t3_formal_02", style: "formal", render: (v) => `Danke, Teil zwei ist beendet. Zum letzten Teil wechsle ich jetzt meine Rolle: Ich bin nun Ihr Gesprächspartner für die gemeinsame Planung von: ${v.teil3Topic}.` },
  { id: "tutor_t2t3_warm_01", style: "warm", render: (v) => `Schönes Gespräch, danke Ihnen! Jetzt kommt der letzte Teil, und dafür bin ich nicht mehr Ihre Prüferin, sondern Ihr Partner — lassen Sie uns gemeinsam planen: ${v.teil3Topic}.` },
  { id: "tutor_t2t3_warm_02", style: "warm", render: (v) => `Gut gemacht, das war Teil zwei! Zum Schluss übernehme ich jetzt die Rolle Ihres Übungspartners — wir planen zusammen: ${v.teil3Topic}.` },
  { id: "tutor_t2t3_calm_01", style: "calm", render: (v) => `Danke, damit ist Teil zwei vorbei. Für den letzten Teil bin ich jetzt Ihr Partner statt Ihre Prüferin — gemeinsam planen wir: ${v.teil3Topic}.` },
];

const SESSION_END_VARIANTS: Variant<{ studentName: string }>[] = [
  { id: "tutor_end_formal_01", style: "formal", render: (v) => `Damit ist die heutige Übung abgeschlossen. Vielen Dank für Ihre Mitarbeit in allen drei Teilen, ${v.studentName}. Ihre Auswertung folgt im Anschluss.` },
  { id: "tutor_end_formal_02", style: "formal", render: (v) => `Wir sind am Ende der Übung angelangt. Vielen Dank, ${v.studentName}, dass Sie sich der Aufgabe in allen drei Teilen gestellt haben.` },
  { id: "tutor_end_warm_01", style: "warm", render: (v) => `Das war's für heute, ${v.studentName} — gut gemacht! Sie haben alle drei Teile geschafft. Ihre Auswertung kommt gleich.` },
  { id: "tutor_end_warm_02", style: "warm", render: (v) => `Geschafft, ${v.studentName}! Vielen Dank für Ihre Mitarbeit in der ganzen Übung. Weiter so!` },
  { id: "tutor_end_calm_01", style: "calm", render: (v) => `Damit ist die Übung beendet, ${v.studentName}. Danke für Ihre Teilnahme an allen drei Teilen.` },
];

export function pickTeil1ToTeil2(v: { teil2Topic: string }, voiceId: string): string {
  return pick("tutor_t1_t2", TEIL1_TO_TEIL2_VARIANTS, voiceId, v);
}

export function pickTeil2ToTeil3(v: { teil3Topic: string }, voiceId: string): string {
  return pick("tutor_t2_t3", TEIL2_TO_TEIL3_VARIANTS, voiceId, v);
}

export function pickSessionEnd(v: { studentName: string }, voiceId: string): string {
  return pick("tutor_session_end", SESSION_END_VARIANTS, voiceId, v);
}
