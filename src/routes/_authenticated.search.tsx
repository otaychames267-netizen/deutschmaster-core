import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Search, BookOpen, FileText, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/search")({
  component: SearchPage,
});

interface ExamResult {
  id: string;
  title: string;
  section: string;
  teil: number | null;
  level: string | null;
  exam_type: string | null;
}

interface NoteResult {
  id: string;
  title: string;
  content: string;
}

const SECTION_LABELS: Record<string, string> = {
  lesen:           "Lesen",
  hoeren:          "Hören",
  schreiben:       "Schreiben",
  sprachbausteine: "Sprachbausteine",
};

const SECTION_ROUTES: Record<string, string> = {
  lesen:           "/schriftlich/vorbereitung/lesen",
  hoeren:          "/schriftlich/vorbereitung/hoeren",
  schreiben:       "/schriftlich/vorbereitung/schreiben",
  sprachbausteine: "/schriftlich/vorbereitung/sprachbausteine",
};

function SearchPage() {
  const { user } = useAuth();
  const [query, setQuery]     = useState("");
  const [exams, setExams]     = useState<ExamResult[]>([]);
  const [notes, setNotes]     = useState<NoteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (!q || q.length < 2) {
      setExams([]); setNotes([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      const [examRes, noteRes] = await Promise.all([
        supabase
          .from("exams")
          .select("id, title, section, teil, level, exam_type")
          .ilike("title", `%${q}%`)
          .limit(10),
        user
          ? supabase
              .from("study_notes")
              .select("id, title, content")
              .eq("user_id", user.id)
              .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
              .limit(6)
          : Promise.resolve({ data: [] }),
      ]);
      setExams((examRes.data as ExamResult[]) ?? []);
      setNotes((noteRes.data as NoteResult[]) ?? []);
      setLoading(false);
    }, 300);
  }, [query, user?.id]);

  const totalResults = exams.length + notes.length;
  const hasQuery = query.trim().length >= 2;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Search</h1>
        <p className="text-sm text-muted-foreground">Find exercises, exams, and your notes.</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises, sections, notes…"
          className="w-full rounded-2xl border border-input bg-card py-3.5 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {!loading && query && (
          <button onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {/* Empty state */}
      {!hasQuery && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">What are you looking for?</p>
          <p className="text-xs text-muted-foreground">Type at least 2 characters to search.</p>
        </div>
      )}

      {/* No results */}
      {hasQuery && !loading && totalResults === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">No results for "{query}"</p>
          <p className="text-xs text-muted-foreground">Try a different search term.</p>
        </div>
      )}

      {/* Exercises / exams */}
      {exams.length > 0 && (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Exercises & Exams</p>
            <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{exams.length}</span>
          </div>
          <div className="divide-y divide-border">
            {exams.map((ex) => {
              const sectionLabel = SECTION_LABELS[ex.section] ?? ex.section;
              const baseRoute = SECTION_ROUTES[ex.section] ?? "/dashboard";
              const href = ex.teil ? `${baseRoute}/teil-${ex.teil}` : baseRoute;
              return (
                <Link
                  key={ex.id}
                  to={href as any}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ex.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {sectionLabel}
                      {ex.teil ? ` · Teil ${ex.teil}` : ""}
                      {ex.level ? ` · ${ex.level}` : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {notes.length > 0 && (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Your Notes</p>
            <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{notes.length}</span>
          </div>
          <div className="divide-y divide-border">
            {notes.map((note) => (
              <Link
                key={note.id}
                to="/notes"
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{note.title || "Untitled"}</p>
                  {note.content && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{note.content}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasQuery && totalResults > 0 && (
        <p className="text-center text-xs text-muted-foreground">{totalResults} result{totalResults !== 1 ? "s" : ""} for "{query}"</p>
      )}
    </div>
  );
}
