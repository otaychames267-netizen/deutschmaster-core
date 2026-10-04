/**
 * Invariants for the lead+rest scripted lines (examinerPhrases.ts ScriptedLine +
 * audio-library/scripted_lead): a split must never change what is said, a lead
 * must never contain per-exam data, and every lead a voice can pick must have a
 * clip on disk for that voice (else it silently degrades to full live TTS —
 * still correct, but the saving is lost).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import {
  pickExamStartLine, pickTaskTransitionLine, pickSectionTransition12Line, pickSectionTransition23Line,
  getScriptedLeadPhrases,
} from "../../examinerPhrases.ts";
import { VOICES } from "../voices.config.ts";
import { assignPhraseStyle } from "./voiceStyle.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../audio-library");
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} — ${msg}`); if (!ok) failed++; };

const NAMES = ["Fatma", "Youssef", "Ahmed-Karim", "Zeynep"];
const TOPICS = ["Reisen", "Wichtige Erfahrung", "Sollte man Kindern ein eigenes Smartphone erlauben?", "Planen Sie gemeinsam eine Willkommensfeier."];
const voices = VOICES.filter((v) => v.enabled);

let splits = 0, withLead = 0, bad = [];
for (let i = 0; i < 400; i++) {
  const v = voices[i % voices.length].voiceId;
  const n = NAMES[i % NAMES.length], t = TOPICS[i % TOPICS.length];
  for (const line of [
    pickExamStartLine({ aName: n, topicA: t }, v),
    pickTaskTransitionLine({ bName: n, topicB: t }, v),
    pickSectionTransition12Line({ teil2Topic: t }, v),
    pickSectionTransition23Line({ teil3Topic: t }, v),
  ]) {
    splits++;
    if (line.lead) withLead++;
    const rejoined = line.lead ? `${line.lead} ${line.rest}` : line.rest;
    if (rejoined.replace(/\s+/g, " ") !== line.full.replace(/\s+/g, " ")) bad.push(`rejoin mismatch for ${line.id}`);
    if (line.lead && NAMES.some((x) => line.lead.includes(x))) bad.push(`name leaked into lead of ${line.id}`);
    if (line.lead && TOPICS.some((x) => line.lead.includes(x.replace(/[.!?]+$/, "")))) bad.push(`topic leaked into lead of ${line.id}`);
    if (line.lead && line.lead.includes("\u0001")) bad.push(`placeholder leaked into lead of ${line.id}`);
    if (!line.rest.trim()) bad.push(`empty rest for ${line.id}`);
  }
}
check(bad.length === 0, `${splits} sampled lines: lead+rest == full, no name/topic/placeholder in any lead${bad.length ? " — " + bad.slice(0, 3).join("; ") : ""}`);
check(withLead / splits > 0.4, `${((100 * withLead) / splits).toFixed(0)}% of sampled lines have a lead clip (expected > 40% with the current 'warm'-heavy voice styles)`);

// every lead a voice can pick has a manifest entry and a file for that voice
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const have = new Set(manifest.filter((a) => a.category === "scripted_lead").map((a) => `${a.voiceId}|${a.phraseId}`));
const leads = getScriptedLeadPhrases();
const missing = [];
for (const voice of voices) {
  const style = assignPhraseStyle(voice.voiceId);
  for (const l of leads.filter((x) => x.style === style)) {
    const f = path.join(root, "scripted_lead", `${l.id}__${voice.voiceId}.pcm`);
    if (!have.has(`${voice.voiceId}|${l.id}`) || !existsSync(f)) missing.push(`${voice.voiceId.slice(0, 6)}/${l.id}`);
  }
}
check(missing.length === 0, `every lead of every voice's own style has a clip + manifest entry${missing.length ? " — missing: " + missing.slice(0, 4).join(", ") : ""}`);

// the pre-existing manifest content must be untouched by the merge
const by = {};
for (const a of manifest) by[a.category] = (by[a.category] ?? 0) + 1;
check(by.welcome === 120 && by.exam_end === 120 && by.teil1_question === 1208, `existing categories preserved (welcome ${by.welcome}, exam_end ${by.exam_end}, teil1_question ${by.teil1_question})`);

console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
