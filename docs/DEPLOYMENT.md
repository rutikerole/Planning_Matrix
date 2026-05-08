# Planning Matrix — DEPLOYMENT

> Operational runbook for deploying, rotating, and rolling back
> Planning Matrix v1. Audience: the manager + any future ops engineer.
> Reads top-to-bottom on first read; subsequent reads jump by section.

## 1. Architecture at a glance

| Layer | Vendor | Region | Gate |
| ----- | ------ | ------ | ---- |
| Front-end SPA | Vercel | (set in `vercel.json`; Frankfurt-preferred) | bundle ≤ 300 KB gz at `index-*.js` |
| Database + Auth + Edge Functions + Storage | Supabase | EU-Frankfurt (eu-central-1) | RLS green; migrations 0001..0029 applied in order |
| LLM | Anthropic | US (DPF + SCCs) | model ID `claude-sonnet-4-6`; rate-limit 50/h via 0008 |
| Error tracking | Sentry EU | Frankfurt | functional consent gate (TTDSG § 25) |
| Product analytics | PostHog EU | Frankfurt | analytics consent gate |

Tag commit + version are recorded in the `package.json` plus the
git tag history (`v1.0` is the delivery event — see
`docs/PHASE_17_SCOPE.md`).

## 2. Environment variables

### 2.1 SPA (Vite) — public, ship in bundle

| Name | Where consumed | Source |
| ---- | -------------- | ------ |
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts:3` + `src/features/architect/lib/verifyFactClient.ts` | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts:4` | Supabase Dashboard → Settings → API → anon public key |
| `VITE_SENTRY_DSN` | `src/lib/errorTracking.ts` (init gated by Functional consent) | Sentry → Settings → Projects → planning-matrix → Client Keys (DSN) |
| `VITE_POSTHOG_KEY` | `src/lib/analytics.ts` (init gated by Analytics consent) | PostHog → Project Settings → Project API Key |

These are PUBLIC values that ship in the bundle. The Supabase anon key
is RLS-gated; the DSNs are intentionally public per Sentry/PostHog
guidance.

### 2.2 Supabase Edge Functions — secret

| Name | Where consumed | Source |
| ---- | -------------- | ------ |
| `SUPABASE_URL` | every function (`createClient` URL) | Supabase auto-injects |
| `SUPABASE_ANON_KEY` | every function | Supabase auto-injects |
| `SUPABASE_SERVICE_ROLE_KEY` | `share-project`, `verify-fact`, admin-side jobs | Supabase auto-injects |
| `ANTHROPIC_API_KEY` | `chat-turn` only | Anthropic Console → Settings → API Keys |
| `PUBLIC_SITE_URL` | `create-share-token` (link-builder) | hand-set; e.g., `https://planning-matrix.vercel.app` |

Set the manager-supplied values via:

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... PUBLIC_SITE_URL=https://...
```

Auto-injected vars (`SUPABASE_URL` etc.) do not need `secrets set`.

### 2.3 Vercel — server-side build

Vercel deploys consume `VITE_*` from the project's Environment
Variables panel. Set under:

  Vercel Dashboard → Project → Settings → Environment Variables

— with the same value for **Production** + **Preview**. Re-deploy on
any change (`vercel --prod` or trigger via the dashboard) — env
changes do not auto-rebuild.

**v1.0.4 hard requirement — `VITE_LEGAL_*` (8 keys):** the prebuild
validator (`scripts/verify-legal-config.mjs`) hard-fails any
`VERCEL_ENV=production` deploy unless all 8 of these keys are
set. Set them in BOTH the Production scope (mandatory — § 5 DDG
real values) and the Preview scope (recommended — without it,
preview deploys still build but render the
"Provider details unavailable" fail-closed banner on /impressum
instead of the real provider details). The 8 keys are listed in
`.env.example`.

Symptom of a missing key on Production: Vercel build fails in
~5 seconds with `[verify:legal-config] FAIL` listing the unset
keys. This IS the v1.0.4 ship-blocker doing its job.

## 3. Migrations — apply order 0001 → 0029

The migration history is sequential with two intentional gaps
(0024, 0025) that were placeholder-reserved but never implemented;
those numbers stay vacant. There are also two same-numbered files at
0004 (`0004_planning_matrix_v3_templates.sql` is the canonical one,
the older `0004_thinking_label.sql` predates the v3 widening) — check
whichever is newer in `git log`.

Apply path on a fresh Supabase project:

```sh
# From the repo root:
supabase db push
```

`supabase db push` reads `supabase/migrations/` in name-sorted order,
which IS the correct order here. If `db push` reports "already
applied" for any file, the project's `schema_migrations` table is
ahead of intent — check whether you're pointed at the right project.

For an existing production project, only NEW migrations apply on
`db push`. The 0026..0029 set is the Phase 13 batch — it must be
applied before deploying the `share-project` / `verify-fact` Edge
Functions or the SPA's `/architect` route, otherwise those code
paths reference tables that don't exist.

**Manual apply path (Supabase Dashboard SQL Editor)**:

  1. Open `supabase/migrations/0026_project_members.sql`.
  2. Copy → Dashboard → SQL Editor → New query → Paste → Run.
  3. Verify no error in the result panel.
  4. Repeat for 0027, 0028, 0029.

Each Phase 13 migration ends with a "Verification" comment block
showing a sample SELECT that should succeed post-apply.

## 4. Deploy procedure

### 4.1 Front-end (Vercel)

```sh
# Push to main (CI auto-deploys to production):
git push origin main

# Or deploy directly from local:
vercel --prod
```

The build runs `npm run build`, which chains:

  1. `npm run prebuild` → `verify:locales` + `verify:hardcoded-de`
  2. `tsc -b`
  3. `vite build`
  4. `verify:bundle` (300 KB gz ceiling on the index chunk)

Any of those steps red → build fails → no deploy.

### 4.2 Edge Functions (Supabase)

```sh
# Deploy a single function:
supabase functions deploy chat-turn
supabase functions deploy share-project
supabase functions deploy verify-fact

# Deploy all changed functions:
supabase functions deploy
```

Edge Function deploys are atomic per function — there's no half-
deployed state. Watch the dashboard's "Functions" tab for the new
deployment ID after `deploy` returns.

### 4.3 Database migrations

See § 3 above. Migration deploys are NOT automated in this repo —
the manager applies via Dashboard or `supabase db push` on intent.

## 5. Rollback

### 5.1 Vercel rollback (front-end)

```sh
# From the Vercel dashboard:
#   Project → Deployments → pick a known-good deployment → Promote to Production

# From the CLI:
vercel rollback <deployment-url>
```

Rollback is a metadata flip — instantaneous. Use this when an SPA-
only regression ships (CSS break, JS regression). DB / Edge
Functions are unaffected.

### 5.2 Edge Function rollback

Supabase doesn't keep a built-in rollback button. The git-based
recovery:

```sh
git checkout <known-good-sha> -- supabase/functions/<fn>/
supabase functions deploy <fn>
git checkout HEAD -- supabase/functions/<fn>/   # restore working tree
```

If the regression is in a hot path (`chat-turn`), do this
immediately on detection.

### 5.3 Migration rollback

Migrations are forward-only in v1. There is no down migration. The
recovery path for a bad migration is:

  1. Roll the SPA back to the pre-migration commit (Vercel rollback).
  2. Diagnose the bad migration.
  3. Write a NEW migration (e.g. `0030_fix_<bad>.sql`) that reverses
     the offending change.
  4. Apply + redeploy SPA.

This is intentional — DSGVO-relevant tables shouldn't have one-click
DROP paths in operations.

## 6. Secret rotation

### 6.1 Anthropic API key

The chat-turn function reads `ANTHROPIC_API_KEY` per request. To
rotate:

  1. Anthropic Console → API Keys → Create new key.
  2. `supabase secrets set ANTHROPIC_API_KEY=<new>`
  3. Verify the function fires green — send one test message via the
     SPA.
  4. Anthropic Console → API Keys → Revoke old key.

Rotate every 90 days at minimum, immediately on any suspected leak.

### 6.2 Supabase service-role key

Service-role keys are revoked by:

  1. Dashboard → Settings → API → Service role → Reset.
  2. The new key is auto-injected to Edge Functions; redeploy any
     long-running function to pick it up:
     `supabase functions deploy --no-verify-jwt`.
  3. The OLD key is now invalid — any downstream system that copied
     it (e.g., the `qualifier-downgrade-rate.mjs` CLI's
     `SMOKE_SUPABASE_SERVICE_KEY` env) needs the new value.

Ops note: rotating the service-role key has higher blast radius than
ANTHROPIC_API_KEY because it cuts access to the entire database. Do
this in a maintenance window.

### 6.3 Sentry DSN / PostHog API key

Both are public values shipped in the bundle. Rotation requires:

  1. Vendor dashboard → revoke old + issue new.
  2. Update Vercel env var.
  3. `vercel --prod` to ship a new bundle.

The window between revoke and new-bundle-live is the gap when error
tracking / analytics will silently drop events. Plan accordingly.

## 7. Domain config

Today's deployment lives at `planning-matrix.vercel.app`. The custom
domain swap (e.g., `planning-matrix.app`) procedure:

  1. Vercel Dashboard → Project → Settings → Domains → Add.
  2. Configure DNS at the registrar:
     - `A` record on apex → `76.76.21.21` (Vercel anycast).
     - `CNAME` on `www` → `cname.vercel-dns.com`.
  3. Wait for DNS propagation (typically minutes via Cloudflare,
     up to 48h via slow registrars).
  4. Vercel auto-issues the Let's Encrypt cert when DNS resolves.
  5. Update the SPA's CORS allowlist — chat-turn's `cors.ts` +
     create-share-token's allowed origins. Re-deploy each function.
  6. Update Datenschutz § 3.5 (Vercel hosting reference) to reflect
     the new canonical URL.

## 8. Monitoring + alerting

The runtime monitoring split:

| What | Where | When to look |
| ---- | ----- | ------------ |
| Anthropic spend / 429 rate | Anthropic Console → Usage | Daily during ramp; weekly steady-state |
| Supabase usage (DB rows / API requests / Edge invocations) | Supabase Dashboard → Reports | Weekly |
| Vercel build status / function timing | Vercel Dashboard | On every deploy |
| Sentry errors | sentry.io EU instance | Real-time on ramp; daily steady-state |
| PostHog product analytics | eu.i.posthog.com | Weekly |
| Qualifier-gate rate (Phase 13) | `node scripts/qualifier-downgrade-rate.mjs` | Weekly during gate's first month |

Daily-gate rerun before any production push:

```sh
npm run verify:bayern-sha   # SHA b18d3f7f...3471 expected
npm run smoke:citations     # 99+ fixtures green
npx tsc --noEmit -p .       # clean
npm run build               # green; bundle ≤ 300 KB gz
```

Any red → fix or rollback.

## 9. Known operational behaviours (cross-ref)

- **Bayern SHA invariant.** Editing any of `src/legal/{shared,
  federal,bayern,muenchen,personaBehaviour}.ts` flips the SHA;
  `verify:bayern-sha` is the canary. See `scripts/lib/bayernSha.mjs`
  for the precise file list and salt.
- **Qualifier-write gate (Phase 13).** Rejection mode shipped at
  `024fbcd` (Week 1) → `80fc5ae` (Week 2 flip).
  `OPS_RUNBOOK.md` § "Qualifier-gate rollback" covers the false-
  positive playbook.
- **Rate limit 50/h per (project, user).** Migration 0008. Tunable
  via the `chat_turn_rate_limits` table; adjust per
  OPS_RUNBOOK.md § "Rate-limit tuning".
- **Region pinning.** All persistent data lives in EU-Frankfurt
  (Supabase project region + Sentry-EU + PostHog-EU). Anthropic +
  Vercel cross-Atlantic legs covered by SCCs / DPF — see
  Datenschutz § 3.

## 10. v1.0 tag procedure

When all six v1.0 tag preconditions in PHASE_17_SCOPE.md are
satisfied:

```sh
# Final daily-gate run on the tag commit:
npm run verify:bayern-sha
npm run smoke:citations
npx tsc --noEmit -p .
npm run build

# Tag (annotation copied from PHASE_17_SCOPE.md):
git tag -a v1.0 -m "Planning Matrix v1.0 — delivered to client. ..."
git push --tags

# Verify the tag on the Vercel "Deployments" page picks up the
# annotated tag — Vercel surfaces the tag name on the deployment
# row, which lets ops trace any post-tag incident back to a single
# commit SHA.
```
