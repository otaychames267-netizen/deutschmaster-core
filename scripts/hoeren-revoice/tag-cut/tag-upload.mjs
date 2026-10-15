// Uploads every tag-cut file to hoeren-audio at notag/<teilN>/<name>.m4a (new objects only — never overwrites anything) and writes tag-uploaded.json
import fs from "node:fs";
const env = {}; for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const cuts = JSON.parse(fs.readFileSync(process.env.CUTS ?? "cuts.json", "utf8"));
const enc = (k) => k.split("/").map(encodeURIComponent).join("/");
const done = []; let ok = 0, exists = 0, fail = 0;
async function one(p) {
  const rel = p.replace(/^clean\//, ""); const key = "notag/" + (process.env.V2 && rel.includes(process.env.V2) ? rel.replace(/.m4a$/, ".v2.m4a") : rel); const body = fs.readFileSync("out/" + rel);
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/hoeren-audio/${enc(key)}`, { method: "POST", headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "audio/mp4", "x-upsert": "false" }, body });
      if (r.ok) { ok++; done.push({ old: p, neu: key, bytes: body.length }); return; }
      const t = await r.text();
      if (/Duplicate|already exists/i.test(t)) { exists++; done.push({ old: p, neu: key, bytes: body.length }); return; }
      if (attempt === 5) { fail++; console.log("FAIL", p, r.status, t.slice(0, 120)); return; }
    } catch (e) { if (attempt === 5) { fail++; console.log("FAIL", p, String(e.cause?.code ?? e.message)); return; } }
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
}
const q = Object.keys(cuts); await Promise.all(Array.from({ length: 3 }, async () => { while (q.length) await one(q.shift()); }));
fs.writeFileSync(process.env.UPOUT ?? "tag-uploaded.json", JSON.stringify(done));
console.log(JSON.stringify({ files: Object.keys(cuts).length, uploaded: ok, alreadyThere: exists, failed: fail }));
process.exit(0);
