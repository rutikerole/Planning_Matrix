// fix/ci-build — canonical auth seed for smoke specs.
//
// ROOT CAUSE this helper closes: three spec files seeded auth three
// different ways — architect.spec used the supabase-js *v1* session
// shape ({ currentSession, expiresAt }) which v2's getSession() silently
// ignores, and chamber/spine seeded nothing at all. Every auth-gated
// spec therefore redirected to /sign-in. Invisible for 5 weeks because
// CI died earlier, at the Build step (see scripts/verify-ci-env.mjs).
//
// Contract:
//   • supabase-js v2 derives its storage key from the project URL's
//     first hostname label: `sb-<ref>-auth-token`. The seed below uses
//     `sb-localhost-auth-token`, so the app bundle MUST be built with
//     VITE_SUPABASE_URL=http://localhost:54321 — the CI workflow's
//     Build step pins exactly that (.github/workflows/test.yml), and
//     local runs should too (see tests/smoke/README.md).
//   • The session value is the v2 shape — access_token/expires_at/user
//     at the top level. Do NOT regress to the v1 currentSession shape.

import type { Page } from '@playwright/test'

interface SeedOpts {
  userId?: string
  email?: string
  /** Force the UI locale; omit to leave i18next detection alone. */
  lang?: 'de' | 'en'
}

/**
 * Pre-seed cookie consent (key + shape from
 * src/features/cookies/useCookieConsent.ts, schema version 1) so the
 * fixed-bottom DSGVO banner never mounts during specs. On mobile
 * viewports under CI's ubuntu font metrics the banner overlays
 * bottom-of-page buttons and intercepts clicks (run #212: architect
 * Bug-112 + both auth.spec tests failed ONLY on chromium/webkit-mobile
 * with click timeouts). Specs must not depend on banner geometry.
 * Called automatically by seedV2Session; anonymous specs call it
 * directly.
 */
export async function seedCookieConsent(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'pm.cookieConsent',
      JSON.stringify({
        essential: true,
        analytics: false,
        functional: false,
        version: 1,
        timestamp: '2026-01-01T00:00:00.000Z',
      }),
    )
  })
}

export async function seedV2Session(page: Page, opts: SeedOpts = {}) {
  await seedCookieConsent(page)
  await page.addInitScript(
    ([userId, email, lang]) => {
      window.localStorage.setItem(
        'sb-localhost-auth-token',
        JSON.stringify({
          access_token: 'fake-jwt',
          token_type: 'bearer',
          expires_at: 9999999999,
          refresh_token: 'fake-refresh',
          user: {
            id: userId,
            aud: 'authenticated',
            role: 'authenticated',
            email,
          },
        }),
      )
      if (lang) window.localStorage.setItem('i18nextLng', lang)
    },
    [opts.userId ?? 'u', opts.email ?? 'smoke@example.com', opts.lang ?? ''],
  )
}
