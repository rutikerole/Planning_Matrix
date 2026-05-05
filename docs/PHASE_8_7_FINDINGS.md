# Phase 8.7 — Wizard Layout · One-Screen Discipline · Findings

> **Scope:** Surgical layout sweep on `/projects/new`. Three layout bugs.
> No new features. No persona changes. No data file changes. No SQL.
> Commits: 1 findings · 2 footer + Legal dropdown · 3 Step 1 fit · 4 Step 2 map.
> Render Gate enforced on commits 3 + 4: 1280×800 + 1440×900 + 375×812.

---

## 0. Audit summary

| Bug | Surface | Root cause | Fix lane |
|---|---|---|---|
| 1 | Step 1 scrolls past viewport | Headline + 4×2 sketch grid + help-link + action row + footer all stack inside `<main className="py-16">`; sketch tiles are ~180px each so two rows alone consume ~440px of an 800px viewport. | Repackage as 1×4 primary + 1×4 secondary chip row, tighten header rhythm, sticky action row, drop footer (Bug 2). |
| 2 | Wizard + workspace show marketing footer | `SiteFooter` is mounted globally in `App.tsx`; hide-list is a denylist (chat workspace + share route) and the wizard isn't in it. | Convert to an allowlist: render only on `/`, `/dashboard`, `/auth/*`, `/impressum`, `/datenschutz`, `/agb`, `/cookies`. |
| 3 | Step 2 map gated on Yes; column overflows | `QuestionPlot.tsx:244` short-circuits the right column until `hasPlot === true`, and the grid row only clamps height for Yes; on No or initial load there is nothing on the right and the left lane is a long form. | Mount the map on initial render at München zoom 13. 2-col grid always. No-state dims map + adds badge. |

The locks listed in the brief — Edge Function, persona, SQL, Phase 7.10/8.5/8.6 surfaces, map provider, Nominatim, WMS overlay, sketch SVGs, intent template logic — were verified untouched by the planned diff.

---

## 1. Bug 1 — Step 1 scrolls past viewport

### Reproduction
At 1280×800 with the build on `main` (commit `46899d6`), the user sees:
- 64–72px header zone (Wordmark + DE/EN + Cancel)
- 32px progress hairline padding
- 64px `<main>` `py-16` top padding
- ~64px headline (`clamp(2.5rem, 6vw, 4rem)`)
- ~60px sub + sub padding
- ~440px sketch grid (`md:grid-cols-4` + 2 rows × 180px)
- ~28px help link
- ~80px action row + margin
- ~64px main bottom padding
- ~120px footer

≈ 940px against an 800px viewport. Continue button + footer below the fold.

### Code anchors
- `src/features/wizard/components/QuestionIntent.tsx:71` — `grid-cols-1 sm:grid-cols-2 md:grid-cols-4` + 8 cards = 4×2 on lg.
- `src/features/wizard/components/WizardShell.tsx:101` — `<main className="… py-16">` and `max-w-3xl` for step 1.
- `src/features/wizard/styles/sketches.css:7` — `.sketch` padding `24px 20px 20px` + `gap: 14px` + `svg { 120×80 }` + label = ~170–180px tall.

### Fix lane
- **Tile reorganization (data-driven, no copy changes):** the existing `INTENT_VALUES_V3` order already places the four high-volume intents first (`neubau_einfamilienhaus`, `neubau_mehrfamilienhaus`, `sanierung`, `umnutzung`). Render the first four as the existing `<SketchCard>` (visual hero) and the last four (`abbruch`, `aufstockung`, `anbau`, `sonstige`) as small chips below.
- **Tighten header rhythm:** drop `<main>` vertical padding from `py-16` to `py-8 md:py-10`; slim `gap-7` → `gap-5` on the column. Headline copy unchanged.
- **Sticky action row:** action row anchored to the bottom of the viewport via the WizardShell becoming a `flex flex-col` column where `<main>` is `flex-1 min-h-0` and the action row sits as a sibling footer slot inside the question. Use a layout that the page content fills — no `position: fixed` (would clip the help collapsible). Approach: wrap step content in `flex flex-col gap-5 min-h-full` and use `mt-auto` on the action row.
- **Render Gate targets:** Step 1 fits within 1280×800 and 1440×900 with no scroll. On 375×812, primary tiles stack 2×2 and chips wrap as needed.

### Files
- `src/features/wizard/components/QuestionIntent.tsx` — split primary/secondary, sticky action row.
- `src/features/wizard/components/WizardShell.tsx` — viewport-height layout (`min-h-dvh` + `<main className="flex-1 min-h-0 …">`); reduced vertical padding.
- `src/features/wizard/styles/sketches.css` — add `.sketch.chip` modifier (smaller padding, no SVG, single-line label + code chip).

### Locks
Sketch SVGs unchanged. Intent ordering unchanged. Template-selection unchanged. Help-link copy + body copy unchanged.

---

## 2. Bug 2 — White footer strip on wizard + chat

### Reproduction
On `/projects/new`, the page renders the marketing footer at the bottom:
> Planning Matrix · München · v1.0 · Impressum · Privacy · Terms · Cookies · Cookie settings

The footer steals viewport space (~120px) and breaks the paper-tone atmosphere of the wizard.

Per Phase 7.10, chat workspace was already opted out by the regex denylist in `SiteFooter.tsx:30`. The wizard, the result page, and any future focused surface fall through.

### Code anchors
- `src/App.tsx:19` — `<SiteFooter />` mounted globally, no route gating at the mount point.
- `src/components/SiteFooter.tsx:30` — denylist (`/projects/[uuid]…` and `/result/share/`). Wizard URL `/projects/new` matches neither pattern, so the footer renders.

### Fix lane
- Convert `SiteFooter` to an **allowlist**: render only on
  - `/`
  - `/dashboard`
  - `/sign-up` · `/sign-in` · `/forgot-password` · `/reset-password` · `/check-email` · `/verify-email`
  - `/impressum` · `/datenschutz` · `/agb` · `/cookies`
- Anything else → return `null`. Keeps the `force` escape hatch for the legal pages that already render their own footer (none currently use it).
- **Legal dropdown:** the brief asks for a Legal entry in the user avatar dropdown so users mid-workspace can still reach legal pages. The shared `<UserMenu>` (in `AppHeader.tsx`) is reused by:
  - `AppHeader` itself → the global header, used by Result Workspace
  - `SpineFooter` → the chat workspace
  Adding the Legal entry there covers both focused surfaces. The wizard has no `<UserMenu>` (its WizardShell uses Cancel instead) and the user is mid-flow for ~20s — adding a legal popover there would be noise; we skip it.

### Files
- `src/components/SiteFooter.tsx` — allowlist gate.
- `src/components/shared/AppHeader.tsx` — extend `<UserMenu>` with a Legal section (4 links + Cookie settings reopen).
- `src/locales/de.json` + `src/locales/en.json` — `appHeader.legal.{title,impressum,privacy,terms,cookies,cookieSettings}` and `wizard.q2.mapWithoutPlot` for the No-state map badge (Bug 3).

### Locks
Footer copy unchanged. Cookie banner reopen flow unchanged. Phase 7.10/8.5/8.6 surfaces untouched.

---

## 3. Bug 3 — Step 2 map gated + column overflows

### Reproduction
On `/projects/new` step 2 with `hasPlot === null` (initial), the right column is empty paper. The user sees only:
- Header + progress
- Eyebrow / headline / sub
- Yes/No toggle
- Action row + footer

Clicking Yes mounts the map. The intended design (per the v3 atelier screenshots) is map-as-visual-anchor from page load.

Additionally on Yes the left column with address input + helper + coverage + BPlanCheck pill + map hint stacks below the map height on viewports under ~860px tall.

### Code anchors
- `src/features/wizard/components/QuestionPlot.tsx:244` — `const showMap = hasPlot === true`.
- `src/features/wizard/components/QuestionPlot.tsx:265–268` — grid row `lg:grid-rows-[minmax(460px,720px)]` only applied when `hasPlot === true`.
- `src/features/wizard/components/QuestionPlot.tsx:402–445` — right column wrapped in `{showMap ? … : null}`.
- `src/features/wizard/components/PlotMap/PlotMap.tsx:35–40` — `MUENCHEN_CENTER` + `DEFAULT_ZOOM = 13` already prepared; nothing else needs to change in the map for the always-on render.

### Fix lane
- Mount the right column unconditionally. Map renders at München zoom 13 with no pin from page load. (`hasPlot === null` keeps coords cleared, so `MapInvalidationGuard` + `FlyToOnResolve` no-op until address typed.)
- 2-col grid `lg:grid-cols-[30%_70%] lg:grid-rows-[minmax(520px,calc(100dvh-260px))]` so the row height tracks the viewport instead of a fixed 720px ceiling. Subtracting ~260px (header + progress + page padding + action row) keeps the row inside the viewport at 800px tall while expanding gracefully on 900–1200px.
- **No-state UX:** when `hasPlot === false`, dim the map wrapper to `opacity: 0.7` and overlay a clay-tinted badge: `wizard.q2.mapWithoutPlot` ("Without a plot, we proceed with assumptions."). Reduced-motion: instant.
- **Yes-state:** preserve all existing behaviour (geocode, pin, popover open, B-Plan lookup, suggested name).
- The address input + helper + coverage + outside-München warning + soft notice card remain in the left column; the existing `AnimatePresence` for the address block stays.

### Files
- `src/features/wizard/components/QuestionPlot.tsx` — drop the `showMap` short-circuit, expand the grid row to viewport-track, add No-state dim + badge.
- `src/features/wizard/components/PlotMap/PlotMap.tsx` — no functional change; verify the empty-state hint chip still renders before a pin lands (it does, line 333). Delete the now-redundant `min-h-[460px]` floor only on lg (mobile keeps it).
- `src/locales/{de,en}.json` — `wizard.q2.mapWithoutPlot`.

### Locks
Map provider, geocoding, WMS overlay, B-Plan Edge Function, popover schema, suggestion logic — all unchanged. The `outsideMunichConfirmed` Phase 5 PLZ gate is preserved. Sticky bottom action row from Bug 1's WizardShell rework picks up step 2 for free.

---

## 4. File plan (locked)

| Path | Bug | Change kind |
|---|---|---|
| `src/components/SiteFooter.tsx` | 2 | Allowlist gate |
| `src/components/shared/AppHeader.tsx` | 2 | Add Legal section to `<UserMenu>` |
| `src/locales/de.json`, `src/locales/en.json` | 2, 3 | New strings (`appHeader.legal.*`, `wizard.q2.mapWithoutPlot`) |
| `src/features/wizard/components/WizardShell.tsx` | 1, 3 | Viewport-height layout, sticky action slot |
| `src/features/wizard/components/QuestionIntent.tsx` | 1 | 1×4 primary + chip row, sticky action |
| `src/features/wizard/styles/sketches.css` | 1 | `.sketch.chip` variant |
| `src/features/wizard/components/QuestionPlot.tsx` | 3 | Drop `showMap` gate; viewport-tracking grid; No-state dim |
| `src/features/wizard/components/PlotMap/PlotMap.tsx` | 3 | Drop `min-h-[460px]` on lg only |

**Out of scope:** persona prompts, Edge Function, SQL, dashboard, Result Workspace, ChatWorkspace, AppHeader chrome (other than `<UserMenu>` Legal), Nominatim, WMS overlay, map provider, intent → template logic.

---

## 5. Render Gate plan

Commits 3 + 4 land with screenshots at:
- 1280×800 (primary target — matches typical laptop dock)
- 1440×900 (fits comfortably with breathing room)
- 375×812 (mobile baseline — no horizontal scroll)

Gate fails if any viewport requires scroll to reach the action row.

---

## 6. Standard

A user lands on `/projects/new`. Step 1 is one calm screen — 4 primary tiles, 4 secondary chips, Continue. No scroll, no footer. Step 2 lands with the München map already alive on the right, anchoring the visual frame. They click Yes, type an address, and the map re-centers smoothly. They click "Set the table →" and they're in the chat workspace. The whole wizard reads as a focused two-step ritual, not a form to scroll.
