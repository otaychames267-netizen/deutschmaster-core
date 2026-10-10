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

/** Is real card checkout (Lemon Squeezy) live? false → no card payments anywhere (server refuses too, see checkout.functions.ts). */
export const CARD_PAYMENTS_ENABLED = false;

/**
 * Is the Lemon Squeezy payment option VISIBLE in the UI? Owner decision
 * 2026-10-05: false — hidden everywhere, for admins too; the only payment
 * methods shown are D17 Mobile Transfer, Virement Postal and Virement
 * Bancaire. The Lemon Squeezy code (checkout.functions.ts, the webhook) is
 * kept dormant. To bring it back: enable CARD_PAYMENTS_ENABLED with real
 * credentials AND re-add the option to the billing page / landing / legal text.
 */
export const LEMONSQUEEZY_VISIBLE = false;

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

/**
 * Is the AI Voice Tutor (1:1 speaking-practice, extending the Mündlich exam's
 * Gemini Live pipeline) launched? Ships dark (`false`) until the full
 * build (DB + relay + frontend + deferred correction) is verified end-to-end
 * with a real disposable account. Same hardcoded-kill-switch contract as
 * MUENDLICH_ENABLED/B1_ENABLED. B2-only for now — see the separate
 * `activeLevel === "TELC_B2"` check in the voice-tutor routes, which is
 * independent of this flag and not something flipping this alone changes.
 */
export const VOICE_TUTOR_ENABLED = false;

/**
 * Admin-only preview of the AI Voice Tutor (owner decision 2026-10-10): while
 * `VOICE_TUTOR_ENABLED` is still false for students, admins may open the 1:1
 * tutor to listen to it and test it with a real microphone. Set to false to
 * close it for admins as well. Students never see it until
 * `VOICE_TUTOR_ENABLED` is flipped.
 */
export const VOICE_TUTOR_ADMIN_PREVIEW = true;

/** Can this user open the AI Voice Tutor right now? Public launch flag, or the admin preview. */
export function voiceTutorAvailable(isAdmin: boolean): boolean {
  return VOICE_TUTOR_ENABLED || (VOICE_TUTOR_ADMIN_PREVIEW && isAdmin);
}

/**
 * Invite link for the subscriber-only WhatsApp community group. Shown as a
 * dashboard banner gated by `hasAccess` (an active subscription) — kept here
 * as a single constant so rotating the link (if it expires or the group is
 * recreated) is a one-line change, not a hunt through route files.
 */
export const COMMUNITY_WHATSAPP_URL = "https://chat.whatsapp.com/DHQil2MLKfYHCl2L4wQZIL?mode=gi_t";

export type PlanCode = "schriftlich" | "muendlich" | "komplett";

/**
 * Which subscription plans may be purchased right now. Owner decision
 * (2026-08-10): a single sellable plan, so candidates only ever see and buy
 * one package. Re-decided 2026-10-05: that plan is now Schriftlich (30 TND,
 * see `plans.price_tnd` in the DB, the actual amount both checkout paths
 * charge) = the whole written exam + the Mündlich Vorbereitung cards, no AI
 * exam (enforced in the DB by has_plan_access's module scoping). Komplett and
 * Mündlich stay in the codebase (existing subscribers keep their access) but
 * are not purchasable by new customers.
 * Enforced server-side at order/checkout creation (createD17OrderImpl,
 * createCheckoutSessionImpl) AND used client-side to filter the billing
 * plan list, so the two can never drift.
 */
export function isPlanPurchasable(planCode: string): boolean {
  return planCode === "schriftlich";
}
