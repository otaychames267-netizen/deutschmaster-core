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
 */
export function useHasPlanAccess(module: "schriftlich" | "muendlich" = "schriftlich") {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  // Read inside the interval without making it a dependency — putting
  // hasAccess in the effect's deps would tear down and rebuild the interval
  // on every single poll response, collapsing the 20s cadence into a tight
  // back-to-back-request loop instead of an actual interval.
  const hasAccessRef = useRef(hasAccess);
  hasAccessRef.current = hasAccess;

  useEffect(() => {
    if (!user) { setHasAccess(false); return; }
    let cancelled = false;
    function check() {
      // Cast past the generated types (these RPCs aren't in the checked-in
      // types.ts, but exist in the DB and are the authoritative access check).
      (supabase as any)
        .rpc("has_plan_access", { p_user_id: user!.id, p_module: module })
        .then(({ data }: { data: unknown }) => { if (!cancelled) setHasAccess(data === true); });
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
  }, [user?.id, module]);

  return { hasAccess, loading: hasAccess === null };
}

export interface CatalogItem { id: string; title: string; import_notes?: string | null; is_free_sample?: boolean; has_audio?: boolean | null }

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
        setItems((data ?? []).map((r: any) => ({ id: r.id, title: r.title, import_notes: r.import_notes ?? null, is_free_sample: r.is_free_sample === true, has_audio: r.has_audio ?? null })));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [skill, level, teil]);

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
      });
    return () => { cancelled = true; };
  }, [level, category]);

  return { items, loading };
}
