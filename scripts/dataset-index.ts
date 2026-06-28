/**
 * dataset-index.ts — emit a dataset index (JSON + CSV) over all staged drafts.
 *
 * Per article: Unique ID, Title, Exam number, Teil, Page count, Question count,
 * Answer-key status, Validation status, Version number, Final PDF location,
 * plus the content fingerprint. READ-ONLY. Writes to data/.
 */
import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import { adminClient } from "../src/lib/import/storage.js";

const examNumber = (pdf: string) => { const m = pdf.match(/\((\d+)\)/) ?? pdf.match(/(\d+)\s*\.pdf$/i); return m ? parseInt(m[1]) : 1; };

async function main() {
  const db = adminClient();
  const { data: batches } = await db.from("import_batches").select("*");
  const byId = new Map((batches ?? []).map((b: any) => [b.id, b]));
  const { data: drafts } = await db.from("import_draft_exercises").select("*").order("batch_id").order("idx");

  // version numbering per (batch, normalized raw_title) where >1 distinct content
  const norm = (s: string) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  const titleCounts = new Map<string, number>();
  for (const d of drafts ?? []) { const k = `${d.batch_id}|${norm(d.raw_title ?? d.title)}`; titleCounts.set(k, (titleCounts.get(k) ?? 0) + 1); }
  const running = new Map<string, number>();

  const rows = (drafts ?? []).map((d: any) => {
    const b: any = byId.get(d.batch_id);
    const k = `${d.batch_id}|${norm(d.raw_title ?? d.title)}`;
    let version: number | "" = "";
    if ((titleCounts.get(k) ?? 0) > 1) { version = (running.get(k) ?? 0) + 1; running.set(k, version); }
    const qs = d.payload?.questions ?? [];
    const keys = d.payload?.answer_key ?? [];
    const keyOk = qs.length > 0 && keys.length >= qs.length && qs.every((q: any) => keys.some((a: any) => a.number === q.number));
    const pages = (d.page_images ?? []).map((p: string) => (p.match(/page-(\d+)/) ?? [])[1]).filter(Boolean);
    const status = (d.flags ?? []).includes("NEEDS_REPROCESS") ? "NEEDS_REPROCESS" : (d.status === "approved" ? "APPROVED" : d.promoted_exercise_id ? "PROMOTED" : "VALIDATED");
    return {
      id: d.id,
      title: version ? `${d.raw_title ?? d.title} ${version}` : (d.title ?? ""),
      raw_title: d.raw_title ?? d.title ?? "",
      exam_number: b ? examNumber(b.source_pdf) : "",
      section: d.section, teil: d.teil,
      page_count: pages.length,
      question_count: qs.length,
      answer_key_status: keyOk ? "complete" : "incomplete",
      validation_status: status,
      version_number: version,
      pdf_location: b ? `${b.source_pdf} p.${pages[0] ?? "?"}-${pages[pages.length - 1] ?? "?"}` : "",
      fingerprint: d.payload?._fingerprint ?? "",
    };
  });

  await mkdir("data", { recursive: true });
  await writeFile("data/dataset-index.json", JSON.stringify(rows, null, 2));
  const cols = ["id", "title", "exam_number", "section", "teil", "page_count", "question_count", "answer_key_status", "validation_status", "version_number", "pdf_location", "fingerprint"];
  const csv = [cols.join(","), ...rows.map((r: any) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  await writeFile("data/dataset-index.csv", csv);

  console.log(`Wrote data/dataset-index.json and .csv — ${rows.length} articles.`);
  const dupTitles = [...titleCounts.entries()].filter(([, n]) => n > 1).map(([k]) => k.split("|")[1]);
  console.log(`Versioned title groups: ${dupTitles.length} (${[...new Set(dupTitles)].join(", ") || "none"})`);
}
main().catch((e) => { console.error(e); process.exit(1); });
