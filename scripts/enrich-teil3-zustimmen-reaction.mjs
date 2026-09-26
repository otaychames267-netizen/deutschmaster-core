// Adds one natural "Zustimmen" (agreement) reaction line right after each
// Teil 3 topic's existing Vorschläge exchange in beispieldialog — a real,
// safe use of the ZUSTIMMUNG_WIDERSPRUCH Redemittel bank inside the actual
// dialogue, not just the separate reference card. Only the 4 zustimmen
// phrases are used (not widersprechen) because those are complete,
// standalone sentences; the widersprechen/vorschlaege template phrases in
// REDEMITTEL_LIBRARY end in "…" (placeholders for a student to complete
// aloud) and would read as broken/unfinished if inserted verbatim as a
// finished exemplar dialogue line — that needs real per-topic authorship,
// not a mechanical pass, so it's out of scope here.
//
// Idempotent: skips any topic whose beispieldialog already has a line
// tagged _enriched.
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ZUSTIMMEN = ["Das sehe ich genauso.", "Das halte ich ebenfalls für sinnvoll.", "Da stimme ich dir zu.", "Das klingt nach einer guten Lösung."];

async function main() {
  const { data: rows, error } = await db
    .from("muendlich_materials")
    .select("id, title, speaking_toolbox")
    .eq("teil", 3).eq("category", "themen")
    .not("speaking_toolbox", "is", null);
  if (error) throw error;

  let updated = 0, skipped = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tb = r.speaking_toolbox;
    if (!tb?.beispieldialog?.length) { skipped++; continue; }
    if (tb.beispieldialog.some((l) => l._enriched)) { skipped++; continue; }

    const lastVorschlaegeIdx = tb.beispieldialog.map((l) => l.section).lastIndexOf("vorschlaege");
    if (lastVorschlaegeIdx === -1) { skipped++; continue; }

    const lastLine = tb.beispieldialog[lastVorschlaegeIdx];
    const reactionSpeaker = lastLine.speaker === "A" ? "B" : "A";
    const phrase = ZUSTIMMEN[i % ZUSTIMMEN.length];

    const newDialog = [...tb.beispieldialog];
    newDialog.splice(lastVorschlaegeIdx + 1, 0, {
      speaker: reactionSpeaker, text: phrase, section: "vorschlaege", _enriched: true,
    });

    const { error: updErr } = await db
      .from("muendlich_materials")
      .update({ speaking_toolbox: { ...tb, beispieldialog: newDialog } })
      .eq("id", r.id);
    if (updErr) throw updErr;
    updated++;
  }
  console.log(`Updated: ${updated}, skipped (already enriched / no vorschlaege): ${skipped}, total: ${rows.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
