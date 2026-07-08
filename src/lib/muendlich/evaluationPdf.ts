/**
 * evaluationPdf.ts — generates the "Official telc-Simulation Report" PDF from
 * a completed muendlich_evaluations row. Isomorphic (pdf-lib has no DOM
 * dependency) — runs identically in a Node test script and in the browser for
 * the one-click download button, so it's testable without a live exam flow.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { MuendlichEvaluationResult } from "@/lib/grading/muendlich-evaluator";

export interface EvaluationPdfMeta {
  candidateName: string;
  roomCode: string;
  examDate: Date;
}

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

const NAVY = rgb(0.11, 0.16, 0.32);
const EMERALD = rgb(0.02, 0.59, 0.41);
const ROSE = rgb(0.88, 0.21, 0.28);
const AMBER = rgb(0.83, 0.55, 0.07);
const GRAY = rgb(0.4, 0.4, 0.44);
const LIGHT_BG = rgb(0.96, 0.96, 0.98);

class Writer {
  doc!: PDFDocument;
  page!: PDFPage;
  y = 0;
  regular!: PDFFont;
  bold!: PDFFont;
  pageNum = 0;

  async init() {
    this.doc = await PDFDocument.create();
    this.regular = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pageNum++;
    this.y = PAGE_H - MARGIN;
    this.page.drawText(`telc B2 · Mündliche Prüfung · Simulationsbericht`, {
      x: MARGIN, y: PAGE_H - 25, size: 8, font: this.regular, color: GRAY,
    });
  }

  ensureSpace(needed: number) {
    if (this.y - needed < MARGIN + 20) this.newPage();
  }

  wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const trial = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = trial;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  heading(text: string, size = 14, color = NAVY, gapBefore = 18) {
    this.ensureSpace(size + 10);
    this.y -= gapBefore;
    this.page.drawText(text, { x: MARGIN, y: this.y, size, font: this.bold, color });
    // Full line height, not half — half-size left the heading's own line
    // overlapping the first line of whatever follows it (caught visually by
    // actually rendering the PDF, not just checking it parsed).
    this.y -= size * 1.4;
  }

  paragraph(text: string, size = 10, color = rgb(0.15, 0.15, 0.18), indent = 0) {
    const lines = this.wrapText(text, this.regular, size, CONTENT_W - indent);
    for (const line of lines) {
      this.ensureSpace(size + 4);
      this.page.drawText(line, { x: MARGIN + indent, y: this.y, size, font: this.regular, color });
      this.y -= size + 4;
    }
  }

  labeledParagraph(label: string, text: string, size = 9.5) {
    this.ensureSpace(size + 6);
    this.page.drawText(`${label}:`, { x: MARGIN, y: this.y, size, font: this.bold, color: NAVY });
    this.y -= size + 3;
    this.paragraph(text, size, undefined, 8);
  }

  divider() {
    this.ensureSpace(10);
    this.y -= 4;
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_W - MARGIN, y: this.y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.88) });
    this.y -= 10;
  }

  box(height: number, color = LIGHT_BG) {
    this.ensureSpace(height);
    this.page.drawRectangle({ x: MARGIN, y: this.y - height, width: CONTENT_W, height, color, opacity: 1 });
  }
}

function scoreColor(score: number, max: number) {
  const pct = score / max;
  return pct >= 0.7 ? EMERALD : pct >= 0.4 ? AMBER : ROSE;
}

/** Pale tint of a color toward white — `amount` is how much of the base color
 * shows through (0 = white, 1 = full color). Complementary weights by
 * construction, so the result can never exceed pdf-lib's [0,1] channel range
 * (unlike an earlier version of this file, which mismatched the two weights
 * and produced an out-of-range green channel — caught by actually running it). */
function tint(color: ReturnType<typeof rgb>, amount: number) {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return rgb(clamp(color.red * amount + (1 - amount)), clamp(color.green * amount + (1 - amount)), clamp(color.blue * amount + (1 - amount)));
}

export async function generateEvaluationPdfBytes(
  evaluation: MuendlichEvaluationResult,
  meta: EvaluationPdfMeta,
): Promise<Uint8Array> {
  const w = new Writer();
  await w.init();

  // ── Header ──
  w.y -= 10;
  w.page.drawText("Offizieller telc-Simulationsbericht", { x: MARGIN, y: w.y, size: 22, font: w.bold, color: NAVY });
  w.y -= 26;
  w.page.drawText(`Kandidat: ${meta.candidateName}   ·   Raum: ${meta.roomCode}   ·   Datum: ${meta.examDate.toLocaleDateString("de-DE")}`, {
    x: MARGIN, y: w.y, size: 10, font: w.regular, color: GRAY,
  });
  w.y -= 30;

  // ── Score summary banner ──
  const passColor = evaluation.passed ? EMERALD : ROSE;
  w.box(60, tint(passColor, 0.12));
  w.page.drawText(`${evaluation.overall_score} / 75 Punkte`, { x: MARGIN + 15, y: w.y - 38, size: 24, font: w.bold, color: passColor });
  w.page.drawText(evaluation.passed ? "BESTANDEN" : "NICHT BESTANDEN", { x: MARGIN + 15, y: w.y - 54, size: 11, font: w.bold, color: passColor });
  w.page.drawText(`CEFR-Niveau: ${evaluation.cefr_level}`, { x: PAGE_W - MARGIN - 140, y: w.y - 38, size: 14, font: w.bold, color: NAVY });
  w.y -= 75;

  // ── Per-Teil score row ──
  const teilLabels: Record<number, string> = { 1: "Teil 1 — Präsentation", 2: "Teil 2 — Gespräch", 3: "Teil 3 — Planung" };
  const colW = CONTENT_W / 3;
  for (const t of evaluation.feedback.teil_breakdown) {
    const x = MARGIN + (t.teil - 1) * colW;
    w.page.drawText(teilLabels[t.teil], { x, y: w.y, size: 9, font: w.bold, color: NAVY });
    w.page.drawText(`${t.score} / 25`, { x, y: w.y - 14, size: 13, font: w.bold, color: scoreColor(t.score, 25) });
  }
  w.y -= 35;
  w.divider();

  // ── Per-Teil detailed breakdown ──
  w.heading("Detaillierte Bewertung nach Prüfungsteilen");
  for (const t of evaluation.feedback.teil_breakdown) {
    w.heading(`${teilLabels[t.teil]} (${t.score}/25)`, 11, NAVY, 14);
    w.labeledParagraph("Aussprache", t.pronunciation);
    w.labeledParagraph("Wortschatz", t.vocabulary);
    w.labeledParagraph("Grammatik", t.grammar);
    w.labeledParagraph("Flüssigkeit", t.fluency);
  }
  w.divider();

  // ── Error correction matrix ──
  if (evaluation.feedback.error_correction_matrix.length > 0) {
    w.heading("Fehlerkorrektur-Matrix");
    for (const e of evaluation.feedback.error_correction_matrix) {
      w.ensureSpace(50);
      w.paragraph(`Fehler: „${e.original}"`, 9.5, ROSE);
      w.paragraph(`Korrektur: „${e.correction}"`, 9.5, EMERALD);
      if (e.explanation) w.paragraph(e.explanation, 8.5, GRAY, 8);
      w.y -= 6;
    }
    w.divider();
  }

  // ── Vocabulary enrichment ──
  if (evaluation.feedback.vocabulary_enrichment.length > 0) {
    w.heading("Wortschatz-Erweiterung (Redemittel)");
    for (const v of evaluation.feedback.vocabulary_enrichment) {
      w.ensureSpace(40);
      w.paragraph(`${v.weak_term}  ->  ${v.suggestions.join(", ")}`, 9.5, NAVY);
      if (v.context) w.paragraph(`Kontext: „${v.context}"`, 8.5, GRAY, 8);
      w.y -= 4;
    }
    w.divider();
  }

  // ── Pacing tips + summary ──
  w.heading("Tempo & Struktur");
  w.paragraph(evaluation.feedback.pacing_tips);
  w.y -= 6;
  w.heading("Gesamtfeedback", 12);
  w.paragraph(evaluation.feedback.summary);

  // ── Closing statement (styled distinctly) ──
  w.y -= 10;
  const closingLines = w.wrapText(evaluation.feedback.closing_statement, w.regular, 10, CONTENT_W - 30);
  w.ensureSpace(closingLines.length * 14 + 30);
  w.box(closingLines.length * 14 + 24, rgb(0.93, 0.96, 1));
  const boxTop = w.y;
  w.y -= 14;
  for (const line of closingLines) {
    w.page.drawText(line, { x: MARGIN + 15, y: w.y, size: 10, font: w.regular, color: NAVY });
    w.y -= 14;
  }
  w.y = boxTop - (closingLines.length * 14 + 24);

  // ── Footer disclaimer on every page ──
  const pages = w.doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Generiert durch KI-gestützte Bewertung · Seite ${i + 1} von ${pages.length}`, {
      x: MARGIN, y: 25, size: 7.5, font: w.regular, color: GRAY,
    });
  });

  return w.doc.save();
}
