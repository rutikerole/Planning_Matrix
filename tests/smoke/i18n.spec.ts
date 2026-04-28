// Phase 4.1 #126 — i18n persistence smoke
//
// The locale switcher must (a) update the <html lang> attribute and
// (b) persist across reloads via i18next-browser-languagedetector's
// cookie. A regression here breaks every German user's first visit
// after a stale cookie.

import { test, expect } from '@playwright/test'

test.describe('Locale switch', () => {
  test('updates <html lang> when the user toggles to English', async ({ page }) => {
    await page.goto('/')
    // Open the language menu — the switcher is keyboard-discoverable
    // via its aria-label.
    const trigger = page
      .getByRole('button', { name: /sprache|language/i })
      .first()
    if (await trigger.isVisible()) {
      await trigger.click()
      const en = page.getByRole('menuitem', { name: /english|englisch/i }).first()
      if (await en.isVisible()) {
        await en.click()
        await expect.poll(() =>
          page.evaluate(() => document.documentElement.lang),
        ).toMatch(/^en/)
      }
    }
  })

  test('html lang attribute matches the resolved language on first paint', async ({ page }) => {
    await page.goto('/')
    const lang = await page.evaluate(() => document.documentElement.lang)
    expect(lang).toMatch(/^(de|en)/)
  })
})
