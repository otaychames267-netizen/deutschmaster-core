import { Link } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState } from "react";
import { Loader2, Headphones, AlertCircle, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, useLevelSegment, enforceLevel } from "@/lib/useActiveLevel";
import { useHasPlanAccess, useExerciseCatalog } from "@/lib/useContentAccess";
import { LockedExerciseOverview } from "@/components/LockedExerciseOverview";
import { PaywallModal } from "@/components/PaywallModal";
import { NoticeGroupBanner } from "@/components/NoticeGroupBanner";
import { orderWithNoticeGroup } from "@/lib/notice-group";
import { HoerenExerciseCard, type HoerenExerciseData } from "@/components/exercise/hoeren/HoerenExerciseCard";

interface ExRow { id: string; title: string; image_path: string | null; instructions: string | null; audio_path: string | null; position: number; level?: string | null; import_notes?: string | null }
interface StRow { exercise_id: string; statement_number: number; statement_text: string }

// hoeren-images is private and plan-gated at the storage RLS layer — URLs
// must be short-lived signed URLs fetched per-session, never getPublicUrl
// (which would let anyone with a guessed/leaked path download premium
// images with no auth or subscription check at all).
//
// hoeren-audio is deliberately NOT signed here. Signing all of a page's
// audio upfront (with a 1-hour TTL) would sit a real, directly-fetchable
// Supabase Storage URL in React state — and therefore the DOM/network
// history — for every exercise on the page for the whole session, whether
// or not the student ever presses play. ProtectedAudioPlayer signs each
// track individually, on demand, with a 90-second TTL, only when the user
// actually presses play. See ProtectedAudioPlayer.tsx.
async function signedImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("hoeren-images").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

interface Props {
  teil: 1 | 2 | 3;
}

/** Renders a card only once it's near the viewport; keeps a lightweight
 * skeleton mounted otherwise so scrolling through 40+ exercises stays smooth. */
function LazyCard({ children }: { children: () => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible || !ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: "600px 0px" },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [visible]);

  return <div ref={ref}>{visible ? children() : <div className="h-64 rounded-2xl border border-border bg-card animate-pulse" />}</div>;
}

export function HoerenTeilPage({ teil }: Props) {
  const level = useActiveLevel();
  const seg = useLevelSegment();
  const [exercises, setExercises] = useState<ExRow[]>([]);
  const [flaggedStartIndex, setFlaggedStartIndex] = useState<number | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [statementsByEx, setStatementsByEx] = useState<Record<string, StRow[]>>({});
  const [imageByEx, setImageByEx] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hasAccess, loading: accessLoading } = useHasPlanAccess();
  const catalog = useExerciseCatalog("hoeren", level, teil);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"locked" | "sample-complete">("locked");

  useEffect(() => {
    if (!level) return;
    const lvl = level;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data: exList, error: exErr } = await supabase
        .from("hoeren_exercises")
        .select("id, title, image_path, instructions, audio_path, position, level, import_notes")
        .eq("teil", teil)
        .eq("level", lvl)
        .order("position", { ascending: true });
      if (cancelled) return;
      if (exErr) { setError(exErr.message); setLoading(false); return; }
      const enforced = enforceLevel((exList ?? []) as ExRow[], lvl);
      // Hören Teil 1 is the one standing exception to SHOW_UNRELEASED_CONTENT
      // (see notice-group.ts/features.ts) — kept fully visible so students
      // can see the quality of new material coming while everything else
      // stays hidden behind "Coming Soon".
      const { ordered: rows, flaggedStartIndex: fsi, hiddenCount: hc } = orderWithNoticeGroup(enforced, { reveal: teil === 1 });
      setExercises(rows);
      setFlaggedStartIndex(fsi);
      setHiddenCount(hc);

      if (rows.length) {
        const imageEntries = await Promise.all(
          rows.map(async (r) => [r.id, await signedImageUrl(r.image_path)] as const),
        );
        if (!cancelled) setImageByEx(Object.fromEntries(imageEntries));
      }

      if (rows.length) {
        const { data: stList, error: stErr } = await supabase
          .from("hoeren_statements_student")
          .select("exercise_id, statement_number, statement_text")
          .in("exercise_id", rows.map((r) => r.id))
          .order("statement_number", { ascending: true });
        if (cancelled) return;
        if (stErr) { setError(stErr.message); setLoading(false); return; }
        const grouped: Record<string, StRow[]> = {};
        for (const s of (stList ?? []) as StRow[]) (grouped[s.exercise_id] ??= []).push(s);
        setStatementsByEx(grouped);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [teil, level]);

  function scrollToExercise(id: string) {
    document.getElementById(`hoeren-ex-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Non-subscribers: the direct fetch above is RLS-scoped server-side, so
  // `exercises` naturally contains ONLY the flagged free-sample rows for a
  // non-subscriber (real, fully interactive) — never full protected content.
  // Everything else the catalog knows about is rendered as a locked row below.
  if (accessLoading || (hasAccess === false && catalog.loading)) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  const lockedRemainder = hasAccess === false
    ? catalog.items.filter((c) => !exercises.some((e) => e.id === c.id))
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to={`/${seg}/schriftlich` as never} className="hover:text-foreground">Schriftlich</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/${seg}/schriftlich/vorbereitung` as never} className="hover:text-foreground">Vorbereitung</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-semibold">Hören Teil {teil}</span>
      </div>

      <div>
        <h1 className="text-2xl font-black text-foreground">Hören — Teil {teil}</h1>
        <p className="text-sm text-muted-foreground mt-1">Kurze Beiträge hören · Aussagen als Richtig oder Falsch markieren</p>
      </div>

      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
        <div className="flex items-start gap-3">
          <Headphones className="h-4 w-4 shrink-0 text-violet-500 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-violet-700 dark:text-violet-300">Strategie</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Lesen Sie die Aussagen zuerst genau durch, bevor Sie hören.</li>
              <li>Entscheiden Sie für jede Aussage: Richtig oder Falsch.</li>
              <li>Mit „Lösung anzeigen" können Sie die richtigen Antworten überprüfen.</li>
            </ul>
          </div>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" /><p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      )}
      {!loading && !error && exercises.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <Headphones className="h-10 w-10 text-muted-foreground/40" />
          <div><p className="text-sm font-semibold text-foreground">Noch keine Übungen verfügbar</p></div>
        </div>
      )}

      <div className="space-y-5">
        {!loading && !error && exercises.map((ex, i) => {
          const data: HoerenExerciseData = {
            id: ex.id,
            title: ex.title,
            teil,
            position: ex.position,
            instructions: ex.instructions ?? "",
            imageUrl: imageByEx[ex.id] ?? null,
            audioPath: ex.audio_path,
            statements: statementsByEx[ex.id] ?? [],
          };
          const next = exercises[i + 1];
          const displayIndex = flaggedStartIndex !== null && i >= flaggedStartIndex ? i - flaggedStartIndex : i;
          return (
            <Fragment key={ex.id}>
              {flaggedStartIndex !== null && i === flaggedStartIndex && <NoticeGroupBanner />}
              {hasAccess === false && (
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-3 w-3" /> FREE SAMPLE
                  </span>
                </div>
              )}
              <LazyCard>
                {() => (
                  <HoerenExerciseCard
                    exercise={data}
                    index={displayIndex}
                    hasNext={!!next}
                    onNext={next ? () => scrollToExercise(next.id) : undefined}
                    onComplete={hasAccess === false ? () => { setPaywallReason("sample-complete"); setPaywallOpen(true); } : undefined}
                  />
                )}
              </LazyCard>
            </Fragment>
          );
        })}
      </div>

      {hiddenCount > 0 && <NoticeGroupBanner hiddenCount={hiddenCount} />}

      {lockedRemainder.length > 0 && (
        <LockedExerciseOverview heading="" items={lockedRemainder} compact />
      )}

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} reason={paywallReason} />
    </div>
  );
}
