# DeutschMaster — Phase 1 Build Plan

This is a large scope. I'll build it in ordered milestones inside a single phase, each verified before the next. No exam/training content, no AI.

## Stack & infrastructure
- TanStack Start (already scaffolded) + Tailwind v4 + shadcn
- **Lovable Cloud** (Supabase) for DB, auth, storage
- **Lovable Built-in Payments (Stripe)** for subscriptions — supports EUR/USD natively with auto currency conversion. TND is not supported by Stripe as a settlement currency; I'll display TND prices via FX conversion but charge in EUR/USD. (Flagging this — see "Decisions needed" below.)
- **Lovable Emails** for transactional email
- i18n via `i18next` + `react-i18next` (ar, de, en, fr, es, it, tr) with RTL for Arabic
- next-themes-style light/dark via CSS tokens
- PWA: manifest + icons only (no service worker — preview-safe per platform rules)

## Milestones

### M1 — Design system & landing
- Premium educational theme, oklch tokens, dark/light
- Routes: `/` landing (Hero, Features, Pricing, Testimonials, Success Stories, FAQ, Contact)
- Legal: `/privacy`, `/terms`, `/refund`, `/cookies`
- Header with language selector + theme toggle, footer
- SEO meta per route, sitemap.xml, robots.txt

### M2 — i18n
- 7 languages with namespaced JSON dictionaries
- Language selector persists to profile + localStorage
- RTL handling for Arabic

### M3 — Auth (Lovable Cloud)
- Email/password + Google
- Email verification, forgot/reset password, change password
- Remember me, session management
- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `_authenticated` layout guard

### M4 — Database schema (migrations)
Tables with RLS + grants:
- `profiles` (name, avatar, country, language, level, exam_date, target_level, study_goal)
- `user_roles` + `app_role` enum (`admin`,`student`) + `has_role()` SECURITY DEFINER
- `subscriptions` (plan, status, period, trial flag)
- `plans` (admin-editable pricing)
- `payments` / `invoices`
- `notifications`
- `login_history`, `devices`
- `trial_claims` (anti-abuse: one trial per user + device/email fingerprint)
- Placeholder tables (empty, RLS-locked) for future phases: `reading_models`, `listening_models`, `writing_topics`, `speaking_topics`, `pdf_files`, `certificates`, `referrals`, `support_tickets`, `ratings`, `challenges`, `badges`

### M5 — Subscriptions & payments (Stripe seamless)
- Plans seeded: Schriftlich, Mündlich, Premium Complete
- 3-day free trial, one-time per user (enforced via `trial_claims` + email/device check)
- Checkout flow, webhook (`/api/public/stripe-webhook`) updates `subscriptions`
- Auto-block on expiry (server-side guard helper)
- Currency display in TND/EUR/USD via FX rates; charge in Stripe-supported currency
- Pages: `/billing`, `/billing/history`, `/billing/invoices`

### M6 — User dashboard
- `/dashboard`: subscription status, remaining days, level, trial status, notifications, exam countdown, referral placeholder card
- `/profile`: edit all profile fields, change password, 2FA toggle (TOTP)
- `/security`: login history, devices, security alerts

### M7 — Notifications & email
- In-app notifications table + bell UI
- Auto emails: welcome, verify, reset, subscription confirmation (Lovable Emails templates)

### M8 — Admin dashboard (`/admin`, role-gated)
- Overview: totals, revenue, active subs, recent payments, system/backup status
- Users: list, search, suspend, delete, change plan
- Subscriptions: list, activate, cancel, extend
- Plans/pricing editor
- Analytics: revenue, growth, active users, subscription stats (Recharts)

### M9 — Security & abuse
- Session management, 2FA (TOTP), login alerts via email
- Trial-abuse guard (email + device fingerprint dedupe). **No backend rate limiting** per platform policy.

### M10 — PWA + backup notice
- `manifest.json` + icons, `display: standalone`, no service worker
- Backup: Lovable Cloud has automated Supabase backups — surface status in admin (informational)

## Technical notes
- Stripe is the only seamless provider compatible with subscriptions on Lovable. Local TND processors are not integrated; will surface TND as display currency only.
- 2FA via TOTP using `otplib` + QR via `qrcode`.
- No service worker (Lovable preview constraint); PWA = installable manifest only.
- Rate limiting omitted per platform policy.

## Decisions needed before I start
1. **Payment currency**: OK to charge in EUR (with TND/USD shown as converted display prices)? Stripe cannot settle in TND.
2. **Stripe**: I'll enable Lovable's built-in Stripe Payments (no account/keys needed for test mode). Confirm?
3. **Admin account**: I'll create the first admin by promoting the first user who signs up with an email you specify. What email?
4. **Brand colors**: any preference, or should I propose a premium German-academic palette (deep navy + warm gold accents on neutral surfaces)?

Once you confirm these 4, I'll enable Cloud + Stripe and start executing M1→M10 in order, verifying each milestone.
