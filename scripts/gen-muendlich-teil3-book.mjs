// Compiles ALL Mündlich Teil 3 topics' 7-page speaking_toolbox content into ONE
// unified PDF book — same "Meisterbuch" pattern as Teil 1/Teil 2. Topics are
// grouped by theme_category (GROUP_ORDER kept in sync with
// MuendlichTeil3Themen.tsx and scripts/teil3-group-templates.mjs, same
// duplication convention already established for Teil 2). Every page carries
// AuraLingovia + Chames_Dean branding in the header/footer per spec.
//
// Usage: node scripts/gen-muendlich-teil3-book.mjs [level]   (default TELC_B2)
import "dotenv/config";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync } from "node:fs";
import { GROUP_ORDER, buildRedemittelForGroup, buildStrukturForGroup, buildTippsForGroup } from "./teil3-group-templates.mjs";

const level = process.argv[2] ?? "TELC_B2";
const SCRATCH = "C:\\Users\\asus\\AppData\\Local\\Temp\\claude\\C--Users-asus-AuraLingovia\\d62fd849-b08b-4a27-a94b-dd84844ba827\\scratchpad";

const db = createClient(
  process.env.SUPABASE_URL ?? "https://gewcyydpgbfutkdcyztr.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function groupTopics(topics) {
  const groups = [];
  for (const name of GROUP_ORDER) {
    const inGroup = topics.filter(t => (t.theme_category ?? "Sonstiges") === name);
    if (inGroup.length) groups.push({ name, topics: inGroup });
  }
  const known = new Set(GROUP_ORDER);
  const leftover = [...new Set(topics.map(t => t.theme_category ?? "Sonstiges").filter(n => !known.has(n)))];
  for (const name of leftover) groups.push({ name, topics: topics.filter(t => (t.theme_category ?? "Sonstiges") === name) });
  return groups;
}

function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function plainList(items) { return `<ul class="ideas">${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`; }
function redemittelBlock(cat, items, label) {
  return `<div class="rd-cat"><h4>${esc(label)}</h4><ul class="rd">${items.map(r => `<li>„${esc(r)}"</li>`).join("")}</ul></div>`;
}
function vocabCol(title, items) {
  return `<div class="vocab-col"><h4>${esc(title)}</h4><ul>${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>`;
}

const REDEMITTEL_LABELS = {
  einstieg: "Einstieg", idee_einbringen: "Idee einbringen", vorschlag_machen: "Vorschlag machen",
  meinung_erfragen: "Meinung erfragen", zustimmen: "Zustimmen", hoeflich_widersprechen: "Höflich widersprechen",
  begruenden: "Begründen", vergleichen: "Vergleichen", vor_nachteile: "Vor- & Nachteile nennen",
  reagieren: "Reagieren", themenwechsel: "Themenwechsel", entscheidung: "Entscheidung treffen", abschluss: "Abschluss",
};

function pageBar(n, groupName, label) {
  // No "Seite N/total" — a long Beispieldialog can legitimately spill onto a
  // second physical page, which would make a hardcoded "/7" inaccurate. The
  // section label plus group name is enough context; real PDF viewers already
  // show the actual page number.
  return `<div class="page-bar"><span class="brand">AuraLingovia <span class="brand-sep">·</span> <span class="brand-author">Chames_Dean</span></span><span class="page-bar-r">${esc(groupName)} — ${label}</span></div>`;
}

function renderTopicPages(topic, groupName) {
  const tb = topic.speaking_toolbox;
  const struktur = buildStrukturForGroup();
  const redemittel = buildRedemittelForGroup(groupName);
  const tipps = buildTippsForGroup(groupName);

  const page1 = `<section class="page">
    ${pageBar(1, groupName, "Aufgabe")}
    <h1>${esc(topic.title)}</h1>
    <p class="body-text">${esc(topic.body_text).replace(/\n/g, "<br>")}</p>
    </section>`;

  const page2 = `<section class="page">
    ${pageBar(2, groupName, "Erklärung & Struktur")}
    <h2>${esc(topic.title)}</h2>
    <h3>Worum geht es?</h3><p>${esc(tb.erklaerung.worum_geht_es)}</p>
    <h3>Was wird erwartet?</h3><p>${esc(tb.erklaerung.was_wird_erwartet)}</p>
    <div class="two-col">
      <div><h3>Wichtige Punkte</h3>${plainList(tb.erklaerung.wichtige_punkte)}</div>
      <div><h3>Worauf achten?</h3>${plainList(tb.erklaerung.worauf_achten)}</div>
    </div>
    <h3>Struktur für das Gespräch</h3>
    <ol class="struktur">${struktur.map(s => `<li><strong>${esc(s.schritt)}</strong> — ${esc(s.beschreibung)}</li>`).join("")}</ol>
    </section>`;

  const page3 = `<section class="page">
    ${pageBar(3, groupName, "Redemittel")}
    <h2>Redemittel</h2>
    <div class="rd-grid">${Object.entries(redemittel).map(([cat, items]) => redemittelBlock(cat, items, REDEMITTEL_LABELS[cat] ?? cat)).join("")}</div>
    </section>`;

  const page4 = `<section class="page">
    ${pageBar(4, groupName, "Diskussionsideen")}
    <h2>Diskussionsideen</h2>
    ${plainList(tb.diskussionsideen)}
    </section>`;

  const page5 = `<section class="page">
    ${pageBar(5, groupName, "Tipps")}
    <h2>Tipps für die Prüfung</h2>
    ${plainList(tipps)}
    </section>`;

  const page6 = `<section class="page">
    ${pageBar(6, groupName, "Beispieldialog")}
    <h2>Beispieldialog</h2>
    <div class="dialog">${tb.beispieldialog.map(l => `<p class="dl dl-${l.speaker === "A" ? "a" : "b"}"><span class="dl-speaker">${l.speaker}:</span> ${esc(l.text)}</p>`).join("")}</div>
    </section>`;

  const page7 = `<section class="page">
    ${pageBar(7, groupName, "Wortschatz")}
    <h2>Wortschatz</h2>
    <div class="vocab-grid">
      ${vocabCol("Wichtige Verben", tb.wortschatz.verben)}
      ${vocabCol("Wichtige Wörter", tb.wortschatz.woerter)}
      ${vocabCol("Wichtige Adjektive", tb.wortschatz.adjektive)}
    </div>
    </section>`;

  return page1 + page2 + page3 + page4 + page5 + page6 + page7;
}

function renderCover(topicCount, groupCount) {
  return `<section class="page cover">
    <div class="cover-inner">
      <p class="cover-kicker">AuraLingovia × Chames_Dean</p>
      <h1 class="cover-title">Sprechen Teil 3<br>Das Meisterbuch</h1>
      <p class="cover-sub">Gemeinsam etwas planen — ${topicCount} Themen in ${groupCount} thematischen Zentren</p>
      <p class="cover-sub2">Erklärung · Struktur · Redemittel · Diskussionsideen · Tipps · Beispieldialog · Wortschatz</p>
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

function renderDivider(groupName, count) {
  return `<section class="page divider">
    <div class="divider-inner">
      <p class="divider-kicker">Thematisches Zentrum</p>
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
      renderDivider(g.name, g.topics.length),
      ...g.topics.map(t => renderTopicPages(t, g.name)),
    ]),
  ].join("");

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Sprechen Teil 3 — Das Meisterbuch</title><style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, 'Segoe UI', Tahoma, sans-serif; color: #1c1917; font-size: 11pt; line-height: 1.55; margin: 0; }
    .page { break-after: page; }
    .page:last-child { break-after: auto; }
    .page-bar { display: flex; justify-content: space-between; align-items: baseline; font-size: 8.5pt; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #0369a1; border-bottom: 2px solid #38bdf8; padding-bottom: 4px; margin-bottom: 14px; }
    .page-bar-r { text-transform: none; font-weight: 600; color: #94a3b8; letter-spacing: 0; }
    .brand { color: #0369a1; } .brand-sep { color: #94a3b8; } .brand-author { color: #64748b; font-weight: 600; }
    h1 { font-size: 18pt; margin: 4px 0 14px; color: #111; }
    h2 { font-size: 14pt; margin: 0 0 12px; color: #0369a1; }
    h3 { font-size: 11pt; margin: 14px 0 6px; color: #111; }
    h4 { font-size: 10pt; margin: 0 0 6px; color: #0369a1; }
    p { margin: 0 0 8px; }
    .body-text { font-size: 11.5pt; line-height: 1.75; }
    .two-col { display: flex; gap: 22px; }
    .two-col > div { flex: 1; }
    ul.ideas { margin: 0 0 10px; padding-left: 18px; }
    ul.ideas li { margin-bottom: 7px; }
    ol.struktur { margin: 0 0 10px; padding-left: 18px; }
    ol.struktur li { margin-bottom: 8px; }
    .rd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
    .rd-cat { break-inside: avoid; margin-bottom: 6px; }
    ul.rd { list-style: none; padding: 0; margin: 0; }
    ul.rd li { font-style: italic; font-size: 9.7pt; margin-bottom: 3px; color: #334155; }
    .dialog { font-size: 10pt; line-height: 1.45; }
    .dl { margin-bottom: 5px; padding-left: 4px; }
    .dl-speaker { font-weight: 800; color: #0369a1; }
    .dl-b .dl-speaker { color: #be123c; }
    .vocab-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px 20px; }
    .vocab-col ul { list-style: none; padding: 0; margin: 0; }
    .vocab-col li { border-bottom: 1px dotted #e5e7eb; padding: 3px 0; font-size: 10pt; }

    .page.cover { display: flex; align-items: center; justify-content: center; min-height: 262mm; background: linear-gradient(160deg, #eff6ff 0%, #ffffff 60%); }
    .cover-inner { text-align: center; }
    .cover-kicker { font-size: 11pt; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #38bdf8; margin-bottom: 18px; }
    .cover-title { font-size: 32pt; line-height: 1.2; color: #111; margin-bottom: 18px; }
    .cover-sub { font-size: 13pt; color: #52525b; margin-bottom: 6px; }
    .cover-sub2 { font-size: 10pt; color: #9ca3af; max-width: 440px; margin: 18px auto 0; }

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
  </style></head><body>${body}</body></html>`;
}

async function main() {
  const { data: topics, error } = await db
    .from("muendlich_materials")
    .select("id, title, body_text, theme_category, speaking_toolbox")
    .eq("teil", 3).eq("category", "themen").eq("level", level)
    .order("title");
  if (error) throw error;

  const ready = topics.filter(t => t.speaking_toolbox && t.speaking_toolbox.schema_version === 1);
  const missing = topics.filter(t => !(t.speaking_toolbox && t.speaking_toolbox.schema_version === 1));
  console.log(`Level ${level}: ${ready.length}/${topics.length} topics have v1 content.`);
  if (missing.length) console.log("Missing content for:", missing.map(t => t.title).join(" | "));
  if (!ready.length) throw new Error("No topics with v1 content — nothing to compile.");

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
