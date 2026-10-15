// usage: node db.mjs "<sql>"   (or: node db.mjs @file.sql)   prints the JSON result of a Management-API SQL query
import fs from "node:fs";
const env = {}; for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
let q = process.argv[2]; if (q.startsWith("@")) q = fs.readFileSync(q.slice(1), "utf8");
const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
const t = await r.text(); try { console.log(JSON.stringify(JSON.parse(t), null, process.argv.includes("--pretty") ? 2 : 0)); } catch { console.log(r.status, t.slice(0, 500)); }
process.exit(0);
