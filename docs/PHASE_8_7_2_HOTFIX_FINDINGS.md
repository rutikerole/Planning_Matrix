# Phase 8.7.2 Hotfix — Atelier Opening Visual Repair · Findings

> **Scope:** Six visual bugs in the Phase 8.7.2 AtelierOpening transition.
> Logic, timing, and route handoff are working — the visual is broken.
> Three commits: 1 findings · 2 visual repair · 3 EN locale label correction.
>
> **Locks:** 5 s timing arc, seat lighting sequence, route handoff, reduced-
> motion fallback, headline copy, sub-line, eyebrow, progress hairline,
> caption rotation. Touch only SVG composition + label positioning + color
> values + locale strings.
>
> **Render Gate:** 1280×800, 1440×900, 375×812 at t=2.5s (mid-cascade).

---

## 0. Audit summary

| Bug | Surface | Root cause |
|---|---|---|
| 1 | Inner ellipse renders as solid black instead of a 4 % paper-warm tint | Tailwind class `fill-pm-ink/[0.025]` cannot apply alpha to a hex-valued CSS custom property (`pm-ink` resolves to `#1a1612`, not three HSL channels). The `/<alpha>` modifier silently drops; full ink renders. |
| 2 | Verfahren (V) and Sonstige (S) seats overlap at the bottom | My angles 165° / 195° give 30° of arc — too tight at the bottom of an ellipse where the y-coord is identical for both. Labels collide reading "PROCEDURE OTHER REGULATIONS" as one string. Brief locks 155° / 205° = 50° arc. |
| 3 | Composition is too vertically loose | Outer flex uses `justify-between` with `flex-1` SVG container → top, middle, bottom zones spread evenly across `h-dvh`. Headline lands at y≈110px, table center at y≈600px (~75 % viewport). Brief wants table center at ~58 %. |
| 4 | EN specialist labels don't match the locked map | I shipped EN as "Stakeholders" / "Other regulations". Brief's locked map: "Team" / "Other rules". Captions referencing those specialists also need correction. |
| 5 | "SYNTHESIS" label crashes the ellipse | Label offset on side-placed seats was `SEAT_R + 8 = 30 px`. Brief wants `SEAT_R + 18 = 40 px` so labels sit ~14 px outside the seat edge. |
| 6 | Center clay dot invisible | `r=3` and buried under the (broken) black ellipse fill. Once Bug 1 is fixed and the radius bumps to 6, the dot sits visible inside the table. |

---

## 1. Bug 1 — black ellipse fill

### Reproduction
Screenshot at `localhost:5173/projects/new` shows a black solid ellipse covering the table area. The grid pattern behind is invisible through it.

### Code anchor
`src/features/loader/AtelierOpening.tsx:213`:
```tsx
<ellipse … className="fill-pm-ink/[0.025]" />
```

`pm-ink` in `tailwind.config.js:148` is defined as `'pm-ink': 'var(--pm-ink)'`, where `--pm-ink` is a hex literal (e.g. `#1a1612`) — not three HSL channels. Tailwind's `/<alpha>` arbitrary modifier requires the underlying color to be expressed as `hsl(<h> <s> <l>)` or `<r> <g> <b>` channels so it can synthesise the `<color> / <alpha>` form. With a hex variable, the modifier is silently dropped and the full ink color paints.

### Fix
Replace Tailwind alpha classes with literal SVG `fill=` / `stroke=` values that hardcode the `hsl(... / α)` form. The brief's spec:
- Outer ellipse: `fill="none"`, `stroke="hsl(220 16% 11% / 0.15)"`, `stroke-width="0.5"`, `stroke-dasharray="3 3"`.
- Inner ellipse: `fill="hsl(25 30% 38% / 0.04)"` (paper-warm whisper), `stroke="hsl(220 16% 11% / 0.08)"`, `stroke-width="0.5"`.

This bypasses the Tailwind color pipeline entirely. The grid pattern stays visible through both ellipses.

---

## 2. Bug 2 — V/S overlap at bottom

### Reproduction
Screenshot shows the V and S seats sitting ~115 px apart horizontally at y=257, with their labels ("PROCEDURE", "OTHER REGULATIONS") merging into "PROCEDURE OTHER REGULATIONS" reading order.

### Geometry math
With `rx=220, ry=90` and the broken angles 165° / 195°:
- SONSTIGE 165°: x = 330 + 220·sin(165°) = **386.9**, y = 170 − 90·cos(165°) = **256.9**
- VERFAHREN 195°: x = 330 + 220·sin(195°) = **273.1**, y = 170 − 90·cos(195°) = **256.9**

Centre-to-centre distance: ~114 px. After subtracting 22 px seat radius on each side, edges are ~70 px apart. Each label is ~110 px wide. Labels collide.

### Fix — locked angles per the hotfix brief

| Seat | Angle | x | y |
|---|---|---|---|
| MODERATOR | 0° | 330.00 | 80.00 |
| PLANUNGSRECHT | 51° | 500.99 | 113.38 |
| BAUORDNUNGSRECHT | 129° | 500.99 | 226.62 |
| SONSTIGE | 155° | 422.97 | 251.57 |
| VERFAHREN | 205° | 237.03 | 251.57 |
| BETEILIGTE | 231° | 159.01 | 226.62 |
| SYNTHESE | 309° | 159.01 | 113.38 |

Centre-to-centre between V and S: 422.97 − 237.03 = **185.94 px**. After 22 px seat radius each, edges are ~141 px apart — comfortable for label rendering with anchored text below.

Pairs across the vertical axis stay symmetric: 51°↔309°, 129°↔231°, 155°↔205°.

---

## 3. Bug 3 — composition too vertically loose

### Reproduction
Screenshot at 1280×800 (approx., based on the dock chrome) shows:
- Headline top edge at y ≈ 200 px (25 % from top — should be ~14 %)
- Sub-line bottom at y ≈ 360 px
- Table top at y ≈ 600 px (so 240 px of empty paper between sub and table)
- Table center at y ≈ 770 px (~75 % of viewport — should be ~58 %)

### Code anchor
`AtelierOpening.tsx:184`:
```tsx
className="… flex h-dvh w-full flex-col items-center justify-between overflow-hidden bg-pm-paper px-6 py-8 lg:py-10"
```

`justify-between` on `h-dvh` distributes the three children (top zone, SVG, bottom zone) with maximum gap. With `py-10` insets only and no inner constraints, the SVG floats to its natural position 50 % of the way from top to bottom of remaining space.

### Fix
Replace `justify-between` with explicit vertical rhythm:
- `pt-[14vh]` on the page (was 25 %).
- Top zone (eyebrow + headline + sub) flows naturally with `gap-3`.
- Margin between sub-line and SVG: `mt-[clamp(80px,12vh,120px)]`.
- SVG container has `max-w-[640px]` and natural aspect; on 1280×800 it renders ~640×330 → centre at y ≈ 112 + 100 + 96 + 165 = **473 px** (≈ 59 %). ✓
- Bottom zone (caption + progress) anchored via `mt-auto pb-[8vh]`.

Result: headline → context → table → caption → progress flow as one connected frame.

---

## 4. Bug 4 — EN labels mismatch the locked map

### Reproduction
Screenshot (EN locale active per the URL bar / locale setting) shows "ZONING LAW", "BUILDING CODE", "STAKEHOLDERS", "OTHER REGULATIONS".

### Locked map (per hotfix brief)

| German | English |
|---|---|
| MODERATOR | MODERATOR |
| PLANUNGSRECHT | ZONING LAW |
| BAUORDNUNGSRECHT | BUILDING CODE |
| SONSTIGE VORGABEN | OTHER RULES |
| VERFAHREN | PROCEDURE |
| BETEILIGTE | TEAM |
| SYNTHESE | SYNTHESIS |

### Diff to apply (EN only — DE labels were correct)
- `wizard.atelier.specialist.beteiligte`: `"Stakeholders"` → `"Team"`
- `wizard.atelier.specialist.sonstige`: `"Other regulations"` → `"Other rules"`
- `wizard.atelier.caption.4of7`: `"…Other regulations reviewing local rules"` → `"…Other rules reviewing local context"` (the noun "rules" is now in the specialist name; the caption verb shifts to avoid duplication)
- `wizard.atelier.caption.6of7`: `"…Stakeholders mapping required specialists"` → `"…Team mapping required specialists"`

### Source-of-truth question
The brief asks: *"Pull the labels from the same source as the chat workspace's specialist tag rendering."* The chat workspace's spine titles (`chat.spine.stages.<id>.title`) are full sentences (e.g. "Procedure synthesis", "Stakeholders & roles"), while the atelier opening uses CAPS short forms (e.g. "PROCEDURE", "TEAM"). They must visually agree but they're rendered differently. Decision: keep `wizard.atelier.specialist.*` as the dedicated key namespace for the atelier's compact labels. The chat workspace continues to use its own `chat.spine.stages.*.title`. This is a documented divergence — the chat spine is descriptive, the atelier seat is a name tag. As long as both surfaces show the *same noun* for each specialist, they're aligned.

DE alignment:
- `chat.spine.stages.beteiligte.title` = "Beteiligte" → atelier specialist.beteiligte = "Beteiligte" ✓
- `chat.spine.stages.sonstige_vorgaben.title` = "Sonstige Vorgaben" → atelier = "Sonstige Vorgaben" ✓

EN alignment after the fix:
- `chat.spine.stages.beteiligte.title` = "Stakeholders & roles" → atelier = "Team". Slight name change here from the spine. Per the brief's locked map, "Team" is intentional for the atelier (warmer, more human; "Stakeholders & roles" stays in the spine where it's a heading).
- `chat.spine.stages.sonstige_vorgaben.title` = "Other regulations" → atelier = "Other rules". Same — the spine is descriptive, the seat tag is shorter.

Documenting the divergence in the findings is the cleanest way to keep both surfaces internally consistent without a forced refactor.

---

## 5. Bug 5 — SYNTHESIS label crashes ellipse

### Code anchor
`AtelierOpening.tsx:359`:
```tsx
case 'right': return { dx: SEAT_R + 8, dy: 4, anchor: 'start' as const }
case 'left':  return { dx: -(SEAT_R + 8), dy: 4, anchor: 'end' as const }
```

SEAT_R + 8 = 30 px from seat center to label start. Seat radius is 22 px, so the label hugs the seat edge with only 8 px breathing space.

### Fix
`SEAT_R + 18 = 40 px`. Label sits 18 px outside the seat edge — comfortable.

---

## 6. Bug 6 — center dot invisible

### Code anchor
`AtelierOpening.tsx:228`:
```tsx
<circle cx={CX} cy={CY} r={3} className="fill-pm-clay" />
```

Two issues: (1) `r=3` is small; the brief specifies `6 px` radius. (2) Once Bug 1 is fixed (transparent ellipse), `r=6` will be visible. The `fill-pm-clay` class works because `pm-clay` is a standalone color, not opacity-modified.

### Fix
Bump to `r={6}`. Pulsing ring also bumps from `14 → 28` to `18 → 36` to scale with the larger dot.

---

## 7. File plan

| Path | Bug(s) | Change |
|---|---|---|
| `src/features/loader/AtelierOpening.tsx` | 1, 2, 3, 5, 6 | Hardcoded SVG fill alphas; angle map updated; vertical rhythm rewritten; label dx/dy on sides bumped; center dot radius bumped |
| `src/locales/en.json` | 4 | `wizard.atelier.specialist.{sonstige, beteiligte}` + 2 caption strings |
| `src/locales/de.json` | (none) | DE specialist + caption strings already correct; verify parity |

Out of scope: timing math (`useAtelierSequence.ts` untouched), routing, headline copy, eyebrow, progress hairline.

---

## 8. Render Gate plan

Commits 2 + 3 land with screenshots at:
- 1280×800 — primary target (mid-cascade at t=2.5s)
- 1440×900 — breathing room
- 375×812 — mobile baseline

Stopwatch attestation for timing: t=0 mount, t=3.9 last seat lit, t=5.0 cross-fade to chat workspace. Unchanged from previous commit.

---

## 9. Bundle delta target

≤ 0 KB gz. This is a fix, not new code. Replacing Tailwind classes with literal SVG attrs may even shave a few hundred bytes from the compiled CSS.
