/**
 * Redemittel für den informellen B1-Brief — Lernhilfe AUSSERHALB des Briefes (gleiches Prinzip wie redemittel.ts für B2): ein gemeinsames,
 * nach den Bausteinen eines Antwortbriefs geordnetes Nachschlagewerk, das in der Struktur-Ansicht unter dem Brief eingeklappt angeboten wird.
 * B1-Niveau: kurze, alltägliche Wendungen, die sich in jedem Antwortbrief an Freunde verwenden lassen.
 */
import type { RedemittelGroup } from "@/components/schreiben/redemittel";

export const REDEMITTEL_B1: RedemittelGroup[] = [
  {
    title: "Anrede",
    phrases: ["Liebe Anna, / Lieber Paul,", "Hallo Anna,", "Hi Paul,", "Liebe Anna, lieber Paul,"],
  },
  {
    title: "Einstieg & Danke für die E-Mail",
    phrases: [
      "vielen Dank für deine E-Mail!",
      "ich habe mich sehr über deine Nachricht gefreut.",
      "schön, von dir zu hören!",
      "danke, dass du mir geschrieben hast.",
      "es tut mir leid, dass ich erst jetzt antworte.",
    ],
  },
  {
    title: "Auf Neuigkeiten reagieren",
    phrases: [
      "Das ist ja toll! Herzlichen Glückwunsch!",
      "Das freut mich sehr für dich.",
      "Das klingt wunderbar!",
      "Oh, das tut mir leid. Gute Besserung!",
      "Ich bin sehr überrascht, aber ich freue mich.",
    ],
  },
  {
    title: "Zusagen & Einladung annehmen",
    phrases: [
      "Ich komme sehr gern.",
      "Die Einladung nehme ich gern an.",
      "Das passt mir gut.",
      "Darauf freue ich mich schon.",
      "Das ist eine tolle Idee!",
    ],
  },
  {
    title: "Absagen & Alternative vorschlagen",
    phrases: [
      "Leider kann ich an dem Tag nicht kommen, weil …",
      "Schade, aber da habe ich schon etwas vor.",
      "Wie wäre es stattdessen mit …?",
      "Vielleicht können wir uns an einem anderen Tag treffen.",
      "Passt es dir auch am …?",
    ],
  },
  {
    title: "Vorschläge & Tipps geben",
    phrases: [
      "Ich schlage vor, dass wir …",
      "Wie wäre es, wenn wir …?",
      "Du könntest / Du solltest …",
      "Mein Tipp: …",
      "An deiner Stelle würde ich …",
    ],
  },
  {
    title: "Hilfe anbieten",
    phrases: [
      "Ich helfe dir gern bei …",
      "Soll ich … mitbringen?",
      "Ich kann … übernehmen.",
      "Wenn du möchtest, komme ich früher und …",
      "Sag mir einfach, was du brauchst.",
    ],
  },
  {
    title: "Fragen stellen",
    phrases: [
      "Wie ist es bei dir?",
      "Wann / Wo / Wie / Wie viele …?",
      "Weißt du schon, ob …?",
      "Hast du Lust, … zu …?",
      "Was meinst du dazu?",
    ],
  },
  {
    title: "Von sich erzählen",
    phrases: [
      "Bei mir gibt es auch Neuigkeiten:",
      "In letzter Zeit habe ich viel erlebt.",
      "Ich habe gerade …",
      "Außerdem möchte ich dir erzählen, dass …",
      "Zurzeit lerne ich / arbeite ich / wohne ich …",
    ],
  },
  {
    title: "Schluss & Grußformel",
    phrases: [
      "Schreib mir bald!",
      "Ich freue mich auf deine Antwort.",
      "Ich freue mich schon darauf, dich zu sehen.",
      "Liebe Grüße / Viele Grüße / Herzliche Grüße",
      "Bis bald / Alles Liebe",
    ],
  },
];
