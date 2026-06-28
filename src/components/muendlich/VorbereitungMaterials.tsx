/**
 * VorbereitungMaterials — lists the uploaded study PDFs for one Teil, grouped by
 * category (Themen / Tipps / Redemittel / repeated questions). Students click a
 * PDF to read it in the viewer. Study-only; no exercises, no AI, no OCR.
 */
import { useEffect, useState } from "react";
import { FileText, Loader2, BookOpen, Lightbulb, MessageSquare, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PdfViewer } from "./PdfViewer";

interface Material { id: string; teil: number; category: string; title: string; storage_path: string; sort_order: number; }

const CATS: Record<string, { label: string; icon: any; color: string }> = {
  themen: { label: "Themen", icon: BookOpen, color: "text-rose-500" },
  repeated_questions: { label: "Häufige Fragen", icon: HelpCircle, color: "text-amber-500" },
  tipps: { label: "Tipps", icon: Lightbulb, color: "text-emerald-500" },
  redemittel: { label: "Redemittel", icon: MessageSquare, color: "text-violet-500" },
};

export function VorbereitungMaterials({ teil, categories }: { teil: number; categories: string[] }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Material | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("muendlich_materials").select("*").eq("teil", teil).order("category").order("sort_order");
      setMaterials(data ?? []);
      setLoading(false);
    })();
  }, [teil]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const items = materials.filter((m) => m.category === cat);
        const meta = CATS[cat] ?? { label: cat, icon: FileText, color: "text-foreground" };
        const Icon = meta.icon;
        return (
          <section key={cat} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Icon className={`h-4.5 w-4.5 ${meta.color}`} />
              <h2 className="font-black text-foreground">{meta.label}</h2>
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No PDFs uploaded yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((m) => (
                  <button key={m.id} onClick={() => setOpen(m)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-all hover:border-rose-500/40 hover:bg-rose-500/5">
                    <FileText className="h-4 w-4 shrink-0 text-rose-500" />
                    <span className="flex-1 truncate text-sm font-medium text-foreground">{m.title}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
      {open && <PdfViewer storagePath={open.storage_path} title={open.title} onClose={() => setOpen(null)} />}
    </div>
  );
}
