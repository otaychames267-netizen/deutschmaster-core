/**
 * Permanent regression test harness for the PDF import pipeline.
 *
 * Usage:
 *   npm run test:import
 *
 * Folder layout expected in test-pdfs/:
 *   lesen-t1/  — PDFs containing a Lesen Teil 1 section
 *   lesen-t2/  — PDFs containing a Lesen Teil 2 section
 *   lesen-t3/  — PDFs containing a Lesen Teil 3 section
 *
 * Exit code: 0 = all tests passed, 1 = one or more failures.
 *
 * Architecture contract:
 *   Stage 1: extractNormalizedDocument(file)  → NormalizedDocument
 *   Stage 2: parseLesenT1/T2/T3(doc)          → section-specific result
 *   This harness exercises exactly that pipeline — nothing more.
 */

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, basename, extname, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

// ── Path setup ────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, "..");
const PDF_DIR    = join(ROOT, "test-pdfs");
const REPORT_DIR = join(PDF_DIR, "reports");

// ── Stage 1 + Stage 2 imports ─────────────────────────────────────────────────

import { extractNormalizedDocument } from "../src/lib/import/pdf-extractor.js";
import { parseLesenT1 } from "../src/lib/import/lesen-t1-parser.js";
import { parseLesenT2 } from "../src/lib/import/lesen-t2-parser.js";
import { parseLesenT3 } from "../src/lib/import/lesen-t3-parser.js";

// ── Test result types ─────────────────────────────────────────────────────────

interface Stage1Result {
  pages: number;
  totalLines: number;
  isScanned: boolean;
  duplicateBlocksFound: number;
  columnsDetected: number;
  extractionOk: boolean;
}

interface Stage2ResultT1 {
  headlineCount: number;
  textCount: number;
  answersFound: number;
  confidence: string;
  warnings: string[];
}

interface Stage2ResultT2 {
  passageWords: number;
  questionsBlock1: number;
  questionsWithAnswers: number;
  blockRelation: string;
  confidence: string;
  differingOptions: number;
  warnings: string[];
}

interface Stage2ResultT3 {
  situationCount: number;
  adTextCount: number;
  answersFound: number;
  confidence: string;
  warnings: string[];
}

type Stage2Result = Stage2ResultT1 | Stage2ResultT2 | Stage2ResultT3;

interface TestCase {
  file: string;
  section: "lesen-t1" | "lesen-t2" | "lesen-t3";
  stage1: Stage1Result | null;
  stage2: Stage2Result | null;
  passed: boolean;
  failures: string[];
  errorMessage: string | null;
  durationMs: number;
}

// ── Pass/fail thresholds ──────────────────────────────────────────────────────

const THRESHOLDS = {
  "lesen-t1": {
    minHeadlines: 7,    // expect ~10
    minTexts: 4,        // expect 5
    minAnswers: 4,      // expect 5
  },
  "lesen-t2": {
    minPassageWords: 50,
    minQuestions: 3,
    minAnswers: 1,
  },
  "lesen-t3": {
    minSituations: 7,   // expect 10
    minAdTexts: 8,      // expect 12
    minAnswers: 5,
  },
};

// ── Runner ────────────────────────────────────────────────────────────────────

async function runTest(pdfPath: string, section: TestCase["section"]): Promise<TestCase> {
  const file    = basename(pdfPath);
  const start   = Date.now();
  const result: TestCase = {
    file,
    section,
    stage1: null,
    stage2: null,
    passed: false,
    failures: [],
    errorMessage: null,
    durationMs: 0,
  };

  try {
    // ── Stage 1: PDF extraction ───────────────────────────────────────────────
    const fileBytes = await readFile(pdfPath);
    const blob      = new Blob([fileBytes], { type: "application/pdf" });
    const file_obj  = new File([blob], file, { type: "application/pdf" });

    const doc = await extractNormalizedDocument(file_obj);

    const report = doc.extractionReport;
    const totalPages = report.pages.length;
    const totalLines = doc.lines.length;
    const scanned    = report.pages.every((p) => p.isImageOnly);
    const cols       = doc.columns.count;
    const dups       = doc.duplicateBlocks.length;

    result.stage1 = {
      pages: totalPages,
      totalLines,
      isScanned: scanned,
      duplicateBlocksFound: dups,
      columnsDetected: cols,
      extractionOk: totalLines > 0,
    };

    if (scanned) {
      // Scanned PDFs require OCR which runs in the browser admin import UI.
      // The Node.js test harness cannot perform OCR — report this clearly
      // but do NOT count it as a pipeline failure.
      result.failures.push(
        "SCANNED PDF — requires browser OCR pipeline. " +
        "Import via Admin > Import > Lesen to run OCR automatically."
      );
      result.durationMs = Date.now() - start;
      result.passed = false;  // mark as needing browser action, not a code bug
      return result;
    }

    if (totalLines === 0) {
      result.failures.push("Stage 1 returned 0 lines — extraction failed");
      result.durationMs = Date.now() - start;
      return result;
    }

    // ── Stage 2: section parser ───────────────────────────────────────────────
    if (section === "lesen-t1") {
      const parsed = parseLesenT1(doc);
      const thresh = THRESHOLDS["lesen-t1"];
      const answersWithValue = parsed.texts.filter((t) => t.correct_headline).length;

      result.stage2 = {
        headlineCount: parsed.headlines.length,
        textCount:     parsed.texts.length,
        answersFound:  answersWithValue,
        confidence:    parsed.confidence,
        warnings:      parsed.warnings,
      } satisfies Stage2ResultT1;

      if (parsed.headlines.length < thresh.minHeadlines)
        result.failures.push(`Only ${parsed.headlines.length}/${thresh.minHeadlines} headlines detected`);
      if (parsed.texts.length < thresh.minTexts)
        result.failures.push(`Only ${parsed.texts.length}/${thresh.minTexts} texts detected`);
      if (answersWithValue < thresh.minAnswers)
        result.failures.push(`Only ${answersWithValue}/${thresh.minAnswers} answers detected`);

    } else if (section === "lesen-t2") {
      const parsed = parseLesenT2(doc);
      const thresh = THRESHOLDS["lesen-t2"];
      const passageWords   = parsed.passage.split(/\s+/).filter(Boolean).length;
      const answersCount   = parsed.exercise1.questions.filter((q) => q.correct !== null).length;
      const differingOpts  = (doc.duplicateBlocks[0]?.differingOptionCount ?? 0);

      result.stage2 = {
        passageWords,
        questionsBlock1:    parsed.exercise1.questions.length,
        questionsWithAnswers: answersCount,
        blockRelation:      parsed.blockRelation,
        confidence:         parsed.confidence,
        differingOptions:   differingOpts,
        warnings:           parsed.debug ? [] : [],
      } satisfies Stage2ResultT2;

      if (passageWords < thresh.minPassageWords)
        result.failures.push(`Passage too short: ${passageWords} words (min ${thresh.minPassageWords})`);
      if (parsed.exercise1.questions.length < thresh.minQuestions)
        result.failures.push(`Only ${parsed.exercise1.questions.length}/${thresh.minQuestions} questions detected`);
      if (answersCount < thresh.minAnswers && parsed.blockRelation !== "single")
        result.failures.push(`Only ${answersCount}/${thresh.minAnswers} answers detected`);

    } else if (section === "lesen-t3") {
      // T3 parser returns an ARRAY of exercises (one PDF can contain many)
      const allParsed = parseLesenT3(doc);
      const thresh    = THRESHOLDS["lesen-t3"];

      if (allParsed.length === 0) {
        result.failures.push("No Lesen Teil 3 exercises detected in this PDF");
      } else {
        // Validate that at least the BEST exercise passes thresholds
        const best = allParsed.reduce((a, b) =>
          a.situations.length + a.texts.length >= b.situations.length + b.texts.length ? a : b
        );
        const answersCount = best.situations.filter(s => s.correct_letter || s.no_match).length;

        result.stage2 = {
          situationCount: best.situations.length,
          adTextCount:    best.texts.length,
          answersFound:   answersCount,
          confidence:     best.confidence,
          warnings:       [
            `${allParsed.length} exercise(s) found in PDF`,
            ...best.warnings,
          ],
        } satisfies Stage2ResultT3;

        if (best.situations.length < thresh.minSituations)
          result.failures.push(`Best exercise: only ${best.situations.length}/${thresh.minSituations} situations`);
        if (best.texts.length < thresh.minAdTexts)
          result.failures.push(`Best exercise: only ${best.texts.length}/${thresh.minAdTexts} ad texts`);
        if (answersCount < thresh.minAnswers)
          result.failures.push(`Best exercise: only ${answersCount}/${thresh.minAnswers} answers`);
      }
    }

  } catch (err) {
    result.errorMessage = err instanceof Error ? err.message : String(err);
    result.failures.push(`Exception: ${result.errorMessage}`);
  }

  result.durationMs = Date.now() - start;
  result.passed     = result.failures.length === 0;
  return result;
}

// ── Report generator ──────────────────────────────────────────────────────────

function renderSection2T1(s: Stage2ResultT1): string {
  return [
    `  Headlines:  ${s.headlineCount}`,
    `  Texts:      ${s.textCount}`,
    `  Answers:    ${s.answersFound}`,
    `  Confidence: ${s.confidence}`,
    s.warnings.length ? `  Warnings:\n${s.warnings.map((w) => `    - ${w}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");
}

function renderSection2T2(s: Stage2ResultT2): string {
  return [
    `  Passage words:    ${s.passageWords}`,
    `  Questions (B1):   ${s.questionsBlock1}`,
    `  Answers found:    ${s.questionsWithAnswers}`,
    `  Block relation:   ${s.blockRelation}`,
    `  Differing opts:   ${s.differingOptions}`,
    `  Confidence:       ${s.confidence}`,
  ].join("\n");
}

function renderSection2T3(s: Stage2ResultT3): string {
  return [
    `  Situations:  ${s.situationCount}`,
    `  Ad texts:    ${s.adTextCount}`,
    `  Answers:     ${s.answersFound}`,
    `  Confidence:  ${s.confidence}`,
    s.warnings.length ? `  Warnings:\n${s.warnings.map((w) => `    - ${w}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");
}

function renderStage2(tc: TestCase): string {
  if (!tc.stage2) return "  (not reached)";
  if (tc.section === "lesen-t1") return renderSection2T1(tc.stage2 as Stage2ResultT1);
  if (tc.section === "lesen-t2") return renderSection2T2(tc.stage2 as Stage2ResultT2);
  if (tc.section === "lesen-t3") return renderSection2T3(tc.stage2 as Stage2ResultT3);
  return "";
}

function renderReport(results: TestCase[], timestamp: string): string {
  const passed  = results.filter((r) => r.passed).length;
  const scanned = results.filter((r) => r.failures.some(f => f.startsWith("SCANNED PDF"))).length;
  const failed  = results.length - passed - scanned;
  const total   = results.length;
  const allOk   = failed === 0;

  const lines: string[] = [
    `# PDF Import Regression Report`,
    `Generated: ${timestamp}`,
    `Result: **${allOk ? "ALL TEXT PDFs PASSED" : `${failed} FAILED`}** — ${passed} passed · ${scanned} scanned (needs browser OCR) · ${failed} failed`,
    "",
    "---",
    "",
  ];

  for (const tc of results) {
    const icon = tc.passed ? "✅" : "❌";
    lines.push(`## ${icon} ${tc.file}  \`[${tc.section}]\`  (${tc.durationMs}ms)`);
    lines.push("");

    if (tc.stage1) {
      lines.push("### Stage 1 — Extraction");
      lines.push(`  Pages:       ${tc.stage1.pages}`);
      lines.push(`  Lines:       ${tc.stage1.totalLines}`);
      lines.push(`  Columns:     ${tc.stage1.columnsDetected}`);
      lines.push(`  Dup blocks:  ${tc.stage1.duplicateBlocksFound}`);
      lines.push(`  Scanned:     ${tc.stage1.isScanned}`);
      lines.push("");
    }

    if (tc.stage2) {
      lines.push("### Stage 2 — Parser");
      lines.push(renderStage2(tc));
      lines.push("");
    }

    if (tc.failures.length) {
      lines.push("### Failures");
      for (const f of tc.failures) {
        lines.push(`  - ${f}`);
      }
      lines.push("");
    }

    if (tc.errorMessage) {
      lines.push("### Exception");
      lines.push(`  ${tc.errorMessage}`);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  // Summary table
  lines.push("## Summary");
  lines.push("");
  lines.push("| File | Section | Pages | Lines | Stage2 | Pass? |");
  lines.push("|------|---------|-------|-------|--------|-------|");
  for (const tc of results) {
    const pages = tc.stage1?.pages ?? "—";
    const lns   = tc.stage1?.totalLines ?? "—";
    const s2    = tc.stage2 ? "ok" : "—";
    lines.push(`| ${tc.file} | ${tc.section} | ${pages} | ${lns} | ${s2} | ${tc.passed ? "✅" : "❌"} |`);
  }
  lines.push("");

  return lines.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  AuraLingovia — PDF Import Regression Suite");
  console.log("=".repeat(60));

  const sections: Array<TestCase["section"]> = ["lesen-t1", "lesen-t2", "lesen-t3"];
  const allResults: TestCase[] = [];

  for (const section of sections) {
    const dir = join(PDF_DIR, section);
    if (!existsSync(dir)) {
      console.log(`\nSkipping ${section} — directory does not exist`);
      continue;
    }

    const entries = await readdir(dir);
    const pdfs    = entries.filter((f) => extname(f).toLowerCase() === ".pdf");

    if (pdfs.length === 0) {
      console.log(`\n${section}: no PDFs found — skipping`);
      continue;
    }

    console.log(`\n${section}: ${pdfs.length} file(s)`);

    for (const pdf of pdfs) {
      const path = join(dir, pdf);
      process.stdout.write(`  ▶ ${pdf} ... `);
      const result = await runTest(path, section);
      allResults.push(result);
      const label = result.passed ? "PASS" : "FAIL";
      console.log(`${label}  (${result.durationMs}ms)`);
      if (!result.passed) {
        for (const f of result.failures) console.log(`    ✗ ${f}`);
      }
    }
  }

  if (allResults.length === 0) {
    console.log("\nNo PDFs found in test-pdfs/. Add PDFs per test-pdfs/README.md.");
    process.exit(0);
  }

  // Write report
  await mkdir(REPORT_DIR, { recursive: true });
  const now       = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = join(REPORT_DIR, `${timestamp}.md`);
  const passed   = allResults.filter((r) => r.passed).length;
  const scanned  = allResults.filter((r) => r.failures.some(f => f.startsWith("SCANNED PDF"))).length;
  const failed   = allResults.length - passed - scanned;
  const total    = allResults.length;
  const reportMd = renderReport(allResults, now.toISOString());
  await writeFile(reportPath, reportMd, "utf8");

  console.log("\n" + "=".repeat(60));
  console.log(`  Text PDFs passed:  ${passed}/${total - scanned}`);
  console.log(`  Scanned PDFs:      ${scanned} (use browser admin import for OCR)`);
  if (failed > 0) console.log(`  Parser failures:   ${failed}`);
  console.log(`  Report: ${reportPath}`);
  console.log("=".repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
