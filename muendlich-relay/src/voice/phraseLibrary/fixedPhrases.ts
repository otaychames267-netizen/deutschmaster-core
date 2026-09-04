/**
 * The two FULLY FIXED phrase categories — no candidate name, no topic, no
 * per-exam data of any kind — so every variant below can be pre-generated
 * ONCE per voice and replayed forever at zero runtime ElevenLabs cost. See
 * phraseTypes.ts's header for why exam_start/task_transition/
 * section_transition can't work this way (they carry real per-exam text).
 *
 * 24 variants per category (8 per style bucket: formal, warm, calm) — well
 * past the 20-minimum spec. Deliberately NOT simplistic single-clause lines
 * ("Willkommen zur Prüfung.") — every variant is a short paragraph that
 * actually welcomes/closes, sets context (the three-part structure), and
 * reads the way a real professional examiner would sound, not a chatbot.
 * Deliberately candidate-name-free (these are played before any per-exam
 * context is available / independent of who's in the room), which is the
 * one real trade-off of making them pre-generatable — documented, not
 * hidden; the immediately-following exam_start phrase (examinerPhrases.ts)
 * addresses each candidate by name right after.
 */
import type { FixedPhrase } from "./phraseTypes.js";

export const WELCOME_PHRASES: FixedPhrase[] = [
  // formal
  { id: "welcome_formal_01", category: "welcome", style: "formal", text: "Herzlich willkommen zu Ihrer mündlichen Prüfung. Bevor wir beginnen, ein kurzer Überblick über den Ablauf: Sie durchlaufen heute drei Teile — eine Präsentation, ein gemeinsames Gespräch sowie eine gemeinsame Planungsaufgabe. Nehmen Sie sich einen Moment Zeit, um anzukommen. Wir beginnen nun mit dem ersten Teil der Prüfung." },
  { id: "welcome_formal_02", category: "welcome", style: "formal", text: "Guten Tag und herzlich willkommen. Die heutige Prüfung besteht aus drei aufeinanderfolgenden Teilen: einer Präsentation, einem freien Gespräch und einer gemeinsamen Planungsaufgabe. Bitte antworten Sie stets vollständig und in ganzen Sätzen. Wir kommen nun zum ersten Teil." },
  { id: "welcome_formal_03", category: "welcome", style: "formal", text: "Willkommen zu Ihrer heutigen Prüfung. Der Ablauf gliedert sich in drei Abschnitte: Präsentation, Gespräch und Planung. Jeder Abschnitt prüft unterschiedliche sprachliche Fähigkeiten, daher lohnt es sich, in jedem Teil erneut volle Konzentration aufzubringen. Beginnen wir nun mit dem ersten Abschnitt." },
  { id: "welcome_formal_04", category: "welcome", style: "formal", text: "Herzlich willkommen. Bevor die Prüfung beginnt, möchte ich Ihnen kurz den Aufbau erläutern: Es folgen drei Teile — eine Präsentation, ein gemeinsames Gespräch und eine Planungsaufgabe, die Sie gemeinsam lösen. Bitte sprechen Sie durchgehend Deutsch und in vollständigen Sätzen. Wir starten jetzt mit Teil eins." },
  { id: "welcome_formal_05", category: "welcome", style: "formal", text: "Guten Tag. Ich begrüße Sie zu Ihrer mündlichen Prüfung. Diese besteht aus drei Teilen, die inhaltlich aufeinander aufbauen: einer Präsentation, einem Gespräch und einer gemeinsamen Planung. Bleiben Sie ruhig und sprechen Sie in Ihrem eigenen Tempo. Wir beginnen jetzt mit dem ersten Teil." },
  { id: "welcome_formal_06", category: "welcome", style: "formal", text: "Willkommen zur heutigen mündlichen Prüfung. Der Ablauf umfasst drei Teile: eine Präsentation, ein gemeinsames Gespräch und eine gemeinsame Planungsaufgabe. Zwischen den einzelnen Teilen erhalten Sie jeweils eine kurze Pause. Wir beginnen nun mit dem ersten Teil, der Präsentation." },
  { id: "welcome_formal_07", category: "welcome", style: "formal", text: "Herzlich willkommen zur Prüfung. Zu Ihrer Orientierung: Es erwarten Sie heute drei Teile — Präsentation, Gespräch und gemeinsame Planung — mit jeweils eigenem Zeitrahmen. Bitte hören Sie den Anweisungen zwischen den Teilen aufmerksam zu. Wir beginnen jetzt mit dem ersten Teil." },
  { id: "welcome_formal_08", category: "welcome", style: "formal", text: "Guten Tag und willkommen zu Ihrer Prüfung. Der heutige Ablauf besteht aus drei klar abgegrenzten Teilen: einer Präsentation, einem freien Gespräch und einer gemeinsamen Planungsaufgabe. Jeder Teil wird separat bewertet. Wir beginnen nun mit dem ersten Teil." },
  // warm
  { id: "welcome_warm_01", category: "welcome", style: "warm", text: "Herzlich willkommen — schön, dass Sie da sind. Keine Sorge, wenn Sie ein wenig aufgeregt sind, das ist ganz normal. Die Prüfung besteht aus drei Teilen: einer Präsentation, einem gemeinsamen Gespräch und einer gemeinsamen Planungsaufgabe. Nehmen Sie sich die Zeit, die Sie brauchen, und legen wir jetzt los mit dem ersten Teil." },
  { id: "welcome_warm_02", category: "welcome", style: "warm", text: "Guten Tag, schön, dass Sie beide hier sind. Sie haben sich sicher gut vorbereitet — jetzt geht es darum, das in Ruhe zu zeigen. Es erwarten Sie heute drei Teile: eine Präsentation, ein Gespräch und eine gemeinsame Planungsaufgabe. Wir beginnen nun mit dem ersten Teil." },
  { id: "welcome_warm_03", category: "welcome", style: "warm", text: "Herzlich willkommen zu Ihrer Prüfung. Atmen Sie kurz durch — Sie haben sich auf diesen Moment vorbereitet, und jetzt zeigen Sie einfach, was Sie können. Der Ablauf besteht aus drei Teilen: Präsentation, Gespräch und gemeinsame Planung. Fangen wir gemeinsam an." },
  { id: "welcome_warm_04", category: "welcome", style: "warm", text: "Schön, dass Sie beide da sind, und herzlich willkommen. Es folgen heute drei Teile — eine Präsentation, ein Gespräch und eine gemeinsame Planung —, und Sie dürfen sich dabei ruhig Zeit lassen. Wir starten jetzt mit dem ersten Teil." },
  { id: "welcome_warm_05", category: "welcome", style: "warm", text: "Willkommen zu Ihrer mündlichen Prüfung. Es ist ganz normal, ein bisschen nervös zu sein — das geht fast allen so. Sie erwarten heute drei Teile: eine Präsentation, ein gemeinsames Gespräch und eine gemeinsame Planungsaufgabe. Wir beginnen jetzt, und Sie schaffen das." },
  { id: "welcome_warm_06", category: "welcome", style: "warm", text: "Herzlich willkommen, ich freue mich, dass Sie beide heute hier sind. Die Prüfung gliedert sich in drei Teile — Präsentation, Gespräch und Planung —, und Sie werden durch jeden Teil klar begleitet. Legen wir los mit dem ersten Teil." },
  { id: "welcome_warm_07", category: "welcome", style: "warm", text: "Guten Tag und willkommen. Nehmen Sie sich einen Moment, anzukommen — es folgen drei Teile: eine Präsentation, ein gemeinsames Gespräch und eine gemeinsame Planungsaufgabe. Sprechen Sie einfach so natürlich, wie Sie es gewohnt sind. Wir beginnen jetzt." },
  { id: "welcome_warm_08", category: "welcome", style: "warm", text: "Schön, Sie beide heute hier zu haben — herzlich willkommen. Der Ablauf umfasst drei Teile, eine Präsentation, ein Gespräch und eine gemeinsame Planung, und zwischen den Teilen bleibt jeweils kurz Zeit zum Durchatmen. Kommen wir nun zum ersten Teil." },
  // calm
  { id: "welcome_calm_01", category: "welcome", style: "calm", text: "Willkommen zu Ihrer mündlichen Prüfung. Der Ablauf folgt einer klaren Struktur mit drei Teilen: einer Präsentation, einem Gespräch und einer gemeinsamen Planungsaufgabe. Jeder Teil hat einen eigenen Schwerpunkt und einen eigenen zeitlichen Rahmen. Wir beginnen nun, in Ruhe, mit dem ersten Teil." },
  { id: "welcome_calm_02", category: "welcome", style: "calm", text: "Herzlich willkommen. Zur Orientierung: Die Prüfung verläuft in drei klar getrennten Abschnitten — Präsentation, Gespräch, gemeinsame Planung —, jeweils mit eigenem Fokus. Lassen Sie sich Zeit bei Ihren Antworten. Wir beginnen jetzt mit dem ersten Abschnitt." },
  { id: "welcome_calm_03", category: "welcome", style: "calm", text: "Guten Tag. Bevor wir beginnen, kurz zur Struktur: Es folgen drei Teile mit unterschiedlicher Aufgabenstellung — eine Präsentation, ein Gespräch und eine gemeinsame Planung. Jeder Teil steht eigenständig, unabhängig vom vorherigen. Wir starten nun mit dem ersten Teil." },
  { id: "welcome_calm_04", category: "welcome", style: "calm", text: "Willkommen. Der heutige Ablauf ist in drei Teile gegliedert: Präsentation, Gespräch und gemeinsame Planungsaufgabe, jeweils mit klar definiertem Zeitrahmen. Konzentrieren Sie sich auf jeden Teil für sich. Wir beginnen nun mit dem ersten Teil." },
  { id: "welcome_calm_05", category: "welcome", style: "calm", text: "Herzlich willkommen zu Ihrer Prüfung. Der Ablauf gliedert sich in drei aufeinanderfolgende, in sich abgeschlossene Teile: eine Präsentation, ein Gespräch und eine gemeinsame Planung. Nehmen Sie sich zwischen den Antworten ruhig einen Moment Zeit zum Nachdenken. Wir beginnen jetzt mit dem ersten Teil." },
  { id: "welcome_calm_06", category: "welcome", style: "calm", text: "Guten Tag und willkommen. Zur Struktur der Prüfung: drei Teile, jeweils mit eigenem Ziel — eine Präsentation, ein Gespräch, eine gemeinsame Planungsaufgabe. Die Reihenfolge ist fest vorgegeben, der Rhythmus liegt bei Ihnen. Wir beginnen nun mit dem ersten Teil." },
  { id: "welcome_calm_07", category: "welcome", style: "calm", text: "Willkommen zu Ihrer mündlichen Prüfung. Es erwarten Sie drei inhaltlich unterschiedliche Teile: eine Präsentation, ein gemeinsames Gespräch und eine gemeinsame Planungsaufgabe. Jeder Teil wird für sich betrachtet bewertet. Beginnen wir nun, Schritt für Schritt, mit dem ersten Teil." },
  { id: "welcome_calm_08", category: "welcome", style: "calm", text: "Herzlich willkommen. Der Ablauf der Prüfung besteht aus drei klar strukturierten Teilen — Präsentation, Gespräch, gemeinsame Planung —, die nacheinander folgen. Bleiben Sie ruhig, jeder Teil hat seinen eigenen Raum. Wir beginnen nun mit dem ersten Teil." },
];

export const EXAM_END_PHRASES: FixedPhrase[] = [
  // formal
  { id: "exam_end_formal_01", category: "exam_end", style: "formal", text: "Damit ist die heutige Prüfung abgeschlossen. Vielen Dank für Ihre Teilnahme und Ihre Mitarbeit in allen drei Teilen. Die Ergebnisse werden im Anschluss ausgewertet. Ich wünsche Ihnen für den weiteren Verlauf alles Gute." },
  { id: "exam_end_formal_02", category: "exam_end", style: "formal", text: "Wir sind am Ende der heutigen Prüfung angelangt. Vielen Dank, dass Sie sich der Aufgabe in allen drei Teilen gestellt haben. Die Auswertung erfolgt im Nachgang. Auf Wiedersehen und alles Gute." },
  { id: "exam_end_formal_03", category: "exam_end", style: "formal", text: "Damit endet die mündliche Prüfung. Ich bedanke mich für Ihre konzentrierte Mitarbeit während der gesamten Prüfungszeit. Die Bewertung wird Ihnen zu gegebener Zeit mitgeteilt. Vielen Dank und auf Wiedersehen." },
  { id: "exam_end_formal_04", category: "exam_end", style: "formal", text: "Die heutige Prüfung ist hiermit beendet. Vielen Dank für Ihre Teilnahme und Ihre Anstrengung in allen Teilen der Prüfung. Weitere Schritte zur Auswertung folgen im Anschluss. Alles Gute für Sie." },
  { id: "exam_end_formal_05", category: "exam_end", style: "formal", text: "Damit schließen wir die heutige Prüfung ab. Ich danke Ihnen für Ihre Mitwirkung und Ihre Geduld während aller drei Teile. Die Ergebnisse werden gesondert mitgeteilt. Auf Wiedersehen." },
  { id: "exam_end_formal_06", category: "exam_end", style: "formal", text: "Die Prüfung ist damit abgeschlossen. Vielen Dank für Ihre Teilnahme an allen drei Teilen der heutigen Prüfung. Die Auswertung Ihrer Leistung erfolgt im Anschluss. Ich wünsche Ihnen weiterhin viel Erfolg." },
  { id: "exam_end_formal_07", category: "exam_end", style: "formal", text: "Wir kommen damit zum Ende der heutigen Prüfung. Vielen Dank für Ihre Mitarbeit und Ihr Engagement in allen drei Teilen. Die Bewertung wird im Nachgang erstellt. Auf Wiedersehen und alles Gute." },
  { id: "exam_end_formal_08", category: "exam_end", style: "formal", text: "Damit ist die mündliche Prüfung beendet. Ich bedanke mich für Ihre vollständige und konzentrierte Teilnahme. Die Ergebnisse folgen zu einem späteren Zeitpunkt. Vielen Dank und auf Wiedersehen." },
  // warm
  { id: "exam_end_warm_01", category: "exam_end", style: "warm", text: "Das war's — die Prüfung ist geschafft! Vielen Dank, dass Sie sich so engagiert eingebracht haben, in allen drei Teilen. Sie können jetzt durchatmen. Alles Gute für Sie, und auf Wiedersehen." },
  { id: "exam_end_warm_02", category: "exam_end", style: "warm", text: "Damit sind wir am Ende angekommen — gut gemacht! Vielen Dank für Ihre Mitarbeit und Ihren Einsatz während der ganzen Prüfung. Die Auswertung folgt bald. Auf Wiedersehen und viel Erfolg weiterhin." },
  { id: "exam_end_warm_03", category: "exam_end", style: "warm", text: "Herzlichen Dank, das war eine schöne Prüfung mit Ihnen beiden. Sie haben sich durch alle drei Teile durchgearbeitet — das ist geschafft. Ich wünsche Ihnen alles Gute für die Zukunft. Auf Wiedersehen." },
  { id: "exam_end_warm_04", category: "exam_end", style: "warm", text: "Die Prüfung ist nun zu Ende, vielen Dank für Ihre Zeit und Ihre Mühe. Sie haben sich in allen drei Teilen wirklich eingebracht. Jetzt heißt es erst einmal entspannen. Alles Gute und auf Wiedersehen." },
  { id: "exam_end_warm_05", category: "exam_end", style: "warm", text: "Das war's für heute — vielen Dank, dass Sie so aktiv dabei waren. Alle drei Teile sind geschafft, machen Sie sich keine Sorgen mehr darüber. Ich wünsche Ihnen alles Gute. Auf Wiedersehen." },
  { id: "exam_end_warm_06", category: "exam_end", style: "warm", text: "Damit ist die Prüfung beendet — schön, dass Sie mitgemacht haben. Vielen Dank für Ihre offene und engagierte Art während der gesamten Zeit. Alles Weitere folgt im Anschluss. Auf Wiedersehen und viel Erfolg." },
  { id: "exam_end_warm_07", category: "exam_end", style: "warm", text: "So, das war die Prüfung — vielen Dank für Ihre Teilnahme und Ihre gute Mitarbeit. Sie können jetzt entspannen, alle drei Teile liegen hinter Ihnen. Ich wünsche Ihnen alles Gute. Auf Wiedersehen." },
  { id: "exam_end_warm_08", category: "exam_end", style: "warm", text: "Wir sind am Ende der Prüfung angelangt. Vielen Dank, dass Sie sich so engagiert gezeigt haben — das war schön zu erleben. Ich wünsche Ihnen für alles Weitere viel Erfolg. Auf Wiedersehen." },
  // calm
  { id: "exam_end_calm_01", category: "exam_end", style: "calm", text: "Damit ist die Prüfung beendet. Vielen Dank für Ihre Teilnahme an allen drei Teilen. Nehmen Sie sich jetzt einen Moment, bevor es weitergeht. Auf Wiedersehen und alles Gute." },
  { id: "exam_end_calm_02", category: "exam_end", style: "calm", text: "Die heutige Prüfung ist damit abgeschlossen. Ich danke Ihnen für Ihre ruhige und konzentrierte Mitarbeit während der gesamten Zeit. Die Auswertung erfolgt im Anschluss, ohne dass Sie weiter etwas tun müssen. Auf Wiedersehen." },
  { id: "exam_end_calm_03", category: "exam_end", style: "calm", text: "Wir sind am Ende der Prüfung angekommen. Vielen Dank für Ihre Teilnahme an allen drei Teilen. Bleiben Sie ruhig, der Rest folgt jetzt automatisch. Auf Wiedersehen und alles Gute." },
  { id: "exam_end_calm_04", category: "exam_end", style: "calm", text: "Damit endet die heutige Prüfung. Vielen Dank für Ihre Mitarbeit und Ihre Aufmerksamkeit während aller drei Teile. Weitere Schritte sind für Sie nicht nötig. Auf Wiedersehen." },
  { id: "exam_end_calm_05", category: "exam_end", style: "calm", text: "Die Prüfung ist hiermit beendet. Ich bedanke mich für Ihre konzentrierte Teilnahme über die gesamte Zeit hinweg. Alles Weitere übernehmen wir. Auf Wiedersehen und alles Gute." },
  { id: "exam_end_calm_06", category: "exam_end", style: "calm", text: "Damit schließt die heutige Prüfung. Vielen Dank für Ihre ruhige und strukturierte Mitarbeit in allen drei Teilen. Die Auswertung erfolgt gesondert. Auf Wiedersehen." },
  { id: "exam_end_calm_07", category: "exam_end", style: "calm", text: "Wir kommen zum Ende der Prüfung. Vielen Dank für Ihre Teilnahme und Ihre Geduld während des gesamten Ablaufs. Sie müssen jetzt nichts weiter tun. Auf Wiedersehen und alles Gute." },
  { id: "exam_end_calm_08", category: "exam_end", style: "calm", text: "Damit ist die Prüfung abgeschlossen. Ich danke Ihnen für Ihre Mitarbeit in allen drei Teilen der heutigen Prüfung. Nehmen Sie sich nun die Zeit, die Sie brauchen. Auf Wiedersehen." },
];

export function getFixedPool(category: "welcome" | "exam_end"): FixedPhrase[] {
  return category === "welcome" ? WELCOME_PHRASES : EXAM_END_PHRASES;
}
