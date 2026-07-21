/**
 * features.ts — launch feature flags.
 *
 * The first public launch of AuraLingovia ships the **Schriftlich** (written)
 * exam module ONLY. The Mündlich (speaking) module is built but not yet
 * finished to the required standard, so at launch it must stay **hidden and
 * inaccessible** everywhere: it must not appear in navigation, on the
 * dashboard, on the landing page, or in the billing plan list, and it must be
 * impossible to purchase or to reach any Mündlich route directly by URL.
 *
 * Everything that hides or blocks Mündlich keys off `MUENDLICH_ENABLED`.
 * Flipping this single constant to `true` (and redeploying) re-enables the
 * whole module — no other change is needed. It is deliberately a hardcoded
 * constant, NOT an admin-toggleable platform_setting: gating an unfinished
 * module is a release decision, not an operational switch, and it must never
 * be flippable by accident from the admin UI.
 *
 * `CARD_PAYMENTS_ENABLED` mirrors reality: the Lemon Squeezy card integration
 * exists in the codebase but no live credentials are configured for launch,
 * so card checkout would only error for real students. Until credentials are
 * set, the D17 manual-transfer flow is the sole payment method surfaced to
 * students. Flip to `true` once Lemon Squeezy is live.
 *
 * This module is intentionally dependency-free (pure constants + a pure
 * helper) so it is safe to import from BOTH client route components and
 * server functions without tripping the *.server.* import-protection plugin.
 */

/** Is the Mündlich (speaking) module ready for students? Launch: false. */
export const MUENDLICH_ENABLED = false;

/**
 * Is the B1 course ready for students? Launch: false. Confirmed via direct
 * DB audit (2026-07-20): B1 has ~25-30% of B2's exercise volume across
 * Lesen/Hören/Sprachbausteine, and Schreiben is non-functional for B1 (every
 * B1 writing exam is the "informell" TELC B1 letter format, but no B1 route
 * serves that category — Beschwerde/Bitte are B2's formal-letter format).
 * Only B2 is sellable/enterable while this is false; flipping it re-enables
 * B1 everywhere in one place, same contract as MUENDLICH_ENABLED.
 */
export const B1_ENABLED = false;

/** Is real card checkout (Lemon Squeezy) live? Launch: false → D17 only. */
export const CARD_PAYMENTS_ENABLED = false;

/**
 * Is the Lemon Squeezy payment option VISIBLE in the UI, independent of
 * whether it's actually live? Launch: true. This exists specifically so the
 * live production site shows a real "Pay with Lemon Squeezy" button (styled
 * identically to the D17 option) for Lemon Squeezy's merchant-verification
 * review team, while `CARD_PAYMENTS_ENABLED` stays false until real
 * credentials (LEMONSQUEEZY_API_KEY / STORE_ID / VARIANT_*) are added.
 * While visible-but-not-enabled, clicking it explains the account is
 * pending merchant approval instead of attempting a real checkout. The
 * moment `CARD_PAYMENTS_ENABLED` flips true (credentials present), the same
 * button starts creating real checkout sessions — no other UI change needed.
 */
export const LEMONSQUEEZY_VISIBLE = true;

export type PlanCode = "schriftlich" | "muendlich" | "komplett";

/**
 * Which subscription plans may be purchased right now. While Mündlich is
 * disabled, ONLY Schriftlich is sellable — both Komplett and Mündlich grant
 * speaking access, so neither may be sold until the Mündlich module is
 * finished. Enforced server-side at order/checkout creation AND used
 * client-side to filter the billing plan list, so the two can never drift.
 */
export function isPlanPurchasable(planCode: string): boolean {
  if (MUENDLICH_ENABLED) return true;
  return planCode === "schriftlich";
}
