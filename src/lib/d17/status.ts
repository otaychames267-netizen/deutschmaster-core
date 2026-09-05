/**
 * status.ts — single source of truth for D17 order-status groupings.
 *
 * Found during the fraud-hardening audit: six different files each
 * independently hardcoded their own copy of "which statuses count as X,"
 * all coincidentally consistent today but with no shared definition
 * enforcing that — exactly the kind of duplication that silently drifts.
 * Every one of those call sites should import from here instead.
 *
 * These four groupings mean genuinely different things — do not collapse
 * them into one generic "ACTIVE_STATUSES":
 *   - ORDER_CREATION_BLOCKING: does an existing order stop /billing from
 *     creating (or redirect instead of creating) a brand-new one?
 *   - UPLOAD_ACCEPTING: may the verification pipeline accept a NEW
 *     screenshot submission against this order right now? Deliberately
 *     narrower than ORDER_CREATION_BLOCKING — `manual_review` blocks a new
 *     order (it's still "in flight") but does NOT accept a new upload
 *     in-place (see the strict-locking model below).
 *   - ADMIN_ACTIONABLE: can an admin approve/reject/replay this order from
 *     the Manual Review panel?
 *   - TERMINAL: is this order fully done, no further transition possible
 *     without an explicit admin reset?
 *
 * Locking model (audit-driven change from the original multi-attempt/
 * self-service-retry-during-review design): once an order reaches
 * `manual_review`, no further upload is accepted against THAT order —
 * only an admin decision moves it forward. A rejected order is terminal;
 * a student retries by starting a brand-new order (new session) from
 * /billing, not by re-uploading to the old one.
 */

export const ORDER_CREATION_BLOCKING_STATUSES = ["awaiting_payment", "under_review", "manual_review"] as const;

export const UPLOAD_ACCEPTING_STATUSES = ["awaiting_payment", "under_review"] as const;

export const ADMIN_ACTIONABLE_STATUSES = ["manual_review", "under_review", "rejected", "auto_approved", "admin_approved"] as const;

export const TERMINAL_STATUSES = ["auto_approved", "admin_approved", "rejected", "expired"] as const;

export type D17OrderStatus =
  | "awaiting_payment"
  | "under_review"
  | "auto_approved"
  | "manual_review"
  | "admin_approved"
  | "rejected"
  | "expired";
