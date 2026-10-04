import { looksNonGerman as f } from "./examinerBrain.ts";

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
process.exit(bad ? 1 : 0);
