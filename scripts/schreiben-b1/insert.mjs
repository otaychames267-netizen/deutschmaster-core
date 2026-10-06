/** Writes b1_cards.json into schreiben_produkt_cards (level TELC_B1, category 'informell') through the service-role REST API.
 *   node scripts/schreiben-b1/insert.mjs            → dry run (what would happen)
 *   node scripts/schreiben-b1/insert.mjs --apply    → replace every theme found in b1_cards.json
 * Per theme: if ANY existing card of that theme is already assigned to a student the theme is skipped (never rewrite or delete a card a
 * student already owns); otherwise its unassigned cards are deleted and the new ones inserted, so re-running is idempotent. */
import { readFileSync } from "node:fs";

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const env = readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=\"?([^\"\\n\\r]*)\"?", "m")) || [])[1];
const URL_ = get("SUPABASE_URL"), KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const apply = process.argv.includes("--apply");

const rows = JSON.parse(readFileSync(DIR + "b1_cards.json", "utf8"));
const byTheme = new Map();
for (const r of rows) byTheme.set(r.theme_title, [...(byTheme.get(r.theme_title) ?? []), r]);

const rest = async (path, init = {}) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${r.status} ${await r.text()}`);
  return r.status === 204 || init.method === "DELETE" || init.method === "POST" ? null : r.json();
};

let inserted = 0, skipped = 0;
for (const [theme, cards] of byTheme) {
  const q = `level=eq.TELC_B1&category=eq.informell&theme_title=eq.${encodeURIComponent(theme)}`;
  const existing = await rest(`schreiben_produkt_cards?${q}&select=id`);
  if (existing.length) {
    const ids = existing.map((e) => e.id).join(",");
    const assigned = await rest(`user_schreiben_struktur_b1?card_id=in.(${ids})&select=card_id`);
    if (assigned.length) { console.log(`SKIP ${theme}: ${assigned.length} card(s) already assigned to students`); skipped++; continue; }
    if (apply) await rest(`schreiben_produkt_cards?${q}`, { method: "DELETE" });
  }
  console.log(`${apply ? "write" : "would write"} ${theme}: ${cards.length} cards (replacing ${existing.length})`);
  if (apply) { await rest("schreiben_produkt_cards", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(cards) }); inserted += cards.length; }
}
console.log(apply ? `done: ${inserted} cards inserted, ${skipped} theme(s) skipped` : "(dry run — add --apply)");
