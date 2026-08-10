// Compiles ALL Mündlich Teil 3 topics' speaking_toolbox content (schema_version
// 2 — section-based Q&A structure modeled on the owner's reference example:
// Start → Ziel → Zeit → Ort → Inhalte → Vorschläge → Material → Werbung →
// Aufgabenverteilung → Abschluss, adapted per topic) into ONE unified
// "Meisterbuch" PDF. Struktur sections reference the shared category
// Redemittel library (teil3-redemittel-library.mjs) for Frage/Antwort
// phrases; each topic supplies its own demo exchange, Mögliche Fragen/
// Antworten banks, full dialogue and Wortschatz. Every page carries
// AuraLingovia + Chames_Dean branding.
//
// Usage: node scripts/gen-muendlich-teil3-book.mjs [level]   (default TELC_B2)
import "dotenv/config";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync } from "node:fs";
import { REDEMITTEL_LIBRARY, ZUSTIMMUNG_WIDERSPRUCH } from "./teil3-redemittel-library.mjs";

const level = process.argv[2] ?? "TELC_B2";
const SCRATCH = "C:\\Users\\asus\\AppData\\Local\\Temp\\claude\\C--Users-asus-AuraLingovia\\d62fd849-b08b-4a27-a94b-dd84844ba827\\scratchpad";

const db = createClient(
  process.env.SUPABASE_URL ?? "https://gewcyydpgbfutkdcyztr.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const GROUP_ORDER = [
  "Freizeit", "Bildung", "Gesellschaft", "Reisen", "Familie",
  "Beruf", "Gesundheit", "Technologie", "Soziales Engagement", "Medien",
];

// Topics not yet introduced in any physical exam center in Tunisia (is_unassigned_center)
// are excluded from the student-facing UI entirely and forced into a dedicated appendix
// group at the very end of the PDF, under an Arabic header.
const UNASSIGNED_GROUP = "مواضيع لم تُدرج بعد في مراكز الامتحانات في تونس";

function groupTopics(topics) {
  const assigned = topics.filter(t => !t.is_unassigned_center);
  const unassigned = topics.filter(t => t.is_unassigned_center);
  const groups = [];
  for (const name of GROUP_ORDER) {
    const inGroup = assigned.filter(t => (t.theme_category ?? "Sonstiges") === name);
    if (inGroup.length) groups.push({ name, topics: inGroup });
  }
  const known = new Set(GROUP_ORDER);
  const leftover = [...new Set(assigned.map(t => t.theme_category ?? "Sonstiges").filter(n => !known.has(n)))];
  for (const name of leftover) groups.push({ name, topics: assigned.filter(t => (t.theme_category ?? "Sonstiges") === name) });
  if (unassigned.length) groups.push({ name: UNASSIGNED_GROUP, topics: unassigned });
  return groups;
}

function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function plainList(items) { return `<ul class="ideas">${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`; }
function vocabCol(title, items) {
  return `<div class="vocab-col"><h4>${esc(title)}</h4><ul>${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>`;
}
function pageBar(groupName, label) {
  const rightLabel = groupName === UNASSIGNED_GROUP ? `Noch nicht eingeführt — ${label}` : `${esc(groupName)} — ${label}`;
  return `<div class="page-bar"><span class="brand">AuraLingovia <span class="brand-sep">·</span> <span class="brand-author">Chames_Dean</span></span><span class="page-bar-r">${rightLabel}</span></div>`;
}

function renderStrukturSection(sec) {
  const lib = REDEMITTEL_LIBRARY[sec.key] ?? { emoji: "•", label: sec.key, frage: [], antwort: [] };
  return `<div class="sk-card">
    <h3 class="sk-h">${lib.emoji} ${esc(lib.label)}</h3>
    <div class="sk-rd">
      <div><h5>Fragen stellen</h5><ul class="rd">${lib.frage.map(f => `<li>„${esc(f)}"</li>`).join("")}</ul></div>
      <div><h5>Antworten geben</h5><ul class="rd">${lib.antwort.map(a => `<li>„${esc(a)}"</li>`).join("")}</ul></div>
    </div>
    <div class="sk-demo">
      <p><span class="dl-speaker">A:</span> ${esc(sec.demo.frage)}</p>
      <p><span class="dl-speaker dl-b">B:</span> ${esc(sec.demo.antwort)}</p>
      ${sec.demo.reaktion ? `<p><span class="dl-speaker">A:</span> ${esc(sec.demo.reaktion)}</p>` : ""}
    </div>
  </div>`;
}

function renderTopicPages(topic, groupName) {
  const tb = topic.speaking_toolbox;

  const page1 = `<section class="page">
    ${pageBar(groupName, "Aufgabe")}
    <h1>${esc(topic.title)}</h1>
    <p class="body-text">${esc(topic.body_text).replace(/\n/g, "<br>")}</p>
    </section>`;

  const page2 = `<section class="page">
    ${pageBar(groupName, "Erklärung")}
    <h2>${esc(topic.title)}</h2>
    <h3>Worum geht es?</h3><p>${esc(tb.erklaerung.worum_geht_es)}</p>
    <h3>Was wird erwartet?</h3><p>${esc(tb.erklaerung.was_wird_erwartet)}</p>
    <div class="two-col">
      <div><h3>Wichtige Punkte</h3>${plainList(tb.erklaerung.wichtige_punkte)}</div>
      <div><h3>Worauf achten?</h3>${plainList(tb.erklaerung.worauf_achten)}</div>
    </div>
    </section>`;

  const page3 = `<section class="page">
    ${pageBar(groupName, "Struktur & Redemittel")}
    <h2>Struktur für das Gespräch</h2>
    <p class="hint">Fragen stellen → Antworten geben → reagieren. Für jeden Punkt ein Beispiel:</p>
    ${tb.struktur.map(renderStrukturSection).join("")}
    </section>`;

  const page4 = `<section class="page">
    ${pageBar(groupName, "Mögliche Fragen & Antworten")}
    <h2>Mögliche Fragen &amp; Antworten</h2>
    <div class="two-col">
      <div>
        <h3>Mögliche Fragen im Gespräch</h3>
        <p class="hint">Realistische Fragen, die Ihr Gesprächspartner stellen könnte:</p>
        ${plainList(tb.moegliche_fragen)}
      </div>
      <div>
        <h3>Mögliche Antworten &amp; Ideen</h3>
        <p class="hint">Verschiedene Ideen, aus denen Sie frei wählen können:</p>
        ${plainList(tb.moegliche_antworten_ideen)}
      </div>
    </div>
    <div class="sk-card sk-appendix">
      <h3 class="sk-h">🔁 Zustimmen &amp; höflich widersprechen</h3>
      <div class="sk-rd sk-rd-3">
        <div><h5>Nach Meinung fragen</h5><ul class="rd">${ZUSTIMMUNG_WIDERSPRUCH.meinung_erfragen.map(f => `<li>„${esc(f)}"</li>`).join("")}</ul></div>
        <div><h5>Zustimmen</h5><ul class="rd">${ZUSTIMMUNG_WIDERSPRUCH.zustimmen.map(f => `<li>„${esc(f)}"</li>`).join("")}</ul></div>
        <div><h5>Höflich widersprechen</h5><ul class="rd">${ZUSTIMMUNG_WIDERSPRUCH.widersprechen.map(f => `<li>„${esc(f)}"</li>`).join("")}</ul></div>
      </div>
    </div>
    </section>`;

  const page5 = `<section class="page">
    ${pageBar(groupName, "Beispieldialog")}
    <h2>Beispieldialog</h2>
    <div class="dialog">${renderDialog(tb.beispieldialog, tb.struktur)}</div>
    </section>`;

  const page6 = `<section class="page">
    ${pageBar(groupName, "Wortschatz")}
    <h2>Wortschatz</h2>
    <div class="vocab-grid">
      ${vocabCol("Wichtige Verben", tb.wortschatz.verben)}
      ${vocabCol("Wichtige Wörter", tb.wortschatz.woerter)}
      ${vocabCol("Wichtige Adjektive", tb.wortschatz.adjektive)}
    </div>
    </section>`;

  return page1 + page2 + page3 + page4 + page5 + page6;
}

function renderDialog(lines, struktur) {
  const libByKey = (k) => REDEMITTEL_LIBRARY[k] ?? { emoji: "•", label: k };
  let lastSection = null;
  let html = "";
  for (const l of lines) {
    if (l.section && l.section !== lastSection) {
      const lib = libByKey(l.section);
      html += `<p class="dl-section">${lib.emoji} ${esc(lib.label)}</p>`;
      lastSection = l.section;
    }
    html += `<p class="dl dl-${l.speaker === "A" ? "a" : "b"}"><span class="dl-speaker">${l.speaker}:</span> ${esc(l.text)}</p>`;
  }
  return html;
}

function renderCover(topicCount, groupCount) {
  return `<section class="page cover">
    <div class="cover-inner">
      <p class="cover-kicker">AuraLingovia × Chames_Dean</p>
      <h1 class="cover-title">Sprechen Teil 3<br>Das Meisterbuch</h1>
      <p class="cover-sub">Gemeinsam etwas planen — ${topicCount} Themen in ${groupCount} thematischen Zentren</p>
      <p class="cover-sub2">Erklärung · Struktur &amp; Redemittel · Mögliche Fragen &amp; Antworten · Beispieldialog · Wortschatz</p>
    </div>
  </section>`;
}

function renderToc(groups) {
  return `<section class="page toc">
    <h1>Inhaltsverzeichnis</h1>
    ${groups.map(g => {
      const isUnassigned = g.name === UNASSIGNED_GROUP;
      const heading = isUnassigned
        ? `<h3 class="ar-title" dir="rtl">${esc(g.name)} <span class="toc-count">${g.topics.length}</span></h3>`
        : `<h3>${esc(g.name)} <span class="toc-count">${g.topics.length}</span></h3>`;
      return `
      <div class="toc-group">
        ${heading}
        <ul>${g.topics.map(t => `<li>${esc(t.title)}</li>`).join("")}</ul>
      </div>`;
    }).join("")}
  </section>`;
}

function renderDivider(groupName, count) {
  const isUnassigned = groupName === UNASSIGNED_GROUP;
  if (isUnassigned) {
    return `<section class="page divider divider-ar">
      <div class="divider-inner">
        <p class="divider-kicker">Noch nicht eingeführte Themen</p>
        <h1 class="ar-title" dir="rtl">${esc(groupName)}</h1>
        <p class="divider-count">${count} Themen</p>
      </div>
    </section>`;
  }
  return `<section class="page divider">
    <div class="divider-inner">
      <p class="divider-kicker">Thematisches Zentrum</p>
      <h1>${esc(groupName)}</h1>
      <p class="divider-count">${count} Themen</p>
    </div>
  </section>`;
}

function renderBookHtml(groups, topicCount) {
  const thematicGroupCount = groups.filter(g => g.name !== UNASSIGNED_GROUP).length;
  const body = [
    renderCover(topicCount, thematicGroupCount),
    renderToc(groups),
    ...groups.flatMap(g => [
      renderDivider(g.name, g.topics.length),
      ...g.topics.map(t => renderTopicPages(t, g.name)),
    ]),
  ].join("");

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Sprechen Teil 3 — Das Meisterbuch</title><style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, 'Segoe UI', Tahoma, sans-serif; color: #1c1917; font-size: 10.5pt; line-height: 1.5; margin: 0; }
    .page { break-after: page; }
    .page:last-child { break-after: auto; }
    .page-bar { display: flex; justify-content: space-between; align-items: baseline; font-size: 8.5pt; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #0369a1; border-bottom: 2px solid #38bdf8; padding-bottom: 4px; margin-bottom: 14px; }
    .page-bar-r { text-transform: none; font-weight: 600; color: #94a3b8; letter-spacing: 0; }
    .brand { color: #0369a1; } .brand-sep { color: #94a3b8; } .brand-author { color: #64748b; font-weight: 600; }
    h1 { font-size: 18pt; margin: 4px 0 14px; color: #111; }
    h2 { font-size: 14pt; margin: 0 0 10px; color: #0369a1; }
    h3 { font-size: 10.5pt; margin: 0 0 6px; color: #111; }
    h4 { font-size: 10pt; margin: 0 0 6px; color: #0369a1; }
    h5 { font-size: 8.7pt; margin: 0 0 3px; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
    p { margin: 0 0 8px; }
    .hint { font-size: 9.3pt; color: #94a3b8; font-style: italic; margin-bottom: 10px; }
    .body-text { font-size: 11.5pt; line-height: 1.75; }
    .two-col { display: flex; gap: 22px; }
    .two-col > div { flex: 1; }
    ul.ideas { margin: 0 0 10px; padding-left: 18px; }
    ul.ideas li { margin-bottom: 7px; }

    .sk-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px; margin-bottom: 9px; break-inside: avoid; }
    .sk-h { font-size: 10.5pt; margin: 0 0 6px; }
    .sk-rd { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
    .sk-rd-3 { grid-template-columns: 1fr 1fr 1fr; }
    ul.rd { list-style: none; padding: 0; margin: 0 0 6px; }
    ul.rd li { font-style: italic; font-size: 9pt; color: #334155; margin-bottom: 2px; }
    .sk-demo { background: #f0f9ff; border-radius: 6px; padding: 6px 10px; margin-top: 4px; }
    .sk-demo p { margin: 0 0 2px; font-size: 9.3pt; }
    .sk-appendix { background: #fafaf9; }

    .dialog { font-size: 9.8pt; }
    .dl { margin-bottom: 4px; padding-left: 4px; }
    .dl-speaker { font-weight: 800; color: #0369a1; }
    .dl-b .dl-speaker { color: #be123c; }
    .dl-section { margin: 10px 0 4px; font-weight: 800; font-size: 9.5pt; color: #0369a1; text-transform: uppercase; letter-spacing: 0.02em; }

    .vocab-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px 20px; }
    .vocab-col ul { list-style: none; padding: 0; margin: 0; }
    .vocab-col li { border-bottom: 1px dotted #e5e7eb; padding: 3px 0; font-size: 10pt; }

    .page.cover { display: flex; align-items: center; justify-content: center; min-height: 262mm; background: linear-gradient(160deg, #eff6ff 0%, #ffffff 60%); }
    .cover-inner { text-align: center; }
    .cover-kicker { font-size: 11pt; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #38bdf8; margin-bottom: 18px; }
    .cover-title { font-size: 32pt; line-height: 1.2; color: #111; margin-bottom: 18px; }
    .cover-sub { font-size: 13pt; color: #52525b; margin-bottom: 6px; }
    .cover-sub2 { font-size: 10pt; color: #9ca3af; max-width: 460px; margin: 18px auto 0; }

    .page.toc h1 { margin-bottom: 20px; }
    .toc-group { margin-bottom: 14px; break-inside: avoid; }
    .toc-group h3 { color: #0369a1; margin: 0 0 4px; display: flex; align-items: baseline; gap: 8px; }
    .toc-count { font-size: 9pt; font-weight: 400; color: #9ca3af; }
    .toc-group ul { margin: 0; padding-left: 18px; columns: 2; column-gap: 24px; }
    .toc-group li { font-size: 10pt; margin-bottom: 2px; break-inside: avoid; }

    .page.divider { display: flex; align-items: center; justify-content: center; min-height: 262mm; background: #0369a1; color: #fff; }
    .divider-inner { text-align: center; }
    .divider-kicker { font-size: 11pt; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #bae6fd; margin-bottom: 14px; }
    .divider-inner h1 { color: #fff; font-size: 30pt; margin-bottom: 10px; }
    .divider-count { color: #bae6fd; font-size: 12pt; }
    .divider-ar { background: #44403c; }
    .ar-title { direction: rtl; font-family: Tahoma, 'Segoe UI', sans-serif; }
    .divider-inner .ar-title { font-size: 22pt; line-height: 1.6; max-width: 640px; margin: 0 auto 10px; }
    h3.ar-title { color: #0369a1; justify-content: flex-end; }
  </style></head><body>${body}</body></html>`;
}

async function main() {
  const { data: topics, error } = await db
    .from("muendlich_materials")
    .select("id, title, body_text, theme_category, speaking_toolbox, is_unassigned_center")
    .eq("teil", 3).eq("category", "themen").eq("level", level)
    .order("title");
  if (error) throw error;

  const ready = topics.filter(t => t.speaking_toolbox && t.speaking_toolbox.schema_version === 2);
  const missing = topics.filter(t => !(t.speaking_toolbox && t.speaking_toolbox.schema_version === 2));
  console.log(`Level ${level}: ${ready.length}/${topics.length} topics have v2 content.`);
  if (missing.length) console.log("Missing content for:", missing.map(t => t.title).join(" | "));
  if (!ready.length) throw new Error("No topics with v2 content — nothing to compile.");

  const groups = groupTopics(ready);
  console.log("Groups:", groups.map(g => `${g.name} (${g.topics.length})`).join(", "));

  const html = renderBookHtml(groups, ready.length);
  writeFileSync(`${SCRATCH}\\muendlich-teil3-meisterbuch.html`, html, "utf8");

  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const pdfPath = `${SCRATCH}\\muendlich-teil3-meisterbuch.pdf`;
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  await browser.close();
  console.log("Rendered:", pdfPath);

  const bytes = readFileSync(pdfPath);
  const storagePath = "teil-3/redemittel/AuraLingovia-Sprechen-Teil3-Meisterbuch.pdf";
  const up = await db.storage.from("muendlich-pdfs").upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });
  if (up.error) throw up.error;
  console.log("Uploaded:", up.data.path, `(${(bytes.length / 1024 / 1024).toFixed(1)} MB)`);

  const { data: existing } = await db
    .from("muendlich_materials")
    .select("id, sort_order")
    .eq("teil", 3).eq("category", "redemittel").eq("level", level)
    .maybeSingle();

  if (existing) {
    const { error: updErr } = await db.from("muendlich_materials")
      .update({ title: `Sprechen Teil 3 — Das Meisterbuch (alle ${ready.length} Themen)`, storage_path: storagePath })
      .eq("id", existing.id);
    if (updErr) throw updErr;
    console.log("Updated existing Meisterbuch row:", existing.id);
  } else {
    const { data: ins, error: insErr } = await db.from("muendlich_materials").insert({
      teil: 3, category: "redemittel", level,
      title: `Sprechen Teil 3 — Das Meisterbuch (alle ${ready.length} Themen)`,
      storage_path: storagePath, sort_order: 1,
    }).select().single();
    if (insErr) throw insErr;
    console.log("Inserted new Meisterbuch row:", ins.id);
  }
}

main().catch(e => { console.error("ERR", e); process.exit(1); });
