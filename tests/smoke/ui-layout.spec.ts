// ───────────────────────────────────────────────────────────────────────
// UI-sweep (fix/ui-layout-sweep) — layout/overlap drift guards.
//
// Bounding-box regression checks for the defect classes fixed in the
// Rostock/MV live-walk sweep. Each test pins the SYSTEM, not the
// instance:
//
//   D-02/03/04 — the preliminary-state banner renders IN DOCUMENT FLOW
//                (never overlapping content cards) and collapses to a
//                persistent chip that survives tab switches.
//   D-01       — the result hero header shrinks to a compact band on
//                scroll (sticky-shrink), so chrome stops eating the
//                viewport.
//   D-06       — at max scroll, tab content clears the sticky bottom
//                action bar (nothing hidden behind it).
//   D-07/08    — chat: the just-sent turn is not greyed to "disabled"
//                (distance fade floors at 0.55, d1 = 0.85), and the
//                JumpToLatest pill straddles the input-zone edge
//                instead of floating over thread content.
//   D-11       — the send button has a visibly distinct enabled state.
//
// Backend fully stubbed (mirrors chamber.spec.ts / architect.spec.ts).
// Local run (see tests/smoke/README.md + reference_playwright_apprun):
//   VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=x \
//     npm run dev   # then:
//   PLAYWRIGHT_BASE_URL=http://localhost:5173 npx playwright test \
//     tests/smoke/ui-layout.spec.ts --project=chromium-desktop
// ───────────────────────────────────────────────────────────────────────

import { test, expect, type Page, type Route } from '@playwright/test'

const PROJECT_ID = 'a2d52ec1-6955-4443-95eb-cc2a2a759b14'
const NOW = '2026-06-10T09:00:00Z'
const Q = { source: 'DESIGNER', quality: 'ASSUMED', setAt: NOW, setBy: 'assistant' }

// MV ("thin" state) project → the preliminary banner is eligible.
const STATE = {
  schemaVersion: 1,
  templateId: 'T-05',
  facts: [
    { key: 'project.bundesland', value: 'mv', qualifier: Q },
    { key: 'site.address', value: 'Lange Straße 14, 18055 Rostock', qualifier: Q },
  ],
  procedures: [
    {
      id: 'P-63',
      title_de: 'Vereinfachtes Verfahren (§ 63 LBauO M-V)',
      title_en: 'Simplified building permit procedure (§ 63 LBauO M-V)',
      status: 'erforderlich',
      rationale_de: 'Wahrscheinlichster Pfad.',
      rationale_en: 'Most likely path.',
      qualifier: Q,
    },
  ],
  documents: [
    {
      id: 'D-Asbest',
      title_de: 'Asbest/PCB-Voruntersuchung (1995)',
      title_en: 'Asbestos/PCB pre-investigation (1995)',
      status: 'erforderlich',
      required_for: ['P-63'],
      produced_by: ['R-Architekt'],
      qualifier: Q,
    },
  ],
  roles: [
    {
      id: 'R-Bauherr',
      title_de: 'Bauherr',
      title_en: 'Owner',
      needed: true,
      rationale_de: 'Sie. Beauftragt das Projekt und trägt die Verantwortung.',
      rationale_en: 'You. Commissions the project and carries responsibility.',
      qualifier: Q,
    },
  ],
  recommendations: [],
  areas: { A: { state: 'ACTIVE' }, B: { state: 'ACTIVE' }, C: { state: 'PENDING' } },
  questionsAsked: [],
  lastTurnAt: NOW,
}

const PROJECT = {
  id: PROJECT_ID,
  owner_id: 'user-1',
  intent: 'sanierung_umbau',
  has_plot: true,
  plot_address: 'Lange Straße 14, 18055 Rostock',
  bundesland: 'mv',
  template_id: 'T-05',
  name: 'Renovation Rostock',
  status: 'in_progress',
  state: STATE,
  created_at: NOW,
  updated_at: NOW,
}

const MSG = (over: Record<string, unknown>) => ({
  project_id: PROJECT_ID,
  specialist: null,
  input_type: null,
  input_options: null,
  allow_idk: false,
  thinking_label_de: null,
  likely_user_replies: null,
  tool_input: null,
  user_answer: null,
  client_request_id: null,
  model: null,
  input_tokens: null,
  output_tokens: null,
  cache_read_tokens: null,
  cache_write_tokens: null,
  latency_ms: null,
  ...over,
})

// Three turns: the USER turn sits at distance 1 from the latest
// assistant — the exact D-07 live-walk state.
const MESSAGES = [
  MSG({
    id: 'm-1',
    role: 'assistant',
    specialist: 'moderator',
    content_de:
      'Willkommen — wir begleiten Ihr Sanierungsprojekt in Rostock. Betrifft Ihr Vorhaben tragende Bauteile?',
    content_en:
      'Welcome — we are accompanying your renovation project in Rostock. Will it affect load-bearing elements?',
    created_at: '2026-06-10T08:50:00Z',
  }),
  MSG({
    id: 'm-2',
    role: 'user',
    content_de:
      'Ja, das Projekt betrifft ein tragendes Element. Wir ersetzen eine tragende Innenwand durch einen Stahlunterzug.',
    content_en:
      "Yes, the project affects a load-bearing element. We're replacing one load-bearing interior wall with a steel beam.",
    created_at: '2026-06-10T08:52:00Z',
  }),
  MSG({
    id: 'm-3',
    role: 'assistant',
    specialist: 'synthesizer',
    content_de: 'Verstanden — Standsicherheitsnachweis erforderlich.',
    content_en: 'Understood — structural verification required.',
    created_at: '2026-06-10T08:54:00Z',
  }),
]

async function stubBackend(page: Page) {
  await page.route('**/auth/v1/**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'user-1', email: 'owner@example.com', role: 'authenticated' }),
    }),
  )
  for (const [re, body] of [
    [/\/rest\/v1\/profiles/, '[]'],
    [/\/rest\/v1\/project_members/, '[]'],
    [/\/rest\/v1\/projects/, JSON.stringify([PROJECT])],
    [/\/rest\/v1\/messages/, JSON.stringify(MESSAGES)],
    [/\/rest\/v1\/project_events/, '[]'],
  ] as const) {
    await page.route(re, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body }),
    )
  }
}

async function seedAuth(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'sb-localhost-auth-token',
      JSON.stringify({
        access_token: 'fake-jwt',
        token_type: 'bearer',
        expires_at: 9999999999,
        refresh_token: 'fake-refresh',
        user: { id: 'user-1', aud: 'authenticated', role: 'authenticated', email: 'owner@example.com' },
      }),
    )
    window.localStorage.setItem('i18nextLng', 'en')
  })
}

async function dismissCookies(page: Page) {
  const btn = page.getByRole('button', { name: /Essential only|Nur essenziell/i })
  if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await btn.click()
    await page.waitForTimeout(250)
  }
}

test.describe('UI layout guards', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackend(page)
    await seedAuth(page)
  })

  test('result: banner in flow + chip persistence + header shrink + footer clearance', async ({
    page,
  }) => {
    await page.goto(`/projects/${PROJECT_ID}/result`)
    await dismissCookies(page)

    // D-02 — banner expanded and IN FLOW: no vertical overlap with the
    // first content block.
    const banner = page.locator('[data-prelim-banner="expanded"]')
    await expect(banner).toBeVisible({ timeout: 10_000 })
    const bannerBox = (await banner.boundingBox())!
    const firstCard = page.getByText('EXECUTIVE READ').first()
    await expect(firstCard).toBeVisible()
    const cardBox = (await firstCard.boundingBox())!
    expect(bannerBox.y + bannerBox.height).toBeLessThanOrEqual(cardBox.y + 1)

    // D-02 (decided behavior) — auto-collapse to a persistent chip.
    const chip = page.locator('[data-prelim-banner="collapsed"]')
    await expect(chip).toBeVisible({ timeout: 8_000 })

    // D-01 — sticky-shrink: compact header is meaningfully shorter.
    const header = page.locator('[data-print-target="result-header"]')
    const expandedH = (await header.boundingBox())!.height
    // window.scrollTo, not mouse.wheel — the latter is unsupported on
    // mobile WebKit and this guard runs on all four browser projects.
    await page.evaluate(() => window.scrollTo(0, 600))
    await expect(header).toHaveAttribute('data-header-state', 'compact')
    await page.waitForTimeout(400)
    const compactH = (await header.boundingBox())!.height
    expect(compactH).toBeLessThan(expandedH * 0.6)

    // D-03 — tab switch must NOT replay the full banner.
    await page.getByRole('tab', { name: /Procedure & documents/i }).click()
    await expect(page.locator('[data-prelim-banner="expanded"]')).toHaveCount(0)

    // D-06 — at max scroll the tab panel's last block clears the sticky
    // bottom action bar.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)
    const footer = page.locator('footer', { hasText: /Take it home/i }).first()
    const fBox = (await footer.boundingBox())!
    const lastContent = page.locator('main [role="tabpanel"] > *:last-child').first()
    const lBox = (await lastContent.boundingBox())!
    expect(lBox.y + lBox.height).toBeLessThanOrEqual(fBox.y + 1)
  })

  test('chat: distance-1 turn not greyed + jump pill in chrome band + send states', async ({
    page,
  }) => {
    await page.goto(`/projects/${PROJECT_ID}`)
    await dismissCookies(page)
    const main = page.locator('[data-chamber-main]')
    await expect(main).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(800)

    // D-07 — the just-sent user turn (distance 1) renders ≥ 0.8 opacity,
    // not the old flat 0.5 "disabled" grey.
    const userLi = page.locator('li[data-message-id="m-2"]')
    await expect(userLi).toBeVisible()
    await page.mouse.move(5, 5) // park the cursor so :hover can't force 1
    const opacity = await userLi.evaluate((el) => getComputedStyle(el).opacity)
    expect(Number(opacity)).toBeGreaterThan(0.8)

    // D-08 — scrolled away, the JumpToLatest pill straddles the input
    // zone's paper floor instead of floating over thread content.
    await main.evaluate((el) => el.scrollTo({ top: 0 }))
    const pill = page.getByRole('button', { name: /Jump to live|Zur Live-Stelle/i })
    await expect(pill).toBeVisible({ timeout: 5_000 })
    const pillBox = (await pill.boundingBox())!
    const floor = main.locator('div.sticky.bottom-0 div.bg-paper').first()
    const floorBox = (await floor.boundingBox())!
    expect(pillBox.y + pillBox.height).toBeGreaterThan(floorBox.y)

    // D-11 — send button visibly changes state once the composer has text.
    const textarea = page.getByPlaceholder(/Reply, or pick an option/i)
    const send = page.getByRole('button', { name: /^(Send|Senden)$/i })
    const bgEmpty = await send.evaluate((el) => getComputedStyle(el).backgroundColor)
    await textarea.fill('Test message')
    await page.waitForTimeout(200)
    const bgTyped = await send.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bgTyped).not.toBe(bgEmpty)
  })
})
