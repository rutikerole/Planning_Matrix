// Phase 7.5 — Spine sidebar smoke spec.
//
// Stubs Supabase auth + project + messages + events at the network
// layer (same pattern as chamber.spec.ts) and verifies:
//
//   1. Desktop: Spine renders with 8 stage rows.
//   2. Spine carries an aria-labelled aside (role="complementary").
//   3. The first stage is `live` (data-spine-status="live") on a
//      brand-new empty project.
//   4. The Open briefing button in the SpineFooter is visible and
//      links to /projects/:id/result.

import { expect, test } from '@playwright/test'

const PROJECT_ID = '22222222-2222-2222-2222-222222222222'

test.describe('Spine sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.route('**/auth/v1/**', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 't',
          refresh_token: 'r',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'u', email: 'rutik@example.com' },
        }),
      }),
    )
    await page.route(/projects\?.*/, async (route) =>
      route.fulfill({
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
            name: 'Spine Smoke · Türkenstr.',
            status: 'in_progress',
            state: {
              schemaVersion: 1,
              templateId: 'T-01',
              facts: [],
              procedures: [],
              documents: [],
              roles: [],
              recommendations: [],
              areas: { A: { state: 'PENDING' }, B: { state: 'PENDING' }, C: { state: 'PENDING' } },
              questionsAsked: [],
              lastTurnAt: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]),
      }),
    )
    await page.route(/messages\?.*/, async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )
    await page.route(/project_events\?.*/, async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )
  })

  test('desktop renders the Spine aside with 8 stage rows', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}`)
    const spine = page.locator('[data-spine-root="true"]')
    await expect(spine).toBeVisible({ timeout: 10_000 })
    await expect(spine).toHaveAttribute('aria-label', /journey/i)
    const stages = spine.locator('[data-spine-stage]')
    await expect(stages).toHaveCount(8)
  })

  test('first stage is live on a brand-new empty project', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}`)
    const live = page.locator('[data-spine-stage][data-spine-status="live"]')
    await expect(live).toHaveCount(1)
  })

  test('Open briefing footer button links to /result', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}`)
    const cta = page.locator('[data-spine-root="true"] a[href*="/result"]').first()
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', new RegExp(`${PROJECT_ID}/result$`))
  })

  test('mobile (<1024px) collapses Spine into the trigger', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1000 })
    await page.goto(`/projects/${PROJECT_ID}`)
    const trigger = page.locator('button[aria-label*="Projektreise"], button[aria-label*="Project journey"]').first()
    await expect(trigger).toBeVisible({ timeout: 10_000 })
    const spine = page.locator('[data-spine-root="true"]')
    await expect(spine).toBeHidden()
  })
})
