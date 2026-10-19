/**
 * Controlled-variation phrase pools for the exam moments whose WORDING is
 * 100% predetermined — never "decided" by the examiner brain, only
 * SELECTED from a pre-written, pre-reviewed pool and filled in with the
 * real candidate name(s) / topic for this exam. Two real upgrades over the
 * original version of this file:
 *
 *   1. Pools expanded from 5-6 variants to 24 (8 per style bucket — formal,
 *      warm, calm) per category, selected with a style-aware, non-
 *      repeating picker (see voice/phraseLibrary/phraseSelection.ts) so the
 *      SAME assigned examiner voice consistently leans toward one register
 *      instead of randomly flipping tone exam to exam.
 *   2. The opening greeting itself moved OUT of this file — it's now the
 *      fully fixed, name-free, pre-generatable "welcome" category (see
 *      voice/phraseLibrary/fixedPhrases.ts). What remains here
 *      (pickExamStart) is only the topic-assignment sentence, which
 *      necessarily carries the real candidate name + topic and so can't be
 *      pre-generated — see phraseTypes.ts's header for the full reasoning.
 *
 * "Controlled variation," deliberately not free-form model improvisation:
 * every variant below is fully pre-written and reviewed, so quality/register
 * never depends on what an LLM decides to generate for the wording. On the
 * ElevenLabs backend, these are sent DIRECTLY to TTS (voice/
 * muendlichVoiceSession.ts's speakScriptedText) — Claude is never called for
 * these moments at all, since there is no "what to say" decision left for it
 * to make once a variant is picked. On the Gemini backend (voiceBackend.ts's
 * adapter), the exact same picked sentence is still injected as a "say
 * exactly this" system instruction, same as before.
 */
import { getFixedPool } from "./voice/phraseLibrary/fixedPhrases.js";
import { pickVariant } from "./voice/phraseLibrary/phraseSelection.js";
import { assignPhraseStyle } from "./voice/phraseLibrary/voiceStyle.js";
import type { PhraseStyle } from "./voice/phraseLibrary/phraseTypes.js";

export interface ExamStartVars { aName: string; topicA: string }
export interface TaskTransitionVars { bName: string; topicB: string }
export interface SectionTransitionVars { teil2Topic: string }
export interface Teil3SectionTransitionVars { teil3Topic: string }

// Teil 2/3 topics are often phrased as yes/no discussion questions
// ("Sollte man ... verbieten?") — several variant templates below
// immediately follow the interpolated topic with their own punctuation
// (". Sie haben..."), which produced an awkward "?." when the topic already
// ended in "?" (caught by actually printing the constructed sentences, not
// just eyeballing the template strings). Strip the topic's own trailing
// sentence punctuation before interpolating so the template's punctuation is
// always the one that lands.
function cleanTopic(topic: string): string {
  return topic.trim().replace(/[.!?]+$/, "");
}

interface Variant<V> { id: string; style: PhraseStyle; render: (v: V) => string }

const EXAM_START_VARIANTS: Variant<ExamStartVars>[] = [
  // formal
  { id: "exam_start_formal_01", style: "formal", render: (v) => `Wir beginnen nun mit Teil eins der Prüfung, der Präsentation. Jeder von Ihnen stellt ein eigenes Thema vor und spricht dazu frei, zusammenhängend und in vollständigen Sätzen. ${v.aName}, Sie eröffnen mit dem Thema: ${v.topicA}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "exam_start_formal_02", style: "formal", render: (v) => `Wir kommen zum ersten Teil der Prüfung, der Präsentation. Ihre Aufgabe ist es, Ihr Thema strukturiert vorzustellen, Ihre Meinung zu begründen und mit Beispielen zu belegen. ${v.aName}, bitte beginnen Sie mit Ihrer Präsentation zum Thema ${v.topicA}. Dafür stehen Ihnen etwa anderthalb Minuten zur Verfügung.` },
  { id: "exam_start_formal_03", style: "formal", render: (v) => `Es folgt nun Teil eins der Prüfung. Bitte präsentieren Sie Ihr Thema in zusammenhängenden Sätzen, begründen Sie Ihre Position nachvollziehbar und nennen Sie mindestens ein konkretes Beispiel. ${v.aName}, Sie beginnen mit dem Thema: ${v.topicA}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "exam_start_formal_04", style: "formal", render: (v) => `Damit beginnt Teil eins der Prüfung, die Präsentation. Sprechen Sie frei und strukturiert, und führen Sie Ihre Gedanken Schritt für Schritt aus. ${v.aName}, Ihr Thema lautet: ${v.topicA}. Bitte beginnen Sie; Sie haben dafür etwa anderthalb Minuten.` },
  { id: "exam_start_formal_05", style: "formal", render: (v) => `Wir starten nun mit dem ersten Teil der Prüfung. Er dient dazu, dass jeder von Ihnen ein Thema in eigenen Worten vorstellt, die eigene Sichtweise begründet und sprachlich sicher auftritt. ${v.aName}, bitte präsentieren Sie Ihr Thema: ${v.topicA}. Die veranschlagte Zeit dafür beträgt etwa anderthalb Minuten.` },
  { id: "exam_start_formal_06", style: "formal", render: (v) => `Teil eins der Prüfung beginnt jetzt. Bitte präsentieren Sie Ihr Thema klar gegliedert, mit einer Einleitung, einer begründeten Stellungnahme und einem abschließenden Fazit. ${v.aName}, Sie beginnen mit dem Thema ${v.topicA}. Etwa anderthalb Minuten stehen Ihnen dafür zur Verfügung.` },
  { id: "exam_start_formal_07", style: "formal", render: (v) => `Wir kommen nun zur Präsentation, dem ersten Teil der Prüfung. Gefragt sind ein sicherer Ausdruck, eine nachvollziehbare Argumentation und ein abwechslungsreicher Wortschatz. ${v.aName}, bitte übernehmen Sie mit Ihrer Präsentation zum Thema ${v.topicA}. Dafür haben Sie etwa anderthalb Minuten.` },
  { id: "exam_start_formal_08", style: "formal", render: (v) => `Damit eröffnen wir den ersten Teil der Prüfung. Stellen Sie Ihr Thema zusammenhängend vor, begründen Sie Ihre Meinung und gehen Sie auf mögliche Gegenargumente ein. ${v.aName}, Sie präsentieren als Erste beziehungsweise Erster: Ihr Thema lautet ${v.topicA}. Sie haben dafür etwa anderthalb Minuten.` },
  // warm
  { id: "exam_start_warm_01", style: "warm", render: (v) => `So, dann legen wir los mit Teil eins. ${v.aName}, Sie fangen an — Ihr Thema ist ${v.topicA}. Lassen Sie sich Zeit, Sie haben dafür etwa anderthalb Minuten.` },
  { id: "exam_start_warm_02", style: "warm", render: (v) => `${v.aName}, jetzt sind Sie dran mit dem ersten Teil. Ihr Thema lautet ${v.topicA} — sprechen Sie einfach drauflos, Sie haben etwa anderthalb Minuten Zeit.` },
  { id: "exam_start_warm_03", style: "warm", render: (v) => `Gut, dann beginnen wir. ${v.aName}, Ihre Präsentation zum Thema ${v.topicA}, bitte — nehmen Sie sich die etwa anderthalb Minuten, die Sie dafür haben.` },
  { id: "exam_start_warm_04", style: "warm", render: (v) => `${v.aName}, Sie machen den Anfang. Ihr Thema für die Präsentation: ${v.topicA}. Sie haben dafür etwa anderthalb Minuten — ganz in Ruhe.` },
  { id: "exam_start_warm_05", style: "warm", render: (v) => `Dann fangen wir mit Teil eins an. ${v.aName}, erzählen Sie uns etwas zu Ihrem Thema ${v.topicA}. Dafür haben Sie etwa anderthalb Minuten.` },
  { id: "exam_start_warm_06", style: "warm", render: (v) => `${v.aName}, jetzt geht's los: Ihre Präsentation zum Thema ${v.topicA}. Sie haben dafür etwa anderthalb Minuten, nehmen Sie sich die Zeit, die Sie brauchen.` },
  { id: "exam_start_warm_07", style: "warm", render: (v) => `Gut, ${v.aName}, dann übernehmen Sie jetzt. Ihr Thema ist ${v.topicA}, und Sie haben dafür etwa anderthalb Minuten.` },
  { id: "exam_start_warm_08", style: "warm", render: (v) => `Wir starten mit Ihnen, ${v.aName}. Ihr Thema für die Präsentation lautet ${v.topicA} — Sie haben dafür etwa anderthalb Minuten.` },
  // calm
  { id: "exam_start_calm_01", style: "calm", render: (v) => `Wir beginnen nun mit dem ersten Teil. ${v.aName}, Ihr Thema für die Präsentation lautet ${v.topicA}. Sie haben dafür etwa anderthalb Minuten Zeit.` },
  { id: "exam_start_calm_02", style: "calm", render: (v) => `Teil eins beginnt jetzt. ${v.aName}, bitte präsentieren Sie in Ruhe Ihr Thema: ${v.topicA}. Dafür stehen Ihnen etwa anderthalb Minuten zur Verfügung.` },
  { id: "exam_start_calm_03", style: "calm", render: (v) => `Kommen wir zum ersten Teil. ${v.aName}, Sie beginnen mit Ihrem Thema ${v.topicA}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "exam_start_calm_04", style: "calm", render: (v) => `Der erste Teil beginnt nun. ${v.aName}, Ihr Thema ist ${v.topicA}. Nehmen Sie sich die etwa anderthalb Minuten, die dafür vorgesehen sind.` },
  { id: "exam_start_calm_05", style: "calm", render: (v) => `Wir kommen jetzt zur Präsentation. ${v.aName}, Ihr Thema lautet ${v.topicA}. Sie haben dafür etwa anderthalb Minuten Zeit, ganz in Ihrem eigenen Tempo.` },
  { id: "exam_start_calm_06", style: "calm", render: (v) => `Teil eins der Prüfung beginnt jetzt. ${v.aName}, präsentieren Sie bitte Ihr Thema: ${v.topicA}. Etwa anderthalb Minuten stehen Ihnen dafür zur Verfügung.` },
  { id: "exam_start_calm_07", style: "calm", render: (v) => `Wir starten strukturiert mit Teil eins. ${v.aName}, Sie beginnen mit dem Thema ${v.topicA}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "exam_start_calm_08", style: "calm", render: (v) => `Nun folgt Teil eins, die Präsentation. ${v.aName}, Ihr Thema: ${v.topicA}. Sie haben dafür etwa anderthalb Minuten, nehmen Sie sich die Zeit dafür.` },
];

const TASK_TRANSITION_VARIANTS: Variant<TaskTransitionVars>[] = [
  // formal
  { id: "task_transition_formal_01", style: "formal", render: (v) => `Vielen Dank für Ihre Präsentation. Damit ist dieser Abschnitt abgeschlossen, und wir kommen zur zweiten Präsentation. ${v.bName}, jetzt sind Sie an der Reihe: Ihr Thema lautet ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "task_transition_formal_02", style: "formal", render: (v) => `Das genügt für diesen Teil, vielen Dank. Ich bitte nun die zweite Person, ein eigenes Thema strukturiert vorzustellen und die eigene Meinung nachvollziehbar zu begründen. ${v.bName}, Ihr Thema lautet: ${v.topicB}. Dafür haben Sie etwa anderthalb Minuten.` },
  { id: "task_transition_formal_03", style: "formal", render: (v) => `Vielen Dank für diesen Beitrag. Wir wechseln nun zur zweiten Präsentation, und auch hier achten wir auf einen nachvollziehbaren Aufbau und eine begründete Stellungnahme. ${v.bName}, bitte präsentieren Sie Ihr Thema: ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "task_transition_formal_04", style: "formal", render: (v) => `Damit ist die erste Präsentation beendet. Wir kommen nun zur zweiten, und auch hier erwarten wir zusammenhängende Sätze, eine begründete Stellungnahme und ein passendes Beispiel. ${v.bName}, Ihr Thema lautet: ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "task_transition_formal_05", style: "formal", render: (v) => `Vielen Dank. Dieser Teil ist hiermit abgeschlossen. Nun folgt die Präsentation des zweiten Themas, die ebenfalls frei und strukturiert vorgetragen werden soll. ${v.bName}, bitte beginnen Sie mit: ${v.topicB}. Dafür stehen Ihnen etwa anderthalb Minuten zur Verfügung.` },
  { id: "task_transition_formal_06", style: "formal", render: (v) => `Ich danke Ihnen für Ihren Beitrag. Wir setzen Teil eins nun mit der zweiten Präsentation fort. Bitte achten Sie auch hier auf einen klaren Aufbau und eine begründete Argumentation. ${v.bName}, Ihr Thema ist: ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "task_transition_formal_07", style: "formal", render: (v) => `Vielen Dank, damit ist die erste Präsentation abgeschlossen. Es folgt nun die zweite Präsentation, für die dieselben Anforderungen gelten: ein sicherer Ausdruck, ein klarer Aufbau und eine nachvollziehbare Begründung. ${v.bName}, bitte beginnen Sie mit dem Thema: ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "task_transition_formal_08", style: "formal", render: (v) => `Danke, dieser Teil ist beendet. Wir übergeben nun das Wort an die zweite Person, die ebenfalls ein eigenes Thema frei und strukturiert vorstellt. ${v.bName}, Ihr Thema lautet: ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
  // warm
  { id: "task_transition_warm_01", style: "warm", render: (v) => `Gut gemacht, vielen Dank. ${v.bName}, jetzt sind Sie dran — Ihr Thema ist ${v.topicB}. Nehmen Sie sich die etwa anderthalb Minuten, die Sie dafür haben.` },
  { id: "task_transition_warm_02", style: "warm", render: (v) => `Schön, danke. ${v.bName}, dann sind jetzt Sie an der Reihe: Ihr Thema lautet ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "task_transition_warm_03", style: "warm", render: (v) => `Vielen Dank dafür. ${v.bName}, jetzt kommen Sie zum Zug — Ihr Thema ist ${v.topicB}. Lassen Sie sich die etwa anderthalb Minuten dafür ruhig Zeit.` },
  { id: "task_transition_warm_04", style: "warm", render: (v) => `Das war schön anzuhören, danke. ${v.bName}, jetzt sind Sie dran: Ihr Thema ist ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "task_transition_warm_05", style: "warm", render: (v) => `Gut, vielen Dank. ${v.bName}, jetzt sind Sie am Zug — Ihr Thema lautet ${v.topicB}. Sie haben etwa anderthalb Minuten dafür.` },
  { id: "task_transition_warm_06", style: "warm", render: (v) => `Danke Ihnen. ${v.bName}, jetzt übernehmen Sie: Ihr Thema ist ${v.topicB}, und Sie haben dafür etwa anderthalb Minuten.` },
  { id: "task_transition_warm_07", style: "warm", render: (v) => `Vielen Dank. Dann sind jetzt Sie dran, ${v.bName}: Ihr Thema lautet ${v.topicB}. Etwa anderthalb Minuten stehen Ihnen dafür zur Verfügung.` },
  { id: "task_transition_warm_08", style: "warm", render: (v) => `Gut gemacht, danke schön. ${v.bName}, jetzt sind Sie an der Reihe mit dem Thema ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
  // calm
  { id: "task_transition_calm_01", style: "calm", render: (v) => `Vielen Dank, dieser Teil ist damit abgeschlossen. ${v.bName}, Sie sind nun an der Reihe: Ihr Thema lautet ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "task_transition_calm_02", style: "calm", render: (v) => `Danke. Wir wechseln nun geordnet zu ${v.bName}. Ihr Thema lautet ${v.topicB}. Sie haben dafür etwa anderthalb Minuten Zeit.` },
  { id: "task_transition_calm_03", style: "calm", render: (v) => `Dieser Abschnitt ist beendet, vielen Dank. ${v.bName}, Ihr Thema lautet ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "task_transition_calm_04", style: "calm", render: (v) => `Vielen Dank. Nun folgt ${v.bName} mit dem Thema ${v.topicB}. Sie haben dafür etwa anderthalb Minuten Zeit.` },
  { id: "task_transition_calm_05", style: "calm", render: (v) => `Danke, damit ist dieser Teil abgeschlossen. ${v.bName}, bitte übernehmen Sie: Ihr Thema ist ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
  { id: "task_transition_calm_06", style: "calm", render: (v) => `Vielen Dank für diesen Teil. ${v.bName}, Sie sind nun an der Reihe: Ihr Thema lautet ${v.topicB}. Etwa anderthalb Minuten stehen Ihnen zur Verfügung.` },
  { id: "task_transition_calm_07", style: "calm", render: (v) => `Damit kommen wir zu ${v.bName}. Ihr Thema lautet ${v.topicB}. Sie haben dafür etwa anderthalb Minuten, in Ruhe.` },
  { id: "task_transition_calm_08", style: "calm", render: (v) => `Vielen Dank. Als Nächstes folgt ${v.bName} mit dem Thema ${v.topicB}. Sie haben dafür etwa anderthalb Minuten.` },
];

const SECTION_TRANSITION_12_VARIANTS: Variant<SectionTransitionVars>[] = [
  // formal
  { id: "section_transition12_formal_01", style: "formal", render: (v) => `Vielen Dank für Ihre Präsentationen. Damit ist Teil eins abgeschlossen. Wir kommen nun zu Teil zwei, dem gemeinsamen Gespräch, in dem Sie Argumente austauschen, Ihre Meinung begründen und auf die Beiträge des anderen eingehen. Sprechen Sie gemeinsam über folgendes Thema: ${v.teil2Topic}.` },
  { id: "section_transition12_formal_02", style: "formal", render: (v) => `Vielen Dank. Teil eins ist damit abgeschlossen. Wir setzen nun mit Teil zwei fort, dem Gespräch, in dem Sie Ihre Meinung begründen, Vor- und Nachteile abwägen und Ihre Aussagen mit konkreten Beispielen belegen. Das Thema für dieses Gespräch lautet: ${v.teil2Topic}.` },
  { id: "section_transition12_formal_03", style: "formal", render: (v) => `Vielen Dank. Wir gehen jetzt zum zweiten Teil der Prüfung über. Dabei kommt es auf einen lebendigen Austausch an: Stellen Sie Fragen, reagieren Sie auf Argumente und begründen Sie Ihre Position. Bitte sprechen Sie gemeinsam über das Thema: ${v.teil2Topic}.` },
  { id: "section_transition12_formal_04", style: "formal", render: (v) => `Damit ist der erste Teil abgeschlossen. Als Nächstes folgt Teil zwei, in dem Sie ein Thema ausführlich besprechen: Wägen Sie Argumente ab, nehmen Sie Stellung und stützen Sie Ihre Aussagen mit Beispielen. Ihr Thema lautet: ${v.teil2Topic}.` },
  { id: "section_transition12_formal_05", style: "formal", render: (v) => `Vielen Dank für Ihre Präsentationen. Wir kommen nun zu Teil zwei der Prüfung. In diesem Teil diskutieren Sie ein Thema in Ihren eigenen Worten und gehen dabei aufeinander ein. Diskutieren Sie bitte gemeinsam über: ${v.teil2Topic}.` },
  { id: "section_transition12_formal_06", style: "formal", render: (v) => `Damit endet Teil eins. Wir beginnen nun mit Teil zwei, dem Gespräch zu einem Thema, bei dem es auf eine nachvollziehbare Argumentation, einen präzisen Wortschatz und eine klare Struktur ankommt. Ihr Thema lautet: ${v.teil2Topic}.` },
  { id: "section_transition12_formal_07", style: "formal", render: (v) => `Vielen Dank für den ersten Teil. Es folgt nun Teil zwei, in dem Sie sich gegenseitig Fragen stellen, Vorschläge machen und Ihre Ansichten begründen. Sprechen Sie bitte gemeinsam über folgendes Thema: ${v.teil2Topic}.` },
  { id: "section_transition12_formal_08", style: "formal", render: (v) => `Teil eins ist hiermit abgeschlossen. Wir kommen zu Teil zwei, dem freien Gespräch, in dem Sie Ihre Gedanken zusammenhängend entwickeln und Ihre Meinung mit Argumenten und Beispielen untermauern. Das Thema lautet: ${v.teil2Topic}.` },
  // warm
  { id: "section_transition12_warm_01", style: "warm", render: (v) => `Das haben Sie beide schön gemacht, vielen Dank. Jetzt geht's weiter mit Teil zwei — sprechen Sie einfach frei über: ${v.teil2Topic}.` },
  { id: "section_transition12_warm_02", style: "warm", render: (v) => `Gut gemacht, beide! Teil eins ist geschafft. Jetzt kommt Teil zwei, ein Gespräch zwischen Ihnen beiden über: ${v.teil2Topic}.` },
  { id: "section_transition12_warm_03", style: "warm", render: (v) => `Danke, das war schön anzuhören. Weiter geht's mit Teil zwei — unterhalten Sie sich gemeinsam über: ${v.teil2Topic}.` },
  { id: "section_transition12_warm_04", style: "warm", render: (v) => `Sehr schön, danke Ihnen beiden. Jetzt kommt der zweite Teil: Sprechen Sie einfach miteinander über das Thema ${v.teil2Topic}.` },
  { id: "section_transition12_warm_05", style: "warm", render: (v) => `Das war der erste Teil, gut gemacht. Nun folgt Teil zwei — reden Sie frei über: ${v.teil2Topic}.` },
  { id: "section_transition12_warm_06", style: "warm", render: (v) => `Vielen Dank, weiter geht's. Teil zwei ist ein Gespräch zwischen Ihnen — das Thema dafür lautet ${v.teil2Topic}.` },
  { id: "section_transition12_warm_07", style: "warm", render: (v) => `Schön war's, danke. Jetzt kommt Teil zwei: Tauschen Sie sich einfach locker aus über: ${v.teil2Topic}.` },
  { id: "section_transition12_warm_08", style: "warm", render: (v) => `Gut gemacht, beide! Jetzt sprechen Sie in Teil zwei gemeinsam über ${v.teil2Topic} — ganz natürlich, wie ein normales Gespräch.` },
  // calm
  { id: "section_transition12_calm_01", style: "calm", render: (v) => `Vielen Dank. Teil eins ist damit abgeschlossen. Wir kommen nun geordnet zu Teil zwei: das Thema lautet ${v.teil2Topic}.` },
  { id: "section_transition12_calm_02", style: "calm", render: (v) => `Danke Ihnen beiden. Es folgt nun Teil zwei, das gemeinsame Gespräch, zum Thema: ${v.teil2Topic}.` },
  { id: "section_transition12_calm_03", style: "calm", render: (v) => `Damit ist der erste Teil beendet. Wir wenden uns nun Teil zwei zu. Ihr Thema: ${v.teil2Topic}.` },
  { id: "section_transition12_calm_04", style: "calm", render: (v) => `Vielen Dank für Ihre Präsentationen. Teil zwei beginnt nun, mit dem Thema: ${v.teil2Topic}.` },
  { id: "section_transition12_calm_05", style: "calm", render: (v) => `Damit schließen wir Teil eins ab. Es folgt Teil zwei: Sprechen Sie in Ruhe gemeinsam über ${v.teil2Topic}.` },
  { id: "section_transition12_calm_06", style: "calm", render: (v) => `Vielen Dank. Wir kommen nun zu Teil zwei. Das Gesprächsthema lautet: ${v.teil2Topic}.` },
  { id: "section_transition12_calm_07", style: "calm", render: (v) => `Teil eins ist abgeschlossen. Nehmen Sie sich für Teil zwei die Zeit, gemeinsam über ${v.teil2Topic} zu sprechen.` },
  { id: "section_transition12_calm_08", style: "calm", render: (v) => `Vielen Dank für diesen Teil. Es folgt nun, geordnet, Teil zwei zum Thema: ${v.teil2Topic}.` },
];

const SECTION_TRANSITION_23_VARIANTS: Variant<Teil3SectionTransitionVars>[] = [
  // formal
  { id: "section_transition23_formal_01", style: "formal", render: (v) => `Vielen Dank. Damit ist Teil zwei abgeschlossen. Wir kommen jetzt zu Teil drei, der gemeinsamen Planungsaufgabe: Hier entwickeln Sie Vorschläge, stimmen Ihre Ideen aufeinander ab und treffen am Ende eine begründete Entscheidung. Planen Sie gemeinsam Folgendes: ${v.teil3Topic}.` },
  { id: "section_transition23_formal_02", style: "formal", render: (v) => `Danke, Teil zwei ist beendet. Zum Abschluss folgt Teil drei, die Planungsaufgabe, bei der Sie Vorschläge machen, Argumente abwägen und Ihre Entscheidungen begründen. Ihre Aufgabe lautet: ${v.teil3Topic}.` },
  { id: "section_transition23_formal_03", style: "formal", render: (v) => `Vielen Dank. Wir kommen nun zum letzten Teil der Prüfung, der gemeinsamen Planung. Achten Sie darauf, Ihre Vorschläge zu begründen, auf Einwände einzugehen und am Ende zu einer klaren Einigung zu gelangen. Planen Sie gemeinsam: ${v.teil3Topic}.` },
  { id: "section_transition23_formal_04", style: "formal", render: (v) => `Vielen Dank für das Gespräch. Wir kommen jetzt zu Teil drei. Hier geht es darum, ein Vorhaben konkret zu planen, Aufgaben zu verteilen und Entscheidungen sachlich zu begründen. Ihr Thema lautet: ${v.teil3Topic}.` },
  { id: "section_transition23_formal_05", style: "formal", render: (v) => `Damit ist Teil zwei abgeschlossen. Als letzten Teil planen Sie bitte eine Aufgabe, und zwar sachlich, zielgerichtet und mit einer klaren Aufteilung der Verantwortung. Ihre Aufgabe: ${v.teil3Topic}.` },
  { id: "section_transition23_formal_06", style: "formal", render: (v) => `Vielen Dank. Es folgt nun der dritte und letzte Teil der Prüfung. Hier planen Sie ein Vorhaben von der ersten Idee bis zur konkreten Entscheidung und begründen jeden Ihrer Schritte nachvollziehbar. Die Aufgabe lautet: ${v.teil3Topic}.` },
  { id: "section_transition23_formal_07", style: "formal", render: (v) => `Damit endet Teil zwei. Wir kommen nun zu Teil drei, in dem Sie ein Vorhaben organisieren: Machen Sie Vorschläge, reagieren Sie auf Ideen und einigen Sie sich am Ende auf einen verbindlichen Plan. Ihre gemeinsame Aufgabe: ${v.teil3Topic}.` },
  { id: "section_transition23_formal_08", style: "formal", render: (v) => `Vielen Dank für dieses Gespräch. Teil drei beginnt jetzt, und er verlangt von Ihnen, Verantwortung für eine Planung zu übernehmen, Vorschläge zu priorisieren und Ihre Entscheidungen zu begründen. Planen Sie gemeinsam: ${v.teil3Topic}.` },
  // warm
  { id: "section_transition23_warm_01", style: "warm", render: (v) => `Schönes Gespräch, danke Ihnen beiden. Jetzt kommt der letzte Teil — planen Sie gemeinsam: ${v.teil3Topic}.` },
  { id: "section_transition23_warm_02", style: "warm", render: (v) => `Gut gemacht, das war Teil zwei. Zum Schluss planen Sie jetzt gemeinsam: ${v.teil3Topic}.` },
  { id: "section_transition23_warm_03", style: "warm", render: (v) => `Danke, das war ein schönes Gespräch. Jetzt kommt Teil drei: Überlegen Sie gemeinsam, wie Sie ${v.teil3Topic} angehen.` },
  { id: "section_transition23_warm_04", style: "warm", render: (v) => `Sehr schön, vielen Dank. Der letzte Teil steht an — planen Sie zusammen: ${v.teil3Topic}.` },
  { id: "section_transition23_warm_05", style: "warm", render: (v) => `Gut gemacht, beide! Jetzt geht's an die gemeinsame Planung: ${v.teil3Topic}.` },
  { id: "section_transition23_warm_06", style: "warm", render: (v) => `Das war schön zu hören, danke. Zum Abschluss: Planen Sie gemeinsam ${v.teil3Topic}.` },
  { id: "section_transition23_warm_07", style: "warm", render: (v) => `Vielen Dank Ihnen beiden. Jetzt kommt der letzte Teil — stimmen Sie sich gemeinsam ab zu: ${v.teil3Topic}.` },
  { id: "section_transition23_warm_08", style: "warm", render: (v) => `Gut gemacht! Zum Schluss dürfen Sie jetzt gemeinsam planen: ${v.teil3Topic}.` },
  // calm
  { id: "section_transition23_calm_01", style: "calm", render: (v) => `Vielen Dank. Teil zwei ist damit abgeschlossen. Es folgt nun Teil drei: die gemeinsame Planung von ${v.teil3Topic}.` },
  { id: "section_transition23_calm_02", style: "calm", render: (v) => `Danke. Wir kommen nun zum letzten Teil. Ihre Aufgabe: gemeinsam ${v.teil3Topic} zu planen.` },
  { id: "section_transition23_calm_03", style: "calm", render: (v) => `Damit ist Teil zwei beendet. Zum Abschluss folgt die gemeinsame Planung von: ${v.teil3Topic}.` },
  { id: "section_transition23_calm_04", style: "calm", render: (v) => `Vielen Dank für dieses Gespräch. Wir wenden uns nun Teil drei zu: ${v.teil3Topic}.` },
  { id: "section_transition23_calm_05", style: "calm", render: (v) => `Damit schließen wir Teil zwei ab. Es folgt, als letzter Teil, die gemeinsame Planung: ${v.teil3Topic}.` },
  { id: "section_transition23_calm_06", style: "calm", render: (v) => `Vielen Dank. Der letzte Teil beginnt nun. Planen Sie in Ruhe gemeinsam: ${v.teil3Topic}.` },
  { id: "section_transition23_calm_07", style: "calm", render: (v) => `Teil zwei ist abgeschlossen. Nehmen Sie sich für den letzten Teil Zeit, gemeinsam zu planen: ${v.teil3Topic}.` },
  { id: "section_transition23_calm_08", style: "calm", render: (v) => `Vielen Dank für diesen Teil. Es folgt nun, geordnet, der letzte Teil: ${v.teil3Topic}.` },
];

// Spoken closing lines for an exam that ends ABNORMALLY (credits ran out,
// prolonged silence, or the partner's connection never came back) — before
// this, every one of these paths cut the AI's audio dead silent and jumped
// straight to a text-only "terminated" screen, while the NATURAL end-of-
// exam path (exam_end, above) always got a proper spoken goodbye.
//
// MOVED 2026-10-03 to fixedPhrases.ts (as EARLY_END_TIME_UP_PHRASES etc.):
// these are candidate-name- and topic-free just like welcome/exam_end — the
// ElevenLabs account-tier restriction that blocked true pre-generation for
// everything (see generateLibrary.ts's header) has since been resolved, so
// treating these as live-TTS-only "controlled variation" text (the original
// 2026-09-30 design) was leaving free cost savings on the table. Callers now
// go through room.live.playLibraryPhrase("early_end_*") directly — the same
// mechanism welcome/exam_end already use, with its own built-in live-TTS
// fallback (via getFixedPool + pickVariant) for exactly this content if the
// audio library hasn't been (re)generated yet for a given voice.

function pick<V>(category: string, variants: Variant<V>[], voiceId: string, vars: V): string {
  const chosen = pickVariant(category, variants, assignPhraseStyle(voiceId));
  return chosen.render(vars);
}

/** A scripted line split at a sentence boundary into a FIXED lead (no candidate
 * name / topic in it -> can be pre-generated once per voice and replayed at $0)
 * and a dynamic rest (carries the real name/topic -> synthesized live). `lead`
 * is "" when the variant has no worthwhile fixed first sentence (e.g. it opens
 * with the candidate's name) — then `full` is spoken live exactly as before. */
export interface ScriptedLine { id: string; full: string; lead: string; rest: string }

const PLACEHOLDER = "\u0001"; // never appears in real phrase text
const MIN_LEAD_CHARS = 18; // below this the saved TTS isn't worth a separate clip

/** Splits already-rendered text at the last sentence boundary ([.!?:] + space)
 * that comes BEFORE the first placeholder. Colons count: "…folgendes Thema:" +
 * [topic] is a natural pause point. */
function splitAtLead(rendered: string): string {
  const firstDynamic = rendered.indexOf(PLACEHOLDER);
  if (firstDynamic < 0) return "";
  const m = /^([\s\S]*[.!?:])\s+/.exec(rendered.slice(0, firstDynamic));
  return m && m[1].length >= MIN_LEAD_CHARS ? m[1] : "";
}

function pickLine<V>(category: string, variants: Variant<V>[], voiceId: string, vars: V, placeholderVars: V, styleOverride?: string): ScriptedLine {
  const chosen = pickVariant(category, variants, styleOverride ?? assignPhraseStyle(voiceId));
  const full = chosen.render(vars);
  const lead = splitAtLead(chosen.render(placeholderVars));
  // The lead has no dynamic text, so the real render must start with it — if it
  // ever doesn't (a template edit that breaks the invariant), fall back to the
  // whole line rather than speak something wrong.
  if (!lead || !full.startsWith(lead)) return { id: chosen.id, full, lead: "", rest: full };
  return { id: chosen.id, full, lead, rest: full.slice(lead.length).trimStart() };
}

const P = PLACEHOLDER;
const PH_EXAM_START: ExamStartVars = { aName: P, topicA: P };
const PH_TASK_TRANSITION: TaskTransitionVars = { bName: P, topicB: P };
const PH_SECTION_12: SectionTransitionVars = { teil2Topic: P };
const PH_SECTION_23: Teil3SectionTransitionVars = { teil3Topic: P };

export function pickExamStartLine(v: ExamStartVars, voiceId: string): ScriptedLine {
  return pickLine("exam_start", EXAM_START_VARIANTS, voiceId, { ...v, topicA: cleanTopic(v.topicA) }, PH_EXAM_START);
}
export function pickTaskTransitionLine(v: TaskTransitionVars, voiceId: string): ScriptedLine {
  return pickLine("task_transition", TASK_TRANSITION_VARIANTS, voiceId, { ...v, topicB: cleanTopic(v.topicB) }, PH_TASK_TRANSITION);
}
export function pickSectionTransition12Line(v: SectionTransitionVars, voiceId: string): ScriptedLine {
  return pickLine("section_transition_1_2", SECTION_TRANSITION_12_VARIANTS, voiceId, { ...v, teil2Topic: cleanTopic(v.teil2Topic) }, PH_SECTION_12);
}
export function pickSectionTransition23Line(v: Teil3SectionTransitionVars, voiceId: string): ScriptedLine {
  return pickLine("section_transition_2_3", SECTION_TRANSITION_23_VARIANTS, voiceId, { ...v, teil3Topic: cleanTopic(v.teil3Topic) }, PH_SECTION_23);
}

/** Every fixed lead sentence that can be pre-generated, for
 * phraseLibrary/generateScriptedLeads.ts and the library tests. Variants whose
 * first sentence already contains the candidate name / topic have no lead. */
export function getScriptedLeadPhrases(): { id: string; style: PhraseStyle; text: string }[] {
  const out: { id: string; style: PhraseStyle; text: string }[] = [];
  const add = <V,>(variants: Variant<V>[], placeholderVars: V) => {
    for (const v of variants) {
      const lead = splitAtLead(v.render(placeholderVars));
      if (lead) out.push({ id: v.id, style: v.style, text: lead });
    }
  };
  add(EXAM_START_VARIANTS, PH_EXAM_START);
  add(TASK_TRANSITION_VARIANTS, PH_TASK_TRANSITION);
  add(SECTION_TRANSITION_12_VARIANTS, PH_SECTION_12);
  add(SECTION_TRANSITION_23_VARIANTS, PH_SECTION_23);
  return out;
}

export function pickExamStart(v: ExamStartVars, voiceId: string): string {
  return pick("exam_start", EXAM_START_VARIANTS, voiceId, { ...v, topicA: cleanTopic(v.topicA) });
}

export function pickTaskTransition(v: TaskTransitionVars, voiceId: string): string {
  return pick("task_transition", TASK_TRANSITION_VARIANTS, voiceId, { ...v, topicB: cleanTopic(v.topicB) });
}

export function pickSectionTransition12(v: SectionTransitionVars, voiceId: string): string {
  return pick("section_transition_1_2", SECTION_TRANSITION_12_VARIANTS, voiceId, { ...v, teil2Topic: cleanTopic(v.teil2Topic) });
}

export function pickSectionTransition23(v: Teil3SectionTransitionVars, voiceId: string): string {
  return pick("section_transition_2_3", SECTION_TRANSITION_23_VARIANTS, voiceId, { ...v, teil3Topic: cleanTopic(v.teil3Topic) });
}

// ---------------------------------------------------------------------------
// 1:1 AI tutor reuse (owner 2026-10-06: "the transitions and endings are the same as in the 2:1 exam").
// The 2:1 pools above were written for TWO candidates, so a few variants talk to "Sie beide" / "Ihnen beiden" / "Ihre Präsentationen" /
// "ein Gespräch zwischen Ihnen". Those would sound wrong to a single student, so the tutor draws only from the variants that read
// naturally for one person — same wording, same cached audio clips (the clips are keyed by variant id + voice, so nothing new has to be
// generated and every cached line costs $0 at runtime). The filter works on the RENDERED text, so it stays correct when a variant is edited.
// ---------------------------------------------------------------------------
const NOT_FOR_ONE = /\b(beide|beiden|miteinander)\b|zwischen Ihnen|Präsentationen|Sie beide/i;
const NOT_FOR_ONE_TEIL2 = /\bgemeinsam\w*/i; // the 1:1 Teil 2 is a Q&A with the examiner, not "sprechen Sie gemeinsam" with a partner

export function isReadableForOneCandidate(text: string, section: "teil1_2" | "teil2_3" | "end"): boolean {
  if (NOT_FOR_ONE.test(text)) return false;
  if (section === "teil1_2" && NOT_FOR_ONE_TEIL2.test(text)) return false;
  return true;
}

function soloVariants<V>(variants: Variant<V>[], placeholderVars: V, section: "teil1_2" | "teil2_3"): Variant<V>[] {
  return variants.filter((v) => isReadableForOneCandidate(v.render(placeholderVars), section));
}

export function pickSoloSectionTransition12Line(v: SectionTransitionVars, voiceId: string): ScriptedLine {
  return pickLine("solo_section_transition_1_2", soloVariants(SECTION_TRANSITION_12_VARIANTS, PH_SECTION_12, "teil1_2"), voiceId, { ...v, teil2Topic: cleanTopic(v.teil2Topic) }, PH_SECTION_12, TUTOR_PHRASE_STYLE);
}
export function pickSoloSectionTransition23Line(v: Teil3SectionTransitionVars, voiceId: string): ScriptedLine {
  return pickLine("solo_section_transition_2_3", soloVariants(SECTION_TRANSITION_23_VARIANTS, PH_SECTION_23, "teil2_3"), voiceId, { ...v, teil3Topic: cleanTopic(v.teil3Topic) }, PH_SECTION_23, TUTOR_PHRASE_STYLE);
}

/** Owner 2026-10-09: the 1:1 tutor always speaks the professional register. The per-voice style hash (formal / warm / calm) would otherwise give
 * most voices casual or curt wording ("Das war's — die Prüfung ist geschafft!", "Teil eins ist abgeschlossen."). */
export const TUTOR_PHRASE_STYLE = "formal";

/** Every fixed lead sentence of the 1:1 tutor's transitions (formal, solo-readable variants only) — what generateTutorLibrary.ts pre-generates. */
export function getSoloTransitionLeadPhrases(): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  const add = <V,>(variants: Variant<V>[], placeholderVars: V, section: "teil1_2" | "teil2_3") => {
    for (const v of soloVariants(variants, placeholderVars, section)) {
      if (v.style !== TUTOR_PHRASE_STYLE) continue;
      const lead = splitAtLead(v.render(placeholderVars));
      if (lead) out.push({ id: v.id, text: lead });
    }
  };
  add(SECTION_TRANSITION_12_VARIANTS, PH_SECTION_12, "teil1_2");
  add(SECTION_TRANSITION_23_VARIANTS, PH_SECTION_23, "teil2_3");
  return out;
}

// ---------------------------------------------------------------------------
// 1:1 tutor OPENING (owner 2026-10-10: "the welcome must be cached, only the topic live"). Every variant puts the fixed, name-free instructions
// FIRST and the candidate's name + topic AFTER the last sentence boundary, so splitAtLead() turns the first ~250 characters into a cached clip
// ($0, instant) and only "<name>, Ihr Thema lautet: <topic>. ..." is synthesized live right behind it. Professional register only.
// ---------------------------------------------------------------------------
const SOLO_EXAM_START_VARIANTS: Variant<ExamStartVars>[] = [
  { id: "solo_exam_start_formal_01", style: "formal", render: (v) => `Guten Tag. Wir beginnen die Übung mit Teil eins der mündlichen Prüfung, der Präsentation. Bitte stellen Sie Ihr Thema zusammenhängend vor, begründen Sie Ihre Meinung nachvollziehbar und belegen Sie sie mit Beispielen. ${v.aName}, Ihr Thema lautet: ${v.topicA}. Sie haben dafür etwa anderthalb Minuten Zeit; beginnen Sie bitte, sobald Sie bereit sind.` },
  { id: "solo_exam_start_formal_02", style: "formal", render: (v) => `Guten Tag. Ich begrüße Sie zur Übung der mündlichen Prüfung, die aus drei Teilen besteht. Wir beginnen mit Teil eins, der Präsentation: Gliedern Sie Ihren Beitrag klar, nennen Sie Ihre Argumente und belegen Sie diese mit Beispielen aus Ihrem Alltag. ${v.aName}, Ihr Thema lautet: ${v.topicA}. Dafür stehen Ihnen etwa anderthalb Minuten zur Verfügung; beginnen Sie bitte, sobald Sie bereit sind.` },
  { id: "solo_exam_start_formal_03", style: "formal", render: (v) => `Guten Tag. Die mündliche Prüfung gliedert sich in drei Teile, und wir beginnen mit der Präsentation. Tragen Sie Ihr Thema zusammenhängend vor, begründen Sie Ihre Meinung nachvollziehbar und führen Sie passende Beispiele an. ${v.aName}, Ihr Thema lautet: ${v.topicA}. Sie haben etwa anderthalb Minuten Zeit und können beginnen, sobald Sie bereit sind.` },
  { id: "solo_exam_start_formal_04", style: "formal", render: (v) => `Guten Tag. Wir starten nun mit Teil eins der mündlichen Prüfung, der Präsentation eines Themas. Achten Sie auf einen klaren Aufbau, eine überzeugende Begründung Ihrer Meinung und auf konkrete Beispiele. ${v.aName}, Ihr Thema lautet: ${v.topicA}. Ihre Redezeit beträgt etwa anderthalb Minuten; beginnen Sie bitte, wenn Sie bereit sind.` },
];

export function pickSoloExamStartLine(v: ExamStartVars, voiceId: string): ScriptedLine {
  return pickLine("solo_exam_start", SOLO_EXAM_START_VARIANTS, voiceId, { ...v, topicA: cleanTopic(v.topicA) }, PH_EXAM_START, TUTOR_PHRASE_STYLE);
}

/** The fixed lead sentences of the 1:1 opening — what generateTutorLibrary.ts pre-generates next to the transition leads. */
export function getSoloExamStartLeadPhrases(): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  for (const v of SOLO_EXAM_START_VARIANTS) {
    const lead = splitAtLead(v.render(PH_EXAM_START));
    if (lead) out.push({ id: v.id, text: lead });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1:1 tutor ACKNOWLEDGEMENTS (owner 2026-10-10: cut the dead air after an answer). Once the student has been silent for the hold time, a short cached
// clip ("Vielen Dank.") is played at once while Claude + TTS finish the real question behind it — the student hears a reaction after ~3 s instead of
// ~5-7 s. Professional register, neutral (they never judge the answer or promise agreement, because the question has not been written yet).
// ---------------------------------------------------------------------------
export type AckKind = "examiner" | "presentation" | "partner";
export interface AckPhrase { id: string; text: string }

const ACK_PHRASES: Record<AckKind, AckPhrase[]> = {
  examiner: [
    { id: "ack_examiner_01", text: "Vielen Dank." },
    { id: "ack_examiner_02", text: "Danke schön, das habe ich verstanden." },
    { id: "ack_examiner_03", text: "Gut, vielen Dank für Ihre Antwort." },
    { id: "ack_examiner_04", text: "Ich danke Ihnen." },
    { id: "ack_examiner_05", text: "Danke, das war nachvollziehbar." },
    { id: "ack_examiner_06", text: "In Ordnung, vielen Dank." },
  ],
  presentation: [
    { id: "ack_presentation_01", text: "Vielen Dank für Ihre Präsentation." },
    { id: "ack_presentation_02", text: "Danke schön, damit ist Ihre Präsentation beendet." },
    { id: "ack_presentation_03", text: "Ich danke Ihnen für diesen Beitrag." },
  ],
  partner: [
    { id: "ack_partner_01", text: "Ja, das verstehe ich." },
    { id: "ack_partner_02", text: "Gut, danke dir." },
    { id: "ack_partner_03", text: "Okay, das habe ich verstanden." },
    { id: "ack_partner_04", text: "Danke für deinen Beitrag." },
    { id: "ack_partner_05", text: "Ja, ich verstehe, was du meinst." },
  ],
};

/** A random acknowledgement of this kind that differs from the previous one (so the same "Vielen Dank." is not heard twice in a row). */
export function pickTutorAck(kind: AckKind, avoidId?: string): AckPhrase {
  const pool = ACK_PHRASES[kind].filter((a) => a.id !== avoidId);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Every acknowledgement of one kind — what generateTutorLibrary.ts pre-generates (examiner + presentation for the examiner voices, partner for the partner voices). */
export function getTutorAckPhrases(kind: AckKind): AckPhrase[] {
  return ACK_PHRASES[kind];
}

/** The 2:1 exam's closing lines (cached audio library, category "exam_end") that are fine for a single student. */
export function getSoloExamEndPool() {
  return getFixedPool("exam_end").filter((p) => isReadableForOneCandidate(p.text, "end"));
}

/** Re-exported so callers only need one import for both fixed and scripted
 * phrase access where convenient (e.g. server.ts). */
export { getFixedPool };
