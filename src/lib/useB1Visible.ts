import { B1_ENABLED } from "@/lib/features";
import { useAuth } from "@/lib/auth";

/**
 * Developer-preview visibility gate for the B1 course, mirroring
 * useMuendlichVisible exactly. Returns true if either:
 *   - B1 is globally launched (`B1_ENABLED === true`), OR
 *   - the current viewer is an admin (per-account developer preview).
 *
 * Use for the onboarding level picker, the dashboard level-gate cards, and
 * the `/_authenticated/$level` layout's hard URL block — every entry point
 * into `/b1/**`.
 */
export function useB1Visible(): boolean {
  const { isAdmin } = useAuth();
  return B1_ENABLED || isAdmin;
}
