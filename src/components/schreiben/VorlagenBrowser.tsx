/**
 * VorlagenBrowser — lists the premium TELC B2 "Schreiben Vorlagen" category
 * PDFs (Beschwerden: Produkt, Dienstleistung, ...) for entitled users, and
 * opens them in the shared PdfViewer. Visual language (forest/gold accent)
 * intentionally echoes the PDF's own cover design for brand consistency.
 */
import { useEffect, useState } from "react";
import { FileText, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PdfViewer } from "@/components/muendlich/PdfViewer";

interface Vorlage {
  id: string;
  category: string;
  title: string;
  description: string;
  situation_count: number;
  template_count: number;
  storage_path: string;
}

export function VorlagenBrowser({ level }: { level: string }) {
  const [items, setItems] = useState<Vorlage[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Vorlage | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("schreiben_vorlagen" as any)
        .select("*")
        .eq("level", level)
        .order("sort_order");
      setItems((data ?? []) as unknown as Vorlage[]);
      setLoading(false);
    })();
  }, [level]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-14 text-center text-sm text-muted-foreground">
          Noch keine Vorlagen-Kategorie veröffentlicht.
        </div>
      ) : (
        items.map((v) => (
          <button
            key={v.id}
            onClick={() => setOpen(v)}
            className="group flex w-full items-start gap-4 rounded-2xl border border-emerald-800/15 bg-gradient-to-br from-emerald-950/[0.03] to-card px-5 py-4 text-left shadow-sm transition-all hover:border-amber-600/40 hover:shadow-md dark:from-emerald-400/[0.04]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-900/10 text-emerald-800 ring-1 ring-emerald-800/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground">{v.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{v.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-amber-600/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  {v.situation_count} Situationen
                </span>
                <span className="rounded-full bg-amber-600/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  {v.template_count} Vorlagen
                </span>
              </div>
            </div>
            <span className="mt-2 flex shrink-0 items-center gap-1 self-center text-xs font-bold text-emerald-800 opacity-0 transition-opacity group-hover:opacity-100 dark:text-emerald-400">
              Öffnen <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
        ))
      )}
      {open && (
        <PdfViewer
          bucket="schreiben-vorlagen"
          storagePath={open.storage_path}
          title={open.title}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
