/**
 * Apply a SQL migration file to the linked Supabase project via the Management
 * API (POST /v1/projects/{ref}/database/query). Uses SUPABASE_ACCESS_TOKEN and
 * SUPABASE_PROJECT_REF from .env — no database password required.
 *
 * Migrations are the source of truth in supabase/migrations and are written to
 * be idempotent, so re-running is safe.
 *
 * Usage:
 *   bun scripts/db-apply.mjs supabase/migrations/<file>.sql
 *   bun scripts/db-apply.mjs --query "select 1;"
 */
import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        process.env[m[1]] = v;
      }
    }
  } catch {
    /* no .env — rely on real env vars */
  }
}

loadEnv();

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF in .env");
  process.exit(1);
}

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: bun scripts/db-apply.mjs <path-to-sql> | --query \"<sql>\"");
  process.exit(1);
}

const sql = arg === "--query" ? process.argv[3] : readFileSync(arg, "utf8");
if (!sql) {
  console.error("No SQL to run.");
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`FAILED ${res.status}: ${text}`);
  process.exit(1);
}

console.log(`OK${arg === "--query" ? "" : `: applied ${arg}`}`);
console.log(text);
