# v1.0.29.2 — chat-UX overlap / auto-scroll / sidebar-desync diagnosis

**Date:** 2026-05-25
**Baseline:** v1.0.29.1 (HEAD `251252e`)
**Evidence:** Rutik's T-02 Hamburg smoke walk, Round 10 "Adjacent rules"
screenshot (mid-stream of a new persona section).

> All four bugs are WIRING / BEHAVIOR defects in existing machinery, not missing
> features. The auto-scroll hook, the JumpToLatest pill, the sticky input zone,
> and the spine all exist — they're keyed to the wrong signal or sized with a
> fixed constant. Same shape as the v1.0.29 findings.

> **Verification reality.** These are DOM / scroll / layout / visual bugs and the
> repo has no browser/jsdom/RTL runner (smoke-script pattern only). The fixes
> extract their *decision logic* into pure functions that `smoke:chat-ux` asserts;
> the *visual result* (scroll position, no-overlap, loading feel) is confirmed by
> Rutik's desktop + mobile smoke walk. Logic = provable; pixels = human-verified.

---

## Surface tree (chat page)

```
ChatWorkspacePage (pages/ChatWorkspacePage.tsx)
└─ ChamberLayout (Chamber/ChamberLayout.tsx)
   ├─ spine            → Spine / SpineHeader / SpineStageList / SpineFooter   (Bug 87)
   ├─ stickyHeader     → ConversationStrip (header "OTHER RULES · LIVE")      (Bug 87 ref)
   ├─ <main data-chamber-main>  ← THE scroll container (useChamberMainRef)
   │   ├─ thread column  pb-[180/200px]                                       (Bug 85)
   │   │   └─ Thread → MessageAssistant/User/System + StreamingAssistantBubble + ThinkingIndicator (Bug 84/86)
   │   └─ inputZone  sticky bottom-0 -mt-[200px]                              (Bug 85)
   │       └─ JumpToLatest + InputBar(→ SmartChips)                           (Bug 84/86)
   └─ (BriefingCTA rendered in `thread` slot, hero/ready adds height)         (Bug 85 cause)
```

Streaming lifecycle (chatStore): `setThinking(true)` → `openStreamingMessage`
(`streamingMessage` set) → `appendStreamingDelta` (chunks) → `closeStreamingMessage`
(`streamingMessage=null`) and the persisted assistant row lands.

---

## Bug 84 — no auto-scroll during the persona stream

- **Root:** `useAutoScroll.ts:83-105` fires only when `latestAssistantId` changes
  — i.e. when a turn **persists**, not while it streams. `Thread.tsx:96-100`
  renders `<StreamingAssistantBubble/>`, which (`StreamingAssistantBubble.tsx`)
  has **no `spec-tag-<id>`** — the hook literally cannot target it. So a new
  section streams in at the bottom, unscrolled, cramped against the chips.
- **Fix (C3):** give the streaming bubble a stable anchor; on stream-start
  (`streamingMessage` null→set) scroll its **top to `topOffset` (90)** — the same
  top-anchor philosophy the hook already uses for persisted turns
  (`useAutoScroll.ts:4-8`). Respect the existing `PAUSE_THRESHOLD_PX=200` pause-gate
  + JumpToLatest. One scroll on section-start (no continuous bottom-follow → no
  yank, consistent with persisted-turn behavior, no jump on persist).
- **Risk:** if anchoring fights long-message reading, revert to no-stream-scroll
  (the v1.0.29.1 design-revert discipline).

## Bug 85 — chips/input zone overlaps streaming content

- **Root:** `ChamberLayout.tsx:124` thread `pb-[180px] md:pb-[200px]` (fixed);
  `:131-132` input zone `sticky bottom-0 -mt-[200px]` (fixed reserve). Input-zone
  height **varies**: SmartChips (1 row vs stacked on mobile) + multi-line InputBar
  + the **hero/ready BriefingCTA** (v1.0.29 Bug 70 — taller). When height > 200px,
  content hides behind the zone. (Indirectly caused by Bug 70's CTA prominence.)
- **Fix (C2):** ResizeObserver on the input zone → write `--chamber-input-h` →
  thread `pb = var(--chamber-input-h) + 24px`, input-zone `-mt = var(--chamber-input-h)`
  in lockstep. Future-proofs the whole class.
- **Layout math (proven in C2 commit body):** old 200px constant vs measured
  worst case (hero CTA ~96px + stacked chips 2×52px + multi-line input ~120px +
  paddings) ≈ 330px → 130px of content was hidden. Dynamic reserve closes it.
- **Risk:** ResizeObserver loop / layout thrash — debounce via rAF; guard against
  feedback (observe the zone, write to the thread, never observe what we write).

## Bug 86 — weak loading state + stale chips during stream

- **Root:** chips live in `InputBar.tsx:62` (`SmartChips`), driven by
  `lastAssistant` = last **persisted** assistant (`ChatWorkspacePage.tsx:93-99`).
  During a new section's stream `lastAssistant` is the **previous** turn → chips
  are **stale**; `forceDisabled=isThinking||queueFull` (`:343`) only dims them
  (still visible). Loading cue is a faint label + caret only (`Thread.tsx:96-105`).
- **Fix (C4):** **HIDE** SmartChips entirely while `isStreaming || isThinking`
  (per Rutik — stale chips are an affordance trap); re-show with fresh chips after
  persist. Add a clearer section-level "composing" indicator. Render-key the chips
  off the **section/turn id** (not chunk) to avoid per-chunk flicker.
- **Risk:** chips flicker on each chunk — key off turn id, not chunk count.

## Bug 87 — sidebar "speaking now" desynced from header (TWO sources)

- **Root:** header (`ConversationStrip.tsx:36,54`) uses **`progress.recentSpecialist`**
  (message-based, current → correct "OTHER RULES · LIVE"). Sidebar "speaking now"
  (`SpineStage.tsx:98-103`) uses **`useSpineStages`** 'live' = *first not-done*
  stage (state-based → lags, showed "Procedure synthesis"). Two sources → they
  disagree mid-stream.
- **Fix (C5):** derive the spine's "live/speaking-now" stage from the SAME
  `recentSpecialist` the header uses, via a centralized specialist→stage map
  (`SPINE_STAGES[].ownerSpecialist`). done/future status stays state-based
  (monotonic); only the live marker follows the current speaker.
- **Risk:** a stage already "done" being re-marked live (persona revisits) — allow
  "live" to override "done" for the recentSpecialist's stage; no visual conflict.

---

## Commit plan
C1 this doc · C2 Bug 85 dynamic reserve · C3 Bug 84 stream auto-scroll · C4 Bug 86
hide chips + composing indicator · C5 Bug 87 single-source spine-live · C6 extract
pure decision logic + `smoke:chat-ux` gate · C7 docs + tag v1.0.29.2.

## Pure functions to extract + smoke-assert (C6)
- `shouldAutoScrollOnStreamStart(distanceFromAnchorPx, paused)` → bool.
- `inputZoneReserve(measuredHeightPx)` → `{ padBottom, marginTop }` (+24 breathing).
- `chipsVisible(lastAssistantId, streamingTurnId, isThinking, isStreaming)` → bool.
- `liveStageForSpecialist(recentSpecialist)` → SpineStageId (specialist→stage map).

## Non-negotiable
Bayern SHA MATCH · matrix 16/16 · T-05 + T-02 fixtures green · v1.0.29.1 procedure
fix untouched · no PDF regression · no BriefingCTA hero/ready regression · mobile +
desktop in the layout math · net-zero lint.
