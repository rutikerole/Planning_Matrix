# Landing — Phase 1.6 notes

Live: https://planning-matrix.vercel.app/  ·  Repo: https://github.com/rutikerole/Planning_Matrix.git

The cinematic-direction phase. Architecture is a visual subject; we'd been hiding it. This phase brings real photography into the page, makes the hero a full-bleed image, and elevates the demo into a signature moment.

Eight commits, one new devDependency (`sharp`), zero new client-shipped libraries, ~16 kB gz of net new app code, ~1.4 MB of optimised AVIF imagery.

## What shipped

**1. Photograph pipeline + 9 source images.** Curated from Unsplash and Pexels, all standard-license (free for commercial use). Source JPGs sit in `images-source/` (kept out of `public/` so they don't ship), processed via `npm run images` into AVIF (q 50) + WebP (q 80) + mozJPEG (q 82) at 1600 w (desktop) and 900 w (mobile). Sharp added as devDep — never reaches the client. Per-photo attribution recorded in `public/images/CREDITS.md`.

**2. Cinematic hero rebuild.** The hero is a full-bleed photograph (~88 vh desktop, 86 vh mobile) with a warm-paper gradient overlay (paper/82 top-left → paper/12 bottom-right) and the matrix repositioned to a 280 × 280 paper-tinted glass seal in the bottom-right corner. Type sits over the photo on the left. Three independent parallax tracks during scroll — photo y −80 / type y −40 / seal y +60. Ken Burns scale 1 → 1.045 over 24 s. Gradient shimmer 38 s loop, mix-blend-multiply.
   *Photo swap:* started with the Pexels Altbau (1600 × 2845 portrait) but its tall aspect means the type-friendly left half compresses to a narrow vertical slice in a wide hero. Swapped to the Klunkerkranich rooftop sunset (Sebastian Herrmann, Unsplash k08MDpZm5zY) — 1.5:1 landscape, sky on the left, Fernsehturm right. AVIF only 85 kB / 37 kB.

**3. Atmospheric photo backdrops on five sections.** Pattern: section is unbg'd; a `SectionBackdrop` sits absolute `-z-10` with the photo at `object-cover` and a paper overlay on top at (1 − photoOpacity).
- Problem: scaffolding sunset, paperOpacity 0.90 (~10 % photo), 5-px scroll parallax
- Product (3-step): 1893 architectural blueprint, paperOpacity 0.92, 5-px parallax
- Domains tabs A / B / C: aerial / facade / heritage scaffolding, three layers cross-fading on tab switch over 1 s, paperOpacity 0.88
- Trust: fountain pen close-up, paperOpacity 0.85, 5-px parallax
- Final CTA: Berlin building lit windows, paperOpacity 0.75 (loudest, the payoff), 5-px parallax

Audience / Pricing / FAQ / Footer stay clean — restraint matters; not every section earns a backdrop.

**4. BlueprintFloorplan overlay.** A 320 × 480 SVG floor plan in the right column of the Problem section, sticky-positioned, drawing itself line-by-line against `useScroll` progress. Outer rectangle → internal walls → door swings → kitchen counter → bathroom fixtures → vertical and horizontal dimension lines, then "Wohnen / Küche / Schlafen / Bad" labels and a small north compass fade in last. Each path's strokeDashoffset is bound to its own sub-range of scroll progress so the plan reveals at the reader's pace, not on a timer. lg-only — hidden on mobile.

**5. BauGB section chips on Domain A.** Six real BauGB statute references (§ 30 / 31 / 32 / 33 / 34 / 35) appear as small clay-bordered chips below the body when Tab A is active. 0.08 s stagger. Adds the kind of detail that proves we know which paragraphs we're mapping against — not invented.

**6. RecommendMockup checkmarks.** The plain clay dots in the 5-row mockup upgraded to clay checks inside soft clay/15 circles. Visually marks each item as a recommendation, matches the demo result-card style.

**7. Elevated demo — the signature moment (Option C).** Six concrete upgrades to the existing demo:
   - Variable typing rhythm — 50 ± 30 ms per char with a 5 % chance of 220 ms pauses, plus a 240 ms idle beat before the first keystroke. Each cycle types differently — feels human.
   - Larger frame (min-h 540 px), three-layer shadow stack (8 / 36 / 72 px ranges).
   - Plot column inside the result card. New 8/4 grid: items left, a clay-bordered Grundstück frame containing six markers right. Each item's appearance triggers a hairline trail and a clay dot on the right at the same 0.18 s stagger — visually proves "this rule comes from this part of the plot."
   - Graph thinking animation replaces the 3-dot bouncer. Three satellite nodes connected by hairlines to a central node; each satellite pulses to 100 % opacity in sequence.
   - VERIFIED stamp scale-bounce on first arrival (0.9 → 1.06 → 1.0 over 550 ms with a 1.45 s delay after items populate).
   - Result hold extended 5.5 → 6.0 s.

**8. Always-on ambient motion pass.** Matrix traveling-pulse base opacity bumped 0.28 → 0.40 (more visible). Product backdrop gained the 5-px parallax it lacked. Audit complete: at any given moment something subtle is moving — Ken Burns, gradient shimmer, matrix breathing dot, traveling sector pulses, section backdrop drift, footer pilot pulse, demo live-indicator and typing cursor.

**9. Hero LCP fast-path.** `<link rel="preload" as="image" type="image/avif">` with `media="(min-width: 901px)"` and `media="(max-width: 900px)"` — kicks the hero AVIF download as soon as the HTML parses, before React arrives. Saves the typical 200–500 ms gap on 3G between HTML parse and hydration.

## Library additions

| | Where | What | Ships? |
|---|---|---|---|
| `sharp ^0.34.5` | devDep | Local AVIF / WebP / JPG conversion via `npm run images` | **No** — runs only on the dev's machine to generate the variant set in `public/images/` |

Zero client-shipped library additions. All cinematic motion is existing `framer-motion` + CSS `@keyframes` + inline SVG. No three.js, no GSAP, no particle systems.

## Photograph credits

All images standard-license (commercial-use friendly, no attribution required — recording it anyway):

| Stem | Source | Photographer |
|---|---|---|
| `hero-rooftop` | [Unsplash k08MDpZm5zY](https://unsplash.com/photos/k08MDpZm5zY) | Sebastian Herrmann |
| `hero-altbau` (alt) | [Pexels 17882001](https://www.pexels.com/photo/balconies-of-old-tenement-17882001/) | Ömer Gülen |
| `problem-scaffolding` | [Unsplash 4nDEdZZjaQQ](https://unsplash.com/photos/4nDEdZZjaQQ) | Cazper Vestblom |
| `threestep-blueprint` | [Unsplash sAlWjm2huck](https://unsplash.com/photos/sAlWjm2huck) | Peter Joseph Weber / Art Institute of Chicago |
| `domain-a-aerial` | [Pexels 18909542](https://www.pexels.com/photo/aerial-view-of-berlin-at-sunrise-18909542/) | Naro K |
| `domain-b-facade` | [Unsplash Jye5NmDCwGU](https://unsplash.com/photos/Jye5NmDCwGU) | Alex Lvrs |
| `domain-c-heritage` | [Unsplash c6D7fHnQ-2U](https://unsplash.com/photos/c6D7fHnQ-2U) | Dan Begel |
| `trust-pen` | [Pexels 30633929](https://www.pexels.com/photo/close-up-of-fountain-pen-writing-on-paper-30633929/) | seymasungr |
| `finalcta-windows` | [Unsplash rEVhEQOy5QA](https://unsplash.com/photos/rEVhEQOy5QA) | Paul Lichtblau |

## Performance — before / after

| | Phase 1.5 | Phase 1.6 |
|---|---|---|
| Main chunk gz | 47.13 kB | **49.34 kB** (+2.2 kB) |
| react-vendor gz | 70.16 kB | 70.16 kB |
| motion gz | 31.17 kB | 31.17 kB |
| i18n gz | 20.14 kB | 20.14 kB |
| radix gz | 15.72 kB | 15.72 kB |
| DemoBrowser (lazy) gz | 2.26 kB | **2.82 kB** (+0.6 kB) |
| CSS gz | 7.30 kB | 8.80 kB |
| HTML gz | 1.26 kB | 1.52 kB |
| Total first-paint | ~194 kB | ~197 kB |
| Hero AVIF (preloaded) | n/a | **37 kB mobile / 85 kB desktop** |
| First load total | ~194 kB | ~234 kB mobile / ~282 kB desktop |

Net new client code: ~3 kB gz JS + 1.5 kB CSS for the `Picture` and `SectionBackdrop` primitives, the `BlueprintFloorplan`, and the elevated demo upgrades. The big visual shift comes from imagery, not bytes.

Build clean (`npm run build`, no warnings), `npx tsc --noEmit` clean, `npx eslint .` clean.

## Reduced-motion + JS-disabled paths

**`prefers-reduced-motion: reduce`:**
- Hero photo: Ken Burns suppressed (motion-safe-only class), parallax outputs stay at 0.
- Hero gradient shimmer: animation suppressed.
- Hero matrix seal: as before — entrance resolves instantly, breathing dot freezes, traveling pulses freeze at base opacity 0.4 (still visible).
- Section backdrops: 5-px parallax disabled (useTransform output 0 → 0).
- Cross-fade between Domains tabs: opacity-only transition kept, no y-translate.
- BlueprintFloorplan: all paths drawn from start (strokeDashoffset 0 → 0).
- Demo state machine: never starts. Initial state is `phase: 'result'` with both answers fully typed and the result card visible. Plot markers + checkmarks paint at final state.

**JS-disabled:**
- `<noscript>` block at the global level renders a small ink-on-paper card with the elevator pitch and the early-access mailto.
- All meta tags, OG image, favicon, page title, canonical URL, and hero AVIF preload are baked into `index.html`.
- The hero photo `<picture>` is plain HTML — even without React, the browser shows the photo.

## What to verify on the live URL

Tomorrow's review punch list:

- [ ] **Lighthouse mobile** — Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95. The relaxed Performance gate (was 90) accounts for imagery; if it comes in 88+ we're golden.
- [ ] **LCP < 2.5 s on 3 G simulated** — the `<link rel="preload">` for the hero AVIF should deliver this. Verify in the Performance tab.
- [ ] **CLS ≤ 0.1** — explicit width/height on every Picture instance. Worth re-checking after the demo's growing result phase.
- [ ] **Real iPhone test** — touch the page, scroll all the way through, judge the feel. Specifically: does the demo loop pause the way it should on touch? (No — touch devices don't fire mouseenter; loop runs continuously, gated only by useInView.)
- [ ] **Visual sweep at 375 / 768 / 1024 / 1280 / 1920** — hero photo crop on mobile (object-[60%_50%] biases right toward the Fernsehturm), section backdrops at edges, demo plot column visibility on small screens (hidden below `sm` breakpoint).
- [ ] **`prefers-reduced-motion`** in DevTools → reload → confirm hero static, mesh frozen, demo paints final state.
- [ ] **JS-disabled** → noscript card visible. Re-enable, full page renders.
- [ ] **DE / EN switch** through every section including the new ones (mockups, demo, BauGB chips). Locales already verified at 160/160 keys.
- [ ] **Tab through every interactive** — focus visible across the photographs, especially in Domains tabs and FAQ.

## Known issues / next-session backlog

- **Demo on touch devices runs forever** — `mouseleave` pause doesn't fire. The `useInView` gate stops it when scrolled past, which is fine for normal use.
- **Hero photo subject location** — the Klunkerkranich panorama is a single fixed crop. If we want art-directed crops per breakpoint (separate desktop / mobile JPG with different framing), the pipeline can be extended.
- **Result card grows ~180 px in result phase** — below-the-fold layout shift only, doesn't impact LCP. If a parked viewer notices the growth, we'd swap to fixed height + internal scroll.
- **No Bundesländer coverage map yet** — when we cover real states beyond Thüringen, drop in a muted-style outline of Germany filled clay where coverage exists.
- **Imprint / Datenschutz / AGB** still placeholder. Legally required before any meaningful public launch.
- **No real testimonials, logos, or counters.** Holding the line — these come back when honest content exists.

## What I'd do next session

1. **Phase 2 — auth + dashboard skeleton.** Sign-up flow, project creation, the actual two-question wizard. Where the product begins.
2. **Real legal pages** (Impressum / Datenschutz / AGB) — non-optional for German B2B.
3. **Bundesland coverage map** as a credibility moment between Domains and Demo, once we have a real coverage story.
4. **OG PNG fallback** — the current `og.svg` works for Slack / Discord but not X / LinkedIn. Generate a 1200 × 630 PNG via a one-shot sharp script.
5. **Art-directed hero crops** — separate desktop / mobile compositions, per Heatherwick's pattern.
