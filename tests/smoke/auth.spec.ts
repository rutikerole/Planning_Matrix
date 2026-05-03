// Phase 4.1 #126 — Auth page smoke
//
// Asserts the sign-in form mounts, validates empty submit, and surfaces
// an inline error when the auth backend returns invalid_credentials.

import { test, expect, type Route } from '@playwright/test'

test.describe('Sign-in', () => {
  test('renders the sign-in form with email + password fields', async ({ page }) => {
    await page.goto('/sign-in')
    // Title set by the route's <SEO /> wrapper (Phase 4.1 #124).
    await expect(page).toHaveTitle(/Anmelden|Sign in/)
    await expect(page.getByLabel(/e-?mail/i).first()).toBeVisible()
    await expect(page.getByLabel(/passwort|password/i).first()).toBeVisible()
  })

  test('shows validation error for empty email submit', async ({ page }) => {
    await page.goto('/sign-in')
    const submit = page.getByRole('button', { name: /anmelden|sign in/i }).first()
    await submit.click()
    // The form prevents submit; an error message renders next to the
    // email field. Match either DE or EN copy — current strings are
    // "Bitte geben Sie Ihre E-Mail-Adresse ein." / "Please enter your
    // email address.".
    await expect(
      page.getByText(/bitte geben sie|please enter|erforderlich|required/i).first(),
    ).toBeVisible()
  })

  test('surfaces invalid_credentials when the backend rejects', async ({ page }) => {
    // Stub Supabase auth/v1/token to mimic an invalid_credentials reply.
    await page.route(/\/auth\/v1\/token/, async (route: Route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
          code: 'invalid_credentials',
        }),
      })
    })
    await page.goto('/sign-in')
    await page.getByLabel(/e-?mail/i).first().fill('test@example.com')
    await page.getByLabel(/passwort|password/i).first().fill('wrong-password')
    await page.getByRole('button', { name: /anmelden|sign in/i }).first().click()
    // Server error copy is "E-Mail-Adresse oder Passwort ist nicht
    // korrekt." (DE) / "Email or password is incorrect." (EN).
    await expect(
      page.getByText(/nicht korrekt|incorrect|not correct|falsch|ungültig|invalid/i).first(),
    ).toBeVisible({ timeout: 8_000 })
  })
})
