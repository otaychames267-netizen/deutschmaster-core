/** Definitive Hoeren extraction: TEXT comes from poppler's pdftotext -bbox
 * (reliable word segmentation and German spelling — pdf.js's own text layer
 * was found to split/misspell words on this PDF's font). COLOR comes from
 * sampling actual rendered pixels at each word's bbox (also via poppler, at
 * a fixed DPI) — NOT the PDF operator-list fill-color sequence, which was
 * found to desync on pages with a corrupted font and silently misattribute
 * colors between statements.
 * GREEN ink = Richtig, everything else = Falsch.
 * Usage: node scripts/hoeren-extract-final.mjs <file.pdf> [firstPage] [lastPage]
 */
import { loadImage, createCanvas } from "canvas";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PDFTOTEXT = "C:/Users/asus/AppData/Local/poppler/poppler-26.02.0/Library/bin/pdftotext.exe";
const PDFTOPPM = "C:/Users/asus/AppData/Local/poppler/poppler-26.02.0/Library/bin/pdftoppm.exe";
const RENDER_DPI = 300;
const SCALE = RENDER_DPI / 72;

const file = process.argv[2];
const firstPage = process.argv[3] ? parseInt(process.argv[3], 10) : 1;
const lastPageArg = process.argv[4] ? parseInt(process.argv[4], 10) : null;

function getPageCount(pdfPath) {
  const PDFINFO = "C:/Users/asus/AppData/Local/poppler/poppler-26.02.0/Library/bin/pdfinfo.exe";
  const out = execFileSync(PDFINFO, [pdfPath], { encoding: "utf8" });
  const m = out.match(/Pages:\s*(\d+)/);
  return m ? parseInt(m[1], 10) : firstPage;
}
const lastPage = lastPageArg ?? getPageCount(file);

function bboxWordsForPage(pdfPath, pageNum) {
  const dir = mkdtempSync(join(tmpdir(), "hb-"));
  const outPath = join(dir, "out.html");
  execFileSync(PDFTOTEXT, ["-bbox", "-f", String(pageNum), "-l", String(pageNum), pdfPath, outPath], { stdio: ["ignore", "ignore", "ignore"] });
  const html = readFileSync(outPath, "utf8");
  rmSync(dir, { recursive: true, force: true });
  const words = [];
  const re = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
  let m;
  while ((m = re.exec(html))) {
    const text = m[5].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    words.push({ xMin: +m[1], yMin: +m[2], xMax: +m[3], yMax: +m[4], text });
  }
  return words;
}

async function renderPage(pdfPath, pageNum) {
  const dir = mkdtempSync(join(tmpdir(), "hp-"));
  const prefix = join(dir, "p");
  execFileSync(PDFTOPPM, ["-png", "-f", String(pageNum), "-l", String(pageNum), "-r", String(RENDER_DPI), pdfPath, prefix], { stdio: ["ignore", "ignore", "ignore"] });
  const files = readdirSync(dir).filter((f) => f.endsWith(".png"));
  const img = await loadImage(join(dir, files[0]));
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, img.width, img.height);
  rmSync(dir, { recursive: true, force: true });
  return imgData;
}

function samplePixel(imgData, x, y) {
  if (x < 0 || y < 0 || x >= imgData.width || y >= imgData.height) return null;
  const idx = (y * imgData.width + x) * 4;
  return [imgData.data[idx], imgData.data[idx + 1], imgData.data[idx + 2]];
}

function classifyPixel(r, g, b) {
  const mn = Math.min(r, g, b);
  if (mn > 140) return null; // light background / pale highlight wash
  if (g > r + 15 && g > b + 15) return "green";
  if (r > g + 40 && r > b + 20 && g < 120) return "red"; // solid dark red ink (Arabic annotation), not a pink wash
  return "black";
}

function classifyWord(imgData, word) {
  const pxX = word.xMin * SCALE, pxY = word.yMin * SCALE;
  const pxW = Math.max(1, (word.xMax - word.xMin) * SCALE), pxH = Math.max(4, (word.yMax - word.yMin) * SCALE);
  const counts = { green: 0, black: 0, red: 0 };
  const stepX = Math.max(1, Math.floor(pxW / 20));
  const stepY = Math.max(1, Math.floor(pxH / 5));
  for (let yy = pxY; yy < pxY + pxH; yy += stepY) {
    for (let xx = pxX; xx < pxX + pxW; xx += stepX) {
      const p = samplePixel(imgData, Math.round(xx), Math.round(yy));
      if (!p) continue;
      const cls = classifyPixel(p[0], p[1], p[2]);
      if (cls) counts[cls] = (counts[cls] || 0) + 1;
    }
  }
  return counts;
}

const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
function isArabic(s) { return ARABIC_RE.test(s); }

// Matched against the WHOLE line's text (never per-word) — per-word matching
// on generic short words like "Sie" caused false positives, since the same
// word appears as an ordinary pronoun ("sie" = "she") inside real statements.
const BOILERPLATE_LINE = [
  /^H[oö]r[ev]erstehen/i,
  /^Sie h[oö]ren/i,
  /^Nachrichtensendung/i,
  /^Entscheiden Sie/i,
  /^PLUS /i,
  /^Lesen Sie/i,
  /^Markieren Sie/i,
  /^falsch sind/i,
  /^Interview nur einmal/i, // continuation line of "Sie hören ein Rundfunk-Interview...", wraps onto its own line
  /^Nachrichtensendung nur ein Mal/i,
  /^Ansagen nur einmal/i, // Teil 3's equivalent wrap-continuation of "Sie hören diese Ansagen nur einmal."
  /^Ihre L[oö]sungen auf dem Antwortbogen/i, // wrap-continuation of "Markieren Sie Ihre Lösungen auf dem Antwortbogen..."
  /^gleich richtig und MINUS/i, // wrap-continuation of "...Markieren Sie Sie PLUS (+) gleich richtig und MINUS (–)..."
];
// Some of these also need to match mid-string, since a boilerplate line that
// leaked in as an orphan sometimes arrives already merged with real statement
// text preceding it on the same visual row.
const BOILERPLATE_CONTAINS = [
  /Entscheiden Sie beim H[oö]ren, ob die Aussagen \d+ bis \d+ richtig oder/i,
];
function isBoilerplateLine(t) {
  const s = t.trim();
  return BOILERPLATE_LINE.some((re) => re.test(s)) || BOILERPLATE_CONTAINS.some((re) => re.test(s));
}

const STMT_PREFIX_RE = /^\(?(\d)\s?(\d)?\s*[).\-–:]?(.*)$/;

const allLines = [];
for (let p = firstPage; p <= lastPage; p++) {
  const allWords = bboxWordsForPage(file, p).filter((w) => w.text.trim().length > 0);

  // Group into lines by yMin BEFORE filtering Arabic — some Arabic annotation
  // lines keep a Latin-script proper noun mid-sentence (e.g. "DL", "Helena"),
  // which would otherwise slip through a word-level Arabic filter and get
  // merged into a real statement.
  //
  // Two distinct situations land in the same rawLine bucket (same y, within
  // tolerance) and need OPPOSITE handling:
  //   (a) a genuinely Arabic annotation line with 1-2 stray Latin loanwords
  //       ("DL", "Helena") — must drop the WHOLE line, or those loanwords
  //       leak into the nearest real statement as a duplicated fragment.
  //   (b) a real German statement whose row happens to sit almost exactly
  //       level with its own Arabic translation in an adjacent column (some
  //       Teil 2 pages use a side-by-side layout, not stacked) — dropping
  //       the whole line here would silently delete the statement itself.
  // Distinguish by majority: if most of the line's words are Arabic, it's
  // (a) and gets dropped entirely; otherwise it's (b) and only the Arabic
  // words are stripped, keeping the German statement text intact.
  const rawLines = [];
  for (const w of allWords) {
    const last = rawLines[rawLines.length - 1];
    // Words on the same real row share the EXACT yMin (verified: poppler
    // emits a consistent baseline per row, not per-word jitter). A tight
    // tolerance here is safe and necessary — a looser one (previously 3pt,
    // with a drifting running-average anchor) let tightly-packed Arabic
    // annotation sub-lines (as close as ~2.75pt apart) cascade-merge into
    // an adjacent real German statement row and get dropped together with it.
    if (last && Math.abs(last.y - w.yMin) < 0.5) { last.words.push(w); }
    else rawLines.push({ y: w.yMin, words: [w], page: p });
  }
  const lines = rawLines
    .filter((l) => {
      // A line that starts with an actual statement-number marker is always
      // real exercise content, regardless of word-count majority — a short
      // German statement can have a longer Arabic translation merged onto
      // the same row, which would otherwise flip "majority" to Arabic and
      // wrongly drop the whole line (losing the statement itself).
      const startsWithMarker = l.words[0] && !isArabic(l.words[0].text) && STMT_PREFIX_RE.test(l.words[0].text);
      if (startsWithMarker) return true;
      return l.words.filter((w) => isArabic(w.text)).length <= l.words.length / 2;
    })
    .map((l) => {
      // Truncate at the FIRST Arabic word, not a word-by-word filter — any
      // Latin proper noun (name, abbreviation) appearing after that point
      // belongs to the Arabic clause (e.g. a name embedded mid-sentence in
      // the translation) and must not be kept as a trailing fragment.
      const firstArabicIdx = l.words.findIndex((w) => isArabic(w.text));
      const words = firstArabicIdx === -1 ? l.words : l.words.slice(0, firstArabicIdx);
      return { ...l, words };
    })
    .filter((l) => l.words.length > 0); // a line can end up empty if Arabic started at index 0
  if (process.env.DEBUG) for (const l of lines) console.error("POSTFILTER", l.y, JSON.stringify(l.words.map(w=>w.text)));

  const imgData = await renderPage(file, p);
  for (const l of lines) for (const w of l.words) w.counts = classifyWord(imgData, w);

  allLines.push(...lines);
}

function fullText(l) { return l.words.map((w) => w.text).join(" "); }

const exercises = [];
let cur = null;
for (const l of allLines) {
  const t = fullText(l);
  // "code" line: first word is literally "code" (colon and number are separate words)
  if (l.words[0] && /^code$/i.test(l.words[0].text)) {
    const codeNum = l.words.map((w) => w.text).join("").match(/(\d+)/)?.[1] ?? null;
    cur = { code: codeNum, page: l.page, titleWords: null, statements: [], orphans: [] };
    exercises.push(cur);
    continue;
  }
  if (!cur) continue;
  if (isBoilerplateLine(t)) continue;
  if (/^H[oö]renverstehen$/i.test(t.trim())) continue;

  const firstWord = l.words[0].text;
  const m = firstWord.match(STMT_PREFIX_RE);
  let stmtNum = null, restWords = null;
  if (m && /^\d/.test(firstWord.replace(/^\(/, ""))) {
    stmtNum = parseInt(m[1] + (m[2] ?? ""), 10);
    const trailing = m[3]; // text glued directly onto the marker token, e.g. "41)Nach" -> "Nach"
    restWords = trailing ? [{ ...l.words[0], text: trailing }, ...l.words.slice(1)] : l.words.slice(1);
  } else {
    // handle "4 4." style split across two word tokens: "4" then "4."
    const m2 = firstWord.match(/^\(?(\d)$/);
    const second = l.words[1]?.text;
    const m3 = second?.match(/^(\d)[).\-–:]?$/);
    if (m2 && m3) {
      stmtNum = parseInt(m2[1] + m3[1], 10);
      restWords = l.words.slice(2);
    }
  }

  const last = cur.statements[cur.statements.length - 1];
  const expected = last ? last.number + 1 : null;
  const isFirst = cur.statements.length === 0 && stmtNum !== null && [1, 41, 46, 56].includes(stmtNum);
  const isExpectedNext = stmtNum !== null && expected !== null && stmtNum === expected;
  if (process.env.DEBUG) console.error("LINE:", JSON.stringify(t), "stmtNum=", stmtNum, "isFirst=", isFirst, "isExpectedNext=", isExpectedNext, "curCode=", cur?.code);

  if (stmtNum !== null && (isFirst || isExpectedNext)) {
    cur.statements.push({ number: stmtNum, y: l.y, page: l.page, words: restWords });
  } else if (!cur.titleWords && cur.statements.length === 0) {
    cur.titleWords = l.words;
  } else {
    cur.orphans.push(l);
  }
}

for (const ex of exercises) {
  for (const l of ex.orphans) {
    // The boilerplate check in the main pass only sees lines up to the last
    // real statement of an exercise — the instruction block for the FOLLOWING
    // exercise (same fixed text, printed again before its own "code:" line)
    // lands here as a trailing orphan on the last statement instead, since
    // there's no next statement number to reject it. Must re-check here too.
    if (isBoilerplateLine(l.words.map((w) => w.text).join(" "))) continue;
    let owner = null, bestGap = Infinity;
    for (const s of ex.statements) {
      // top-down y (poppler bbox): later-in-reading-order = larger (page, y)
      const sKey = s.page * 100000 + s.y, lKey = l.page * 100000 + l.y;
      const gap = lKey - sKey;
      if (gap > 0 && gap < bestGap) { bestGap = gap; owner = s; }
    }
    if (owner) owner.words.push(...l.words);
  }
}

function greenRatio(words) {
  let total = 0, green = 0;
  for (const w of words) { const c = w.counts || {}; const n = (c.green || 0) + (c.black || 0) + (c.red || 0); total += n; green += c.green || 0; }
  return total ? green / total : 0;
}

const out = exercises
  .filter((ex) => ex.statements.length > 0) // some pages carry a personal cross-reference note styled
  // identically to a real exercise header (same yellow "code:" box) that points to a DIFFERENT
  // exercise's code number — it produces a spurious "exercise" with zero statements; a real
  // exercise always has statements, so this filter reliably drops only the ghost entries.
  .map((ex) => ({
    code: ex.code,
    page: ex.page,
    title: ex.titleWords ? ex.titleWords.map((w) => w.text).join(" ").trim().replace(/[\s\-–]+$/, "").trim() : null,
    statements: ex.statements.sort((a, b) => a.number - b.number).map((s) => ({
      number: s.number,
      text: s.words.map((w) => w.text).join(" ").replace(/\s+([.,;:])/g, "$1").trim(),
      green: greenRatio(s.words) > 0.25,
    })),
  }));
console.log(JSON.stringify(out, null, 1));
