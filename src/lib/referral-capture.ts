/** Shared key for relaying a ?ref=CODE captured at /register across the
 * email-confirmation gate to the user's first real authenticated session
 * (see register.tsx and auth.tsx) — this app requires email confirmation
 * before a session exists, so the referral code can't be linked at signup
 * time itself. */
export const PENDING_REFERRAL_STORAGE_KEY = "aura_pending_referral_code";
