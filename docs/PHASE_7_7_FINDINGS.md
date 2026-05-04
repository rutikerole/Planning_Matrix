# Phase 7.7 — Findings Report

> **Mode:** Audit before fix. This report lands as the first commit per the
> Phase 7.6 rule (audit-first, no code with the findings).
> **Methodology:** Read the 5 screenshots Rutik shipped + walked the code
> at HEAD `25cce69` against Phase 7 + Phase 7.5 spec promises. CLI agent
> with no browser; live walkthrough deferred to Rutik on the Vercel
> preview where flagged.

---

## §3.1 Confirmed defects from §1 of the brief

### 1.1 — Progress reads 62 % at round 18 / 22

- **Root cause.** `src/features/chat/hooks/useChamberProgress.ts:81-92`. The
  current formula is `blended = turnsFraction × 0.6 + areasFraction × 0.2 +
  recsFraction × 0.2`. At the screenshotted state (round 18/22, 2 of 3
  areas ACTIVE, 0 recommendations) it computes `0.818 × 0.6 + 0.667 × 0.2 +
  0 × 0.2 = 0.624 ≈ 62 %`. So the displayed number is *mathematically
  correct from current inputs*. The complaint is real — the formula
  *penalises* a project where the persona hasn't yet emitted ≥ 3
  recommendations, even when 18/22 turns have landed.
- **Fix.** `percent = round(max(turnsFraction, blended) × 100)`. Floor at
  the turn fraction. The areas/recs signal still *boosts* progress
  upward when the persona has committed (areas → ACTIVE, recs ≥ 3); it
  just can't drag the number below your turn count.
- **Debug-panel addition.** Print `{ turnsFraction, areasFraction,
  recsFraction, blended, displayed }` so the inputs vs the output are
  inspectable in 30 s.
- **Risk.** Low.

### 1.2 — Gap above the Spine (screenshots 1, 4, 5)

- **Symptom.** ~100 px of empty paper between the AppHeader bottom and
  the SpineHeader top.
- **Root cause hypothesis.** `<ProtectedRoute>` renders `<AppHeader>` as a
  sibling of children. AppHeader is `position: sticky; top: 0; height:
  48 px`. ChamberLayout's outer wrapper is `height: calc(100dvh - 48 px)`.
  Inside it, Spine is `fixed left-0 top-12 bottom-0` (top: 48 px). On
  paper that's flush with the AppHeader bottom. But the screenshots show
  a real gap — most likely the conversation column's
  `topRegion` slot (`pt-12 lg:pt-14` wrapper) is taking *vertical space
  in the parent flex context* even though the Spine is a separate
  fixed element. Or the chamber `outer height + appHeader height`
  arithmetic doesn't account for the AppHeader actually consuming
  layout space (sticky top-0 inside a sibling container = consumes
  layout space + sticks).
- **Fix plan.** Trace and resolve. Two probable candidate solutions:
  (a) move AppHeader out of `<ProtectedRoute>`'s document flow and pin
  it `position: fixed` so it never consumes layout space, then drop
  the `appHeaderHeight` arithmetic from ChamberLayout; or (b) keep
  AppHeader sticky but ensure the Spine's `top` value reads from the
  same `--app-header-h` CSS variable that AppHeader itself writes.
  Going with (a) — fewer moving parts.
- **Risk.** Medium — touches the route shell.

### 1.3 — Spine reads as generic SaaS

- **Root cause.** Three converging issues:
  1. No ruled-paper substrate (Phase 7.5 promised; never shipped).
  2. Stage row indicators show plain dots in screenshots 16/19, not
     specialist sigils. Investigation: stage 1 IS a clay-tint disc on
     screenshot 19 (commit `d132073` shipped); but stages 3-8 show the
     small `future` dots — *correct per spec*. There are zero `done`
     stages in the screenshot because project_intent is sitting at
     `live` (commit 4 widening will make stages transition; verify
     sigil paint then).
  3. Stage row typography is plain Inter. No italic-serif marginalia.
     No Roman numerals on done rows. No live-bar glow.
- **Fix plan.** Single character commit (`commit 5`):
  - Add ruled-paper bg-image to Spine `<aside>` (24 px cycle, 0.04 alpha
    horizontal rule).
  - Live stage left bar gets `box-shadow: 4 0 8 -2 rgba(123,92,63,0.18)`.
  - Vertical clay rail confirmed; verify the `spine-rail-mask` CSS
    class is actually applied (already shipped in commit `2025a47`).
  - Stage sub-line for live → italic-serif Georgia "Moderator ·
    spricht" / "Moderator · speaking" instead of plain Inter
    "moderator · live".
  - Roman numerals on done stages: 11 px italic Georgia clay at right
    edge (i / ii / iii / …). Brand-new addition.
- **Risk.** Low.

### 1.4 — SpineHeader card outline (screenshot 4)

- **Symptom.** Visible thin outline + rounded corner around the
  project-name + plot + round bar block.
- **Cause.** `SpineHeader.tsx` has `border-b border-[var(--hairline)]`.
  That's only the bottom border — should be invisible elsewhere. But
  the visible outline in the screenshot suggests either:
  (a) some inherited `border` on a wrapping element from a Tailwind
      `@apply border-border` rule in `globals.css:117` (the wildcard
      `* { @apply border-border; }`), OR
  (b) the SpineHeader itself was unintentionally given a `border`
      class somewhere I missed.
- **Fix.** Audit and remove. Drop any `border: 1px solid` and ensure
  the SpineHeader inherits only its `border-b` from the explicit class.
  May need `border-0` reset.
- **Risk.** Low.

### 1.5 — InputBar reads as a chat embed

- **Root cause.** `Chamber/InputBar.tsx:160-175` (the textarea card
  div). Has `bg-paper-card border border-[var(--hairline-strong)]
  rounded-3xl px-4 py-3` plus a `focus-within` clay shadow ring. The
  rounded card + border + visible elevation make the InputBar feel
  like a Slack/Notion compose widget dropped into the page.
- **Fix.** Edge-to-edge of the conversation column. Single 0.5 px
  hairline top-border. Background `rgba(251,247,238,0.92)` with
  `backdrop-filter: blur(6px)`. Keep the textarea's own `rounded-2xl`
  if it helps focus affordance; remove the wrapper card's rounding +
  border. Drop the focus-within clay shadow ring.
- **Risk.** Low — pure CSS.

### 1.6 — LedgerPeek reads as a Notion popover (screenshot 3)

- **Root cause.** `Chamber/LedgerPeek.tsx:24-32` — `bg-paper-card` (✓
  paper) but `rounded-l-2xl shadow-[0_10px_36px_-8px_rgba(26,22,18,0.18)]`
  (✗ drop shadow + outer border-radius). Reads as a popover that
  could be moved.
- **Fix.** Drop the `rounded-l-2xl` and the drop shadow. Keep only:
  - 0.5 px hairline border on `left, top, bottom` (no right; right is
    flush with the viewport edge).
  - `box-shadow: -1px 0 0 0 rgba(123,92,63,0.18)` (single pixel clay
    line on the left edge — pinned-to-the-board feel).
  - `border-radius: 12px 0 0 12px` (only the visible left corners; the
    right edge stays square because the viewport edge clips it).
  - Project name → italic Georgia 14 px (currently plain Inter).
  - Area pills → small-caps with `letter-spacing: 0.16em` (currently
    plain mono caps).
- **Risk.** Low.

### 1.7 — Astrolabe + SpecialistTeam unanchored top region (screenshot 5)

- **Root cause.** `ChatWorkspacePage.tsx` mounts the SpecialistTeam +
  full Astrolabe inside `topRegion` with no bottom-border separator
  from the conversation thread. The two elements float above the
  thread without architectural anchoring. Sigils have no tooltips
  ("what does the asterisk mean?" — unanswered).
- **Fix.** Wrap the topRegion in a 132 px-tall `<header>` with
  `position: sticky; top: 0` (sticky to the top of `<main>`'s scroll
  context — confirmed correct from your direction). Bottom hairline
  border spanning the conversation column width only. SpecialistTeam
  on the left, full Astrolabe on the right, both vertically centred.
  Each sigil button gets a `title=` and `aria-label` derived from the
  i18n key.
- **Risk.** Low.

### 1.8 — JumpToLatest looks like a loading spinner (screenshot 2)

- **Root cause.** `Chamber/JumpToLatest.tsx:124-150` — `inline-flex
  size-10 px-2.5 bg-paper border border-ink/85 rounded-full`. Round
  button with arrow inside reads as a loading state.
- **Fix.** Pill shape: `w-auto h-7 px-3.5 rounded-full`, paper-card bg,
  0.5 px hairline clay border, ink text 11.5 px tracking-0.04em.
  Content: `↓ + i18n('chat.chamber.jumpToLatest')` — "Latest" in EN /
  "Live-Stand" in DE. Position: `absolute; bottom: calc(100% + 12px);
  left: 50%; transform: translateX(-50%)` relative to the InputBar
  wrapper. Animate in: opacity 0→1 + translateY 8→0 over 240 ms,
  reduced-motion-instant.
- **Risk.** Low.

### 1.9 — Black "Open briefing" pill (screenshot 4)

- **Root cause.** `Chamber/BriefingCTA.tsx:50-68` — sidebar variant
  hardcoded `bg-ink text-paper`. **This is a Phase 7.5 spec
  regression** — the original brief said "paper-card bg, 0.5 px clay
  border, ink text, italic-serif Georgia 13 px"; I shipped the
  opposite. Confessing in §3.3 below.
- **Fix.** Sidebar variant: `bg-paper-card border border-clay/55
  text-ink italic font-serif`, hover `bg-[hsl(var(--clay)/0.10)]`. The
  ready state keeps the existing pulse + halo but the base button
  stays paper/clay/ink, never filled black.
- **Risk.** Low.

### 1.10 — Stacked, not designed

- **Root cause.** Per-component design choices that compound:
  - Three different "white-ish" tones in use (paper, paper-card,
    rgba(255,255,255)).
  - Mixed border weights (0.5 px hairline, 1 px hairline-strong,
    2 px clay live bar — all intentional, but the page also has
    accidental Tailwind-default 1 px borders from the global `*
    { @apply border-border }` rule).
  - Drop shadows on LedgerPeek + InputBar (per #1.5, #1.6).
- **Fix plan (commit 12 — visual unification sweep).**
  1. Audit every inline `bg-` class. Confirm no `bg-white` or
     `#FFFFFF` literal in the chamber tree.
  2. Audit hairline weights. Force every divider to the shared
     `var(--hairline)` token at 0.5 px.
  3. Drop the global `* { @apply border-border }` rule's effect on
     chamber elements (use a local `border-0` reset on chamber root,
     then opt back in per element).
  4. No drop shadows. Replace any `shadow-*` with hairline borders
     except the live-stage halo.
- **Risk.** Medium — the global border reset may have wider impact;
  scope to chamber root.

---

## §3.2 Hunt findings from §2 (hidden issues to verify)

| # | Item | Status (code-side audit) |
|---|---|---|
| 1 | Specialist sigils on done stages | shipped commit `d132073`; **but no done stages in screenshots** because project_intent is stuck at live. After commit 4's widening, verify on Vercel. |
| 2 | AmbientTint per-specialist hue shift | wired in `AmbientTint.tsx`; tints in `specialistTints.ts` are at 96 % lightness HSL — *very* subtle. Suspect: **shipped but invisible**. Bump saturation in commit 12. |
| 3 | Match-cut transition | wired in `MatchCut.tsx` + `MessageAssistant.tsx:88-119`. Live verification deferred. |
| 4 | Magnetic focus | wired in `useMagneticFocus.ts` + globals.css `[data-chamber-message]`. Live verification deferred. |
| 5 | CapturedToast | wired in `ChatWorkspacePage.tsx`. Live verification deferred. |
| 6 | Conversation column right-edge rule | none in code. Confirmed clean. |
| 7 | Mobile drawer for Spine | wired in `SpineMobileTrigger.tsx`. Vaul integration. Live verification deferred. |
| 8 | AppHeader avatar dropdown | shipped commit `6d52740`. Click-outside + Esc + sign-out wired. |
| 9 | Language switch persistence | uses `i18next-browser-languagedetector` with default `localStorage` cache. Persisted. |
| 10 | Empty state on first turn | `EmptyState.tsx` mounted when `messages.length === 0`. Confirmed. |

---

## §3.3 Spec-vs-reality audit — what was promised vs what's live

> Per Rutik's request: a clean list of every visual element promised
> in Phase 7 / 7.5 / 7.6 specs, with current build status.
> Status legend:
>
> - **kept** — spec promise lives in the live build (or only invisible
>   because state hasn't reached the trigger).
> - **regressed** — implemented per spec at one point, broken later.
> - **broken-from-day-one** — implementation exists but doesn't match
>   the spec it promised.
> - **never-shipped** — spec called for it, no code in repo.

| Spec | Promise | Status | Evidence / file |
|---|---|---|---|
| Phase 7.5 §5.3 | Ruled-paper bg substrate on Spine | **never-shipped** | No `linear-gradient` rule on `[data-spine-root]` or `.spine-aside` in `globals.css`. |
| Phase 7.5 §8 BriefingCTA | "paper-card bg, 0.5 px clay border, ink text, italic-serif Georgia 13 px" | **broken-from-day-one** | Phase 7.5 commit `3f87dd4` shipped `bg-ink text-paper` instead. Confessing. |
| Phase 7.5 §8.2 BriefingCTA | "ready" state has clay border + halo | **kept** | `BriefingCTA.tsx:55-65`. |
| Phase 7.5 §6 LedgerPeek | "shadow-[0_10px_36px_-8px_rgba(26,22,18,0.18)]" | **broken-from-day-one** (per the new brief) | Original 7.5 spec called for the shadow; Phase 7.7 brief reverses to "no drop shadow, single-pixel clay glow on left." Was correct per 7.5; is wrong per 7.7. |
| Phase 7 §10 AmbientTint | Page bg shifts hue per active specialist | **kept-but-invisible** | Tints at 96% lightness are too subtle on the screenshots. Saturation bump warranted. |
| Phase 7 §9 Match-cut transition | 720 ms cinematic specialist swap | **kept (code-verified, live unverified)** | `MatchCut.tsx`. |
| Phase 7 §11 Magnetic focus | Past messages dim, hover/scroll re-illuminates | **kept (code-verified)** | `useMagneticFocus.ts` + globals.css. |
| Phase 7 §17 CapturedToast | Micro-toast on new fact emit | **kept (code-verified)** | `CapturedToast.tsx`. |
| Phase 7 §21.3 Citation chips | `§ 34 BauGB` rendered with clay-tint inline bg | **kept** | `CitationChip.tsx:41` `bg-clay-tint text-clay-deep rounded-[3px]`. |
| Phase 7 §6.5 Astrolabe sigils on inner ring | Per-specialist glyphs around the dial | **kept** | Visible in screenshot 5 (the 7 sigils on the astrolabe ring). |
| Phase 7 §7.2 SpecialistTeam strip | 7 sigils, narrative order | **kept** | Visible in screenshot 5 (the 7 sigils above the conversation). |
| Phase 7.5 §7.3 SpecialistTeam tooltip on hover | Hover reveals specialist name + spoke-count | **broken-from-day-one** | `SpecialistTeam.tsx` sets `title=` attr; the brief asks for a styled tooltip not a native browser one. |
| Phase 7 §1.5 Past-turn fade by distance | CSS `--chamber-distance` cascading opacity | **kept** | `globals.css:485-505` + `Thread.tsx`. |
| Phase 7 §15.4 BriefingCTA inline collapse below 60 % | Hidden < 60 %, outlined 60-95, hero ≥ 95 | **kept** | `useCompletionGate.ts:46-58`. |
| Phase 7.5 §1.7 App header on protected routes | Wordmark + Lang + Profile/Sign out, 48 px | **kept** | `AppHeader.tsx` + `ProtectedRoute.tsx`. |
| Phase 7.6 §1.1 Sidebar position fixed | Spine pinned, conversation owns scroll | **kept** | `ChamberLayout.tsx` viewport-grid. |
| Phase 7.5 §1.5 Sidebar font sizes | Title 13 / sub 11 / snippet 11 italic | **kept (commit 9904365)** | But still feels small on retina at 1440px viewport — bumping is fine. |

**Net spec debt going into 7.7:**
- 1× **never-shipped** (ruled-paper substrate).
- 2× **broken-from-day-one** (BriefingCTA black pill, SpecialistTeam
  tooltip).
- 1× **kept-but-invisible** (AmbientTint).
- 1× **brief reversal** (LedgerPeek shadow — was correct per 7.5,
  flipped per 7.7).

Pattern observed: Phase 7.5 was big enough that several promises didn't
ship in the same sprint. Phase 7.6 was a fix-only sprint and didn't
catch them because the audit focused on layout/scroll, not character.
Going forward — every visual promise gets a screenshot in the
spec-implementation PR before merge. Cheap insurance against another
"spec said paper, code shipped black" gap.

---

## §3.4 Priority order — Phase 7.7 sprint plan

| Commit | Issue | Severity |
|---|---|---|
| 1 | `chore(audit): Phase 7.7 findings report` | meta |
| 2 | `fix(chat-progress): floor percent at turnsFraction; expose blended in debug` | high |
| 3 | `fix(chat-layout): kill the gap above the Spine` | high |
| 4 | `fix(chat-spine): widen project_intent + plot_address isDone with assistant-handoff fallback` | high |
| 5 | `feat(chat-spine): ruled-paper substrate + Roman numerals + live-bar glow` | high (visible) |
| 6 | `fix(chat-spine): SpineHeader paper-on-paper, no card outline` | medium |
| 7 | `fix(chat-input): InputBar edge-to-edge, no rounded card, no shadow` | high (visible) |
| 8 | `fix(chat-jump): JumpToLatest pill restyle (paper card, clay border, "↓ Latest")` | medium |
| 9 | `fix(chat-cta): BriefingCTA paper-not-black variant for sidebar + hero` | high (visible) |
| 10 | `fix(chat-ledger): LedgerPeek paper-pinned-card character pass` | medium |
| 11 | `feat(chat-top): sticky bordered top region for SpecialistTeam + Astrolabe` | medium |
| 12 | `chore(chat): visual unification sweep + AmbientTint saturation bump + sigil tooltip` | medium |
| 13 | `fix(chat-*)`: any spec-promise gaps surfaced after commit 12 walk-through | TBD |
| 14 | `chore(chat): final pass — lint + locales + bundle gate` | meta |

Status checks at commits 5 and 10.

---

## §3.5 Honest caveats

- **CLI agent — no browser.** Every "code-verified" claim above is a
  static read. Live behaviour (AmbientTint visibility, MatchCut firing,
  CapturedToast appearance, mobile drawer) belongs on the Vercel
  preview after push.
- **Progress floor changes the displayed number.** Existing projects
  will show a higher percent immediately after deploy. No data
  migration; the change is purely render-side. Expected: +10 to +20
  points on most active projects.
- **Stale specs.** Phase 7.5 spec called for a drop shadow on
  LedgerPeek; Phase 7.7 reverses to no shadow. I'm taking 7.7 as
  authoritative.
- **The `appHeaderHeight` arithmetic in ChamberLayout is brittle**
  (a 48 px constant lives in two places — `AppHeader.tsx` and
  `ChatWorkspacePage.tsx`). The right fix moves AppHeader to
  `position: fixed` and drops the arithmetic; doing that in commit 3.

— End of findings. Fix commits start with #2.
