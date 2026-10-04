import { looksNonGerman as f, looksInformal, looksMeta } from "./examinerBrain.ts";

// [text, expectedNonGerman]
const cases = [
  // the real failure seen live
  ["Vous avez mentionné que vous avec votre ami avez dormi dans une tente dans le Sahara — comment avez vous trouvé cette expérience?", true],
  ["Pourquoi pensez-vous que c'est important pour les enfants?", true],
  ["What did you enjoy most about the trip and why is it important to you?", true],
  ["How do you think this would work with your friends?", true],
  // genuine examiner German — must NEVER be flagged
  ["Warum waren die Sterne in der Sahara für Sie besonders beeindruckend?", false],
  ["Fatma, was halten Sie von dem Argument, dass Elternkontrolle das Risiko senken kann?", false],
  ["Wer übernimmt denn die Organisation der Bestellung und die Vorbereitung?", false],
  ["Und wie haben sich die Menschen dort von den Menschen unterschieden, die Sie vorher kennengelernt haben?", false],
  ["Möchten Sie noch etwas zu Ihrem Thema sagen?", false],
  ["Youssef1, wie sehen Sie das — stimmen Sie Fatma1 zu, dass elterliche Kontrolle das Risiko minimieren kann?", false],
  ["Was war das für ein Gefühl?", false], // "was" is German here
  ["Haben Sie das Gefühl, dass die Kosten zu hoch sind?", false],
  ["Wie viele Personen sollen denn zu dieser Feier eingeladen werden?", false],
  ["Bitte sprechen Sie nur Deutsch. Das ist eine telc-Prüfung.", false],
  ["Wo würden Sie das Büro am liebsten eröffnen, in Berlin oder in Paris?", false], // foreign proper nouns
  ["Glauben Sie, dass die Filme von Netflix wirklich besser sind als die Programme in the Kino?", false], // single stray English word
];
let bad = 0;
for (const [text, expected] of cases) {
  const got = f(text);
  const ok = got === expected;
  if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", expected ? "[non-German]" : "[German]    ", text.slice(0, 80));
}
console.log(bad ? `${bad} FAILED` : "ALL PASSED");
const informal = [
  ["Habt ihr auch überlegt, wie viele Kollegen ihr einladen werdet?", true],
  ["Gut, dann lasst uns noch die wichtigsten Punkte klären.", true],
  ["Wartet kurz — wir haben noch ein paar offene Punkte. Ihr habt Pizza erwähnt.", true],
  ["Was denkst du darüber, Fatma?", true],
  ["Wie viele Kollegen sollen denn eingeladen werden?", false],
  ["Fatma, was halten Sie von Ihrem Vorschlag?", false],
  ["Ihr Thema ist Reisen, bitte beginnen Sie.", false],
  ["Haben Sie auch schon überlegt, wo die Feier stattfindet?", false],
  ["Youssef, wie sehen Sie das Beispiel mit Ihrer Nichte?", false],
  ["Seit wann arbeiten Sie von zu Hause aus?", false],
];
for (const [text, expected] of informal) {
  const got = looksInformal(text);
  const ok = got === expected;
  if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", expected ? "[informal]" : "[formal]  ", text.slice(0, 80));
}
const meta = [
  ["Ich warte auf den bisherigen Gesprächsverlauf von Teil 3, um einen offenen Punkt zu identifizieren.", true],
  ["Laut meiner Anweisung soll ich jetzt eine Frage stellen.", true],
  ["[SYSTEM] Stellen Sie eine Frage.", true],
  ["Ich bin bereit. Bitte teilen Sie mir mit, was die Kandidaten bisher gesagt haben.", true],
  ["Ich warte noch auf Ihre Vorschläge.", true],
  ["Wer übernimmt denn die Bestellung der Getränke?", false],
  ["Ich finde Ihren Vorschlag interessant — wie würden Sie das umsetzen?", false],
  ["Wie hat sich der Verlauf des Gesprächs für Sie angefühlt?", false],
  ["Welche Anweisungen haben Sie im Büro am meisten gestört?", true],
];
for (const [text, expected] of meta) {
  const got = looksMeta(text);
  const ok = got === expected;
  if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", expected ? "[meta]    " : "[no-meta] ", text.slice(0, 80));
}
process.exit(bad ? 1 : 0);
