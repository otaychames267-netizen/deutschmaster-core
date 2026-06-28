# Deploying to Vercel (staging)

This app is a **TanStack Start (Nitro 3)** SSR application. Nitro auto-detects the
Vercel build environment and emits Build Output API output — so deployment needs
only the config in `vercel.json` (`framework: null`, `buildCommand: npm run build`).

## Required environment variables (set in the Vercel project)

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/publishable key (safe for client) |
| `VITE_TURN_URLS` | optional | Your TURN server(s); falls back to public OpenRelay TURN if unset |
| `VITE_TURN_USERNAME` | optional | TURN username |
| `VITE_TURN_CREDENTIAL` | optional | TURN credential |

> Do **not** put `SUPABASE_SERVICE_ROLE_KEY` in the deployed app — it's only used by
> local dev/import scripts, never by the client/SSR runtime.

## One-time login (must be done by the account owner — interactive)

```bash
npx vercel login          # opens browser / email code; cannot be automated
```

## Deploy

```bash
# from the repo root, after login:
npx vercel link --yes                       # link/create the Vercel project (first time)

# push env vars (run once each; values from your .env):
printf '%s' "$VITE_SUPABASE_URL"      | npx vercel env add VITE_SUPABASE_URL      preview
printf '%s' "$VITE_SUPABASE_ANON_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY preview

# staging (preview) deployment → prints the staging URL:
npx vercel deploy

# (production alias, optional)
npx vercel deploy --prod
```

`npx vercel deploy` (without `--prod`) creates a **preview/staging** URL — exactly the
staging environment to run the acceptance test against.

## Acceptance test on staging

Follow §3 (Manual) of [docs/muendlich-phase1.md](docs/muendlich-phase1.md):
Room ID join, A/B assignment, synchronized 15-min timer, chat both ways, voice
(both hear each other), third-participant rejection, refresh recovery, auto-transition
to Exam Room at 00:00.
