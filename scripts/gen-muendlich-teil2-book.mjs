// Compiles ALL Mündlich Teil 2 topics' 7-page speaking_toolbox content into ONE
// unified PDF book — replaces the earlier per-topic-PDF approach per explicit
// owner direction ("just like the PDF Book in Teil 1", i.e. Teil 1's single
// "Das Meisterbuch" pattern, not 55 separate files). Topics are grouped by
// theme_category in the same hand-ordered sequence the student-facing UI
// uses (MuendlichTeil2Themen.tsx's groupTopics()), with the 9
// is_unassigned_center topics forced into a final "Noch in keinem Zentrum
// eingeführte Themen" section regardless of their theme_category tag.
//
// Usage: node scripts/gen-muendlich-teil2-book.mjs [level]   (default TELC_B2)
import "dotenv/config";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync } from "node:fs";

const level = process.argv[2] ?? "TELC_B2";
const SCRATCH = "C:\\Users\\asus\\AppData\\Local\\Temp\\claude\\C--Users-asus-AuraLingovia\\d62fd849-b08b-4a27-a94b-dd84844ba827\\scratchpad";

const db = createClient(
  process.env.SUPABASE_URL ?? "https://gewcyydpgbfutkdcyztr.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── same GROUP_ORDER as MuendlichTeil2Themen.tsx, kept in sync deliberately ──
const GROUP_ORDER = [
  "Gesundheit", "Technologie", "Beruf", "Bildung", "Gesellschaft",
  "Konsum", "Medien", "Familie", "Wohnen", "Finanzen", "Reisen",
];
const UNASSIGNED_GROUP = "Noch in keinem Zentrum eingeführte Themen";

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
function marked(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<mark>$1</mark>'); }
function ar(s) { return `<p class="ar">${esc(s)}</p>`; }
function redemittelList(items) {
  return `<ul class="redemittel">${items.map(r => `<li><span class="de">„${esc(r.de)}"</span>${ar(r.ar)}</li>`).join("")}</ul>`;
}
function sentenceList(items) {
  return `<ul class="ideas">${items.map(i => `<li><span class="de-sentence">${esc(i.de)}</span>${ar(i.ar)}</li>`).join("")}</ul>`;
}
function plainList(items) {
  return `<ul class="ideas">${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`;
}
function vocabCol(title, items) {
  return `<div class="vocab-col"><h4>${title}</h4><ul>${items.map(i => `<li><span class="de">${esc(i.de)}</span><span class="ar-inline">${esc(i.ar)}</span></li>`).join("")}</ul></div>`;
}

function renderTopicPages(topic, groupName) {
  const tb = topic.speaking_toolbox;
  const pageHeader = (n, label) => `<div class="page-meta"><span>${esc(groupName)}</span><span>Seite ${n}/7 — ${label}</span></div>`;

  const page1 = `<section class="page">${pageHeader(1, "Text")}<h1>${esc(topic.title)}</h1><p class="body-text">${esc(topic.body_text).replace(/\n/g, "<br>")}</p></section>`;

  const page2 = `<section class="page">${pageHeader(2, "Inhalt & Thema-Extraktion")}<h2>${esc(topic.title)}</h2>
    <div class="ar-box"><h3 class="ar-h">الشرح والملخص</h3>${ar(tb.page2_inhalt.ar_summary)}</div>
    <div class="ar-box"><h3 class="ar-h">كيف نستخرج موضوع النص</h3>${ar(tb.page2_inhalt.extraction_guide_ar)}</div>
    <h3>Inhalt (Zusammenfassung)</h3><p>${esc(tb.page2_inhalt.inhalt_de)}</p>
    <h3>Redemittel für den Inhalt</h3>${redemittelList(tb.page2_inhalt.inhalt_redemittel)}
    <h3>Ideen zum Text</h3>${sentenceList(tb.page2_inhalt.ideas)}</section>`;

  const page3 = `<section class="page">${pageHeader(3, "Meinung")}<h2>${esc(topic.title)}</h2>
    <h3>Redemittel für die Meinung</h3>${redemittelList(tb.page3_meinung.redemittel)}
    <h3>Ideen zur Meinung</h3>${sentenceList(tb.page3_meinung.ideas)}
    <div class="example"><h3>Beispiel</h3><p>${marked(tb.page3_meinung.example.text)}</p>${ar(tb.page3_meinung.example.ar)}</div></section>`;

  const page4 = `<section class="page">${pageHeader(4, "Erfahrung")}<h2>${esc(topic.title)}</h2>
    <div class="two-col">
      <div><h3>Persönliche Erfahrung</h3>${redemittelList(tb.page4_erfahrung.experience_redemittel)}${sentenceList(tb.page4_erfahrung.experience_ideas)}</div>
      <div><h3>Mein Heimatland (Tunesien)</h3>${redemittelList(tb.page4_erfahrung.heimatland_redemittel)}${sentenceList(tb.page4_erfahrung.heimatland_ideas)}</div>
    </div>
    <div class="example"><h3>${esc(tb.page4_erfahrung.example.label ?? "Beispiel")}</h3><p>${marked(tb.page4_erfahrung.example.text)}</p>${ar(tb.page4_erfahrung.example.ar)}</div></section>`;

  const page5 = `<section class="page">${pageHeader(5, "Vor- & Nachteile")}<h2>${esc(topic.title)}</h2>
    <div class="two-col">
      <div class="pro"><h3>Vorteile</h3>${redemittelList(tb.page5_procontra.vorteile.redemittel)}${sentenceList(tb.page5_procontra.vorteile.ideas)}</div>
      <div class="contra"><h3>Nachteile</h3>${redemittelList(tb.page5_procontra.nachteile.redemittel)}${sentenceList(tb.page5_procontra.nachteile.ideas)}</div>
    </div>
    <div class="example"><h3>Beispiel</h3><p>${marked(tb.page5_procontra.example.text)}</p>${ar(tb.page5_procontra.example.ar)}</div></section>`;

  const page6 = `<section class="page">${pageHeader(6, "Mögliche Prüfungsfragen")}<h2>${esc(topic.title)}</h2>
    ${tb.page6_fragen.questions.map((q, i) => `<div class="question"><p class="q-de">${i + 1}. ${esc(q.q_de)}</p>${q.q_ar ? ar(q.q_ar) : ""}${plainList(q.answer_ideas)}</div>`).join("")}</section>`;

  const page7 = `<section class="page">${pageHeader(7, "Wortschatz")}<h2>${esc(topic.title)}</h2>
    <div class="vocab-grid">
      ${vocabCol("Verben", tb.page7_wortschatz.verben)}
      ${vocabCol("Nomen", tb.page7_wortschatz.nomen)}
      ${vocabCol("Adjektive", tb.page7_wortschatz.adjektive)}
      ${vocabCol("Nützliche Ausdrücke", tb.page7_wortschatz.expressions)}
    </div></section>`;

  return page1 + page2 + page3 + page4 + page5 + page6 + page7;
}

function renderCover(topicCount, groupCount) {
  return `<section class="page cover">
    <div class="cover-inner">
      <p class="cover-kicker">AuraLingovia</p>
      <h1 class="cover-title">Sprechen Teil 2<br>Das Meisterbuch</h1>
      <p class="cover-sub">Diskussion — ${topicCount} Themen in ${groupCount} thematischen Zentren</p>
      <p class="cover-sub2">Text · Inhalt &amp; Thema-Extraktion · Meinung · Erfahrung &amp; Heimatland · Vor- &amp; Nachteile · Prüfungsfragen · Wortschatz</p>
    </div>
  </section>`;
}

function renderToc(groups) {
  return `<section class="page toc">
    <h1>Inhaltsverzeichnis</h1>
    ${groups.map(g => `
      <div class="toc-group">
        <h3>${esc(g.name)} <span class="toc-count">${g.topics.length}</span></h3>
        <ul>${g.topics.map(t => `<li>${esc(t.title)}</li>`).join("")}</ul>
      </div>`).join("")}
  </section>`;
}

function renderDivider(groupName, count, isUnassigned) {
  return `<section class="page divider">
    <div class="divider-inner">
      ${isUnassigned ? "" : `<p class="divider-kicker">Thematisches Zentrum</p>`}
      <h1>${esc(groupName)}</h1>
      <p class="divider-count">${count} Themen</p>
    </div>
  </section>`;
}

function renderBookHtml(groups, topicCount) {
  const body = [
    renderCover(topicCount, groups.length),
    renderToc(groups),
    ...groups.flatMap(g => [
      renderDivider(g.name, g.topics.length, g.name === UNASSIGNED_GROUP),
      ...g.topics.map(t => renderTopicPages(t, g.name)),
    ]),
  ].join("");

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Sprechen Teil 2 — Das Meisterbuch</title><style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, 'Segoe UI', Tahoma, sans-serif; color: #1c1917; font-size: 11.5pt; line-height: 1.55; margin: 0; }
    .page { break-after: page; }
    .page:last-child { break-after: auto; }
    .page-meta { display: flex; justify-content: space-between; font-size: 8.5pt; color: #9f1239; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; border-bottom: 2px solid #f43f5e; padding-bottom: 4px; margin-bottom: 14px; }
    h1 { font-size: 19pt; margin: 4px 0 14px; color: #111; }
    h2 { font-size: 14pt; margin: 0 0 12px; color: #9f1239; }
    h3 { font-size: 11.5pt; margin: 16px 0 6px; color: #111; }
    h4 { font-size: 10.5pt; margin: 0 0 6px; color: #9f1239; }
    p { margin: 0 0 8px; }
    .body-text { font-size: 11.5pt; line-height: 1.75; }
    .ar-box { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
    .ar-h { color: #4338ca; text-align: right; margin-top: 0; }
    .ar { direction: rtl; text-align: right; font-family: Tahoma, 'Segoe UI', sans-serif; font-size: 11pt; line-height: 1.9; color: #3730a3; margin: 4px 0; }
    .ar-inline { direction: rtl; font-family: Tahoma, 'Segoe UI', sans-serif; color: #6b7280; font-size: 9.5pt; margin-left: 6px; }
    ul.redemittel { list-style: none; padding: 0; margin: 0 0 10px; }
    ul.redemittel li { margin-bottom: 6px; }
    ul.redemittel .de { font-style: italic; }
    ul.ideas { margin: 0 0 10px; padding-left: 18px; }
    ul.ideas li { margin-bottom: 10px; }
    ul.ideas .de-sentence { display: block; }
    ul.ideas .ar { margin: 3px 0 0; font-size: 10pt; }
    .example { background: #fff1f2; border: 1px solid #fda4af; border-radius: 8px; padding: 10px 14px; margin-top: 10px; }
    .example h3 { margin-top: 0; color: #9f1239; }
    mark { background: #fecdd3; color: #9f1239; font-weight: 700; padding: 0 3px; border-radius: 3px; }
    .two-col { display: flex; gap: 22px; }
    .two-col > div { flex: 1; }
    .pro h3 { color: #047857; }
    .contra h3 { color: #b91c1c; }
    .question { border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 10px; }
    .q-de { font-weight: 700; margin-bottom: 4px; }
    .vocab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
    .vocab-col ul { list-style: none; padding: 0; margin: 0; }
    .vocab-col li { display: flex; justify-content: space-between; border-bottom: 1px dotted #e5e7eb; padding: 3px 0; }

    .page.cover { display: flex; align-items: center; justify-content: center; min-height: 262mm; background: linear-gradient(160deg, #fff1f2 0%, #ffffff 60%); }
    .cover-inner { text-align: center; }
    .cover-kicker { font-size: 11pt; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #f43f5e; margin-bottom: 18px; }
    .cover-title { font-size: 34pt; line-height: 1.2; color: #111; margin-bottom: 18px; }
    .cover-sub { font-size: 13pt; color: #52525b; margin-bottom: 6px; }
    .cover-sub2 { font-size: 10pt; color: #9ca3af; max-width: 420px; margin: 18px auto 0; }

    .page.toc h1 { margin-bottom: 20px; }
    .toc-group { margin-bottom: 14px; break-inside: avoid; }
    .toc-group h3 { color: #9f1239; margin: 0 0 4px; display: flex; align-items: baseline; gap: 8px; }
    .toc-count { font-size: 9pt; font-weight: 400; color: #9ca3af; }
    .toc-group ul { margin: 0; padding-left: 18px; columns: 2; column-gap: 24px; }
    .toc-group li { font-size: 10pt; margin-bottom: 2px; break-inside: avoid; }

    .page.divider { display: flex; align-items: center; justify-content: center; min-height: 262mm; background: #9f1239; color: #fff; }
    .divider-inner { text-align: center; }
    .divider-kicker { font-size: 11pt; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #fecdd3; margin-bottom: 14px; }
    .divider-inner h1 { color: #fff; font-size: 30pt; margin-bottom: 10px; }
    .divider-count { color: #fecdd3; font-size: 12pt; }
  </style></head><body>${body}</body></html>`;
}

async function main() {
  const { data: topics, error } = await db
    .from("muendlich_materials")
    .select("id, title, body_text, theme_category, is_unassigned_center, speaking_toolbox")
    .eq("teil", 2).eq("category", "themen").eq("level", level)
    .order("title");
  if (error) throw error;

  const ready = topics.filter(t => t.speaking_toolbox && t.speaking_toolbox.schema_version === 2);
  const missing = topics.filter(t => !(t.speaking_toolbox && t.speaking_toolbox.schema_version === 2));
  console.log(`Level ${level}: ${ready.length}/${topics.length} topics have v2 content.`);
  if (missing.length) {
    console.log("Missing content for:", missing.map(t => t.title).join(" | "));
  }
  if (!ready.length) throw new Error("No topics with v2 content — nothing to compile.");

  const groups = groupTopics(ready);
  console.log("Groups:", groups.map(g => `${g.name} (${g.topics.length})`).join(", "));

  const html = renderBookHtml(groups, ready.length);
  writeFileSync(`${SCRATCH}\\muendlich-teil2-meisterbuch.html`, html, "utf8");

  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const pdfPath = `${SCRATCH}\\muendlich-teil2-meisterbuch.pdf`;
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  await browser.close();
  console.log("Rendered:", pdfPath);

  const bytes = readFileSync(pdfPath);
  const storagePath = "teil-2/redemittel/AuraLingovia-Sprechen-Teil2-Meisterbuch.pdf";
  const up = await db.storage.from("muendlich-pdfs").upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });
  if (up.error) throw up.error;
  console.log("Uploaded:", up.data.path, `(${(bytes.length / 1024 / 1024).toFixed(1)} MB)`);

  const { data: existing } = await db
    .from("muendlich_materials")
    .select("id, sort_order")
    .eq("teil", 2).eq("category", "redemittel").eq("level", level)
    .maybeSingle();

  if (existing) {
    const { error: updErr } = await db.from("muendlich_materials")
      .update({ title: `Sprechen Teil 2 — Das Meisterbuch (alle ${ready.length} Themen)`, storage_path: storagePath })
      .eq("id", existing.id);
    if (updErr) throw updErr;
    console.log("Updated existing Meisterbuch row:", existing.id);
  } else {
    const { data: ins, error: insErr } = await db.from("muendlich_materials").insert({
      teil: 2, category: "redemittel", level,
      title: `Sprechen Teil 2 — Das Meisterbuch (alle ${ready.length} Themen)`,
      storage_path: storagePath, sort_order: 1,
    }).select().single();
    if (insErr) throw insErr;
    console.log("Inserted new Meisterbuch row:", ins.id);
  }
}

main().catch(e => { console.error("ERR", e); process.exit(1); });
