# Planning Matrix — Chat Workspace Audit
> Generated 2026-05-04. Read-only. Stage A of 2 (B is the redesign).
> Scope: everything mounted under `/projects/:id` (chat workspace + overview cockpit + reachable modals/drawers).

## Executive summary
- **Total chat-workspace LOC:** 11,079 across **77 .ts/.tsx files** under `src/features/chat/` (excludes the shared `src/lib/chatApi.ts` 486 LOC, `src/stores/chatStore.ts` 295 LOC, and the Edge Function under `supabase/functions/chat-turn/`).
- **Render tree depth from `ChatWorkspacePage`:** ~6 levels (Page → Mobile/Desktop shell → ChatWorkspaceLayout / MobileChatWorkspace → LeftRail / Thread / RightRail / UnifiedFooter → leaf components).
- **Distinct components mapped:** ~50 (37 in `components/`, 4 in `components/Input/`, 3 in `components/UnifiedFooter/`, 2 in `components/Progress/`, plus the page wrappers).
- **Specialist personas:** 7 (`moderator`, `planungsrecht`, `bauordnungsrecht`, `sonstige_vorgaben`, `verfahren`, `beteiligte`, `synthesizer`). Confirmed in `src/types/projectState.ts:40` and exhaustively wired in `SpecialistSigils.tsx`, `SpecialistTag.tsx`, `LeftRail.tsx`, `VerlaufMap.tsx`, `ThinkingIndicator.tsx`, `progressEstimate.ts`.
- **Message types in the thread:** 6 distinct rendered shapes (user bubble, assistant turn, system row, streaming bubble, thinking indicator, completion interstitial) on top of 3 message roles (`user` / `assistant` / `system`).

**5 most underbaked items (ranked by impact):**
1. **Spec-index liveness is a façade** — 8 of 12 gates in `LeftRail.tsx:101–114` derive nothing from project state (`() => 'PENDING'` / `() => 'ACTIVE'`). Only gates III, V.a, V.b, V.c react to live data.
2. **Streaming sometimes has a 0-character "stream"** — server may take the non-SSE branch (proxy strips `Accept`); the client's two safety guards in `chatApi.ts:275–449` cover this, but the user sees the cursor blink with no text, then the persisted message snaps in. Visually this is "broken stream" even though it succeeded.
3. **The right-rail "Top-3" rank is purely model-driven** with no client-side stickiness — when the model reorders ranks mid-conversation, `Top3.tsx:30` sorts and slices, animates with `layout="position"`, but there's no protection against rank thrash between turns.
4. **The "schedule" panels (Procedures / Documents / Roles) default closed** (`ScheduleSection.tsx:35`, `defaultOpen = false`). For a Bauherr who doesn't know to click the chevron, the right rail looks empty after the first few turns even when state is rich.
5. **Mobile users get a `Drawer.Root` for left rail twice** — `ChatWorkspacePage.tsx:345–360` mounts `<MobileRailDrawer>` for both rails AND the mobile branch of the same component re-renders them inside `<MobileChatWorkspace>` (`MobileChatWorkspace.tsx:133–193`). Two parallel drawer subtrees per rail; effectively dead code on mobile (only the inner drawers are wired).

**5 things to absolutely preserve:**
1. **The 7 specialist sigils with live "thinking" micro-animations** (`SpecialistSigils.tsx`). Each domain has its own animation: stamps lift, rulers sweep, heads tilt, ink drips. Restraint + delight, perfect register.
2. **The match-cut hairline + nameplate scale on specialist handoff** (`MessageAssistant.tsx:90–119`). Phase 3.1 #32 even wires View Transitions API on the first assistant turn so the wizard's hairline morphs into the chat's. Don't lose this.
3. **The Roman numeral spec-index in the left rail** (`LeftRail.tsx:121–153`) with sub-letters a/b/c/d/e for area gates, italic Serif numerals in a 6-px-wide column, ACTIVE/PENDING/VOID dots aligned right.
4. **The Bereiche A/B/C plan-section SVG with celebration redraw** (`BereichePlanSection.tsx`) — the diagonal hatching at 45°, the dashed VOID strikethrough, the hand-drawn checkmark on flip-to-ACTIVE.
5. **The CompletionInterstitial as octagonal stamp** (`CompletionInterstitial.tsx:113–163`) — rotated -8°, italic Serif Roman numeral inside, "Bauamt notice" register. Drop-cap body. Chevron actions.

---

## Section 1 — File map

77 files, 11,079 LOC. Tree under `src/features/chat/` (depth ≤ 5).

### Top 5 largest (flag)
| Path | LOC | Purpose |
| --- | --- | --- |
| `lib/exportPdf.ts` | 827 | pdf-lib + fontkit PDF export pipeline (TTF embedding, page break logic, north-arrow rosette, schedule tables). Lazy-loaded by ExportMenu. |
| `pages/OverviewPage.tsx` | 760 | `/projects/:id/overview` cockpit — 8 tabs (Projekt / Daten / Bereiche / Verfahren / Dokumente / Team / Empfehlungen / Audit), Linear-style tables, edit-in-place on CLIENT facts. |
| `components/Input/SuggestionChips.tsx` | 489 | All chip flavours above the textarea (yesno / single_select / multi_select / address / reply / Continue). |
| `components/ExportMenu.tsx` | 469 | Three-format export (PDF/MD/JSON), desktop popover ↔ vaul drawer split via `useSyncExternalStore`. |
| `components/Input/InputBar.tsx` | 401 | The persistent textarea + paperclip + send shell, auto-grow, keyboard handling, embedded vs standalone shell. |

### Pages (`pages/`)
| Path | LOC | Purpose |
| --- | --- | --- |
| `pages/ChatWorkspacePage.tsx` | 390 | Route entry. Branches mobile vs desktop. Synthesises in-thread system messages (sonstige fallback notice + recovery row). Owns drawer state. |
| `pages/OverviewPage.tsx` | 760 | Cockpit tabs (see above). |

### Components (`components/`, depth 1)
| Path | LOC | Purpose |
| --- | --- | --- |
| `components/AtelierIllustration.tsx` | 175 | 320×320 SVG drafting table with animated 1 cm scale line + steam curl for empty state. |
| `components/AutoSavedIndicator.tsx` | 36 | "Automatisch gespeichert · vor X Sek." in left rail header (re-renders every 5 s). |
| `components/Banners.tsx` | 47 | OfflineBanner. |
| `components/BereichePlanSection.tsx` | 316 | Right rail A/B/C plan-section SVG (diagonal hatching, VOID dashed strike, ACTIVE celebration redraw). |
| `components/ChatDropZone.tsx` | 144 | Drag-and-drop zone wrapping the message column. Skipped on coarse pointers. |
| `components/ChatWorkspaceLayout.tsx` | 77 | Three-zone desktop grid + Blueprint substrate + grain overlay. |
| `components/CompletionInterstitial.tsx` | 218 | Octagonal stamp + drop-cap body + chevron actions (Bauamt-notice register). |
| `components/ConversationCursor.tsx` | 46 | Fixed hairline cursor in left margin, only at xl breakpoint, after 200px scroll. |
| `components/CostTicker.tsx` | 129 | Token + USD totals styled as M 1:1 scale-bar flourish (admin-only via email allowlist). |
| `components/DocumentsPanel.tsx` | 27 | Right-rail Dokumente schedule (numeral II). |
| `components/EckdatenPanel.tsx` | 120 | Right-rail key data — derived (intent + plot) + most recent 4 facts, max 6 rows. |
| `components/EmptyState.tsx` | 63 | "Das Atelier öffnet" priming state with AtelierIllustration. |
| `components/ErrorBanner.tsx` | 70 | Top-of-workspace strip for non-rate-limit chat-turn errors (i18n via `chat.errors.<code>`). |
| `components/ExportMenu.tsx` | 469 | See above. |
| `components/FactTicker.tsx` | 109 | Idle "Wussten Sie?" Bavarian fact rotation in right rail (kicks in after 30 s idle). |
| `components/IntentAxonometric.tsx` | 298 | Six axonometric drawings (Einfamilien / Mehrfamilien / Sanierung / Umnutzung / Abbruch / Sonstiges) + scale bar M 1:100. |
| `components/JumpToLatestFab.tsx` | 75 | Scroll-to-bottom round button mounted inside InputBar (absolute `-top-12 right-0`). |
| `components/LeftRail.tsx` | 307 | Spec index (Roman numerals + sub-letters), AutoSaved indicator, ProgressMeter, VerlaufMap, "Am Tisch" specialists, fountain pen footer. |
| `components/MessageAssistant.tsx` | 138 | Assistant turn: marginalia rule, SpecialistTag with handoff hairline + nameplate scale, Typewriter body. |
| `components/MessageAttachment.tsx` | 125 | Inline file chips below user message (project-batched query). |
| `components/MessageContextSheet.tsx` | 118 | Mobile long-press sheet — copy text + close. |
| `components/MessageSystem.tsx` | 33 | Hairline-bordered system row with `SYSTEM` tag. |
| `components/MessageUser.tsx` | 96 | Right-aligned tinted bubble + always-visible timestamp + tooltip relative time. |
| `components/MobileChatWorkspace.tsx` | 196 | Mobile orchestrator: collapsing header, sticky compact progress, fixed-bottom input bar with keyboard awareness. |
| `components/MobileRailDrawer.tsx` | 77 | Vaul left/right drawer with grab-handle, drafting-blue spine. |
| `components/MobileRightRailPeek.tsx` | 77 | 60-px paper-tinted slice peeking at the right edge when a new recommendation arrives. |
| `components/MobileTopBar.tsx` | 142 | Pre-Phase-3.8 mobile header (PROJEKT eyebrow, folded-tab triggers). Used as fallback in `lg:hidden` desktop branch. |
| `components/MobileTopHeader.tsx` | 152 | Phase 3.8 collapsing-on-scroll mobile header used by `MobileChatWorkspace`. |
| `components/PaperCard.tsx` | 35 | Hairline-bordered paper-on-paper card wrapping the thread. |
| `components/ProceduresPanel.tsx` | 43 | Right-rail Verfahren schedule (numeral I). |
| `components/ProgressMeter.tsx` | 144 | Left-rail 16-cell SVG bar, `ca. N % erfasst` + "Aktuell: …" label. |
| `components/RateLimitBanner.tsx` | 67 | Top-of-workspace strip when chat-turn rejected with HTTP 429. |
| `components/RightRail.tsx` | 63 | Composes the right-rail panels in order. |
| `components/RolesPanel.tsx` | 53 | Right-rail Fachplaner schedule (numeral III), needed-first sort. |
| `components/ScheduleSection.tsx` | 136 | Collapsible schedule shell + ScheduleRow primitive (Roman numeral + count + chevron). |
| `components/SpecialistSigils.tsx` | 286 | Seven 14×14 SVG sigils with per-specialist micro-animations during thinking. |
| `components/SpecialistTag.tsx` | 73 | `● PLANUNGSRECHT / Planungsrecht` tag (sigil + uppercase label + italic German role). |
| `components/StatusPill.tsx` | 47 | Lifecycle status text in tracked uppercase, color-coded. |
| `components/StreamingAssistantBubble.tsx` | 38 | Mirrors MessageAssistant shape while a stream is in flight. |
| `components/StreamingCursor.tsx` | 32 | Blinking drafting-blue 1px vertical bar at end of streaming text. |
| `components/ThinkingIndicator.tsx` | 151 | Pause-blot + SpecialistTag (active sigil) + rotating label + 3 travel dots. |
| `components/Thread.tsx` | 106 | Render loop, hairline divider every 6 messages, mounts thinking/streaming/completion below the list. |
| `components/TitleBlock.tsx` | 69 | German A1 title block at top of PaperCard (PROJEKT eyebrow, address, "Erstellt:", NorthArrow). |
| `components/Top3.tsx` | 102 | Three rec cards with drafting-blue hairline left edge, italic Serif drop-cap numbers. |
| `components/Typewriter.tsx` | 93 | Variable-rhythm character reveal, sentence-end pause, click-to-skip, sr-only mirror for accessibility. |
| `components/VerlaufMap.tsx` | 148 | 7-circle conversation map; click-to-scroll to that specialist's first message. |

### Components / Input/
| Path | LOC | Purpose |
| --- | --- | --- |
| `components/Input/AttachmentChip.tsx` | 141 | Pending-file chip in input bar (icon, name truncate-middle, size, status, X). |
| `components/Input/AttachmentPicker.tsx` | 235 | Desktop popover with category select + file input. |
| `components/Input/IdkPopover.tsx` | 120 | "Weiß ich nicht" → research / assume / skip three-button modal. |
| `components/Input/InputBar.tsx` | 401 | See above. |
| `components/Input/MobileAttachmentSheet.tsx` | 198 | Mobile vaul sheet with three rows (camera / gallery / document). |
| `components/Input/SendButton.tsx` | 90 | Three states: idle ink-circle, disabled, streaming-stop drafting-blue Square. |
| `components/Input/SuggestionChips.tsx` | 489 | See above. |
| `components/Input/index.ts` | 1 | Re-exports `InputBar`. |

### Components / Progress/
| Path | LOC | Purpose |
| --- | --- | --- |
| `components/Progress/ChatProgressBar.tsx` | 234 | 7-segment loud progress bar at top of thread. Compact mode for mobile. Durable derivation from messages prop. |
| `components/Progress/ChatProgressBarMobile.tsx` | 18 | Compact wrapper. |

### Components / UnifiedFooter/
| Path | LOC | Purpose |
| --- | --- | --- |
| `components/UnifiedFooter/UnifiedFooter.tsx` | 160 | Fixed-position three-sub-column band + mobile overflow drawer. |
| `components/UnifiedFooter/FooterLeftColumn.tsx` | 101 | Briefing primary CTA + Checkliste / Export / Leave secondary row. |
| `components/UnifiedFooter/FooterRightColumn.tsx` | 98 | Checkliste outline button + scale bar + CostTicker. |

### Hooks (`hooks/`)
| Path | LOC | Purpose |
| --- | --- | --- |
| `hooks/useAutoScroll.ts` | 50 | Window scroll-to-bottom on dep change, paused when user scrolled up >100px. |
| `hooks/useChatTurn.ts` | 293 | The conversation mutation: optimistic placeholder, streaming, fallback, success/error reconciliation, file linkage. |
| `hooks/useDeleteFile.ts` | 40 | Mutation for chip-X (deletes storage object + project_files row, drops chip). |
| `hooks/useInputState.ts` | 152 | Text + active-suggestion + pending-attachments orchestration; build-and-clear helper. |
| `hooks/useMessages.ts` | 31 | TanStack Query for `messages` table (60s staleTime, no window-focus refetch). |
| `hooks/useProject.ts` | 31 | TanStack Query for single `projects` row. |
| `hooks/useProjectAttachments.ts` | — | Project-batched fetch of `project_files` rows. |
| `hooks/useProjectEvents.ts` | 37 | Last 30 `project_events` rows for the audit log + footer. |
| `hooks/useUploadFile.ts` | 102 | Storage upload + chip status transitions + auto-link for b_plan / plot_plan / building_plan. |

### Lib (`lib/`)
| Path | LOC | Purpose |
| --- | --- | --- |
| `lib/documentLinkage.ts` | 164 | Auto-set checklist doc to `liegt_vor` when matching upload category arrives. |
| `lib/exportPdf.ts` | 827 | See top-5. |
| `lib/formatRelativeShort.ts` | ~25 | "vor 12 Sek." / "12s ago" formatter. |
| `lib/highlightCitations.tsx` | 41 | Auto-bold German law citations (`§ 34 BauGB`, `Art. 57 BayBO`, etc.). |
| `lib/progressEstimate.ts` | 156 | Specialist anchor table + segment-progress helpers. |
| `lib/thinkingLabelToSection.ts` | 63 | German keyword map: hint text → which right-rail section will update next. |
| `lib/userAnswerHelpers.ts` | 38 | Build user message text from a structured `UserAnswer`. |

---

## Section 2 — Component composition

Render tree from the route entry. **D** = desktop branch only, **M** = mobile branch only, **B** = both.

```
ChatWorkspacePage  (page)
├── <SEO titleKey="seo.title.project" />
├── OfflineBanner      (B; reads navigator.onLine via window listeners)
├── RateLimitBanner    (B; reads chatStore.lastRateLimit)
├── ErrorBanner        (B; reads chatStore.lastError)
│
├── M: MobileChatWorkspace
│   ├── BlueprintSubstrate            (shared)
│   ├── MobileTopHeader               (collapses on scroll > 80 px)
│   │   └── FoldedTabIcon × 2
│   ├── ChatProgressBar(compact, messages)   (sticky top-[44px])
│   ├── <main>
│   │   └── { hasMessages
│   │       ? <ChatDropZone disabled={isThinking}>
│   │           └── PaperCard(project)
│   │             └── TitleBlock(project)
│   │             └── Thread(augmentedMessages)
│   │       : <EmptyState> }
│   ├── <fixed-bottom band>
│   │   └── InputBar(embedded)        (see below)
│   ├── Drawer.Root direction="left"
│   │   └── LeftRail + FooterLeftColumn
│   └── Drawer.Root direction="right"
│       └── RightRail
│
├── D: <MobileTopBar>           (only renders < lg via own classes; mounted in desktop branch as fallback)
├── D: ChatWorkspaceLayout
│   ├── BlueprintSubstrate
│   ├── grain-overlay-fixed
│   ├── grid lg:grid-cols-[280px,1fr,360px], max-w-[1440px]
│   ├── <aside>  LeftRail
│   │   ├── Wordmark
│   │   ├── Project header   (name split on `·`, plot_address, AutoSavedIndicator)
│   │   ├── SpecIndex  (12 GATES; 4 derive from project state)
│   │   │   └── GateStateMarker × 12
│   │   ├── ProgressMeter      (16-cell SVG; reads chatStore turnCount + currentSpecialist)
│   │   ├── VerlaufMap(messages) (7 circles; click-to-scroll)
│   │   ├── SpecialistsAtTheTable(messages)
│   │   │   └── SpecialistSigil × N
│   │   └── FountainPenFooter
│   ├── <main>
│   │   ├── ChatProgressBar(messages)   (lg:block, sticky-ish at top of thread)
│   │   ├── PaperCard(project)
│   │   │   ├── TitleBlock(project)
│   │   │   │   └── NorthArrow
│   │   │   └── Thread(augmentedMessages)
│   │   │       ├── for each MessageRow:
│   │   │       │   ├── MessageUser(message)         (right bubble + timestamp)
│   │   │       │   ├── MessageAssistant(message, isHistory, previousSpecialist, isHandoffTarget)
│   │   │       │   │   ├── marginalia rule (motion)
│   │   │       │   │   ├── handoff hairline + SpecialistTag scale-in
│   │   │       │   │   │   └── SpecialistTag → SpecialistSigil
│   │   │       │   │   └── Typewriter(text)
│   │   │       │   │       └── highlightCitations(text) on done
│   │   │       │   └── MessageSystem(message)
│   │   │       ├── StreamingAssistantBubble  (when chatStore.streamingMessage)
│   │   │       │   └── SpecialistTag, contentSoFar, StreamingCursor
│   │   │       ├── ThinkingIndicator         (when isAssistantThinking && !streaming)
│   │   │       └── CompletionInterstitial(projectId)  (when lastCompletionSignal !== continue/null)
│   │   │           └── OctagonalStamp + drop-cap body + ChevronAction × 2
│   │   └── ChatDropZone wraps PaperCard
│   ├── <aside>  RightRail
│   │   ├── IntentAxonometric(intent)   (intent-keyed drawing + ScaleBar M 1:100)
│   │   ├── Top3(recommendations)
│   │   ├── BereichePlanSection(state)
│   │   ├── EckdatenPanel(project, facts)
│   │   ├── ProceduresPanel(procedures) → ScheduleSection (default closed)
│   │   ├── DocumentsPanel(documents)   → ScheduleSection
│   │   ├── RolesPanel(roles)           → ScheduleSection
│   │   └── FactTicker (idle "Wussten Sie?")
│   └── UnifiedFooter (fixed bottom-0, 3 sub-cols)
│       ├── FooterLeftColumn(project, messages, events)
│       │   ├── Link to /result  (Briefing primary)
│       │   ├── Link to /overview  (Checkliste)
│       │   ├── ExportMenu(variant=ghost)
│       │   └── Link to /dashboard (← Projekt verlassen)
│       ├── InputBar(embedded)        (see below)
│       └── FooterRightColumn(project, messages)
│           ├── Link to /overview (Checkliste outline)
│           ├── FooterScaleBar
│           └── CostTicker(messages)  (admin-only)
│
├── ConversationCursor (xl only)
├── IdkPopover  (controlled by ChatWorkspacePage state)
├── MobileRailDrawer × 2  (left + right; ALSO mounted on desktop tree — see Section 11)
├── MobileRightRailPeek
└── Drawer.Root top  (progress overlay on mobile)
    └── ChatProgressBar(messages)
```

### `InputBar` subtree
```
InputBar(lastAssistant, onSubmit, onIdkClick, forceDisabled, embedded)
├── Shell = embedded ? EmbeddedShell : StandaloneShell
│   └── JumpToLatestFab  (absolute -top-12 right-0)
├── SuggestionChips(lastAssistant, disabled, onPick, onContinue, completionSignal)
│   ├── ContinueRow         (when input_type==='none' OR completion_signal continue/ready_for_review)
│   ├── ChipRow + YesNoChip × 2
│   ├── ChipRow + SelectChip × N
│   ├── MultiSelectRow (toggle set + Übernehmen + count hint)
│   ├── AddressRow (input + isPlotAddressValid)
│   └── ChipRow(variant=reply) + ReplyChip × 3
├── attachment chips list  (AttachmentChip × N, reads chatStore.pendingAttachments)
├── textarea card
│   ├── Paperclip button → AttachmentPicker(open)
│   │   └── desktop popover OR Drawer.Root → MobileAttachmentSheet
│   ├── <textarea> auto-grow MAX_ROWS=5
│   └── SendButton(isEmpty, disabled, onSend)  (idle | streaming-stop | inert)
└── helper row: free-text hint + IDK link
```

### Props vs hooks per high-touch component
| Component | Props received | State owned | Hooks |
| --- | --- | --- | --- |
| `ChatWorkspacePage` | URL `:id` only | `idkOpen`, `leftOpen`, `rightOpen`, `peekVisible`, `rightBadge`, `progressOpen`, `mountTime` | `useTranslation`, `useParams`, `useProject`, `useMessages`, `useProjectEvents`, `useChatStore` (×4), `useViewport`, `useChatTurn`, `useReducedMotion`, `useEffect` (rec count → peek), `useEffect` (chatStore reset on unmount). |
| `Thread` | `messages` | `initialIds` (Set, set once at mount) | `useChatStore` (thinking/streaming), `useParams`, `useAutoScroll`. |
| `MessageAssistant` | `message`, `isHistory`, `previousSpecialist`, `isHandoffTarget` | `sheetOpen` | `useTranslation`, `useReducedMotion`, `useViewport`, `useLongPress`. |
| `InputBar` | `lastAssistant`, `onSubmit`, `onIdkClick?`, `forceDisabled?`, `embedded?` | `pickerOpen`, textarea ref | `useInputState` (text + chips), `useChatStore` (completionSignal), `useDeleteFile`, two effects (auto-grow, refocus after chip). |
| `LeftRail` | `project`, `messages` | none | `useTranslation` only (children own their state). |
| `RightRail` | `project`, `messages` | none | none directly — pulls `project.state` and renders panel children. |
| `UnifiedFooter` | `project`, `messages`, `events`, `inputBar` | `overflowOpen` | `useTranslation`. |
| `ChatProgressBar` | `compact?`, `messages?` | none | `useChatStore` × 3, `useTranslation`, `useReducedMotion`. |

---

## Section 3 — Layout system

### Three-zone desktop grid
- Wrapper: `mx-auto w-full max-w-[1440px] grid lg:grid-cols-[280px_minmax(0,1fr)_360px] grid-cols-1`. Source: `ChatWorkspaceLayout.tsx:55`.
- Left rail: `<aside class="hidden lg:flex border-r border-border-strong/30 min-h-dvh">` — width fixed at **280 px**.
- Center column: `<main class="relative min-h-dvh flex flex-col">` → inner `<div class="flex-1 flex justify-center px-6 sm:px-10 lg:px-14">` → `<div class="w-full max-w-3xl py-16 lg:py-20">`. Center content max width **768 px** (`max-w-3xl`).
- Right rail: `<aside class="hidden lg:flex border-l border-border-strong/30 min-h-dvh">` — width fixed at **360 px**.
- Footer reservation: `pb-[120px] lg:pb-[180px]` on the grid wrapper when a `unifiedFooter` is mounted (`ChatWorkspaceLayout.tsx:54–57`).

### Breakpoints in play
| Breakpoint | Behaviour |
| --- | --- |
| `< 640 px` (`isMobile` from `useViewport`) | Routes to `MobileChatWorkspace`. Single-column, fixed bottom input, vaul drawers for both rails. |
| `640 – 1023 px` (tablet) | Stays on desktop tree. `lg:hidden` blocks render: `MobileTopBar` for header (folded-tab triggers), tablet branch of `UnifiedFooter` (`lg:hidden px-6 sm:px-10`). Left/right rails are hidden via `hidden lg:flex`; opened via vaul drawers (`MobileRailDrawer`). |
| `≥ 1024 px` (`lg`) | Three-zone grid live. `MobileTopBar`'s outer `lg:hidden` keeps it suppressed. `UnifiedFooter`'s `hidden lg:block` desktop band shows. |
| `≥ 1280 px` (`xl`) | `ConversationCursor` renders as a fixed hairline in the left margin. |
| `≥ 1440 px` | Grid stops scaling — wrapper hits `max-w-[1440px]` and centres. |

### Mobile collapse behaviour
- **Mobile branch (< 640):** `MobileChatWorkspace` is a fully separate orchestrator. `MobileTopHeader` collapses 56 px → 44 px when `window.scrollY > 80` (`MobileTopHeader.tsx:42–56`). Sticky compact `ChatProgressBar` mounts at `top-[44px]`. Input bar is fixed-bottom and rises above the keyboard via `useKeyboardHeight`.
- **Tablet branch (640–1023):** Three-column grid is hidden via `hidden lg:flex` on the asides; rails open as vaul drawers. The Phase 4.1.15 fix (UnifiedFooter `lg:hidden` block) added `px-[14px]` insets so the input visually aligns with the message column.
- **Mobile right-rail peek:** When recommendations grow and the right drawer is closed, a 60-px paper-tinted slice slides in for 4 s (`MobileRightRailPeek.tsx`); reduced-motion users get a clay dot badge on the right tab instead.

### Sticky / fixed elements
| Element | Position | File:line |
| --- | --- | --- |
| ChatProgressBar (desktop, top of thread) | `sticky top-0` only when not compact | `ChatProgressBar.tsx:117` |
| MobileTopBar | `lg:hidden sticky top-0 z-20` | `MobileTopBar.tsx:51` |
| MobileTopHeader (mobile branch) | `sticky top-0 z-30 pt-safe` | `MobileTopHeader.tsx:65` |
| Compact progress band (mobile) | `sticky top-[44px] z-20` | `MobileChatWorkspace.tsx:92` |
| UnifiedFooter | `fixed bottom-0 left-0 right-0 z-30` | `UnifiedFooter.tsx:46` |
| Mobile fixed input band | `fixed bottom-0 left-0 right-0 z-30` | `MobileChatWorkspace.tsx:111` |
| StandaloneShell (when InputBar not embedded) | `sticky bottom-0 z-20` | `InputBar.tsx:71` |
| JumpToLatestFab | `absolute -top-12 right-0` inside InputBar shell | `JumpToLatestFab.tsx:56` |
| ConversationCursor | `fixed left-[max(2rem,calc((100vw-1440px)/2+12px))] top-[28vh] hidden xl:block` | `ConversationCursor.tsx:40` |
| Banners (Offline/RateLimit/Error) | static at top of body, animate y on mount | each banner file |

### Padding / spacing scale used throughout
- LeftRail / RightRail: `px-5 py-7 gap-7` (20 px / 28 px / 28 px). Each section separator is `h-px bg-ink/12` or `bg-ink/15`.
- PaperCard: `px-8 sm:px-12 pt-10 sm:pt-14 pb-24` with `border border-ink/12 rounded-[2px]` and inset highlight via inline `boxShadow`.
- Thread: `<ol class="flex flex-col gap-8">`, hairline divider every 6 messages (`Thread.tsx:47`).
- ChipRow: `gap-2 overflow-x-auto pl-3` (Phase 4.1.7 collapsed earlier `mb-3` to keep chips visually contiguous with input card via `gap-2`).
- Footer pb compensations: desktop wrapper `pb-[180px]`, mobile wrapper `pb-[160px+safe-area]`.

---

## Section 4 — Message types + specialist system

### Message kinds rendered in the thread
| Discriminator | Renderer | Visual register | Editable / copyable / deletable |
| --- | --- | --- | --- |
| `role: 'user'` | `MessageUser` | Right-aligned tinted bubble (`bg-[hsl(38_30%_94%)]`), `rounded-xl`, max 70%, soft `border-ink/8`, always-visible italic clay timestamp. | Long-press on mobile opens MessageContextSheet → Copy. No edit. No delete. |
| `role: 'assistant'`, `specialist != null` | `MessageAssistant` | Left-aligned, no card. Marginalia clay rule -24 px from left edge. SpecialistTag (sigil + uppercase + role label below). Body Inter 16, leading 1.65, with auto-bolded law citations. Match-cut on specialist change: hairline rule fades in over 320 ms, then nameplate scales in over 240 ms. | Long-press on mobile → context sheet → Copy. Typewriter is click-to-skip. |
| `role: 'system'`, persisted | `MessageSystem` | `border-y border-border-strong/40 py-3`. `SYSTEM` tag in 0.20em uppercase clay (no leading dot — distinguishes from specialist tags). Body Inter 13 ink/80. | None — purely informational. |
| Synthetic `system:sonstige-notice` | `MessageSystem` (same shape) | Same. Inserted client-side in `ChatWorkspacePage.tsx:126–148` when `project.intent === 'sonstige'` AND messages exist. Never persisted. | None. |
| Synthetic `system:recovery-notice` | `MessageSystem` | Same. Inserted client-side at `ChatWorkspacePage.tsx:73–122` when `mountTime - project.updated_at > 1 hour`. Format: "Sie waren zuletzt am {{date}} hier. Wir setzen die Konsultation an derselben Stelle fort." Never persisted. | None. |
| In-flight stream | `StreamingAssistantBubble` (mounted in `Thread.tsx:84–88` when `chatStore.streamingMessage !== null`) | Same shape as MessageAssistant; static marginalia rule; SpecialistTag with `isActive`; body is `stream.contentSoFar` + `<StreamingCursor>` (drafting-blue 1px blinking bar). | None — replaced by persisted message on `closeStreamingMessage`. |
| Thinking | `ThinkingIndicator` (mounted in `Thread.tsx:89–92` when `isThinking && !streaming`) | Pause blot (clay dot, scale-in 360 ms) → SpecialistTag (active sigil) → italic clay rotating label (rotates every 3 s, starts after 6 s) → 3 travel dots. | None. |
| Completion | `CompletionInterstitial` (mounted in `Thread.tsx:94–98` whenever signal is set and `!== 'continue'`) | Hairline-bordered top+bottom paper aside. Octagonal stamp top-right rotated -8°, italic Serif Roman numeral inside (I/II/III). Inter 14 body with 3.4em italic Serif drop-cap. Two chevron actions. | None — buttons own nav (`/dashboard`, `/overview`, alert stub). |

### Specialists — verified against code
All 7 specialists from the original list are present in the code, plus the `system` non-specialist. No additional specialists found.

| ID (snake_case) | Display label DE / EN | Color | Sigil glyph (14×14) | Voice characteristics (from ThinkingIndicator labels + role label table) |
| --- | --- | --- | --- | --- |
| `moderator` | Moderator / Moderator (role label `Moderation`) | text-clay (top-line clay tag) + drafting-blue/60 sigil | Centre circle + 3 stools (rotate during thinking) | "Das Team berät sich.", "Einen Moment, wir stimmen uns ab.", "Wir prüfen den nächsten Schritt." |
| `planungsrecht` | Planungsrecht / Planungsrecht (role `Planungsrecht`) | clay/drafting-blue | Folded plan with corner that breathes | "Planungsrecht prüft die Festsetzungen.", "Wir konsultieren §§ 30 ff. BauGB.", "Wir vergleichen mit dem Bebauungsplan." |
| `bauordnungsrecht` | Bauordnungsrecht / Bauordnungsrecht (role `Bauordnung`) | clay/drafting-blue | House-elevation icon with vertical ruler sweep | "Bauordnung prüft die Verfahrenspflicht.", "Wir konsultieren die BayBO.", "Wir leiten die Gebäudeklasse ab." |
| `sonstige_vorgaben` | Sonstige Vorgaben / Sonstige Vorgaben (role `Weitere Vorgaben`) | clay/drafting-blue | Stamp box with diagonal ink slash; lifts + slash pulses | "Wir prüfen weitere Vorgaben.", "Denkmal- und Naturschutz werden geprüft.", "Wir konsultieren kommunale Satzungen." |
| `verfahren` | Verfahren / Verfahren (role `Verfahrenssynthese`) | clay/drafting-blue | Three boxes connected by arrows (heads extend) | "Wir synthetisieren die Verfahren.", "Wir stimmen die Domänen ab." |
| `beteiligte` | Beteiligte / Beteiligte (role `Beteiligten-Bedarf`) | clay/drafting-blue | Three head/torso glyphs that tilt sequentially | "Wir leiten Fachplaner ab.", "Tragwerks- und Brandschutzbedarf wird geprüft." |
| `synthesizer` | Synthese / Synthese (role `Querschnitt`) | clay/drafting-blue | Triangular nib + ink drop that falls during thinking | "Wir leiten die nächsten drei Schritte ab.", "Wir verdichten die Erkenntnisse." |
| (system) | (no specialist tag) | — | — | Inserted by Edge Function or client-side; never speaks as a persona. |

> Sommelier rule (`SpecialistTag.tsx:65–73`): the role label below the uppercase tag is **always rendered in German** regardless of UI locale. By design.

### A note on the spec-index gate labels
LeftRail's `GATES` array references `chat.gates.<id>` keys (`LeftRail.tsx:101–114` × `de.json:1074–1087`). The IDs and Roman numerals don't perfectly align with the conversation specialists:
- Roman numerals I–VII in **VerlaufMap** map to the 7 specialists.
- Roman numerals I–VII in **LeftRail SpecIndex** map to a different 7 anchors (Übersicht / Projekt / Grundstück / Beteiligte / Baurechtliche Einordnung / Planung / Dokumente) plus 5 area sub-letters.

These are two different mental models living side-by-side in the same column. Worth a redesign decision.

---

## Section 5 — Input bar + reply affordances

### Input modes
| Mode | Trigger | Component | UserAnswer kind sent |
| --- | --- | --- | --- |
| Free text | Always (textarea below the chips) | `InputBar.tsx:329` (textarea) → `useInputState.buildSubmitAndClear` | `{ kind: 'text', text }` |
| Yes/No chips | `lastAssistant.input_type === 'yesno'` | `SuggestionChips → YesNoChip` | `{ kind: 'yesno', value: 'ja'|'nein' }` |
| Single-select chips | `lastAssistant.input_type === 'single_select'` + options array | `SuggestionChips → SelectChip` | `{ kind: 'single_select', value, label_de, label_en }` |
| Multi-select | `lastAssistant.input_type === 'multi_select'` | `SuggestionChips → MultiSelectRow` (local toggle set + Übernehmen) | `{ kind: 'multi_select', values: [...] }` |
| Address | `lastAssistant.input_type === 'address'` | `SuggestionChips → AddressRow` (input + `isPlotAddressValid`) | `{ kind: 'address', text }` |
| Likely-reply suggestions | `lastAssistant.input_type === 'text'` AND `likely_user_replies.length > 0` | `SuggestionChips → ReplyChip` (top 3) | `{ kind: 'text', text }` (chip text → `kind: 'reply'` is mapped down in `suggestionToUserAnswer`) |
| Continue | `lastAssistant.input_type === 'none'` OR `completionSignal === 'continue'/'ready_for_review'` | `SuggestionChips → ContinueRow` | `{ kind: 'text', text: 'Weiter.' }` |
| "I'm not sure" | Bottom-right link, only when `lastAssistant.allow_idk === true` AND not disabled | `IdkPopover` → research/assume/skip | `{ kind: 'idk', mode: 'research'|'assume'|'skip' }` |
| File attachment | Paperclip button → AttachmentPicker (or MobileAttachmentSheet on mobile) | accepts `.pdf,.png,.jpg,.jpeg,.doc,.docx,.dwg,.dxf` (`AttachmentPicker.tsx:50`); category select (8 values: other / plot_plan / building_plan / b_plan / photo / grundbuch / energy_certificate); up to 5 files per click, ~25 MB cap copy. Mobile sheet exposes camera (capture="environment") / gallery / document. | Forwarded as `attachmentIds[]` alongside `userAnswer`. |
| Drag & drop | Drag a file over PaperCard | `ChatDropZone.tsx`; coarse-pointer suppressed; up to 5 files, category `other`. | `attachmentIds[]`. |

### Send button states
- **Idle** (`SendButton.tsx:71–89`): black ink-filled circle with paper ArrowUp. Hover scale 1.05.
- **Inert** (empty + no chip + no attachment): same fill, `cursor-not-allowed`, hover/active motion stripped.
- **Disabled** (forced): same as inert.
- **Streaming / thinking** (`SendButton.tsx:44–62`): drafting-blue circle with paper Square (stop). Click → `chatStore.abortStreaming()` which triggers AbortController on in-flight fetch.

### Multi-line / shortcuts
- `MAX_ROWS = 5`, `MAX_LENGTH = 4000` (`InputBar.tsx:110–111`).
- `Enter` → submit. `Shift+Enter` → newline. `Cmd+Enter` / `Ctrl+Enter` → submit (`InputBar.tsx:202–214`).
- Auto-grow recomputes height every keystroke via the effect at `InputBar.tsx:153–164`. Caret retained at end after chip click (`InputBar.tsx:168–175`).
- Mobile: textarea uses `text-[16px]` (above iOS zoom threshold) on small viewport, `sm:text-[15px]` on desktop.

### Placeholder behaviour
- Disabled (assistant thinking): `'Team antwortet…'`.
- `input_type === 'none'`: `'Antworten Sie hier, oder klicken Sie *Weiter* →'`.
- Default: `chat.input.text.placeholder` from i18n.

### Suggestion provenance
- The chip surface is driven entirely by **the last assistant message's** persisted fields: `input_type`, `input_options`, `likely_user_replies`, `allow_idk`. Set by the Edge Function per turn; refreshed every successful chat-turn.
- The "Continue" path is also driven by `chatStore.lastCompletionSignal` (set on success).
- "Likely user replies" cap at 3 items (`SuggestionChips.tsx:121`) with a `←` glyph prefix, italic Serif clay/70.

### Append-vs-replace contract (Q1)
`useInputState.applySuggestion` (`useInputState.ts:69–82`) — if textarea has text, append the chip text on a new line so the user's typed note survives the chip click. If empty, replace.

---

## Section 6 — Right rail — Top 3, Areas, Key Data, the rest

All eight panels read from one `ProjectState` slice (`project.state` JSONB) loaded by `useProject` and updated **inline by the chat-turn response** — `useChatTurn.onSuccess` rewrites the cached project row's `state` (`useChatTurn.ts:194–200`). No realtime subscription, no polling — the right rail re-renders synchronously when a turn lands.

| Panel | Source of truth | Update mechanism | Empty state | Loading state | Visual notes |
| --- | --- | --- | --- | --- | --- |
| **IntentAxonometric** | `project.intent` (column) | Static — only changes if intent changes (it doesn't post-wizard). | Falls through to `SonstigesDrawing` (dashed wireframe + serif-italic `?`). | None (project is loaded before first paint). | 240×160 viewBox, drafting-blue/55 stroke. Below: scale bar with 5 tick marks + filled "0–1m" segment + italic Serif `M 1:100` label. |
| **Top3** | `project.state.recommendations` sorted by `rank` ascending, sliced to 3 | Re-renders on every turn; `AnimatePresence` + `layout="position"` animates rank reorders with 80 ms stagger | "Empfehlungen erscheinen hier, sobald genug Informationen vorliegen." (italic Serif clay/70) | None. | Each card: paper, hairline border, drafting-blue 1px hairline running full height down the LEFT edge; italic Serif 28px clay-deep number drop-cap, Inter title beside; Inter 12 body; FOOTER OUTSIDE the card with hairline rule + italic Serif `chat.preliminaryFooter` margin annotation. Counter at top: italic Serif `00 / 03`. |
| **BereichePlanSection** | `project.state.areas` (`A`, `B`, `C` each `{ state, reason? }`) | Re-renders on state change. Tracks previous state via `useRef`; when a band flips PENDING/VOID → ACTIVE, fires a 1.6 s celebration: hand-drawn checkmark draws via stroke-dashoffset + ripple expand + brightness pulse (`BereichePlanSection.tsx:55–74`). | All three bands `PENDING` (sparse hatching). | None. | 240×96 viewBox SVG. ACTIVE = drafting-blue diagonal hatching at 45° / 4 px. PENDING = clay diagonal 8 px. VOID = dashed outline + diagonal strikethrough. Letter A/B/C in serif italic on a paper-tinted notch on the left. Heading shows italic Serif `Schnitt A·A`. Below the SVG: a 3-row legend with state words. |
| **EckdatenPanel** | Derived facts: `intent`, `plot_address` if `has_plot`. Then `project.state.facts.slice(-5).reverse()`. Capped at 6 rows total. | Re-renders every turn. `AnimatePresence` for new facts. | If only intent fact exists, still renders a single row. | None. | Roman numerals I..VI in 24-px column with right-edge hairline. Three-line block per row: label (Inter 11 uppercase tracked clay), value (Inter 14 medium ink), qualifier badge (Inter 9 italic clay/60 uppercase tracked, format `SOURCE · QUALITY`, e.g. `CLIENT · DECIDED`). Counter top-right: `0N / 06`. |
| **ProceduresPanel (I)** | `project.state.procedures` | `useChatStore.currentActivitySection === 'procedures'` ambient pulse next to title. Re-renders on every turn. | "Verfahren erscheinen hier, sobald die Einordnung eindeutig ist." | None. | Collapsible (defaults **closed**). Each row: 24-px `01`/`02`/… numeral column, Inter 13 medium title + StatusPill on right, Inter 11 ink/65 sub (rationale), Inter 9 italic uppercase qualifier. Numeral header in italic Serif 13 clay-deep + count. |
| **DocumentsPanel (II)** | `project.state.documents` | Same shape. Sub line: `Erforderlich für: <ids>`. | "Dokumente erscheinen hier, sobald sich das Verfahren konkretisiert." | None. | Same schedule shell. |
| **RolesPanel (III)** | `project.state.roles`; `needed: true` first, then `needed: false`. | Same. | "Fachplaner erscheinen hier, sobald die Anforderungen klar sind." | None. | Same shell; meta is `BENÖTIGT` / `NICHT BENÖTIGT` in clay/ink-40 (no StatusPill). |
| **FactTicker** | Static `FACTS_MUENCHEN` data file (`@/data/factsMuenchen`). | Idle detection: 30 s without thinking/streaming, no completion interstitial active, `turnCount > 0`. Then cycles a fact every 12 s, no within-session repeats. Fade 600 ms. | Hidden entirely until idle conditions are met. | n/a. | Italic Serif Inter-11 ink/65 fact body under "WUSSTEN SIE?" eyebrow. |

### Specifics requested
- **Building-sketch SVG (top right)**: It's the `IntentAxonometric` (above). One of 6 hand-drawn-feeling drawings per `project.intent`. The "Schnitt AA" label is **not** on this SVG — it's the eyebrow of `BereichePlanSection` (`BereichePlanSection.tsx:82–84`). The `M 1:100` annotation IS on this SVG, drawn as a real 5-tick scale bar with a filled first segment.
- **Schnitt AA / M 1:100 functional?**: Both are decorative architectural register. They don't drive any logic.
- **Areas A/B/C diagram**: SVG with two `<pattern>` defs (`pm-hatch-active` 4 px, `pm-hatch-pending` 8 px). Hatching is what controls visual state.
- **Top-3 ranking**: The rank comes from the model on each turn (`Recommendation.rank`, 1..N). Client sorts ascending and slices(0,3). Drop-cap numbers are visible position 1/2/3, NOT the model rank — Phase 3.1 #29 explicitly decoupled them.
- **Key Data qualifier badges**: Confirmed format `SOURCE · QUALITY`, joined with a middle dot, uppercase, italic clay/60, 9 px, tracked 0.14em. Example: `CLIENT · DECIDED`. (`EckdatenPanel.tsx:67`, `EckdatenPanel.tsx:110`.)
- **Token spend `≈ 42.023 Tokens · 0,11 USD`**: Calculated client-side in `CostTicker.tsx:32–48` by summing `input_tokens + output_tokens + cache_read_tokens + cache_write_tokens` across all assistant `MessageRow`s. USD via `estimateUsd` in `@/lib/costFormat`. Render uses `formatTokensDe` (German thousands separator). **Admin-only** (gated by `isAdminEmail(user?.email)` from `@/lib/cn-feature-flags`).
- **Spend bar (M 1:1)**: The horizontal SVG with 5 tick marks above the token line in `CostTicker.tsx:65–93`. **Purely decorative** — it's a fixed scale-bar flourish; it does NOT visualize spend ratio. The first segment is always filled at 25%. M 1:1 = "real-size", rail-bottom flourish twin to the M 1:100 at the top.
- **Procedures / Documents / Specialists collapsibles**: All three default `defaultOpen={false}` (`ScheduleSection.tsx:35`). User click toggles via `ChevronDown` rotate-180.

---

## Section 7 — Thinking, streaming, loading states

### Submit → first-paint timeline
1. User clicks send / chip / IDK.
2. `useChatTurn.onMutate` (`useChatTurn.ts:136–183`) inserts an **optimistic user message** (`id: pending-{clientRequestId}`) into the messages cache. `chatStore.setThinking(true, seedSpecialist, seedLabel, activitySection)` flips on; `chatStore.openStreamingMessage` opens the streaming bubble.
3. `Thread` swaps `<ThinkingIndicator>` → `<StreamingAssistantBubble>` immediately (the `isStreaming && !isThinking` precedence at `Thread.tsx:84–93`).
4. On each SSE `json_delta` frame, `streamingExtractor` extracts user-visible text from the partial JSON (`chatApi.ts:452–456`) and pushes it via `appendStreamingText`. The bubble grows, the `<StreamingCursor>` blinks at the end.
5. On `complete` frame: `closeStreamingMessage` → bubble unmounts; persisted assistant message lands in the cache → `MessageAssistant` renders with `isHistory=false`, marginalia rule animates in, Typewriter starts (or runs instantly via `instant` if it's a history row).
6. `noteSuccessfulTurn` increments `turnCount`, stamps `lastSavedAt`. `promoteSpecialist` rotates current/previous. `setCompletionSignal` is set if non-`continue`.

### Streaming vs blocking
- **Streaming first** (`postChatTurnStreaming`). The token-by-token visible reveal IS the assistant text being extracted from a JSON tool-input as it streams.
- **Fallback to blocking JSON** (`postChatTurn`) if (a) the SSE stream errors before any text arrived, or (b) Content-Type isn't `text/event-stream` (proxy stripped Accept), or (c) loop closes without a complete frame. Hot-fix in `chatApi.ts:275–449` ensures exactly one of `onComplete`/`onError` always fires.

### Thinking indicator
- Mounts only when `isAssistantThinking && !streamingMessage`. Practically: usually replaced within ~100 ms by the streaming bubble (since `openStreamingMessage` runs in `mutationFn` immediately). It's still visible during the round-trip before any SSE frames arrive AND when the streaming bubble has been closed but persistence is still finalising.
- Pause-blot scale-in (360 ms) → SpecialistTag with `isActive` (sigil micro-animations on) → italic clay rotating label. Initial label is the model's `thinking_label_de` (set on the previous turn); rotation kicks in after 6 s and cycles every 3 s through the specialist's repertoire.
- 3 travel dots cycling. Reduced-motion: dots replaced with static `chat.thinking.staticLabel` text.

### Skeleton loaders
None. The work-in-flight UX leans entirely on the thinking indicator + streaming bubble + animated sigils. There are no `<Skeleton>` components anywhere in `src/features/chat/`.

### Error states
- `ErrorBanner` reads `chatStore.lastError.code`; looks up `chat.errors.<code>.title` + `.body` for the eight known codes (`streaming_failed`, `model_response_invalid`, `upstream_overloaded`, `upstream_timeout`, `persistence_failed`, `idempotency_replay`, `validation`, `unauthenticated`, `not_found`, `internal`). Unknown codes fall through to `internal`. Quiet-bar register (paper bg, `border-b border-destructive/30`).
- `RateLimitBanner` reads `chatStore.lastRateLimit` (set on HTTP 429 with rate-limit envelope); renders count/max/reset time.
- `OfflineBanner` reads `navigator.onLine` via window events.
- Per-message retry: the `failedRequestIds` set is on chatStore but **no UI surface currently consumes it** — `MessageUser` doesn't render an "Erneut senden" affordance despite the comment in `useChatTurn.ts:31`.

### Auto-scroll behaviour
- `useAutoScroll` (`useAutoScroll.ts`) auto-scrolls window to bottom on each new message; pauses when user has scrolled up >100 px from bottom.
- The `paused` flag is owned but no longer surfaces a "Neue Nachricht" pill — Phase 4.1.6 moved the affordance to `JumpToLatestFab` mounted inside InputBar with its own scroll-distance detection (`JumpToLatestFab.tsx:18–39`). Threshold: 100 px scrolled away from bottom.

### Streaming completeness guards
Two safety nets in `chatApi.ts:275–449` so the streaming bubble is never orphaned:
1. **Wrapper `settled` flag** — guarantees exactly one `onComplete` / `onError` fires per request.
2. **Read-loop fallback** — if loop exits with no recognised frame, treats accumulated buffer as a JSON envelope and synthesises the matching settle call.

---

## Section 8 — Project state shape + qualifier system

### Type (verbatim from `src/types/projectState.ts:26–184`)

```ts
export type Source = 'LEGAL' | 'CLIENT' | 'DESIGNER' | 'AUTHORITY'
export type Quality = 'CALCULATED' | 'VERIFIED' | 'ASSUMED' | 'DECIDED'
export type AreaState = 'ACTIVE' | 'PENDING' | 'VOID'

export type TemplateId = 'T-01' | 'T-02' | 'T-03' | 'T-04' | 'T-05' | 'T-06' | 'T-07' | 'T-08'

export type Specialist =
  | 'moderator' | 'planungsrecht' | 'bauordnungsrecht' | 'sonstige_vorgaben'
  | 'verfahren' | 'beteiligte' | 'synthesizer'

export interface Qualifier {
  source: Source
  quality: Quality
  setAt: string                  // ISO-8601
  setBy: 'user' | 'assistant' | 'system'
  reason?: string
}

export interface Fact {
  key: string
  value: unknown                  // narrowed at call site
  qualifier: Qualifier
  evidence?: string               // e.g. "BayBO Art. 57 Abs. 1"
}

export type ItemStatus =
  | 'nicht_erforderlich' | 'erforderlich' | 'liegt_vor'
  | 'freigegeben' | 'eingereicht' | 'genehmigt'

export interface Procedure { id, title_de, title_en, status, rationale_de, rationale_en, qualifier }
export interface DocumentItem { id, title_de, title_en, status, required_for[], produced_by[], qualifier }
export interface Role { id, title_de, title_en, needed: boolean, rationale_de, qualifier }

export type EstimatedEffort = '1d' | '1-3d' | '1w' | '2-4w' | 'months'
export type ResponsibleParty = 'bauherr' | 'architekt' | 'fachplaner' | 'bauamt'

export interface Recommendation {
  id, rank: number,
  title_de, title_en, detail_de, detail_en,
  ctaLabel_de?, ctaLabel_en?,
  estimated_effort?: EstimatedEffort,
  responsible_party?: ResponsibleParty,
  qualifier?: { source: Source; quality: Quality },
  createdAt: string
}

export interface Areas {
  A: { state: AreaState; reason?: string }   // Planungsrecht (BauGB §§ 30/34/35, BauNVO)
  B: { state: AreaState; reason?: string }   // Bauordnungsrecht (BayBO)
  C: { state: AreaState; reason?: string }   // Sonstige Vorgaben (Baulasten, Denkmal, kommunal, Naturschutz)
}

export interface AskedQuestion { fingerprint: string; askedAt: string }

export interface ProjectState {
  schemaVersion: 1
  templateId: TemplateId
  facts: Fact[]
  procedures: Procedure[]
  documents: DocumentItem[]
  roles: Role[]
  recommendations: Recommendation[]   // sorted by rank ascending; render top 3
  areas: Areas
  questionsAsked: AskedQuestion[]
  lastTurnAt: string
}
```

### Qualifier model (Source × Quality)
- **Source** = where the value came from (`LEGAL`, `CLIENT`, `DESIGNER`, `AUTHORITY`).
- **Quality** = how grounded it is (`CALCULATED`, `VERIFIED`, `ASSUMED`, `DECIDED`).
- Stored on every fact, procedure, document, role, and (optionally) recommendation.
- Rendered as `SOURCE · QUALITY` uppercase italic small-caps badges in EckdatenPanel + ScheduleRow.
- The model is instructed to be honest (`projectState.ts:11–14` comment): a client-stated assumption is `CLIENT/ASSUMED` not `CLIENT/DECIDED`. Helpers in `src/lib/projectStateHelpers.ts` preserve qualifiers across mutations.

### How chat-turn mutates state
- The Edge Function receives the user's message + answer, calls Anthropic with forced tool use (`respond` tool). The tool input contains the next state mutations.
- `applyToolInputToState` (in `src/lib/projectStateHelpers.ts`, imported by Edge Function via relative path `../../../src/lib/projectStateHelpers.ts`) applies the mutations.
- The Edge Function persists the updated `projectState` via `UPDATE projects SET state = $1`.
- The function returns the new full state inline as `projectState`.

### Optimistic vs reconcile
- **Optimistic**: only the user message (id `pending-…`) is inserted into the messages cache. The project state is **not** mutated optimistically.
- **Reconcile**: on `onSuccess`, the cache `[ 'project', projectId ]` is set with `{ ...old, state: response.projectState, updated_at: new Date().toISOString() }`. The cache `[ 'messages', projectId ]` is appended with `response.assistantMessage`. The optimistic placeholder is never explicitly removed — it's overwritten when the next `useMessages` revalidation runs (60 s staleTime, no auto-refetch on focus). In practice this is fine because the persisted user message is inserted server-side with the same `client_request_id` and replaces the placeholder on the next refetch.

### Where `auto_saved_at` comes from
- It's a chatStore session value: `chatStore.lastSavedAt: Date | null` (`chatStore.ts` declaration; set in `noteSuccessfulTurn` after each successful chat-turn, `chatStore.ts:178`).
- Resets to `null` on project unmount (chat store reset in `ChatWorkspacePage.tsx:198–199`). Re-stamped only after the FIRST successful turn of the new mount.
- **Implication**: a fresh page load shows no "Automatisch gespeichert" line until the user sends at least one turn — even when the project on disk is fully saved. The `AutoSavedIndicator` simply returns `null` when `lastSavedAt` is null (`AutoSavedIndicator.tsx:27`).

### Resume logic
- The "Sie waren zuletzt am … hier" recovery row is **client-side and ephemeral** — synthesised in `ChatWorkspacePage.tsx:73–122`. Triggered when `(mountTime - new Date(project.updated_at).getTime()) > 1 hour`. Inserted at the end of the message list. Never persisted.
- Uses `mountTime = useState(() => Date.now())` for stability across renders.
- Format: `Sie waren zuletzt am {{date}} hier. Wir setzen die Konsultation an derselben Stelle fort.` (DE) / `You were last here on {{date}}. We'll continue the consultation from where you left off.` (EN). Date formatted with German or English long-month formatter.

---

## Section 9 — Edge Function + persistence integration

### Endpoint
- `POST /functions/v1/chat-turn` (Supabase Edge Function, Deno).
- Auth: bearer JWT in `Authorization: Bearer <access_token>`; `apikey: <anon>`. Per-request Supabase client is RLS-scoped to the caller (`supabase/functions/chat-turn/index.ts:109–113`).

### Request body
```ts
{
  projectId: uuid,
  userMessage: string | null,         // null only on first-turn priming
  userAnswer: UserAnswer | null,      // discriminated union (text/yesno/single_select/multi_select/address/idk)
  clientRequestId: uuid,              // idempotency key
  locale?: 'de' | 'en'                // defaults 'de' server-side
}
```
Validated server-side via `chatTurnRequestSchema` (Zod) — same source file as the SPA imports (`src/types/chatTurn.ts:50–67`).

### Streaming protocol
- Client sets `Accept: text/event-stream` (`chatApi.ts:237`). Server picks streaming branch via `acceptsStream`.
- SSE frames: `json_delta` (`{ partial: string }`), `complete` (`{ assistantMessage, projectState, costInfo, completionSignal, requestId? }`), `error` (`{ code, message, retryAfterMs?, requestId? }`).
- Client uses `TextFieldExtractor` (`@/lib/streamingExtractor`) keyed on `message_de` or `message_en` to extract user-visible text from the streaming JSON (`chatApi.ts:393`).
- Two safety hot-fix guards — see Section 7.

### Non-streaming response
```ts
{
  ok: true,
  assistantMessage: AssistantMessageRow,    // snake_case DB shape
  projectState: ProjectState,
  costInfo: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, latencyMs, usdEstimate },
  completionSignal: 'continue' | 'needs_designer' | 'ready_for_review' | 'blocked'
}
```
Or:
```ts
{
  ok: false,
  error: {
    code: ChatTurnErrorCode,
    message: string,
    retryAfterMs?: number,
    requestId?: string,
    rateLimit?: { currentCount, maxCount, resetAt }
  }
}
```

### Error codes
`unauthenticated` · `forbidden` · `not_found` · `validation` · `idempotency_replay` · `upstream_overloaded` · `upstream_timeout` · `model_response_invalid` · `persistence_failed` · `rate_limit_exceeded` · `internal`.

### Retry behaviour
- **Mutation `retry: 0`** (`useChatTurn.ts:59`). No automatic retry.
- **Server retry** in `callAnthropicWithRetry` (Edge Function): one retry on malformed tool input (per `chat-turn/index.ts:7` comment; `callAnthropicWithRetry` import).
- **Idempotency**: `clientRequestId` is the unique key for the user-message insert (partial unique index per `chat-turn/index.ts:11–14` flow doc). A retry with the same id short-circuits server-side if the assistant message already exists.

### Token accounting
- `costInfo` is on the response envelope. Persisted on the `messages` row at insert time as `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `latency_ms`. The client never recomputes — `CostTicker` simply sums these columns across assistant messages and multiplies via `estimateUsd`.

### Project state writes
- **Sole writer of `projects.state`**: the chat-turn Edge Function. Client never writes the state column directly except for **one local-only mutation** in `documentLinkage.applyDocumentLinkage` (called after `b_plan` / `plot_plan` / `building_plan` upload). That mutation only updates the cached query data — it does NOT persist to Supabase. Persistence comes the next time the model emits an updated documents array.
- **Direct Supabase writes from the SPA in this scope:**
  - `CompletionInterstitial.pauseProject` updates `projects.status` to `paused`.
  - `useUploadFile` → `uploadProjectFile` (in `@/lib/uploadApi`) inserts into `project_files` and Storage.
  - `useChatTurn.onSuccess` → `linkFilesToMessage` updates `project_files.message_id` after the persisted user message id is known.
  - `useDeleteFile` → `deletePendingFile` removes orphaned uploads.
- All other writes go through `chat-turn`.

---

## Section 10 — Things already excellent (do not regress)

| # | Item | File:line | Why it's good |
| --- | --- | --- | --- |
| 1 | **Roman numeral spec index with sub-letters** | `LeftRail.tsx:121–153` | Reads like the spec index of a thick architectural binder. The 6-px italic Serif numeral column + sub-letter `a·b·c·d·e` indented children is the right mental model for "where am I in the legal arc." Confidence: high. |
| 2 | **The "AT THE TABLE" specialist tracker** | `LeftRail.tsx:184–247` | Last 6 distinct specialists by recency, with per-specialist turn count in italic Serif clay tabular numerals. Active specialist underlined with a 1-px drafting-blue rule. Confidence: high. |
| 3 | **Specialist sigils with thinking-only micro-animations** | `SpecialistSigils.tsx` (286 LOC) | Each of the 7 sigils has a domain-specific keyframe animation that ONLY runs while that specialist is thinking. Stamps lift, rulers sweep, ink drips, heads tilt. Reduced-motion fully respected. This is the most delightful thing in the workspace. Confidence: high. |
| 4 | **Match-cut on specialist handoff** | `MessageAssistant.tsx:90–119` | Hairline rule fades in over 320 ms, then SpecialistTag scales in over 240 ms with 320 ms delay. View Transitions API target on the very first assistant message so the wizard's transition-screen hairline morphs into this rule. Same specialist twice = no rule, no scale. Confidence: high. |
| 5 | **The 7-circle conversation map (VerlaufMap)** | `VerlaufMap.tsx` | Visited specialists filled clay; current ringed drafting-blue; not-yet hairline; tiny "Hier" label slides under the current node. Click a visited node = smooth-scroll to that specialist's first message. Confidence: high. |
| 6 | **PaperCard with German A1 title block + NorthArrow** | `PaperCard.tsx` + `TitleBlock.tsx` | Inset-paper-edge highlight as inner shadow. PROJEKT eyebrow → `INTENT · CITY` upper-line → hairline → italic clay address → hairline → `Erstellt: 12. April 2026` in mono. Reads exactly like a German A1 architectural sheet. NorthArrow draws itself in on first mount. Confidence: high. |
| 7 | **Atelier empty-state illustration** | `AtelierIllustration.tsx` (175 LOC) | Animated 1 cm scale line being drawn by a fountain pen on tracing paper, with a coffee cup steam curl. Six-second loop. Reduced-motion: pen at rest. The body copy "Das Atelier öffnet" + Instrument Serif italic body is genuinely beautiful. Confidence: high. |
| 8 | **Loud top-of-thread 7-segment progress bar** | `Progress/ChatProgressBar.tsx` | Drafting-blue fill within current segment (proportional via `fill: 0..1`); clay-filled completed; hairline upcoming. Connector hairlines between segments. Percent + turn count on the right in tabular figures. Sticky on desktop, compact mode for mobile, durable derivation from messages prop. Confidence: high. |
| 9 | **Auto-bolded German law citations** | `lib/highlightCitations.tsx` | Regex picks up `§ 34 BauGB`, `§§ 30, 35 BauGB`, `Art. 57 BayBO`, `Art. 6 Abs. 1 BayBO`, `Art. 44a BayBO` and replaces space with NBSP so a line break never lands between `§` and the number. Restraint over completeness — covers what the v1 system prompt cites. Confidence: high. |
| 10 | **Bereiche A/B/C plan-section diagram** | `BereichePlanSection.tsx` | SVG `<pattern>` defs for ACTIVE (drafting-blue 4 px diagonal) vs PENDING (clay 8 px diagonal) hatching, dashed VOID with strikethrough, paper-tinted notch with italic Serif letter on the left, italic Serif "Schnitt A·A" eyebrow. Celebration on flip-to-ACTIVE: hand-drawn checkmark draws via stroke-dashoffset, ripple expands, brightness pulses. Confidence: high. |
| 11 | **Top-3 cards with drafting-blue spine + italic Serif drop-cap number** | `Top3.tsx` | The drop-cap doubles as the visible position indicator (1/2/3) — explicitly NOT the model's `rank` field, which can drift between turns. AnimatePresence + `layout="position"` for graceful reorders. Footer is OUTSIDE the card border with a hairline rule and italic Serif margin annotation. Magazine register, not chip-y. Confidence: high. |
| 12 | **Eckdaten qualifier badges in italic small caps** | `EckdatenPanel.tsx:110–112` | `CLIENT · DECIDED` / `LEGAL · CALCULATED` rendered as Inter 9 italic uppercase clay/60 with `tracking-[0.14em]` and tabular numerals. Badge is text, not a chip. Confidence: high. |
| 13 | **Octagonal stamp on completion interstitial** | `CompletionInterstitial.tsx:113–163` | 56×56 octagon, rotated -8°, italic Serif Roman numeral inside, double-rule printer's outline, paper-tinted fill, drafting-blue stroke at 70%. Body has a 3.4em italic Serif drop-cap. Action labels uppercase tracked with chevron prefix + on-hover hairline expansion. Reads as official correspondence, not a chat card. Confidence: high. |
| 14 | **AutoSavedIndicator** | `AutoSavedIndicator.tsx` | Italic Serif 11 clay/72 "Automatisch gespeichert · vor 12 Sek." that re-renders every 5 s. Calms long-form anxiety. Confidence: medium (see the gap in Section 11 about it not showing on first paint after refresh). |
| 15 | **System "Sie waren zuletzt am …" recovery row** | `ChatWorkspacePage.tsx:73–122` | Client-side synthesised, never persisted, in the calm `MessageSystem` register. Triggers only when stale > 1 hour. Confidence: high. |
| 16 | **Cost ticker styled as M 1:1 scale-bar flourish** | `CostTicker.tsx` | Token + USD totals in italic Serif clay, anchored to a horizontal bar with five tick marks (matching the M 1:100 at the head of the rail). Hover surfaces per-channel breakdown popover. Admin-only via email allowlist. Confidence: high. |
| 17 | **JumpToLatestFab in the input footer zone** | `JumpToLatestFab.tsx` | Phase 4.1.6 moved this from `position: fixed` outside the column into `absolute -top-12 right-0` inside `EmbeddedShell` — sits within the same ~120 px footer zone as Continue chip + send button. Owns its own scroll-distance detection. Confidence: high. |
| 18 | **Continue chip is a chip, not a floating button** | `SuggestionChips.tsx → ContinueRow` | Renders inside the same chip row as yesno/select/multi/address chips — same render path. Phase 4.1.11 explicitly reverted an earlier regression to absolute positioning. Confidence: high. |
| 19 | **The streaming bubble swap is visually seamless** | `StreamingAssistantBubble.tsx` mirrors `MessageAssistant.tsx` shape exactly. | Same marginalia rule, same SpecialistTag, same body typography. Streaming cursor blink ends exactly when the persisted message replaces it. Confidence: high. |
| 20 | **The fountain-pen + inkwell signature line in the LeftRail footer** | `LeftRail.tsx:251–307` | 80×40 inline SVG. Trailing ink line has an 8 s opacity shimmer (`pmSignatureShimmer`) so the rail's "signature line" feels alive even when the workspace is still. Reduced-motion: static. Confidence: high. |
| 21 | **The intent axonometric drawings (6 of them)** | `IntentAxonometric.tsx` (298 LOC) | Hand-drawn-feeling axonometric for each of the 6 wizard intents: Einfamilien (gable + chimney), Mehrfamilien (3 floors of 4 windows), Sanierung (scaffold over the house), Umnutzung (split + swap-arrow), Abbruch (dashed ghost + brick pile), Sonstiges (dashed wireframe + serif `?`). Restraint over realism. Confidence: high. |
| 22 | **Dual-progress restraint** | `ProgressMeter` (left rail) is at `opacity-70` per `LeftRail.tsx:65`. | Phase 3.6 #69 made the top-of-thread bar dominant; the left-rail meter stays mounted but visually demoted. Q8 was locked to "keep, demote." Right call. Confidence: high. |

---

## Section 11 — Things underbaked / inconsistent / missing

Honest list. Each item carries a confidence level; "fix" notes are intentionally vague (the actual fixes belong in Stage B).

### High-impact

1. **The spec-index gates are mostly hard-coded, not derived from state** — Confidence: **high**.
   - `LeftRail.tsx:101–114`. 8 of the 12 gates use `derive: () => 'PENDING'` or `() => 'ACTIVE'`. Only gate III (plot), V.a, V.b, V.c (areas) react to project state. Gates I, II, IV, V, V.d, V.e, VI, VII never change colour.
   - User reads the rail and sees a static binder index — never the sense of progression that the design intent suggests.

2. **Two competing Roman-numeral systems in the same column** — Confidence: high.
   - LeftRail uses I–VII for `Übersicht / Projekt / Grundstück / Beteiligte / Baurechtliche Einordnung / Planung / Dokumente`.
   - VerlaufMap (in the same rail, four lines down) uses I–VII for the 7 specialists (`Moderator / Planungsrecht / …`).
   - Two mental models for "what these Roman numerals mean" living 30 px apart.

3. **No realtime / cross-tab sync** — Confidence: high.
   - `useProject` and `useMessages` use `staleTime: 60_000` and `refetchOnWindowFocus: false`. If the user has the workspace open in two tabs, sending a turn in tab A doesn't update tab B until either a manual refresh or the next chat-turn in tab B. Silent inconsistency.

4. **CostTicker is admin-only AND visible only to one user** — Confidence: high.
   - Gated by `isAdminEmail(user?.email)` from `@/lib/cn-feature-flags`. The token spend and USD readout are not part of the regular user surface. Fine if intentional, but the right-rail design comment (`RightRail.tsx:29`) describes "Cost ticker as scale-bar flourish" — implying it's part of the canonical layout. The current code shows zero rail flourish at the bottom for non-admin users, then jumps straight to FactTicker. Worth deciding.

5. **`MessageUser` always renders `content_de`** — Confidence: medium.
   - `MessageUser.tsx:57`. Even when the active locale is English, the user's message body shows the German source. This works today because the SPA only sends German via `buildUserMessageText` (no English form for user messages), but if the user types English freely, the bubble will still display the German text — wait, the user typed English so the German never exists. Actually it will display whatever they typed (the literal text from their submit), so this is fine in practice. But the design clearly anticipated an English mirror (`content_en` is on the row shape). Worth confirming intent.

6. **The "schedule" panels default closed** — Confidence: high.
   - `ScheduleSection.tsx:35`, `defaultOpen = false`. Procedures, Documents, Roles all start collapsed. After a few turns, the right rail visibly thins out (only Top-3 + Eckdaten + Bereiche remain) even when state is rich. The user has to know to click the chevron. Loss of perceived information density.

### Medium-impact

7. **`failedRequestIds` is on chatStore but no UI consumes it** — Confidence: high.
   - `chatStore.ts:35` declares `failedRequestIds: Set<string>`; `useChatTurn` populates and clears it. `MessageUser` does NOT render an "Erneut senden" affordance. The original Phase 3 design (per `useChatTurn.ts:31` comment) anticipated this. Currently when a turn fails, the user sees `ErrorBanner` but no per-message retry button.

8. **MobileRailDrawer is mounted twice on mobile** — Confidence: high.
   - `ChatWorkspacePage.tsx:345–360` mounts left and right `MobileRailDrawer` unconditionally. Then `MobileChatWorkspace` (selected when `isMobile`) ALSO mounts its own pair of `Drawer.Root` instances for left/right (`MobileChatWorkspace.tsx:133–193`). Both subtrees consume the same `leftOpen` / `rightOpen` state. The `MobileRailDrawer` instances render but never visibly open because the inner drawers (in `MobileChatWorkspace`) win the open animation. Effectively dead DOM on mobile.

9. **Three separate progress surfaces** — Confidence: high.
   - `ChatProgressBar` at top of thread (loud, segmented).
   - `ProgressMeter` in left rail (16-cell bar, demoted via `opacity-70`).
   - `ChatProgressBarMobile` (compact wrapper) inside MobileTopBar AND inside the mobile vaul progress drawer.
   - The signal is the same in all three. Redundant.

10. **Top-3 has no rank stickiness** — Confidence: medium.
    - `Top3.tsx:30` sorts and slices each turn. If the model jiggles ranks 1↔2↔3 mid-conversation, the cards reorder via `layout="position"` — looks elegant once, distracting if it happens often. No client-side smoothing or settle-time gate.

11. **`thinkingLabelToSection` is a German-keyword regex** — Confidence: medium.
    - `lib/thinkingLabelToSection.ts`. If the model produces a thinking label in English (locale=en mode, even though `thinking_label_de` is the field), the keyword match fails and falls through to `top3` — the ambient pulse appears in the wrong rail section.

12. **Streaming text extraction depends on `TextFieldExtractor` correctness** — Confidence: medium (haven't read that file in this audit).
    - `chatApi.ts:393` keys it on `message_de` or `message_en`. If the model emits the message in a slightly different JSON path or if the streamer misses a quote-escape, the bubble will render partial / no text and rely on the safety guard fallback.

13. **`ProgressMeter` and `ChatProgressBar` derive from different sources** — Confidence: high.
    - `ProgressMeter` reads `chatStore.turnCount` + `currentSpecialist` only. `ChatProgressBar` was patched in Phase 2.5 to derive durably from the `messages` prop with `Math.max(turnCountFromStore, assistants.length)`. So after a project remount, the loud bar reads the correct progress while the demoted left-rail meter still says ~5%.

14. **`useAutoScroll` imports Smooth scroll on every dep change** — Confidence: medium.
    - When `messages.length` updates AND `isThinking` toggles, it can fire two `requestAnimationFrame → window.scrollTo({ behavior: 'smooth' })` calls back-to-back. The double-smooth-scroll can feel laggy on long pages. Browsers usually merge these but it's not guaranteed.

15. **No skeleton states anywhere in `src/features/chat/`** — Confidence: high.
    - First paint: project + messages cache from wizard; no spinner. If the cache is cold (deep-link to a project, no wizard pre-seed), `ChatWorkspacePage` returns `null` until `project` arrives — a blank page for ~100–400 ms.

16. **The CompletionInterstitial mounts even when completionSignal is `null`** — Confidence: high (but inert).
    - `Thread.tsx:94–98` mounts `<CompletionInterstitial>` whenever `!isThinking && !isStreaming && projectId`. The component itself early-returns null when `signal === null || signal === 'continue'` (`CompletionInterstitial.tsx:41`), so it's an idle component most of the time — wasted React reconciliation.

17. **`handleNavigate` in VerlaufMap targets `[data-message-id="${target.id}"]`** — Confidence: medium.
    - The data attribute is set on the `<article>` in `MessageAssistant.tsx:73`, but the recovery + sonstige synthetic system messages don't carry it (they're rendered by `MessageSystem`). The first-message-of-a-specialist lookup is fine in practice, but VerlaufMap targets only assistant messages, so this is consistent. No bug — flag for context.

18. **Streaming bubble lives at the END of the messages list** — Confidence: high.
    - `Thread.tsx:84` mounts it as `<li>` after the message map. If `messages.length === 0` (first turn priming) and a stream is in flight, the EmptyState would still be the body; but `ChatWorkspacePage.tsx:283` only mounts Thread when `hasMessages` is true. So the first-turn priming never actually streams in — it shows the EmptyState until persistence completes. Confirm intent.

### Low-impact / cosmetic

19. **`OfflineBanner` uses `aria-modal`-less `<m.div>`, role="status"** — Confidence: medium.
    - Accessibility: Status role is correct for "calmly inform". OK.

20. **`ConversationCursor` only renders at `xl` breakpoint** — Confidence: low.
    - `ConversationCursor.tsx:40`. So the "ruler tracking the conversation" affordance is invisible at lg. Probably intentional (left rail occupies left space at lg) — flagged for confirmation.

21. **`ExportMenu`'s "primary" variant exists but no caller uses it in the chat workspace scope** — Confidence: medium.
    - `ExportMenu.tsx:43,270–282`. `'primary'` variant is referenced as "Overview-modal header CTA" in the comment; only `'ghost'` is used in `FooterLeftColumn`. Possibly used elsewhere; flag as unused-from-this-scope.

22. **Hard-coded colour `bg-[hsl(38_30%_94%)]` on user message bubble** — Confidence: medium.
    - `MessageUser.tsx:50`. Other surfaces use design tokens (`bg-paper`, `bg-paper-tinted`). This bubble bg is an inline arbitrary HSL — drifts if the paper tone changes.

23. **`AttachmentPicker` mobile branch is dead** — Confidence: high.
    - `AttachmentPicker.tsx:91`. The mobile branch returns `<MobileAttachmentSheet>`. The drawer at the bottom of `AttachmentPicker.tsx:202–232` is rendered only in `<div class="md:hidden">` — but the early-return at line 91 catches mobile first. So the bottom drawer is unreachable code. (This is the picker's `<div class="md:hidden"> Drawer.Root` block — never visible.)

24. **`MobileTopBar` is mounted in the desktop branch even when never visible** — Confidence: medium.
    - `ChatWorkspacePage.tsx:295–303` always mounts MobileTopBar in the desktop branch. Its outer wrapper is `lg:hidden sticky top-0`, so on mobile (`< 640`) and tablet (`640–1023`) it shows. But on mobile the MobileChatWorkspace already mounts its own MobileTopHeader. On mobile the desktop branch isn't selected, so this is fine — but on tablet (`640–1023`), MobileChatWorkspace is NOT selected (because `useViewport().isMobile` is `< 640`) and MobileTopBar IS visible. Two different mobile-header components for two phone-vs-tablet breakpoint zones. Flag for design alignment.

25. **The `chat.preliminaryFooter` margin annotation is the same string for every Top-3 card** — Confidence: low.
    - `Top3.tsx:92`. Each card gets the same italic Serif footer. Reads as boilerplate after the first card.

26. **`Recommendation.estimated_effort` and `responsible_party` are in the type but not surfaced in Top3** — Confidence: high.
    - `projectState.ts:124–148` defines `estimated_effort: '1d'|'1-3d'|'1w'|'2-4w'|'months'` and `responsible_party: 'bauherr'|'architekt'|'fachplaner'|'bauamt'`. `Top3.tsx` renders title + detail only. Two of the most actionable fields the model emits are wasted on the rail.

27. **`Recommendation.qualifier?.source/quality` is in the type but not displayed in Top3** — Confidence: high.
    - Same file. Comment says "qualifier feeds the confidence radial in Section IX." That radial is on the OverviewPage, not the right rail.

28. **No "edit my last reply" affordance** — Confidence: medium.
    - Once submitted, the user message is permanent. No edit, no undo. Long-press → context sheet on mobile only does Copy.

29. **`MessageContextSheet` is mobile-only** — Confidence: medium.
    - Desktop has no equivalent for "copy message text". Right-click is browser default.

30. **The chat.specialists.synthesizer label is "Synthese" in DE, but the role label is "Querschnitt"** — Confidence: low.
    - `de.json:1095` has `synthesizer: "Synthese"`; `SpecialistTag.tsx:73` maps `synthesizer → "Querschnitt"` for the role-running-head. Two German names for the same persona. Probably intentional (top-line is short label, sub-line is what the persona actually does) but worth surfacing.

31. **Banners absolutely position themselves above the workspace, but the `<aside class="hidden lg:flex">` rails extend `min-h-dvh`** — Confidence: low.
    - When OfflineBanner mounts, the body content shifts down ~40 px under it; the rails (which extend min-h-dvh) extend BELOW the viewport bottom by the banner's height. Causes a small scroll-trigger. Minor.

32. **No empty-state for "messages exist but project state is `{}`"** — Confidence: low.
    - `ChatWorkspacePage.tsx:50` reads `useProject` and renders nothing while loading. Once loaded, `RightRail` reads `(project.state ?? {}) as Partial<ProjectState>` and passes empty arrays. Rail panels handle their own empty copy. Total experience: a chat with no facts/recs has very thin rails. Not bad — just flagged.

---

## Appendix A — Commands run

Ordered list of shell commands used to build this audit.

```sh
# 1. Repo orientation
ls -la
find src -type d | head -80
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs wc -l | tail -20

# 2. Chat-feature inventory
find src/features/chat -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs wc -l | sort -rn | head -50
find src/features/chat -type f | sort
find src/features/chat -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + | sort -n | tail -10

# 3. Routing discovery
find src/app -type f
cat src/app/router.tsx | head -100
cat src/app/Routes.tsx
cat src/App.tsx | head -100

# 4. Type discovery
find src/types -type f | xargs ls -la

# 5. Locale spot-checks
grep -n "\"chat\"\|gates\":\|specialists\":\|areas\":" src/locales/de.json | head -30

# 6. Edge function discovery
ls supabase/functions/
find supabase -type f -name "*.ts" | head -30

# (then ~40 file reads via the Read tool — see git diff for exact paths)
```

All other exploration was done via the `Read` tool (one file at a time, no shell). No file was modified, no commit was created, nothing was staged.

---

## Appendix B — Open questions

Things this audit could not resolve from code alone — would need human clarification or a Stage B design call.

1. **Should `LeftRail.SpecIndex` derive its 12 gates from project state, or is the static "PENDING" the intent?** Currently 8 of 12 are static. The rail reads as a fixed binder index; the design intent (from comments) suggests it should react to live state.
2. **Should the two Roman-numeral systems (SpecIndex I–VII vs VerlaufMap I–VII) be unified, or is the duplication intentional?** They overlap visually in the same rail.
3. **Should `CostTicker` be visible to all users, or stay admin-only?** The right-rail design comments anticipate it as part of the canonical layout.
4. **Should there be a per-message "Erneut senden" affordance?** `failedRequestIds` is plumbed but no UI consumes it.
5. **Should the schedule panels (Procedures / Documents / Roles) default to OPEN in the chat workspace?** Current default-closed state hides progress.
6. **Should `Recommendation.estimated_effort` / `responsible_party` / `qualifier` surface in the Top-3 cards?** They're emitted by the model but only shown in the OverviewPage cockpit.
7. **Is the dead `MobileRailDrawer` mount on mobile (Section 11 #8) intentional belt-and-braces, or an oversight from the Phase 3.8 mobile rebuild?**
8. **What's the rule for when `MobileTopBar` (Phase 3.2) vs `MobileTopHeader` (Phase 3.8 collapsing) shows?** Currently the former runs at tablet (640–1023), the latter at mobile (<640). Two different components for adjacent breakpoint zones.
9. **Is `MessageUser`'s exclusive use of `content_de` (`MessageUser.tsx:57`) deliberate?** The DB schema has `content_en: string | null` on the row — was an EN mirror ever planned for user messages?
10. **What is the redesign brief targeting?** Knowing that would let Stage B ask more focused follow-ups (e.g. "are we keeping the seven-specialist model?").
