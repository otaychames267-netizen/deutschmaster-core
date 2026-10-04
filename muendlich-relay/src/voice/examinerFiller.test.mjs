import { stripLeadingFiller as f } from "./examinerBrain.ts";

const cases = [
  ["Danke der Antwort. Youssef1, was würde passieren?", "Youssef1, was würde passieren?"],
  ["Danke. Gut. Wie sehen Sie das?", "Wie sehen Sie das?"],
  ["Gut, dann fassen wir zusammen, was feststeht.", "Gut, dann fassen wir zusammen, was feststeht."],
  ["Vielen Dank für Ihre Antwort. Fatma, warum?", "Fatma, warum?"],
  ["Genau diese Frage ist wichtig.", "Genau diese Frage ist wichtig."],
  ["Gutes Beispiel — wie lange waren Sie dort?", "Gutes Beispiel — wie lange waren Sie dort?"],
  ["Danke der Antwort.", ""],
  ["Okay. Und wer organisiert die Getränke?", "Und wer organisiert die Getränke?"],
  ["Danke, Fatma. Wie sehen Sie das?", "Danke, Fatma. Wie sehen Sie das?"], // comma = sentence continues, left alone
];
let bad = 0;
for (const [input, expected] of cases) {
  const got = f(input);
  const ok = got === expected;
  if (!ok) bad++;
  console.log(ok ? "PASS" : "FAIL", JSON.stringify(input), "->", JSON.stringify(got));
}
process.exit(bad ? 1 : 0);
