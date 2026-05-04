# Phase 7 Pre-Build Audit (`Living Drafting Table`)

> Date: 2026-05-04
> Branch: `main` · HEAD `5d735af`
> Scope: brief's §2 audit — read-only. NOT committed.
> Treat brief's "Phase 5" as **Phase 7** throughout (Phase 5 = München narrowing shipped; Phase 6 = god-mode FIX_REPORT shipped).
> Companion to `docs/audits/2026-05-04/AUDIT_REPORT.md` (read-only verdict-level audit) + `FIX_REPORT_PHASE6.md`. This document deepens to component-level inventory and surfaces every brief↔code mismatch before code is written.

---

## §0 — Decisions needed before code

Five blockers. Each can be answered in one sentence; without answers the audit cannot become a plan.

| # | Topic | Question |
|---|---|---|
| 0.1 | **Prototype HTML** | `chat-redesign.html` does not exist in the repo. The only prototype is `prototypes/makeover-v3.html`. Treat that as the visual contract — yes / no? If no, please attach `chat-redesign.html`; design timings (180 / 220 / 240 / 280 / 320 / 480 / 600 / 2400 / 2600 ms) and easings cannot be verified without it. |
| 0.2 | **Citation popover library** | `@radix-ui/react-popover` is **not** in `package.json` (only accordion, alert-dialog, collapsible, dialog, dropdown-menu, select, slot, tabs are). Floating UI also absent. Move 5's `<Popover>` import path `@/components/ui/popover` likewise does not exist. Recommended: install `@radix-ui/react-popover` (~7 KB gz) — within the ≤ 35 KB delta budget. Confirm? |
| 0.3 | **IDK answer schema** | Brief's Move 7 chips submit `{ kind: 'idk_research' \| 'idk_assume' \| 'idk_skip' }`. Actual `userAnswerSchema` (`src/types/chatTurn.ts:42–45`) accepts only `{ kind: 'idk', mode: 'research' \| 'assume' \| 'skip' }`. The Edge Function will reject the brief's shape. Stay on the existing `{ kind: 'idk', mode }` shape — yes? (Net: chips become a UI swap; no API contract change.) |
| 0.4 | **Compass Arc vs ChatProgressBar** | The brief's §1 wants to replace "the existing top tabs (Init/Plan/Code/Other/Proc/Team/Synth)" with a CompassArc. There are no top tabs. What's actually at the top is `<ChatProgressBar />` (Phase 3.6 #69) — a 7-segment sticky progress bar with those exact specialist anchors and percentage + turn count, mounted only on `lg+` desktop. So Move 1 is **rebrand + restyle the existing progress bar**, not a new mount: same data source (`progressEstimate.ts`), same 7-segment vocabulary, swap the visual to architectural compass + station ticks + "M 1:100" mark. Confirm direction? |
| 0.5 | **UnifiedFooter coexistence** | Brief Moves 11 + 13 assume the Briefing/Cockpit/Export/Leave links live at the bottom of the **left rail**. Phase 3.7 #75 already moved them to a **fixed bottom band** (`UnifiedFooter`) that spans the full grid: left column carries Briefing primary CTA + Checklist + Export + Leave; center column hosts the embedded `InputBar`; right column carries Checklist + scale-bar + CostTicker. Move 13's "slim left-rail bottom mirror links" therefore can't be implemented as written — there's nothing to slim. Two paths: (a) keep UnifiedFooter, integrate Move 13's actions into the StandUp modal as a **secondary** surface alongside the existing primary actions; (b) demolish UnifiedFooter and rebuild the rail-based bottom links per the brief. (a) is far less invasive. Which? |

Until 0.1–0.5 are answered I will not write production code.

---

## §1 — Component inventory (chat surface, post-Phase-6)

Tree under `src/features/chat/`. Brief assumed many of these are subdirectories (`LeftRail/`, `Thread/`, `RightRail/`, `Banners/`); only `Input/`, `Progress/`, and `UnifiedFooter/` are. Everything else is flat in `components/`.

### 1a. Pages
| File | LOC | Role |
|---|---|---|
| `pages/ChatWorkspacePage.tsx` | 401 | Top-level. Reads project / messages / events via TanStack Query, builds `augmentedMessages` (synthetic recovery row + sonstige fallback), wires viewport branch (Mobile* vs ChatWorkspaceLayout + UnifiedFooter), drives mobile drawer state, mounts `<IdkPopover>` modal, mounts top-direction Drawer for mobile progress overlay, calls `useOfflineQueueDrain`. |
| `pages/OverviewPage.tsx` | 760 | The "Cockpit" / "Checkliste öffnen" surface at `/projects/:id/overview`. Brief calls it `OverviewModalPage.tsx` — actual is `OverviewPage` and is a full route, not a modal. |

### 1b. Layout / shells
| File | Props | Notes |
|---|---|---|
| `components/ChatWorkspaceLayout.tsx` | `leftRail, rightRail, unifiedFooter, children` | 3-zone grid `lg:grid-cols-[280px_minmax(0,1fr)_360px]`, `max-w-[1440px]`, message col `max-w-3xl py-16 lg:py-20`, `data-mode="operating"` opts into rounded radii + soft shadows + Phase 3.7 typography uplift. Mounts `<BlueprintSubstrate />` + `.grain-overlay-fixed`. |
| `components/MobileChatWorkspace.tsx` | (project, messages, events, leftRail, rightRail, inputBar, leftOpen, rightOpen, onLeftOpenChange, onRightOpenChange, onProgressClick, rightBadge, children) | Mobile-only collapsing-header + sticky compact progress + fixed-bottom keyboard-aware input. |
| `components/MobileTopBar.tsx` / `MobileTopHeader.tsx` | various | Mobile chrome — drawer triggers + progress badge. |
| `components/MobileRailDrawer.tsx`, `MobileRightRailPeek.tsx` | (open, onOpenChange, direction, ariaLabel, children) | Vaul-backed left/right drawers; peek is a small slide-in hint when right rail has new data. |

### 1c. Center column / Thread
| File | Props | Role |
|---|---|---|
| `components/Thread.tsx` | `messages` | Chronological render. Snapshots initial-message-id Set so history rows render with `instant={true}` typewriter. Inserts hairline divider every 6 messages. Per-row computes `previousSpecialist` for match-cut. Marks the very first assistant message with `viewTransitionName: 'pm-handoff-hairline'`. Calls `useAutoScroll([messages.length, isThinking])` for side-effect only. Renders `<StreamingAssistantBubble />` when `chatStore.streamingMessage !== null`, `<ThinkingIndicator />` when `isAssistantThinking && !streaming`, and `<CompletionInterstitial projectId />` always (it self-hides on `signal === 'continue' \| null`). |
| `components/MessageAssistant.tsx` | `message, isHistory, previousSpecialist?, isHandoffTarget?` | Marginalia rule (1px clay vertical bracket left of body, 320 ms `scaleY` from bottom). On match-cut: 320 ms hairline draw + 240 ms nameplate scale-in (delay 320 ms). `<SpecialistTag />` above. `<Typewriter text={text}>` body. `<MessageContextSheet />` long-press on mobile. |
| `components/MessageUser.tsx` | `message` | Right-aligned bubble, `bg-[hsl(38_30%_94%)]`, `border-ink/8`, `rounded-xl`, max-width `min(70%, 520px)`. Renders `<MessageAttachment messageId>` (Phase 3.6 #68 file uploads) below body unless id starts with `pending-`. Time always visible bottom-right with relative tooltip. Long-press → context sheet on mobile. **No "impact line" today** — Move 8 is genuinely new. |
| `components/MessageSystem.tsx` | `message` | Hairline-bordered top+bottom, `SYSTEM` uppercase tag (no leading dot), Inter 13 clay/ink. Used for sonstige + recovery synthetic rows. |
| `components/SpecialistTag.tsx` | `specialist, className?, withRoleLabel? = true, isActive?` | Inter 11 `tracking-[0.20em]` uppercase clay + `<SpecialistSigil>` on top line; italic Instrument Serif German role label below ("Sommelier rule"). Maps `chat.specialists.<key>`. Does **not** carry `id="spec-tag-<msgid>"` today — Move 6's anchor lookup needs that id added. |
| `components/SpecialistSigils.tsx` | `specialist, isActive?, className?` | 14×14 architectural drawing glyph in drafting-blue per specialist (compass for moderator, etc.) — replaces the brief's "● clay dot" with something richer. Has its own `isActive` micro-animation. |
| `components/ThinkingIndicator.tsx` | (none — reads from `chatStore`) | Reads `isAssistantThinking, currentSpecialist, currentThinkingLabel`. After 6 s rotates through hardcoded `ROTATING_LABELS[specialist]` (3 entries each). Renders ink-blot pause (`pmPauseBlot` 360 ms), then `<SpecialistTag isActive />`, then italic clay rotating label, then 3 `pmTravelDot` (1.4 s loop, staggered 180 ms). Reduced-motion: static `chat.thinking.staticLabel`. **The brief's "drafting compass" is a redesign of this same component** — same hooks, swap the choreography. The `thinking_label_de` from the model is honoured as `seedLabel` (first line). |
| `components/StreamingAssistantBubble.tsx` | (none — reads `chatStore.streamingMessage`) | Renders the in-flight assistant text as it arrives via SSE `json_delta` frames. |
| `components/CompletionInterstitial.tsx` | `projectId` | Hides unless `lastCompletionSignal !== 'continue' \| null`. Octagonal stamp, drop-cap, drafting-blue chevron actions. Three flavours: `needs_designer` / `ready_for_review` / `blocked`. |
| `components/Typewriter.tsx` | `text, instant?` | 18 ms ± 10 character reveal, 100 ms sentence-end pause. Click-to-skip. Reduced-motion = instant. Always renders `text` in `sr-only` mirror. **On completion calls `highlightCitations(text)`** — Move 5's chip system **must replace this** rather than add new wiring. |
| `components/JumpToLatestFab.tsx` | (none — owns its own scroll detection) | Lives **inside `EmbeddedShell` of InputBar** (absolute `-top-12 right-0`). Appears when `distanceFromBottom > 100 px`. Click → `window.scrollTo bottom`. Brief's "↓ N new messages" idea — the count is not currently shown, just the arrow. |
| `components/Banners.tsx` | (none) | `<OfflineBanner>` only. Reads `online` event + `chatStore.offlineQueue.length`. Shows depth like `· 3 in Warteschlange`. |
| `components/ErrorBanner.tsx` | (none) | Reads `chatStore.lastError` (set by `useChatTurn.onError`). Looks up `chat.errors.<code>.title/.body`. Dismissable. |
| `components/RateLimitBanner.tsx` | (none) | Reads `chatStore.lastRateLimit`. 50/h cap from `0008_chat_turn_rate_limits.sql`. |
| `components/CompletionInterstitial`, `ConversationCursor`, `ScheduleSection`, `EmptyState`, `PaperCard` | various | Misc atelier surfaces. EmptyState mounts `<AtelierIllustration />` when no messages. |

### 1d. Left rail (single file `LeftRail.tsx`, 11 KB)
Order top → bottom:
1. `<Wordmark size="xs" />`
2. Project header (name + `plot_address` + `<AutoSavedIndicator />`)
3. **`<SpecIndex>`** — Roman numeral I–VII spec index with sub-letters V.a/V.b/V.c (Areas A/B/C derived from `project.state.areas[*].state`). 12 gates total (`I, II, III, IV, V, V.a, V.b, V.c, V.d, V.e, VI, VII`). i18n keys `chat.gates.{00,10,20,30,40,41,42,43,44,45,50,60}`. Marker dots: `ACTIVE` filled clay, `PENDING` clay-bordered hollow, `VOID` flat ink hairline. **This is the closest existing analogue to the brief's CompassArc Move 1, but vertical not horizontal.**
4. `<ProgressMeter />` — left-rail 16-cell SVG bar at `opacity-70` (demoted Phase 3.6 #69). Reads `chatStore.turnCount + currentSpecialist + lastCompletionSignal`. Same `progressEstimate.ts` source as ChatProgressBar.
5. `<VerlaufMap messages />` — conversation map (history graph) by specialist.
6. `<SpecialistsAtTheTable messages />` — last 6 distinct specialists by recency. **Already highlights the latest specialist in `text-ink` + drafting-blue underline** (Phase 3.4) — Move 12 is largely already done; the upgrade is "show all 7 always" + clay dot + pulse animation.
7. `<FountainPenFooter />` — SVG decoration (inkwell + pen + signature shimmer animation).

Brief's expectation that the bottom contains View Briefing / Open Checklist / Export is **wrong post-Phase 3.7**: those are in `<UnifiedFooter />`.

### 1e. Right rail (single file `RightRail.tsx`)
Order:
1. **`<IntentAxonometric intent />`** — six axonometric SVGs (Einfamilienhaus / Mehrfamilienhaus / Sanierung / Umnutzung / Abbruch / Sonstiges). Drafting-blue 1px stroke, scale bar `M 1:100` underneath. **Move 9's `ProjectPortrait` is a refinement of this**: drop the variant gallery, pick one (EFH) as the primary canvas, layer reactive annotations (Wandhöhe, Vollgeschosse, etc.) on top. Other intents currently render their own axonometric — Move 9 says revert non-EFH to a placeholder, which is a regression of existing functionality. **Flag.**
2. `<Top3 recommendations />` — drafting-blue left edge, 28 px italic serif drop-cap "1./2./3.", italic margin-footer ("Vorläufig …") OUTSIDE card border. Already uses Framer `<m.li layout="position">` + `<AnimatePresence>`. **Move 10a is largely no-op** — only thing missing is the "fresh edge bar that fades over 2.4 s" for newly-arrived items.
3. `<BereichePlanSection state />` — SVG plan-section, three horizontal bands A/B/C with hatched fill per state (ACTIVE = dense `rotate(45)` 4 px hatch, PENDING = sparse 8 px hatch, VOID = dashed outline + diagonal strikethrough). Inline `<style>` keyframes for celebration on band → ACTIVE (`pmBandPulse` 1.2 s + `pmCheckDraw` 600 ms + `pmRipple` 800 ms).
4. `<EckdatenPanel project facts />` — Roman numeral I–VI column + entries with label/value/qualifier. Already animates `motion.li` on add/remove (240 ms y-fade).
5. `<ProceduresPanel procedures />`, `<DocumentsPanel documents />`, `<RolesPanel roles />` — collapsibles.
6. `<FactTicker />` — idle-state decoration (ticker animation).

`<CostTicker />` and the "Vollständige Übersicht öffnen" link **moved out** of the right rail into UnifiedFooter at Phase 3.7 #75.

### 1f. Input bar (`Input/` is the only real subdirectory)
| File | Role |
|---|---|
| `Input/InputBar.tsx` (16 KB) | The persistent operating-mode input bar. Three-row stack: SuggestionChips → AttachmentChips → textarea card (paperclip + textarea + SendButton). Has `embedded` prop: when true, drops sticky/border chrome and lets `<UnifiedFooter />` own the band. `EmbeddedShell` is `relative w-full max-w-3xl mx-auto` and houses `<JumpToLatestFab />` absolutely positioned above. `MAX_LENGTH = 4000`. Cmd/Ctrl+Enter submits; Enter submits; Shift+Enter newline. IDK trigger lives at the bottom right corner of the bar (calls `onIdkClick`). |
| `Input/IdkPopover.tsx` (4.4 KB) | Modal mounted at `ChatWorkspacePage` level. Backdrop blur + dim, fixed bottom-24 centered, focus trap + Esc close, three rows with bold Inter title + clay one-line explanation each. Submits via `onChoose(mode)` then `onClose()`. **Currently submits `{ kind: 'idk', mode }` per `userAnswerSchema`.** |
| `Input/SuggestionChips.tsx` (16.5 KB) | Above-input chip surface for yesno / single_select / multi_select / address / replies / Continue. Built from `lastAssistant.input_options` and `likely_user_replies`. Continue chip lives here too (Phase 4.1.11). |
| `Input/AttachmentChip.tsx`, `AttachmentPicker.tsx`, `MobileAttachmentSheet.tsx`, `SendButton.tsx` | Phase 3.6 file-upload pipeline + send/abort affordance. |

### 1g. Progress (`Progress/`)
| File | Role |
|---|---|
| `Progress/ChatProgressBar.tsx` (8.5 KB) | **Sticky top-of-thread 7-segment progress bar.** `lg:` only (mobile uses `compact`). 7 segments via `SEGMENT_ORDER = [moderator, planungsrecht, bauordnungsrecht, sonstige_vorgaben, verfahren, beteiligte, synthesizer]`. Per-segment label (DE: Init/Plan./BauO/Sonst./Verf./Team/Synth., EN: Init/Plan./Code/Other/Proc./Team/Synth.). Right side: `<percent>%` + `Turn <N>`. Phase 2.5 fix derives `turnCount` from `messages.filter(role='assistant').length` for durability across remounts. **This is the brief's CompassArc target** — same data, different visual. |
| `Progress/ChatProgressBarMobile.tsx` (~1 KB) | Compact mobile variant. |

### 1h. UnifiedFooter (`UnifiedFooter/`, Phase 3.7 #75)
| File | Role |
|---|---|
| `UnifiedFooter/UnifiedFooter.tsx` (7.7 KB) | Fixed bottom band spanning the full grid. Desktop = three sub-columns mirroring the 280/flex/360 grid above; mobile = single bar with `<MoreHorizontal>` overflow trigger that opens a vaul drawer with the secondary actions. |
| `UnifiedFooter/FooterLeftColumn.tsx` (5.3 KB) | Drafting-blue Briefing primary CTA (→ `/projects/:id/result`) + secondary row "Checkliste öffnen · Export · ← Projekt verlassen". Mounts `<ExportMenu variant="ghost">`. |
| `UnifiedFooter/FooterRightColumn.tsx` (4 KB) | "Checkliste öffnen ↗" outline button (→ `/projects/:id/overview`) + scale-bar `M 1:100` SVG + `<CostTicker />`. |

### 1h. Hooks
| File | Role |
|---|---|
| `hooks/useProject.ts` | TanStack Query `['project', id]`. RLS-scoped, `staleTime: 60s`, no refetch on focus. |
| `hooks/useMessages.ts` | TanStack Query `['messages', id]` ascending by `created_at`. |
| `hooks/useProjectEvents.ts` | TanStack Query `['project-events', id, limit=30]` descending. |
| `hooks/useChatTurn.ts` (13 KB) | The conversation loop. Streaming-first via `postChatTurnStreaming`; falls back to `postChatTurn`. Optimistic user placeholder via `onMutate`, cache update via `onSuccess`. **Offline guard**: when `navigator.onLine === false`, parks turn into `chatStore.offlineQueue` and resolves with `{ kind: 'queued' }` sentinel. Binds attachments to persisted user message via `linkFilesToMessage`. Sets `lastRateLimit` / `lastError` on errors. |
| `hooks/useOfflineQueueDrain.ts` | **Phase 5/6 sacred surface.** Listens to `online` event + drains queue FIFO via `mutateAsync`. Idempotent on `clientRequestId`. Stops on first failure. |
| `hooks/useAutoScroll.ts` | Window scrolls to `document.documentElement.scrollHeight` smoothly on dep change unless `paused`. Pauses when distance > 100 px. **Move 6 must rewrite this**: spec-tag at viewport top instead of message at bottom. |
| `hooks/useInputState.ts` | Wraps text + attachments + active suggestion. Builds chat-turn payload from chip + textarea state. |
| `hooks/useUploadFile.ts`, `useDeleteFile.ts`, `useProjectAttachments.ts` | Phase 3.6 #68 file-upload pipeline. |

### 1i. State stores
| File | Role |
|---|---|
| `src/stores/chatStore.ts` (12.7 KB) | Ephemeral session state. Keys: `isAssistantThinking, currentSpecialist, previousSpecialist, currentThinkingLabel, currentActivitySection, failedRequestIds, lastCompletionSignal, streamingMessage, turnCount, lastSavedAt, pendingAttachments, currentAbortController, lastRateLimit, lastError, offlineQueue`. `OFFLINE_QUEUE_CAP = 5`. `reset()` runs on project unmount and revokes object URLs. |
| `src/stores/authStore.ts` | Auth session (Supabase). |

### 1j. Lib
| File | Role |
|---|---|
| `lib/highlightCitations.tsx` | Existing citation parser. Regex matches `(?:§§?\|Art\.) [\d\w.,\s]+? (BauGB\|BayBO\|BauNVO\|BayDSchG\|BayNatSchG\|BNatSchG\|GEG\|GaStellV\|BayBauVorlV)`. Wraps matches in `<span class="font-medium text-ink">` with non-breaking space normalisation. **Move 5 must replace this** — same regex registry can be reused, but the wrapper is now a `<CitationChip>` with popover. |
| `lib/exportPdf.ts` (22.7 KB / 827 LOC) | pdf-lib + fontkit + brand TTFs. Sections: title page → Top-3 → Bereiche hatched → Verfahren → Dokumente → Fachplaner → Eckdaten → Audit. Phase 6 D.2 deferred Bauherr-grade restructure. **DO NOT TOUCH** — only the trigger UI is in scope. |
| `lib/progressEstimate.ts` | Source of truth for both `<ProgressMeter />` and `<ChatProgressBar />`. `SPECIALIST_PROGRESS` anchors per specialist; `TYPICAL_TURN_COUNT = 18`. Exports `estimateProgress, estimateTurnsRemaining, computeSegmentProgress, SEGMENT_ORDER`. |
| `lib/thinkingLabelToSection.ts` | Maps DE thinking-label text → right-rail section (`top3 \| areas \| facts \| procedures \| documents \| roles`). Used to set `chatStore.currentActivitySection` so the matching section's eyebrow pulses while thinking. |
| `lib/userAnswerHelpers.ts`, `formatRelativeShort.ts`, `documentLinkage.ts` (Phase 6) | Misc helpers. |

### 1k. Cross-feature dependencies (NOT chat-feature, but read by chat code)
| Path | Role |
|---|---|
| `src/lib/projectStateHelpers.ts` (14.7 KB, **sacred**) | `applyToolInputToState` is the **single composite mutator**. RECOMMENDATIONS_CAP, dedup fingerprint, qualifier preservation. |
| `src/lib/chatApi.ts` (15.4 KB) | `postChatTurn`, `postChatTurnStreaming`, `ChatTurnError`. Streaming has hot-fix guards 1+2 to settle `onComplete`/`onError` exactly once. |
| `src/lib/factLabel.ts` | Maps fact keys → DE/EN labels. Phase 6 A.6 added 33 keys. |
| `src/lib/export/{exportFilename, exportJson, exportMarkdown}.ts` | Cross-feature exporters. Markdown filters via `MEANINGFUL_EVENT_TYPES`. JSON does **not** include `tool_input` yet (Phase 6 D.3 deferred — one-line add). |
| `src/features/dashboard/lib/recentActivity.ts` | `MEANINGFUL_EVENT_TYPES` Set + `summarizeEvent(eventType, locale)` function used by Markdown export and StandUp Move 11 timeline. |
| `src/components/shared/BlueprintSubstrate.tsx` | The `data-mode="operating"` workspace mounts this. Cursor-lensing two-grid blueprint (ink + drafting-blue) + ambient drift + table-breath. |
| `src/components/shared/ProjectGuard.tsx`, `ProtectedRoute.tsx`, `ProjectNotFound.tsx` | Route gates. **`ProjectNotFound` lives at `shared/`, not `chat/components/` as the brief states.** |

---

## §2 — State flow

```
Wizard (POST /chat-turn priming) ──┐
                                   │
                                   ▼
              Supabase            ┌─────────────────────────┐
              ┌─────────┐         │ projects.state JSONB    │
              │ projects│─────────│ messages (append-only)  │
              │ messages│ ◄───── │ project_events (apnd)   │
              │ events  │         └─────────────────────────┘
              └─────────┘                    ▲
                  │                          │
                  │ supabase-js (JWT-scoped) │
                  ▼                          │
        TanStack Query                       │
        ┌──────────────────┐                 │
        │ ['project', id]   │ ─────────────┐ │
        │ ['messages', id]  │              │ │
        │ ['project-events']│              │ │
        │ ['projectAttach.']│              │ │
        └──────────────────┘              │ │
                  │                       │ │
        useProject / useMessages          │ │
        / useProjectEvents                │ │
                  │                       │ │
                  ▼                       │ │
        Components (LeftRail,             │ │
        Thread, RightRail, etc.)          │ │
                                          │ │
        chatStore (Zustand)               │ │
        ─ isAssistantThinking             │ │
        ─ currentSpecialist               │ │
        ─ streamingMessage                │ │
        ─ offlineQueue [cap 5]            │ │
        ─ pendingAttachments              │ │
        ─ lastRateLimit / lastError       │ │
        ─ failedRequestIds                │ │
                  │                       │ │
                  ▼                       │ │
        useChatTurn.mutate ───────────────┘ │
        (POST /chat-turn streaming        │
        with Bearer auth + idempotency)   │
                  │                       │
                  └───────────────────────┘
                  (SSE json_delta → appendStreamingText)
                  (complete frame → cache update + state replace)
                  (error frame → setLastError / setRateLimit)
```

**Re-render triggers** (high-signal):
- New assistant turn → `useChatTurn.onSuccess` writes `['messages']` and `['project']` caches → all watchers re-render.
- `chatStore.promoteSpecialist` → SpecialistsAtTheTable, ChatProgressBar, ProgressMeter, ThinkingIndicator switch.
- `chatStore.setThinking(true,…)` → ThinkingIndicator mounts; InputBar `forceDisabled=true` switches placeholder.
- `chatStore.openStreamingMessage` → Thread swaps ThinkingIndicator → StreamingAssistantBubble.
- Project state mutation → BereichePlanSection, EckdatenPanel, Top3, IntentAxonometric, SpecIndex (LeftRail), DocumentsPanel/ProceduresPanel/RolesPanel all reactively update.

**RLS / ownership boundary**: the per-request supabase client carries the user's JWT; ProjectGuard upstream verifies existence + ownership and turns 404/403 into the same calm `ProjectNotFound` view. The Edge Function never trusts the client `projectId` — RLS does.

---

## §3 — Animation inventory

Libraries currently in dependencies:
- **Framer Motion 12.38** — `motion`/`m`, `useReducedMotion`, `AnimatePresence`, `layout`/`layoutId`. Used in MessageAssistant, Top3, EckdatenPanel, OfflineBanner, JumpToLatestFab, BereichePlanSection (effects only), ProjectNotFound, Wizard, Landing.
- **Lenis 1.3.23** — installed; not used in chat surface (used elsewhere — likely Landing/Result).
- **Vaul 1.1.2** — used for mobile bottom drawers (UnifiedFooter overflow, MobileRailDrawer, ExportMenu mobile, top-direction progress drawer).
- **Tailwind tailwindcss-animate** — accordion-down/up.

Existing motion specifications (durations + easings):

| Where | Duration | Easing | Source |
|---|---|---|---|
| MessageAssistant marginalia rule (`scaleY` 0→1) | 320 ms | `[0.16, 1, 0.3, 1]` | Framer Motion |
| MessageAssistant match-cut hairline (`scaleX` 0→1) | 320 ms | `[0.16, 1, 0.3, 1]` | Framer Motion |
| MessageAssistant nameplate scale-in (after 320 ms delay) | 240 ms | same | Framer Motion |
| Top3 item enter (`y: 16→0, opacity: 0→1`) | 300 ms (stagger 80 ms) | same | Framer Motion |
| Top3 layout reorder | 320 ms | same | Framer Motion `layout` |
| Top3 exit | 200 ms | default | Framer Motion |
| EckdatenPanel item enter | 240 ms | same | Framer Motion |
| BereichePlanSection celebration: pmBandPulse | 1200 ms | ease-in-out | inline `<style>` |
| BereichePlanSection: pmCheckDraw | 600 ms | ease-out | inline `<style>` |
| BereichePlanSection: pmRipple | 800 ms | ease-out | inline `<style>` |
| ThinkingIndicator: pmPauseBlot (clay ink-blot) | 360 ms | `cubic-bezier(0.16,1,0.3,1)` | inline `<style>` |
| ThinkingIndicator: pmPauseFade | 320 ms (delays 0/160/280) | same | inline `<style>` |
| ThinkingIndicator: pmTravelDot (dots) | 1400 ms loop, 180 ms stagger | ease-in-out | inline `<style>` |
| ThinkingIndicator: rotation cycle | every 3000 ms after 6000 ms warm-up | (cross-fade not used) | `setInterval` |
| Typewriter | mean 18 ms, ±10 jitter, 100 ms sentence pause | n/a | `setTimeout` |
| ProgressMeter cell fill | 240 ms (18 ms stagger) | ease | CSS transition |
| ProgressMeter dot position | 320 ms | `cubic-bezier(0.16,1,0.3,1)` | CSS transition `cx` |
| ChatProgressBar segment fill width | `duration-soft` (180 ms) | `ease-soft` | Tailwind |
| OfflineBanner enter/exit | 200 ms | `[0.16,1,0.3,1]` | Framer Motion |
| BlueprintSubstrate: pmTableBreath | 14 s | ease-in-out infinite | inline `<style>` |
| BlueprintSubstrate: ambient drift | continuous (`sin(t·0.0001)`) | linear | rAF |
| FountainPenFooter signature shimmer | 8 s | ease-in-out infinite | inline `<style>` |
| IdkPopover backdrop fade | 180 ms | linear | Framer Motion |
| IdkPopover scale-in | 220 ms | `[0.16,1,0.3,1]` | Framer Motion |
| JumpToLatestFab enter/exit | 200 ms | `[0.16,1,0.3,1]` | Framer Motion |
| Tailwind config: `transition-soft` | 180 ms `cubic-bezier(0.4,0,0.2,1)` | | tailwind.config.js:172–179 |
| Tailwind config: `transition-calm` | 700 ms `cubic-bezier(0.16,1,0.3,1)` | | same |
| Tailwind keyframes (always-on) | hairline-draw, fade-rise, draw-path, breath-dot, travel-dot, mesh-drift-{a,b,c}, blink-cursor, ken-burns, gradient-shimmer | various | tailwind.config.js |
| Tailwind animation keys referenced but **keyframes absent from tailwind.config.js** | `pm-bloom-drift, pm-pulse-clay, pm-blink-soft, pm-area-scan, pm-float-card, pm-hairline-sweep, pm-counter-bloom` | | tailwind.config.js:250–256 — **flag: keyframes presumably live in CSS but I did not find them in `globals.css` while reading; brief should not collide with these names** |

**Reduced-motion gates**: 105+ uses (per prior audit). Every `<m.*>` consumes `useReducedMotion()`; inline styles use `@media (prefers-reduced-motion: reduce)` blocks. Global rule in `globals.css:141–153` clamps every animation/transition to 0.001 ms when the OS flag is set.

Brief's proposed names that **collide** with existing ones:
- `animate-pulse` — Tailwind already provides this (different semantics — it's the default shadcn skeleton pulse). Brief overrides it with new keyframes (`'pulse 2.4s'` infinite). **Risk**: any consumer of `animate-pulse` elsewhere in the repo will silently change behaviour. Solution: namespace the brief's name (`animate-pm-pulse` or `animate-station-pulse`).
- `animate-arc-draw, animate-fresh-fade, animate-slide-in-up, animate-pulse-bar, animate-pulse-fast` — no collisions in the existing config.

---

## §4 — Exports inventory

The brief assumes one PDF + one checklist. Reality is **three formats** + **two PDF builders** (one for chat, one for the Result page).

| Trigger | Mounted by | Action |
|---|---|---|
| `<ExportMenu variant="ghost">` in `FooterLeftColumn` (UnifiedFooter desktop) | always when `hasMessages` | Three-row menu: PDF / Markdown / JSON |
| `<ExportMenu variant="primary">` in OverviewPage / Result page header | overview/result | same |
| `<ExportMenu variant="icon">` in `MobileTopBar` | mobile | same |

| Format | Builder | Notes |
|---|---|---|
| PDF | `src/features/chat/lib/exportPdf.ts:80` `buildExportPdf({ project, messages, events, lang })` | Dynamic-imported (`await import('../lib/exportPdf')`). Uses pdf-lib + fontkit + brand TTFs (`/public/fonts/`). Falls back to Helvetica + `winAnsiSafe` text sanitiser if font loading fails. **Phase 6 deferred a Bauherr-grade restructure (D.2)** — current PDF is functional but reads as a database dump. |
| Markdown | `src/lib/export/exportMarkdown.ts:55` `buildExportMarkdown({ project, events, lang })` | Pure string template. Uses `factLabel` and `factValueWithUnit`. Audit log filtered to `MEANINGFUL_EVENT_TYPES` (Phase 6 A.7). Footer reads "_Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in._" |
| JSON | `src/lib/export/exportJson.ts:26` `buildExportJson({ project, messages, events })` | Schema `planning-matrix.export.v1`. Strips telemetry. **Does NOT include `tool_input`** (Phase 6 D.3 deferred — one-line add). 30 latest events. |

Filename helper: `src/lib/export/exportFilename.ts` — slug + ISO date, capped at 64 chars.

Telemetry: `logExportEvent` fires `<kind>_export_attempted/_succeeded/_failed` per format.

Calm error UI: when PDF fails, ExportMenu surfaces a dismissable panel with "Markdown stattdessen" CTA + "Fehler kopieren" + DEV-only stack trace.

There's also a **separate Result-page checklist PDF**: `src/features/result/lib/exportChecklistPdf.ts`'s `buildChecklistPdf({ project, state, lang })`, called from `src/features/result/components/DocumentChecklist.tsx`. Same library, different content. **Brief's "buildChecklist.ts" is a guess at this**, but the path and shape are different from what's described.

Move 13's "Export project state" JSON download — **already exists** as the JSON option in ExportMenu. So Move 13 is largely "rebrand the existing menu" not "add a new download path."

---

## §5 — Auto-scroll diagnosis (and what Move 6 changes)

Current behaviour (`hooks/useAutoScroll.ts`):
- On every `[messages.length, isThinking]` tick, scrolls window to `document.documentElement.scrollHeight` smoothly **unless** paused.
- Pauses when `scroll` event reads `distanceFromBottom > 100 px`.
- Returns `{ paused, resume }` — **but Thread.tsx ignores the return**. The `<JumpToLatestFab />` in InputBar duplicates the same scroll-distance detection independently.

Current bug observable from this design: the brief is right — when a long assistant response arrives, the user lands at the **bottom** of it, mid-paragraph if the response is taller than the viewport. The start of the response — including the SpecialistTag + match-cut hairline + drop-cap — is above the fold.

Move 6 rewrites the contract:
- Scroll target = the **spec-tag** (`#spec-tag-<msgid>`), 90 px from viewport top.
- Pause threshold = "scrolled up >200 px from live edge" instead of "distanceFromBottom > 100 px."
- Resume threshold = "back to within 100 px of live edge."

What needs to change:
1. `<SpecialistTag>` must emit `id={`spec-tag-${message.id}`}` so the hook can find it.
2. `useAutoScroll` rewrites to look up the latest assistant message's spec-tag and scroll it to `topOffset = 90`.
3. JumpToLatestFab's hard-coded "scroll to bottom" must become "scroll to live edge = latest spec-tag at topOffset".
4. The paused-state count display ("↓ N new messages") needs the count — currently the FAB only shows the arrow. Add a counter store entry that increments on new assistant turns while paused, resets on jump.

---

## §6 — IDK trigger trace

```
InputBar.tsx:386–397
   "Weiß ich nicht" link (only when allow_idk && !disabled && onIdkClick)
        │ click
        ▼
ChatWorkspacePage.tsx:160 handleIdkClick → setIdkOpen(true)
        │
        ▼
IdkPopover.tsx (modal, fixed centered, focus trap, Esc close)
   3 buttons: research / assume / skip
        │ click
        ▼
onChoose(mode) → ChatWorkspacePage.handleIdkChoose(mode)
        │
        ▼
buildUserMessageText({ kind: 'idk', mode }) +
chatTurn.mutate({
  userMessage: <German prose like "Weiß ich nicht — bitte recherchieren.">,
  userAnswer: { kind: 'idk', mode: 'research'|'assume'|'skip' },
  attachmentIds: []
})
```

**Schema mismatch with brief Move 7:**
- Brief: `userAnswer: { kind: 'idk_research' \| 'idk_assume' \| 'idk_skip' }`
- Reality: `userAnswer: { kind: 'idk', mode: 'research' \| 'assume' \| 'skip' }`
- The Zod schema (`src/types/chatTurn.ts:42–45`) and the Edge Function will reject the brief's shape with `validation` envelope.
- The chips can absolutely replace the popover — **just keep the existing payload shape** (decision 0.3).

i18n keys in current use:
- `chat.input.idk.label` — "Weiß ich nicht" / "Don't know"
- `chat.input.idk.research` — title
- `chat.input.idk.researchExplain` — description (dropped if Move 7 chips replace popover)
- `chat.input.idk.assume`, `chat.input.idk.assumeExplain`
- `chat.input.idk.skip`, `chat.input.idk.skipExplain`

If chips replace the popover, the `*Explain` keys can be removed (chips are self-explanatory per brief). The `chat.input.idk.{research,assume,skip}.message` keys the brief proposes are net-new (the German `userMessage` text currently lives in `buildUserMessageText` in `userAnswerHelpers.ts`).

---

## §7 — Right-rail panel rules

| Slot | Component | Visible when | Reads from |
|---|---|---|---|
| 1 | IntentAxonometric | always (renders `Sonstiges` placeholder for unknown) | `project.intent` |
| 2 | Top3 | always (empty state if `recommendations.length === 0`) | `project.state.recommendations` |
| 3 | BereichePlanSection | always (`PENDING` defaults if no areas) | `project.state.areas` |
| 4 | EckdatenPanel | always (derived rows from intent + plot, then up to 6 facts) | `project.state.facts.slice(-5).reverse()` + project columns |
| 5 | ProceduresPanel | always (collapsible, hidden body when 0 entries) | `project.state.procedures` |
| 6 | DocumentsPanel | same | `project.state.documents` |
| 7 | RolesPanel | same | `project.state.roles` |
| 8 | FactTicker | always | `project.state.facts` (decoration) |

`<CostTicker />` and the "Vollständige Übersicht öffnen" link **moved out** to UnifiedFooter (Phase 3.7 #75) — they are no longer in the right rail.

---

## §8 — Typography & color — current truth

CSS variables in `globals.css:80–112` are HSL triplets used inside `hsl(var(--…))`. The brief proposes hex literals — **direct hex won't fit Tailwind's `hsl(var(--…))` indirection**. To keep the existing system, brief tokens should be expressed as HSL.

**Existing palette (chat surface):**
- `--paper: 38 30% 97%` (lighter than brief's `#F4EFE5`)
- `--ink: 220 16% 11%` (darker than brief's `#1A1612`)
- `--clay: 25 30% 38%` (less saturated than brief's `#8E6A47`)
- `--clay-soft / -light / -deep`, `--drafting-blue: 212 38% 32%`
- `--border: 220 12% 88%`, `--border-strong: 220 12% 78%` (these are the existing "hairlines")

**Phase 5/6 added pm-* parallel scope** in tailwind.config.js:138–171:
- `pm-paper`, `pm-paper-warm`, `pm-paper-deep`, `pm-paper-tint`, `pm-paper-soft`
- `pm-ink`, `pm-ink-soft`, `pm-ink-mid`, `pm-ink-muted`, `pm-ink-mute2`
- `pm-clay`, `pm-clay-deep`, `pm-clay-soft`, `pm-clay-tint`, `pm-clay-bloom`, `pm-clay-glow`
- `pm-sage`, `pm-hair`, `pm-hair-strong`, `pm-dark*`

These are referenced via `var(--pm-foo)` (raw values, not HSL triplets). They live in landing/dashboard land. The brief's tokens look more like a third parallel scope — possibly call them `--lt-*` (Living Drafting Table) or fold into the existing `pm-*` scope. **Decision needed.**

**JetBrains Mono is already wired** in `tailwind.config.js:46–53` and self-hosted at `/public/fonts/` per the Phase 8 LG München I DSGVO compliance fix. The brief's "add JetBrains Mono" step is mostly a no-op — verify the woff2 file ships first; if it doesn't, add it (it does need to be added for the brief to work, since the brief's mono usage is much heavier than current sparse use in a few `tabular-figures` spots).

**Operating mode tokens** (`globals.css:160–211`) — `data-mode="operating"` opts the chat root into rounded radii + soft shadow + 0.005em body tracking + bumped clay opacity (0.72 floor instead of 0.55). Brief should respect this — anything inside the chat workspace already inherits these.

**Mobile token overrides** (`globals.css:221–250`) — `data-pm-viewport="mobile"` bumps body to 16 px (so iOS Safari doesn't zoom on textarea focus), sets safe-area proxies, faster transitions. Brief's mobile sections must respect this.

---

## §9 — Bundle size

Current build (`dist/assets/`):
- `index-D6-irOUX.js` — **239 KB gz** (867 KB raw). 61 KB headroom under the 300 KB ceiling at `scripts/verify-bundle-size.mjs:23`. Brief's auto-memory says 242 KB; latest measured is 239 KB.
- `index-BfEh6cae.css` — 16 KB gz.
- `i18n-bG9ZHSoM.js` — 62 KB raw (locale bundles split).
- `lucide-BKNcjNQB.js` — 5.5 KB raw.
- `PlotMap-Dc6CVfga.js` + `PlotMap-DQ-Xn6Wy.css` — 165 KB + 17 KB raw (Leaflet, dashboard/landing only — code-split).
- **Dynamic-imported PDF chain** (only shipped when user clicks Export PDF): `exportPdf-…js` 9 KB raw + `fontLoader-…js` 376 KB raw + `fontkit.es-…js` 711 KB raw → ~480 KB gz combined, **outside the main bundle ceiling**.

Brief's ≤ 35 KB delta target is realistic but tight. Concretely, the increase will come from:
- `@radix-ui/react-popover` (decision 0.2) — ~7 KB gz.
- New components (CompassArc, StickyContext, StandUpModal, ChapterDivider, CitationChip, ProjectPortrait) — together estimated 12–18 KB gz of TSX + their CSS.
- New i18n keys (~70 entries × ~80 bytes = ~5–6 KB raw, ~2–3 KB gz, but locale JSON loads via i18n chunk so this hits the i18n bundle, not main).
- LawArticles registry — ~3 KB gz.
- Timeline event derivation lib — ~2 KB gz.

Net rough estimate: ~22–28 KB gz on the main bundle. Achievable. If we approach 35, code-split the StandUpModal (it's only mounted on click) and the LawArticles registry.

---

## §10 — Open issues / TODOs / dead code

Live grep on `src/features/chat/`:
- 0 `TODO/FIXME/XXX/HACK` matches.
- 1 `console.info` (DEV-gated in `useChatTurn.ts:340`) — fine.
- `hooks/useAutoScroll.ts:41–47` exposes `resume()` that is **never called** (Thread ignores the return). Dead code.
- `MessageUser.tsx:57` always renders `content_de` — when user types in EN their bubble still reads German. Defensible (user input isn't translated) but worth a one-line comment.
- `Thread.tsx:46` divider every 6 messages counts messages, not pairs. Minor.

Phase 6 deferred items live (per `FIX_REPORT_PHASE6.md`):
- **A.5** Bilingual state strings (Area.reason, Fact.evidence, Qualifier.reason, Role.rationale_en) — brief Moves 4/8/9/11 will lean on these and assume them bilingual; reality is they're DE-only today.
- **D.2** PDF Bauherr-grade restructure — out of scope this phase.
- **D.3** Add `tool_input` to JSON export — one-line trivial; could fold into Move 13.
- **C.4** Specialist-tag staleness during streaming — adjacent to brief's Move 12.
- **C.5** Cost/timeline per-row Vorläufig badges — not in this brief.
- **C.6** Data Quality "Verified 0%" reframing — not in this brief.
- **E.1, E.2** Topic graph + grouped input — not in this brief.

---

## §11 — Phase 5/6 delta against the brief's §1 hard-locks (NEW SECTION)

The brief's §1 "Hard locks" list reflects what was true at Phase 4.1. Phase 5 + Phase 6 added significant load-bearing surfaces. Anything below should be treated as **also sacred** for Phase 7 unless the user explicitly green-lights touching it.

### §1 amendments (post-Phase-5/6 sacred surfaces):

#### Phase 5 — München narrowing
- `src/features/wizard/lib/plotValidation.ts` — `isMuenchenAddress`, 70-PLZ Set, used by the wizard PLZ gate (now active per the prior audit fix list). **Sacred.**
- `data/muenchen/` slice + `legalContext/muenchen.ts` system-prompt block (StPlS 926, BaumschutzV 60 cm, Erhaltungssatzungen, Sub-Bauamt routing, Lokalbaukommission). **Sacred.**
- `0010_projects_city_muenchen.sql` — `city` CHECK widened, default flipped. **Schema lock.**
- Landing page + `addresses.ts` Munich-first ordering, locale title "Bauakte · 2026-04 · München" — **out of chat scope but locked.**

#### Phase 6 — God-mode sprint
- **`messages.tool_input jsonb`** column (migration `0012_messages_tool_input.sql`). Both streaming and non-streaming Edge Function paths persist via `insertAssistantMessage`. Brief's §1 schema lock now includes this column.
- **System-prompt invariants** in `supabase/functions/chat-turn/legalContext/shared.ts`:
  - Rule 5 (dialog batching: 1 primary + ≤4 themed sub-clarifications)
  - Rule 9 (legal-shield clause is UI-only, do NOT emit "Vorbehaltlich…" in `message_de/en`)
  - Rule 11 (Area state transition invariant)
  - Rule 12 (prose-tool consistency invariant)
  - COMPLETION-SIGNAL-RUBRIK with enriched `needs_designer` 4+5+3 structure + BAYAK link
- **Heritage proactive trigger** in `legalContext/muenchen.ts` (B.2) and four B.3 topics in `legalContext/bayern.ts` (Erschließung, Abstandsflächen, GEG/Wärme, Bauherr-Architekt).
- **Semantic events** (A.7): `MEANINGFUL_EVENT_TYPES` Set + `summarizeEvent` in `src/features/dashboard/lib/recentActivity.ts`. The Markdown export filters on these. The brief's Move 11 timeline derivation must use this same primitive (don't reinvent).
- **factLabels +33 keys** in `src/locales/factLabels.de.ts` / `factLabels.en.ts` (HERITAGE.*, BUILDING.EXISTING_*, PLOT.ERSCHLIESSUNG_* + CONNECTION, BUILDING.VOLLGESCHOSSE/BASEMENT/ATTIC/DETACHED, PLOT.STADTBEZIRK_* + LBK, TREES.*, PARTIES.ARCHITEKT.*).
- **BayBO Art. 59 BayBO definition block** added to `legalContext/bayern.ts` (Phase 5 audit fix #4).

#### Phase 5/6 — chat-feature surfaces brief doesn't enumerate but must preserve
- **Offline queue** (`chatStore.offlineQueue`, `OFFLINE_QUEUE_CAP=5`, `useOfflineQueueDrain`, `enqueueOffline`, `removeFromOfflineQueue`, `clearOfflineQueue`). The earlier prior audit explicitly flagged this as missing — Phase 5/6 fixed it. **Sacred.**
- **Streaming bubble** (`StreamingAssistantBubble`, `chatStore.streamingMessage`, `openStreamingMessage`, `appendStreamingText`, `closeStreamingMessage`). Brief states "typewriter remains as-is" — but in fact streaming is what produces the typewriter feel during a live turn; the persisted-message Typewriter is only the post-stream re-render. Don't break the swap.
- **Abort/stop affordance** (`SendButton` calls `chatStore.abortStreaming()`; `useChatTurn` registers an `AbortController`). Brief doesn't account for. **Sacred.**
- **Suggestion chips above InputBar** (`SuggestionChips.tsx` 16.5 KB, `useInputState`, `likely_user_replies` in `respondToolInputSchema`). Brief's `chat.input.idk.label` "Falls unsicher" eyebrow now competes for the same vertical slot as the Continue / yesno / select chips. Layout must not let the new IDK chip row crowd them. **Sacred surface.**
- **File upload pipeline** (Phase 3.6 #67/#68): `ChatDropZone`, `MessageAttachment`, `Input/AttachmentChip`, `Input/AttachmentPicker`, `Input/MobileAttachmentSheet`, `useUploadFile`, `useDeleteFile`, `useProjectAttachments`, `documentLinkage.ts`, `pendingAttachments` in store, `linkFilesToMessage` API, `project_files` table. **Sacred.**
- **Recovery row + sonstige template synthetic system messages** in `ChatWorkspacePage.tsx:70–152`. The brief's "ChapterDivider" Move 4 must not collide with these system rows (skip them in chapter detection).
- **CompletionInterstitial** with octagonal stamp, Roman numerals, drop-cap chevron actions. Renders inside Thread when `lastCompletionSignal !== continue/null`. **Sacred.**
- **ChatProgressBar** (Phase 3.6 #69) — sticky top of thread, `lg+` only. The "top tabs" the brief wants to delete in Move 1 == this component. Move 1 is a redesign, not an addition.
- **ProgressMeter** (left-rail, demoted via `opacity-70` per Phase 3.6 #69). Source of truth shared with ChatProgressBar via `progressEstimate.ts`.
- **VerlaufMap** + **SpecialistsAtTheTable** + **SpecialistSigils** (Phase 3.4 #58 / #38). The latter is the per-specialist drawing glyph that already replaces the brief's "● clay dot" with something richer.
- **AutoSavedIndicator** (`chatStore.lastSavedAt`). Brief doesn't account for.
- **Rate limit** (50/h via `0008_chat_turn_rate_limits.sql` SECURITY DEFINER RPC + `RateLimitBanner`). **Sacred.**
- **ErrorBanner** for non-rate-limit errors (`chatStore.lastError`).
- **MessageContextSheet** (long-press on mobile, both user + assistant messages). **Sacred.**
- **viewTransitionName: 'pm-handoff-hairline'** on the very first assistant message (Phase 3.1 #32) — wizard transition target. **Sacred.**
- **`data-mode="operating"` attribute** on the chat workspace root drives operating-mode tokens. Brief's CSS variables must coexist with these, not override.
- **BlueprintSubstrate** cursor-lensing two-grid background. **Sacred.**
- **UnifiedFooter** (Phase 3.7 #75) — fixed bottom band housing Briefing/Cockpit/Export/Leave + InputBar (embedded mode) + scale-bar + CostTicker. Decision 0.5.
- **EmbeddedShell vs StandaloneShell** in InputBar — `embedded` prop drops chrome when InputBar is composed into UnifiedFooter. JumpToLatestFab is mounted inside both shells.
- **Typewriter calls `highlightCitations(text)` post-completion** (`Typewriter.tsx:87`). Move 5 must replace this single call site, not add new wiring elsewhere.

### §1 contradictions in the brief that need resolution

| # | Brief assumes | Reality | Fix |
|---|---|---|---|
| 1 | `chat-redesign.html` exists | Only `prototypes/makeover-v3.html` exists | Decision 0.1 |
| 2 | `tailwind.config.ts` | `tailwind.config.js` | trivial path fix |
| 3 | `src/i18n/de/chat.json`, `src/i18n/en/chat.json` | `src/locales/de.json`, `src/locales/en.json` (single-file namespaces, `"chat": {…}` block at line 864) | i18n additions go into the existing `chat` namespace |
| 4 | `LeftRail/*`, `Thread/*`, `RightRail/*`, `Banners/*` are directories | Only `Input/`, `Progress/`, `UnifiedFooter/` are directories — others are flat files | Don't create the subfolders; co-locate the new components beside the existing flat files |
| 5 | `BlueprintBackground.tsx` exists | `BlueprintSubstrate.tsx` lives at `src/components/shared/`, mounted in ChatWorkspaceLayout | trivial — no work needed |
| 6 | `useTypewriter.ts` hook | `Typewriter.tsx` component (no hook) | Move 5/Move 6 integration treats Typewriter as the consumer |
| 7 | `src/lib/i18nFormatters.ts` | does not exist (factLabel.ts + costFormat.ts cover formatting) | brief's references to it are stray |
| 8 | `src/types/respondTool.ts` | exists ✓ | confirmed |
| 9 | `OverviewModalPage.tsx` | `OverviewPage.tsx` (full route, not modal) | Brief's name is wrong |
| 10 | `ProjectNotFound.tsx` lives in `chat/components/` | lives in `src/components/shared/` | trivial |
| 11 | IDK answer shape `{ kind: 'idk_research' \| 'idk_assume' \| 'idk_skip' }` | `{ kind: 'idk', mode: 'research' \| 'assume' \| 'skip' }` | Decision 0.3 |
| 12 | "Top tabs" exist at top of workspace | `<ChatProgressBar />` (sticky 7-segment) is what's there | Decision 0.4 |
| 13 | `@radix-ui/react-popover` available at `@/components/ui/popover` | not installed; no shadcn `popover` wrapper | Decision 0.2 |
| 14 | `src/features/chat/lib/buildChecklist.ts` | does not exist; `src/features/result/lib/exportChecklistPdf.ts` is the closest analogue (different feature) | Brief's "Open checklist" CTA already routes to `/projects/:id/overview`; nothing to relocate |
| 15 | "Existing typewriter dots/spinner" | actual is the ink-blot pause + clay rotating label + 3 travel dots | rewrite the choreography, not just swap a spinner |
| 16 | "Recommendations are reactive layout" | already are (`<m.li layout="position">` + AnimatePresence in Top3) | Move 10a is largely no-op; only the "fresh edge bar fade" is new |
| 17 | "Areas illustration is static decorative art" | actually has a celebration animation when band → ACTIVE; six axonometric variants by intent | Move 9 must (a) preserve celebration or replace it intentionally, (b) keep parity for the 6 intents or accept regression |
| 18 | "Specialist row is a static 4-name list" | already 6-distinct-recent + active highlight + per-specialist sigil glyph + turn count italic | Move 12 is mostly a re-skin, not new behaviour |
| 19 | `src/i18n/{de,en}/chat.json` parity | Real parity gate is `npm run verify:locales` (882 keys at last run), runs as `prebuild` | new keys must keep parity green; factLabels TS modules NOT parity-gated |
| 20 | "PDF / checklist export is wired to Open checklist / Export / View briefing" | Three formats (PDF / MD / JSON) live in `<ExportMenu>` + a separate `buildChecklistPdf` for `/result`; "View briefing" routes to `/result`; "Checkliste öffnen" routes to `/overview`. Move 13 must integrate, not replace. |

### Phase 6 deferred items the brief implicitly assumes are done

- **A.5 Bilingual state strings**: Move 4 chapter labels, Move 11 timeline summaries, Move 9 portrait annotations, and Move 8 impact lines all need DE/EN. State carries `_de`/`_en` for most fields BUT not for `Area.reason`, `Fact.evidence`, `Qualifier.reason`, `Role.rationale_en`. Workaround for Phase 7: render the German fallback in EN locale where bilingual gaps exist; flag as Phase 8 follow-up. **Don't widen scope here.**
- **C.4 Specialist staleness during streaming**: the `<SpecialistTag>` shown by the streaming bubble is `chatStore.currentSpecialist`, which `promoteSpecialist` only updates on `onSuccess`. So during a streaming handoff the wrong specialist's sigil shows briefly. Move 12's "live" detection uses last assistant message — same staleness window. Worth fixing alongside Move 12.

---

## §12 — Open questions for Rutik before writing code

(Beyond the five §0 decisions — these can be answered during the first commit cycle if you prefer.)

1. **`pm-bloom-drift, pm-pulse-clay, pm-blink-soft, pm-area-scan, pm-float-card, pm-hairline-sweep, pm-counter-bloom`** — these animation keys are referenced in `tailwind.config.js:250–256` but I did not find their keyframes in `globals.css`. Likely defined in a separate CSS file or via inline `<style>` in landing/dashboard components. Brief's new keyframe names (`animate-pulse`, `animate-arc-draw`, etc.) are unlikely to collide but worth confirming the existing pm-*'s home before adding more.
2. **`animate-pulse` collision** — Tailwind's default `animate-pulse` is the shadcn skeleton pulse (1s opacity 1↔.5 loop). Brief overrides with a custom 2.4s scale loop. Better to namespace as `animate-station-pulse` or `animate-pm-pulse-slow` to avoid silent regressions in any existing skeleton consumers. Confirm direction.
3. **`pm-*` token namespace** for brief's new color tokens — fold into existing `pm-*` scope (used by landing/dashboard) or create a new `lt-*` (Living Drafting Table) scope? Risk of folding: confusion when atelier-mode landing shares the same names. Risk of new scope: more variable maintenance.
4. **Recovery row + sonstige system rows** in chapter detection — Move 4 says "no chapter dividers in conversations < 4 turns." With the synthetic system rows, message count includes them. Should chapter logic count assistant turns only (matching Phase 3 turn semantics), or all message rows?
5. **Stand Up modal — is `/projects/:id/overview` enough, or genuinely a new modal?** OverviewPage already exists at 760 LOC and contains a "story so far" + open questions + checklist + audit. Move 11's "Stand Up modal" overlaps significantly with this. Two paths: (a) make StandUpModal a lightweight summary that delegates to `/overview` for the deep view (less work, clearer hierarchy); (b) port pieces of OverviewPage into a modal (more work, risks divergence). I lean (a).
6. **Mobile parity** — `<MobileChatWorkspace>` renders an entirely separate layout than the desktop `ChatWorkspaceLayout` + UnifiedFooter combo. Every brief move must be implemented in **both** paths. Most are easy on mobile (CompassArc collapses to 7 dots; StickyContext sits below MobileTopBar; StandUp button positions above input bar). Worth confirming the brief understands the mobile cost is not zero.
7. **Bauherr ergonomics for "Stand up & look around"** — the button itself ("Aufstehen & umsehen") is metaphorical. In the German formal Sie register the metaphor reads as performative. Suggest reviewing copy with the same rigor as the legal-shield clause; perhaps "Übersicht öffnen" / "View overview" is more appropriate. The metaphor shines in EN; in DE it's more poetic than utilitarian.
8. **A.5 bilingual strings workaround approval** — for Move 4 chapter labels, Move 11 timeline, Move 8 impact line, and Move 9 portrait notes, OK to render German strings in both locales where the underlying state is single-string DE? (Phase 8 will widen the schema; doing it alongside Phase 7 doubles the surface area and risks both shipping late.)

---

## §13 — Recommended implementation strategy (for review, not yet plan)

Once §0 decisions land, the brief's 22-commit sequence should be reordered to:

1. Tokens + JetBrains Mono verification (additive, no regression risk).
2. i18n key additions (parity green, no UI yet).
3. Decision 0.2: install `@radix-ui/react-popover` + create `@/components/ui/popover` shadcn wrapper.
4. Spec-tag id emission (one-line change, prepares Move 6).
5. CitationChip + lawArticles registry + parseCitations + replace `highlightCitations` call site in `Typewriter.tsx:87` (Move 5 — single replacement point).
6. CompassArc as a re-skin of `ChatProgressBar` (decision 0.4 — same `progressEstimate.ts` source).
7. StickyContext (Move 2) — IntersectionObserver + spec-tag anchor.
8. ThinkingIndicator drafting compass refit (Move 3 — same `chatStore` hooks, swap choreography; rotation already exists).
9. ChapterDivider + detectChapters (Move 4 — handle synthetic system rows; question #4 above).
10. Smart auto-scroll rewrite + JumpToLatestFab counter (Move 6 + part of Move 7).
11. IDK chips replacing IdkPopover (Move 7 — keep `userAnswer` shape).
12. Impact line on user messages (Move 8 — derive from next assistant turn's `extracted_facts`).
13. ProjectPortrait refit (Move 9 — keep variant gallery; layer reactive annotations).
14. Top-3 fresh-edge bar (Move 10a's only delta) + EckdatenPanel pulse-in (Move 10b) + Areas live-pulse (Move 10c).
15. SpecialistsAtTheTable upgrade (Move 12 — show all 7, refine highlight).
16. StandUpButton + StandUpModal (Move 11) — option (a): lightweight summary delegating to `/overview`.
17. ExportMenu integration with StandUp + small relabel of UnifiedFooter actions (Move 13 — JSON export already exists; question #5).
18. Regression sweep + bundle size check (target 22–28 KB delta).
19. Manual test plan (76 edge cases + 69 manual steps).

Concretely 4–6 small commits per visual change, ~20–28 commits total — closer to the brief's 22 than my count looks.

---

## Methodology
Read-only against `main` HEAD `5d735af` on 2026-05-04. No file modified except `AUDIT.md` (this file). No build, no deploy, no Supabase or external service touched. Bundle gz numbers measured via `gzip -c | wc -c` on the existing `dist/assets/`.

— End of audit. Standing by for §0 decisions before writing any production code.
