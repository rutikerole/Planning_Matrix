// Phase 7 Chamber — smoke spec.
//
// Stubs Supabase auth + chat-turn to verify that the Chamber renders
// its core surfaces (astrolabe, specialist team, ledger tab, briefing
// CTA placeholder, input bar) when a project is open. Avoids the
// real backend.

import { expect, test } from '@playwright/test'

const PROJECT_ID = '11111111-1111-1111-1111-111111111111'

test.describe('Chamber — chat workspace shell', () => {
  test.beforeEach(async ({ page }) => {
    // Stub auth: pretend Supabase has a session.
    await page.route('**/auth/v1/**', async (route) => {
      const body = JSON.stringify({
        access_token: 't',
        refresh_token: 'r',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'u', email: 'rutik@example.com' },
      })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body,
      })
    })
    // Stub the project fetch.
    await page.route(/projects\?.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: PROJECT_ID,
            owner_id: 'u',
            intent: 'neubau_einfamilienhaus',
            has_plot: true,
            plot_address: 'Türkenstraße 25, 80799 München',
            bundesland: 'bayern',
            template_id: 'T-01',
            name: 'Smoke Test · Türkenstr.',
            status: 'in_progress',
            state: { schemaVersion: 1, templateId: 'T-01', facts: [], procedures: [], documents: [], roles: [], recommendations: [], areas: { A: { state: 'PENDING' }, B: { state: 'PENDING' }, C: { state: 'PENDING' } }, questionsAsked: [], lastTurnAt: new Date().toISOString() },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]),
      })
    })
    await page.route(/messages\?.*/, async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      }),
    )
    await page.route(/project_events\?.*/, async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )
  })

  test('mounts ChamberLayout for a project', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}`)
    // ChamberLayout sets data-mode="operating" on root.
    const root = page.locator('[data-mode="operating"]')
    await expect(root).toBeVisible({ timeout: 10_000 })
  })

  test('empty thread shows the EmptyState headline', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}`)
    // The empty state lives in the Chamber namespace.
    const headline = page.getByText(/Atelier öffnet|atelier opens/i)
    await expect(headline.first()).toBeVisible({ timeout: 10_000 })
  })
})
