// Renders one Mündlich Teil 2 topic's full 7-page speaking_toolbox (schema_version 2)
// to a branded, print-ready PDF via Playwright (Edge channel — this machine's Playwright
// Chromium download is missing a VC++ runtime dependency, Edge is a working substitute),
// then uploads it to the muendlich-pdfs storage bucket and sets storage_path on the
// muendlich_materials row so it opens via the same PdfViewer used for Teil 1.
//
// Usage: node scripts/gen-muendlich-teil2-pdf.mjs <topic-id>
import "dotenv/config";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const topicId = process.argv[2];
if (!topicId) { console.error("Usage: node scripts/gen-muendlich-teil2-pdf.mjs <topic-id>"); process.exit(1); }

const db = createClient(
  process.env.SUPABASE_URL ?? "https://gewcyydpgbfutkdcyztr.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// Marks **connector phrases** as highlighted spans — mirrors renderMarked() in
// MuendlichTeil2Themen.tsx so the PDF matches the in-app rendering.
function marked(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<mark>$1</mark>');
}
function ar(s) { return `<p class="ar">${esc(s)}</p>`; }
function redemittelList(items) {
  return `<ul class="redemittel">${items.map(r => `<li><span class="de">„${esc(r.de)}"</span>${ar(r.ar)}</li>`).join("")}</ul>`;
}
function ideaList(items) {
  return `<ul class="ideas">${items.map(i => `<li>${esc(i.idea)}${i.verbs ? ` <span class="verbs">→ ${esc(i.verbs)}</span>` : ""}</li>`).join("")}</ul>`;
}
function plainList(items) {
  return `<ul class="ideas">${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`;
}
function vocabCol(title, items) {
  return `<div class="vocab-col"><h4>${title}</h4><ul>${items.map(i => `<li><span class="de">${esc(i.de)}</span><span class="ar-inline">${esc(i.ar)}</span></li>`).join("")}</ul></div>`;
}

function renderHtml(topic) {
  const tb = topic.speaking_toolbox;
  const pageHeader = (n, label) => `<div class="page-meta"><span>AuraLingovia · Mündlich Teil 2</span><span>Seite ${n}/7 — ${label}</span></div>`;

  const page1 = `
    <section class="page">
      ${pageHeader(1, "Text")}
      <h1>${esc(topic.title)}</h1>
      <p class="body-text">${esc(topic.body_text).replace(/\n/g, "<br>")}</p>
    </section>`;

  const page2 = `
    <section class="page">
      ${pageHeader(2, "Inhalt & Thema-Extraktion")}
      <h2>${esc(topic.title)}</h2>
      <div class="ar-box"><h3 class="ar-h">الشرح والملخص</h3>${ar(tb.page2_inhalt.ar_summary)}</div>
      <div class="ar-box"><h3 class="ar-h">كيف نستخرج موضوع النص</h3>${ar(tb.page2_inhalt.extraction_guide_ar)}</div>
      <h3>Inhalt (Zusammenfassung)</h3>
      <p>${esc(tb.page2_inhalt.inhalt_de)}</p>
      <h3>Redemittel für den Inhalt</h3>
      ${redemittelList(tb.page2_inhalt.inhalt_redemittel)}
      <h3>Ideen zum Text</h3>
      ${ideaList(tb.page2_inhalt.ideas)}
    </section>`;

  const page3 = `
    <section class="page">
      ${pageHeader(3, "Meinung")}
      <h2>${esc(topic.title)}</h2>
      <h3>Redemittel für die Meinung</h3>
      ${redemittelList(tb.page3_meinung.redemittel)}
      <h3>Ideen zur Meinung</h3>
      ${ideaList(tb.page3_meinung.ideas)}
      <div class="example"><h3>Beispiel</h3><p>${marked(tb.page3_meinung.example.text)}</p>${ar(tb.page3_meinung.example.ar)}</div>
    </section>`;

  const page4 = `
    <section class="page">
      ${pageHeader(4, "Erfahrung")}
      <h2>${esc(topic.title)}</h2>
      <div class="two-col">
        <div>
          <h3>Persönliche Erfahrung</h3>
          ${redemittelList(tb.page4_erfahrung.experience_redemittel)}
          ${plainList(tb.page4_erfahrung.experience_ideas)}
        </div>
        <div>
          <h3>Mein Heimatland (Tunesien)</h3>
          ${redemittelList(tb.page4_erfahrung.heimatland_redemittel)}
          ${plainList(tb.page4_erfahrung.heimatland_ideas)}
        </div>
      </div>
      <div class="example"><h3>${esc(tb.page4_erfahrung.example.label ?? "Beispiel")}</h3><p>${marked(tb.page4_erfahrung.example.text)}</p>${ar(tb.page4_erfahrung.example.ar)}</div>
    </section>`;

  const page5 = `
    <section class="page">
      ${pageHeader(5, "Vor- & Nachteile")}
      <h2>${esc(topic.title)}</h2>
      <div class="two-col">
        <div class="pro"><h3>Vorteile</h3>${redemittelList(tb.page5_procontra.vorteile.redemittel)}${ideaList(tb.page5_procontra.vorteile.ideas)}</div>
        <div class="contra"><h3>Nachteile</h3>${redemittelList(tb.page5_procontra.nachteile.redemittel)}${ideaList(tb.page5_procontra.nachteile.ideas)}</div>
      </div>
      <div class="example"><h3>Beispiel</h3><p>${marked(tb.page5_procontra.example.text)}</p>${ar(tb.page5_procontra.example.ar)}</div>
    </section>`;

  const page6 = `
    <section class="page">
      ${pageHeader(6, "Mögliche Prüfungsfragen")}
      <h2>${esc(topic.title)}</h2>
      ${tb.page6_fragen.questions.map((q, i) => `
        <div class="question">
          <p class="q-de">${i + 1}. ${esc(q.q_de)}</p>
          ${q.q_ar ? ar(q.q_ar) : ""}
          ${plainList(q.answer_ideas)}
        </div>`).join("")}
    </section>`;

  const page7 = `
    <section class="page">
      ${pageHeader(7, "Wortschatz")}
      <h2>${esc(topic.title)}</h2>
      <div class="vocab-grid">
        ${vocabCol("Verben", tb.page7_wortschatz.verben)}
        ${vocabCol("Nomen", tb.page7_wortschatz.nomen)}
        ${vocabCol("Adjektive", tb.page7_wortschatz.adjektive)}
        ${vocabCol("Nützliche Ausdrücke", tb.page7_wortschatz.expressions)}
      </div>
    </section>`;

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(topic.title)}</title><style>
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
    ul.ideas li { margin-bottom: 3px; }
    .verbs { color: #6b7280; }
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
  </style></head><body>
    ${page1}${page2}${page3}${page4}${page5}${page6}${page7}
  </body></html>`;
}

async function main() {
  const { data: topic, error } = await db
    .from("muendlich_materials")
    .select("id, title, body_text, speaking_toolbox, theme_category")
    .eq("id", topicId)
    .single();
  if (error) throw error;
  if (!topic.speaking_toolbox || topic.speaking_toolbox.schema_version !== 2) {
    throw new Error(`Topic ${topicId} has no v2 speaking_toolbox yet.`);
  }

  const html = renderHtml(topic);
  const tmpHtmlPath = `C:\\Users\\asus\\AppData\\Local\\Temp\\claude\\C--Users-asus-AuraLingovia\\d62fd849-b08b-4a27-a94b-dd84844ba827\\scratchpad\\muendlich-t2-${topicId}.html`;
  writeFileSync(tmpHtmlPath, html, "utf8");

  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  // Chromium's print-to-pdf can subset fonts before all glyphs finish loading,
  // silently dropping scattered letters (a real bug hit on the first render —
  // "Rauchen" -> "Rauch n", "für" -> "ür"). Force full font readiness first.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const pdfPath = `C:\\Users\\asus\\AppData\\Local\\Temp\\claude\\C--Users-asus-AuraLingovia\\d62fd849-b08b-4a27-a94b-dd84844ba827\\scratchpad\\muendlich-t2-${topicId}.pdf`;
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  await browser.close();
  console.log("Rendered PDF:", pdfPath);

  const { readFileSync } = await import("node:fs");
  const bytes = readFileSync(pdfPath);
  const slug = topic.title.toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const storagePath = `teil-2/themen/${slug}.pdf`;

  const up = await db.storage.from("muendlich-pdfs").upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });
  if (up.error) throw up.error;
  console.log("Uploaded to:", up.data.path);

  const { error: updErr } = await db.from("muendlich_materials").update({ storage_path: storagePath }).eq("id", topicId);
  if (updErr) throw updErr;
  console.log("storage_path set on", topicId, "->", storagePath);
}

main().catch((e) => { console.error("ERR", e); process.exit(1); });
