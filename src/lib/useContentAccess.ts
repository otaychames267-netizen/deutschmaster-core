import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Authoritative subscription check for the current user — calls the SAME
 * `has_plan_access` function the RLS policies use, so the UI's locked/unlocked
 * decision can never disagree with what the database actually enforces. This
 * is a UX signal only: even if it were tampered with client-side, every
 * content table + RPC independently re-checks access server-side, so a forced
 * `hasAccess = true` still yields zero content.
 *
 * Staff/admin bypass: every RLS policy and scoring RPC already ORs in
 * `is_d17_staff(auth.uid())` alongside `has_plan_access(...)` (see
 * 20260716020000_plan_scoped_content_gating.sql) — an admin can always read
 * and score real content regardless of their own subscription state. This
 * hook previously ignored that and asked ONLY `has_plan_access`, so an admin
 * whose personal subscription had lapsed (a real, confirmed case — the owner
 * account's own `komplett` plan expired days ago and nothing had renewed it)
 * was shown the same locked/"FREE SAMPLE"/paywall UI as an ordinary
 * non-subscriber, even though the database already granted them full access
 * underneath. Folding `isAdmin` in here fixes that everywhere this hook is
 * used, in one place, matching what the backend already does.
 */
export function useHasPlanAccess(module: "schriftlich" | "muendlich" = "schriftlich") {
  const { user, isAdmin, roleLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  // Read inside the interval without making it a dependency — putting
  // hasAccess in the effect's deps would tear down and rebuild the interval
  // on every single poll response, collapsing the 20s cadence into a tight
  // back-to-back-request loop instead of an actual interval.
  const hasAccessRef = useRef(hasAccess);
  hasAccessRef.current = hasAccess;

  useEffect(() => {
    if (!user) { setHasAccess(false); return; }
    // Wait for the role check to resolve before deciding — otherwise a real
    // admin would flash "locked" for a moment on every page load.
    if (roleLoading) return;
    if (isAdmin) { setHasAccess(true); return; }
    let cancelled = false;
    function check() {
      // Cast past the generated types (these RPCs aren't in the checked-in
      // types.ts, but exist in the DB and are the authoritative access check).
      (supabase as any)
        .rpc("has_plan_access", { p_user_id: user!.id, p_module: module })
        .then(({ data }: { data: unknown }) => { if (!cancelled) setHasAccess(data === true); })
        // A rejected RPC (network timeout, transient 5xx) used to leave
        // hasAccess stuck at null forever — every page gating on `loading`
        // (accessLoading === hasAccess === null) hung on its spinner
        // indefinitely, and the rejection went unhandled. Fail closed
        // (false) instead: the poll below retries in 20s, and the real
        // security boundary is server-side RLS regardless.
        .catch(() => { if (!cancelled) setHasAccess(false); });
    }
    check();
    // Poll while still locked so a payment approved elsewhere (auto-approve
    // finishing, or an admin approving a manual-review order) unlocks content
    // on whatever page the student is already sitting on — without this, a
    // student mid-checkout would stay stuck on a locked screen until they
    // manually reloaded. Stops polling once access is granted (no need to
    // keep checking a long-term subscriber every 20s on every page).
    const interval = setInterval(() => { if (hasAccessRef.current !== true) check(); }, 20000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user?.id, module, isAdmin, roleLoading]);

  return { hasAccess, loading: hasAccess === null || (!!user && roleLoading) };
}

export interface CatalogItem { id: string; title: string; import_notes?: string | null; is_free_sample?: boolean; has_audio?: boolean | null; reference_code?: string | null }

/**
 * Titles-only catalog for the visible-but-locked preview. Calls the
 * SECURITY DEFINER `get_exercise_catalog` RPC, which returns ONLY id + title +
 * order + import_notes for the given skill/level/teil — never any questions,
 * answers, texts, audio, PDFs or solutions. Safe for non-subscribers to
 * receive. import_notes is included so LockedExerciseOverview can render the
 * same Tunisia-notice grouping subscribers see.
 */
export function useExerciseCatalog(skill: "lesen" | "hoeren" | "sprachbausteine", level: string | null, teil: number) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!level) return;
    let cancelled = false;
    setLoading(true);
    (supabase as any)
      .rpc("get_exercise_catalog", { p_skill: skill, p_level: level, p_teil: teil })
      .then(({ data }: { data: any }) => {
        if (cancelled) return;
        setItems((data ?? []).map((r: any) => ({ id: r.id, title: r.title, import_notes: r.import_notes ?? null, is_free_sample: r.is_free_sample === true, has_audio: r.has_audio ?? null, reference_code: r.reference_code ?? null })));
        setLoading(false);
      })
      // A rejected RPC used to leave `loading` stuck true forever (see
      // useHasPlanAccess above for the full explanation) — fail to an empty
      // catalog instead so the page can still render.
      .catch(() => { if (!cancelled) { setItems([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [skill, level, teil]);

  return { items, loading };
}

export interface MuendlichCatalogItem {
  id: string; title: string; theme_category: string | null; difficulty_level: string | null;
  is_unassigned_center: boolean; body_text: string | null;
}

/**
 * Browsable Hero Card grid for Mündlich: calls the SECURITY DEFINER
 * `get_muendlich_catalog` RPC, which returns id/title/theme_category/
 * difficulty_level/is_unassigned_center plus the plain body_text (the raw
 * scenario prompt, shown as the card's snippet) — never speaking_toolbox or
 * storage_path. The grid is safe for everyone — subscriber, non-subscriber,
 * or anon visitor — to see; the real content (dialogue, Redemittel,
 * Wortschatz, Arabic) is fetched separately per-topic on click, gated by
 * the has_plan_access RLS on muendlich_materials itself (a non-entitled
 * click's row fetch returns nothing, and the caller shows the paywall
 * instead of a real modal).
 */
export function useMuendlichCatalog(teil: number, level: string | null) {
  const [items, setItems] = useState<MuendlichCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!level) return;
    let cancelled = false;
    setLoading(true);
    (supabase as any)
      .rpc("get_muendlich_catalog", { p_teil: teil, p_level: level })
      .then(({ data }: { data: any }) => {
        if (cancelled) return;
        setItems((data ?? []) as MuendlichCatalogItem[]);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setItems([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [teil, level]);

  return { items, loading };
}

/**
 * Titles-only catalog for Schreiben (Beschwerde / Bitte), which has no
 * numeric teil — exams.metadata->>'category' is the real sub-type
 * discriminator. Same safety contract as useExerciseCatalog/get_exercise_catalog:
 * calls the SECURITY DEFINER get_schreiben_catalog RPC, which returns only
 * id + title, never task text.
 */
export function useSchreibenCatalog(level: string | null, category: string) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!level) return;
    let cancelled = false;
    setLoading(true);
    (supabase as any)
      .rpc("get_schreiben_catalog", { p_level: level, p_category: category })
      .then(({ data }: { data: any }) => {
        if (cancelled) return;
        setItems((data ?? []).map((r: any) => ({ id: r.id, title: r.title, is_free_sample: r.is_free_sample === true })));
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setItems([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [level, category]);

  return { items, loading };
}
