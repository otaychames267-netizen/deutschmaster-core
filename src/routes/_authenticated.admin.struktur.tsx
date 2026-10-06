import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2, Lock, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/struktur")({
  component: StrukturCapacityPage,
});

/**
 * Struktur capacity — how many personal Struktur cards each topic still has. Every subscriber is permanently assigned exactly
 * one card from each of two pools (B1: Brief A + Brief B; B2: Produkt + Service); an assigned card is "closed" for everybody else. Read-only: admins read the
 * pools directly through the existing staff SELECT policies, nothing here writes.
 */

type SetKey = "b1a" | "b1b" | "b2p" | "b2d";
// B1 has two pools (A = Einladung/Planung, B = Neuigkeiten/Rat/Bitte); every B1 subscriber is assigned one card from each, like B2's two pools.
const SETS: Record<SetKey, { label: string; level: string; category: string; warnAt: number; pool?: "A" | "B" }> = {
  b1a: { label: "B1 · Brief A · Einladung & Planung", level: "TELC_B1", category: "informell", warnAt: 25, pool: "A" },
  b1b: { label: "B1 · Brief B · Neuigkeiten, Rat & Bitte", level: "TELC_B1", category: "informell", warnAt: 25, pool: "B" },
  b2p: { label: "B2 · Produkt-Beschwerde", level: "TELC_B2", category: "produkt", warnAt: 20 },
  b2d: { label: "B2 · Dienstleistung", level: "TELC_B2", category: "dienstleistung", warnAt: 20 },
};

interface CardRow { id: string; theme_title: string; topic_group: string | null; card_title: string; sort_order: number }
interface ThemeStat { theme: string; cards: (CardRow & { closed: boolean })[]; total: number; closed: number }
interface GroupStat { name: string; themes: ThemeStat[]; total: number; closed: number }

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

function ThemeRow({ stat }: { stat: ThemeStat }) {
  const [open, setOpen] = useState(false);
  const remaining = stat.total - stat.closed;
  const t = tone(remaining, stat.total);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{stat.theme}</p>
          <div className="mt-2"><Bar closed={stat.closed} total={stat.total} /></div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${t.pill}`}>
          {remaining} / {stat.total} <span className="font-medium opacity-80">left</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-3">
          {stat.cards.map((c, i) => (
            <span
              key={c.id}
              title={`${c.card_title} — ${c.closed ? "closed (assigned)" : "open"}`}
              className={`inline-flex h-7 min-w-[2.25rem] items-center justify-center gap-1 rounded-md px-1.5 text-[11px] font-bold tabular-nums ${
                c.closed ? "bg-muted text-muted-foreground line-through decoration-muted-foreground/60" : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {c.closed && <Lock className="h-3 w-3 no-underline" />}
              {i + 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StrukturCapacityPage() {
  const [setKey, setSetKey] = useState<SetKey>("b1a");
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const cfg = SETS[setKey];

  useEffect(() => {
    let cancelled = false;
    setCards(null);
    setError(null);
    (async () => {
      const db = supabase as any;
      let cardsQuery = db.from("schreiben_produkt_cards")
        .select("id, theme_title, topic_group, card_title, sort_order")
        .eq("level", cfg.level).eq("category", cfg.category);
      if (cfg.pool) cardsQuery = cardsQuery.like("topic_group", cfg.pool + "%");
      const cardsRes = await cardsQuery.order("sort_order");
      const assignedRes = cfg.pool
        ? await db.from("user_schreiben_struktur_b1").select("card_id").eq("pool", cfg.pool)
        : await db.from("user_schreiben_struktur").select(setKey === "b2p" ? "produkt_card_id" : "dienstleistung_card_id");
      if (cancelled) return;
      if (cardsRes.error || assignedRes.error) { setError((cardsRes.error ?? assignedRes.error).message); return; }
      const col = cfg.pool ? "card_id" : setKey === "b2p" ? "produkt_card_id" : "dienstleistung_card_id";
      setClosedIds(new Set((assignedRes.data as Record<string, string>[]).map((r) => r[col])));
      setCards(cardsRes.data as CardRow[]);
    })();
    return () => { cancelled = true; };
  }, [setKey, cfg.level, cfg.category, cfg.pool]);

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
      return { name, themes: list, total: list.reduce((s, t) => s + t.total, 0), closed: list.reduce((s, t) => s + t.closed, 0) };
    });
    return { groups, total: (cards ?? []).length, closed: (cards ?? []).filter((c) => closedIds.has(c.id)).length };
  }, [cards, closedIds]);

  const remaining = total - closed;

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <div>
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-black tracking-tight text-foreground">Struktur capacity</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          How many personal Struktur cards each topic still has. A card given to a student is closed for everyone else.
        </p>
        <p dir="rtl" className="mt-0.5 text-sm text-muted-foreground">كم بقى من الـ Struktur في كل موضوع — كلّ بطاقة تتعطى لمشارك تولّي مغلقة.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(SETS) as SetKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setSetKey(k)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${setKey === k ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {SETS[k].label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">{error}</div>}

      {!error && cards === null && <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}

      {!error && cards && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total · المجموع", value: total },
              { label: "Closed · مغلقة", value: closed },
              { label: "Remaining · المتبقّي", value: remaining },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-foreground">{s.value}</p>
              </div>
            ))}
          </div>

          {total === 0 && <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center text-sm text-muted-foreground">No cards in this set yet.</div>}

          {total > 0 && remaining <= cfg.warnAt && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm text-foreground">
                {remaining === 0 ? "This pool is exhausted — new subscribers cannot be assigned a card." : <>Only <strong>{remaining}</strong> of {total} cards are left in this pool.</>} Add more individually written cards before it runs out.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {groups.map((g) => {
              const t = tone(g.total - g.closed, g.total);
              return (
                <section key={g.name} className="space-y-2.5">
                  <div className="flex items-end justify-between gap-3">
                    <h2 className="text-sm font-black text-foreground">{g.name}</h2>
                    <span className={`text-xs font-bold tabular-nums ${t.text}`}>{g.total - g.closed} / {g.total} left</span>
                  </div>
                  <div className="space-y-2">{g.themes.map((th) => <ThemeRow key={th.theme} stat={th} />)}</div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
