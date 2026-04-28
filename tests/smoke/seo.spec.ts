// Phase 4.1 #126 — Per-route SEO smoke
//
// Verifies the <SEO /> wiring from #124 actually sets unique document
// titles on the major public routes. If this regresses, a search engine
// or social preview will fall back to the generic landing title.

import { test, expect } from '@playwright/test'

test.describe('Per-route SEO', () => {
  test('landing has the marketing title', async ({ page }) => {
    await page.goto('/')
    const title = await page.title()
    expect(title).toMatch(/Planning Matrix/)
    // Description meta should be present.
    const desc = await page.locator('meta[name="description"]').getAttribute('content')
    expect(desc).toBeTruthy()
    expect(desc!.length).toBeGreaterThan(40)
  })

  test('sign-in has its own document title (not the marketing one)', async ({ page }) => {
    await page.goto('/sign-in')
    const title = await page.title()
    // Should contain "Anmelden" (DE) or "Sign in" (EN) — not just the
    // generic landing copy.
    expect(title).toMatch(/Anmelden|Sign in/)
  })

  test('404 has the not-found title', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    const title = await page.title()
    expect(title).toMatch(/Seite nicht gefunden|Page not found/)
  })
})
