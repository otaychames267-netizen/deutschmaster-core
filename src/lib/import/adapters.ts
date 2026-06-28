/**
 * adapters.ts — pluggable per-section/Teil extraction adapters.
 *
 * Each adapter turns a source PDF into DraftExercise[] for the staging layer.
 * One unified interface serves every section/Teil; Teil 1 and Teil 3 adapters
 * register here in Milestones 6–7 without changing the importer.
 */
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { DraftExercise } from "./staging";
import { checkCoherence } from "./coherence";

export interface AdapterContext { pdfPath: string; pdfName: string; cacheDir: string; cacheName: string; }
export interface SectionAdapter {
  key: string; // `${section}:${teil}`
  produce(ctx: AdapterContext): Promise<DraftExercise[]>;
}

// ── Lesen Teil 2 ────────────────────────────────────────────────────────────
// Reads the per-exercise extraction cache (already produced + OCR-articled) and
// maps it to draft exercises. No Gemini calls.
export const lesenTeil2Adapter: SectionAdapter = {
  key: "lesen:2",
  async produce(ctx) {
    const file = path.join(ctx.cacheDir, `${ctx.cacheName}.exercises.json`);
    let cache: Record<string, any>;
    try { cache = JSON.parse(await readFile(file, "utf8")); }
    catch { throw new Error(`no extraction cache at ${file} — run Teil 2 extraction first`); }

    const drafts: DraftExercise[] = [];
    for (const key of Object.keys(cache).map(Number).sort((a, b) => a - b)) {
      const e = cache[key];
      const questions = e.questions ?? [];
      const answerKey = e.answer_key ?? [];
      // Skip not-yet-extracted / error entries (no title and no questions) — they
      // aren't real exercises yet; they'll be imported once extracted.
      if (!e.title && questions.length === 0) continue;
      const structureOk =
        questions.length === 5 &&
        questions.every((q: any) => q.option_a?.trim() && q.option_b?.trim() && q.option_c?.trim() && q.text?.trim()) &&
        questions.every((q: any) => answerKey.some((a: any) => a.number === q.number && ["a", "b", "c"].includes(String(a.answer).toLowerCase())));
      const coh = checkCoherence(e.article);
      const flags = [
        ...(e._article_issues ?? []).map((i: string) => `article:${i}`),
        ...(structureOk ? [] : ["structure_incomplete"]),
        ...(e.title ? [] : ["no_title"]),
      ];
      drafts.push({
        idx: key,
        title: e.title ?? null,
        rawTitle: e.title ?? null,            // printed title; version numbers applied at promotion
        article: e.article ?? null,
        payload: { questions, answer_key: answerKey },
        flags,
        coherence: coh.score,
        structureOk,
        articleSource: e._article_source ?? "gemini",
        pages: Array.isArray(e._pages) ? e._pages : [],
      });
    }
    return drafts;
  },
};

export const ADAPTERS: Record<string, SectionAdapter> = {
  [lesenTeil2Adapter.key]: lesenTeil2Adapter,
  // 'lesen:1': lesenTeil1Adapter,  (Milestone 6)
  // 'lesen:3': lesenTeil3Adapter,  (Milestone 7)
};
