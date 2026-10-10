/**
 * StrukturCatalog — the admin's view of EVERY personal Struktur card: how many exist, how many already went to students ("gone" / closed)
 * and how many are still left, per set, per topic, per card. Used on two pages:
 *   - /admin/struktur (all B1 + B2 sets, any card readable), and
 *   - the B1 "Meine Struktur" page when an admin opens it (B1 sets only, `lockClosed`: a card that went to a subscriber shows locked and
 *     cannot be opened, exactly like it is closed for every other student).
 * Every subscriber is permanently assigned exactly one card from each of two pools (B1: Brief A + Brief B; B2: Produkt + Service).
 * Read-only: admins read the pools through the existing staff SELECT policies, nothing here writes. Counts refresh every 30 s.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Lock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ArabicGuideView, LetterView, type ArabicGuide } from "@/components/schreiben/PersonalStrukturCard";

export type SetKey = "b1all" | "b1a" | "b1b" | "b2p" | "b2d";
// B1 has two pools (A = Einladung/Planung, B = Neuigkeiten/Rat/Bitte); every B1 subscriber is assigned one card from each, like B2's two pools.
// "b1all" shows both pools together (all 500 letters).
const SETS: Record<SetKey, { label: string; level: string; category: string; warnAt: number; kind: "b1" | "b2"; pool?: "A" | "B"; b2col?: string }> = {
  b1all: { label: "B1 · Alle Struktur", level: "TELC_B1", category: "informell", warnAt: 0, kind: "b1" },
  b1a: { label: "B1 · Brief A · Einladung & Planung", level: "TELC_B1", category: "informell", warnAt: 25, kind: "b1", pool: "A" },
  b1b: { label: "B1 · Brief B · Neuigkeiten, Rat & Bitte", level: "TELC_B1", category: "informell", warnAt: 25, kind: "b1", pool: "B" },
  b2p: { label: "B2 · Produkt-Beschwerde", level: "TELC_B2", category: "produkt", warnAt: 20, kind: "b2", b2col: "produkt_card_id" },
  b2d: { label: "B2 · Dienstleistung", level: "TELC_B2", category: "dienstleistung", warnAt: 20, kind: "b2", b2col: "dienstleistung_card_id" },
};
const POLL_MS = 30_000;

interface CardRow { id: string; theme_title: string; topic_group: string | null; card_title: string; sort_order: number }
interface ThemeStat { theme: string; cards: (CardRow & { closed: boolean })[]; total: number; closed: number }
interface GroupStat { name: string; themes: ThemeStat[]; flat: (CardRow & { closed: boolean })[]; total: number; closed: number }

function tone(remaining: number, total: number) {
  if (remaining === 0) return { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", pill: "bg-rose-500/12 text-rose-700 dark:text-rose-300" };
  if (remaining / total <= 0.25) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", pill: "bg-amber-500/12 text-amber-700 dark:text-amber-300" };
  return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", pill: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" };
}

function Bar({ closed, total }: { closed: number; total: number }) {
  const t = tone(total - closed, total);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all ${t.bar}`} style={{ width: `${total ? (closed / total) * 100 : 0}%` }} />
    </div>
  );
}

/** Reads ONE card (Struktur with amber blanks / Beispiel filled in). Fetched lazily, only when an admin clicks the card. */
function CardReader({ card, closed }: { card: CardRow; closed: boolean }) {
  const [row, setRow] = useState<{ template_text: string; example_text: string; arabic_guide: ArabicGuide | null } | null>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState<"struktur" | "beispiel" | "arabisch">("struktur");
  useEffect(() => {
    let cancelled = false;
    setRow(null); setFailed(false); setPage("struktur");
    (async () => {
      const { data, error } = await (supabase as any).from("schreiben_produkt_cards").select("template_text, example_text, arabic_guide").eq("id", card.id).maybeSingle();
      if (cancelled) return;
      if (error || !data) setFailed(true); else setRow(data);
    })();
    return () => { cancelled = true; };
  }, [card.id]);
  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-black text-foreground">{card.card_title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${closed ? "bg-muted text-muted-foreground" : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"}`}>
          {closed ? "gone · ذهبت" : "open · متوفّرة"}
        </span>
        <div className="ml-auto flex gap-1">
          {(row?.arabic_guide ? (["struktur", "beispiel", "arabisch"] as const) : (["struktur", "beispiel"] as const)).map((k) => (
            <button
              key={k}
              onClick={() => setPage(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${page === k ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            >
              {k === "struktur" ? "Struktur" : k === "beispiel" ? "Beispiel" : "بالعربية"}
            </button>
          ))}
        </div>
      </div>
      {!row && !failed && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      {failed && <p className="py-6 text-center text-sm text-rose-600 dark:text-rose-400">Could not load this card.</p>}
      {row && page === "arabisch" && row.arabic_guide && <ArabicGuideView example={row.example_text} guide={row.arabic_guide} />}
      {row && page !== "arabisch" && (
        <LetterView
          key={`${card.id}-${page}`}
          text={page === "struktur" ? row.template_text : row.example_text}
          withPills={page === "struktur"}
          intro="Struktur: the fixed German text stays, the amber fields are what the student fills in."
        />
      )}
    </div>
  );
}

/** The numbered chips of a list of cards (green = open, struck-through lock = given to a subscriber) and the reader of the selected one. */
function CardChips({ cards, lockClosed }: { cards: (CardRow & { closed: boolean })[]; lockClosed: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const selected = cards.find((c) => c.id === sel) ?? null;
  return (
    <>
      <p className="mb-2 text-[11px] text-muted-foreground">
        <span className="mr-1 inline-flex items-center rounded bg-emerald-500/12 px-1.5 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">green</span> = still free
        <span className="mx-1 inline-flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 font-bold text-rose-700 ring-1 ring-rose-500/50 dark:text-rose-300"><Lock className="h-3 w-3" />red</span>
        = already given to a subscriber{lockClosed ? ", closed." : "."} Click a {lockClosed ? "green " : ""}number to read that letter.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {cards.map((c, i) => {
          const locked = lockClosed && c.closed;
          return (
            <button
              key={c.id}
              onClick={() => !locked && setSel((v) => (v === c.id ? null : c.id))}
              disabled={locked}
              aria-pressed={sel === c.id}
              title={`${c.card_title} — ${c.closed ? (locked ? "closed: given to a subscriber" : "closed (assigned)") : "open"}`}
              className={`inline-flex h-7 min-w-[2.25rem] items-center justify-center gap-1 rounded-md px-1.5 text-[11px] font-bold tabular-nums transition-colors ${
                sel === c.id ? "ring-2 ring-amber-500 " : ""
              }${c.closed ? `bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/50 line-through decoration-rose-500/60 dark:text-rose-300 ${locked ? "cursor-not-allowed" : ""}` : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"}`}
            >
              {c.closed && <Lock className="h-3 w-3 no-underline" />}
              {i + 1}
            </button>
          );
        })}
      </div>
      {selected && <CardReader card={selected} closed={selected.closed} />}
    </>
  );
}

/** B1: no topic list — a pool is simply its letters numbered 1…N (the 35 exam topics only decide what each letter answers). */
function FlatGroup({ g, lockClosed }: { g: GroupStat; lockClosed: boolean }) {
  const t = tone(g.total - g.closed, g.total);
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-sm font-black text-foreground">{g.name}</h2>
        <span className={`shrink-0 text-xs font-bold tabular-nums ${t.text}`}>{g.total - g.closed} / {g.total} left · {g.closed} gone · ذهبت</span>
      </div>
      <div className="mb-4 mt-2"><Bar closed={g.closed} total={g.total} /></div>
      <CardChips cards={g.flat} lockClosed={lockClosed} />
    </section>
  );
}

export function StrukturCatalog({ sets, lockClosed = false }: { sets: SetKey[]; lockClosed?: boolean }) {
  const [setKey, setSetKey] = useState<SetKey>(sets[0]);
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const cfg = SETS[setKey];

  // switching the set clears the view; the 30 s poll / refresh button reload in place (no spinner flash, open topics stay open)
  useEffect(() => { setCards(null); setError(null); }, [setKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRefreshing(true);
      const db = supabase as any;
      let cardsQuery = db.from("schreiben_produkt_cards")
        .select("id, theme_title, topic_group, card_title, sort_order")
        .eq("level", cfg.level).eq("category", cfg.category);
      if (cfg.pool) cardsQuery = cardsQuery.like("topic_group", cfg.pool + "%");
      const cardsRes = await cardsQuery.order("sort_order").limit(2000);
      let assignedQuery;
      if (cfg.kind === "b1") {
        assignedQuery = db.from("user_schreiben_struktur_b1").select("card_id");
        if (cfg.pool) assignedQuery = assignedQuery.eq("pool", cfg.pool);
      } else {
        assignedQuery = db.from("user_schreiben_struktur").select(cfg.b2col);
      }
      const assignedRes = await assignedQuery.limit(10000);
      if (cancelled) return;
      setRefreshing(false);
      if (cardsRes.error || assignedRes.error) { setError((cardsRes.error ?? assignedRes.error).message); return; }
      const col = cfg.kind === "b1" ? "card_id" : cfg.b2col!;
      setClosedIds(new Set((assignedRes.data as Record<string, string>[]).map((r) => r[col]).filter(Boolean)));
      setCards(cardsRes.data as CardRow[]);
      setUpdatedAt(new Date());
    })();
    return () => { cancelled = true; };
  }, [setKey, cfg.level, cfg.category, cfg.pool, cfg.kind, cfg.b2col, tick]);

  // the app scrolls the document (not an inner pane), so a sticky header cannot pin here; a small floating pill keeps remaining / gone in view instead
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 360);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  const { groups, total, closed } = useMemo(() => {
    const byGroup = new Map<string, Map<string, ThemeStat>>();
    for (const c of cards ?? []) {
      const g = c.topic_group ?? "Themen";
      const themes = byGroup.get(g) ?? new Map<string, ThemeStat>();
      const t = themes.get(c.theme_title) ?? { theme: c.theme_title, cards: [], total: 0, closed: 0 };
      const isClosed = closedIds.has(c.id);
      t.cards.push({ ...c, closed: isClosed });
      t.total++;
      if (isClosed) t.closed++;
      themes.set(c.theme_title, t);
      byGroup.set(g, themes);
    }
    const groups: GroupStat[] = [...byGroup].map(([name, themes]) => {
      const list = [...themes.values()];
      const flat = list.flatMap((t) => t.cards).sort((x, y) => x.sort_order - y.sort_order);
      return { name, themes: list, flat, total: list.reduce((s, t) => s + t.total, 0), closed: list.reduce((s, t) => s + t.closed, 0) };
    });
    // B2: a set is ONE group of 150 numbered letters (the topics are not shown); B1 keeps its two pools A / B
    const shown: GroupStat[] = cfg.kind === "b2" && groups.length
      ? (() => { const flat = groups.flatMap((g) => g.flat).sort((x, y) => x.sort_order - y.sort_order); return [{ name: cfg.label, themes: [], flat, total: flat.length, closed: flat.filter((c) => c.closed).length }]; })()
      : groups;
    return { groups: shown, total: (cards ?? []).length, closed: (cards ?? []).filter((c) => closedIds.has(c.id)).length };
  }, [cards, closedIds, cfg.kind, cfg.label]);

  const remaining = total - closed;
  // B1: every subscriber consumes one card from EACH pool, so the pool with fewer cards left decides how many more subscribers fit.
  const b1Pools = setKey === "b1all" ? groups.filter((g) => /^[AB]\b/.test(g.name)) : [];
  const subscribersLeft = b1Pools.length === 2 ? Math.min(...b1Pools.map((g) => g.total - g.closed)) : null;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {sets.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {sets.map((k) => (
              <button
                key={k}
                onClick={() => setSetKey(k)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${setKey === k ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
              >
                {SETS[k].label}
              </button>
            ))}
          </div>
        )}

        {!error && cards && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total · المجموع", value: total },
                { label: "Closed / gone · مغلقة (ذهبت)", value: closed },
                { label: "Remaining · المتبقّي", value: remaining },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card p-3 sm:p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-foreground">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {b1Pools.map((g) => (
                <span key={g.name} className="font-semibold tabular-nums">
                  {g.name.slice(0, 1) === "A" ? "Brief A" : "Brief B"}: <span className="text-foreground">{g.total - g.closed}</span> / {g.total} left · {g.closed} gone
                </span>
              ))}
              {subscribersLeft !== null && (
                <span className="font-semibold">
                  Room for <span className="tabular-nums text-foreground">{subscribersLeft}</span> more B1 subscribers · باقي مكان لـ {subscribersLeft} مشترك
                </span>
              )}
              <button
                onClick={() => setTick((n) => n + 1)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold hover:bg-muted"
                title="Counts refresh automatically every 30 seconds"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                {updatedAt ? `updated ${updatedAt.toLocaleTimeString()}` : "refresh"}
              </button>
            </div>
          </>
        )}
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">{error}</div>}

      {!error && cards === null && <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}

      {!error && cards && (
        <>
          {total === 0 && <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center text-sm text-muted-foreground">No cards in this set yet.</div>}

          {total > 0 && remaining <= cfg.warnAt && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm text-foreground">
                {remaining === 0 ? "This pool is exhausted — new subscribers cannot be assigned a card." : <>Only <strong>{remaining}</strong> of {total} cards are left in this pool.</>} Add more individually written cards before it runs out.
              </p>
            </div>
          )}

          {setKey === "b1all" && subscribersLeft !== null && subscribersLeft <= 25 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm text-foreground">
                {subscribersLeft === 0 ? "A B1 pool is exhausted — new B1 subscribers cannot be assigned their two letters." : <>Only <strong>{subscribersLeft}</strong> more B1 subscribers fit (every subscriber takes one card from each pool).</>} Add more individually written cards before it runs out.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {groups.map((g) => <FlatGroup key={g.name} g={g} lockClosed={lockClosed} />)}
          </div>
        </>
      )}

      {!error && cards && scrolled && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2 text-xs font-bold tabular-nums shadow-lg backdrop-blur"
        >
          <span className="text-muted-foreground">{cfg.label.split(" · ")[0]}</span>
          <span className="text-emerald-600 dark:text-emerald-400">{remaining} left · باقي</span>
          <span className="text-muted-foreground">{closed} gone · ذهبت</span>
          <span className="text-muted-foreground">of {total}</span>
        </div>
      )}
    </div>
  );
}

/** What an admin sees instead of the single personal letter on a Struktur page: the whole catalog of that set + a switch to the student view. */
export function AdminStrukturOverview({ title, description, descriptionAr, sets, onStudentView }: { title: string; description: string; descriptionAr: string; sets: SetKey[]; onStudentView: () => void }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">{title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        <p dir="rtl" className="mt-0.5 text-sm text-muted-foreground">{descriptionAr}</p>
        <button onClick={onStudentView} className="mt-3 rounded-xl bg-muted px-3.5 py-2 text-xs font-bold text-muted-foreground hover:bg-muted/70">
          Student-Ansicht anzeigen (so sehen es Abonnenten)
        </button>
      </div>
      <StrukturCatalog sets={sets} lockClosed />
    </div>
  );
}
