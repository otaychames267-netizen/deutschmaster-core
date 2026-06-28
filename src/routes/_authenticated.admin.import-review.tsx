import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, CheckCircle2, XCircle, AlertCircle, ChevronRight, FileText,
  Save, BadgeCheck, RotateCcw, UploadCloud, ChevronLeft,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/import-review")({
  component: ImportReviewPage,
});

const db = supabase as any;

interface Batch { id: string; source_pdf: string; section: string; teil: number | null; status: string; total_exercises: number | null; }
interface Draft {
  id: string; idx: number; title: string | null; raw_title: string | null; article: string | null;
  payload: any; flags: string[]; coherence: number | null; structure_ok: boolean;
  page_images: string[]; status: string; promoted_exercise_id: string | null;
}

function ImportReviewPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [cur, setCur] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgUrls, setImgUrls] = useState<string[]>([]);
  const [editTitle, setEditTitle] = useState("");
  const [editArticle, setEditArticle] = useState("");
  const [saving, setSaving] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // load batches
  useEffect(() => {
    (async () => {
      const { data, error } = await db.from("import_batches").select("*").order("created_at");
      if (error) { setError(error.message); setLoading(false); return; }
      setBatches(data ?? []);
      if (data?.length) setBatchId(data[0].id);
      setLoading(false);
    })();
  }, []);

  const loadDrafts = useCallback(async (bid: string) => {
    setLoading(true);
    const { data, error } = await db.from("import_draft_exercises").select("*").eq("batch_id", bid).order("idx");
    if (error) { setError(error.message); setLoading(false); return; }
    setDrafts(data ?? []); setCur(0); setLoading(false);
  }, []);

  useEffect(() => { if (batchId) loadDrafts(batchId); }, [batchId, loadDrafts]);

  // when current draft changes, load its editable fields + signed image urls
  const draft = drafts[cur];
  useEffect(() => {
    if (!draft) return;
    setEditTitle(draft.title ?? "");
    setEditArticle(draft.article ?? "");
    (async () => {
      const urls: string[] = [];
      for (const path of draft.page_images ?? []) {
        const { data } = await db.storage.from("import-pages").createSignedUrl(path, 3600);
        if (data?.signedUrl) urls.push(data.signedUrl);
      }
      setImgUrls(urls);
    })();
  }, [draft?.id]);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2500); }

  async function save(approve?: boolean) {
    if (!draft) return;
    setSaving(true);
    const patch: any = { title: editTitle, article: editArticle, reviewed_at: new Date().toISOString() };
    if (approve === true) patch.status = "approved";
    if (approve === false) patch.status = "pending";
    const { error } = await db.from("import_draft_exercises").update(patch).eq("id", draft.id);
    setSaving(false);
    if (error) { flash("Error: " + error.message); return; }
    setDrafts((ds) => ds.map((d) => (d.id === draft.id ? { ...d, ...patch } : d)));
    flash(approve === true ? "Approved ✓" : approve === false ? "Un-approved" : "Saved");
    if (approve === true && cur < drafts.length - 1) setCur(cur + 1);
  }

  async function promote() {
    if (!batchId) return;
    const approved = drafts.filter((d) => d.status === "approved" && !d.promoted_exercise_id).length;
    if (!approved) { flash("No newly-approved drafts to promote."); return; }
    if (!confirm(`Promote ${approved} approved exercise(s) to the LIVE tables? Students will see them.`)) return;
    setPromoting(true);
    const { data, error } = await db.rpc("promote_lesen_t2_drafts", { p_batch_id: batchId });
    setPromoting(false);
    if (error) { flash("Promote error: " + error.message); return; }
    flash(`Promoted ${data?.promoted ?? 0} exercise(s) to live.`);
    loadDrafts(batchId);
  }

  if (loading && !drafts.length) return <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="m-6 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-rose-600"><AlertCircle className="h-5 w-5" />{error}</div>;

  const approvedCount = drafts.filter((d) => d.status === "approved").length;
  const promotedCount = drafts.filter((d) => d.promoted_exercise_id).length;

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <Link to="/admin" className="hover:text-foreground">Admin</Link><ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-semibold">Import Review</span>
      </div>
      <h1 className="text-2xl font-black text-foreground mb-1">Import Review</h1>
      <p className="text-sm text-muted-foreground mb-5">Verify each extracted exercise against the original PDF. Nothing reaches students until you approve and promote.</p>

      {/* batch selector */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={batchId ?? ""} onChange={(e) => setBatchId(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          {batches.map((b) => <option key={b.id} value={b.id}>{b.source_pdf} · {b.section} T{b.teil} · {b.status}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">Approved {approvedCount}/{drafts.length} · Promoted {promotedCount}</span>
        <span className="flex-1" />
        <button onClick={promote} disabled={promoting}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          {promoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Promote approved to live
        </button>
      </div>

      {!draft ? <div className="text-sm text-muted-foreground">No drafts in this batch.</div> : (
        <>
          {/* pager */}
          <div className="flex items-center gap-3 mb-3">
            <button className="rounded-lg border border-border p-1.5 hover:bg-muted" onClick={() => setCur(Math.max(0, cur - 1))}><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm">{cur + 1} / {drafts.length} · ex {draft.idx}</span>
            <button className="rounded-lg border border-border p-1.5 hover:bg-muted" onClick={() => setCur(Math.min(drafts.length - 1, cur + 1))}><ChevronRight className="h-4 w-4" /></button>
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${draft.status === "approved" ? "bg-emerald-500/15 text-emerald-600" : draft.promoted_exercise_id ? "bg-blue-500/15 text-blue-600" : "bg-amber-500/15 text-amber-600"}`}>
              {draft.promoted_exercise_id ? "PROMOTED" : draft.status.toUpperCase()}
            </span>
            <span className={`text-xs ${(draft.coherence ?? 0) >= 1 ? "text-emerald-600" : (draft.coherence ?? 0) >= 0.7 ? "text-amber-600" : "text-rose-600"}`}>coherence {(draft.coherence ?? 0).toFixed(2)}</span>
            <span className={`text-xs ${draft.structure_ok ? "text-emerald-600" : "text-rose-600"}`}>structure {draft.structure_ok ? "OK" : "INCOMPLETE"}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* left: page images */}
            <div className="space-y-3">
              {imgUrls.length ? imgUrls.map((u, i) => <img key={i} src={u} alt={`page ${i}`} className="w-full rounded-lg border border-border bg-white" />)
                : <div className="text-xs text-muted-foreground">Loading page images…</div>}
            </div>

            {/* right: editable + read-only structure */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Title (real printed title)</label>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 mb-3 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />

              <label className="text-xs font-semibold text-muted-foreground">Article body — verbatim (fix OCR errors only, never reword)</label>
              <textarea value={editArticle} onChange={(e) => setEditArticle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono leading-relaxed" style={{ minHeight: 360 }} />

              {draft.flags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {draft.flags.map((f, i) => <span key={i} className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-600">{f}</span>)}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button onClick={() => save()} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>
                <button onClick={() => save(true)} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><BadgeCheck className="h-4 w-4" /> Approve</button>
                <button onClick={() => save(false)} disabled={saving} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><RotateCcw className="h-4 w-4" /> Un-approve</button>
              </div>

              {/* read-only structure */}
              <div className="mt-4 rounded-lg border border-border bg-card p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2">Questions / options / answer key (validated — read-only)</div>
                {(draft.payload?.questions ?? []).map((q: any) => {
                  const k = (draft.payload?.answer_key ?? []).find((a: any) => a.number === q.number)?.answer;
                  return (
                    <div key={q.number} className="mb-2 text-sm">
                      <div className="font-medium">{q.number}. {q.text}</div>
                      {["a", "b", "c"].map((o) => (
                        <div key={o} className={k === o ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                          {k === o ? <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" /> : <span className="inline-block w-4" />}{o}) {q["option_" + o]}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {toast && <div className="fixed bottom-6 right-6 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">{toast}</div>}
    </div>
  );
}
