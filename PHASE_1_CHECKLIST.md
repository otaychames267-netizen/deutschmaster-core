# Phase 1 — External Credentials Checklist

Everything else is live and tested. The items below need YOUR credentials
to activate. Once you add the secrets, no further code changes are required
for the basic flow — Stripe checkout, email branding, and webhook handling
will start working automatically.

---

## 1. Stripe Payments

**What you need from Stripe (https://dashboard.stripe.com):**

| Secret name             | Where to find it                                             |
| ----------------------- | ------------------------------------------------------------ |
| `STRIPE_SECRET_KEY`     | Developers → API keys → "Secret key" (starts with `sk_...`)  |
| `STRIPE_WEBHOOK_SECRET` | Developers → Webhooks → your endpoint → "Signing secret"     |

**Webhook endpoint to register in Stripe:**

```
https://<your-published-domain>/api/public/stripe-webhook
```

**Events to subscribe to:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

**Stripe Products / Prices to create** (one Price per plan, recurring monthly):
- `schriftlich` — 20 TND / ~€6
- `muendlich`   — 20 TND / ~€6
- `premium`     — 40 TND / ~€12

After creating the Stripe Prices, paste each `price_...` ID into the
`stripe_price_id` column of the corresponding row in the **plans** table
(Admin → Plans page).

> Recommendation: use Lovable's built-in Stripe integration instead of
> managing your own keys — no Stripe account required, test mode works
> instantly. Ask me to enable it when you're ready.

---

## 2. Email Delivery (branded auth emails)

Supabase's default sender already works for signup confirmations and
password resets — but emails come from a generic `@supabase.io` address.
To send from `notify@yourdomain.com`:

- **No secrets needed.** Just ask me to "set up email domain" and you'll
  get a one-click dialog. You'll need to add two NS records at your DNS
  registrar (Cloudflare, Namecheap, etc.).

Email verification is currently **auto-confirmed** (users skip the
verification step). To require verification, ask me to "turn off
auto-confirm".

---

## 3. Two-Factor Authentication

**Already fully functional.** Uses Supabase's native MFA — no external
credentials needed. Users enroll via Profile → Two-Factor Authentication
and scan a QR code with Google Authenticator / 1Password / Authy.

---

## 4. Optional: pg_cron for trial expiry

Trials automatically expire when a user opens the app (via the
`expire_overdue_subscriptions` RPC). For users who never log back in,
you can add a pg_cron job that runs it nightly — let me know and I'll
wire it up.