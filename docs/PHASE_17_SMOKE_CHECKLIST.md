# Phase 17 — 72-point Smoke Walk Checklist

> 18 surfaces × 4 browsers = 72 checkpoints. Engineer pre-fills
> automated-coverage cells (✓ or ✗ based on Playwright runs);
> manager fills the manual cells during the Week-3 final review.
> Every cell carries a date + signoff initial. Mobile may be ≥95%
> with documented carve-outs; desktop must be 100%.

## How to use this checklist

  1. **Engineer pre-fill (Week 2):** run the existing Playwright smoke
     suite against each browser profile in `playwright.config.ts`.
     The architect / auth / chamber / i18n / landing / seo / spine
     specs cover ~7 of the 18 surfaces; mark those cells from the
     run.
  2. **Manager manual fill (Week 3):** for each remaining cell, open
     the surface in the listed browser and verify the listed
     behaviour. Tick → date + initial.
  3. **At v1.0 tag:** every cell must be ✓ or NA-with-rationale.
     Desktop 100%; mobile may carry up to 5% NA (rounded up — i.e.,
     up to 2 of the 36 mobile cells).

## Browser matrix

| Code | Browser                | Why on the matrix |
| ---- | ---------------------- | ----------------- |
| DC   | Desktop Chrome (latest)| Primary user platform |
| DS   | Desktop Safari (latest)| macOS user share + WebKit divergence canary |
| iP13 | iPhone 13 (Safari mobile, viewport 390×844) | Mobile WebKit + small viewport |
| Px5  | Pixel 5 (Chrome mobile, viewport 393×851) | Mobile Chromium + Android touch quirks |

iPhone 13 + Pixel 5 are most reliably exercised via Playwright's
device emulation:

```ts
import { devices } from '@playwright/test'
const config = {
  projects: [
    { name: 'desktop-chrome',  use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop-safari',  use: { ...devices['Desktop Safari'] } },
    { name: 'iphone-13',       use: { ...devices['iPhone 13'] } },
    { name: 'pixel-5',         use: { ...devices['Pixel 5'] } },
  ],
}
```

For surfaces that depend on real touch hardware (drag-to-reorder,
gestures), validate on physical devices OR BrowserStack in addition.

## The 18 surfaces

For each, verify the listed acceptance + the Bayern SHA / smoke gates.

| #  | Surface                          | What "passes" looks like |
| -- | -------------------------------- | ------------------------ |
| 1  | `/` Landing page                 | Hero renders, CTA reachable, SEO title present, no unhandled errors |
| 2  | `/sign-up`                       | Form mounts, email/password validation, success → `/check-email` |
| 3  | `/sign-in`                       | Form mounts, password validation, invalid creds shows inline error |
| 4  | `/forgot-password`               | Form mounts, email submit → success state |
| 5  | `/reset-password`                | Reset form mounts (token URL), submit → success |
| 6  | `/verify-email`                  | Verify-email confirmation page renders (token URL) |
| 7  | `/dashboard`                     | Project list renders, "neues Projekt" CTA navigates to `/projects/new` |
| 8  | `/projects/new` Wizard           | PLZ step → Template step → spinner → workspace |
| 9  | `/projects/:id` Chat workspace   | Spine + Astrolabe + Stand-up render, MatchCut animation fires, CapturedToast on first capture |
| 10 | `/projects/:id/result` Overview  | Tabs render, Overview tab default, project name in title |
| 11 | `/projects/:id/result?tab=cost`  | Cost & Timeline tab content + bilingual copy |
| 12 | `/projects/:id/result?tab=procs` | Procedure & Documents tab content |
| 13 | `/projects/:id/result?tab=team`  | Team tab content + role list |
| 14 | `/result/share/:token` Anon view | Public read-only render; no auth prompts; no admin links |
| 15 | `/admin/logs/projects` (admin)   | Admin-gated render; non-admin sees friendly 403 |
| 16 | `/architect` (designer)          | Membership list renders for designer; non-designer 403 |
| 17 | `/architect/projects/:id/verify` | Verification panel lists pending qualifiers; "Bestätigen" CTA visible |
| 18 | `/impressum` + `/datenschutz` + `/agb` + `/cookies` | All four legal pages render; no `{{...}}` placeholders visible to user |

## The matrix (engineer pre-fill + manager final fill)

| #  | Surface                | DC | DS | iP13 | Px5 |
| -- | ---------------------- | -- | -- | ---- | --- |
| 1  | Landing                | ☐  | ☐  | ☐    | ☐   |
| 2  | Sign-up                | ☐  | ☐  | ☐    | ☐   |
| 3  | Sign-in                | ☐  | ☐  | ☐    | ☐   |
| 4  | Forgot-password        | ☐  | ☐  | ☐    | ☐   |
| 5  | Reset-password         | ☐  | ☐  | ☐    | ☐   |
| 6  | Verify-email           | ☐  | ☐  | ☐    | ☐   |
| 7  | Dashboard              | ☐  | ☐  | ☐    | ☐   |
| 8  | Wizard                 | ☐  | ☐  | ☐    | ☐   |
| 9  | Chat workspace         | ☐  | ☐  | ☐    | ☐   |
| 10 | Result Overview        | ☐  | ☐  | ☐    | ☐   |
| 11 | Result Cost & Timeline | ☐  | ☐  | ☐    | ☐   |
| 12 | Result Procs & Docs    | ☐  | ☐  | ☐    | ☐   |
| 13 | Result Team            | ☐  | ☐  | ☐    | ☐   |
| 14 | Anon shared result     | ☐  | ☐  | ☐    | ☐   |
| 15 | Admin Logs             | ☐  | ☐  | ☐    | ☐   |
| 16 | Architect dashboard    | ☐  | ☐  | ☐    | ☐   |
| 17 | Verification panel     | ☐  | ☐  | ☐    | ☐   |
| 18 | Legal pages (4 in 1)   | ☐  | ☐  | ☐    | ☐   |

**Cell legend:**
- ☐ — not yet checked
- ✓ DD-MM rk — passed on date by initial
- ✗ DD-MM rk — failed on date; bug filed in `<tracker>` issue `<#>`
- NA DD-MM rk — not applicable on this browser; rationale captured below

## NA rationales (mobile carve-outs)

Document any cell marked NA below with a one-line rationale.

| # | Browser | Rationale |
| - | ------- | --------- |
| _example_ | iP13 | Chamber Spine drag-to-reorder uses pointer events that iOS Safari doesn't dispatch reliably; gesture deferred to post-v1 |

## Daily-gate evidence at tag

```sh
npm run verify:bayern-sha
# expected: ✓ MATCH at b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471

npm run smoke:citations
# expected: 110/110 fixtures green (Phase 11 + Phase 12 + Phase 13 + drift checks)

npx tsc --noEmit -p .
# expected: clean

npm run build
# expected: green; bundle ≤ 300 KB gz
```

Capture each command's last 5 lines of output below before tagging:

```
<paste verify:bayern-sha output here on tag day>
```

```
<paste smoke:citations summary here on tag day>
```

```
<paste tsc output (or "clean — no output") here on tag day>
```

```
<paste build output (last 5 lines incl. verify:bundle) here on tag day>
```

## Sign-off

| Reviewer | Role | Date | Initial |
| -------- | ---- | ---- | ------- |
| `<MANAGER_NAME>` | Manager | _ | _ |
| `<ENGINEER_NAME>` | Build engineer | _ | _ |
| `<COUNSEL_NAME>` | Counsel (legal pages only) | _ | _ |

**Tag command runs only after this sign-off section is complete.**
