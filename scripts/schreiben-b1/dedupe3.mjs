// v2 diversity pass #2: the ~12 stock sentences that recur 5-16 times across the bank (style frames like "Zu deinen Punkten nehme ich der Reihe nach
// Stellung.") keep their first CAP occurrences, later ones get an individually worded variant (plain-text sentences only).
// usage: node scripts/schreiben-b1/dedupe3.mjs [--apply]
import { readFileSync } from "node:fs";
import { TASKS } from "./manifest.mjs";
import { loadTask } from "./build.mjs";
import { writeRetry } from "./fsretry.mjs";

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CAP = 4, apply = process.argv.includes("--apply");
const V = {
  "Zu deinen Punkten nehme ich der Reihe nach Stellung.": ["Deine Punkte beantworte ich nacheinander.", "Zu jedem deiner Punkte sage ich kurz etwas.", "Auf deine Punkte gehe ich der Reihe nach ein.", "Ich nehme mir deine Punkte einzeln vor.", "Deine Punkte gehe ich jetzt der Reihe nach durch.", "Zu allem, was du angesprochen hast, äußere ich mich nacheinander.", "Ich antworte dir auf jeden Punkt einzeln.", "Zu deinen Anliegen nehme ich nacheinander Stellung.", "Hier meine Stellungnahme zu deinen Punkten, schön geordnet.", "Jeden deiner Punkte beantworte ich in der Reihenfolge, in der du ihn genannt hast.", "Ich gehe auf alle deine Punkte der Reihe nach ein.", "Dazu nehme ich Punkt für Punkt Stellung."],
  "Zu deinen Fragen nehme ich der Reihe nach Stellung.": ["Deine Fragen beantworte ich nacheinander.", "Auf deine Fragen gehe ich der Reihe nach ein.", "Ich beantworte deine Fragen einzeln.", "Zu jeder deiner Fragen sage ich etwas.", "Deine Fragen gehe ich jetzt der Reihe nach durch."],
  "Bei mir gibt es eine Veränderung im Beruf.": ["Beruflich hat sich bei mir etwas verändert.", "Bei meiner Arbeit gibt es Neuigkeiten.", "In meinem Job hat sich etwas getan.", "Im Beruf ist bei mir einiges anders geworden.", "Auf der Arbeit gibt es eine Veränderung.", "Beruflich tut sich bei mir gerade etwas.", "Mein Berufsleben hat sich ein wenig verändert.", "Bei mir hat sich im Job etwas Neues ergeben."],
  "Ich habe gleich mehrere Vorschläge.": ["Dazu habe ich mehrere Ideen.", "Mir fallen gleich einige Vorschläge ein.", "Ich möchte dir ein paar Vorschläge machen.", "Dazu hätte ich einige Vorschläge.", "Ich habe mir dazu schon Gedanken gemacht.", "Mir sind dazu mehrere Ideen gekommen."],
  "Bei mir hat sich nicht viel verändert.": ["Bei mir ist alles ziemlich beim Alten.", "Bei mir ist nicht viel Neues passiert.", "Bei mir läuft alles wie immer.", "Bei mir gibt es kaum Neuigkeiten."],
  "Jetzt geht es mir wieder gut.": ["Inzwischen geht es mir wieder besser.", "Mittlerweile bin ich wieder fit."],
  "Bei mir gibt es ein neues Hobby, das mir Freude macht.": ["Ich habe ein neues Hobby, das mir viel Spaß bringt.", "Seit Kurzem habe ich ein Hobby, das mir richtig gefällt."],
  "Ich freue mich auf deine Antwort.": ["Auf deine Antwort bin ich schon gespannt.", "Deine Antwort erwarte ich mit Vorfreude."],
  "Ich habe gleich mehrere Vorschläge für dich.": ["Ich habe dir ein paar Vorschläge mitgebracht."],
  "Schön, dass du dich meldest.": ["Wie schön, von dir zu hören."],
  "Warum ich nicht geschrieben habe?": ["Warum ich so lange still war?"],
  "Die Pause ist kein Problem.": ["Die lange Pause macht mir nichts aus."],
};
const seen = new Map(), used = new Map(); let n = 0, files = 0;
for (const task of TASKS) {
  const cards = await loadTask(task); if (!cards) continue;
  const path = `${DIR}tasks/${task.key}.mjs`;
  let src = readFileSync(path, "utf8"); const crlf = src.includes("\r\n"); if (crlf) src = src.replace(/\r\n/g, "\n");
  let touched = false;
  for (const card of cards) {
    let t = card.t;
    for (const [s, vars] of Object.entries(V)) {
      if (!t.includes(s)) continue;
      const k = seen.get(s) ?? 0; seen.set(s, k + 1);
      if (k < CAP) continue;
      const i = used.get(s) ?? 0; used.set(s, i + 1);
      t = t.replace(s, () => vars[i % vars.length]); n++;
    }
    if (t !== card.t) { if (!src.includes(card.t)) { console.log(`!! ${task.key}: raw text not found`); continue; } src = src.replace(card.t, () => t); touched = true; }
  }
  if (touched && apply) { writeRetry(path, crlf ? src.replace(/\n/g, "\r\n") : src); files++; }
}
console.log(`${apply ? "applied" : "dry run"}: ${n} sentences rewritten${apply ? ` in ${files} files` : ""}`);
