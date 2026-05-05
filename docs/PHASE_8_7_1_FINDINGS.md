# Phase 8.7.1 — Hotfix · Tile Parity + Footer Tightening · Findings

> **Scope:** Two visual misses from Phase 8.7. Surgical hotfix.
> Commits: 1 findings · 2 tile parity · 3 footer tightening.
> Render Gate enforced on commits 2 + 3 (1280×800 + 1440×900 + 375×812).

---

## 0. Audit summary

| Bug | Surface | Root cause | Fix lane |
|---|---|---|---|
| 1 | Step 1 secondary 4 (Demolition · Storey addition · Side extension · Something else) shipped as label-only chips while the primary 4 keep full house illustrations — reads as "tier-1 + tier-2." | Phase 8.7's brief said "small chips, single row below" and the implementation interpreted that literally. The brief never specified the secondary tiles must keep their icons. | Restore unified 4×2 grid: all 8 SketchCards equal class. Tighten tile vertical metrics (padding 24→16, SVG 120×80→96×64, gap-3) so all 8 fit inside the existing viewport budget. Remove the now-unused `.sketch.chip` CSS variant. |
| 2 | SiteFooter on dashboard / landing / auth is ~100–200px of vertical waste with a near-white `bg-paper` strip that visually steps out of the warmer `bg-pm-paper` substrate. | Phase 8.7 corrected *where* the footer renders but never sized it. `<footer className="bg-paper">` + `<div className="py-8 …">` + a stacked wordmark + nav cluster gave it ~96px of pure footer + an off-tone paper. | Single horizontal row, `py-3`, max ~52px desktop / ~80px mobile (wraps once). `bg-pm-paper` (warm) instead of `bg-paper` (HSL near-white). 5 legal entries inline with `·` separators. |

The locks listed in the brief — Phase 8.7 footer route allowlist, UserMenu Legal section, Step 2 layout, map ungating, dashboard pb-12, persona / Edge Function / SQL — were verified untouched by the planned diff.

---

## 1. Bug 1 — Step 1 lost tile parity

### Reproduction
On the deployed `main` (commit `6659106`), `/projects/new` step 1 renders:
- Top row: 4 large SketchCards (~180px tall) with full SVG, label, T-XX code.
- Bottom row: 4 `.sketch.chip` pills (~44px tall) with **only** label + code, no SVG.

Visual hierarchy reads as "4 first-class options + 4 second-class footnotes." The 4 demoted intents are real project types, not afterthoughts:
- Demolition (T-05) — a standalone permit task with its own Bauamt path.
- Storey addition (T-06) — a substantial Aufstockung project.
- Side extension (T-07) — Anbau, distinct planning-law treatment from new builds.
- Something else (T-08) — catch-all that still warrants a real surface.

### Code anchors
- `src/features/wizard/components/QuestionIntent.tsx:25` — `PRIMARY_INTENTS` and `SECONDARY_INTENTS` split (Phase 8.7).
- `src/features/wizard/components/QuestionIntent.tsx:96` — primary row `grid-cols-2 lg:grid-cols-4` of `<SketchCard>`.
- `src/features/wizard/components/QuestionIntent.tsx:111` — secondary row, inline `<button>` with `.sketch.chip` class, no SVG.
- `src/features/wizard/styles/sketches.css:148` — `.sketch.chip` variant added in Phase 8.7 (no SVG, label + code horizontal pill).

### Fix lane
- **Single 4×2 grid, all 8 `<SketchCard>`s.** Drop the primary/secondary split and the inline secondary `<button>` block.
- **Tile metrics:** tighten `.sketch` to fit a 2-row layout in viewport.
  - `padding: 24px 20px 20px` → `16px 16px 14px`
  - `gap: 14px` → `10px`
  - `svg { 120×80 }` → `svg { 96×64 }`
  - Tile total height: ~180px → ~140-150px.
- **Row gap:** `gap-3` (12px) preserved between rows.
- **Page math at 1280×800:** top chrome ~110 + main pad ~48 + headline block ~95 + 2 rows × 145 + 12 gap = 302 + help link ~20 + action row ~68 + breathing space ~30 ≈ **673px** vs 800. Fits.
- **Mobile (375×812):** `grid-cols-2 lg:grid-cols-4` → 2-col × 4-row stack. Tile aspect ratio holds; minor scroll acceptable per brief.
- **Cleanup:** delete `.sketch.chip` block from `sketches.css` since nothing else uses it.

### Files
- `src/features/wizard/components/QuestionIntent.tsx` — collapse to single grid; remove `PRIMARY_INTENTS` / `SECONDARY_INTENTS` constants and the inline chip block.
- `src/features/wizard/styles/sketches.css` — tighten `.sketch` base metrics; remove `.sketch.chip` variant.

### Locks
Sketch SVGs unchanged. Intent ordering unchanged (`INTENT_VALUES_V3`). Template-selection unchanged. Help-link copy + body copy unchanged. WizardShell viewport-fit chain (Phase 8.7) preserved — tile shrinkage is the only knob.

---

## 2. Bug 2 — Dashboard footer is too tall and off-tone

### Reproduction
On `/dashboard` and `/`, the footer renders as a ~96-100px tall horizontal band:
- `<footer className="border-t border-border/40 bg-paper">`
- `<div className="… py-8 flex flex-col gap-6 md:flex-row">`
- Left: `Planning Matrix` (`text-[18px]`) stacked above `München · v1.0` (`text-[12px]`)
- Right: 5 nav items (`text-[13px]`)

Combined with the dashboard `<main>`'s own `pb-12` (48px), the visual gap between the last dashboard content row and the footer wordmark is ~80px of empty paper. The footer also reads brighter than the dashboard substrate because `bg-paper` (HSL `38 30% 97%`, ~ near-white) steps out of `bg-pm-paper` (`#f2ede1`, warmer cream) used by every project surface.

### Code anchors
- `src/components/SiteFooter.tsx:54` — `<footer className="border-t border-border/40 bg-paper">`.
- `src/components/SiteFooter.tsx:55` — `<div className="… py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">`.
- `src/components/SiteFooter.tsx:56-64` — left cluster, two-line wordmark + meta.
- `tailwind.config.js:110` — `paper: 'hsl(var(--paper))'` (near-white).
- `tailwind.config.js:152` — `'pm-paper': 'var(--pm-paper)'` (warm `#f2ede1`, the project canon).

### Fix lane
- **Single horizontal row, all in one line.** Left = `Planning Matrix · München · v1.0` as one `<p>` with `·` separators; right = 5 legal entries inline with `·` separators between them. No two-column stacked block.
- **Vertical sizing:** `py-8` → `py-3` (12px+12px = 24px). With ~13px content + line-height ≈ 18-22px, total footer height ≈ **48-52px** on desktop.
- **Background:** `bg-paper` → `bg-pm-paper`. Matches the project canon and removes the visual step-out.
- **Hairline:** keep `border-t` but switch to the project's hairline token (`border-pm-hair`, used by AppHeader / WizardShell).
- **Padding:** `max-w-6xl px-6` preserved; left cluster + nav share the row, `gap-x-3` between separator dots.
- **Mobile (<640px):** the row wraps gracefully — wordmark line on top, nav row below. `flex-wrap` keeps total height ≤ ~80px without explicit breakpoint.
- **Copy unchanged.** All link targets unchanged.

### Files
- `src/components/SiteFooter.tsx` — collapse the two-column cluster, single inline row, paper-tone bg, hairline token.

### Locks
- Footer route allowlist (Phase 8.7) untouched.
- Cookie banner reopen flow untouched.
- Link routes (`/impressum`, `/datenschutz`, `/agb`, `/cookies`) untouched.
- Dashboard `pb-12` left as-is — out of scope per the brief; only the footer's own height moves.

---

## 3. File plan (locked)

| Path | Bug | Change kind |
|---|---|---|
| `src/features/wizard/components/QuestionIntent.tsx` | 1 | Collapse to single 4×2 SketchCard grid; drop chip-row code |
| `src/features/wizard/styles/sketches.css` | 1 | Tighten `.sketch` base metrics; remove `.sketch.chip` block |
| `src/components/SiteFooter.tsx` | 2 | Single-row layout, `bg-pm-paper`, `py-3`, `border-pm-hair` |

**Out of scope:** Phase 8.7 work (route allowlist, UserMenu Legal, Step 2 layout, map ungating, locales). Persona prompts, Edge Function, SQL, dashboard `<main>` padding, result workspace, chat workspace.

---

## 4. Render Gate plan

Commits 2 + 3 land with screenshots at:
- 1280×800 (primary target — laptop dock)
- 1440×900 (breathing room)
- 375×812 (mobile baseline)

Gate fails if step 1 needs scroll to reach Continue, or if the footer exceeds 56px desktop / 80px mobile.

---

## 5. Honest acknowledgment

Phase 8.7's brief had two underspecified spots:

- "Small chips, single row below" — the implementation took the word literally (label + code, no icon). The intent (all 8 are first-class project types, just compact) wasn't encoded in the brief.
- "Footer renders only on … " — no constraint on the footer's *own* size, only on its placement. The fix landed for placement, the size never came up.

8.7.1 closes both gaps. Each fix is isolated, surgical, and respects the Phase 8.7 locks.
