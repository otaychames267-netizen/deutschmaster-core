/** node scripts/schreiben-b1/addextras.mjs <task> <extras.json>
 * Inserts one extra paragraph per card (extras[i] -> card i) right BEFORE the closing paragraph (the paragraph that precedes the Grußformel block).
 * extras.json = ["paragraph with [[Label|fill]] markers", ...] — one entry per card, same order as the task file. Used to bring first drafts up to length. */
import { readFileSync } from "node:fs";
import { writeRetry } from "./fsretry.mjs";

const DIR = new URL("./tasks/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const [task, extrasFile] = process.argv.slice(2);
const extras = JSON.parse(readFileSync(extrasFile, "utf8"));
const path = `${DIR}${task}.mjs`;
let src = readFileSync(path, "utf8").replace(/\r\n/g, "\n");

let idx = 0, out = "", pos = 0;
const re = /t: `([\s\S]*?)` \}/g;
let m;
while ((m = re.exec(src))) {
  const body = m[1];
  const g = body.lastIndexOf("\n\n[[Grußformel");
  if (g < 0) throw new Error(`card ${idx + 1}: no Grußformel block`);
  const p = body.lastIndexOf("\n\n", g - 1);
  if (p < 0) throw new Error(`card ${idx + 1}: no paragraph before the closing`);
  if (idx >= extras.length) throw new Error(`more cards than extras (card ${idx + 1})`);
  // an extra may start with "#7 " (its card number): checked against the card, then stripped — makes miscounted lists visible
  const tag = /^#(\d+)\s+/.exec(extras[idx].trim());
  if (tag && +tag[1] !== idx + 1) throw new Error(`extra tagged #${tag[1]} sits at card ${idx + 1} — the list is miscounted`);
  const nb = body.slice(0, p + 2) + extras[idx].trim().replace(/^#\d+\s+/, "") + "\n\n" + body.slice(p + 2);
  out += src.slice(pos, m.index) + "t: `" + nb + "` }";
  pos = m.index + m[0].length;
  idx++;
}
if (idx !== extras.length) throw new Error(`${idx} cards but ${extras.length} extras`);
out += src.slice(pos);
writeRetry(path, out);
console.log(`inserted ${idx} extra paragraphs into ${task}.mjs`);
