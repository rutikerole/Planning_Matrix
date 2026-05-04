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
