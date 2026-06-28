/**
 * pending-claude.ts — formalize the "Pending Claude" queue + status report.
 *
 * Marks every staged draft that still needs a vision model (incomplete content,
 * empty extraction, or coherence-flagged article needing verbatim verification)
 * with a PENDING_CLAUDE flag + reason, and produces a status report:
 *   - production-ready now (no API needed)
 *   - pending Claude (queued for tomorrow's credited run)
 * Plus the not-yet-extracted tail groups (need a vision call for questions+key).
 * READ/queue only — no live-table writes.
 */
import "dotenv/config";
import { adminClient } from "../src/lib/import/storage.js";
import { validateExercise, type ExerciseLike } from "../src/lib/import/validate.js";

const pageNum = (p: string) => { const m = p.match(/page-(\d+)\.png$/); return m ? parseInt(m[1]) : 0; };

async function main() {
  const db = adminClient();
  const { data: batch } = await db.from("import_batches").select("*").eq("source_pdf", "lesen teil 2 (1).pdf").maybeSingle();
  const { data: rows } = await db.from("import_draft_exercises").select("*").eq("batch_id", (batch as any).id).order("idx");

  let readyNow = 0, pending = 0;
  const pendingList: string[] = [];
  for (const d of rows ?? []) {
    const e: ExerciseLike = { idx: d.idx, title: d.title, article: d.article, pages: (d.page_images ?? []).map(pageNum).filter(Boolean), questions: d.payload?.questions ?? [], answerKey: d.payload?.answer_key ?? [] };
    const r = validateExercise(e);
    if (!r.needsReprocess) { readyNow++; continue; }
    // classify the reason it needs a vision model
    const q = e.questions.length, art = (e.article ?? "").length;
    let reason = "coherence/verbatim verification";
    if (q === 0) reason = "empty extraction — needs vision re-extract";
    else if (art < 150) reason = "missing article — needs vision re-extract";
    else if (q < 5) reason = "incomplete questions — needs vision re-extract";
    pending++; pendingList.push(`idx ${d.idx} "${(d.title ?? "").slice(0, 40)}" — ${reason}`);
    const flags = [...(d.flags ?? []).filter((f: string) => f !== "PENDING_CLAUDE"), "PENDING_CLAUDE"];
    await db.from("import_draft_exercises").update({ flags }).eq("id", d.id);
  }

  // grouping = 36; how many groups have no draft yet (never extracted)?
  const extractedIdx = new Set((rows ?? []).map((d: any) => d.idx));
  const TOTAL_GROUPS = 36;
  const notExtracted: number[] = [];
  for (let g = 1; g <= TOTAL_GROUPS; g++) if (!extractedIdx.has(g)) notExtracted.push(g);

  console.log("══════════ PDF 1 — STATUS / PENDING-CLAUDE QUEUE ══════════");
  console.log(`Total exercise groups (from corrected page-grouping): ${TOTAL_GROUPS}`);
  console.log(`Drafts in staging                                   : ${rows?.length ?? 0}`);
  console.log(`✅ Production-ready NOW (no API needed)              : ${readyNow}`);
  console.log(`🕓 PENDING_CLAUDE (queued for credited run)         : ${pending}`);
  console.log(`⬜ Not yet extracted (need a vision call)           : ${notExtracted.length} ${notExtracted.length ? "(groups " + notExtracted.join(",") + ")" : ""}`);
  console.log(`\nPending-Claude items:`);
  for (const p of pendingList) console.log(`   • ${p}`);
  console.log(`\nTomorrow (credit added): the pipeline auto-runs Claude on every PENDING_CLAUDE item + the not-yet-extracted groups, validates twice, merges.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
