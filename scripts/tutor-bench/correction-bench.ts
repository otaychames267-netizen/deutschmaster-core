// usage (cwd = score worktree): LLM_FALLBACK_MODELS=<model> [LLM_FALLBACK_REASONING_EFFORT=low|medium|high] bun <this file> <label>
// Runs the REAL tutor-correction pipeline (prompt + tool schema + validation, voice-tutor-correction.ts) on Amal's session transcript through the backup chain with ONE forced model, no Claude.
import fs from "node:fs";
const D = "C:/Users/asus/AppData/Local/Temp/claude/C--Users-asus-AuraLingovia/6ec46fa6-1f81-4947-8f36-2311127c6930/scratchpad/matthias/";
for (const l of ["C:/Users/asus/AuraLingovia/.env", "C:/Users/asus/AuraLingovia/muendlich-relay/.env"].flatMap((f) => fs.readFileSync(f, "utf8").split(/\r?\n/))) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
delete process.env.ANTHROPIC_API_KEY; delete process.env.GROQ_API_KEY; // no Claude, no Groq tier: exactly one DeepInfra model
process.env.LLM_FALLBACK_BUDGET_MS = process.env.LLM_FALLBACK_BUDGET_MS ?? "170000"; process.env.LLM_FALLBACK_CALL_MS = process.env.LLM_FALLBACK_CALL_MS ?? "160000";
const label = process.argv[2] ?? process.env.LLM_FALLBACK_MODELS;
const { generateVoiceTutorCorrection } = await import("C:/Users/asus/AuraLingovia/.claude/worktrees/score/src/lib/grading/voice-tutor-correction.ts");
const text = fs.readFileSync(D + "amal-transcript.txt", "utf8");
const t0 = Date.now();
try {
  const r = await generateVoiceTutorCorrection(text, "B2");
  const verbatim = r.error_correction_matrix.filter((e) => text.replace(/\s+/g, " ").includes(e.original.replace(/\s+/g, " ").trim())).length;
  fs.writeFileSync(D + `corr-${label.replace(/[^a-z0-9.-]/gi, "_")}.json`, JSON.stringify({ label, ms: Date.now() - t0, verbatim, result: r }, null, 1));
  console.log(`${label}: ${Date.now() - t0}ms | scores ${r.scores.teil1_score}/${r.scores.teil2_score}/${r.scores.teil3_score} = ${r.scores.overall_score}/75 ${r.scores.cefr_level} passed=${r.scores.passed} | errors ${r.error_correction_matrix.length} (verbatim quotes ${verbatim}) | in ${r.usage?.inputTokens} out ${r.usage?.outputTokens}`);
} catch (e) { console.log(`${label}: FAILED after ${Date.now() - t0}ms: ${String((e as Error).message).slice(0, 200)}`); }
process.exit(0);
