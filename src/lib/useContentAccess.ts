import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!user) { setHasAccess(false); return; }
    let cancelled = false;
    // Cast past the generated types (these RPCs aren't in the checked-in
    // types.ts, but exist in the DB and are the authoritative access check).
    (supabase as any)
      .rpc("has_plan_access", { p_user_id: user.id, p_module: module })
      .then(({ data }: { data: unknown }) => { if (!cancelled) setHasAccess(data === true); });
    return () => { cancelled = true; };
  }, [user?.id, module]);

  return { hasAccess, loading: hasAccess === null };
}

export interface CatalogItem { id: string; title: string }

/**
 * Titles-only catalog for the visible-but-locked preview. Calls the
 * SECURITY DEFINER `get_exercise_catalog` RPC, which returns ONLY id + title +
 * order for the given skill/level/teil — never any questions, answers, texts,
 * audio, PDFs or solutions. Safe for non-subscribers to receive.
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
        setItems((data ?? []).map((r: any) => ({ id: r.id, title: r.title })));
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
        setItems((data ?? []).map((r: any) => ({ id: r.id, title: r.title })));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [level, category]);

  return { items, loading };
}
