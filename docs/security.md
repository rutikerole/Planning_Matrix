# Security posture

> Phase 8 — operational security baseline. Reviewed quarterly; rotated per the schedule below.

## HTTP headers

Set in `vercel.json`. Verifiable via `curl -I https://planning-matrix.vercel.app/`.

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | strict — see vercel.json | Prevents XSS via inline-script injection. `script-src 'self' 'wasm-unsafe-eval'` only; no `unsafe-inline`. `connect-src` enumerates every legitimate API endpoint (Supabase, PostHog EU, Sentry, Nominatim, Geoportal München, muenchen.info PDF host). |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS for one year on all subdomains. |
| `X-Frame-Options` | `DENY` | Cannot be embedded in iframes — clickjacking prevention. |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Don't leak full path on outbound nav. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Block sensors + FLoC explicitly. |

Run [Mozilla Observatory](https://developer.mozilla.org/en-US/observatory) on the live URL after deploy. Target: grade A or better.

## Secrets

All production secrets live in Vercel project environment variables. Never committed to the repo.

| Secret | Source | Rotation cadence | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Console | every 6 months OR on suspicion of leak | Edge Function env. Never client-side. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | every 6 months | Edge Function env + eval harness GitHub Secret. **Never** client-side; never logged. |
| `SUPABASE_ANON_KEY` (`VITE_SUPABASE_ANON_KEY`) | same | rotate alongside service-role | Client-safe but still rotate. |
| `VITE_SENTRY_DSN` | de.sentry.io project settings | yearly | Client-side. Rotation = create new DSN, update Vercel env, deploy, retire old. |
| `VITE_POSTHOG_KEY` | eu.posthog.com project settings | yearly | Client-side. |
| `EVAL_HARNESS_TEST_USER_PASSWORD` | generated locally | yearly | GitHub Actions Secret only. |

## Rotation playbook

1. Generate new secret in the source provider's dashboard.
2. Add new value as a NEW Vercel environment variable (e.g. `ANTHROPIC_API_KEY_NEW`) so deploys still work.
3. Trigger a Vercel preview deploy; verify it works with the new key.
4. Promote: rename `ANTHROPIC_API_KEY_NEW` → `ANTHROPIC_API_KEY` (overwriting). Trigger production deploy.
5. Revoke the old secret in the source provider.
6. Smoke test: a chat-turn round-trip and the freshness pipeline (where applicable).

## Auftragsverarbeitungsverträge (DPAs)

Mandatory under DSGVO Art. 28 for every external processor. Signed once per provider; archive copies in a secure folder (NOT this repo).

| Processor | DPA URL / location |
|---|---|
| Anthropic | API Console → Privacy → DPA |
| Supabase | Dashboard → Settings → DPA |
| Sentry | Account Settings → Legal → DPA |
| PostHog | Account Settings → Legal → DPA |
| Vercel | Dashboard → Settings → DPA |

Sign before public launch. The Datenschutzerklärung at `/datenschutz` cites these contracts; if they don't exist, the page is misleading.

## Incident response

1. Suspected key leak → immediate rotation (above).
2. Sentry shows a flood of unfamiliar errors → check the latest deploy diff; rollback via Vercel if needed.
3. RLS policy drift suspected → run `select * from pg_policies where schemaname='public';` in Supabase SQL Editor; compare against the migrations.
