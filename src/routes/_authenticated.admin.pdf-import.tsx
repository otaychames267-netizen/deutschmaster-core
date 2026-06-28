import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Upload, Loader2, FileText, Clock, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/pdf-import")({
  component: PdfImportPage,
});

interface PdfImport {
  id: string;
  filename: string | null;
  status: string;
  detected_level: string | null;
  detected_module: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending:      { label: "Pending",      icon: Clock,         color: "text-muted-foreground" },
  processing:   { label: "Processing",   icon: Loader2,       color: "text-blue-500" },
  needs_review: { label: "Needs review", icon: Eye,           color: "text-amber-500" },
  approved:     { label: "Approved",     icon: CheckCircle2,  color: "text-emerald-500" },
  failed:       { label: "Failed",       icon: AlertCircle,   color: "text-destructive" },
};

function PdfImportPage() {
  const { user } = useAuth();
  const [imports, setImports]   = useState<PdfImport[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase
      .from("pdf_imports")
      .select("id, filename, status, detected_level, detected_module, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setImports(data ?? []);
        setLoading(false);
      });
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.name.endsWith(".pdf")) {
      toast.error("Only PDF files are accepted.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error("File size must be under 500 MB.");
      return;
    }

    setUploading(true);
    const storagePath = `pdf-imports/${user.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("pdf-imports")
      .upload(storagePath, file, { contentType: "application/pdf" });

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("pdf_imports").insert({
      filename: file.name,
      storage_path: storagePath,
      file_size: file.size,
      uploaded_by: user.id,
      status: "pending",
    });

    setUploading(false);
    if (dbError) {
      toast.error("Failed to record import.");
      return;
    }

    toast.success("PDF uploaded. Processing will begin shortly.");
    // Refresh list
    supabase
      .from("pdf_imports")
      .select("id, filename, status, detected_level, detected_module, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setImports(data ?? []));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">PDF Import Engine</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Upload official TELC exam PDFs. Each import goes through 5 stages: Upload → Queue → Extract → Review → Publish.
        </p>
      </div>

      {/* Upload zone */}
      <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">Upload a TELC exam PDF</p>
        <p className="mt-1 text-xs text-muted-foreground">PDF files only · Max 500 MB</p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          {uploading ? "Uploading…" : "Choose PDF"}
          <input
            type="file"
            accept=".pdf"
            className="sr-only"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Import list */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Recent imports</h2>
        {loading ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : imports.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
            No imports yet. Upload your first TELC exam PDF above.
          </p>
        ) : (
          <div className="space-y-2">
            {imports.map((item) => {
              const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.detected_level ?? "Level unknown"} · {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <strong>Phase 2:</strong> The automatic TELC structure parser, answer key extractor, and admin review UI are being built next. Uploaded PDFs will be automatically processed once the engine is deployed.
      </div>
    </div>
  );
}
