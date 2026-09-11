/**
 * features.ts — launch feature flags.
 *
 * AuraLingovia's first public launch shipped **Schriftlich** (written) only;
 * Mündlich (speaking) stayed hidden behind `MUENDLICH_ENABLED` until its
 * content and UI reached the required standard. Owner decision (2026-08-10):
 * that bar is now met — Mündlich is launched. It follows the same
 * browsable-but-locked pattern as every other module from here on: visible
 * in navigation to everyone, content gated per-topic by `has_plan_access`
 * (any active subscription now unlocks it — see migration
 * 20260810120000), and purchasable like Schriftlich.
 *
 * `MUENDLICH_ENABLED` is kept as the same hardcoded (not admin-toggleable)
 * kill switch it always was, in case a real problem surfaces post-launch —
 * flipping it back to `false` re-hides the module everywhere again with no
 * other change needed.
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

/** Is the Mündlich (speaking) module launched? Launched 2026-08-10. */
export const MUENDLICH_ENABLED = true;

/**
 * Is the B1 course ready for students? Launch: true (2026-09-04). The two
 * blockers noted in the original 2026-07-20 audit are now both resolved:
 * volume has grown substantially (Lesen 36-59%, Schreiben 58%, SB ~35% of
 * B2's; Hören still thinner at 20-25% but usable), and Schreiben now has a
 * real serving route for B1's "informell" letter format (see
 * .../schreiben/informell.tsx + the register-aware branch added to
 * src/lib/grading/essay-grader.ts's rubric). start_simulation() was also
 * extended to accept a level parameter instead of being hardcoded to B2
 * (supabase/migrations/20260904090000_simulation_b1_support.sql). One plan
 * ("Komplett") covers both levels — entitlement was already level-agnostic,
 * confirmed via has_plan_access(), so no pricing change was needed. Flipping
 * this back to false re-hides B1 everywhere in one place if a real problem
 * surfaces post-launch, same contract as MUENDLICH_ENABLED.
 */
export const B1_ENABLED = true;

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

/**
 * Are exercises flagged "not yet introduced in Tunisian exams" (the
 * NOTICE_TEXT import_notes marker, see src/lib/notice-group.ts) visible to
 * subscribers? Launch: false — hidden everywhere, shown as a "Coming Soon"
 * notice instead of a title list. Hören Teil 1 is the one standing exception
 * (see HoerenTeilPage's `reveal: teil === 1`), so students can see the
 * quality of new material coming while everything else stays hidden. Flip
 * this single constant + redeploy to reveal everything else at once — same
 * contract as MUENDLICH_ENABLED/B1_ENABLED, deliberately not an admin
 * platform_setting for the same reason those aren't.
 */
export const SHOW_UNRELEASED_CONTENT = false;

export type PlanCode = "schriftlich" | "muendlich" | "komplett";

/**
 * Which subscription plans may be purchased right now. Owner decision
 * (2026-08-10): simplify to a single sellable plan — Komplett (30 TND,
 * see `plans.price_tnd` in the DB, the actual amount both checkout paths
 * charge) — so candidates only ever see and buy one package. Schriftlich
 * and Mündlich stay in the codebase (existing subscribers on those plans
 * keep their access) but are no longer purchasable by new customers.
 * Enforced server-side at order/checkout creation (createD17OrderImpl,
 * createCheckoutSessionImpl) AND used client-side to filter the billing
 * plan list, so the two can never drift.
 */
export function isPlanPurchasable(planCode: string): boolean {
  return planCode === "komplett";
}
