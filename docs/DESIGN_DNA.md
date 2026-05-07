# Design DNA — canonical lockdown

**Status:** authoritative. Supersedes the "NO shadows / NO rounded outline cards" framing in `AUDIT_REPORT.md` §12 and any earlier PHASE_X_FINDINGS.md write-up.

**Scope:** the visual primitives every Claude session and every new contributor must respect when changing CSS, Tailwind classes, or component styling.

**Provenance:** the operating-mode tokens were introduced by **commit `8631bde`** on **2026-04-28** (Rutik, `feat(chat): persistent input bar with attachments + suggestion-chip-above-input pattern`). The shadow values are intentional. They are not drift.

```
> git blame -L 178,184 src/styles/globals.css

8631bde8 [data-mode='operating'] {
8631bde8   --pm-radius-input: 0.75rem;
8631bde8   --pm-radius-card:  1rem;
8631bde8   --pm-radius-pill:  9999px;
8631bde8   --pm-shadow-input: 0 1px 2px hsl(220 15% 11% / 0.04);
8631bde8   --pm-shadow-card:  0 1px 3px hsl(220 15% 11% / 0.06);
8631bde8   --pm-tracking-body: 0.005em;
```

---

## The two modes

Planning Matrix has two visual modes, scoped via CSS attribute selectors. Each mode owns its own token set. Atelier-mode surfaces NEVER inherit operating-mode tokens.

| Token / rule              | `[:root]` — atelier mode                            | `[data-mode='operating']` — operating mode      |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| Hairline borders          | 0.5 px hairlines only                                | 0.5 px hairlines only                            |
| Shadows                   | **NONE** (`--pm-shadow-input` and `--pm-shadow-card` are `0 0 0 transparent` at `:root`) | `--pm-shadow-input: 0 1px 2px hsl(220 15% 11% / 0.04)`, `--pm-shadow-card: 0 1px 3px hsl(220 15% 11% / 0.06)` |
| Card border-radius        | sharp corners (no rounded outline cards)             | `--pm-radius-card: 1rem`                          |
| Input border-radius       | sharp corners                                        | `--pm-radius-input: 0.75rem`                      |
| Pill radius               | `9999px`                                             | `9999px`                                          |
| Typography                | Inter + Instrument Serif                             | Inter + Instrument Serif                          |
| Color palette             | paper, ink, clay                                     | paper, ink, clay                                  |

---

## Which surface is in which mode

**Atelier mode (`[:root]`)** — deliverable surfaces, marketing, pre-project chrome:

- Landing page (Hero, Pricing, Analyzer, every section)
- Auth pages (sign-in, sign-up, password reset)
- Dashboard (project list, ProjectCard, suggested-project chips)
- Wizard (Q1 SketchCards, Q2 PlotMap, BPlanCheck, Loader)
- Result page (cover hero, briefing tabs, share view)
- Public 404, Impressum, AGB, Datenschutz

These never carry shadows. Cards are sharp-cornered with 0.5 px hairlines.

**Operating mode (`[data-mode='operating']`)** — active project surfaces:

- Chat workspace (Thread, Spine, RightRail, InputBar, MatchCut, Astrolabe, Stand-up, CapturedToast, LedgerPeek, JumpToLatest)
- Atelier Console (admin-only TraceCard, InlineLogsDrawer)
- Architect dashboard (Phase 13)

These carry the soft `--pm-shadow-input` / `--pm-shadow-card` and the rounded radii.

---

## The rule

**Atelier-mode surfaces never inherit operating-mode tokens.** A change that adds `shadow-md` or `shadow-lg` to Pricing.tsx, Hero.tsx, ProjectCard.tsx, the briefing surfaces, or any other atelier surface is a regression. The current shadow leaks identified in the audit (`AUDIT_REPORT.md` §12 — Pricing, Hero, ProjectCard) are atelier-mode bugs, NOT operating-mode bugs. They should be cleaned up; the operating-mode tokens should not.

The reverse is also a regression: an operating-mode surface deliberately stripped of `--pm-shadow-card` reads as half-finished and breaks the working-context affordance the chat workspace depends on.

---

## How to add a new surface

1. Decide: is this surface deliverable (atelier) or working (operating)?
   - Static, public, or pre-project → atelier.
   - Per-project, mutates state, the Bauherr is "in flight" → operating.
2. If operating: scope the surface inside an element carrying `[data-mode='operating']` (the chat workspace already does this at the layout root in `ChatWorkspacePage.tsx`; admin surfaces add it explicitly).
3. Use `var(--pm-shadow-card)` and `var(--pm-radius-card)` rather than literal `shadow-[…]` / `rounded-[…]` so the surface inherits the active mode's tokens.
4. Never use `shadow-sm`, `shadow-md`, `shadow-lg` directly. Those Tailwind utilities bypass the token system and pin a shadow regardless of mode.

---

## Do not re-litigate

This document is the lockdown. If a future audit, finding doc, or model session calls the operating-mode shadows "drift" or "design DNA violations," that audit is wrong, not the code. The shadow values were a deliberate Phase-3.6 / Phase-3.7 visual design decision documented in commit `8631bde` and the follow-up `09112e3` ("softer-edge tokens"). The two-mode separation is the design DNA, not a uniform "no shadows" rule.

When a new shadow leak appears in atelier-mode code, fix it by removing the shadow from the atelier surface — never by relaxing the operating-mode tokens.
