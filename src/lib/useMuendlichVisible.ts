import { MUENDLICH_ENABLED } from "@/lib/features";
import { useAuth } from "@/lib/auth";

/**
 * Visibility gate for the student Mündlich (speaking) module. Returns true
 * if either the module is launched (`MUENDLICH_ENABLED === true`, the case
 * since 2026-08-10) or the current viewer is an admin — the admin clause is
 * now just a safety net for whenever `MUENDLICH_ENABLED` is next flipped
 * back to `false` (e.g. an emergency kill switch), so admins keep a
 * dev-preview even while the module is hidden from everyone else again.
 *
 * Use ONLY for student-facing UI visibility — sidebar nav item, header
 * quick links, dashboard cards, landing feature grid, and the layout-route
 * client redirect that gates every /$level/muendlich/** child. Whether a
 * given topic's actual content is unlocked is a separate, per-topic check
 * (`has_plan_access` RLS + the `locked` preview branch in
 * MuendlichTeil2Themen/MuendlichTeil3Themen) — this hook only controls
 * whether the module is reachable at all.
 */
export function useMuendlichVisible(): boolean {
  const { isAdmin } = useAuth();
  return MUENDLICH_ENABLED || isAdmin;
}
