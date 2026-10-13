/** Tunisian-Arabic guide for the B1 Struktur letters (owner request 2026-10-06: "explain in Arabic, not only German").
 *   node scripts/schreiben-b1/arabic-guide.mjs --ids <uuid,uuid,...>   → generate for these cards
 *   node scripts/schreiben-b1/arabic-guide.mjs --assigned              → generate for every card a subscriber already owns
 *   node scripts/schreiben-b1/arabic-guide.mjs --all                   → every B1 card without a guide
 *   add --dry to only print the result (nothing is written), --model <id> to change the model
 * Per card the model gets the friend's e-mail (the task), the Struktur (letter with [blanks]) and the filled Beispiel, and returns
 *   { summary, paragraphs[] } — summary = what the friend asks and what the letter must do, paragraphs[i] = what body paragraph i says and what
 * to write in each [blank] of it. Stored in schreiben_produkt_cards.arabic_guide (jsonb) and shown on the student's "Arabisch" tab. */
import { readFileSync } from "node:fs";

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const env = readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=\"?([^\"\\n\\r]*)\"?", "m")) || [])[1];
const URL_ = get("SUPABASE_URL"), KEY = get("SUPABASE_SERVICE_ROLE_KEY"), AKEY = get("ANTHROPIC_API_KEY");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const MODEL = opt("--model", "claude-sonnet-5-5");
const dry = flag("--dry");
const EMAILS = "C:/Users/asus/AppData/Local/Temp/claude/C--Users-asus-AuraLingovia/8834f92e-6731-49f0-ac24-caf84237e69c/scratchpad/b1-tasks-full.txt";

const rest = async (path, init = {}) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
};

// the friend's e-mail per task, keyed by the first word(s) of the card's theme ("Corinna – Reise nach der Prüfung" → "Corinna")
const emails = new Map();
try { for (const s of readFileSync(EMAILS, "utf8").split("\n### ")) { const [h, ...b] = s.replace(/^### /, "").split("\n"); emails.set(h.trim().toLowerCase(), b.join(" ").trim()); } } catch { /* optional context */ }
const emailFor = (theme) => { const n = theme.split(" – ")[0].trim().toLowerCase(); return emails.get(n) ?? [...emails].find(([k]) => k.startsWith(n) || n.startsWith(k))?.[1] ?? ""; };

const paras = (t) => t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

function prompt(card) {
  const tp = paras(card.template_text), ep = paras(card.example_text);
  const body = ep.slice(1, -1); // without "Liebe …," and the Gruß/Name block
  const tbody = tp.slice(1, -1);
  const list = body.map((p, i) => `${i + 1}.\nSTRUKTUR: ${tbody[i]}\nBEISPIEL: ${p}`).join("\n\n");
  return {
    n: body.length,
    text: `Du hilfst tunesischen Lernenden bei der TELC-B1-Prüfung (Schreiben: informeller Brief an einen Freund / eine Freundin).
Unten steht (a) die E-Mail des Freundes (die Prüfungsaufgabe), (b) ein vollständig ausformulierter Antwortbrief als STRUKTUR mit [Platzhaltern] und (c) derselbe Brief als BEISPIEL (Platzhalter ausgefüllt).

Schreibe eine ERKLÄRUNG AUF TUNESISCH-ARABISCH (arabische Schrift, einfacher tunesischer Dialekt wie im Alltag, kurze Sätze). Deutsche Wörter/Wendungen, die der Lernende lernen soll, bleiben auf Deutsch in "Anführungszeichen" stehen.
Gib NUR gültiges JSON zurück, ohne Text davor oder danach:
{"summary": "...", "paragraphs": ["...", "..."]}
- "summary": 2–3 Sätze: was der Freund/die Freundin in der E-Mail will und was der Brief alles beantworten muss.
- "paragraphs": GENAU ${body.length} Einträge, einer pro nummeriertem Absatz unten (in derselben Reihenfolge). Jeder Eintrag (2–4 Sätze): was dieser Absatz sagt (sinngemäß übersetzt) und was man in jeden [Platzhalter] schreiben soll, mit einem kurzen Hinweis, warum (z. B. welcher Punkt der Aufgabe damit erfüllt wird). Keine Wort-für-Wort-Übersetzung des ganzen Absatzes, sondern Erklärung + Sinn + Tipps.
- Schreibe keine Begrüßung und kein Fazit außerhalb des JSON. Erfinde nichts, was nicht im Brief steht.

E-MAIL DES FREUNDES:
${emailFor(card.theme_title) || "(nicht verfügbar)"}

BRIEF (${card.card_title}), Absätze ohne Anrede und ohne Grußformel:
${list}`,
  };
}

async function callModel(text) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": AKEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 4000, messages: [{ role: "user", content: text }] }),
    });
    const j = await r.json();
    if (r.ok) return { text: j.content?.map((c) => c.text ?? "").join("") ?? "", usage: j.usage };
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 3000 * attempt)); continue; }
    throw new Error(`anthropic ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  }
  throw new Error("anthropic: too many retries");
}

function parse(raw, n) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON in answer");
  const o = JSON.parse(m[0]);
  if (typeof o.summary !== "string" || o.summary.length < 20) throw new Error("summary missing");
  if (!Array.isArray(o.paragraphs) || o.paragraphs.length !== n) throw new Error(`expected ${n} paragraphs, got ${o.paragraphs?.length}`);
  if (o.paragraphs.some((p) => typeof p !== "string" || p.length < 15)) throw new Error("empty paragraph explanation");
  const arabic = (s) => (s.match(/[\u0600-\u06FF]/g) ?? []).length / s.replace(/\s/g, "").length;
  if (arabic(o.summary + o.paragraphs.join("")) < 0.4) throw new Error("answer is not mostly Arabic");
  return { summary: o.summary.trim(), paragraphs: o.paragraphs.map((p) => p.trim()), model: MODEL };
}

// ---- which cards
let filter;
if (opt("--ids")) filter = `id=in.(${opt("--ids")})`;
else if (flag("--assigned")) {
  const ids = (await rest("user_schreiben_struktur_b1?select=card_id")).map((r) => r.card_id);
  if (!ids.length) { console.log("no assigned cards"); process.exit(0); }
  filter = `id=in.(${ids.join(",")})`;
} else if (flag("--all")) filter = "arabic_guide=is.null";
else { console.log("usage: --ids a,b | --assigned | --all   [--dry] [--model id]"); process.exit(1); }

const cards = await rest(`schreiben_produkt_cards?select=id,card_title,theme_title,template_text,example_text,arabic_guide&level=eq.TELC_B1&category=eq.informell&${filter}&order=sort_order&limit=1000`);
console.log(`${cards.length} card(s), model ${MODEL}${dry ? " (dry run)" : ""}`);
let done = 0, failed = 0, inTok = 0, outTok = 0;
for (const card of cards) {
  if (card.arabic_guide && !flag("--force")) { console.log("  skip (has guide):", card.card_title); continue; }
  try {
    const { n, text } = prompt(card);
    let guide, lastErr;
    for (let t = 1; t <= 2 && !guide; t++) {
      const a = await callModel(text); inTok += a.usage?.input_tokens ?? 0; outTok += a.usage?.output_tokens ?? 0;
      try { guide = parse(a.text, n); } catch (e) { lastErr = e; }
    }
    if (!guide) throw lastErr;
    if (dry) console.log(`\n=== ${card.card_title}\n${JSON.stringify(guide, null, 1)}`);
    else await rest(`schreiben_produkt_cards?id=eq.${card.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ arabic_guide: guide }) });
    done++; console.log("  ok:", card.card_title);
  } catch (e) { failed++; console.log("  FAILED:", card.card_title, "-", e.message); }
}
console.log(`done ${done}, failed ${failed}, tokens in ${inTok} / out ${outTok}`);
