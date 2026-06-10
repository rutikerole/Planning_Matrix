# Playwright smoke suite — Phase 4.1 #126

The first Playwright tests in the repo. Scope is **smoke**, not
end-to-end coverage: prove the build is intact, prove the highest-
value happy paths render, and give CI something concrete to gate
PRs on.

## What's covered

| Spec | What it asserts |
|---|---|
| `landing.spec.ts` | Marketing page renders with the localized title and a primary sign-in CTA. Locale switch persists across reloads. |
| `auth.spec.ts` | Sign-in form mounts, validates empty submit, surfaces an error envelope when the network rejects with `invalid_credentials`. |
| `seo.spec.ts` | Per-route titles set by the new `<SEO />` component (Phase 4.1 #124) match the i18n strings on the landing, sign-in, and 404 routes. |
| `i18n.spec.ts` | DE → EN locale switch updates `<html lang>` and the visible page chrome; persists across reloads (i18next-browser-languagedetector cookie). |

All tests stub the Supabase backend at the network layer
(`page.route(/functions\/v1\//, ...)`) so the suite never touches
production data. Auth state is similarly stubbed.

## What's deferred to Phase 4.2

These need either (a) a dedicated test Supabase project with seed
data or (b) more elaborate request-response stubbing than fits this
batch. They are listed in `docs/phase4-readiness-audit.md`
§A.before-beta item 10:

- `wizard.spec.ts` — Q1 + Q2 happy path → project created
- `chat.spec.ts` — chat-turn round-trip with stubbed Anthropic
- `file-upload.spec.ts` — paperclip → file picker → category select
- `result-page.spec.ts` — all 12 result sections render
- `share-token.spec.ts` — generate link → anon GET in incognito
- `mobile-layout.spec.ts` — explicit horizontal-scroll absence on
  iPhone SE / Pixel 5 viewports across the major pages
- `accessibility.spec.ts` — axe-core integration scanning landing,
  sign-in, dashboard, chat, result, share view for WCAG AA
  violations

## Running

```sh
# Install browsers (first time only — ~200 MB):
npx playwright install --with-deps

# Run against the local dev server:
npm run test:e2e

# Single project (faster iteration):
npx playwright test --project=chromium-desktop

# UI mode for debugging:
npx playwright test --ui
```

CI runs the suite via `.github/workflows/test.yml` against a
vite-preview build on port 4173. Reports upload as a
`playwright-report` artifact on failure.

## Auth seeding contract (fix/ci-build, 2026-06-10)

Auth-gated specs MUST seed their session via
`tests/smoke/helpers/auth.ts` (`seedV2Session`) — never inline:

- The seed writes the **supabase-js v2** session shape to
  `localStorage['sb-localhost-auth-token']`. The v1
  `{ currentSession, expiresAt }` shape is silently ignored by v2's
  `getSession()` — architect.spec carried that bug invisibly while CI
  was red at the Build step (runs #51–#210, 2026-05-08 → 2026-06-10).
- supabase-js derives the storage key from the project URL's first
  hostname label, so the app bundle must be **built** with
  `VITE_SUPABASE_URL=http://localhost:54321`. CI pins this in
  test.yml's Build step; for an exact local CI repro:

  ```sh
  SKIP_LEGAL_CONFIG_CHECK=1 VITE_SUPABASE_URL=http://localhost:54321 \
    VITE_SUPABASE_ANON_KEY=stub-anon-key npm run build
  CI=1 npx playwright test --project=chromium-desktop
  ```

Both sides of the contract are guarded by `npm run audit:ci-env`
(prebuild): it fails if test.yml's Build env drops the legal-config
bypass, points VITE_SUPABASE_URL away from localhost, or the helper
stops seeding the key.
