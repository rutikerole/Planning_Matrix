# Planning Matrix — Landing Page Research & Analysis

**Author:** research lead • **Date:** 2026-05-03
**Audience:** Rutik + the Planning Matrix team
**Status:** Research only. No code, no final layouts, no migration started.
**Downstream:** an HTML prototype, then an implementation decision.

---

## 1. Executive summary

The current landing at `planning-matrix.vercel.app` is already in the upper quartile of German B2B SaaS — calm typography, warm paper palette, eight curated photographs, motion gated by `prefers-reduced-motion`, ten-section editorial scroll, German-first i18n, sensible SEO baseline. It is not broken. The team is asking the right question: **how do we move from "good" to "world-class" without relitigating the design system or ballooning scope.**

After two days inside the codebase and two days inside the best landing pages on the open web, the honest answer is that **Planning Matrix's nearest reference is anthropic.com, not linear.app** — and once that is accepted, most of the apparent decisions resolve themselves. Anthropic ships a sans-display + serif-body, warm-cream, near-zero-motion, dated-newsroom register. Planning Matrix ships an Instrument-Serif + Inter, paper/ink/clay, restrained-motion, formal-Sie register. The vocabulary is already right. What is missing is **discipline of focus** — one signature motion instead of many small ones, one numeric typeface accent for permit references, one prerendered marketing surface instead of a client-rendered SPA serving Googlebot a blank document.

The five recommendations that matter:

1. **Render strategy.** Add `vite-prerender-plugin` (Vike) to the existing Vite build this week — static HTML for `/`, `/de/...`, `/en/...`. Re-evaluate Astro for marketing in six months when the content programme is real. SEO and AI-search citation are bottlenecked by client-only rendering today.
2. **Information architecture.** Move from one long scroll to a hub: `/` overview + `/produkt`, `/preise`, `/loesungen/{bauherr|architekt|projektentwickler}`, `/faq`, `/genehmigungsplanung-software` (the Tier-1 SEO bullseye). Keep the editorial scroll on `/`; let deep pages carry density.
3. **Motion budget.** Pick one signature: a **scroll-anchored B-Plan reveal** synced to a real München parcel — the matrix updating as the user scrolls past, then the pin releases. Cut the parallax on backdrops everywhere else; replace with calm reveal-on-scroll only. Cap every transition at 220 ms; cap every reveal at 600 ms. Adopt the Rauno 200 ms rule for hover/click feedback.
4. **Typographic upgrade.** Add a quiet monospace face (JetBrains Mono or Geist Mono) for permit numerals only — paragraph references (`§ 34 BauGB`), Bundesland codes, parcel IDs, distances. This is the cheapest, highest-ROI move on the page. Do not touch Instrument Serif + Inter.
5. **SEO Tier-1 win.** Ship one prerendered long-tail landing — `/de/genehmigungsplanung-software` — targeting an open SERP that no SaaS competitor currently owns on the Antragsteller side. Three to six months to top-five is realistic on a low-authority domain because the bullseye term is uncontested.

Everything else in this report is downstream of those five.

---

## 2. Reference site analysis (Tier 1)

For each: one paragraph, three takeaways. Paragraphs synthesise direct fetches and credible 2025–2026 design-press analyses; where I cite specific motion patterns I have not directly inspected, the language is hedged.

### 2.1 linear.app

A wide single-column spine over a soft 12-column grid; full-bleed scenes stack rhythmically — tall hero, dense bento, breathing customer band, dense bento again. The hero's signature is a slow-breathing radial gradient bloom behind the headline; entrances are short fade-up reveals timed to scroll position. There is no scrubbed video, no parallax, no scroll-jacking. The /features page is almost pure bento. Performance is buttery because Linear chose narrative-by-sequence, not narrative-by-pinning.

- Each homepage section is a self-contained scene with its own headline-image-caption — sequence beats stickiness.
- One atmospheric gradient earns more attention than ten micro-animations. For Planning Matrix, a single warm-clay bloom — not Linear's blue.
- Bento as a *features* page is honest density without marketing wallpaper — well-suited to a permit product with many small capabilities.

### 2.2 vercel.com

Geist's grid: tight, slightly mono-flavoured, alternating wide hero / 3-up metric strip / 4-up logo wall. Spring physics on micro-elements, cursor-tracking glow on product cards, no scroll stunts. The visual signature is **Geist Mono on every numeral and label** — latency figures, version counts, code labels. Display contrast comes from weight and scale, not from family swap.

- Pair Inter (display + body) with a quiet mono accent for numbers and references — the cheapest "engineered seriousness" upgrade available.
- Spring motion on micro-elements outperforms linear easing. Restrained but unmistakably alive.
- Short sections + tight rhythm beats one giant scrollytelling stunt.

### 2.3 stripe.com

The most influential landing-page hero of the last decade: a small WebGL animated-gradient canvas with `mix-blend-mode: difference` over Söhne Display. Below the fold the motion gets disciplined-quiet — subtle hovers, crossfades, no parallax. Söhne provides display-body contrast through weight + scale, not family. /customers is a grid of metric-cards (huge numeral + tag chips); /sessions reuses the chassis with speaker cards.

- One signature hero motion, then disciplined quiet. The motion budget is spent in one place.
- Metric-first customer stories (huge numeral + one-line outcome + product tag) beat 200-word case studies. The exact pattern Planning Matrix should adopt for permit-success vignettes.
- Display-body contrast via weight + scale is the right move for an editorial brand. No second display family.

### 2.4 anthropic.com

The closest match to Planning Matrix's brief by an enormous margin. Magazine-grid editorial layout: wide hero, then a publication-style "Latest releases" band with genuinely date-stamped entries, then a library-like footer. Type is Styrene B (display) + Tiempos Text (body) — sans-display, serif-body — over a warm cream/clay palette with sparingly-used terracotta accent. **Motion is almost absent**, and that is the point. Every other site on this list is, in some measure, performing competence; Anthropic just is competent on the page.

- Sans-display + serif-body, warm paper palette, dated-newsroom register: Anthropic has already proven this works for serious B2B in 2026.
- Date-stamping content (regulation changes, new Bundesländer, model improvements) creates editorial gravity without effort.
- Quietness is a feature, not a missing feature. No motion can be more confident than any motion.

### 2.5 apple.com (MacBook Pro M5)

The canonical scrubbed-scroll product reveal: pinned device, single compressed MP4 with `currentTime` bound to scroll, captions cross-fade in sync. Persistent sub-nav (Overview / Tech Specs / Compare / Buy) appears once the hero exits viewport. SF Pro Display goes to 80–120px for chip-name moments — the most extreme display-body ratio on the open web.

- Apple's scrubbed-scroll is the *cautionary* tier for Planning Matrix — one disciplined pinned panel is defensible; full Apple-style scrub on a permit tool reads as try-hard.
- Sub-nav after hero exit is the right pattern for any long page. Adopt it for `/produkt` and `/`.
- One moment of typographic shock per page is sound. The scale ratio Apple uses is too much; the principle is right.

### 2.6 arc.net

Vertical, modular, image-led. Soft entrance fades, hover-tilted 3D buttons, occasional easter-egg micro-reward. Warm neutrals over clinical white — the same warmth Planning Matrix already has. The killer move is that the marketing page's interaction grammar *echoes* the product's interaction grammar.

- Warm neutrals over white = instant calm. Validates the existing paper/ink/clay palette.
- Marketing-page interactions should echo product interactions. If the app uses hairlines and 200 ms hovers, the homepage should too. The current site already does this; protect it.
- Don't over-animate. Imagery and copy carry warmth.

### 2.7 rauno.me

The canonical *craft* reference. Every motion sub-200 ms, every hover purposeful, no animation for decoration. Rauno's published interface guidelines literally state animation duration should not exceed 200 ms for interactions to feel immediate. The OS-as-website framing is striking but transferable only at the level of principle.

- The 200 ms rule. If Planning Matrix adopts one motion principle, it should be this.
- Earned microinteractions: a delightful detail at exactly the moment a user does something meaningful, nowhere else.
- Forbid extraneous animation on frequent low-novelty actions. Hover affordances on every card is the wrong default.

### 2.8 resend.com

Tight, dev-first, dark-led. Quiet but precise motion (200 ms transitions, hover lifts, terminal typewriter on code blocks). Mono accents are heavy and credibility-buying. Dark mode as primary is bold but tonally wrong for a German B2B editorial brand — Planning Matrix should lead light/paper with dark as a respectful alternative.

- Mono accents earn credibility for technical products. Paragraph references, zoning codes, parcel IDs all want to live in mono.
- Lead with one real artifact (their code block; for Planning Matrix, perhaps a real B-Plan callout or a permit-status snippet).
- Dark mode primary is the wrong call for this register. Offer it; don't lead with it.

### 2.9 Synthesis across Tier 1

The genuine 2026 consensus across all eight sites:

- **One signature motion, then quiet.** Stripe's gradient, Linear's bloom, Apple's scrub, Vercel's spring. None animate everywhere.
- **Mono accents are universal.** Every site uses monospace for technical content.
- **Display-body contrast via weight + scale**, never via a second family.
- **Sticky sub-nav after hero exit** is now standard on long pages.
- **Spring physics > linear easing** on micro-elements.
- **Sub-200 ms** transitions are the floor.
- **Dark mode is offered, not led** (except Resend).

What they all avoid: carousels-with-arrow-controls as primary content, autoplay video with sound, decorative stock photography, exclamation marks, emoji in product copy, hard drop-shadows, saturated brand-blue gradients of the 2019 SaaS era, scroll-jacking, any motion longer than ~600 ms.

---

## 3. Pattern catalog

By category, with verdicts. "Use here" = explicit yes; "Use sparingly" = one place at most; "Avoid" = wrong register.

### Hero entrance

| Pattern | Where it works | Where it's overused | Perf cost | A11y notes | Verdict for PM |
|---|---|---|---|---|---|
| Text reveal (split-line stagger) | Editorial brands; matches Instrument Serif rhythm | Whenever it stages all text on the page | Low (CSS-only possible) | Reveal must respect `prefers-reduced-motion`, not delay LCP text | **Use here** — one line at most, 600 ms cap |
| Image reveal (clip-path / mask) | Photography-led brands | When applied to every photo | Low–Med (paint cost) | OK if image src is preloaded | **Use sparingly** — hero rooftop only |
| Gradient bloom (Linear/Stripe) | Hero only | When echoed in 3+ sections | Low if CSS gradient; Med if WebGL | None | **Use here** — single warm-clay bloom, CSS only, no WebGL |
| Blur-up | Above-the-fold imagery | Anywhere already prerendered | Low | None | **Use here** — already partly implemented |
| Mask animation (text masking image) | Theatrical hero | Try-hard on B2B | Med | Avoid if motion-heavy | **Avoid** for register reasons |

### Scroll storytelling

| Pattern | Verdict |
|---|---|
| **Sticky sections** with caption swap | **Use here, exactly once** — the B-Plan reveal moment in the Product or Domains section |
| **Horizontal scroll** | **Avoid** — alien on a German B2B page; works for portfolio sites |
| **Scrubbed video / canvas** | **Avoid** — Apple-level only; tonally wrong here |
| **Parallax (backdrop)** | **Reduce** — currently used in five sections; cut to two at most |
| **Pinned reveals** | **Use here, once** — same as sticky above |

### Section transitions

| Pattern | Verdict |
|---|---|
| Colour washes | **Avoid** — registers as 2019 SaaS |
| Shape morphs | **Avoid** for B2B register |
| **Hairline reveals** between sections | **Use here** — already partially implemented; expand as the primary section divider |

### Typographic effects

| Pattern | Verdict |
|---|---|
| Split-text fade-up | **Use here** — one line, hero only |
| Kinetic type | **Avoid** |
| Marquee | **Avoid** |
| Weight morph (variable axis) | **Use sparingly** — interesting on Inter Variable but tonally adventurous |
| **Mono numeral mount-in** (counter or settle-in) | **Use here** — one stat in hero ("In zwei Antworten"), one in a metric strip |

### Image treatments

| Pattern | Verdict |
|---|---|
| **Clip-path reveal** | Use sparingly — hero photo only |
| **Ken Burns** | **Reduce** — currently on hero; either keep on hero only or drop entirely. Currently it competes with reveal motion. |
| Mask animation | Avoid |
| **Blur-up** with AVIF | **Use everywhere** — already shipped |

### Microinteractions

| Pattern | Verdict |
|---|---|
| Button hover (lift + colour shift) | **Use here** — 200 ms cap |
| Link arrow appears on hover | **Use here** — already shipped on cards |
| **Magnetic snap** to button | **Avoid** — clever, wrong register |
| Cursor effects (custom cursor) | **Avoid** — alienating on B2B |
| Sound | **Avoid** — wrong audience |

### Loading patterns

| Pattern | Verdict |
|---|---|
| **Skeleton** | Use for the lazy-loaded Demo block — already implemented |
| **Blur-up** | Use universally for photos — already implemented |
| Hairline sweep | **Use sparingly** — between section reveals |

### Page transitions

| Pattern | Verdict |
|---|---|
| **Native View Transitions API** | **Use here** for cross-page hub navigation in the new IA. Cross-document support is in Chrome since 126; Safari 18 has same-document; Firefox shipped behind a flag through 2025. Polyfill to opacity crossfade. |
| Lenis-driven page transitions | **Skip** — Lenis is for smooth scroll, not route changes |
| **Framer Motion** route transitions | **Keep** — already implemented via `AnimatePresence mode="wait"` |

### 3D / canvas moments

**Avoid all of them.** R3F, Three.js, WebGL gradient canvases — none of these are warranted on a calm German B2B permit page. The motion budget is too narrow and the tone is too formal. The single exception worth re-evaluating in twelve months: a quiet 3D pin marker on the wizard's map preview. Not now.

---

## 4. Tech stack — keep / add / replace / skip

| Library | Status today | Verdict | Rationale |
|---|---|---|---|
| Vite + React 19 + TS | Shipped | **Keep** | React 19's `<title>` hoisting + native `<Suspense>` already in use. No reason to migrate the app shell. |
| Tailwind v3 + shadcn | Shipped | **Keep** | Token system is already locked. Tailwind v4 is available but the migration is not yet ROI-positive for this codebase. |
| Framer Motion 12 | Shipped | **Keep** | LazyMotion + domAnimation tree-shake is already in the bundle. The library is more capable than anything else for React-bound motion at this brand register. |
| Lenis 1.3 | Shipped | **Keep — with a perf gate** | Lenis is not free. Enable on desktop; **disable on mobile** (currently `syncTouch: false` which is correct, but consider a full opt-out below 900 px). On reduced-motion, already skipped. |
| Vaul | Shipped | **Keep** | Used for drawers; no replacement needed. |
| React Router 7 | Shipped | **Keep** | Already in use; no migration warranted. |
| **GSAP + ScrollTrigger** | Not in stack | **Skip** | GSAP is now MIT-licensed under Webflow (since late 2024) so cost is no longer the issue. The issue is that **Framer Motion + native CSS scroll-driven animations cover everything Planning Matrix actually needs**. GSAP shines for heavy choreography (Awwwards-tier scrubs); we are explicitly avoiding that register. Adding GSAP is a 30–50 kB cost for capability we are choosing not to use. |
| **Theatre.js** | Not in stack | **Skip** | Animation orchestration / timeline tool. Wonderful for complex scrubs; overkill for a brand whose motion budget is "two atmospheric reveals and a hairline sweep." |
| **Three.js / R3F** | Not in stack | **Skip** | Wrong register. Reconsider only if a 3D map/parcel marker becomes a product feature. |
| **Rive** | Not in stack | **Skip** | Beautiful for vector character animation. The brand has no characters. |
| **Lottie** | Not in stack | **Skip** | After Effects export. The brand is photography + hairlines + type. No AE workflow exists. |
| **Motion One** (now `motion`) | Not in stack | **Add — selectively** | Motion is the lower-level library by Framer Motion's author. ~10 kB vs Framer's ~30 kB tree-shaken. Use it for **non-React surfaces only** — the prerendered marketing pages where you don't need React's component model. On the React app, keep Framer. |
| **Embla** | Not in stack | **Add — if a carousel becomes necessary** | Best-in-class headless React carousel. ~10 kB. Don't add until a real carousel use-case appears (logo wall is fine as a static grid). |
| **Native View Transitions API** | Not in stack | **Add** | Use for cross-page hub transitions in the new IA. Polyfill with opacity crossfade for Firefox. Cost: ~0 kB. |
| **CSS scroll-driven animations** | Not in stack | **Add — with caution** | Native `animation-timeline: scroll()` is in Chrome 115+ and Safari 26 (since Sep 2025). Firefox is still flag-only. Use for non-critical decorative animations (hairline sweep on section reveal); fall back to nothing in Firefox. **Do not** use as the only mechanism for any content-load-bearing animation. |
| **next-themes / similar** | Not in stack | **Skip for now** | Brand is locked light. Add a respectful dark mode in v2 if a real audience signal appears. |
| **MDX** | Not in stack | **Add — when content programme starts** | The Tier-1 SEO play (`/de/genehmigungsplanung-software`, the §34 explainer, the FAQ deep pages) wants long-form content with embedded React widgets. MDX is the right call. Astro has it native; in Vite, `@mdx-js/rollup` is fine. |
| **Astro** | Not in stack | **Defer — re-evaluate in 6 months** | The right long-term home for marketing pages. Best Lighthouse outcomes, islands architecture, native MDX. Migration cost is real (parallel stack, component sharing). **Recommendation: do not migrate now.** Ship `vite-prerender-plugin` (Vike) this week and build the content programme. If the content programme grows past ~10 pages with a real blog cadence, migrate marketing to Astro then. |

### Should marketing pages be a separate Astro/Next.js sub-project?

**Today: no. In six months: probably yes (Astro).**

The argument for Astro now is the cleanest indexing story, best Core Web Vitals, and zero-JS-by-default. The argument against is the dual-stack maintenance cost — a small team that ships fast does not benefit from owning two frameworks in week one. The pragmatic middle is **Vike (vite-plugin-ssr renamed) prerendering the existing Vite SPA**: ship static HTML for the marketing routes from the same codebase, no parallel stack, indexing fixed in a day. Re-evaluate Astro when the content programme is real (blog cadence, ten or more pages, MDX with embedded widgets). The reasoning is laid out in §8.

---

## 5. Animation strategy

### 5.1 Philosophy

Motion is **earned**, not decorative. Every animation must answer: *what does the user understand after it that they didn't before?* If the answer is "nothing — it just looks nice", cut it. The brief already says "calm motion gated by `prefers-reduced-motion`"; the discipline this report adds is **a budget**.

The budget:

- **Total motion budget per session:** at most **three** distinct motion moments above the fold, **two** below.
- **Hover/click feedback:** 180–220 ms, ease-soft. (This already matches `--duration-soft`; protect it.)
- **Scroll reveals:** 600 ms cap, ease-calm. (Currently 0.9 s on `fade-rise`; **tighten to 600 ms.**)
- **Hero entrance:** 800 ms cap, single staggered line.
- **No animation longer than 1.0 s** anywhere on the marketing site, ever.
- **No scroll-jacking.** Lenis smooths; it does not block.
- **No motion on frequent low-novelty actions** (Rauno's rule).

### 5.2 Library choice

Already settled in §4: **Framer Motion 12 + native CSS for decoration + native View Transitions API for page transitions**. No GSAP. No Theatre.

### 5.3 Three signature motion treatments — described in prose

These are the three motion moments Planning Matrix should *plan* for. They are not specifications; they are decisions a prototype should test.

**Motion 1 — Hero gradient bloom (atmospheric).** Behind the H1, a CSS-only radial gradient in warm-clay drifts on a 38-second loop. The bloom is half-opacity, masked to a 60% radius, and its centre wanders 40 px in each axis over the loop. Reduced-motion gates it to a static gradient. This is Linear's bloom executed in clay instead of blue. Cost: 0 kB JS, ~1 ms paint. Sentence-explanation: *the page has a pulse without anyone noticing it.*

**Motion 2 — B-Plan reveal (demonstrative, signature).** In the Product or Domains section, a single sticky panel pins for ~120 vh. Inside the panel, a real München parcel renders against a CARTO basemap (already implemented elsewhere in the app). As the user scrolls, three captions cross-fade in sync: "Grundstück" → "Bebauungsplan" → "Genehmigungspfad", and each caption activates a layer of the matrix overlay. The panel un-pins. The user has now seen the product *think*. This is the one moment Planning Matrix earns the right to be theatrical. Cost: medium — Framer Motion `useScroll` + `useTransform`, plus the existing WMS tile fetch (already in `/src/components/Map/`). Reduced-motion replaces the scroll-bound reveal with a static three-layer image and a button that toggles between layers. Apple's scrub, miniaturised and made honest.

**Motion 3 — Mono numeral mount-in (microinteraction).** On hero entrance, the headline animates as one fade-up line. Beneath it, a single piece of mono text ("§ 34 BauGB · in zwei Antworten · vier Minuten Vorprüfung") types in over 600 ms with a soft cursor. Once. No looping. The mono face is the new addition (see §4 — JetBrains Mono or Geist Mono). The effect is small enough that reduced-motion users see it appear instantly without missing anything; sighted users register *typed-by-the-system* without thinking the word "animation". Cost: trivial — `useEffect` + a single rAF tween.

Three moments. One atmospheric, one demonstrative, one micro. The remaining sections get reveal-on-scroll and nothing more.

### 5.4 What to remove from the current site

- **Parallax on Problem / Trust / FinalCta backdrops.** Cut to nothing or to a 12 px max drift. Currently four scroll-driven parallax surfaces compete; that is too many.
- **Ken Burns on hero rooftop.** Either keep on hero only or drop. Currently it competes with the gradient bloom, the parallax, and the seal float — the hero has four motion sources and reads as restless.
- **Tab underline animation in Domains.** Keep, but verify the easing matches the rest. Currently it is the most polished motion on the site; protect it.
- **Accordion plus-rotate.** Keep. This is exactly the right scale of motion.

---

## 6. Section-by-section rework

For each: does it earn its place, is the message clear in 3 seconds, is the density right, what is the single motion opportunity, and the explicit recommendation. The section names use the verbatim German headlines from the codebase.

### 6.1 Header / Nav

- **Earns place?** Yes.
- **3-second clarity?** Yes — logo, language switch, one CTA.
- **Density?** Right.
- **Motion opportunity:** sub-nav appears once hero exits viewport. Adopt Apple's pattern; render as a slim hairline bar with the three deep-page links (`Produkt`, `Lösungen`, `Preise`).
- **Recommendation:** *Add a sticky condensed sub-nav after the hero. Keep current desktop nav otherwise. On mobile, the existing drawer is correct — protect it.*

### 6.2 Hero — "Sie zeichnen ein Gebäude in fünf Minuten…"

- **Earns place?** Yes — the line itself is the strongest copy on the page.
- **3-second clarity?** Yes for German speakers; the rooftop image grounds it spatially.
- **Density?** Right.
- **Motion opportunity:** consolidate. Currently the hero has four motion sources (gradient mesh, Ken Burns, parallax photo, seal float). Cut to one — the gradient bloom from §5.3 — plus the 600 ms text reveal and the mono mount-in. Drop Ken Burns. Drop seal float.
- **Recommendation:** *Strip motion to: (1) gradient bloom behind H1, (2) staggered fade-up on the headline + sub, (3) mono mount-in on a single one-liner under the CTAs. Replace Ken Burns with a static AVIF (still preloaded). The CTAs already work; lift the primary one to clay-deep on hover with a 200 ms ease-soft.*

### 6.3 Problem — "Sie können ein Gebäude in fünf Minuten entwerfen. Drumherum nicht."

- **Earns place?** Yes — the rephrase of the hero from a different angle is editorial, not redundant.
- **3-second clarity?** No, currently — three numbered blocks (01-03) with similar visual weight require reading. The user does not know what to look at first.
- **Density?** Slightly too thin. The blueprint floorplan visual is decorative and does not carry information.
- **Motion opportunity:** none new. Cut the parallax backdrop.
- **Recommendation:** *Tighten the three blocks to two (merge 02 and 03 — "Regeln verändern sich" and "Verantwortung verteilt sich" are the same idea), and replace the decorative blueprint with the first concrete artefact on the page: a static screenshot of a real B-Plan callout from the wizard, with mono labels for the three sections of paragraphs. Cut parallax. Reveal-on-scroll is enough.*

### 6.4 Product — "Drei Schritte. Vom Grundstück zum Genehmigungspfad."

- **Earns place?** Yes — this is the elevator pitch.
- **3-second clarity?** Mostly. The three-up grid reads, but the mockups (CaptureMockup / RecommendMockup / ReleaseMockup) are stylistically inconsistent with the photography elsewhere.
- **Density?** Right.
- **Motion opportunity:** **this is where Motion 2 (B-Plan reveal) lives.** Replace the three static mockups with one sticky panel that demonstrates the matrix updating across all three steps as the user scrolls.
- **Recommendation:** *The single most consequential change on the entire page. Replace three mockups with one sticky-pinned demonstrative reveal that costs ~120 vh and earns the user's attention by showing the system actually thinking. Reduced-motion users get a static three-image stepper. This is the page's signature.*

### 6.5 Domains — "Wie das System denkt."

- **Earns place?** Yes — this is the credibility section. The §§ BauGB badges are the most important typographic moment outside the hero.
- **3-second clarity?** Yes once the user is on a tab. The tab labels (A / B / C with "Planungsrecht / Bauordnungsrecht / Sonstige Vorgaben") are excellent.
- **Density?** Right.
- **Motion opportunity:** the tab underline animation is already the best motion on the site. Protect it. The per-tab backdrop crossfade is good but could be tightened to 600 ms.
- **Recommendation:** *Switch the BauGB badges to the new monospace face. Tighten backdrop crossfade to 600 ms. Add an unobtrusive Bundesland note under the tab content ("Beispiele aus Bayern. Bundesweit verfügbar.") — currently the page reads München-only.*

### 6.6 Demo — "Vom Vorhaben zum Pfad. In zwei Antworten."

- **Earns place?** Yes — but only just. A demo block on a marketing page is conventional; the value is whether it loads fast enough to feel real.
- **3-second clarity?** No — the DemoBrowser is code-split with Suspense, which means the user often sees a skeleton on first paint.
- **Density?** Right.
- **Motion opportunity:** none. Keep the skeleton.
- **Recommendation:** *Either commit harder — make this block ~80% of the viewport tall and treat it as the hero of the second screen — or cut it entirely and link from the Product section to a `/demo` page. Currently it sits in the middle as a half-commitment. **Lean to: keep, but enlarge and prerender the first frame as a static AVIF.***

### 6.7 Audience — "Drei Perspektiven. Ein System."

- **Earns place?** Yes — this is where DACH B2B buyers find themselves on the page.
- **3-second clarity?** Yes.
- **Density?** Right.
- **Motion opportunity:** none new — the existing card hover (lift + clay hairline) is correct.
- **Recommendation:** *Make each card link to a dedicated `/loesungen/{bauherr|architekt|projektentwickler}` page. The card on its own is too thin to convert; it earns its place once it is the entry to a deeper page.*

### 6.8 Trust — "Empfehlen heißt nicht entscheiden."

- **Earns place?** Yes — and the headline is, after the hero, the second-best line on the page.
- **3-second clarity?** Yes.
- **Density?** Slightly too prose-heavy. Two paragraphs plus a three-pillar grid is a lot.
- **Motion opportunity:** cut the parallax. Add nothing.
- **Recommendation:** *Trim the two paragraphs to one. Foreground the three-pillar grid (Provenance / Auditpfad / Architektenfreigabe) — these are the trust signals German buyers scan for. Add the AWS-Frankfurt-region mention and a placeholder for a named external-audit firm (Bitkom Consult or similar) once you have one. This is what the Personio reference does well.*

### 6.9 Pricing — "Preismodell in Entwicklung."

- **Earns place?** Yes — the absence of pricing is currently a credibility hit.
- **3-second clarity?** No — "in development" reads as evasive in German B2B context.
- **Density?** Too thin.
- **Motion opportunity:** none.
- **Recommendation:** *Replace with the DACH-standard three-tier card: **Solo / Studio / Enterprise**, with a public number for the first two and "Auf Anfrage — Demo vereinbaren" for Enterprise. Include MwSt. note and AGB / Datenschutz link directly under the cards. The Valueships data is clear — 41.5% of German SaaS publish pricing; the half that do enjoy meaningfully better trust signals. Even a placeholder number ("ab 49 €/Monat netto, Pilot kostenlos") is more credible than "in Entwicklung". This is the second-most-impactful change on the page.*

### 6.10 FAQ — "Kurze, ehrliche Antworten."

- **Earns place?** Yes.
- **3-second clarity?** Yes.
- **Density?** Right.
- **Motion opportunity:** the accordion plus-rotate is correct. Don't change it.
- **Recommendation:** *Add `FAQPage` JSON-LD to this section (currently absent). FAQ rich snippets in SERPs are largely restricted to gov/health, but the structured data feeds AI Overviews (Gemini, ChatGPT, Perplexity) which are increasingly the source of B2B referral traffic. Keep the question count at 6–8; expand-by-default for the first question.*

### 6.11 Final CTA — "Bauen Sie planbarer."

- **Earns place?** Yes.
- **3-second clarity?** Yes.
- **Density?** Right.
- **Motion opportunity:** cut the parallax.
- **Recommendation:** *Soften the CTA from a generic "Frühzugang" mailto to a calendar link ("Demo vereinbaren") once a Cal.com or similar is in place. Keep the photograph; remove parallax.*

### 6.12 Footer

- **Earns place?** Yes.
- **3-second clarity?** Yes.
- **Density?** Right.
- **Motion opportunity:** none.
- **Recommendation:** *Add Trust Center links (Datenschutz, Impressum, AGB, Sicherheit) explicitly grouped — DACH compliance hygiene. Currently they are likely in the footer already but should be visually grouped under a "Vertrauen" label. Add language switcher and a hairline-thin newsletter input ("Nur substanzielle Updates. Etwa einmal pro Monat.").*

---

## 7. Information architecture recommendation

The current single long-scroll is correct *as a homepage* but wrong as the *only* surface. Three converging arguments point to a hub-and-deep-page IA:

1. **SEO** — uncontested German B2B keywords (`Genehmigungsplanung Software`, `Planungsrecht Software`, `Bauvoranfrage`) need their own pages with their own content depth. They do not belong on `/`.
2. **Buyer journey** — the three audience cards (Bauherr / Architekt / Projektentwickler) are stronger as entry points to deeper pages than as cards on the home.
3. **Density management** — the home keeps editorial calm; depth lives one click away.

### Recommended URL structure

```
/                                       → editorial overview (current 10 sections, tightened per §6)
/de/                                    → DE entry (canonical for German market)
/en/                                    → EN entry
/de/produkt                             → product deep-dive (the matrix, the §§ logic, the audit trail)
/de/loesungen/bauherr                   → audience-specific landing
/de/loesungen/architekt
/de/loesungen/projektentwickler
/de/preise                              → pricing (three tiers + AGB/Datenschutz)
/de/genehmigungsplanung-software        → Tier-1 SEO landing
/de/bauvoranfrage                       → Tier-1 SEO landing (longer-tail)
/de/§34-baugb-pruefen                   → Tier-2 SEO content (URL-encoded paragraph mark)
/de/faq                                 → expanded FAQ with schema
/de/vertrauen                           → trust center (Datenschutz, Sicherheit, Impressum)
/app                                    → product (current SPA)
```

Mirror under `/en/` for English. `x-default` → `/de/` (DE is the primary market).

### Primary nav

Five items, no more: **Produkt · Lösungen · Preise · Vertrauen · App**. Language switch as an icon. CTA on the right ("Demo vereinbaren").

### Footer structure

Four columns: **Produkt** (Produkt, Lösungen, Preise) · **Wissen** (FAQ, Genehmigungsplanung, Bauvoranfrage, §§ BauGB) · **Vertrauen** (Datenschutz, Impressum, AGB, Sicherheit, Statusseite) · **Über** (Team, Karriere if applicable, Presse, Kontakt). German B2B footers are dense by convention — protect that convention.

### Hub vs single-page

The home stays editorial; the work is to *not duplicate it* on the deep pages. Each deep page leads with its own hero, runs its own argument, and links back to the home for the elevator pitch. Cross-link strategically — every Tier-1 SEO page should link to two adjacent pages and the home.

---

## 8. SEO strategy

### 8.1 Keyword priorities (DACH-honest)

Keyword-volume data for German B2B SaaS micro-niches is unreliable without paid tooling (Sistrix / Ahrefs DE). The following is intent + SERP-difficulty triage; verify against paid data before content lockdown.

**Tier 1 — go after now (low–medium difficulty, high B2B intent):**

1. `Genehmigungsplanung Software` — bullseye. SERP is HOAI explainers; no SaaS has locked it on the Antragsteller side.
2. `Planungsrecht Software` — almost no commercial SERP. Land-grab.
3. `Baurecht Software` — sparser SERP, beatable.
4. `Bauvoranfrage` + long-tails (`Bauvoranfrage Checkliste`, `Bauvoranfrage München`).
5. `BIM Genehmigungsplanung` — thin SERP, future-looking.

**Tier 2 — content plays, longer payoff:**

6. `§34 BauGB prüfen` / `§35 BauGB prüfen` — practical, not legal-text. SERP currently jura-academy.
7. `Bauvorschriften prüfen` — messy SERP, opportunity.
8. `Architektensoftware Baugenehmigung` — low volume, laser-targeted.

**Tier 3 — do not invest:**

- `Bauantrag stellen`, `Baugenehmigung beantragen`, `Bauantrag online` — wrong audience (private builders) or unbeatable incumbents (`.bayern.de`).
- `Bauleitplanung` — gov + DiPlanung + state portals own this.

### 8.2 Schema.org

Ship three blocks of static JSON-LD in `index.html` (so they parse before any JS runs):

- **`Organization`** — name, legalName, url, logo, sameAs (LinkedIn, future GitHub), contactPoint with `availableLanguage: ["de","en"]`, address (`addressCountry: "DE"`).
- **`SoftwareApplication`** as `WebApplication` — name, description, applicationCategory `BusinessApplication`, applicationSubCategory `Construction Permit Decision Support`, operatingSystem `Web`, audience `BusinessAudience`, featureList, inLanguage `["de-DE","en-US"]`. **Omit `offers` and `aggregateRating` until real values exist** — fabricating either is a structured-data violation.
- **`FAQPage`** — Question/Answer pairs matching the on-page FAQ. Visible rich snippets are restricted to gov/health, but AI Overviews read this avidly.

Once multi-page IA ships, add **`BreadcrumbList`** per page. Defer **`Article`/`BlogPosting`** until the blog ships; defer **`WebSite` + `SearchAction`** until on-site search exists. **Do not use `LocalBusiness`** — Planning Matrix is a national digital tool.

### 8.3 Hreflang + canonical

Subfolders, not subdomains: `/de/...` and `/en/...`. `x-default` → `/de/`. Each page self-references in hreflang and is its own canonical. Symmetry is mandatory (DE↔EN must reciprocate). Render the language switcher as a real `<a href>` link, not a JS handler — Googlebot must see both URLs as crawlable.

### 8.4 Rendering — the recommendation

**Today: ship `vite-prerender-plugin` (Vike) on the existing Vite SPA.** Static HTML for `/`, `/de/...`, `/en/...`. Effort: half a day. Solves the single biggest current SEO blocker — that Googlebot's two-wave indexing model leaves CSR pages stuck in the render queue for hours or days, and that AI crawlers (Perplexity, Claude, ChatGPT-Search) execute JS far less reliably than Googlebot.

**In six months: re-evaluate Astro for marketing.** If the content programme has grown to ten or more pages with a real blog cadence, migrate marketing to Astro (kept in the same repo, same Vercel project, with a workspace package for shared UI). Astro wins content-page Core Web Vitals comfortably and ships zero-JS by default.

**Do not migrate to Next.js** for marketing alone. The framework's strengths (RSC, server actions) go unused for static marketing; the migration cost is the highest of the four options.

### 8.5 Three SEO wins shippable in a week

1. **Prerender** the marketing routes with `vite-prerender-plugin`. Half a day.
2. **Static JSON-LD** for Organization + WebApplication + FAQPage. Two hours.
3. **One Tier-1 long-tail page** at `/de/genehmigungsplanung-software` — ~1500 words, internal links to home and `/de/bauvoranfrage`, hreflang to `/en/permit-planning-software`. One day content + half a day implementation.

In sequence: prerender unlocks indexing → schema unlocks entity recognition → Tier-1 page unlocks rankings. Then in week 2: hreflang, EN translations, second Tier-1 page (`bauvoranfrage`).

---

## 9. Performance strategy

### 9.1 Targets to plan for

- **Lighthouse** ≥ 95 on all four (Perf, A11y, Best Practices, SEO) on `/` and on every Tier-1 page.
- **LCP** < 1.5 s on 4G mobile (the brief said 1.8 s; hold yourself to 1.5 because LCP is partly a brand-craft signal).
- **INP** < 150 ms (brief said 200; hold to 150).
- **CLS** < 0.05.
- **Total JS gzipped at first paint** < 180 kB on `/` (brief said 200; hold to 180).

### 9.2 Tactics

**Imagery.** AVIF primary, WebP fallback, JPG legacy — already shipped. Responsive `srcset` already shipped. Hero AVIF is already preloaded with media queries — protect this. **Add:** AVIF blur-up placeholder (low-quality 24 px AVIF inline as `data:` URL) for non-hero photos that load on scroll.

**Fonts.** Self-hosted Inter Variable + Instrument Serif — DSGVO-correct, already shipped. **Add:** preload only the two fonts used above the fold (Instrument Serif Regular, Inter Variable). Subset both to Latin-Extended (drops ~20–30 kB). The new mono face (JetBrains Mono / Geist Mono): ship only Regular + Medium, subset to digits + punctuation + the three letters used in `BauGB` etc. — under 10 kB total.

**Animation.** GPU-only properties (`transform`, `opacity`, `filter`) — never `top`/`left`/`width`/`height`. IntersectionObserver-gate every reveal. Disable Lenis below 900 px viewport (touch scroll is already smooth on iOS/Android; Lenis adds RAF cost for no perceptible benefit).

**Code-splitting.** Lazy-load the Demo block — already shipped. **Add:** lazy-load the language switcher's inactive language bundle. Lazy-load Vaul (drawer) on mobile only.

**Lenis perf budget.** Lenis costs ~3 kB gzip + a steady RAF loop. Currently disabled under reduced-motion (correct) but enabled on mobile. **Drop on mobile** (window.matchMedia('(max-width: 900px)')).

**Cache.** Vercel edge cache for static prerendered pages with `Cache-Control: public, max-age=0, s-maxage=86400, stale-while-revalidate=604800`. Immutable assets (hashed JS/CSS/AVIF) get `Cache-Control: public, max-age=31536000, immutable`.

**Below-the-fold deferral.** No autoplay video. No `script` without `defer` or `async`. Posthog and Sentry already loaded but verify they are below-the-fold and async.

### 9.3 Core Web Vitals as ranking signals

Google's CWV thresholds in 2026 are essentially unchanged: LCP 2.5 s, INP 200 ms, CLS 0.1 are the "good" thresholds. Beating them is what ranks; matching them is just not-failing. Plan for the targets in §9.1, not the floors.

---

## 10. Accessibility plan

### 10.1 Standards target

**WCAG 2.2 AA minimum.** AAA on body text contrast where the warm-paper palette permits (`--ink` on `--paper` measures ~14:1 — comfortably AAA). Title cards on warm-clay backgrounds may drop to AA — verify per Domains tab.

### 10.2 What is already correct

- `prefers-reduced-motion` gates Lenis entirely, gates Hero parallax to no-op, gates `AnimatedReveal` to plain divs, and compresses all CSS animations to 0.001 ms via globals.css. **This is excellent and should be protected during the refactor.**
- Skip-to-content link ("Zum Inhalt springen") is present.
- `:focus-visible` outline restored after shadcn resets — 2 px solid ink, 2 px offset.
- `<html lang>` synced to i18n.resolvedLanguage.
- Self-hosted fonts (DSGVO).
- `aria-hidden` on decorative grain overlay and gradient blocks.

### 10.3 What to verify or add

- **Tab order in Domains.** With three tabs and a per-tab content pane, verify keyboard tab order: tab into tablist → arrow keys to switch tabs (not tab) → tab into content pane → tab out. Radix usually gets this right; a quick run with VoiceOver and NVDA is warranted.
- **Touch targets ≥ 44×44.** Verify the language switcher icon and the FAQ accordion triggers on mobile. The hairline-thin aesthetic can starve touch targets; use padding to expand the hit area without changing the visual weight.
- **Form labels.** Once a real CTA form exists (not just `mailto:`), every field gets an explicit `<label>`, no placeholder-as-label.
- **Reduced-motion fallback for the new B-Plan reveal.** Static three-image stepper with a button to advance. This must be designed before the animated version is built.
- **Colour-blind accessibility on the matrix overlay.** B-Plan layers should differ in pattern + value, not only hue.
- **Lang attribute on EN content.** `<html lang="de">` at the root is correct; English-language elements within an otherwise-DE page (rare, but possible on the language switcher itself) need `lang="en"`.

### 10.4 Current gaps observed

- The og.svg image at `og:image` is fine for desktop but **OG previews on Slack/LinkedIn render SVG inconsistently**. Ship a 1200×630 AVIF/PNG fallback as `og:image`, keep SVG as `og:image:url` if needed.
- No `<meta name="theme-color" media="(prefers-color-scheme: dark)">` — add once a dark mode exists; until then, the single `theme-color: #f8f4ed` is correct.
- Hreflang annotations are not yet shipped (per the codebase audit). Ship them with the prerender.

---

## 11. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Heavy motion library blowing the JS budget | LCP regression, INP regression, brand register breaks | Reject GSAP, Theatre, R3F, Rive, Lottie. Stay on Framer Motion. Audit bundle on every PR with `vite-bundle-visualizer`. |
| Lenis conflicting with native scroll-driven animations | Scroll feels weird; tab focus jumps; CSS `animation-timeline: scroll()` mismatches expected positions | Test scroll-driven CSS animations *with Lenis enabled* before shipping. If they conflict, drop scroll-driven CSS for that animation; keep Lenis. |
| View Transitions API browser support gaps | Firefox users get a hard cut between pages | Ship a simple opacity-crossfade fallback. No-op for `prefers-reduced-motion`. |
| SEO loss during a migration to Astro/Next | Months of ranking work evaporates | **Do not migrate now.** Use prerender as bridge. When Astro migration comes, mirror URL structure exactly, ship 301s for any change, keep canonical/hreflang stable. |
| Translation drift between DE and EN | EN content goes stale and Google penalises duplicate-of-English pages | Treat DE as canonical. Every DE update gets an EN-update task. Use a single i18n source of truth (already in place via i18next). Ship EN with `inLanguage` and `hreflang` from day one. |
| Photography file size eating LCP | Hero LCP regresses past 1.5 s | AVIF preload is already correct. Verify file sizes weekly during prototype. Cap hero AVIF at 90 kB (current size unknown — measure). |
| Custom cursors / 3D moments alienating B2B audience | Brand register breaks; trust signal degrades | Reject custom cursors and 3D categorically (§3, §4). Even one is enough to break the register. |
| "Calm" reading as "boring" if motion is undercooked | Conversion drops; brand reads as understyled | The three signature motions (§5.3) earn their place. The site is *deliberate* calm, not absence of motion. The atmospheric gradient + the demonstrative B-Plan reveal are insurance against "boring". |
| Pricing-placeholder reading as evasive | Trust signal degrades; DACH buyers walk | Replace with three-tier card per §6.9. Even a placeholder number is more credible than "in Entwicklung". |
| Mono numerical type clashing with Instrument Serif | Brand register fragments | Pick a quiet mono (Geist Mono or JetBrains Mono Regular) — not a heavy or quirky one. Weight 400, not 500. Use only for numerals and code references, never for prose. |

---

## 12. Open questions for Rutik

These are decisions that should be made before any prototype work, in roughly this order:

1. **Render strategy — confirm Vike now, Astro in six months?** Or do you want to commit to Astro immediately? The argument for "now" is one less migration; the argument for "later" is small-team focus.
2. **The mono numeric face — Geist Mono (Vercel) or JetBrains Mono (Jetbrains)?** Both are free and ~10 kB subset. Geist Mono pairs better with Inter; JetBrains Mono is more textural. Recommendation: Geist Mono.
3. **Pricing — placeholder numbers or real ones?** Even "ab 49 €/Monat netto, Pilot kostenlos" is more credible than "in Entwicklung". What number is defensible today?
4. **B-Plan reveal — is München exclusivity OK, or does the matrix need to demo for a non-Bayern parcel?** Currently the WMS overlay is München-only. A Berlin or Hamburg parcel would broaden the geography signal.
5. **Three-tier audience pages — ship all three (`/loesungen/bauherr|architekt|projektentwickler`) at once, or stagger?** Recommendation: ship Architekt first (closest to ICP), then Projektentwickler, then Bauherr.
6. **Domain — when does `planningmatrix.de` (or `.com`) replace the `vercel.app` URL?** Vercel-suffix URLs are fine for staging but cap SEO upside. The Tier-1 SEO push needs a real domain.
7. **Trust signals — which named external auditor will you cite (Bitkom Consult equivalent)?** Even a procurement intent is fine for v1; the placeholder copy can read "Externes Audit Q4 2026".
8. **Demo CTA — `mailto:` until when?** Cal.com or similar would convert better; the question is whether the bandwidth exists to staff demo bookings.
9. **Blog — when does it ship?** This determines whether the Astro migration becomes urgent in three months or twelve.
10. **OG image — is the current SVG good enough, or do you want a styled photograph as the primary OG image?** Slack/LinkedIn render SVG inconsistently; an AVIF/PNG export is recommended regardless.

---

## Closing

If you do exactly one thing differently, do this: **ship one prerendered Tier-1 SEO landing at `/de/genehmigungsplanung-software` this month, with the static JSON-LD and the new monospace face for §§ references, and let it run for ninety days before touching anything else.** Everything in this report is downstream of whether that page is read.
