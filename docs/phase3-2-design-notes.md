# Phase 3.2 — DESIGN_NOTES.md

> **Disposition:** uncommitted while Rutik reviews. Moves to `docs/phase3-2-design-notes.md` in the final commit (#46), same pattern as PLAN.md → docs/phase3-plan.md.

> **Status:** Reference scan complete (6a, Granola read live; the rest digested from internalised craft knowledge — flagging this honestly). Technical specs verified against the existing palette + globals.css. Awaiting Rutik's sign-off on §11 questions before commit #35.

> **One sentence:** I've internalised the brief, sharpened a few choices, flagged eight points where my judgment wants to differ slightly from the prescription. None of the differences change the spirit; all of them are recoverable in either direction with a one-line answer from Rutik.

---

## 1 · Reference scan — architectural firms

Brief listed six firms (biggi, Snøhetta, BIG, Kengo Kuma, 6a, Caruso St John). I fetched 6a directly and digested the rest from prior craft knowledge. Picking three with the strongest translation to our paper/ink/clay vocabulary:

### Pick 1 — **6a Architects** ([6a.co.uk](https://www.6a.co.uk/))

**What I observed (live fetch):** information density controlled through *spacing*, not motion or color. Body text at ~14–16px with line-height 1.7. 18–24px margins between text blocks. Photographs sit *above* headlines (image as anchor, text as caption). Hierarchical "Projects → Selected Projects → individual" navigation menus rendered as plain nested lists with no chrome — small caps section headers at 12–14px, items in 13px sans, indentation 16–24px.

**What we steal for the chat workspace:**
- **Left rail (Commit #41):** the nested-spec-index pattern. Roman numeral chapter labels are *6a's restraint applied*. Reject icons, embrace Roman numerals + sub-letters (`V → V.a / V.b / V.c`). Indentation, not chrome.
- **Right rail (Commit #40):** images as section anchors — the small axonometric drawing at the top of the rail is the architectural-firm equivalent of 6a's hero photograph. Text below it acts as caption.
- **Center column rhythm (Commit #38):** the 56px gap between turns and 16–24px gap inside a turn comes straight from 6a's "let spacing carry hierarchy" approach.

### Pick 2 — **Snøhetta** ([snohetta.com](https://snohetta.com/))

**What we steal:** section drawings as hero imagery. Their project pages open with a building section — not a render, not a photograph, a drawing. The drawing IS the project's introduction. Translates to our **empty state** (Commit #42) and to the **right-rail axonometric drawing at the top of the rail** (Commit #40). Both moments turn line drawing into the welcoming gesture, not a decoration.

### Pick 3 — **Caruso St John** ([carusostjohn.com](https://carusostjohn.com))

**What we steal:** scholarly restraint. Their site treats real architectural drawings as *primary content*, not asset filler. The captions are precise (project, year, scale, status). Translates directly to our **specifications-schedule treatment in Eckdaten** (Commit #40):

```
01 │ INTENT
   │ Neubau Einfamilienhaus
   │ ─ LEGAL · CALCULATED
```

That left-column number + label + value + dash-prefix qualifier reads exactly like a Caruso St John drawing caption. Steal the typographic discipline; reject any temptation to "warm it up" with chrome.

---

## 2 · Reference scan — premium digital products

Brief listed ten. I fetched Granola live; the rest digested from craft knowledge. Picking three:

### Pick 1 — **Granola.ai** ([granola.ai](https://granola.ai))

**What I observed (live fetch):**
- No avatars. No animated sparkles. No aggressive notifications.
- Card-based organisation **without ornamentation** — sections (overview, key takeaways, next steps) emerge from spacing and typography weight, not borders or shadows.
- Ambient status signals (soft color shifts, gentle indicators) over disruptive loading states.

**What we steal:**
- **Anti-pattern discipline (whole batch):** Granola treats the AI as *infrastructure*, not a character. Our brand voice already commits to this (specialist names are roles, no "AI" in copy) but Phase 3.2 doubles down — no celebratory flourishes when a turn arrives, no confetti on completion interstitials, the "stamp" on the completion card is restrained octagonal ink, not a checkmark badge.
- **Anti-pattern: don't bloat the rails.** Granola's quiet sidebars feel premium because they don't try to show "Trending" or "Recent" or "Suggestions." Our right rail in Commit #40 stays focused on Top-3, Bereiche, Eckdaten, Verfahren/Dokumente/Fachplaner. Nothing else. The brief calls this out and I want to ratify it loudly here.

### Pick 2 — **Linear** ([linear.app](https://linear.app))

**What we steal:** depth via hairline contrast, not via shadows. Linear's panes layer through 1px borders at varied opacities (`hsl(0 0% 100% / 0.06)` between panes, `hsl(0 0% 100% / 0.12)` for active). Translates to our **paper-card layered approach** in Commit #37: the page is paper, the card is paper sitting on paper, the depth comes from a near-invisible drop shadow + an inset paper-edge highlight, not from elevation styling.

### Pick 3 — **iA Writer** ([ia.net/writer](https://ia.net/writer))

**What we steal:** typographic discipline as the entire product. iA Writer's monospace + restrained markdown rendering is the platonic ideal of "type-led product." We don't use monospace — Inter does our heavy lifting — but the *attitude* is iA Writer's: every typographic decision (OpenType stack, optical sizing, italic-as-voice, drop-caps as anchors) earns its place. Commits #36 and #38 are direct iA Writer descendants in spirit.

---

## 3 · Empty-state illustration choice

The brief specifies a **drafting-table axonometric** with rolled plans, fountain pen, ledger, coffee cup. I'm confirming this choice with one refinement.

**Confirmed motif:** drafting table.

**Refinement (small):** the brief asks for steam curling from the coffee cup as the *single* animated element. I'm proposing an alternative animated element — **the fountain pen draws a 1cm scale-line at the bottom of the rolled plan**, looping every 6 seconds with a 2-second pause between draws. Reasoning: steam-from-coffee reads as warm/domestic ("café"); a pen drawing a line reads as work/architectural ("atelier in motion"). The brief's spirit is "atelier"; my refinement amplifies it.

If Rutik prefers the steam (more atmospheric), I'll go with steam. **Q1 in §11.**

**Why drafting table over alternatives:**
- *Axonometric house:* tells you what the project IS, not what the workspace IS. Shows up better in the right rail (Commit #40, per-intent illustration).
- *Site plan:* too literal — implies we have actual plot data when we don't.
- *Floor plan:* reads as "design tool," which we're not.
- *Drafting table:* reads as "this is the workspace where the conversation happens." Right register.

**Asset specs:**
- 320×320 SVG, single file at `/public/illustrations/atelier-empty.svg`
- 1px stroke throughout, drafting-blue at 40% opacity
- Hand-drawn feel via subtle SVG `<filter>` with `<feTurbulence baseFrequency="0.012" numOctaves="2">` displacing strokes by max 0.4px (very subtle — wobble, not jitter)
- Single animated path (the pen drawing the scale line), gated by `prefers-reduced-motion`

---

## 4 · Inter + Instrument Serif OpenType stack

### Global Inter (set on `body` in `globals.css`)

```css
font-feature-settings:
  "ss01" on,    /* alternate single-storey 'a' — more elegant, more classical */
  "cv05" on,    /* alternate 'l' with tail — distinguishes from capital I */
  "case" on,    /* case-sensitive forms (parentheses, brackets shift up for caps) */
  "calt" on;    /* contextual alternates — improves character spacing */
```

These are the four features that change Inter's *personality* without changing its readability. `ss01` is the largest perceptible shift — single-storey `a` reads as more humanist / less SF-Pro. Worth committing to globally; reject if Rutik prefers the default double-storey `a` (Q2 in §11).

### Per-context overrides

```css
/* Tabular contexts: cost ticker, qualifier counts, audit timestamps */
.tabular { font-feature-settings: "tnum" on, "lnum" on, "cv05" on, "calt" on; }

/* Prose numerals: recommendation rank labels, dates in body, "vor 3 Stunden" */
.prose-numerals { font-feature-settings: "onum" on, "pnum" on, "ss01" on, "cv05" on, "calt" on; }

/* Eyebrows: tracking jumps from current 0.16em to a calibrated set */
.eyebrow-section { font-size: 11px; letter-spacing: 0.22em; }    /* Top-3, Bereiche, etc. */
.eyebrow-tag     { font-size: 11px; letter-spacing: 0.20em; }    /* PLANUNGSRECHT, SYSTEM */
.eyebrow-meta    { font-size:  9px; letter-spacing: 0.20em; }    /* Bauherr label, scale bar */
```

### Instrument Serif

```css
/* Display headlines (>32px) */
.display { letter-spacing: -0.02em; font-feature-settings: "ss01" on; }

/* Italic running heads — italic role labels under specialist tags */
.role-running-head {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-size: 14px;          /* up from 13px in Phase 3 */
  color: hsl(var(--ink) / 0.55);
  line-height: 1.2;
}

/* Drop cap — first letter of completion-interstitial body and overview headlines */
.drop-cap::first-letter {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-size: 3.4em;
  line-height: 0.85;
  float: left;
  margin: 0.04em 0.12em 0 -0.04em;
  color: hsl(var(--ink) / 0.85);
  letter-spacing: -0.04em;
}
```

---

## 5 · Drafting-blue color — verified

**Proposed value:** `hsl(212 38% 32%)` — a desaturated, optically-deep blue.

**Test against the existing palette:**

| Token | HSL | Concern? |
|---|---|---|
| `paper` | `38 30% 97%` | Different hue family. Drafting-blue contrasts cleanly. ✓ |
| `ink` | `220 16% 11%` | Same hue family (220 vs 212), but ink is L=11 vs drafting-blue L=32, and ink is S=16 vs drafting-blue S=38. Drafting-blue reads as "ink with a touch more blue and a lift" — exactly what we want for a *cool sibling* of ink. ✓ |
| `clay` | `25 30% 38%` | Opposite hue family. Drafting-blue (cool) and clay (warm) form the complementary pair. ✓ |

**Usage rules (locked):**
- Cursor-lensing of blueprint grid (Commit #35)
- Ambient activity dot in right rail (Commit #40 — drafting-blue at 60% opacity, replacing the current clay)
- "Specialist is speaking now" 1px underline in left rail's "Im Atelier" (Commit #41)
- Specialist sigils (Commit #38 — 60% opacity)
- Per-intent axonometric drawing in right rail (Commit #40 — 35% opacity)
- Empty state and transition screen illustrations (Commit #42 — 40% opacity)

**Never used for:** buttons, filled backgrounds, borders, links, primary CTAs, error states. Clay stays the warm accent; drafting-blue is the *cool* signal-of-activity accent.

**Add to globals.css:**
```css
:root {
  --drafting-blue: 212 38% 32%;
}
```

Tailwind config addition:
```js
colors: {
  'drafting-blue': 'hsl(var(--drafting-blue))',
}
```

---

## 6 · Blueprint-grid SVG specification

The blueprint substrate is the most important atmospheric element of the makeover.

### Geometry

- **Minor grid:** 24px × 24px cells, 0.5px line in `hsl(220 16% 11% / 0.045)`. (Hue 220 = ink; same hue keeps it visually quiet.)
- **Major grid:** 96px × 96px cells (every 4th minor line), 1px line in `hsl(220 16% 11% / 0.07)`.
- Lines drawn as a single SVG `<pattern>` at the document level, repeated via a `<rect>` filling the chat workspace center column area.

### Cursor lensing

Implemented as an SVG `<mask>` element that increases line opacity within a 320px-radius soft circle around the cursor:

```html
<svg className="fixed inset-0 pointer-events-none">
  <defs>
    <mask id="lens-mask">
      <rect width="100%" height="100%" fill="white" opacity="0.32" />
      <circle cx={cursorX} cy={cursorY} r="320" fill="white" filter="url(#soft-blur)" />
    </mask>
    <filter id="soft-blur"><feGaussianBlur stdDeviation="80" /></filter>
    <pattern id="grid" /* … minor + major lines … */ />
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" mask="url(#lens-mask)" />
</svg>
```

Cursor-following position via a single `pointermove` listener throttled to `requestAnimationFrame`. SVG mask updates by re-rendering the `<circle>` cx/cy. No React state — direct DOM mutation for performance.

### Tinting under the lens

Inside the lensing radius, line color shifts from ink-tint to drafting-blue tint:
- Outside lens: lines stay `hsl(220 16% 11% / 0.045)`
- Inside lens: lines tint to `hsl(212 38% 32% / 0.08)`

Implemented by rendering two grid layers — one ink-tinted (always visible at base opacity), one drafting-blue-tinted (visible only inside the lens via the mask).

### Drift

A `requestAnimationFrame` loop that translates the entire grid SVG by `sin(t * 0.0001) * 4` pixels on the x-axis. Imperceptible when looking at a single frame — only register over time. Establishes the page is alive.

### Reduced-motion

- No cursor lensing
- No drift
- No tint shift

Static grid stays at base opacity. Page still has the substrate; loses the "respond to attention" behaviour.

---

## 7 · Paper-grain noise specification

We already ship `.grain-overlay` in `globals.css` (used by landing/auth pages). Phase 3.2 extends the same data-URL SVG noise pattern to the chat workspace's body.

**Spec:**
- 256×256 base tile (was 240×240 — bumped up so it tiles less obviously across a 1440px viewport)
- `feTurbulence baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"` — same params as existing `.grain-overlay`
- Opacity: 4% (existing class uses 3.5%; bumping to 4% for the chat workspace because the workspace doesn't have photographic backdrops competing for visual texture)
- `mix-blend-mode: multiply` (same as existing)
- Fixed position on `<body>` so grain doesn't scroll-with-content (scrolling grain reads as JPEG artifacts; fixed grain reads as paper)
- `image-rendering: pixelated` so the grain doesn't bilinear-interpolate into mush on retina

**Rather than a new asset:** I'm extending `globals.css`'s existing `.grain-overlay` class with a `.grain-overlay-fixed` modifier and applying it to the chat workspace body. Avoids shipping a binary PNG. Implementation:

```css
@layer utilities {
  .grain-overlay-fixed {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 60;
    opacity: 0.04;
    mix-blend-mode: multiply;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
    image-rendering: pixelated;
  }
}
```

---

## 8 · Phase 3.2 — twelve-commit list

Lifted verbatim from the brief's §3 with my own review notes inline. None of the descriptions change the brief's intent.

| # | Title | LOC est. | Risk |
|---|---|---|---|
| 35 | `feat(design): paper grain noise + blueprint substrate + drafting-blue accent` | ~250 | Low — extends existing `.grain-overlay` pattern; SVG mask logic is the only new thing |
| 36 | `feat(design): typography refinement — OpenType features, optical sizing, italic running heads` | ~120 | Low — pure CSS + class swaps |
| 37 | `feat(chat): drafting-table center column with inset paper card and dimension margin` | ~350 | Medium — title block + north arrow SVG + dimension margin SVG; left margin only on `xl:` |
| 38 | `feat(chat): assistant message redesign with marginalia rule and specialist sigil` | ~280 | Medium — 7 sigil SVGs + marginalia rule animation |
| 39 | `feat(chat): user message redesign as bordered card with tabbed corner` | ~120 | Low |
| 40 | `feat(chat): right rail rebuilt as architectural sidebar with section drawings` | ~520 | **High — biggest commit.** 6 axonometric SVGs + sectioned A/B/C diagram + spec-schedule Eckdaten + Roman-numeral section headings |
| 41 | `feat(chat): left rail rebuilt as project specification index` | ~280 | Medium — Roman-numeral nav + "Im Atelier" with sigils + fountain-pen footer SVG |
| 42 | `feat(chat): empty state and transition screen as architectural drawings` | ~360 | Medium-high — atelier-empty.svg + paper-unroll transition animation |
| 43 | `feat(chat): completion interstitials redesigned as official correspondence` | ~140 | Low |
| 44 | `feat(overview): overview modal as architectural project binder` | ~420 | Medium-high — tab strip + audit timeline + per-section rebuild |
| 45 | `feat(chat): mobile redesign — folded vertical strip with drawer paper-tabs` | ~220 | Medium — applies the makeover to existing vaul drawers |
| 46 | `feat(chat): ambient motion choreography — table breath, drift, signature line` | ~180 | Low — three small choreographies; final commit moves DESIGN_NOTES → docs/ |

**Total estimated LOC: ~3,240** across 12 commits. Roughly Phase 3 batch 4's volume. ~5–7 days of focused execution at the pace we ran Phase 3.

---

## 9 · Where I want creative authority — and where I'm checking with you first

Per the brief: "Full creative authority within the locked design system." I'm taking it. Here's where my judgment differs slightly from the brief's prescription, and why — flagged so you can override before I commit time.

### 9a — Empty-state animated element: pen drawing a line, not steam from cup

Per §3 above. The brief asks for steam curling from the coffee cup. My read: pen drawing a 1cm scale line is more atelier-in-motion. I want to ship the pen-line; I'll fall back to steam if you prefer.

### 9b — "Im Atelier" replacing "Am Tisch" — register check

The brief proposes renaming the left-rail specialist list from `Am Tisch` to `Im Atelier`. My honest read: `Am Tisch` is more direct and was carefully calibrated in Phase 3 to read as German B2B substance. `Im Atelier` is more atmospheric but slightly precious — it leans into the metaphor where `Am Tisch` was the metaphor working invisibly.

**Recommendation:** keep `Am Tisch`. The atelier register comes from the *visual* moves (drafting-table illustration, blueprint substrate, sigils, paper card) — labels stay direct.

### 9c — Specialist sigils — slight refinement to one

Brief proposes:
- moderator → drafting stool
- planungsrecht → folded site plan
- bauordnungsrecht → building section
- sonstige_vorgaben → stamp icon
- verfahren → flowchart arrow
- beteiligte → three small figures
- synthesizer → fountain pen nib

All of these work. One refinement: **moderator's drafting stool** is a small, low-impact glyph (chair lines). I think a **table-with-three-stools** glyph reads more precisely as "moderator of a roundtable." Same 14×14 footprint. **Q3 in §11** — your call.

### 9d — North arrow rotation on workspace mount

Brief specifies the north arrow rotates 360° once on workspace mount in 1.6s. My honest read: a rotating north arrow violates the calm — every workspace open has a small Disney moment. Recommend **the arrow draws itself in (stroke-dashoffset) over 1.6s on first mount, then stays static**. Same 1.6s budget, calmer pattern. Reduced-motion: static.

### 9e — Title block content

Brief specifies title block reads:
```
PROJEKT-MEMO
Neubau Einfamilienhaus
Hauptstraße 12, 91054 Erlangen
```

I'd refine to:
```
PROJEKT
NEUBAU EINFAMILIENHAUS · ERLANGEN     ← Inter 11 tracking 0.18em uppercase ink
                                      ← (one line, tighter, more like a real title block)
Hauptstraße 12 · 91054 Erlangen       ← Inter 12 italic clay
```

Rationale: real architectural title blocks pack the project type + location into one band, with the full address one line below. The brief's three-line stack reads more like a card header than a title block.

### 9f — The drop-cap

Brief proposes drop-caps on completion interstitials and overview-modal sections. My read: drop-caps on completion interstitials are *exactly* right (they're correspondence). Drop-caps on overview-modal sections feel busy — overview sections are dense, drop-caps add visual weight where eyes already work. **Recommend: drop-caps on interstitials only.** Overview sections get the existing eyebrow + serif treatment.

### 9g — Hand-drawn-feeling SVG via feTurbulence wobble

Brief asks for "very subtle wobble" via `<feTurbulence>` displacing SVG strokes. My concern: SVG filters are slow on Safari < 16 and produce inconsistent rendering across browsers. I'm proposing instead to **build the wobble into the path data** using a tiny script at build time (or a one-shot Figma export) — strokes already have the slight imperfection baked in. Faster render, consistent across browsers.

**Compromise:** ship paths with baked-in wobble. If anyone wants to see live filter-based wobble for variety later, that's a Phase 4 add. **Q4 in §11.**

### 9h — Major commit boundaries — slight regrouping

The brief's 12-commit plan is solid. One small move I'd propose: **Commit #46 (ambient motion choreography) should ship before the final docs move**. Currently it's the very last commit before docs. I want to land it before the live verification run so the ambient motion is visible during the screenshots / recordings. **Q5 in §11** — should I reorder, or keep the brief's order?

---

## 10 · Honest concerns I want to flag before we start

1. **The makeover is a lot of motion + animation surface** for a 12-commit batch. Reduced-motion fallbacks need to be verified individually for cursor lensing, drift, ken-burns of the per-intent illustration, table breath, signature-line shimmer, north-arrow draw-in, paper-unroll transition. I will do this carefully, but I want to flag that motion bugs in production will surface as flicker, not as broken features — easy to ship without noticing.

2. **The right rail (Commit #40) is genuinely the largest single commit in the batch.** It's the #29 of Phase 3.1 in terms of complexity. I will land it as a single coherent commit because the rail's sections share patterns (Roman-numeral section headings, schedule-style rows, scale bars), but I want to flag it: this commit takes ~1.5 days of focused work, not half a day.

3. **Per-intent axonometric SVGs (Commit #40 — 6 of them).** These are illustration assets that need to be drawn (or generated). Options: (a) hand-draw them in Figma and export, (b) source from architectural-icon libraries (Architecture Icons, Drawline, etc.) and modify, (c) generate via SVG pen-tooling. Brief implies hand-drawn-feeling, which means options (a) or (b) with manual cleanup. **Q6 in §11** — should I commit to drawing them myself in code (slower, more control), or pause and ask Rutik to provide them as SVG files?

4. **The "stamp" on completion interstitials (Commit #43) is rotated -8°.** Rotated SVG glyphs are visually risky — they can read as decorative chic or as broken alignment depending on context. I'll be careful but flagging.

5. **Mobile redesign (Commit #45) reuses the existing vaul drawers from Phase 3.1.** All the makeover decisions about Roman numerals, schedule-style rows, sigils, etc. apply inside the drawers. Risk: drawer content gets visually denser; could feel cramped on iPhone-SE-sized viewports (375 × 667). I'll test at 320px width.

6. **The ambient motion choreographies (Commit #46) interact with the rest of the makeover.** Specifically the "table breath" loop reads weird if combined with the typewriter on a fresh assistant message — both are simultaneously affecting opacity of left-rail items + thread items. I'll need to gate the table breath to "no current typewriter" to avoid double-fade.

---

## 11 · Confirmation list — please answer before commit #35

| ID | Question | My recommendation | Your call |
|---|---|---|---|
| **Q1** | Empty-state animated element: pen drawing a 1cm scale line (atelier-in-motion) or steam from coffee cup (atmospheric)? | Pen drawing line | ☐ pen-line ☐ steam |
| **Q2** | Inter `ss01` (single-storey 'a') globally — confirm? Most perceptible Inter feature change. | Yes, ship it | ☐ ship ss01 ☐ keep default |
| **Q3** | Moderator sigil — drafting stool (brief's choice) or table-with-three-stools (more precisely "roundtable")? | Table-with-three-stools | ☐ stool ☐ table+stools |
| **Q4** | Hand-drawn-feeling SVGs — bake wobble into path data (cross-browser stable) or use live `feTurbulence` filter (varied each render but slower on Safari < 16)? | Baked paths | ☐ baked ☐ live filter |
| **Q5** | Commit #46 ordering — keep last (per brief) or move before final docs commit so ambient motion is visible during live verification? | Move before docs | ☐ before docs ☐ keep last |
| **Q6** | Per-intent axonometric SVGs (6 illustrations for Commit #40 right-rail header) — should I draw them inline as React SVG components (slower, more control), or pause and ask you to provide as ready-made SVG files? | Inline React SVGs (slower but ships now) | ☐ inline ☐ wait for assets |
| **Q7** | "Im Atelier" replacing "Am Tisch" in the left rail — keep "Am Tisch" (calmer, calibrated in Phase 3) or take the atmospheric upgrade? | Keep "Am Tisch" | ☐ keep ☐ upgrade |
| **Q8** | North arrow rotation on workspace mount — 360° spin (brief) or stroke-dashoffset draw-in (calmer)? | Draw-in | ☐ draw-in ☐ spin |
| **Q9** | Drop-caps on overview-modal sections too, or only on completion interstitials? | Interstitials only | ☐ interstitials only ☐ both |
| **Q10** | Title-block format: brief's three-line stack vs my refined two-line dense version (`PROJEKT` + intent · city)? | Refined two-line | ☐ brief's ☐ refined |

If you answer all ten, I'll lock them into DESIGN_NOTES.md and start commit #35. If you want to discuss any, we can. If you want to reject the whole batch direction, also fine — better now than after 3,000 lines.

---

## 12 · What I will NOT do without confirmation

- Touch any production file in `src/` or `supabase/functions/` until you sign off Q1–Q10.
- Buy or create new asset files outside `/public/illustrations/` and `/public/textures/` (pen-and-ink illustrations live there per brief; nothing else).
- Change the brand color palette beyond adding `--drafting-blue` and the clay-3-step ramp (`clay-light`, `clay`, `clay-deep`).
- Change the typography stack (Instrument Serif + Inter stays — only OpenType features get added).
- Change copy in any place outside the chat workspace (landing, auth, dashboard, wizard remain untouched per §6 of brief).
- Add features. The brief is unambiguous: makeover only.
- Skip or under-specify reduced-motion fallbacks. Every animated surface gets one.
- Move PHASE_4_PLAN.md or its decisions doc — those stay untouched until Phase 4 starts.

---

## 13 · If you confirm — what happens next

1. I lock Q1–Q10 into this file.
2. I open commit #35 (paper grain + blueprint substrate + drafting-blue accent).
3. Each commit ends with `npx tsc --noEmit -p tsconfig.app.json` clean.
4. Each commit message references the specific brief section + DESIGN_NOTES question it resolves.
5. After commit #46, I run the live verification per §4 of the brief — same proof bar as Phase 3 batches.
6. Batch report follows the same shape as Phase 3 batch reports, with screenshots/recordings explicitly noted as gating on your eyes (since I can't capture motion or mobile from this shell).

— End of DESIGN_NOTES.md.
