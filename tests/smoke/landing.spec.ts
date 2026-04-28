// Phase 4.1 #126 — Landing page smoke
//
// Asserts the marketing page renders with the localized title and a
// primary sign-in CTA. Lightweight; this is the v1 ship-gate test.

import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test('renders with the localized title and a primary CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Planning Matrix/)
    // Primary CTA — the sign-in / sign-up affordance is always visible
    // above the fold. Match either German or English copy, since the
    // language detector may resolve either depending on Accept-Language.
    const cta = page
      .getByRole('link', { name: /anmelden|sign in|anmelden\.|sign in\./i })
      .first()
    await expect(cta).toBeVisible()
  })

  test('has no console errors on landing', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })
})
