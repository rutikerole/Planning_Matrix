# Planning_Matrix — launch checklist

> Run through this before flipping the switch on the public URL.
> Phase 8 ships every code-side item; the operational checks below are Rutik's gate.

## 1. Legal — MANDATORY before public launch

- [ ] **Impressum placeholders filled.** Open `src/features/legal/pages/ImpressumPage.tsx` and replace every `{{...}}`:
  - `{{ANBIETER_NAME}}` — your full legal name (or registered business name)
  - `{{ANBIETER_STRASSE_HAUSNUMMER}}` — ladungsfähige Anschrift (capable of receiving legal service)
  - `{{ANBIETER_PLZ}}` `{{ANBIETER_ORT}}` — postcode + city
  - `{{KONTAKT_TELEFON}}` — telephone number (mandatory under § 5 DDG)
  - `{{KONTAKT_EMAIL}}` — functional email in plain text
  - `{{UST_ID_HINWEIS}}` — typically "noch nicht erteilt" if not registered
  - `{{HANDELSREGISTER_HINWEIS}}` — "nicht eingetragen" if not in HR
- [ ] **Datenschutz placeholders filled** (same names appear in `DatenschutzPage.tsx`).
- [ ] **Lawyer review of legal pages** if budget permits. Especially the AGB liability clause.
- [ ] **DPAs signed** (Auftragsverarbeitungsverträge — Art. 28 GDPR):
  - [ ] Anthropic — API Console → Privacy
  - [ ] Supabase — Dashboard → Settings → DPA
  - [ ] Sentry — Account Settings → Legal
  - [ ] PostHog — Account Settings → Legal
  - [ ] Vercel — Dashboard → Settings
  Archive copies in a secure folder (NOT this repo).

## 2. Operational

- [ ] **Vercel production env vars set:**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SENTRY_DSN` (de.sentry.io project)
  - `VITE_POSTHOG_KEY` (eu.posthog.com project)
  - `ANTHROPIC_API_KEY` (Edge Function env, not client)
  - `SUPABASE_SERVICE_ROLE_KEY` (Edge Function env)
- [ ] **Migrations applied** in production Supabase (Dashboard → SQL Editor):
  - 0009 (city column)
  - 0010 (city muenchen widening)
  - 0011 (bplan-lookup rate limits)
- [ ] **Edge Functions deployed:**
  ```
  supabase functions deploy chat-turn --project-ref <ref>
  supabase functions deploy bplan-lookup --project-ref <ref>
  ```
- [ ] **Domain pointed correctly** (custom domain or vercel.app subdomain).
- [ ] **Supabase auto-backup enabled** (Dashboard → Settings → Backups).

## 3. Monitoring sign-off

- [ ] **Sentry** captures a deliberate error from production: open `https://planning-matrix.vercel.app/`, run `throw new Error('test')` in console, confirm the event appears in de.sentry.io within ~30 s with `plot_address` / `email` fields scrubbed.
- [ ] **PostHog** captures pageviews after consent: accept all cookies on a fresh session, navigate to /projects/new, confirm `landing_viewed` + `wizard_q1_completed` appear in eu.posthog.com.
- [ ] **No PII in either telemetry** — search both for the test plot address; neither should match.

## 4. Lighthouse baseline (Rutik runs after deploy)

Run on `https://planning-matrix.vercel.app/` (homepage), `/projects/new` (wizard), and one open chat workspace. Target: ≥ 90 / 95 / 95 / 90.

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Homepage | __ | __ | __ | __ |
| Wizard (Q2) | __ | __ | __ | __ |
| Chat workspace | __ | __ | __ | __ |

**Capture cannot run from the build environment — values must be filled in here after deploy.**

## 5. Mozilla Observatory

- [ ] Run [Observatory](https://developer.mozilla.org/en-US/observatory) against the live URL after deploy.
- [ ] Target grade: **A** or better.
- [ ] If lower: open the report, fix any header gaps in `vercel.json` (Phase 8 Commit 15 set strict CSP + standard headers; should be ≥ A).

## 6. Accessibility verification

- [ ] **Keyboard-only walkthrough:** Tab from page load to "Projekt anlegen" — every interactive element is reachable, focus is visible, Enter activates buttons / links.
- [ ] **Skip link works:** Tab once on a fresh page load. The "Zum Inhalt springen" link should appear in the top-left.
- [ ] **Screen reader smoke test:** Drive the wizard with VoiceOver (Mac) or NVDA (Windows). The model emits the moderator's first question in a way that screen readers announce.
- [ ] **axe-core in DevTools** (Chrome): zero serious / critical violations on each primary route.

## 7. Mobile

- [ ] **iPhone SE (375 × 667)** real device or DevTools — wizard, chat workspace, result page all render without horizontal scroll, all buttons ≥ 44×44 px, body text ≥ 14 px.
- [ ] **iPhone 13 Pro (390 × 844)** — same.
- [ ] **One-thumb test** — drive the wizard from address-input to "Projekt anlegen" using only the right thumb.

## 8. Communication

- [ ] **OG image** renders correctly via [Twitter card validator](https://cards-dev.twitter.com/validator) and a LinkedIn post inspector.
- [ ] **Email reply-to** in Impressum is active and monitored.

## 9. Tech-debt confirmed clean

- [x] TestProject schema enum (Phase 8 Commit 2)
- [x] freshness-check stderr progress (Phase 8 Commit 2)
- [x] MUENCHEN_POSTCODES verified against stadtbezirke.json (Phase 8 Commit 2)
- [x] Playwright tests free of Erlangen hardcodes (Phase 8 Commit 2 — verified, no changes needed)

## 10. Sign-off

When every box above is checked, the product is launch-ready. Domain announce, social posts, customer outreach can proceed.

If a box can't be checked: do not launch. Fix the gap or accept the gap as a documented compromise (write it down here under a "known issues" section so future-you remembers what was deferred).
