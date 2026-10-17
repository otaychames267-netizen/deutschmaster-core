// Baseline for comparison: the SAME strict Claude rubric prompt, but a free model scores directly (what the generic fallback does today). usage: node baseline.mjs <model> <from> <to>
import fs from "node:fs";
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/.env", "C:/Users/asus/AuraLingovia/muendlich-relay/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const [model, from = "0", to = "40"] = process.argv.slice(2);
const src = fs.readFileSync("C:/Users/asus/AuraLingovia/.claude/worktrees/score/src/lib/grading/essay-grader.ts", "utf8");
const a = src.indexOf("function systemPrompt("); const b = src.indexOf("\n}\n", a);
const body = src.slice(src.indexOf("{", src.indexOf("):", a)) + 1, b).replace(/const informal = isInformalLetter\(category\);/, "const informal = category === 'informell';");
const systemPrompt = new Function("level", "category", body.replace("return `", "return `"));
const rows = JSON.parse(fs.readFileSync("claude-gradings.json", "utf8")).slice(Number(from), Number(to));
const out = `base/${model.replace(/[^a-z0-9.-]/gi, "_")}`; fs.mkdirSync(out, { recursive: true });
const RPM = { "gemini-2.5-flash-lite": 9, "gemini-3.1-flash-lite": 12, "gemma-4-26b-a4b-it": 20 }[model] ?? 6; const gap = 60000 / RPM; let next = 0;
for (const r of rows) {
  const f = `${out}/${r.id}.json`; if (fs.existsSync(f)) continue;
  const now = Date.now(); const at = Math.max(now, next); next = at + gap; if (at > now) await new Promise((x) => setTimeout(x, at - now));
  const level = r.level === "TELC_B1" ? "B1" : "B2"; const sys = systemPrompt(level, r.metadata?.category);
  const prompt = sys.replace(/Rufe ausschließlich das Tool[^\n]*$/m, "") + `\n\nAUFGABE:\n${String(r.content?.task ?? "").slice(0, 2500)}\n\n---\nANTWORT DES KANDIDATEN:\n<<<\n${r.essay_text}\n>>>\n\nAntworte NUR mit JSON: {"task_achievement_score":int,"communicative_design_score":int,"formal_accuracy_score":int}`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 4000 } }) });
    const t = await res.text(); if (!res.ok) { console.log("FAIL", res.status, t.slice(0, 100)); continue; }
    const txt = (JSON.parse(t).candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join(""); const j = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
    fs.writeFileSync(f, JSON.stringify({ id: r.id, ta: j.task_achievement_score, cd: j.communicative_design_score, fa: j.formal_accuracy_score }));
  } catch (e) { console.log("ERR", String(e).slice(0, 100)); }
}
// report
const res = rows.filter((r) => fs.existsSync(`${out}/${r.id}.json`)).map((r) => ({ r, p: JSON.parse(fs.readFileSync(`${out}/${r.id}.json`, "utf8")) }));
const stat = (k, pk) => { const d = res.map((x) => x.p[pk] - x.r[k]); return { mae: +(d.reduce((s, v) => s + Math.abs(v), 0) / d.length).toFixed(2), bias: +(d.reduce((s, v) => s + v, 0) / d.length).toFixed(2) }; };
const tot = res.map((x) => x.p.ta + x.p.cd + x.p.fa - x.r.total); console.log(model, "n", res.length, "ta", JSON.stringify(stat("ta", "ta")), "cd", JSON.stringify(stat("cd", "cd")), "fa", JSON.stringify(stat("fa", "fa")), "| TOTAL MAE", (tot.reduce((s, v) => s + Math.abs(v), 0) / tot.length).toFixed(2), "bias", (tot.reduce((s, v) => s + v, 0) / tot.length).toFixed(2));
process.exit(0);
