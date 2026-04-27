# Landing — Phase 1 notes

Live: https://planning-matrix.vercel.app/  ·  Repo: https://github.com/rutikerole/Planning_Matrix.git

## What shipped

A complete, premium-feeling marketing landing page in DE (primary) and EN (fallback), end-to-end:

1. **Sticky Nav** — wordmark · primary links (Produkt / Für wen / Preise) · DE/EN toggle · Anmelden ghost · `Frühen Zugang anfragen` filled CTA. Backdrop-blurs the warm paper behind it on scroll. Mobile drawer via `vaul`, full nav incl. FAQ.
2. **Hero** — eyebrow + animated hairline + two-line serif headline (line 2 italic) + sub + two CTAs + a quiet trust line. Pure typography on warm paper. No screenshot, no gradient mesh.
3. **Problem** — three escalating manifesto blocks indexed `01 / 02 / 03`, ramping from muted body → ink title → display-italic punchline ("Drei Fragen. Ein halbes Jahr. Bevor der erste Stein liegt.").
4. **Product** — three steps (Erfassen / Empfehlen / Freigeben) as typographic columns, each anchored by a custom inline SVG glyph (capture, decision-graph, stamp). Glyph + hairline pick up clay on group-hover.
5. **Domains** — A · Planungsrecht / B · Bauordnungsrecht / C · Sonstige Vorgaben. Custom-styled radix tabs with a clay underline that slides between active triggers, content cross-fades on switch with `AnimatePresence`. Side column shows example concepts (Bebauungsplan, § 34 BauGB, Brandschutz, etc.).
6. **Audience** — three cards (Bauherr / Architekt / Projektentwickler) sharing a 1-px gutter so they read as one unit. Top hairline picks up clay on hover; card warms one shade.
7. **Trust** — magazine-style two-column ("Empfehlen heißt nicht entscheiden." left at display size, body right). Three pillars below numbered I/II/III: Provenance, Auditpfad, Architektenfreigabe.
8. **Pricing** — single editorial confession that the model is in development, with a clay-bar quote rail and one mailto CTA. No fake tiers.
9. **FAQ** — six honest questions in a custom-styled radix accordion. Plus icon rotates to ×; on open, the trigger square inverts to ink-on-paper.
10. **Final CTA** — centered, quiet, big serif headline ("Bauen Sie planbarer."), one button.
11. **Footer** — wordmark + tagline + DE/EN switcher + three columns (Produkt / Unternehmen / Rechtliches with placeholder Impressum/Datenschutz/AGB) + © line + version pill.
12. **404** — same design language: italic display "404", clay hairline, serif heading, body, return-home CTA.

## Design decisions

- **Typography pairing.** Instrument Serif (display) + Inter (everything else). Two families. Eyebrows are Inter `tracking-[0.18em] uppercase` rather than introducing a third (mono) family — this is the Stripe/Linear move and keeps the font payload light.
- **Type scale.** Custom `eyebrow / caption / body-lg / body-xl / title-sm / title / title-lg / headline / display-3 / display-2 / display-1` — all clamp()-based for fluid responsive sizing. Defined in `tailwind.config.js` under `theme.extend.fontSize` so the default Tailwind ladder is preserved.
- **Color economy.** Three crayons. `--paper: 38 30% 97%` (warm off-white), `--ink: 220 16% 11%` (deep ink), `--clay: 25 30% 38%` (muted clay), plus muted gray for borders/secondary text. Accent is used homeopathically — only on the wordmark dot, the nav hover underline, the active tab indicator, the FAQ-open square, the audience-card hover hairline, and a few decorative bullets. Never on big surfaces. Never on the primary CTA (which is ink-filled).
- **No competitor overlap.** Premium SaaS reference set (Linear/Vercel/Stripe/Attio/Resend/Raycast) almost never uses serif headlines; the German building-permit competitor set (Rulemapping/BRISE/ARCHIKART/WEKA) is uniformly utilitarian-sans-on-clinical-white. The serif headline + warm-paper background is the single biggest gesture that differentiates this page from both groups.
- **Animation philosophy.** Calm, earned, gated. Lenis with gentle `lerp: 0.1` (only on wheel; mobile native scroll left alone) — disabled entirely under `prefers-reduced-motion`. `AnimatedReveal` uses `whileInView { once: true, amount: 0.25 }` with `y: 14 → 0`, opacity, 700ms, easing `cubic-bezier(0.16, 1, 0.3, 1)`. Hover transitions 180ms. Hero animates a single hairline drawing across once on load, then text fades-up in cascade. No parallax, no marquee, no springy bounces. Domains tab indicator slides via explicit `animate={{ x, width }}` (not `layoutId`, so we stay on the lighter `domAnimation` features bundle).
- **Wordmark.** "Planning Matrix" in Inter 500 with a small clay square preceding it. Logo discipline matches Linear/Stripe (just-the-name) but with a single clay accent that ties the whole page's color economy together. Favicon: ink rounded square with italic serif "P" — works at 16×16.
- **Sie, never Du.** Formal address everywhere, per German enterprise B2B register. No exclamation marks, no urgency stacking, no hype copy. Quantified claims are honest ("Thüringen und Sachsen", "in zwei Fragen") — no fake logos or testimonial counts.

## Libraries added beyond the scaffold

- `@radix-ui/react-accordion` (transitive via shadcn `accordion`)
- `@radix-ui/react-tabs` (transitive via shadcn `tabs`)
- `@radix-ui/react-slot` (transitive via shadcn `button`)

Not added: cobe, three.js, GSAP, sharp. The brief authorised heavier additions; restraint was the better choice.

`framer-motion` is wrapped in `LazyMotion` with `domAnimation` features, dropping ~14kB gzipped vs. importing `motion.*` directly.

## Quality gates — what passed locally

- `npx tsc --noEmit` — clean
- `npm run build` — clean (no warnings; chunk-size limit bumped to 800kB to silence the informational notice — production gzipped JS is **174kB**, CSS **6.3kB**, HTML **1.3kB**)
- `npx eslint .` — clean
- `prefers-reduced-motion: reduce` — `AnimatedReveal` returns plain children, Lenis does not mount, the tab indicator skips its slide animation, page-entrance keyframes are clamped via the global CSS reset.
- `<noscript>` fallback ships a small ink-on-paper page with the elevator pitch and the early-access mailto.
- `prefers-color-scheme` — light only by design. `meta name="color-scheme" content="light"` set; no dark mode in scope for Phase 1.
- DE / EN parity — both locale files have identical 119-key shape, verified by a flatten-and-diff script.

## Quality gates — needs human verification on the Vercel preview

Tomorrow's manager review — please run through these on the live URL:

- [ ] **Lighthouse on mobile** for Performance / A11y / Best Practices / SEO — target 95+ all four. The hero has an animated hairline + cascade fade-rise; ensure CLS stays under 0.1.
- [ ] **Visual sweep at 375 / 768 / 1024 / 1280 / 1920 widths.** Layout was built mobile-first; spot-check the Domains tab list at narrow widths (it wraps to two rows on phones — the indicator measures from `offsetLeft`, so wrapping is fine).
- [ ] **CPU 4× throttling** in DevTools — confirm the page hydrates without jank.
- [ ] **Tab navigation** through every interactive — skip-to-content, nav links, language switcher, all CTAs, all tab triggers, FAQ accordion, footer links. Focus rings are ink-colored at 2px with 3px offset, designed to be visible against warm paper.
- [ ] **Screen reader** — `<html lang>` follows the language switcher; nav has `aria-label`; tabs have manual `role="tabpanel" aria-labelledby` wiring; SVGs are `aria-hidden`.
- [ ] **OG preview** — `/og.svg` is referenced as `og:image`. Slack / Discord / Apple Messages render SVG fine; X / LinkedIn may not. If the Twitter card doesn't render an image, we can add a rasterised PNG in a follow-up commit (the SVG is hand-tuned 1200×630 with Instrument-Serif-style headline).

## Known issues / next-session backlog

- **Pricing card visual weight.** Currently very minimal — a clay vertical bar + paragraph + CTA. Once we have a real pricing model (Pilotnutzer pricing tier, etc.), this section will need a proper redesign — likely 2–3 plan cards with clear annual/monthly toggle.
- **Login flow.** "Anmelden" is a placeholder `href="#"`. Will be wired in Phase 2 (auth + dashboard).
- **Imprint / Datenschutz / AGB.** Footer placeholder `href="#"`. Legally required for German B2B sites — must be filled before any meaningful go-live announcement.
- **Trust badges.** No DSGVO / EU-hosting / TÜV badges yet. The German B2B research showed these matter; I deliberately left them off Phase 1 because we don't have the certifications yet and faking them would damage credibility. Add real ones as they land.
- **Pilot logos / case studies.** "In Pilot mit Architekturbüros und Projektentwicklern aus Thüringen und Sachsen." is the most we can honestly say today. Replace with actual partner logos as they sign.
- **OG PNG fallback.** If LinkedIn / X don't render `og.svg`, generate a raster fallback (offline, e.g. via a Figma export or a one-shot `sharp` script).
- **Bundle size.** 174kB gzipped is acceptable but lazy-loading below-fold sections (`Domains`, `Trust`, `Pricing`, `Faq`, `FinalCta`) via `React.lazy` would push first-paint JS lower. Worth doing if Lighthouse Performance comes in below 95.

## What I'd do next session (Phase 2 candidates)

1. **Auth + dashboard skeleton.** Sign-up flow, project creation, the two-question wizard ("Wo? Was?"). This is where the product begins.
2. **Bundesland coverage map.** A muted-style map of Germany with Thüringen filled in clay; hover tooltips for "in Vorbereitung" Bundesländer. Lives in the `audience` or after `domains` as a credibility moment once we have a coverage story to tell.
3. **A real "Wie es funktioniert" video or scrollytelling.** Once the product UI exists, a 30-second loop of the two-question → roadmap flow above the fold (or replacing the eyebrow → headline) would be the strongest possible upgrade.
4. **Impressum / Datenschutz / AGB pages.** Legally required — should not ship publicly without these.
