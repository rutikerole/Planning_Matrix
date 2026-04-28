# Phase 3.1 — Polish sweep

> 1–2 day sweep after Phase 3 closed. Bugs from Rutik's screenshot
> review fixed; deferred polish (mobile drawers, completion_signal
> wire-through, view-transitions cinema, latency tuning) shipped;
> docs refreshed.

## Commits

| # | Title |
|---|---|
| 29 | `fix(chat): Top-3 numbering renders sequentially (1, 2, 3) regardless of model rank field` |
| 30 | `feat(edge): wire completion_signal end-to-end + recommendations cap (D14)` |
| 31 | `feat(chat): mobile drawers — left rail (gates) and right rail (dossier) via vaul` |
| 32 | `feat(chat): visual confirmation pass for transition handoff (Polish Move 5) and ambient activity (Polish Move 4)` |
| 33 | `perf(edge): MAX_TOKENS reduction + thinking_label_de persistence` |
| 34 | `chore(docs): update phase 3 archive with D14, manager demo notes, cleanup runbook` |

## What each shipped

- **#29 — numbering fix.** `Top3.tsx` now renders `(idx + 1)` not `rec.rank`. `normalizeRecommendations` in `projectStateHelpers` sorts incoming deltas by rank-then-createdAt and rewrites ranks 1..N before persisting. Tiny `node:test` regression in `src/lib/projectStateHelpers.test.ts` (runs once a transform-types loader or Vitest is added).

- **#30 — completion_signal envelope.** Edge Function `respondSuccess` takes a `completionSignal` parameter sourced from `toolInput.completion_signal` (defaults to `'continue'`). Type `ChatTurnResponse` exposes it; `useChatTurn.onSuccess` sets `chatStore.lastCompletionSignal` from the response. The `CompletionInterstitial` component (already in the thread from batch 4) now surfaces from real model signals instead of only manual chatStore sets. Recommendations cap at 12 lives in the same `normalizeRecommendations` helper from #29 (D14).

- **#31 — mobile drawers.** `MobileTopBar` (sticky, `lg:hidden`, 56px tall) with hamburger + truncated project name + rail icon. `MobileRailDrawer` wraps vaul `Drawer.Root` with `direction='left'|'right'` and 85% width. Right-drawer peek-on-new-recommendation is a separate `MobileRightRailPeek` 60px overlay that holds for 4s then retracts; reduced-motion users get the badge dot on the rail icon instead. ARIA labels in DE/EN under `chat.mobile.*`.

- **#32 — view-transitions cinema + ambient activity expansion.** `TransitionScreen.tsx`'s hairline and the chat workspace's first `MessageAssistant` match-cut rule both carry `viewTransitionName: 'pm-handoff-hairline'`. `useCreateProject.ts` wraps `navigate(...)` in `document.startViewTransition(...)` when available (Chromium ~95% coverage; Firefox + older Safari fall back to a plain navigate without regression). `Thread.tsx` tags only the very first assistant message with `isHandoffTarget` so subsequent match-cuts use the same hairline class without competing for the morph. `thinkingLabelToSection.ts` keyword set expanded based on observed batch-4 transcript phrasing (festsetzungen, gebietsart, vollgeschoss, brutto-grundfläche, freistellung, kataster, bauvorlage, etc.).

- **#33 — latency tuning + thinking_label_de.** `MAX_TOKENS` dropped 2048 → 1280 in `anthropic.ts`. Migration `0004_thinking_label.sql` adds `messages.thinking_label_de`. `persistence.ts insertAssistantMessage` writes the column. `useChatTurn.onMutate` reads previous assistant's persisted `thinking_label_de` directly; the `chatStore` field becomes a derived shadow.

- **#34 — docs.** D14 + D15 appended to `phase3-decisions.md`. `phase3-out-of-scope.md` gets a "Resolved in Phase 3.1" section. This file (`phase3-1-polish.md`) ships. `manager-demo-prep.md` placeholder for Rutik to populate. README phase status bumped.

## Order matters — Rutik's runbook for activating Phase 3.1

After this batch pushes:

```bash
# 1. Apply the new migration FIRST (0004_thinking_label.sql)
#    Supabase Dashboard → SQL Editor → paste → Run.
#
# 2. Redeploy chat-turn AFTER step 1 — the function's INSERT writes
#    the new thinking_label_de column.
npx supabase functions deploy chat-turn
```

The opposite order leaves chat-turn 500-erroring with "column ... does not exist". The function deployment also activates Polish Move 8's `TOP-3-DISZIPLIN` system prompt clause (carried over from Phase 3 batch 4) plus the completion_signal envelope from #30 plus the MAX_TOKENS reduction from #33.

## Live verification

After Rutik runs the runbook, the live API smoke test (5+ turns, mixed input types) verifies:

- ✅ `completionSignal` field present in chat-turn response envelope (defaults to `'continue'`)
- ✅ `projectState.recommendations` arrives with sequential ranks 1..N after every delta
- ✅ `recommendations.length` capped at 12 even after a long conversation
- ✅ Latency p99 below ~43s on cache-hit turns (down from 46s outlier)
- ✅ `messages` rows persist `thinking_label_de` after a turn (visible in Supabase Table Editor)
- ✅ Polish Move 8 active — turn 1 emits ≤ 1 recommendation (was 3 before redeploy)

Visual verification (transition cinema, ambient dot, mobile drawers, screen recordings of motion) gates on Rutik's eyes with a real browser — captured in the manager-demo-prep doc.

## Phase 4 backlog adds

- Streaming chat-turn responses for a tighter perceived latency (Sonnet 4.5 → 4.6 evaluation can ride alongside).
- Conversation analytics dashboard — token cost over time, specialist mix, drop-off points.
- Replay tool: reconstruct any conversation from `messages` + `project_events`.
- Soft-delete projects + an "archived" view on the dashboard.
- Real-time multi-tab sync via Supabase Realtime (last-write-wins is fine for v1; needed once we have shared projects in Phase 4).
- Pull dashboard project list out of "deferred" — the chat workspace is now polished enough that a user with multiple projects deserves a list.
