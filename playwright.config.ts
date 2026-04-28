// ───────────────────────────────────────────────────────────────────────
// Phase 4.1 #126 — Playwright config
//
// Smoke-suite scope: the high-value happy paths a regression in any
// of which would block shipping. Bigger flows (chat round-trip with
// stubbed Anthropic, file upload, share-token anon access, axe-core
// integration) are deferred to a Phase 4.2 follow-up — see the
// `tests/smoke/README.md` (ships with this commit) for the rationale
// and the planned coverage matrix.
//
// Tests stub all backend calls at the network layer (Playwright's
// `route` API). Production Supabase is never hit. CI runs against a
// vite-preview server on port 4173.
// ───────────────────────────────────────────────────────────────────────

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: process.env.CI
    ? {
        command: 'npm run preview -- --port 4173 --host 127.0.0.1',
        url: 'http://localhost:4173',
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
