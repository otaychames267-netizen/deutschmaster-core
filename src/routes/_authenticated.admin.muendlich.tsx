import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Trash2, FileText, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/muendlich")({
  component: MuendlichAdminPage,
});

const db = supabase as any;
const CATEGORIES = [
  { v: "themen", label: "Themen" },
  { v: "repeated_questions", label: "Häufige Fragen" },
  { v: "tipps", label: "Tipps" },
  { v: "redemittel", label: "Redemittel" },
];

interface Material { id: string; teil: number; category: string; title: string; storage_path: string; sort_order: number; }

function MuendlichAdminPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [teil, setTeil] = useState(1);
  const [category, setCategory] = useState("themen");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const { data } = await db.from("muendlich_materials").select("*").order("teil").order("category").order("sort_order");
    setMaterials(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function upload() {
    if (!file || !title.trim()) { setMsg({ ok: false, text: "Title and PDF file are required." }); return; }
    setBusy(true); setMsg(null);
    try {
      const path = `teil-${teil}/${category}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await db.storage.from("muendlich-pdfs").upload(path, file, { contentType: "application/pdf", upsert: false });
      if (up.error) throw up.error;
      const max = Math.max(0, ...materials.filter((m) => m.teil === teil && m.category === category).map((m) => m.sort_order));
      const { data: u } = await db.auth.getUser();
      const ins = await db.from("muendlich_materials").insert({ teil, category, title: title.trim(), storage_path: path, sort_order: max + 1, created_by: u?.user?.id });
      if (ins.error) throw ins.error;
      setMsg({ ok: true, text: `Uploaded "${title}" to Teil ${teil} / ${category}.` });
      setTitle(""); setFile(null);
      (document.getElementById("pdf-file") as HTMLInputElement).value = "";
      load();
    } catch (e: any) { setMsg({ ok: false, text: e.message ?? "Upload failed" }); }
    finally { setBusy(false); }
  }

  async function remove(m: Material) {
    if (!confirm(`Delete "${m.title}"?`)) return;
    await db.storage.from("muendlich-pdfs").remove([m.storage_path]);
    await db.from("muendlich_materials").delete().eq("id", m.id);
    load();
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/admin" className="hover:text-foreground">Admin</Link><ChevronRight className="h-3 w-3" />
        <span className="font-semibold text-foreground">Mündlich Materials</span>
      </div>
      <h1 className="text-2xl font-black text-foreground mb-1">Mündlich — Vorbereitung PDFs</h1>
      <p className="text-sm text-muted-foreground mb-5">Upload study PDFs. Students read them in the viewer — no exercises, no AI, no OCR.</p>

      {/* Upload form */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Teil
            <select value={teil} onChange={(e) => setTeil(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value={1}>Teil 1</option><option value={2}>Teil 2</option><option value={3}>Teil 3</option>
            </select>
          </label>
          <label className="text-sm">Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Thema 1 – Umweltschutz" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-sm sm:col-span-2">PDF file
            <input id="pdf-file" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 w-full text-sm" />
          </label>
        </div>
        <button onClick={upload} disabled={busy} className="mt-3 flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload PDF
        </button>
        {msg && <div className={`mt-3 flex items-center gap-2 text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{msg.text}</div>}
      </div>

      {/* Existing materials */}
      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
        [1, 2, 3].map((t) => (
          <div key={t} className="mb-5">
            <h2 className="mb-2 font-bold text-foreground">Teil {t} <span className="text-xs text-muted-foreground">({materials.filter((m) => m.teil === t).length})</span></h2>
            <div className="space-y-1.5">
              {materials.filter((m) => m.teil === t).map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 text-rose-500" />
                  <span className="w-32 shrink-0 text-xs font-semibold text-muted-foreground">{CATEGORIES.find((c) => c.v === m.category)?.label ?? m.category}</span>
                  <span className="flex-1 truncate">{m.title}</span>
                  <button onClick={() => remove(m)} className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {materials.filter((m) => m.teil === t).length === 0 && <p className="text-xs text-muted-foreground">None yet.</p>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
