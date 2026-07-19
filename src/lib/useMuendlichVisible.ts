import { MUENDLICH_ENABLED } from "@/lib/features";
import { useAuth } from "@/lib/auth";

/**
 * Developer-preview visibility gate for the student Mündlich (speaking)
 * module. Returns true if either:
 *   - the module is globally launched (`MUENDLICH_ENABLED === true`), OR
 *   - the current viewer is an admin (per-account developer preview).
 *
 * Use ONLY for student-facing UI visibility — sidebar nav item, header
 * quick links, dashboard cards, landing feature grid, and the layout-route
 * client redirect that gates every /$level/muendlich/** child.
 *
 * Deliberately NOT used by `isPlanPurchasable()` in features.ts: Mündlich /
 * Komplett plans stay unbuyable until launch, even for admins. Flipping
 * `MUENDLICH_ENABLED` to `true` remains the single "launch to everyone"
 * switch — nothing about that changes.
 */
export function useMuendlichVisible(): boolean {
  const { isAdmin } = useAuth();
  return MUENDLICH_ENABLED || isAdmin;
}
