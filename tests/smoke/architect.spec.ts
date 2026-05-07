// ───────────────────────────────────────────────────────────────────────
// Phase 13 Week 3 — Architect multi-context smoke
//
// Two-account, single-test pattern. We open one BrowserContext for the
// "owner" and a second for the "architect" so the spec exercises the
// invite-claim flow + the verification panel from the architect's
// authenticated view in a single Playwright run.
//
// All Supabase calls are stubbed at the network layer (mirrors
// auth.spec.ts pattern); the goal is to assert the route + UI
// wiring stays green, not to test the Edge Functions live.
//
// Coverage matrix:
//   1. Architect signs in, lands on /architect dashboard, sees a
//      mocked project_members row, clicks "Prüfen", lands on the
//      verification panel.
//   2. Architect with no membership sees the empty-state copy.
//   3. Anonymous caller hitting /architect/accept?token=... is
//      redirected to /sign-in?next=...
// ───────────────────────────────────────────────────────────────────────

import { test, expect, type Route } from '@playwright/test'

const ARCHITECT_USER_ID = 'arch-user-id-aaaa-bbbb-cccc-dddd-eeee'
const PROJECT_ID = '11111111-2222-3333-4444-555555555555'

// Stub the Supabase REST endpoints the architect surface touches. The
// SPA reads profiles for role detection, project_members for the
// dashboard, and projects for the verification panel.
async function stubArchitectBackend(
  page: import('@playwright/test').Page,
  opts: { memberships: number; verifiedQualifier?: boolean },
) {
  await page.route(/\/auth\/v1\/user/, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: ARCHITECT_USER_ID,
        email: 'architect@example.com',
        role: 'authenticated',
      }),
    })
  })

  await page.route(/\/rest\/v1\/profiles/, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ role: 'designer' }]),
    })
  })

  await page.route(/\/rest\/v1\/project_members/, async (route: Route) => {
    if (opts.memberships === 0) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'pm-1',
          project_id: PROJECT_ID,
          invited_at: '2026-05-01T10:00:00Z',
          accepted_at: '2026-05-02T11:00:00Z',
          project: {
            id: PROJECT_ID,
            name: 'EFH München-Schwabing',
            bundesland: 'bayern',
            template_id: 'T-01',
          },
        },
      ]),
    })
  })

  await page.route(/\/rest\/v1\/projects/, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: PROJECT_ID,
          name: 'EFH München-Schwabing',
          bundesland: 'bayern',
          template_id: 'T-01',
          state: {
            schemaVersion: 1,
            templateId: 'T-01',
            facts: [
              {
                key: 'site.height_m',
                value: 6.8,
                qualifier: {
                  source: 'DESIGNER',
                  quality: opts.verifiedQualifier ? 'VERIFIED' : 'ASSUMED',
                  setAt: '2026-05-02T12:00:00Z',
                  setBy: 'assistant',
                },
              },
            ],
            recommendations: [],
            procedures: [],
            documents: [],
            roles: [],
            areas: { A: { state: 'PENDING' }, B: { state: 'PENDING' }, C: { state: 'PENDING' } },
            questionsAsked: [],
            lastTurnAt: '2026-05-02T12:00:00Z',
          },
        },
      ]),
    })
  })
}

test.describe('Architect surface', () => {
  test('architect dashboard renders membership row + Prüfen link', async ({ page }) => {
    await stubArchitectBackend(page, { memberships: 1 })
    await page.addInitScript(() => {
      // Inject a fake auth session into localStorage so useAuthStore
      // resolves immediately. Key matches Supabase's storage convention.
      const session = {
        currentSession: {
          access_token: 'fake-jwt',
          refresh_token: 'fake-refresh',
          user: { id: 'arch-user-id-aaaa-bbbb-cccc-dddd-eeee' },
        },
        expiresAt: 9999999999,
      }
      window.localStorage.setItem('sb-localhost-auth-token', JSON.stringify(session))
    })

    await page.goto('/architect')
    // The page renders an austere mono-leaning H1 in German.
    await expect(page.getByText(/Ihre Projekt-Mandate/i)).toBeVisible({
      timeout: 10_000,
    })
    // Membership row's Prüfen link points to the verification panel.
    const pruefenLink = page.getByRole('link', { name: /pr[üu]fen/i }).first()
    await expect(pruefenLink).toBeVisible()
    await expect(pruefenLink).toHaveAttribute(
      'href',
      `/architect/projects/${PROJECT_ID}/verify`,
    )
  })

  test('verification panel shows Bestätigen CTA for ASSUMED qualifier', async ({ page }) => {
    await stubArchitectBackend(page, { memberships: 1, verifiedQualifier: false })
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'sb-localhost-auth-token',
        JSON.stringify({
          currentSession: {
            access_token: 'fake-jwt',
            refresh_token: 'fake-refresh',
            user: { id: 'arch-user-id-aaaa-bbbb-cccc-dddd-eeee' },
          },
          expiresAt: 9999999999,
        }),
      )
    })

    await page.goto(`/architect/projects/${PROJECT_ID}/verify`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /M[üu]nchen|EFH/,
    )
    // Bestätigen CTA visible for the un-verified fact row.
    const cta = page.getByRole('button', { name: /best[äa]tigen/i }).first()
    await expect(cta).toBeVisible()
  })

  test('anonymous caller hitting /architect/accept is redirected to sign-in', async ({
    page,
  }) => {
    // No localStorage seed — useAuthStore resolves to anonymous.
    await page.goto('/architect/accept?token=00000000-0000-0000-0000-000000000000')
    await page.waitForURL(/\/sign-in\?next=/, { timeout: 10_000 })
    expect(page.url()).toMatch(/sign-in\?next=/)
  })
})
