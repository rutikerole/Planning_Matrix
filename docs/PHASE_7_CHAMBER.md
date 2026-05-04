# Phase 7 — The Chamber

> Architecture note for the chat workspace at `/projects/:id`.

## Principle

The chat page is for the **conversation**. The data lives at
`/projects/:id/result` (briefing) and `/projects/:id/overview`
(cockpit). The Chamber removes the rails, footer band, journey
ribbon, gates list, cost ticker, and replaces them with:

- a single sticky **astrolabe** (132 px hero at scroll 0, 44 px
  compact in the sticky header thereafter),
- a **specialist team** strip (always visible, narrative order),
- a single-column **thread** with distance-fade + magnetic focus,
- inline **smart chips** + **IDK affordance**,
- an edge **ledger pull**,
- one beautiful **briefing CTA** at the end of the thread,
- a calm **input bar** with long-press menu.

That's the chat page now.

## Layers

```
ChamberLayout
├── AmbientTint                    ← cross-fades per active specialist
├── CursorParallax                 ← desktop only; reduced-motion safe
├── BlueprintSubstrate + grain     ← unchanged from Phase 3
├── banners (Offline / RateLimit / Error)
├── AstrolabeStickyHeader (z-30)   ← always visible on mobile;
│                                     fades in past 132 px scroll on
│                                     desktop / tablet
│   ├── wordmark · project name
│   ├── compact Astrolabe (44 px)
│   ├── meta line (percent · specialist)
│   ├── SpecialistTeam strip (sm)
│   ├── inline Briefing CTA (hero/ready prominence only)
│   └── overflow menu (StandUp · shortcuts · Leave · Sign out)
├── topRegion (desktop + tablet, scroll-y = 0)
│   ├── project nameplate
│   ├── full Astrolabe (132 px) with drag-to-scrub
│   └── SpecialistTeam strip (md)
├── Thread
│   └── per-message [data-chamber-message] with --chamber-distance
├── BriefingCTA (progress-scaled prominence)
├── input zone
│   ├── JumpToLatest pill
│   ├── InputBar (SmartChips + textarea + paperclip + send)
│   └── "Stand up & look around" link
├── LedgerTab + LedgerPeek (right edge / right drawer on mobile)
└── overlays
    ├── CapturedToast
    ├── StandUp (full-screen modal)
    └── MobileAstrolabeSheet (vaul bottom-sheet)
```

## Locked items (never modified by Phase 7)

- The Edge Function (`supabase/functions/chat-turn/`) — auth, persona,
  persistence, streaming, idempotency, rate limit.
- Tool schema + Zod (`src/types/respondTool.ts`).
- Specialist names, Areas A/B/C, Source × Quality qualifier scheme.
- Database migrations.
- Data hooks: `useProject`, `useMessages`, `useProjectEvents`,
  `useChatTurn`, `useUploadFile`, `useDeleteFile`,
  `useProjectAttachments`, `useOfflineQueueDrain`.
- `chatStore` slices and actions.
- Idempotency via `clientRequestId`.

## New hooks

- `useChamberProgress(messages, state, completionSignal)` — the single
  source for `percent` / `currentTurn` / `totalEstimate` /
  `spokenSpecialists` / `recentSpecialist` / `isReadyForReview`.
- `useLedgerSummary(state)` — memoised wrapper over
  `extractLedgerSummary` in `projectStateHelpers.ts`.
- `useCompletionGate(input)` — maps progress + completion signal to
  the BriefingCTA prominence enum.
- `useMagneticFocus()` — single IntersectionObserver for the whole
  thread; pins `data-focus="true"` on the message nearest the
  viewport-center band.
- `useKeyboardShortcuts({ onSlash, onQuestionMark, onGotoLatest })` —
  / · ? · Esc · j · k · gg · G.

## Cost reporting

The visible cost ticker is gone. `useChatTurn.onSuccess` emits one
`console.log('[pm-cost]', costInfo)` for admin emails
(`isAdminEmail`); non-admin users see nothing.

## Streaming → persisted typewriter handoff

`Typewriter` reads `chatStore.streamingMessage.contentSoFar` exactly
once on first mount, computes the longest common prefix with the
persisted text, and treats that prefix as already emitted. The reveal
continues from the seed forward — no re-type flash. Audit K.14 closed.

## IDK suppression on synthesizer turns

`InputBar` and `SmartChips` suppress the IDK pill when the most-recent
assistant turn's specialist is `synthesizer`. Synthesizer turns are
summary-confirmation gates and the IDK branches don't apply. Schema
unchanged — the model still emits `allow_idk: true`, the SPA just
doesn't render the affordance on that turn.

## Phase 7.5 — The Spine sidebar

A 240 px fixed left aside (z-25) sits to the left of everything else
on viewports ≥ 1024 px. Three sticky regions stacked top-to-bottom:

- **`SpineHeader`** — wordmark · project name · plot · round
  (`Round 11 · ~ 22`) · 2 px clay progress bar.
- **`SpineStageList`** — 8 stage rows over a single SVG-equivalent
  clay-rail with top/bottom gradient mask. Per-stage status:
  `done / live / next / future`. Live row carries a 12 px filled
  clay dot with `spine-glow` halo, a 2 px clay left bar, a clay-tint
  60 % gradient bg, and an italic-serif snippet truncated to 60
  chars. Done rows are clickable → `defaultScrollToMessage` to the
  stage's first message; on hover they reveal a small snippet
  tooltip via `[data-spine-status='done']:hover [data-spine-tooltip]`.
- **`SpineFooter`** — sticky `BriefingCTA variant="sidebar"` that
  ignores the gate's progress prominence and stays loud from turn 1.
  When `completionSignal === 'ready_for_review'` OR `percent >= 95`,
  it gains a clay border + halo + one-shot 800 ms scale pulse.

The 8 stages live in `lib/spineStageDefinitions.ts`:

  1. project_intent      (moderator)
  2. plot_address        (moderator)
  3. planungsrecht       (planungsrecht — "done" via areas.A=ACTIVE)
  4. bauordnungsrecht    (bauordnungsrecht — areas.B=ACTIVE)
  5. sonstige_vorgaben   (sonstige_vorgaben — areas.C=ACTIVE)
  6. verfahren           (verfahren — procedures w/ quality≠ASSUMED)
  7. beteiligte          (beteiligte — roles.length > 0)
  8. final_synthesis     (synthesizer — recommendations.length ≥ 3)

Each stage's `isDone` reads from real persona-emitted state shapes —
**`state.areas.{A,B,C}.state` and UPPERCASE fact-key prefixes**
(`PROJECT.*`, `PLOT.*`, `BUILDING.*`, `STELLPLATZ.*`, `HERITAGE.*`,
`TREES.*`, `NATURSCHUTZ.*`) — not the brief's lowercase illustrative
names. Stage progression is monotonic on `isDone`; if the persona
briefly hands off mid-stage (e.g. Bauordnungsrecht commenting during
the Planungsrecht stage), the live row stays Planungsrecht until its
`isDone` returns true.

`useSpineStages(project, messages)` walks `SPINE_STAGES`, finds the
first not-done = `live`, before = `done`, immediately after = `next`,
rest = `future`. Memoized on `[state, messages.length]` with a
per-stage try/catch so a single bad heuristic never breaks the rail.

`useChamberProgress` was augmented to also expose `currentStageId`
via the same shared `currentStageId(state, messages)` helper, so the
Astrolabe's percent and the Spine's live stage cannot disagree.

### Layout shifts

- `ChamberLayout` adds `spine` + `spineMobileTrigger` slots; main
  conversation surface shifts right via `lg:pl-spine` (240 px). The
  fixed input bar shifts to `lg:left-spine`. The LedgerTab stays at
  the right edge unchanged.
- `AstrolabeStickyHeader` shifts `lg:left-spine` so it never overlays
  the Spine. Wordmark + project name are **dropped on desktop**
  (Spine carries them); kept on mobile where the Spine is collapsed
  into a drawer.
- The top region's redundant project nameplate was removed; that row
  now reads as just the SpecialistTeam md + full Astrolabe.

### Inline BriefingCTA collapse

With the Spine pinning a full-volume CTA from turn 1, the inline
thread-end variant collapses its early stages:

  | progress       | inline prominence |
  |----------------|-------------------|
  | < 60 %         | hidden            |
  | 60–94 %        | outlined          |
  | ≥ 95 % / ready | hero (+ pulse)    |

The inline CTA only earns its place once the user has done
substantial work; below 60 % the sidebar is enough.

### Mobile (< 1024 px)

`useSpineMobile()` (matchMedia subscription) returns true for
tablet (640–1023) AND mobile (< 640). Both share one drawer pattern,
no third layout. `SpineMobileTrigger` mounts a 36 px sticky strip at
`top:56` (right under the AstrolabeStickyHeader) with a tiny progress
bar + `{done} of 8 · {current}` label + chevron. Tap opens a vaul
left drawer with the full Spine. Tapping a `done` stage or the
briefing CTA inside auto-closes the drawer.

### Click-to-scroll handoff

`Thread.tsx` registers `defaultScrollToMessage` on mount via
`ThreadContextProvider`; the Spine's stage click calls
`defaultScrollToMessage(firstMessageIndex, { topOffset: 90 })`
directly. Same scroll target as `useAutoScroll` — the magnetic-focus
IO is untouched.

### Animations

| # | Animation                          | Reduced-motion |
|---|------------------------------------|----------------|
| 1 | Live-stage halo pulse (`spineGlow` 2.4 s) | gated     |
| 2 | Stage status transition (320 ms opacity) | gated     |
| 3 | Done-stage hover snippet reveal (240 ms) | gated     |
| 4 | Header progress bar fill (600 ms width) | gated      |
| 5 | Mobile drawer slide (vaul default) | gated          |
| 6 | Briefing CTA "ready" pulse (one-shot 800 ms scale) | gated |

### What got dropped from the brief

- `state.areas.A === 'VOID'` no-plot path is supposed to swap the
  plot_address sub-line to `subDoneNoPlot` (i18n key in place); the
  swap isn't wired in `SpineStage` yet. Flagged for follow-up.

## What got dropped

Per the brief's §3 + §15: the entire UnifiedFooter band, both rails
(LeftRail + RightRail with Top3 / AreasSection / EckdatenPanel /
ProceduresPanel / DocumentsPanel / RolesPanel / ProjectPortrait /
ScheduleSection / StatusPill / FactTicker / IntentAxonometric),
ChatProgressBar (compass), StickyContext, ChapterDivider,
CompletionInterstitial, JumpToLatestFab, AutoSavedIndicator,
ConversationCursor, PaperCard, TitleBlock, AtelierIllustration, all
mobile orchestrators (MobileChatWorkspace / MobileTopBar /
MobileTopHeader / MobileRailDrawer / MobileRightRailPeek), the
SuggestionChips and IdkChips. Approximately 30 files / ~5000 LOC.

`SpecialistSigils.tsx` survives as a one-line re-export shim so
`/result/ConversationAppendix` keeps compiling.
