# Planning Matrix

German building-permit decision-support web application.

Live: <https://planning-matrix.vercel.app/>

## Tech stack

- Vite + React 19 + TypeScript
- Tailwind CSS + shadcn/ui (button, accordion, tabs)
- Framer Motion (LazyMotion + domAnimation, calm scroll-bound + ambient)
- TanStack Query (server state cache; cleared on sign-out)
- Zustand (client state — auth user/profile, etc.)
- React Hook Form + Zod (forms + validation; error messages as i18n keys)
- react-i18next (German primary, English fallback; full DE/EN parity verified)
- Lenis (smooth scroll, gated by prefers-reduced-motion)
- Supabase (auth + Postgres + RLS; PKCE flow for SPA)
- Sharp — devDep only, runs the local image pipeline

## Phases shipped

- **Phase 0** — scaffold (Vite, Tailwind, i18n)
- **Phase 1** — landing page (typography, calm motion, sections)
- **Phase 1.5** — visual upgrade (matrix hero, mockups, demo, dividers, hover lifts)
- **Phase 1.6** — cinematic direction (full-bleed photographic hero, atmospheric backdrops, blueprint floor plan, elevated demo, ambient motion)
- **Phase 2** — authentication
- **Phase 3** — chat core: two-question wizard, three-zone chat workspace, Anthropic-backed Edge Function, dossier-styled right rail, specialist roundtable
- **Phase 3.1** — polish sweep: Top-3 numbering fix, completion_signal end-to-end, mobile drawers (vaul), View Transitions API for the wizard handoff, MAX_TOKENS tuning, `thinking_label_de` persistence (`docs/phase3-1-polish.md`)

## Phase 3 — Edge Function workflow

### Apply migration (one-shot, ~30 s)

Supabase Dashboard → SQL Editor → New query → paste the contents of `supabase/migrations/0003_planning_matrix_core.sql` → Run.

### Set the Anthropic key as a function secret

```bash
npx supabase login                 # one-time
npx supabase link --project-ref dklseznumnehutbarleg
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

### Deploy `chat-turn`

```bash
npx supabase functions deploy chat-turn
```

The function reads `ANTHROPIC_API_KEY` + auto-injected `SUPABASE_URL` / `SUPABASE_ANON_KEY`, verifies the caller's JWT, RLS-scopes a Supabase client to that user, calls Claude Sonnet 4.5 with multi-block system caching (persona block carries `cache_control: { type: 'ephemeral' }`), validates the forced `respond` tool input against Zod, persists user + assistant + audit rows, returns the new project state. ~24 s on cold cache, ~22 s warm — second turn within 5 min reads ~6.3k cached tokens at the 90% discount.

### Local dev against the deployed Edge Function

`.env.local` already points the SPA at the production Supabase URL. `npm run dev` works against the same backend; the dev-mode `console.group('chat-turn ← HTTP …')` log surfaces the full request / response / costInfo (D13).

## Development

```bash
npm install
cp .env.example .env.local   # then fill in real Supabase credentials
npm run dev
```

Open <http://localhost:5173>.

### Image pipeline (one-shot)

```bash
npm run images:download   # re-fetch the 8 source photos into ./images-source/
npm run images            # convert sources → AVIF + WebP + mozJPEG variants in public/images/
```

The variants are committed; you only need to re-run if you swap a source photograph.

## Authentication

Phase 2 ships email + password auth backed by Supabase, with email confirmation required. Six pages on the public side (sign-up, sign-in, forgot-password, reset-password, check-email, verify-email) plus a `/dashboard` placeholder behind `<ProtectedRoute>` (Phase 2.5 replaces it with the actual two-question wizard).

**Visual continuity:** the auth surface uses the same Instrument Serif + Inter pairing, the same warm-paper / ink / clay palette, the same calm motion language, and the same atmospheric photography as the landing page. Each page gets emotional weather appropriate to its moment:

| Route | Photo | Italic phrase (callback to landing) |
|---|---|---|
| `/sign-in`, `/sign-up` | `hero-rooftop` (Klunkerkranich) | "Vom ersten Strich bis zur Genehmigung." |
| `/forgot-password`, `/reset-password` | `trust-pen` | "Empfehlen heißt nicht entscheiden." |
| `/check-email`, `/verify-email` | `finalcta-windows` | "Bauen Sie planbarer." |

### Supabase setup

**Read [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)** — seven-step manual configuration (~20 minutes). Covers project creation, SQL migration (`supabase/migrations/0001_profiles.sql`), dashboard auth settings, redirect URL whitelist, DE+EN email templates with Go-template locale switches, and env var wiring for both local dev and Vercel.

The app boots cleanly without env vars (the landing page renders normally and Supabase calls fail loudly with an actionable message); auth flows obviously require the env to be configured before they work.

## Deployment

Auto-deployed to Vercel from `main`. Two env vars required on the Vercel project (Production + Preview):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(Setup doc covers this.)

## Repo layout

```
src/
  app/            providers + router
  components/
    shared/       Container, Section, Picture, ProtectedRoute, AuthSkeleton, …
    ui/           shadcn primitives
  features/
    landing/      hero, sections, visuals
    auth/         pages + form components
    dashboard/    Phase 2.5 placeholder
    legal/        /impressum, /datenschutz, /agb stubs
    not-found/    404
  hooks/          usePrefersReducedMotion, useSession, useAuth
  lib/            supabase, i18n, authValidation, utils
  locales/        de.json, en.json
  stores/         authStore (zustand)
  styles/         globals.css

supabase/
  migrations/     0001_profiles.sql

scripts/          download-images.sh, process-images.mjs

public/
  images/         AVIF/WebP/JPG variants (committed) + CREDITS.md
  favicon.svg, og.svg

images-source/    original 1920w JPGs (kept out of public/ so they don't ship)
```

## Phase notes

- [`LANDING_PHASE_NOTES.md`](./LANDING_PHASE_NOTES.md) — Phase 1
- [`LANDING_PHASE_15_NOTES.md`](./LANDING_PHASE_15_NOTES.md) — Phase 1.5
- [`LANDING_PHASE_16_NOTES.md`](./LANDING_PHASE_16_NOTES.md) — Phase 1.6
- [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) — Phase 2 manual setup
