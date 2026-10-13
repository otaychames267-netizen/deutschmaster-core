/**
 * The ONE canonical production URL for every auth email link (verification,
 * password reset). Previously every call site used `window.location.origin`
 * dynamically — meaning the link embedded in the email was whatever domain
 * the form happened to be submitted from (a Vercel preview deployment,
 * localhost during testing, an old domain) rather than a fixed, correct
 * destination. Found during the 2026-07-18 final E2E audit: this was the
 * root cause of verification/reset emails linking to the wrong site.
 *
 * Set VITE_SITE_URL to the exact production domain — the ONLY domain this
 * business owns is "https://www.auralingoviatestdeutsch.academy" (no
 * trailing slash; confirmed 2026-07-28 — auralingovia.com and its
 * subdomains are NOT owned and must never appear as a destination anywhere
 * in this app) — in the production environment. Falls back to the current
 * origin only when unset, so local dev/preview testing still works without
 * extra config — but production MUST set this explicitly, or emails will
 * keep linking to whatever origin happens to serve the request (which,
 * with the Vercel default domain also live, means confirmation/reset
 * emails can land on a different domain than the one the user signed up
 * from).
 *
 * This alone does not fully control where the link goes: Supabase silently
 * substitutes its own default Site URL whenever the requested redirectTo
 * isn't in the project's Redirect URLs allow list (Auth settings, dashboard-
 * only — not settable via SQL/this codebase). Both must point at the same
 * canonical domain for links to be correct.
 */
export function getSiteUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  if (configured && configured.trim()) return configured.trim().replace(/\/$/, "");
  return typeof window !== "undefined" ? window.location.origin : "";
}
