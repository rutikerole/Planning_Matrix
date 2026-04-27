# Landing — Phase 1.5 notes

Live: https://planning-matrix.vercel.app/  ·  Repo: https://github.com/rutikerole/Planning_Matrix.git

The phase that turned the typographic essay into a 2026 SaaS landing page. Six commits, no new libraries, ~10 kB gz of net new code, plus a major bundle reorganisation that dropped the main chunk by 74 %.

## What changed

**1. Hero is no longer empty.** A 540×540 SVG `MatrixHero` lives in the right column of the hero — a 1px-stroke gabled house at center with a clay "Vorhaben" dot that breathes (8 s loop), surrounded by three clay-tinted domain wedges at 12/4/8 o'clock. Each wedge carries its own internal pattern: zoning-grid hatching for A, vertical measurement ticks for B, scattered dot-network for C. Three travelling clay pulses chase along the outer arcs, and the whole composition is wrapped by a 1px clay matrix frame and labelled with eyebrow-style "A · PLANUNGSRECHT / B · BAUORDNUNGSRECHT / C · SONSTIGE VORGABEN" markers around the perimeter. Behind it: a faint blueprint-paper hairline grid (~4.5 % ink, 32 px tile) and three warm radial gradient blobs (peach / terracotta / golden) drifting on independent 30/35/40 s loops, blended `mix-blend-mode: multiply` so they darken paper rather than introduce a cool tone. A `useScroll` + `useTransform` parallax translates the matrix wrapper down up to 60 px during hero scroll.

**2. Three-step product mockups.** The abstract square / triangle / checkmark glyphs are gone. Each step now carries a glass-paper mini-card (backdrop-blur, layered shadow, hairline border):
- **Capture** — focused input card with a typed answer ("Mehrfamilienhaus, 6 WE") and a 1.05 s blink-cursor.
- **Recommend** — 5-row checklist (Bauantrag · vereinfachtes Verfahren / Brandschutznachweis / Stellplatznachweis / Statik / Energie GEG) with rows fading-rise in 0.10 s stagger.
- **Release** — architect signature card ("M. Müller · AKB Berlin · 142···") with a -7° rotated clay VERIFIED stamp and inline check.

**3. Domain visual diagrams.** The "›" chip lists are replaced with three architect-flavored SVG diagrams:
- **A · Planungsrecht** — aerial view: central plot with diagonal hatching and clay outline, surrounded by faint context plots and dashed implied streets. Floating "§ 34 BauGB / WA / GRZ 0,4 · FH 13 m" annotations and a small north compass.
- **B · Bauordnungsrecht** — building section: gabled silhouette with windows and door, clay measurement spine on the left (±0 / 7 m / 13 m), 3 m setback indicators, and a side annotation column ("Brandschutz F30 / Stellplätze 1 / WE").
- **C · Sonstige Vorgaben** — network diagram: central Vorhaben node with six radiating satellites (Denkmalschutz / Immissionsschutz / Wasserrecht / Naturschutz / GEG · Energie / Baulast) connected by hairlines, dashed orbit ring framing the centre.

**4. Live demo — the centerpiece.** A new section between Domains and Audience. Glassmorphic browser frame (traffic-light dots, URL bar showing `planning-matrix.app/projekt/neu`, clay live indicator) wraps a scripted state machine cycling on a ~14 s loop:
- q1 → typed a1 ("Musterstraße 12, 99084 Erfurt") → q2 → typed a2 ("Mehrfamilienhaus, 6 WE, ~800 m² GRZ") → thinking-dots → result
- The result card shows 6 permit recommendations, **item 3 (Stellplatznachweis) carries a clay "ANNAHME / ASSUMED" tag** — the subtle product-truth detail. Bottom row: "Verifiziert durch M. Müller · Architektin" with rotated VERIFIED stamp.
- Plot identifier is fictional so it can't be quoted as advice.
- `useInView` gates the loop (only runs when section is on screen, threshold 0.3, once: false). `mouseenter` pauses, `mouseleave` restarts the cycle. `prefers-reduced-motion` paints the final state immediately and never runs the loop. Async + cancel flag for clean teardown.

**5. Section dividers.** Every `<Section bordered>` now renders an animated `HairlineDivider` instead of a static `border-t`. The hairline draws left → right over 1.05 s when the section enters view, then a 5×5 px clay tick mark fades in at the centre with a 0.6 s delay. Architectural drafting feel.

**6. Audience cards upgrade.** The hover state went from "border picks up clay" to (a) border picks up clay + (b) 4 px lift with a soft 22-px ink shadow + (c) a small clay → arrow slides in from the left of the card title (absolute-positioned, no reflow). Lift + shadow are `motion-safe:`-gated.

**7. FAQ open-color shift.** When an accordion item opens, the question text shifts to clay (`group-data-[state=open]:text-clay`) in addition to the existing plus → × icon rotation.

**8. Footer pilot pill** now breathes on the same 8 s clay-dot loop as the hero matrix's Vorhaben dot.

## Library additions

**Zero.** All new visuals are inline SVG; gradient mesh and blueprint grid are pure CSS; the demo state machine is `useEffect` + async/await + `setTimeout`/`setInterval`; motion still on existing `framer-motion` (`LazyMotion + domAnimation`).

## Performance — before / after

| | Phase 1 | Phase 1.5 |
|---|---|---|
| Single-bundle gz | 174.26 kB | — |
| **Main chunk gz** | 174.26 kB | **47.13 kB** (−74 %) |
| react-vendor gz | (in main) | 70.16 kB |
| motion gz | (in main) | 31.17 kB |
| i18n gz | (in main) | 20.14 kB |
| radix gz | (in main) | 15.72 kB |
| **DemoBrowser (lazy) gz** | n/a | 2.26 kB |
| CSS gz | 6.30 kB | 7.89 kB |
| Total transfer (cold) | ~180.5 kB | ~194 kB |

Cold-load total grew ~13 kB gz because we added the Demo section's content + state machine and several hundred lines of SVG for hero / mockups / domain diagrams. But the **main chunk** — the part that has to parse before first paint — went from 174 kB to 47 kB. That's the number Lighthouse's TBT/INP scoring cares about. Subsequent visits reuse all four vendor chunks from cache; only the small index chunk re-downloads on app changes.

Net new code in this phase: ~10 kB gz of app code + ~1.5 kB of CSS for new keyframes / classes. Well under the 76 kB headroom we budgeted.

Build: `npm run build` clean, `npx tsc --noEmit` clean, `npx eslint .` clean. DE/EN locale parity at 160 keys each (verified by flatten-and-diff script).

## Reduced-motion + JS-disabled paths verified

**`prefers-reduced-motion: reduce`:**
- Hero `MatrixHero` paints end-state immediately (entrance animations resolved instantly via global rule), breathing dot and travelling sector pulses freeze at sensible static frames, parallax `useTransform` outputs stay at 0.
- `GradientMesh` blobs freeze in their neutral starting positions.
- `AnimatedReveal` returns plain children — no opacity / y motion.
- `HairlineDivider` jumps to drawn end-state, tick mark visible.
- Audience card lift + shadow: `motion-safe:` keeps them off entirely under reduced-motion. Border colour shift remains.
- Demo state machine never runs. Initial state is `phase: 'result'` with both answers fully typed and the result card visible. Users see the final outcome on first paint.
- Cursor-blink animation freezes at opacity 1 (visible).

**JS-disabled:**
- `<noscript>` block at the global level renders a small ink-on-paper card with the elevator pitch and the early-access mailto. No React app mounts.
- All meta tags, OG image, favicon, page title, and canonical URL are baked into `index.html` so unfurl previews and search snippets work even without JS execution.

## What needs human verification on the live URL

Tomorrow's review:

- [ ] **Lighthouse mobile** — Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95. Specifically watch CLS — the hero matrix entrance involves SVG content drawing in, and the demo section grows during the result phase; both should stay under 0.1.
- [ ] **iPhone / Android touch test** — touch interactions feel right (FAQ accordion, Domains tabs, language switcher, mobile drawer), animations smooth, no jank. Demo's `mouseenter` pause won't fire on touch devices — loop runs continuously, gated only by `useInView`.
- [ ] **Visual sweep at 375 / 768 / 1024 / 1280 / 1920** — the hero matrix moves below the text on `<lg`; check that doesn't cramp at small widths. Domain diagrams cap at `max-w-[440px]` and centre on mobile.
- [ ] **prefers-reduced-motion** in DevTools → reload and confirm: hero matrix paints end-state, mesh blobs freeze, demo paints result on mount, no parallax.
- [ ] **JS-disabled** — page shows the noscript card. Re-enable JS, full page renders.
- [ ] **CPU 4× throttle** — Demo state machine still smooth, no jank during typing.
- [ ] **Tab through every interactive** including new ones (Demo browser is intentionally not interactive — no focusable elements inside; the hover-pause is mouse-only by design).
- [ ] **DE / EN switch** through every new section (Demo localised, mockups localised, domain diagrams use a mix — embedded German legal terms like "§ 34 BauGB / WA / Bauordnung" stay in German since they're domain terminology, surrounding labels localise).

## Known issues / next-session backlog

- **Demo loop on touch devices runs forever.** Mouse-leave pause doesn't fire. If we want pause-on-touch, add a `touchstart` handler that toggles a paused state. Not critical — users typically scroll past or watch one cycle then move on.
- **Demo result-phase grows the section ~180 px.** Layout shift is below the fold so doesn't affect LCP, but if the user is parked on the demo it pushes content below them. If this matters, swap to fixed-height with internal scroll or reduce result card item count.
- **Hero parallax range** is conservative (60 px). Could go bigger (80–100 px) if it feels too subtle on mobile.
- **Mockup glyphs in Product** still show even when their parent `AnimatedReveal` is mid-animation. Might want to delay the cursor blink start until reveal completes.
- **No real OG PNG** yet. Still using `og.svg`. X / LinkedIn may not render. Generate offline once via Figma or a one-shot script.
- **Imprint / Datenschutz / AGB** still placeholder `href="#"`. Legally required before public launch.
- **No real testimonials, logos, or counters.** Holding the line — these come back when we have honest content.

## What I'd do next session

1. **Phase 2 — auth + dashboard skeleton.** Sign-up flow, project creation, the actual two-question wizard. The product begins.
2. **Bundesland coverage map.** A muted-style outline of Germany with Thüringen filled in clay; hover tooltips for "in Vorbereitung" states. Lives in the Audience or after Domains as a credibility moment once we have a coverage story.
3. **Real Impressum / Datenschutz / AGB pages.** Not optional for German B2B.
4. **OG PNG.** Rasterise the existing `og.svg` once for X / LinkedIn unfurl coverage.
5. **A second demo variant** — the "compare two plots" view for the Projektentwickler audience. Same browser frame, different scripted flow showing two roadmaps side by side.
