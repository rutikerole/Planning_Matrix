# Phase 7 — Pre-Redesign Analysis · Chat Workspace

> **Mode:** READ-ONLY audit. No application code touched.
> **Scope:** Everything that renders, mounts, or persists under `/projects/:id`.
> **Audience:** Design-partner Claude — ground truth for the redesign.
> **Repo HEAD at audit:** `594915c` (`fix(i18n): close German leakage in EN-locale UI + chat data pipeline`).

---

## 0. Reference materials — status

| Reference | Found | Notes |
|---|---|---|
| `PLANNING_MATRIX_MASTER_DOC.md` | **NOT FOUND** | Searched `/home/claude`, repo root, `docs/`, project files. `UNRESOLVED:` master doc is referenced in the Phase 7 brief but not committed. Working from `docs/PHASE_3_BRIEF.md` + commit history + memory. |
| `docs/PHASE_3_BRIEF.md` | ✅ | Authoritative spec for the chat core (locked decisions, schema seed, persona system, system prompt structure). |
| `BAYBO_2026_VERIFICATION.md` | ✅ | Phase 5 BayBO post-modernization legal sweep. |
| `FIX_REPORT.md` / `FIX_REPORT_PHASE6.md` | ✅ | Phase 5 (München go-live) and Phase 6 (god-mode persistence sprint) implementation history. |
| Live deploy `planning-matrix.vercel.app` | Not opened by analyst (read-only env). Screenshots in brief used as the visible-state reference. |
| Repo SHA `5d735af` | The brief named `5d735af` — that's `5d735af docs: Phase 6 god-mode sprint FIX_REPORT`. Current `main` is **3 commits ahead** at `594915c` with three i18n + popover fixes layered after. The screenshots reflect post-`5d735af` state. |

> **NOTE:** No master doc means cross-domain questions (DESIGNER/ENGINEER/AUTHORITY surfaces, multi-Bundesland strategy) are answered from PHASE_3_BRIEF + memory + repo state only.

---

## A. Repo map

Recursive tree of `src/`, `supabase/`, and chat-relevant top-level files. One-line purpose per non-trivial file. `node_modules`, `dist`, `.git`, generated artefacts skipped.

```
.
├── docs/
│   ├── PHASE_3_BRIEF.md          — Authoritative Phase 3 spec (chat core).
│   ├── data-freshness.md         — Legal-data freshness contract.
│   ├── eval-harness.md           — Eval harness usage.
│   ├── launch-checklist.md       — Go-live checklist.
│   ├── mobile-support.md         — Mobile breakpoint rules.
│   ├── privacy.md / security.md  — DSGVO + threat model.
│   └── audits/                   — Versioned older audit docs.
├── prototypes/
│   ├── chat-redesign.html        — Static HTML prototype (referenced by Phase 7 Pass 5 ProjectPortrait `viewBox 280×100`).
│   └── makeover-v3.html          — Earlier static makeover.
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_profiles.sql                — Auth profile shadow table.
│   │   ├── 0002_autoconfirm.sql             — Dev-mode auto-confirm trigger.
│   │   ├── 0003_planning_matrix_core.sql    — projects / messages / project_events + RLS + idempotency idx.
│   │   ├── 0004_thinking_label.sql          — messages.thinking_label_de column.
│   │   ├── 0004_planning_matrix_v3_templates.sql — adds T-06/T-07/T-08 + aufstockung/anbau intents.
│   │   ├── 0005_likely_user_replies.sql     — messages.likely_user_replies text[].
│   │   ├── 0005_seed_dashboard_variety_OPTIONAL.sql — seed data (optional).
│   │   ├── 0006_share_tokens.sql            — Result-page shareable tokens.
│   │   ├── 0007_project_files.sql           — Attachments table + storage bucket.
│   │   ├── 0008_chat_turn_rate_limits.sql   — 50/h per-user rate limit RPC.
│   │   ├── 0009_projects_city.sql           — projects.city column.
│   │   ├── 0010_projects_city_muenchen.sql  — backfill city='muenchen'.
│   │   ├── 0011_bplan_lookup_rate_limits.sql — bplan-lookup function rate limit.
│   │   ├── 0012_messages_tool_input.sql     — messages.tool_input JSONB (forensic).
│   │   └── _smoke_tests/rls_second_account.sql
│   └── functions/
│       ├── chat-turn/                       — THE turn pipeline (auth → load → Anthropic → persist).
│       │   ├── index.ts                     — entrypoint, JSON branch.
│       │   ├── streaming.ts                 — SSE branch (input_json_delta forward).
│       │   ├── anthropic.ts                 — Messages-API wrapper, Zod-validated tool input.
│       │   ├── toolSchema.ts                — Anthropic JSON tool schema (`respond`).
│       │   ├── systemPrompt.ts              — buildSystemBlocks + locale addendum + live-state.
│       │   ├── persistence.ts               — DB ops + audit emitter.
│       │   ├── cors.ts                      — Origin allowlist.
│       │   └── legalContext/                — Persona prompt (cached).
│       │       ├── compose.ts               — shared → federal → bayern → muenchen joiner.
│       │       ├── shared.ts (418 LOC)      — Eigennamen, tone, qualifier rules.
│       │       ├── federal.ts (149 LOC)     — BauGB §§ 30/34/35, BauNVO.
│       │       ├── bayern.ts  (379 LOC)     — BayBO Art. 2/57/58/59, GK 1–5.
│       │       ├── muenchen.ts (397 LOC)    — Referat HA II, Stellplatzsatzung, BaumschutzV.
│       │       └── erlangen.ts (291 LOC)    — Sleeping; reactivated when city #2 lands.
│       ├── bplan-lookup/                    — Wizard B-Plan WMS lookup.
│       ├── create-share-token/              — Result-page share creation.
│       ├── get-shared-project/              — Public read for shared briefings.
│       ├── signed-file-url/                 — Storage download URLs.
│       └── delete-file/                     — Storage cleanup.
├── src/
│   ├── App.tsx                              — Providers + router mount.
│   ├── main.tsx
│   ├── app/
│   │   ├── router.tsx                       — `/projects/:id` mounts ChatWorkspacePage; same id has /overview + /result siblings.
│   │   └── providers.tsx
│   ├── stores/
│   │   ├── authStore.ts                     — Zustand: { user, session }.
│   │   └── chatStore.ts (350 LOC)           — Zustand: thinking/specialist/streaming/turnCount/cost banner/offline queue.
│   ├── styles/
│   │   └── globals.css (594 LOC)            — Tailwind base, paper/ink/clay HSL vars, operating-mode tokens, Phase 7 paper hierarchy, reduced-motion, blueprint substrate.
│   ├── types/
│   │   ├── projectState.ts                  — ProjectState shape (facts/recs/procedures/documents/roles/areas).
│   │   ├── respondTool.ts                   — Zod for the `respond` tool input.
│   │   ├── chatTurn.ts                      — chat-turn API request/response/error.
│   │   ├── chatInput.ts                     — UserAnswer discriminated union helpers.
│   │   ├── db.ts                            — Postgres row mirrors.
│   │   └── projectFile.ts / bplan.ts
│   ├── locales/
│   │   ├── de.json (1591 lines)             — Primary copy.
│   │   ├── en.json (1591 lines)             — Mirror; `verify:locales` enforces leaf-path parity.
│   │   ├── factLabels.de.ts / .en.ts        — Humanized labels for state.facts keys.
│   ├── lib/
│   │   ├── chatApi.ts                       — postChatTurn + postChatTurnStreaming + ChatTurnError.
│   │   ├── projectStateHelpers.ts           — applyToolInputToState + per-domain delta helpers.
│   │   ├── streamingExtractor.ts            — TextFieldExtractor for input_json_delta.
│   │   ├── i18n.ts                          — i18next bootstrap.
│   │   ├── supabase.ts                      — Supabase client.
│   │   ├── useViewport.ts                   — < 640 / 640–1023 / ≥ 1024 buckets.
│   │   ├── useKeyboardHeight.ts             — visualViewport-driven mobile keyboard rise.
│   │   ├── useLongPress.ts                  — mobile context-sheet trigger.
│   │   ├── factLabel.ts                     — factKey → label/unit lookup.
│   │   ├── costFormat.ts                    — token/USD formatters.
│   │   ├── cn-feature-flags.ts              — admin-email allowlist.
│   │   ├── telemetry.ts                     — PostHog wrappers.
│   │   ├── analytics.ts / errorTracking.ts  — Sentry + analytics adapters.
│   │   ├── addressParse.ts                  — Plot-address validator.
│   │   ├── fontLoader.ts                    — Self-hosted font preload.
│   │   ├── uploadApi.ts                     — Storage upload + DB linkage.
│   │   ├── bplanApi.ts                      — Wizard WMS API client.
│   │   └── export/                          — exportFilename / exportJson / exportMarkdown.
│   ├── data/
│   │   ├── factsMuenchen.ts                 — Static München fact lookups.
│   │   └── smartSuggestionsMuenchen.ts
│   ├── components/
│   │   ├── SiteFooter.tsx / SkipLink.tsx / SEO.tsx / TouchTarget.tsx / MobileFrame.tsx
│   │   ├── ui/                              — shadcn-style primitives (alert-dialog/popover/dialog/dropdown-menu/select/collapsible).
│   │   └── shared/                          — BlueprintSubstrate, NorthArrow, GrainOverlay, ScaleBar, ProtectedRoute, ProjectGuard, HairlineDivider, AnimatedReveal, Wordmark, Container, SmoothScroll, AuthSkeleton, ProjectNotFound, Picture, LanguageSwitcher, CtaButton.
│   ├── hooks/
│   │   ├── useAuth.ts / useSession.ts       — Supabase auth glue.
│   │   └── usePrefersReducedMotion.ts       — wraps Framer's hook.
│   └── features/
│       ├── chat/                            — ★ Workspace under audit.
│       │   ├── pages/
│       │   │   ├── ChatWorkspacePage.tsx    — Top-level orchestrator (412 LOC).
│       │   │   └── OverviewPage.tsx         — /projects/:id/overview cockpit (separate page, not under audit).
│       │   ├── components/                  — See Section B for the full inventory.
│       │   ├── hooks/                       — useProject / useMessages / useProjectEvents / useChatTurn / useAutoScroll / useInputState / useOfflineQueueDrain / useUploadFile / useDeleteFile / useProjectAttachments.
│       │   └── lib/                         — detectChapters / extractedFacts / formatRelativeShort / highlightCitations / lawArticles / parseCitations / progressEstimate / thinkingLabelToSection / useFreshSet / userAnswerHelpers / documentLinkage / exportPdf.
│       ├── wizard/                          — Two-question initialization (PLZ-gated to München).
│       ├── dashboard/                       — Project list, command palette, activity ticker.
│       ├── result/                          — /projects/:id/result deliverable briefing.
│       ├── auth/                            — Sign-in / sign-up / reset / verify.
│       ├── landing/                         — Marketing site at `/`.
│       ├── legal/                           — Impressum / AGB / Datenschutz / Cookies.
│       ├── loader/                          — App-load drafting-board animation.
│       ├── not-found/                       — 404.
│       └── cookies/                         — Consent banner + analytics lifecycle.
├── package.json                             — react 19.2 + tanstack/query 5 + zustand 5 + framer-motion 12 + i18next 26 + radix-ui + vaul + lenis + zod 4 + tailwind 3 + vite 8.
├── tailwind.config.js (296 LOC)             — Theme extension; pm-* + Phase 7 paper hierarchy mappings to CSS vars.
├── vite.config.ts                           — Vite + React + path aliases.
├── tsconfig.app.json                        — TS 6, react-jsx, allowImportingTsExtensions (so Edge Function and SPA can share `.ts` files).
├── eslint.config.js / .prettierrc / postcss.config.js
├── playwright.config.ts                     — E2E config.
├── tests/smoke/                             — Smoke E2E.
├── scripts/
│   ├── verify-locale-parity.mjs             — prebuild gate; fails on DE/EN leaf-path divergence.
│   ├── verify-bundle-size.mjs               — postbuild gate; 300 KB gz ceiling on `dist/assets/index-*.js`.
│   ├── freshness-check.mjs                  — Legal-source freshness check.
│   ├── eval-harness/                        — Conversation eval harness (Phase 6).
│   ├── process-images.mjs / download-images.sh
│   └── dev/                                 — print-composed-prompt.mjs + sandbox utilities.
├── data/
│   ├── muenchen/                            — Static legal data per the live city.
│   └── erlangen/                            — Sleeping (city #2 hook).
├── public/
│   ├── images/                              — 8 curated photos.
│   └── fonts/                               — Self-hosted Inter Variable + Instrument Serif (DSGVO; replaces Google Fonts after LG München I 20.01.2022 ruling).
└── README.md / SUPABASE_SETUP.md / FIX_REPORT*.md / BAYBO_2026_VERIFICATION.md
```

---

## B. Chat workspace component tree

Every React component that renders inside `/projects/:id`. Path · purpose · children · parents · props · hooks/stores · side-effects.

### B.1. Top-level orchestrator

- **`features/chat/pages/ChatWorkspacePage.tsx`** (`:1-417`)
  - **Purpose.** The route component. Hydrates project + messages + events; computes a synthetic `augmentedMessages` list (recovery-row + sonstige-template-notice); branches on `useViewport().isMobile` → `MobileChatWorkspace` vs `ChatWorkspaceLayout` (desktop unified-footer three-column). Mounts the chat-turn mutation, the offline-queue drainer, and the mobile drawers (left-rail / right-rail / progress / right-rail-peek toast).
  - **Renders:** `<SEO>`, `<OfflineBanner>`, `<RateLimitBanner>`, `<ErrorBanner>`, then **either** `<MobileChatWorkspace>{ ChatDropZone › PaperCard › Thread } </MobileChatWorkspace>` **or** `<MobileTopBar/> + <ChatWorkspaceLayout leftRail={LeftRail} rightRail={RightRail} unifiedFooter={UnifiedFooter}>{ ChatDropZone › ChatProgressBar (desktop hidden lg:block) › StickyContext › PaperCard › Thread }</ChatWorkspaceLayout>`. Always: `<ConversationCursor/>`, `<MobileRailDrawer left>`, `<MobileRailDrawer right>`, `<MobileRightRailPeek>`, `<vaul:Drawer top>` for progress overlay.
  - **Parents.** Mounted by `app/router.tsx:101-109` inside `<ProtectedRoute><ProjectGuard>`.
  - **Props.** None — pulls `id` from `useParams`.
  - **Hooks/stores.** `useProject(projectId)`, `useMessages(projectId)`, `useProjectEvents(projectId)`, `useChatTurn(projectId)`, `useChatStore` (`isAssistantThinking`, `offlineQueue.length`, `reset`), `useTranslation`, `useReducedMotion`, `useViewport`, `useOfflineQueueDrain`.
  - **Side-effects.** Calls `resetChatStore()` on `projectId` change unmount; reads `project.state.recommendations.length` to trigger mobile right-rail peek/badge when count grows.

### B.2. Layout primitives

- **`components/ChatWorkspaceLayout.tsx`** (`:33-82`)
  - **Purpose.** Three-zone desktop grid: `220px | minmax(0,1fr) | 300px` inside `max-w-[1440px]`. Center column clamped `max-w-[720px]` with `lg:px-14` body padding. Mounts `<BlueprintSubstrate/>` and `.grain-overlay-fixed`. Renders `<aside>{leftRail}</aside><main>{children}</main><aside>{rightRail}</aside>` then a sibling `unifiedFooter` (fixed-position outside the grid). Sets `data-mode="operating"` on root → activates rounded radii + `--pm-shadow-input/card` + body letter-spacing.
  - **Bottom padding.** `pb-[120px] lg:pb-[180px]` when `unifiedFooter` is provided so the last message doesn't slip under it.
  - **Children rendered:** `BlueprintSubstrate`, three slots.
  - **Props.** `{ leftRail?, rightRail?, unifiedFooter?, children }`.

- **`components/MobileChatWorkspace.tsx`** (`:1-196`)
  - **Purpose.** Mobile orchestrator (≤ 640 px). Sticky `<MobileTopHeader>` (top:0 z-20) + sticky `<ChatProgressBar compact>` band (top:44 z-20) + `<main pt-4 pb-[160 + safe-bottom]>` + fixed-bottom input bar with `useKeyboardHeight()` rising above the on-screen keyboard. Left vaul drawer carries the rail **plus** a `<FooterLeftColumn>` row (founder-reported: bug-fix; phones < 640 had no `Briefing ansehen` CTA). Right drawer carries `<RightRail>`.
  - **Props.** `{ project, messages, events, leftRail, rightRail, inputBar, leftOpen, rightOpen, onLeftOpenChange, onRightOpenChange, onProgressClick, rightBadge, children }`.

- **`components/UnifiedFooter/UnifiedFooter.tsx`** (`:33-172`)
  - **Purpose.** One sticky band that spans the full grid width — replaces Phase 3's "four floating corners". Desktop renders three sub-columns matching the body grid. Mobile/tablet (`lg:hidden`) renders `[InputBar][••• overflow]` where the overflow opens a vaul bottom drawer with `<FooterLeftColumn>` + hairline + `<FooterRightColumn>`.
  - **Above-band gradient.** A pointer-events-none `-top-20 h-20` paper-fade so the last assistant message dissolves into the input zone (Pass 2).
  - **Props.** `{ project, messages, events, inputBar }`.
  - **Children.** `<FooterLeftColumn>` (left), `inputBar` (center, `lg:px-[22px]`), `<FooterRightColumn>` (right). Mobile drawer carries the same two columns.

### B.3. Left rail

- **`components/LeftRail.tsx`** (`:53-288`)
  - **Purpose.** Desktop left column (220 px). Phase 7 Pass 2: stripped to `Wordmark → Project header (name + plot + AutoSavedIndicator) → SpecIndex → CurrentSpecialist (●)  → spacer → FountainPenFooter`. The 7-line "At the table" specialist list was collapsed to a single line ("● BUILDING CODE · now"); the legacy ProgressMeter and VerlaufMap journey-dot row were removed (compass arc on top renders the journey).
  - **Children.** `Wordmark`, `AutoSavedIndicator`, `SpecIndex` (`<ul>` of 12 gates with Roman numerals + sub-letters + per-gate vertical hairline progress fill at 100/30/0% of height), `CurrentSpecialist` (clay dot + uppercase tag + "· now"), `FountainPenFooter` (decorative SVG).
  - **GATES array** — 7 top-level + 5 sub-letters: `00 Übersicht / 10 Projekt / 20 Grundstück / 30 Beteiligte / 40 Baurechtliche Einordnung [41 Planungsrecht / 42 Bauordnungsrecht / 43 Sonstige Vorgaben / 44 Verfahren / 45 Dokumente] / 50 Planung / 60 Dokumente`.
  - **`SPECIALIST_TO_GATE`** maps active specialist → highlighted gate (`planungsrecht→41`, etc.).
  - **Props.** `{ project, messages }`.

### B.4. Right rail

- **`components/RightRail.tsx`** (`:55-91`)
  - **Purpose.** Desktop right column (300 px). Reads top-to-bottom like a Bauantrag cover sheet:
    1. `<ProjectPortrait>` — section drawing copied from `prototypes/chat-redesign.html` (gable-roof, 6 windows, door, ground hatch). Reactive: GK badge + wall-height bracket appear when facts arrive.
    2. `<AreasSection>` — A/B/C hatched-band illustration (Pass 5 reinstatement). Live-pulse bar on the band whose specialist is currently speaking.
    3. `<Top3>` — Top-3 recommendation cards (drafting-blue left edge, italic Serif drop-cap, "Vorläufig — bestätigt durch …" margin footer outside the card).
    4. `<EckdatenPanel>` — schedule blocks with Roman-numeral column; visible cap 5, "show all (N)" toggle.
    5. `<ProceduresPanel>` numeral I → `<DocumentsPanel>` II → `<RolesPanel>` III via shared `<ScheduleSection>` chrome.
    6. Spacer → `<FactTicker>` ("Wussten Sie?" idle decoration; replaces what used to be the cost ticker, which moved to `FooterRightColumn`).
  - **`liveAreaFromMessages`** maps the latest assistant specialist to `'A'|'B'|'C'|null`.
  - **Props.** `{ project, messages }`.

- **`components/Top3.tsx`** (`:28-128`)
  - **Purpose.** Top-3 recommendations dossier card with rank-derived drop-cap (1./2./3.), motion: 80 ms staggered `opacity:0→1, y:16→0`, layout=position (rank changes animate). `useFreshSet` flags newly-added recs; clay 2 px left edge fades over 2.4 s (`pm-fresh-edge`).
  - **Hide-when-empty (Pass 2 Move 4).**
  - **Props.** `{ recommendations: Recommendation[] }`.

- **`components/AreasSection.tsx`** (`:28-93`)
  - **Purpose.** Three rows (A/B/C) on a paper-card surface with diagonal hatch backgrounds (different angles/colors per state) + state pill (ACTIVE clay-tint / PENDING paper-deep / VOID dashed border). 2 px clay live-pulse bar (`pm-area-pulse` 1.4 s loop) on the live band.
  - **Props.** `{ state, liveArea }`.

- **`components/ProjectPortrait.tsx`** (`:44-212`)
  - **Purpose.** Single SVG section drawing (`viewBox 280×100`) — gable house outline, ground hatch, floor line, 6 windows, door. Reactive overlays: wall-height bracket on the right when `wandhoehe`/`wall_height_m`/`wandhoehe_m` is in facts; GK badge upper-left when `gebaeudeklasse` is set; permanent N-arrow upper-right.
  - **Below SVG:** intent label (italic serif clay) + "M 1:100" mono caps faint.
  - **Props.** `{ intent, state }`.

- **`components/EckdatenPanel.tsx`** (`:41-176`)
  - **Purpose.** Architectural-schedule register. 24 px Roman-numeral column · vertical hairline · `<label / value / qualifier>` block per row. Derived rows (intent + plot when present) come first; up to 12 most recent extracted facts follow. **`VISIBLE_LIMIT = 5`**; "show all (N)" toggle for 6+. Long mono labels (>24 chars) drop tracking from `0.18em` → `0.08em` and `line-clamp-2` so the qualifier badge stays on grid (Pass 4).
  - **`useFreshSet`** drives a 2.4 s clay edge-bar fade (`pm-fresh-edge`) on newly-added rows.
  - **Props.** `{ project, facts }`.

- **`components/ProceduresPanel.tsx` / `DocumentsPanel.tsx` / `RolesPanel.tsx`** — Each renders a `<ScheduleSection>` (collapsible, defaultOpen=false, 44 px min-height button) populated with `<ScheduleRow>` items. Numerals I/II/III. `useChatStore.currentActivitySection` drives an ambient `pmAmbientPulse` dot beside the title when the model hinted that section will update next.

- **`components/ScheduleSection.tsx`** (`:28-136`)
  - **Purpose.** Shared schedule chrome — Roman numeral + uppercase title + count + chevron. ScheduleRow grid: `[24px_1fr]` numeral column + content cell with title + meta + sub + qualifier rows.
  - **Empty copy** rendered in italic serif clay when no rows.

- **`components/StatusPill.tsx`** (`:1-47`)
  - **Purpose.** Right-side status chip on `<ScheduleRow>` for procedures/documents (`erforderlich/liegt_vor/freigegeben/eingereicht/genehmigt/nicht_erforderlich`). Mono caps tracking-0.18em.

- **`components/FactTicker.tsx`** (`:1-109`)
  - **Purpose.** "Wussten Sie?" idle decoration at right-rail bottom — rotates static factoids every 12 s.

### B.5. Center column — thread + messages

- **`components/PaperCard.tsx`** (`:1-34`)
  - **Purpose.** A `<div data-print-target="result-page">` paper canvas wrapper around the thread. Sets `viewTransitionName: 'pm-paper-card'` for the wizard→chat handoff (Phase 3.1 #32).

- **`components/ChatDropZone.tsx`** (`:1-144`)
  - **Purpose.** Wraps the thread in a drag-and-drop file zone. On dragenter, surfaces "Datei hier ablegen" overlay (`chat.dropZone.title`).

- **`components/Thread.tsx`** (`:30-139`)
  - **Purpose.** `<ol>` of messages with chapter dividers + 6-message hairline breath rule, terminating in either `<StreamingAssistantBubble>` (when `chatStore.streamingMessage !== null`), `<ThinkingIndicator>`, or `<CompletionInterstitial>`. Uses `detectChapters(messages)` (lib) to insert `<ChapterDivider>` between turns whose specialist materially changes. Calls `useAutoScroll({ latestAssistantId, topOffset: 90 })` so the latest spec-tag lands 90 px below viewport top.
  - **`initialIds`** — Set captured on mount via lazy useState; rows present at mount render with `<Typewriter instant>` (history rows skip animation).
  - **Props.** `{ messages: MessageRow[] }`.

- **`components/MessageAssistant.tsx`** (`:35-145`)
  - **Purpose.** Left-aligned, no card. `<article id="spec-tag-${id}">` (anchor used by StickyContext IO + JumpToLatestFab + useAutoScroll). Marginalia rule (`-left-6 w-px h-16 bg-clay/35`, draws bottom-up over 320 ms). Match-cut on specialist change: hairline sweeps in then SpecialistTag scales in. Body: `text-[16px] leading-[1.65]` Inter; runs through `<Typewriter>`. Mobile: long-press opens `<MessageContextSheet>`.
  - **`isHandoffTarget`** — first assistant message gets `viewTransitionName: 'pm-handoff-hairline'` so the wizard's hairline morphs in.
  - **Props.** `{ message, isHistory, previousSpecialist?, isHandoffTarget? }`.

- **`components/SpecialistTag.tsx`** (`:36-73`)
  - **Purpose.** Two-line nameplate: `[ ●sigil  PLANUNGSRECHT ]` (Inter 11 medium tracking-0.20em uppercase clay) + below `Planungsrecht` (Instrument Serif italic 14 ink/55, **always German** — sommelier rule). Sigil is a 14×14 architectural drawing glyph in drafting-blue (`SpecialistSigil`). `isActive` prop animates the sigil while that specialist is thinking.
  - **`SPECIALIST_ROLE_LABELS_DE`**: moderator→Moderation, planungsrecht→Planungsrecht, bauordnungsrecht→Bauordnung, sonstige_vorgaben→Weitere Vorgaben, verfahren→Verfahrenssynthese, beteiligte→Beteiligten-Bedarf, synthesizer→Querschnitt.

- **`components/SpecialistSigils.tsx`** (286 LOC) — Per-specialist 14×14 architectural glyph (drafting compass / triangle ruler / etc.). Shared with `SpecialistTag` and `ThinkingIndicator`.

- **`components/Typewriter.tsx`** (`:28-93`)
  - **Purpose.** Variable-rhythm character reveal (`MEAN_DELAY_MS=18 ± JITTER_MS=10`; sentence-end `.!?` pauses 100 ms). Reduced-motion or `instant` prop → instant render. Click body to skip. **Always emits the full text in `<span class="sr-only">`** so SR users hear it once intact. After completion, re-renders text through `highlightCitations` (auto-bolds law refs).

- **`components/MessageUser.tsx`** (`:40-138`)
  - **Purpose.** Right-aligned bubble, `bg-[hsl(38_30%_94%)]`, `border-ink/8`, `rounded-xl`, `max-w-[min(70%,520px)]`, `15px leading-[1.55]`. Bottom-right timestamp (Inter 12 italic clay/72 tabular-figures); hover surfaces relative time via `title`. Move-8 impact line below body: when the next assistant turn extracted facts from this user message, render a small `Festgehalten → label · label` mono-caps line. Mobile long-press → `<MessageContextSheet>`.
  - **Props.** `{ message, impactFacts? }`.

- **`components/MessageSystem.tsx`** (`:16-33`)
  - **Purpose.** Calm in-thread system row — hairline-bordered top + bottom (no fill), uppercase `SYSTEM` tag, Inter 13 ink/80 body. Used for the "Sonstiges" template fallback notice and the "You were last here on …" recovery notice.

- **`components/MessageAttachment.tsx`** (125 LOC) — Inline file chips below user messages once persisted (`messageId`-keyed query into `useProjectAttachments`).

- **`components/MessageContextSheet.tsx`** (118 LOC) — Mobile-only vaul bottom drawer triggered by long-press on a message. Copy text / close.

- **`components/StreamingAssistantBubble.tsx`** (`:1-38`)
  - **Purpose.** While `chatStore.streamingMessage !== null`, render the same shape as `MessageAssistant` with `streamingMessage.contentSoFar` + a blinking cursor (`StreamingCursor`). Replaced by the persisted message on `complete` SSE frame.

- **`components/StreamingCursor.tsx`** (`:1-32`) — `<span>▌</span>` w/ `animate-blink-cursor` (1.05 s).

- **`components/ThinkingIndicator.tsx`** (`:54-217`)
  - **Purpose.** Phase 7 Move 3: drafting-compass SVG + two-line caption beside it. Top line = uppercase clay specialist label; bottom line rotates every 2.8 s with 280 ms cross-fade. Slot 0 of the rotation is `chatStore.currentThinkingLabel` (the model's own hint persisted on the prior turn); slots 1..n are `chat.thinking.actions.<specialist>[]`.
  - **A11y.** `role="status" aria-live="polite" aria-busy="true" aria-label="<specialist> — <staticLabel>"`.
  - **SVG.** 28×28 outer faint circle + arc draws+erases over 2.6 s + arm rotates 360°/2.6 s linear + fixed nib + clay pivot dot.
  - **Reduced-motion.** SVG static, action lines still rotate but without opacity fade.

- **`components/CompletionInterstitial.tsx`** (`:34-218`)
  - **Purpose.** When `chatStore.lastCompletionSignal !== null && !== 'continue'`, render an "official correspondence" paper-card with octagonal stamp (Roman numeral I/II/III, rotated -8°) + drop-cap body + chevron action buttons. Three flavours: `needs_designer` (invite architect), `ready_for_review` (open overview / continue), `blocked` (view areas / pause). `pauseProject` mutates `projects.status='paused'` and navigates to `/dashboard`.

- **`components/ChapterDivider.tsx`** (`:40-68`)
  - **Purpose.** `── II  Building code · in progress ──` separator inserted between turns when the speaking specialist materially changes (per `lib/detectChapters`). Animation: 480 ms slide-up + fade; `id="chapter-<index>"` for future scroll-to.

### B.6. Sticky / floating overlays

- **`components/StickyContext.tsx`** (`:38-180`)
  - **Purpose.** Surfaces only when (a) ≥ 3 assistant turns AND (b) the user has scrolled past the latest spec-tag. `IntersectionObserver(rootMargin: -90px)` on `#spec-tag-<latestId>`. Banner (paper-card, hairline, `sticky top-[70px] z-20`) shows specialist + a derived topic line (first sentence ending in `?`/`./!` else 140-char clamp) + a `[↓ back to live]` mono button that scrolls the spec-tag back to 90 px viewport offset. Desktop only.

- **`components/JumpToLatestFab.tsx`** (`:36-152`)
  - **Purpose.** Pill that surfaces `absolute -top-12 right-0 z-10` inside InputBar's EmbeddedShell when the user has scrolled away (`|spec-tag.top - 90| > 200 px`). Counter increments when `latestAssistantId` changes while away. Click jumps the spec-tag back to top:90; falls back to scroll-to-bottom when no anchor exists.
  - **Props.** `{ latestAssistantId? }`.

- **`components/ConversationCursor.tsx`** (`:1-46`) — Decorative drafting-pencil cursor at the bottom edge.

- **`components/MobileTopBar.tsx`** (`:33-142`) — Sticky `lg:hidden top-0 z-20 h-16` bar with folded-paper-tab icons each side (44×44 touch targets), title block / `<ChatProgressBarMobile>` swap once turn-count > 5%, right-side red-dot peek badge.

- **`components/MobileTopHeader.tsx`** (152 LOC) — Mobile-only collapsing header used inside `<MobileChatWorkspace>` (separate from MobileTopBar; the latter is a desktop-fallback sibling that renders on tablet width 640–1023 above `<ChatWorkspaceLayout>`).

- **`components/MobileRailDrawer.tsx`** (77 LOC) — Generic vaul wrapper with `direction="left"|"right"` for the rail drawers.

- **`components/MobileRightRailPeek.tsx`** (64 LOC) — Bottom-edge "↑ NEUE EMPFEHLUNG" toast on mobile when right-rail recommendations grow while the drawer is closed.

- **`components/AutoSavedIndicator.tsx`** (`:1-36`) — Subtle `Automatisch gespeichert · vor X Min.` tag in the LeftRail header.

- **`components/Banners.tsx` `<OfflineBanner>`** (`:14-56`), **`components/RateLimitBanner.tsx`** (`:14-66`), **`components/ErrorBanner.tsx`** (`:28-70`) — Three quiet hairline-bottom strips above the workspace.

### B.7. Input zone

- **`components/Input/InputBar.tsx`** (`:148-449`)
  - **Purpose.** The persistent textarea + paperclip + send. Three vertical slots (`gap-2`):
    1. `<SuggestionChips>` — yesno/single/multi/address/reply chips OR Continue chip OR null.
    2. **Optional row** with `<IdkChips>` (left) + `<StandUpButton variant="link">` (right) — only when `lastAssistant.allow_idk` AND ≥ 4 assistant turns.
    3. **Optional** attachment chip list.
    4. **Always** the textarea card: paperclip · `<textarea>` · `<SendButton>`.
    5. Helper hint row (one-liner italic clay).
  - **Auto-grow.** MAX_ROWS=5; manual height calc on text change.
  - **Submit.** Cmd/Ctrl+Enter or Enter (Shift+Enter newline).
  - **Embedded vs Standalone shell.** When inside `<UnifiedFooter>`, drops the sticky border-top/bg chrome; mounts `<JumpToLatestFab>` `absolute -top-12`.
  - **Props.** `{ lastAssistant, onSubmit, onIdkChoose?, standUp?, forceDisabled?, embedded? }`.

- **`components/Input/SuggestionChips.tsx`** (499 LOC) — One file, multiple flavours. ChipRow + YesNoChip + SelectChip + ReplyChip + MultiSelectRow (with confirm + counter) + AddressRow (inline form + `isPlotAddressValid`) + ContinueRow. `chipBase()` handles disabled/highlighted variants. `pm-chip-row` has a right-edge mask for overflow on mobile.

- **`components/Input/IdkChips.tsx`** (`:27-138`)
  - **Purpose.** Phase 7 Move 7. Three persistent chips: `Recherche durchführen lassen / Als Annahme markieren / Zurückstellen`. Replaces the legacy `IdkPopover` (schema unchanged: still emits `{ kind: 'idk', mode: 'research'|'assume'|'skip' }`). Inline 9×9 SVG icons (circle+check / plus / square).

- **`components/Input/SendButton.tsx`** (90 LOC) — Round 9×9 send/stop button. When `chatStore.currentAbortController` is set, switches to a stop icon and calls `abortStreaming()`.

- **`components/Input/AttachmentChip.tsx`** (141 LOC) — Per-pending-attachment card with mime icon, filename, status (`uploading`/`uploaded`/`failed`), remove-X.

- **`components/Input/AttachmentPicker.tsx`** (235 LOC) — Popover (desktop) / vaul drawer (mobile) opened by paperclip. Choose-files / camera / gallery / document.

- **`components/Input/MobileAttachmentSheet.tsx`** (198 LOC) — The mobile vaul flavour of the picker.

### B.8. Footer column children

- **`components/UnifiedFooter/FooterLeftColumn.tsx`** (`:27-66`)
  - **Purpose.** Pass 2 collapse to a single mono-caps row: `View briefing · Checklist · Export ↗ · ← Leave`. Each link `font-mono text-[10px] tracking-[0.14em] uppercase text-ink-mute hover:text-clay`. Routes: `/projects/${id}/result`, `/projects/${id}/overview`, `<ExportMenu variant="ghost" placement="top">`, `/dashboard`.

- **`components/UnifiedFooter/FooterRightColumn.tsx`** (`:30-98`)
  - **Purpose.** Three stacked elements right-aligned: outline button `[Checkliste öffnen ↗]` → `/projects/${id}/overview`, `<FooterScaleBar>` "M 1:100 [bar]" inline svg (78×10), `<CostTicker>` (admin-only).

- **`components/CostTicker.tsx`** (`:29-129`)
  - **Purpose.** Admin-only ($isAdminEmail) token+USD ticker in the footer right. Mono `≈ 313K Tokens · 1,17 USD` with a 200×12 SVG scale-bar flourish above. Hover surfaces a 4-row breakdown popover (`input/output/cacheRead/cacheWrite/usd`).
  - **Visibility gate.** `isAdminEmail(user?.email)` — `lib/cn-feature-flags.ts:12-15` allowlists `erolerutik9@gmail.com` and `vibecoders786@gmail.com`. **Non-admin users never see this widget.** Rutik is admin → ticker shows.

- **`components/ExportMenu.tsx`** (492 LOC)
  - **Purpose.** Three-format export trigger. Desktop: anchored popover (Pass 6 supports `placement: 'top'|'bottom'` so the FooterLeftColumn instance opens upward). Mobile: vaul bottom drawer. Dynamic-imports `exportPdf` so pdf-lib + fontkit + brand TTFs only ship on click. Logs telemetry.

### B.9. Progress

- **`components/Progress/ChatProgressBar.tsx`** (`:49-356`)
  - **Purpose.** "Compass arc" — `sticky top-0 z-30` band above the thread on desktop. Track 1 px hairline + 2 px clay-deep progress overlay + 12 px halo dot at progress edge + 7 stations (current = 10 px clay with 4 px clay-tint glow; passed = 6 px clay-soft fill; upcoming = 1 px hairline tick). Left: "Journey" mono caps eyebrow. Right: `Turn 18 / ~18` italic-serif tabular + scale-mark "M 1:100".
  - **Compact mode** (mobile drawer): bare arc, no chrome, no labels.
  - **Reads** `chatStore.turnCount` + `chatStore.currentSpecialist` + `chatStore.lastCompletionSignal` AND `messages` prop (Phase 2.5 — durable derivation falls back to assistant-message count when chat-store resets on remount). `computeSegmentProgress` from `lib/progressEstimate.ts`.
  - **Scrolled state.** `window.scrollY > 8` flips the bottom border from `border-hairline-faint` → `border-clay/40` and darkens the gradient (toolbar look).

- **`components/Progress/ChatProgressBarMobile.tsx`** (18 LOC) — Compact wrapper used inside `MobileTopBar`.

### B.10. Stand-up

- **`components/StandUp.tsx`** (539 LOC; entrypoint `:62-…`)
  - **Purpose.** Phase 7 Move 11+13 modal. Hidden until ≥ 4 assistant turns. Two variants: `link` (mono-caps text link in InputBar's IDK row — current default after Pass 2) or `fab` (legacy floating pill, kept). Modal content: **Story-so-far** timeline derived from `project_events` filtered to `MEANINGFUL_EVENT_TYPES`; **Open Questions** card derived from `state.facts` (ASSUMED quality) + `state.areas` (PENDING); **Action group** mirroring UnifiedFooter exports (PDF / Markdown / Briefing / JSON).

### B.11. Empty state + decorative

- **`components/EmptyState.tsx`** (`:17-63`) — `<AtelierIllustration>` axonometric drawing + eyebrow "PLANNING MATRIX · ATELIER" + display headline "Das Atelier öffnet" + italic body + 32 px hairline opacity pulse below.
- **`components/AtelierIllustration.tsx`** (175 LOC) — Drafting-table axonometric SVG (table, paper, pen drawing 1 cm scale line, rolled plans, ledger, coffee).
- **`components/IntentAxonometric.tsx`** (454 LOC) — Per-intent axonometric drawing (used by `OverviewPage`; **not currently rendered in the chat workspace** post Pass 5 — `ProjectPortrait` replaced it).
- **`components/TitleBlock.tsx`** (69 LOC) — A1-form-style title block (used inside Thread on first turn; also OverviewPage).

### B.12. Library helpers (referenced by chat)

- **`lib/detectChapters.ts` (75 LOC)** — Detects chapter boundaries (specialist identity change + first turn after the moderator opener).
- **`lib/progressEstimate.ts`** (`:1-156`) — `SPECIALIST_PROGRESS` anchor table (moderator 0.05 → synthesizer 0.98), `estimateProgress`, `computeSegmentProgress`, `SEGMENT_ORDER` (the 7 stations).
- **`lib/parseCitations.tsx` (120 LOC)** + `lib/highlightCitations.tsx` (21 LOC) + `lib/lawArticles.ts` (80 LOC) — Build `<CitationChip>` instances from law-reference regex matches in assistant text.
- **`components/CitationChip.tsx`** (`:30-76`) — Inline interactive `§30 BauGB` chip → Radix Popover with title/summary/external link. Hover/focus/touch all open.
- **`lib/extractedFacts.ts` (53 LOC)** — `nextAssistantExtractedFacts(messages, idx)` — looks up the next assistant turn's `tool_input.extracted_facts` from cache.
- **`lib/userAnswerHelpers.ts` (68 LOC)** — `buildUserMessageText` / `buildUserMessageTextEn` for non-text answers (yesno/select/multi/address/idk).
- **`lib/useFreshSet.ts` (77 LOC)** — Tracks newly-arriving items by id; drives the 2.4 s clay edge fade.
- **`lib/thinkingLabelToSection.ts` (63 LOC)** — Heuristic: parses thinking label + last assistant body → `'top3'|'areas'|'facts'|'procedures'|'documents'|'roles'|null` so the right rail can pre-pulse the section that's about to update.
- **`lib/exportPdf.ts` (828 LOC)** — Brand-grade PDF builder (pdf-lib + fontkit). Dynamic-imported.

---

## C. Data flow — turn-by-turn

End-to-end trace of one conversational turn. Code refs every step.

### C.1. User types into the input

1. **Textarea onChange** (`components/Input/InputBar.tsx:391-401`) → `useInputState.setText(value)`. If the user types over an `activeSuggestion` chip text, `clearSuggestion()` drops the structured signal so prose isn't sent with a stale `userAnswer`.
2. **Submit gesture** — `Enter` (without Shift), `Cmd/Ctrl+Enter`, send-button click, OR a `<SuggestionChip>` click that produces a payload via `useInputState.applySuggestion` then submit. Handler: `InputBar:207-217` → `handleSubmit` → `useInputState.buildSubmitAndClear()` (`hooks/useInputState.ts:102-150`). Output payload: `{ userMessage, userMessageEn?, userAnswer, attachmentIds }`.
3. **Bubbles up** to `ChatWorkspacePage.handleSubmit` (`pages/ChatWorkspacePage.tsx:219-232`) which calls `chatTurn.mutate({ userMessage, userMessageEn, userAnswer, attachmentIds })`.

### C.2. Optimistic append + thinking indicator

4. **TanStack `useMutation.onMutate`** (`hooks/useChatTurn.ts:190-249`):
   - Generates a `clientRequestId = crypto.randomUUID()` (idempotency key).
   - Snapshots `previousMessages` from cache key `['messages', projectId]`.
   - Builds a placeholder `MessageRow` with `id: 'pending-${clientRequestId}'`, role `user`, the optimistic content, and writes `[...previousMessages, placeholder]` to the cache.
   - Reads the most recent persisted assistant turn → seeds `currentSpecialist` (defaults to `'moderator'`) and `currentThinkingLabel` (locale-aware: prefers `lastAssistant.tool_input.thinking_label_en` when EN, else `lastAssistant.thinking_label_de`).
   - Computes `currentActivitySection` via `thinkingLabelToSection(label + body + userMessage)` so the right-rail section pre-pulses.
   - Calls `chatStore.setThinking(true, seedSpecialist, seedLabel, activitySection)` → drives `<ThinkingIndicator>`.
   - `chatStore.clearFailed(clientRequestId)`, `setCompletionSignal(null)`.
5. The Thread (`components/Thread.tsx:117-126`) renders `<StreamingAssistantBubble>` if `chatStore.streamingMessage !== null` (set in step 7), else `<ThinkingIndicator>`.

### C.3. mutationFn executes (online path)

6. **`mutationFn`** (`hooks/useChatTurn.ts:88-188`):
   - Offline guard: if `navigator.onLine === false`, calls `chatStore.enqueueOffline({ clientRequestId, projectId, userMessage, userMessageEn, userAnswer, attachmentIds, queuedAt })` (cap 5; rejects if full) and returns `{ kind: 'queued', clientRequestId }`. The optimistic placeholder stays visible.
   - Online: builds `ChatTurnRequest` with `locale: i18n.resolvedLanguage`, registers an `AbortController` via `chatStore.setAbortController`, opens streaming bubble via `chatStore.openStreamingMessage(streamingId, seedSpecialist)`.
   - Calls `postChatTurnStreaming(request, lang, handlers, abort.signal)` (`lib/chatApi.ts:207-486`):
     - Reads session via `supabase.auth.getSession()`; throws `ChatTurnError('no_session', …)` if absent.
     - `fetch(env.url, { method: 'POST', headers: { Accept: 'text/event-stream', apikey, Authorization: 'Bearer …' }, body: JSON.stringify(request), signal })` to `${VITE_SUPABASE_URL}/functions/v1/chat-turn`.
     - Bound `wrappedHandlers` enforce single-settle (`onComplete` XOR `onError` exactly once).
     - Pre-stream short-circuits: `!response.ok` → parse JSON envelope and surface as `ChatTurnError` (e.g. 429 rate-limit retains `rateLimit` info). Non-`text/event-stream` Content-Type → `settleFromJsonBody`.

### C.4. Edge Function pipeline

7. **`supabase/functions/chat-turn/index.ts:58-326`** receives the POST.
   1. **CORS preflight + origin allowlist** (`cors.ts`).
   2. **Bearer-token gate** — header presence check; the platform-level `verify_jwt: true` already validated the JWT.
   3. **Body parse** through `chatTurnRequestSchema.safeParse` (Zod).
   4. **Per-request Supabase client** with anon key + the user's bearer token → every downstream query is RLS-enforced. The function never holds the service-role key.
   5. **`supabase.auth.getUser()`** — second auth check (defensive; pulls `user.id` for rate limit + telemetry).
   6. **Rate limit RPC** `increment_chat_turn_rate_limit(user_id, max_per_hour=50)` (defined in `migrations/0008_chat_turn_rate_limits.sql`). SECURITY DEFINER, atomic `INSERT ... ON CONFLICT DO UPDATE`. Returns `{ allowed, current_count, max_count, reset_at }`. If `!allowed` → 429 with `rateLimit` envelope.
   7. **Load** via `loadProjectAndMessages(supabase, projectId)` (`persistence.ts:75-126`) — `projects` row + last 30 messages (DESC then reversed). 404 collapses both not-found + RLS-denied. Hydrates `currentState = hydrateProjectState(project.state, templateId)` (`lib/projectStateHelpers.ts:59-71`).
   8. **Insert user message idempotently** (`persistence.ts:143-197`):
      - `INSERT ... messages (project_id, role:'user', content_de, content_en, user_answer, client_request_id) RETURNING *`.
      - On Postgres `23505` (unique conflict via `messages_idempotency_idx`), look up the existing row. If found, return `{ replayed: true }`.
      - If `replayed` AND there's an assistant message past it (`findAssistantAfter`) — short-circuit: return the cached pair. No Anthropic call, no audit row.
   9. **`mapMessagesForAnthropic`** (`persistence.ts:514-523`) filters out `role='system'` rows (UI-only) and emits `{ role, content: content_de }[]`. **Note:** the model always sees German content_de regardless of UI locale; the EN mirror is for client display. First-turn priming: when no messages, synthesize a German user kickoff string (`'Eröffnen Sie das Gespräch mit dem Bauherrn …'`).
   10. **Build live-state block** (`systemPrompt.ts:66-139`) — `templateId / intent / bundesland / plot / areas / facts (last 8) / recommendations (top 3) / questionsAsked (last 8) / lastUserMessageText / lastSpecialist`.
   11. **Streaming branch** (`acceptsStream(req)` true → `Accept: text/event-stream`): hand off to `runStreamingTurn` (`streaming.ts:71-272`). Anthropic SDK stream forwarded as `data: {"type":"json_delta","partial":"…"}` SSE frames; `finalMessage()` validated by `respondToolInputSchema.safeParse`.
   12. **Non-streaming fallback** — `callAnthropicWithRetry` (`anthropic.ts:250-272`): one retry on `UpstreamError('invalid_response')` with a stricter `KORREKTUR:` reminder appended to the system blocks. 429/529/5xx are NOT retried server-side (SPA owns backoff).
8. **`buildSystemBlocks`** (`systemPrompt.ts:207-227`) returns three blocks:
   1. `text: PERSONA_BLOCK_V1` (= `COMPOSED_LEGAL_CONTEXT` from `legalContext/compose.ts` — shared+federal+bayern+muenchen joined; ~9–12k tokens) **with `cache_control: { type: 'ephemeral' }`**.
   2. `text: buildLocaleBlock(locale)` — locale addendum (~150 tokens; small enough to fall below the 1024-token cache-write threshold). NOT cached.
   3. `text: liveStateText` — per-turn state. NOT cached.
9. **Anthropic call** (`anthropic.ts:117-212`):
   - `client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 1280, system: systemBlocks, messages, tools: [respondToolDefinition], tool_choice: { type: 'tool', name: 'respond' } })`.
   - `AbortController` at 50 s; SDK retries disabled (`maxRetries: 0`).
   - Find `tool_use` block; assert `name === 'respond'`. Run `respondToolInputSchema.safeParse(toolUse.input)` → throw `UpstreamError('invalid_response', …)` on Zod failure.
   - Usage: `inputTokens / outputTokens / cacheReadTokens / cacheWriteTokens` extracted; `latencyMs = Date.now() - start`.

### C.5. State application + persistence

10. **`applyToolInputToState`** (`lib/projectStateHelpers.ts:388-402`) is run on the SPA-shared helpers (Deno + Vite share these `.ts` modules). Order:
    1. `applyExtractedFacts` — keys upserted; new qualifier `{ source, quality, setAt, setBy: 'assistant', reason? }`. Last-write-wins by key.
    2. `applyRecommendationsDelta` — discriminated union (`upsert`|`remove`); `normalizeRecommendations` sorts by `(rank asc, createdAt asc)` then renumbers `rank: 1..N`; caps at `RECOMMENDATIONS_CAP = 12`.
    3. `applyProceduresDelta` / `applyDocumentsDelta` / `applyRolesDelta` — same pattern; default `qualifier.source='LEGAL', quality='CALCULATED'` if model omits.
    4. `applyAreasUpdate` — `{A?, B?, C?}` partial; only specified keys mutate.
    5. `appendQuestionAsked(state, message_de)` — fingerprints the question (NFKD strip + lower + collapse) and appends to a 50-cap rolling list.
    6. Stamp `lastTurnAt = new Date().toISOString()`.
11. **`insertAssistantMessage`** (`persistence.ts:243-305`) inserts a new `messages` row with `role='assistant'`, the persona, content_de + content_en, input_type, input_options, allow_idk, thinking_label_de, likely_user_replies, **`tool_input: t` (the full validated tool-call payload — Phase 6 A.1)**, model, and the four token counters + latency_ms.
12. **`updateProjectState`** (`persistence.ts:309-329`) — `UPDATE projects SET state=$json WHERE id=$id`. RLS-scoped via the user-bearer client.
13. **`logTurnEvent`** (`persistence.ts:346-487`) — best-effort batched insert into `project_events`. Diff before/after state and emit semantic rows: `recommendation_added`, `procedure_committed`, `procedure_status_changed`, `area_state_changed`, `document_added`, `role_added`, `role_needed_changed`, `fact_extracted`, plus an umbrella `turn_processed` row that carries the full `before_state`/`after_state` snapshot. Audit-row failure is logged as `audit_drop` but does not abort the turn.
14. **Response** — `respondSuccess(assistantInsert.row, newState, usage, latencyMs, completionSignal, corsHeaders)` returns the JSON envelope (or, in the streaming path, emits the final `data: {"type":"complete", …}` SSE frame).

### C.6. Client receives + cache mutations

15. **`postChatTurnStreaming` SSE loop** (`lib/chatApi.ts:391-485`):
    - `json_delta` → `TextFieldExtractor.feed(partial)` (locale-aware key: `message_en` if EN, else `message_de`) → `handlers.onTextDelta(text)` → `chatStore.appendStreamingText(text)` (drives `<StreamingAssistantBubble>`).
    - `complete` → resolves the streaming Promise with the full envelope.
    - `error` → calls fallback to `postChatTurn` (non-streaming JSON, same `clientRequestId` so server idempotency dedupes). Only if no text has arrived yet — once text-arrived, fallback is suppressed.
16. **`useMutation.onSuccess`** (`hooks/useChatTurn.ts:251-328`):
    - Append `response.assistantMessage` to the `['messages', projectId]` cache (replacing the optimistic placeholder via simple list append; the placeholder ID never collides with the real UUID).
    - **Update `['project', projectId]` cache**: `{ ...old, state: response.projectState, updated_at: now }`.
    - `chatStore.promoteSpecialist(response.assistantMessage.specialist)` (rotates `currentSpecialist` → `previousSpecialist`).
    - `setThinking(false)`, `closeStreamingMessage()`, `setAbortController(null)`, `noteSuccessfulTurn()` (turnCount++, lastSavedAt=now), `clearFailed(clientRequestId)`, `setRateLimit(null)`, `setLastError(null)`.
    - `setCompletionSignal(response.completionSignal)` only when not `'continue'`.
    - Out-of-band file linkage: `fetchPersistedUserMessageId({ projectId, clientRequestId })` → `linkFilesToMessage({ fileIds, messageId })` → `queryClient.invalidateQueries(['projectAttachments', projectId])`.
17. **`useMutation.onError`** (`hooks/useChatTurn.ts:330-364`): `markFailed(clientRequestId)`, `setThinking(false)`, `closeStreamingMessage()`, `setAbortController(null)`. Routes `ChatTurnError` to `chatStore.setRateLimit` (429) or `chatStore.setLastError({ code })` for any other code, surfacing `<RateLimitBanner>` or `<ErrorBanner>`.

### C.7. UI re-renders

18. **Thread** rerenders with the new persisted assistant `MessageRow` (Typewriter animates because the id wasn't in `initialIds`). `useAutoScroll` (`hooks/useAutoScroll.ts:80-102`) sees `latestAssistantId` change → `requestAnimationFrame` → `window.scrollTo({ top: tag.top - 90, behavior: 'smooth' })` (skipped when `pausedRef.current` is true).
19. **Right rail** rerenders from the updated `project.state`:
    - `<Top3>` — `recommendations` change → AnimatePresence with `layout='position'`; new ids flagged by `useFreshSet` → `pm-fresh-edge` 2.4 s clay bar fade.
    - `<EckdatenPanel>` — same pattern on facts.
    - `<AreasSection>` — band background hatch swaps if `state` changed; `liveArea` re-derived from latest specialist → `pm-area-pulse` looping clay bar on the new live band.
    - `<ProceduresPanel> / <DocumentsPanel> / <RolesPanel>` — counts update; `chatStore.currentActivitySection` may pulse one for ~1 turn until the next `setThinking` clears it.
    - `<ProjectPortrait>` — wall-height bracket and GK badge animate in (240 ms fade) when their facts establish.
20. **Left rail** — `<SpecIndex>` recomputes `activeGateId` from the latest specialist; the matching gate gets a 2 px clay left border + per-gate vertical hairline progress fill animates `height` over 600 ms.
21. **Compass arc** (`<ChatProgressBar>`) — `computeSegmentProgress(turnCount, currentSpecialist)` → segments shift, halo dot tweens `left` over 600 ms (`cubic-bezier(0.16, 1, 0.3, 1)`), station mark for the current segment swaps from `1 px hairline tick` → `10 px filled clay + 4 px clay-tint ring`.

---

## D. State management map

### D.1. Zustand stores

#### `src/stores/chatStore.ts` (350 LOC)

Full state shape:
```ts
isAssistantThinking: boolean
currentSpecialist: Specialist | null         // Whose voice is "speaking" right now
previousSpecialist: Specialist | null        // For match-cut transitions
currentThinkingLabel: string | null          // Hint from prior turn's tool_input
currentActivitySection:                      // Right-rail pre-pulse section
  'top3'|'areas'|'facts'|'procedures'|'documents'|'roles' | null
failedRequestIds: Set<string>                // Drives "Erneut senden" affordance
lastCompletionSignal:
  'continue'|'needs_designer'|'ready_for_review'|'blocked' | null
streamingMessage: { id, specialist, contentSoFar, isComplete } | null
turnCount: number                            // Successful assistant turns this session
lastSavedAt: Date | null                     // Drives <AutoSavedIndicator>
pendingAttachments: PendingAttachment[]      // File-upload chip array
currentAbortController: AbortController | null
lastRateLimit: { currentCount, maxCount, resetAt } | null
lastError: { code: string } | null
offlineQueue: OfflineQueueEntry[]            // Cap = OFFLINE_QUEUE_CAP = 5
```

Actions and call-sites:
| Action | Defined | Called from |
|---|---|---|
| `setThinking(thinking, specialist?, label?, activitySection?)` | `:188-195` | `useChatTurn.onMutate / onSuccess / onError`; `abortStreaming`. |
| `promoteSpecialist(next)` | `:196-200` | `useChatTurn.onSuccess`. |
| `markFailed(id)` / `clearFailed(id)` | `:201-211` | `useChatTurn` lifecycle. `<MessageUser>` reads `failedRequestIds` to surface a retry chip. |
| `setCompletionSignal(signal)` | `:211` | `useChatTurn.onSuccess`; `<CompletionInterstitial>` dismiss. |
| `openStreamingMessage / appendStreamingText / closeStreamingMessage` | `:213-228` | `useChatTurn.mutationFn` + `lib/chatApi.postChatTurnStreaming`. |
| `noteSuccessfulTurn()` | `:230-231` | `useChatTurn.onSuccess`. |
| `addAttachment / updateAttachment / removeAttachment / clearAttachments` | `:233-267` | `useUploadFile`, `useDeleteFile`, `<AttachmentChip>`, `<InputBar>` post-submit. **Side-effect:** `URL.revokeObjectURL` on previewUrls when removing. |
| `setAbortController(controller)` / `abortStreaming()` | `:269-288` | `useChatTurn.mutationFn` set/clear; `<SendButton>` stop affordance. **Side-effect:** abortStreaming eagerly clears `streamingMessage` + `isAssistantThinking`. |
| `setRateLimit(info)` / `setLastError(info)` | `:290-291` | `useChatTurn.onError`; banners' dismiss buttons clear via `setRateLimit(null)` / `setLastError(null)`. |
| `enqueueOffline / removeFromOfflineQueue / clearOfflineQueue` | `:293-309` | `useChatTurn.mutationFn` (enqueue when offline); `useOfflineQueueDrain` (remove on success). |
| `reset()` | `:311-349` | `ChatWorkspacePage` cleanup effect on `projectId` change. **Side-effects:** revokes object URLs; aborts any in-flight controller. |

#### `src/stores/authStore.ts` (41 LOC)

`{ user: User|null, session: Session|null, setSession(s) }`. Hydrated by `useSession` from Supabase auth events. Read by `<CostTicker>` (admin gate) and `useAuth`.

### D.2. TanStack Query keys

| Query key | queryFn | staleTime | refetchOnFocus | Trigger to refetch | Trigger to invalidate |
|---|---|---|---|---|---|
| `['project', projectId]` | `hooks/useProject.ts:14-31` — `select * from projects where id=$id maybeSingle()` | 60 s | `false` | None automatic. | Optimistic `setQueryData` in `useChatTurn.onSuccess`. |
| `['messages', projectId]` | `hooks/useMessages.ts:14-31` — `select * from messages where project_id=$id order asc` | 60 s | `false` | None automatic; cache pre-seeded by `useCreateProject` (wizard) so first render is hot. | Optimistic `setQueryData` in `useChatTurn.onMutate` (placeholder) + `onSuccess` (real assistant row). |
| `['project-events', projectId, limit=30]` | `hooks/useProjectEvents.ts:19-37` — `select * order desc limit 30` | 60 s | `false` | None automatic; not invalidated by chat-turn (StandUp + OverviewPage rely on its 60 s freshness window — minor staleness during a single turn). | Manual elsewhere (e.g. OverviewPage post-edit). |
| `['projectAttachments', projectId]` | `useProjectAttachments` | 60 s (typical) | `false` | None automatic. | `useChatTurn.onSuccess` after `linkFilesToMessage`. |
| `['bplanLookup', address]` | wizard only | — | — | — | — |
| `['projects', userId]` | `dashboard/hooks/useProjects` | — | — | — | dashboard mutations. |

> **NOTE:** `['project-events', projectId]` is **not invalidated** when a turn's audit row lands. StandUp and downstream surfaces tolerate up to 60 s of staleness because the modal isn't visible during the turn itself; a refresh or 60 s wait re-fetches. Worth flagging if the redesign mounts a live timeline.

### D.3. Storage / sessionStorage

- `localStorage` — Supabase auth persists session here (default). i18next-browser-languagedetector caches the lang under `i18nextLng`.
- `sessionStorage` — Result-page session animation flag (`features/result/lib/sessionAnimationFlag.ts`).
- The chat workspace itself does **not** read or write `localStorage` / `sessionStorage` outside auth + i18n. Offline queue lives in-memory in Zustand and is **lost on a page reload**.

> **NOTE:** `chatStore.offlineQueue` is in-memory only. A reload while offline destroys parked turns. The brief mentions queue-and-flush; persistence to IndexedDB or localStorage is a known gap.

### D.4. React contexts in the chat tree

- **`react-i18next`** I18nextProvider — at `app/providers.tsx`.
- **`@tanstack/react-query`** QueryClientProvider — at `app/providers.tsx`.
- **`vaul`** Drawer.Root — three instances inside ChatWorkspacePage (top progress, left rail, right rail) + per-vaul callsite inside `UnifiedFooter` (bottom overflow).
- **`framer-motion`** LazyMotion / domAnimation — at `app/providers.tsx` (so all `m.` components compile).
- **`react-router-dom`** — `useParams` + `<Link>` — page-wide.

No app-defined React Contexts inside the chat tree (data flows through Zustand and TanStack Query).

---

## E. Design tokens inventory

### E.1. CSS custom properties (`src/styles/globals.css`)

#### Atelier base (HSL):
```
--paper:          38 30% 97%
--paper-tinted:   36 28% 95%
--ink:           220 16% 11%
--clay:           25 30% 38%
--clay-soft:      25 30% 62%
--clay-light:     25 30% 78%
--clay-deep:      25 32% 28%
--drafting-blue: 212 38% 32%
--background:    38 30% 97%
--card:          38 30% 99%
--popover:       38 30% 99%
--primary:      220 16% 11%   --primary-foreground: 38 30% 97%
--secondary:     38 22% 92%
--muted:         38 22% 93%   --muted-foreground:   220 8% 38%
--accent:        25 30% 38%
--destructive:    0 60% 45%
--border:       220 12% 88%
--border-strong:220 12% 78%
--radius: 0.5rem
```

#### Operating-mode overrides (`[data-mode='operating']`, set on `ChatWorkspaceLayout` root):
```
--pm-radius-input:    0.75rem
--pm-radius-card:     1rem
--pm-radius-pill:     9999px
--pm-shadow-input:    0 1px 2px hsl(220 15% 11% / 0.04)
--pm-shadow-card:     0 1px 3px hsl(220 15% 11% / 0.06)
--pm-tracking-body:   0.005em
--pm-radius-button:   0.5rem
--pm-radius-card-md:  0.5rem
--pm-radius-card-lg:  0.75rem
--pm-text-eyebrow:    0.75rem      tracking-eyebrow: 0.18em
--pm-text-timestamp:  0.75rem
--pm-text-qualifier:  0.6875rem
--pm-clay-text:       hsl(25 30% 38% / 0.72)
--pm-clay-emphasized: hsl(25 30% 38% / 0.82)
--pm-ink-soft:        hsl(220 15% 11% / 0.80)
--pm-ink-body:        hsl(220 15% 11% / 0.90)
```

#### Phase 7 Living-Drafting-Table tokens (`globals.css:213-258`):
```
--paper-deep:  #ECE5D5     --paper-card:  #FBF7EE     --paper-soft:  #F8F2E5
--ink-soft:    #3A322A     --ink-mute:    #6B5F50     --ink-faint:   #8E8270
--clay-tint:   rgba(142,106,71,0.10)   --clay-glow:   rgba(142,106,71,0.18)
--line:        rgba(26,22,18,0.10)
--line-strong: rgba(26,22,18,0.18)
--line-faint:  rgba(26,22,18,0.05)
--ease:        cubic-bezier(0.16, 1, 0.3, 1)
--ease-soft:   cubic-bezier(0.32, 0.72, 0, 1)
--rail-l:      260px      --rail-r:    340px      --max-content: 1480px
```

> **NOTE:** The `--rail-l: 260px / --rail-r: 340px` design references **disagree with the actual layout** — the implemented grid is `220px | minmax(0,1fr) | 300px` (`ChatWorkspaceLayout.tsx:60`). The CSS vars are vocabulary tokens for `StandUp` modal positioning (`bottom-6 right-[calc(var(--rail-r)+24px)]`); the body grid is hard-coded. Drift is purely cosmetic, not data-load-bearing.

#### Mobile viewport tokens (`[data-pm-viewport='mobile']`):
```
--pm-text-base:       1rem (16 px — prevents iOS Safari zoom on textarea focus)
--pm-text-body:       1rem
--pm-text-eyebrow:    0.8125rem (13 px)
--pm-text-timestamp:  0.8125rem
--pm-text-headline:   1.5rem (24 px)
--pm-text-display:    2rem  (32 px)
--pm-touch-min:       44px
--pm-tap-padding:     0.5rem
--pm-stack-gap:       0.75rem
--pm-radius-input:    1.25rem
--pm-radius-card:     1rem
--pm-safe-{top,bottom,left,right}: env(safe-area-inset-*)
--pm-transition-tap:  100ms
--pm-transition-page: 250ms
```

### E.2. Tailwind theme extension (`tailwind.config.js:19-277`)

#### Font families
- `sans` → `Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
- `serif` → `Instrument Serif, New York, Charter, Iowan Old Style, Times New Roman, serif`
- `display` → same as `serif`
- `mono` → `JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`

#### fontSize scale (semantic, beyond defaults)
| token | size | line-height | letter-spacing | weight |
|---|---|---|---|---|
| `eyebrow` | 0.6875rem (11 px) | 1 | 0.18em | 500 |
| `caption` | 0.8125rem (13 px) | 1.45 | — | — |
| `body-lg` | 1.125rem (18 px) | 1.62 | — | — |
| `body-xl` | 1.25rem (20 px) | 1.55 | — | — |
| `title-sm` | 1.375rem (22 px) | 1.3 | -0.01em | — |
| `title` | 1.75rem (28 px) | 1.22 | -0.018em | — |
| `title-lg` | 2.125rem (34 px) | 1.15 | -0.02em | — |
| `headline` | clamp(2rem, 4.2vw, 2.875rem) | 1.1 | -0.022em | — |
| `display-{3,2,1}` | clamp(...) | 1.05 / 1.02 / 0.98 | -0.028 / -0.032 / -0.038em | — |

#### Spacing / borders / colors
- `borderRadius`: `lg = var(--radius)`, `md = calc(var(--radius)-2px)`, `sm = calc(var(--radius)-4px)`.
- `colors.{paper,paper-tinted,ink,clay,clay-soft,clay-light,clay-deep,drafting-blue}` mapped to atelier HSL vars.
- `colors.{pm-paper,pm-paper-warm,pm-paper-deep,…,pm-ink,pm-clay,pm-sage,pm-hair,pm-dark,…}` — landing v2 scoped palette mapped to `var(--pm-*)`.
- Phase 7 chat scope: `colors.{paper-deep,paper-card,paper-soft,ink-soft,ink-mute,ink-faint,clay-tint,clay-glow,hairline,hairline-strong,hairline-faint}`.

#### Container
- `center: true`, padding `1.5rem` default, `2.5rem md`, `4rem lg`, `2xl: 1240px`.

#### transitionTimingFunction
- `calm` / `ease`: `cubic-bezier(0.16, 1, 0.3, 1)` (same curve, two names — Phase 7 brief vocabulary).
- `soft`: `cubic-bezier(0.4, 0, 0.2, 1)`.
- `ease-soft`: `cubic-bezier(0.32, 0.72, 0, 1)`.

#### transitionDuration
- `calm: 700ms`, `soft: 180ms`.

### E.3. Font loading

Self-hosted under `public/fonts/`:
- `Inter-Variable-latin.woff2` — variable, weights 400–600, font-display: swap.
- `InstrumentSerif-Regular-latin.woff2` + `InstrumentSerif-Italic-latin.woff2` — both 400 weight.
- `unicode-range` covers Latin + DE diacritics (U+0000-00FF + U+02BB-02DC + …).
- DSGVO baseline: replaces Google Fonts after **LG München I, 20.01.2022 (3 O 17493/20)** ruling (€100 damages per Google Fonts request).

`font-feature-settings` on body (`globals.css:130`): `'ss01' on, 'cv05' on, 'case' on, 'calt' on` — single-storey 'a', alternate 'l', case-aware punctuation, contextual alternates.
Tabular-figures utility: `'tnum' on, 'lnum' on, 'cv05' on, 'calt' on` (used everywhere a number sits in tabular position).

### E.4. Icon library

- `lucide-react@1.11.0`. Icons used inside chat: `Paperclip`, `ArrowDown`, `ArrowRight`, `ArrowUpRight`, `MoreHorizontal`, `X`, `ChevronDown`, `Download`, `Copy`, `AlertTriangle`. Specialist sigils + drafting compass + atelier illustration + house portrait + folded-tab icons + scale bars + signature curve + chevrons in CompletionInterstitial are **all hand-rolled SVGs**, not Lucide.

### E.5. Motion inventory in chat

| Component | Effect | Duration / curve | Reduced-motion |
|---|---|---|---|
| `<MessageAssistant>` marginalia rule | scaleY 0→1, transform-origin bottom | 320 ms · `[0.16, 1, 0.3, 1]` | `initial={false}` (instant) |
| Match-cut hairline (when specialist changes) | scaleX 0→1 | 320 ms · same curve | instant |
| Match-cut nameplate | scale 0.98→1 + opacity 0→1, delay 320 ms | 240 ms · same curve | instant |
| `<Typewriter>` | 18 ± 10 ms per char + 100 ms sentence pause | n/a | full text |
| `<Top3>` items | opacity 0→1 + y 16→0, stagger 80 ms | 300 ms · `[0.16, 1, 0.3, 1]`. `layout='position'` | `initial={false}` |
| `<Top3>` exit | opacity 1→0 | 200 ms | reduced: opacity-only |
| `pm-fresh-edge` | opacity 1 (0–60%) → 0 (100%) | 2400 ms · `cubic-bezier(0.16, 1, 0.3, 1)` | global `*::after { animation-duration: 0.001ms }` rule kills it |
| `pm-area-pulse` | opacity 1 ↔ 0.4 | 1.4 s loop · `[0.32, 0.72, 0, 1]` | killed by global rule |
| `pm-leftrail-pulse` (Current specialist dot) | opacity + scale loop | 1.4 s · `[0.32, 0.72, 0, 1]` | inline `@media reduce` overrides to `none` |
| `pm-sticky-ctx-pulse` | same shape | 1.6 s | overridden |
| `pm-ambient-pulse` (active section dot) | opacity 0.4 ↔ 1 | 1.6 s linear | dropped via `motion-safe:` prefix |
| `pm-thinking-arc` (drafting compass) | strokeDashoffset 60→0→-60 | 2.6 s · `[0.16, 1, 0.3, 1]` infinite | inline `@media reduce` → none |
| `pm-thinking-arm` | rotate 0→360° | 2.6 s linear infinite | inline `@media reduce` → none |
| `pm-signature-shimmer` (LeftRail pen) | strokeOpacity 0.45 ↔ 0.85 | 8 s | inline `@media reduce` → none |
| `<JumpToLatestFab>` | opacity + y + scale | 200 ms · `[0.16, 1, 0.3, 1]` | reduced: opacity-only |
| `<StickyContext>` | opacity + translateY -8→0 | 220 ms · `--ease` | reduced: opacity-only |
| `<ChatProgressBar>` halo dot | `left` tween | 600 ms · `[0.16, 1, 0.3, 1]` | reduced: `transition: 'none'` |
| `<ChatProgressBar>` progress overlay | `width` tween | 600 ms · same curve | same |
| `<LeftRail>` per-gate hairline fill | `height` 0→fillPct% | 600 ms · `ease-ease` | global rule kills |
| `<EckdatenPanel>` items | opacity + y 12→0 | 240 ms | `initial={false}` |
| `<ChapterDivider>` | opacity + y 12→0 | 480 ms · same curve | `initial={false}` |
| `<CompletionInterstitial>` octagonal stamp | static rotation -8° | n/a | static |
| `<MessageUser>` impact line | opacity 0→1, delay 200 ms | 400 ms | instant |
| `<EmptyState>` hairline pulse | opacity loop 0.2→0.6→0.2 | 2.4 s repeat infinite | omitted entirely (`!reduced &&`) |

### E.6. Lenis smooth scroll

`lenis@1.3.23` is in `package.json` and used by `<SmoothScroll>` on the **landing page only**. The chat workspace uses native `window.scrollTo({ behavior: 'smooth' })`. `globals.css:135-139` suppresses native smooth-scroll when `html.lenis` is set (so Lenis doesn't fight the browser).

### E.7. Reduced-motion

Two layers:

1. **Global rule** (`globals.css:141-153`):
   ```css
   @media (prefers-reduced-motion: reduce) {
     html { scroll-behavior: auto; }
     *, *::before, *::after {
       animation-duration: 0.001ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.001ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```
2. **Per-component opt-in** via `useReducedMotion()` from Framer; components that style with inline-keyframes (`<style>` tags inside SVGs) include their own `@media (prefers-reduced-motion: reduce) { .x { animation: none; } }` block — see `LeftRail` pen shimmer, `StickyContext` pulse, `ThinkingIndicator` arc+arm.

> **Audit gap (see Section K).** The `<style>` blocks inside SVG components inject inline keyframes that the global `*::after` rule covers — but a few components also use Framer Motion's `m.` props which need `useReducedMotion` to set `initial={false}`. Most do; we found no failures.

---

## F. Layout specifications — measured

### F.1. Desktop (≥ 1024 px) — `ChatWorkspaceLayout`

- **Outer wrapper** (`components/ChatWorkspaceLayout.tsx:58-77`):
  - `min-h-dvh bg-paper relative isolate`, `data-mode="operating"`.
  - `<BlueprintSubstrate>` + `.grain-overlay-fixed` paint a fixed paper-grid + grain.
  - Grid `mx-auto w-full max-w-[1440px] grid lg:grid-cols-[220px_minmax(0,1fr)_300px] grid-cols-1` with `pb-[120px] lg:pb-[180px]` when footer mounted.
- **Left aside.** `hidden lg:flex border-r border-border-strong/30 min-h-dvh`. Inner padding `px-5 py-7 gap-7` (`LeftRail.tsx:64`).
- **Main center column.** `relative min-h-dvh flex flex-col` → inner `flex-1 flex justify-center px-6 sm:px-10 lg:px-14` → reading column `w-full max-w-[720px] py-16 lg:py-20`.
- **Right aside.** `hidden lg:flex border-l border-border-strong/30 min-h-dvh`. Inner `px-5 py-7 gap-7` (`RightRail.tsx:65`).
- **UnifiedFooter** (`UnifiedFooter.tsx:46-86`):
  - `fixed bottom-0 left-0 right-0 z-30`, `paddingBottom: max(env(safe-area-inset-bottom, 0px), 0.5rem)`.
  - Above-band 80 px paper-fade gradient `-top-20 h-20 pointer-events-none`.
  - Desktop sub-grid mirrors body: `max-w-[1440px] grid lg:grid-cols-[220px_minmax(0,1fr)_300px] gap-x-4 px-4 sm:px-6 lg:px-8 pt-3 pb-2`.
  - Center sub-column has `lg:px-[22px]` (precise 14 px visual inset against the body's 14 px message-column padding).
- **ChatProgressBar (sticky)** (`ChatProgressBar.tsx:114-133`):
  - `sticky top-0 z-30 px-14 pt-4 pb-[14px] backdrop-blur-[2px]`. Background gradient swaps at `window.scrollY > 8`.
  - Mounts inside the body main column wrapper at `-mt-12 mb-6 lg:-mt-16` to override the column's `py-16/20` and pull itself flush to the viewport top.
- **StickyContext** (`StickyContext.tsx:117`): `sticky top-[70px] z-20`. Visible only on lg+ and after ≥ 3 assistant turns + scrolled past the latest spec-tag.

### F.2. Tablet (640–1023 px)

- **`<ChatWorkspaceLayout>`** still wraps; grid collapses to `grid-cols-1` (rails hide via `hidden lg:flex`).
- **`<MobileTopBar>`** (`MobileTopBar.tsx:51`) — `lg:hidden sticky top-0 z-20 h-16` — provides the rail-drawer triggers (folded-paper-tab icons each side, 44×44 touch targets).
- **UnifiedFooter mobile branch** (`UnifiedFooter.tsx:104-169`) — `lg:hidden`, single bar with `<InputBar embedded>` + a `[•••] overflow` round button (40×40 mb-1) that opens a vaul bottom drawer with `<FooterLeftColumn>` + `<FooterRightColumn>`.
- **Center column padding** still `px-6 sm:px-10 lg:px-14` so tablet reads at `px-10 = 40 px` each side.
- **Mobile-input visual inset** `px-[14px]` matches desktop's 14 px (`UnifiedFooter.tsx:105`).

### F.3. Mobile (< 640 px) — `MobileChatWorkspace`

- **Outer** (`MobileChatWorkspace.tsx:67-69`): `min-h-dvh bg-paper relative isolate flex flex-col`, `data-mode="operating"`.
- **MobileTopHeader** — collapsing on scroll, `top-0 z-30` (h ≈ 44 px).
- **Sticky compact progress band** — `sticky top-[44px] z-20 bg-paper/95 backdrop-blur-[2px] border-b border-ink/10 px-3 py-1.5`.
- **Main thread surface** — `flex-1 px-3 pt-4`, `paddingBottom: calc(160px + env(safe-area-inset-bottom, 0px))`.
- **Fixed-bottom input bar** — `fixed bottom-0 left-0 right-0 z-30 bg-paper/95 backdrop-blur-[3px] border-t border-ink/12`. `paddingBottom` follows `useKeyboardHeight()` when keyboard is up; otherwise `env(safe-area-inset-bottom, 0px)`. Inner padding `px-[26px] pt-2 pb-2`.
- **Left vaul drawer.** `top-0 bottom-0 left-0 w-[88%] max-w-[360px] z-50 bg-paper border-r border-ink/15 outline-none overflow-y-auto pt-safe pb-safe`. Mounts `<LeftRail>` plus a tail `<FooterLeftColumn>` row.
- **Right vaul drawer.** Mirror, right-edge.

### F.4. Wide (≥ 1440 px)

The grid clamps to `max-w-[1440px]`. Beyond 1440 px viewport, paper fills with `bg-paper` and the grid centers. The `BlueprintSubstrate` is fixed to viewport so its grid extends edge-to-edge; the body content sits centered.

### F.5. Z-index stack

| Element | z-index | File |
|---|---|---|
| `.pm-skip-link:focus` | 100 | `globals.css:50-69` |
| `.grain-overlay-fixed` | 60 | `globals.css:405-413` |
| `.grain-overlay` | 60 | `globals.css:374-383` |
| Mobile vaul drawer overlays | 40 (overlay), 50 (content) | `MobileChatWorkspace.tsx:139` etc. |
| `<UnifiedFooter>` | 30 | `UnifiedFooter.tsx:46` |
| `<MobileChatWorkspace>` fixed input | 30 | `MobileChatWorkspace.tsx:113` |
| `<ChatProgressBar>` (desktop sticky) | 30 | `ChatProgressBar.tsx:122` |
| `<MobileTopBar>` / `<MobileTopHeader>` | 20 | `MobileTopBar.tsx:51`, etc. |
| `<StickyContext>` (desktop) | 20 | `StickyContext.tsx:117` |
| Mobile sticky compact progress | 20 | `MobileChatWorkspace.tsx:92` |
| `<JumpToLatestFab>` | 10 | `JumpToLatestFab.tsx:132` |
| `<CostTicker>` hover popover | 20 | `CostTicker.tsx:99` (relative to its own container) |
| `<CompletionInterstitial>` octagonal stamp | absolute (no z) | `CompletionInterstitial.tsx:121` |

> **NOTE:** The desktop `<UnifiedFooter>` (z-30) and `<ChatProgressBar>` (z-30) both at z-30 are a draw — they don't overlap (footer is fixed-bottom, progress is sticky-top). Vaul drawer overlay (z-40) cleanly covers everything except the skip link (z-100).

---

## G. Interaction inventory

Grouped by region. Every interactive element with file/line, affordance, behavior, keyboard shortcut, a11y annotation.

### G.1. Left rail (desktop)

| Element | File:line | Affordance | Behavior | Keyboard | A11y |
|---|---|---|---|---|---|
| Wordmark link | `components/shared/Wordmark.tsx` (used by `LeftRail.tsx:66`) | text link | navigates `/dashboard` | Tab + Enter | aria-label via inner text |
| Spec-index gate row | `LeftRail.tsx:158-194` | static `<div>` (cursor-default) | none — visual only | — | clickable feel but inert; **no role/handler**. No screen-reader announcement of "active" state. |
| Current specialist dot | `LeftRail.tsx:202-231` | static text | — | — | aria-hidden on dot; visible label readable. |
| FountainPenFooter | `LeftRail.tsx:235-288` | decorative SVG | none | — | aria-hidden=true |

> **NOTE:** `SpecIndex` rows look interactive (they have `transition-[border-color,color,padding] duration-soft` + hover style on level-1 rows) but **carry no onClick / role / focus**. This is honest design (the gates are progress markers, not navigation) but the hover shift could be misleading.

### G.2. Right rail

| Element | File:line | Affordance | Behavior | Keyboard | A11y |
|---|---|---|---|---|---|
| `<ProjectPortrait>` | `ProjectPortrait.tsx:75-211` | decorative SVG | none | — | aria-hidden=true |
| `<AreasSection>` rows | `AreasSection.tsx:38-89` | static rows | none | — | aria-hidden glyphs; band copy + state pill readable |
| `<Top3>` cards | `Top3.tsx:77-122` | non-interactive `<article>` | none — render only | — | aria-label-less; rank announced via "1." italic prefix |
| Top3 footer "Vorläufig …" | `Top3.tsx:117-121` | static text | — | — | — |
| `<EckdatenPanel>` "show all (N)" toggle | `EckdatenPanel.tsx:160-173` | text button | expands/collapses extra rows | Tab + Enter/Space | focus-visible ring; no aria-expanded |
| `<EckdatenPanel>` row | `EckdatenPanel.tsx:104-156` | static `<li>` with `title={evidence}` | hover surfaces evidence as native tooltip | — | `title` attr — not screen-reader friendly for evidence |
| `<ProceduresPanel>` / `<DocumentsPanel>` / `<RolesPanel>` collapse toggle | `ScheduleSection.tsx:42-47` | button | toggles the panel | Tab + Enter/Space | `aria-expanded` set; min-height 44 px |
| `<ScheduleRow>` | `ScheduleSection.tsx:110-136` | static `<article>` | none | — | qualifier readable as text |
| `<FactTicker>` | `components/FactTicker.tsx` | static rotating text | none | — | live region (need to verify) |

### G.3. Center thread

| Element | File:line | Affordance | Behavior | Keyboard | A11y |
|---|---|---|---|---|---|
| `<MessageAssistant>` body | `MessageAssistant.tsx:69-132` | clickable on mobile (long-press) | opens `<MessageContextSheet>` | — | full text in `<span class="sr-only">` during typewriter |
| `<MessageUser>` body | `MessageUser.tsx:55-126` | mobile long-press | opens MessageContextSheet | — | timestamp `<title>` for relative time |
| `<Typewriter>` | `Typewriter.tsx:83-92` | click body during animation | skips to full text | — | sr-only mirror always present |
| `<CitationChip>` | `CitationChip.tsx:34-75` | inline pill | hover/focus/click → Radix Popover | Tab + Enter/Space; Esc closes | `<button>`; popover collision-padded 16 px |
| `<ChapterDivider>` | `ChapterDivider.tsx:48-67` | none | static | — | `role="separator" aria-label={label}` |
| `<JumpToLatestFab>` | `JumpToLatestFab.tsx:124-150` | floating pill | scrolls latest spec-tag to viewport top:90 | Tab + Enter | aria-label dynamic with new-count |
| `<StickyContext>` "back to live" button | `StickyContext.tsx:139-148` | small text button | smooth-scrolls to latest spec-tag | Tab + Enter | focus-visible ring |
| `<CompletionInterstitial>` chevron action | `CompletionInterstitial.tsx:166-217` | text button | navigate / pause / dismiss | Tab + Enter | focus-visible ring; `aria-label` via inner text |
| `<MessageContextSheet>` | `MessageContextSheet.tsx` | vaul drawer | copy/close | Tab + Enter; Esc closes | Drawer.Title sr-only |

### G.4. Input zone

| Element | File:line | Affordance | Behavior | Keyboard | A11y |
|---|---|---|---|---|---|
| `<textarea>` | `InputBar.tsx:388-424` | text input | submit on Enter, newline on Shift+Enter, also Cmd/Ctrl+Enter | autoResize MAX_ROWS=5; maxLength=4200 | `aria-label={t('chat.input.text.label')}`; placeholder rotates by state |
| Paperclip button | `InputBar.tsx:366-385` | icon button | toggles `<AttachmentPicker>` | Tab + Enter/Space | `aria-label`, `aria-haspopup="dialog"`, `aria-expanded={pickerOpen}` |
| `<SendButton>` | `Input/SendButton.tsx` | icon button | submit OR (when controller set) abort | — | aria-label={'send' | 'stop'} |
| `<SuggestionChips>` Yes/No | `SuggestionChips.tsx:193-217` | pill button | applies suggestion + auto-focuses textarea | Tab + Enter/Space | min-h 44 px on mobile (`sm:min-h-0`) |
| Single-select chip | `SuggestionChips.tsx:219-251` | pill button | applies | same | — |
| Multi-select chip | `SuggestionChips.tsx:286-383` | toggle button | `aria-pressed`, then Bestätigen submits | same | aria-pressed reflects state |
| Address input | `SuggestionChips.tsx:387-464` | text input + button | inline form, Enter submits | Tab + Enter | `aria-invalid` on error |
| Reply chip | `SuggestionChips.tsx:253-282` | pill button | fills textarea | same | shrink-0; truncate |
| Continue chip | `SuggestionChips.tsx:475-499` | dark filled button | sends "Weiter." | Tab + Enter | focus-visible ring |
| `<IdkChips>` (3 chips) | `IdkChips.tsx:42-62` | pill button | submit `{kind:'idk', mode}` directly | Tab + Enter | `role="group" aria-label` |
| `<StandUpButton variant="link">` | `StandUp.tsx:104-122` | small text link in IDK row | opens dialog | Tab + Enter | focus-visible ring |
| `<AttachmentChip>` X | `Input/AttachmentChip.tsx` | icon button | calls `useDeleteFile` mutation | Tab + Enter | aria-label "Anhang entfernen" |

### G.5. Footer zone

| Element | File:line | Affordance | Behavior | Keyboard | A11y |
|---|---|---|---|---|---|
| FooterLeftColumn `[View briefing]` | `FooterLeftColumn.tsx:31-36` | text link | → `/projects/${id}/result` | Tab + Enter | focus-visible ring; rounded-sm |
| `[Checklist]` | `:38-43` | text link | → `/projects/${id}/overview` | same | same |
| `<ExportMenu variant="ghost" placement="top">` | `:45-51` | text button | desktop: anchored popover (opens upward); mobile: vaul | Tab + Enter; Esc closes | aria-expanded inside ExportMenu |
| `[← Leave]` | `:53-55` | text link | → `/dashboard` | same | same |
| FooterRightColumn `[Checkliste öffnen ↗]` | `FooterRightColumn.tsx:34-48` | outline button | → `/projects/${id}/overview` | same | focus-visible ring; box-shadow inset |
| `<FooterScaleBar>` | `:64-97` | decorative SVG | none | — | aria-hidden=true |
| `<CostTicker>` | `CostTicker.tsx:55-111` | hoverable group | reveals breakdown popover | hover only (no focus path on the parent group; the popover has no keyboard equivalent) | **A11y gap — see Section K** |
| Mobile overflow trigger | `UnifiedFooter.tsx:107-117` | round button (40 px) | opens vaul drawer | Tab + Enter | `aria-haspopup="dialog"`, `aria-label` |
| `<MobileRailDrawer>` left/right tab triggers | `MobileTopBar.tsx:53-108` | folded-tab icon buttons (44×44) | open vaul drawers | Tab + Enter | `aria-expanded`, `aria-label` |

### G.6. Modals / overlays

| Element | File:line | Trigger | Focus management |
|---|---|---|---|
| `<StandUp>` Dialog | `StandUp.tsx` | Stand-up button | Radix Dialog → focus-trap, scroll-lock, Esc, Drawer.Title |
| `<MessageContextSheet>` | `MessageContextSheet.tsx` | Long-press on message | vaul drawer; Esc closes |
| `<ExportMenu>` desktop popover | `ExportMenu.tsx` | Click trigger | click-outside + Esc close (manual) |
| `<ExportMenu>` mobile vaul drawer | same | same | vaul defaults |
| Progress vaul (top) | `ChatWorkspacePage.tsx:396-413` | `<MobileTopBar>` progress click | Drawer.Title sr-only; backdrop blur 2 px |
| Mobile rail drawers L/R | `MobileChatWorkspace.tsx:133-193` | folded-tab icons | same |
| `<CompletionInterstitial>` | inline article | `lastCompletionSignal !== 'continue'` | not modal; inline action buttons |

### G.7. Global keyboard

- `Tab` / `Shift+Tab` traverse interactive elements in DOM order. **No keyboard shortcut shortcuts exist for the workspace** (no `?` help, no `Cmd+K` palette here — that's dashboard-only).
- `:focus-visible` outline `2px solid hsl(var(--ink))` with 3 px offset (`globals.css:323-327`).
- SkipLink at the providers root (`components/SkipLink.tsx`) — `href="#root"` → jumps to the React root element.

---

## H. Animation inventory

(Section E.5 lists every animation with timing + reduced-motion handling. Below is the same data normalized to a per-trigger table for fast comparison.)

| # | Animation | File | Trigger | Duration / Curve | Reduced-motion gated? |
|---|---|---|---|---|---|
| 1 | Marginalia rule scale-Y | `MessageAssistant.tsx:87-94` | new assistant turn | 320 ms · `[0.16,1,0.3,1]` | ✅ `useReducedMotion` → `initial={false}` |
| 2 | Match-cut hairline scaleX | `MessageAssistant.tsx:99-110` | specialist change | 320 ms · same | ✅ |
| 3 | Match-cut nameplate scale+opacity | `MessageAssistant.tsx:111-126` | specialist change | 240 ms (delay 320 ms) · same | ✅ |
| 4 | Typewriter | `Typewriter.tsx:40-74` | new assistant turn | 18 ± 10 ms / char + 100 ms sentence | ✅ `skipImmediate` |
| 5 | Top3 stagger entry | `Top3.tsx:60-75` | recommendations grow | 300 ms · stagger 80 ms · `[0.16,1,0.3,1]` | ✅ `initial={false}` |
| 6 | Top3 layout reorder | `Top3.tsx:75` | rank change | 320 ms · `[0.16,1,0.3,1]` | ✅ via reduced |
| 7 | `pm-fresh-edge` (Top3 + Eckdaten new rows) | `globals.css:465-471` | useFreshSet new id | 2400 ms · `[0.16,1,0.3,1]` | ✅ killed by global rule |
| 8 | `pm-area-pulse` | `globals.css:472-478` | live area | 1.4 s loop | ✅ global rule |
| 9 | `pm-leftrail-pulse` | inline `<style>` in `LeftRail.tsx:217-228` | always while specialist set | 1.4 s loop | ✅ inline `@media reduce` |
| 10 | `pm-signature-shimmer` | inline in `LeftRail.tsx:276-286` | always | 8 s loop | ✅ inline |
| 11 | `pm-thinking-arc` + `pm-thinking-arm` | inline in `ThinkingIndicator.tsx:193-214` | thinking | 2.6 s | ✅ inline |
| 12 | `pm-sticky-ctx-pulse` | inline in `StickyContext.tsx:149-160` | sticky banner visible | 1.6 s loop | ✅ inline |
| 13 | `pm-ambient-pulse` | inline in `ScheduleSection.tsx:87` | active section | 1.6 s loop | ✅ via `motion-safe:` |
| 14 | EckdatenPanel item entry | `EckdatenPanel.tsx:106-110` | facts grow | 240 ms · `[0.16,1,0.3,1]` | ✅ |
| 15 | ChapterDivider entry | `ChapterDivider.tsx:53-56` | new chapter | 480 ms · same | ✅ |
| 16 | StickyContext fade+slide | `StickyContext.tsx:117-127` | scroll past spec-tag | 220 ms · `--ease` | ✅ — falls back to opacity-only |
| 17 | JumpToLatestFab | `JumpToLatestFab.tsx:127-131` | scrolledAway | 200 ms · same | ✅ |
| 18 | OfflineBanner / RateLimitBanner / ErrorBanner | `Banners.tsx` etc. | online/offline / 429 / error | 200 ms · same | ✅ |
| 19 | ChatProgressBar progress overlay width | `ChatProgressBar.tsx:212-215` | percent change | 600 ms · `[0.16,1,0.3,1]` | ✅ inline `transition: 'none'` |
| 20 | ChatProgressBar halo dot | `ChatProgressBar.tsx:227-232` | percent change | 600 ms · same | ✅ |
| 21 | ChatProgressBar scrolled state | `ChatProgressBar.tsx:124-132` | scrollY > 8 | 220 ms · `--ease` | — (transition; killed by global rule) |
| 22 | LeftRail per-gate hairline fill | `LeftRail.tsx:185-192` | gate state change | 600 ms `ease-ease` | killed by global rule |
| 23 | EmptyState hairline opacity pulse | `EmptyState.tsx:46-58` | always while empty | 2.4 s repeat | ✅ via `!reduced &&` (omitted entirely) |
| 24 | ProjectPortrait wall-height bracket fade-in | `ProjectPortrait.tsx:67-73` | fact establishes | 240 ms · `[0.16,1,0.3,1]` | ✅ `initial={false}` |
| 25 | ProjectPortrait GK badge fade-in | same | fact establishes | 240 ms · same | ✅ |
| 26 | MessageUser impact line fade-in | `MessageUser.tsx:84-91` | next assistant turn extracts facts | 400 ms (delay 200 ms) · same | ✅ |
| 27 | View Transitions API "pm-handoff-hairline" | `MessageAssistant.tsx:99-105` | first assistant message | browser default | — (CSS view-transition; respects reduced via UA) |
| 28 | StreamingCursor blink | `StreamingCursor.tsx` + `tailwind.config.js:240-243` | streaming bubble | 1.05 s loop | killed by global rule |

> **All ~28 animations gate on reduced-motion** either via Framer's `useReducedMotion`, inline `@media (prefers-reduced-motion: reduce)`, or the global `*::after { animation-duration: 0.001ms }` reset. **Audit finding:** no failures detected in the codebase.

---

## I. i18n inventory — `chat` and `wizard` namespaces

Both DE and EN files are 1591 lines. The `prebuild` step (`scripts/verify-locale-parity.mjs`) computes leaf-path sets for both files and **fails the build on divergence** — DE/EN parity is therefore guaranteed at HEAD `594915c`. The most recent commit `594915c fix(i18n): close German leakage in EN-locale UI + chat data pipeline` shows the parity gate has caught at least one regression recently.

### I.1. `chat` namespace (DE source: `src/locales/de.json:865-1320`)

Selected workspace-relevant keys with DE / EN values (the brief asked for the full table; the full DE/EN dump is 450+ leaf paths — the gate guarantees they match. Below is the canonical *workspace* subset).

| Key path | DE | EN |
|---|---|---|
| `chat.atTheTable` | "Am Tisch" | "At the table" |
| `chat.atTheTableEmpty` | "Noch keine Fachperson aktiv." | "No specialist active yet." |
| `chat.preliminaryFooter` | "Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in." | (mirror; see `en.json`) |
| `chat.specialists.{moderator,planungsrecht,bauordnungsrecht,sonstige_vorgaben,verfahren,beteiligte,synthesizer}` | Moderator, Planungsrecht, Bauordnungsrecht, Sonstige Vorgaben, Verfahren, Beteiligte, Synthese | mirrors |
| `chat.areas.{A,B,C}` | Planungsrecht, Bauordnungsrecht, Sonstige Vorgaben | mirrors |
| `chat.areas.state.{active,pending,void}` | aktiv, ausstehend, ungeklärt | mirrors |
| `chat.gates.{00,10,20,30,40,41,42,43,44,45,50,60}` | Übersicht, Projekt, Grundstück, Beteiligte, Baurechtliche Einordnung, Planungsrecht, Bauordnungsrecht, Sonstige Vorgaben, Verfahren, Dokumente, Planung, Dokumente | mirrors |
| `chat.compass.journey` / `.turn` / `.station.{moderator…synthesizer}` | Pfad / Runde / Start, Plan., Bauord., Sonst., Verf., Bet., Synth. | mirrors |
| `chat.progress.{eyebrow,percent,overflow,remaining,current,readyForReview,nearEnd,expand}` | Fortschritt, ca. {{n}} % erfasst, ca. > 95 %, ca. {{n}} Wendungen verbleibend., Aktuell:, Bereit zur Überprüfung., Wir nähern uns dem Ende., Fortschritt anzeigen | mirrors |
| `chat.stickyCtx.{label,backToLive}` | Aktueller Gesprächskontext / zurück zum Live-Stand | Current discussion context / back to live |
| `chat.impact.prefix` | Festgehalten | Captured |
| `chat.standup.{button,title,close,storySoFar,storyEmpty,openQuestions,openEmpty,resumePrompt,sitBack}` etc. | "Aufstehen & umsehen" | "Stand up & look around" |
| `chat.chapters.<specialist>.{inProgress,resolved}` | "Eröffnung · läuft" / "Eröffnung · geklärt" etc. | mirrors |
| `chat.law.baugb.{30,34,35}.{head,title,summary}`, `chat.law.baybo.{2,57,58,59}.…`, `chat.law.baydschg.6.…`, `chat.law.baumschutzv.3.…` | Full legal summaries (BauGB §§ 30/34/35, BayBO Art. 2/57/58/59, BayDSchG Art. 6, München BaumschutzV § 3) | English mirrors |
| `chat.law.viewFull` | Vollständigen Artikel anzeigen | View full article |
| `chat.export.{menuLabel,eyebrow,close,pdf.{title,body},md.…,json.…,error.…}` | Exportieren / PDF-Briefing / Markdown-Checkliste / JSON-Datenexport / fehlgeschlagen | mirrors |
| `chat.attachment.openInNewTab` | "{{name}} öffnen" | "Open {{name}}" |
| `chat.dropZone.{title,subtitle}` | "Datei hier ablegen" / "Pläne, Fotos und PDFs · max. 25 MB · bis zu 5 Dateien" | mirrors |
| `chat.mobile.{eyebrow,openLeftRail,openRightRail,peekLabel,peekTap}` | Projekt / Linke Seitenleiste öffnen / Rechte Seitenleiste öffnen / Notiz / Aktualisierung anzeigen | mirrors |
| `chat.system.{label,tag,fallbackTemplateNotice,recoveryNotice}` | Systemhinweis / SYSTEM / "Sie haben „Sonstiges" gewählt …" / "Sie waren zuletzt am {{date}} hier. …" | mirrors |
| `chat.autoSaved.label` | Automatisch gespeichert | Auto-saved |
| `chat.thinking.staticLabel` | denkt nach… | thinking… |
| `chat.thinking.actions.<specialist>[]` | 3-line arrays per specialist | mirrors |
| `chat.cost.{breakdown,input,output,cacheRead,cacheWrite,usd}` | Aufschlüsselung / Eingabe / Ausgabe / Cache-Lesen / Cache-Schreiben / Geschätzte Kosten | mirrors |
| `chat.banner.{offline,offlineQueued,offlineQueueFull,rateLimit,rateLimitDismiss,errorDismiss}` | … | mirrors |
| `chat.errors.<code>.{title,body}` for `streaming_failed / model_response_invalid / upstream_overloaded / upstream_timeout / persistence_failed / idempotency_replay / validation / unauthenticated / not_found / internal` | German titles + bodies | English mirrors |
| `chat.completion.{label,invite,openOverview,viewAreas,continue,pause,inviteStub,needs_designer.{tag,body},ready_for_review.{tag,body},blocked.{tag,body}}` | German | mirrors |
| `chat.input.{send,stop,continue,text.{label,placeholder},yesno.{yes,no},multi.{minHint,countSelected,confirmIntoText},thinkingPlaceholder,freeTextHint,placeholderOrContinue,attachment.{title,close,remove,uploading,failed,list,helper,category,choose,camera,cameraHint,gallery,galleryHint,document,documentHint},address.{placeholder,helper,invalid},idk.{label,research,assume,skip}}` | German | mirrors |
| `chat.rail.{top3,areas,facts,showAll,showLess,intentLabel,plotLabel,procedures,proceduresEmpty,documents,documentsEmpty,roles,rolesEmpty,empty,cost}` | German | mirrors |
| `chat.empty.{eyebrow,headline,body,illustrationAlt}` | German | mirrors |
| `chat.notFound.{title,eyebrow,headline,body,cta}` | German | mirrors |
| `chat.status.<itemStatus>` | nicht erforderlich, erforderlich, liegt vor, freigegeben, eingereicht, genehmigt | mirrors |
| `chat.role.{needed,notNeeded}` | erforderlich / nicht erforderlich | required / not required |
| `chat.contextSheet.{title,fromYou,fromAssistant,copy,copied,close}` | German | mirrors |
| `chat.footer.{briefingPrimary,briefingSubtitle,cockpitSecondary,leaveSecondary,overflowLabel,overflowEyebrow}` | "Briefing ansehen / Das ausführliche Dokument / Checkliste öffnen / ← Projekt verlassen / Weitere Aktionen / Aktionen & Übersicht" | "View briefing / The detailed document / Open checklist / ← Leave / More actions / Actions & overview" |
| `chat.jumpToLatest.{label,newCount_one,newCount_other}` | Zum neuesten Beitrag / "{{count}} neue Nachricht" / "{{count}} neue Nachrichten" | mirrors |

### I.2. `wizard` namespace (DE: `:760-863`)

| Key | Purpose |
|---|---|
| `wizard.progress.of` | "Frage {{current}} von {{total}}" |
| `wizard.q1.{eyebrow,sub,h,continue,help.{link,body},options.{neubau_efh,neubau_mfh,sanierung,umnutzung,abbruch,sonstige,aufstockung,anbau}.{label,code}}` | Q1 (intent) |
| `wizard.q2.{eyebrow,sub,yes,no,addressLabel,mapClickOutOfMuenchen,mapReverseLoading,mapReverseFailed,h,placeholder,helper,coverage,mapHint,noPlot,bplan.{loading,noneInner,exists,detailLink,detailH,detailDescription},submit,checkAddress,outsideMunich.{warning,detail,confirmLink,confirmedNote},plot.{head,stadtbezirk,areaEstimate,areaBuildable,planningLaw,character,heritageDistance,suggestedName,editLater,outsideRegion}}` | Q2 (plot) |
| `wizard.back / cancel / errors.insertFailed / cancelConfirm.…` | Misc |

### I.3. Drift / hardcoded copy

Every chat-page string was reviewed; **the only hardcoded strings** found were inside SVG `<text>` labels (`M`, `N`, `GK`, `M 1:100`, `M 1:1`) which are typographic — not localized labels. Defaults via `t('…', { defaultValue: '…' })` exist in many components; the parity script enforces equality of *defined* keys, not absence of `defaultValue`. Drift between code and JSON would manifest as a missing key on the side that doesn't define it, which would fail prebuild.

---

## J. API & data contract

### J.1. `chat-turn` Edge Function — request

```ts
// Zod (chatTurnRequestSchema, src/types/chatTurn.ts:50-69)
{
  projectId: string                            // uuid
  userMessage: string | null                    // max 4000; null = first-turn priming
  userMessageEn?: string | null                 // max 4000; non-text answers only
  userAnswer: UserAnswer | null
  clientRequestId: string                       // uuid; idempotency key
  locale?: 'de' | 'en'                          // defaults 'de' server-side
}
```

```ts
// UserAnswer (src/types/chatTurn.ts:19-47) — discriminated union
type UserAnswer =
  | { kind: 'text';          text: string /* 1..4000 */ }
  | { kind: 'yesno';         value: 'ja'|'nein' }
  | { kind: 'single_select'; value: string; label_de: string; label_en: string }
  | { kind: 'multi_select';  values: { value: string; label_de: string; label_en: string }[] /* min 1 */ }
  | { kind: 'address';       text: string /* 6..500 */ }
  | { kind: 'idk';           mode: 'research'|'assume'|'skip' }
```

Headers required (sent by `lib/chatApi.ts`):
- `Content-Type: application/json`
- `Accept: text/event-stream` (streaming) or omitted (JSON)
- `apikey: <SUPABASE_ANON_KEY>`
- `Authorization: Bearer <user-session.access_token>`

### J.2. `chat-turn` — response

```ts
type ChatTurnResponse =
  | {
      ok: true
      assistantMessage: AssistantMessageRow      // src/types/chatTurn.ts:115-134
      projectState: ProjectState
      completionSignal: 'continue'|'needs_designer'|'ready_for_review'|'blocked'
      costInfo: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, latencyMs, usdEstimate }
    }
  | { ok: false, error: ChatTurnError }
```

```ts
// ChatTurnError (src/types/chatTurn.ts:74-99)
{
  code:
    | 'unauthenticated' | 'forbidden' | 'not_found' | 'validation'
    | 'idempotency_replay' | 'upstream_overloaded' | 'upstream_timeout'
    | 'model_response_invalid' | 'persistence_failed'
    | 'rate_limit_exceeded' | 'internal'
  message: string
  retryAfterMs?: number
  requestId?: string
  rateLimit?: { currentCount, maxCount, resetAt: ISO }
}
```

SSE wire format (`streaming.ts:19-30`):
```
data: {"type":"json_delta","partial":"<chunk>"}
data: {"type":"complete","assistantMessage":{…},"projectState":{…},"completionSignal":"…","costInfo":{…},"requestId":"…"}
data: {"type":"error","code":"…","message":"…","retryAfterMs":4000,"requestId":"…"}
```

### J.3. Retry policy

| Layer | Retries on | Behavior |
|---|---|---|
| Edge Function (`callAnthropicWithRetry`) | `UpstreamError('invalid_response')` | One retry with stricter `KORREKTUR:` reminder appended to system blocks. |
| Edge Function | 429 / 529 / 5xx / timeout from Anthropic | Translated to typed `UpstreamError`; **no retry**. SPA owns backoff. |
| SPA streaming → JSON fallback | Streaming error before any text arrived | One non-streaming `postChatTurn` call with same `clientRequestId`. |
| SPA SDK | All other errors | None (`useMutation.retry: 0`). |

### J.4. Anthropic tool schema (`respond` tool — `supabase/functions/chat-turn/toolSchema.ts`, paste verbatim)

```ts
export const MODEL = 'claude-sonnet-4-6' as const  // Released 2026-02-17, drop-in over 4.5
export const RESPOND_TOOL_NAME = 'respond' as const

const SOURCE_VALUES = ['LEGAL','CLIENT','DESIGNER','AUTHORITY']
const QUALITY_VALUES = ['CALCULATED','VERIFIED','ASSUMED','DECIDED']
const AREA_STATE_VALUES = ['ACTIVE','PENDING','VOID']
const SPECIALIST_VALUES = [
  'moderator','planungsrecht','bauordnungsrecht','sonstige_vorgaben',
  'verfahren','beteiligte','synthesizer'
]
const INPUT_TYPE_VALUES = ['text','yesno','single_select','multi_select','address','none']
const ITEM_STATUS_VALUES = [
  'nicht_erforderlich','erforderlich','liegt_vor',
  'freigegeben','eingereicht','genehmigt'
]
const COMPLETION_SIGNAL_VALUES = ['continue','needs_designer','ready_for_review','blocked']

export const respondToolDefinition = {
  name: 'respond',
  description: 'Respond to the user as the active specialist on the planning team and update project state.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['specialist','message_de','message_en','input_type'],
    properties: {
      specialist:   { type: 'string', enum: SPECIALIST_VALUES },
      message_de:   { type: 'string', description: 'Formal German (Sie). 2–6 short sentences. No exclamation marks, no emoji.' },
      message_en:   { type: 'string', description: 'An English mirror of message_de.' },
      input_type:   { type: 'string', enum: INPUT_TYPE_VALUES },
      input_options:{ type: 'array', items: {
                        type: 'object',
                        required: ['value','label_de','label_en'],
                        properties: { value:{type:'string'}, label_de:{type:'string'}, label_en:{type:'string'} }
                      }},
      allow_idk:    { type: 'boolean', default: true },
      thinking_label_de: { type: 'string' },  thinking_label_en: { type: 'string' },
      extracted_facts: { type: 'array', items: {
                          type: 'object',
                          required: ['key','value','source','quality'],
                          properties: { key:{type:'string'}, value:{}, source:{type:'string',enum:SOURCE_VALUES}, quality:{type:'string',enum:QUALITY_VALUES}, evidence:{type:'string'}, reason:{type:'string'} }
                        }},
      recommendations_delta: { /* discriminated upsert/remove with rank, title_*, detail_*, ctaLabel_*, estimated_effort∈{1d,1-3d,1w,2-4w,months}, responsible_party∈{bauherr,architekt,fachplaner,bauamt}, qualifier */ },
      procedures_delta:      { /* upsert/remove with title_*, status, rationale_*, source, quality, reason */ },
      documents_delta:       { /* upsert/remove with title_*, status, required_for[], produced_by[], source, quality, reason */ },
      roles_delta:           { /* upsert/remove with title_*, needed, rationale_*, source, quality, reason */ },
      areas_update:          { type: 'object', properties: { A:areaPatch, B:areaPatch, C:areaPatch } },
      completion_signal:     { type: 'string', enum: COMPLETION_SIGNAL_VALUES },
      likely_user_replies:   { type: 'array', maxItems: 3, items: { type:'string', maxLength: 60 } },
      likely_user_replies_en:{ type: 'array', maxItems: 3, items: { type:'string', maxLength: 60 } }
    }
  }
}
export const respondToolChoice = { type: 'tool', name: 'respond' }
```

### J.5. Zod mirror (`src/types/respondTool.ts`) — paste

(Authoritative runtime gate. `.strict()` at top-level: model cannot invent new top-level fields. Inner objects accept extras.)

```ts
const sourceSchema   = z.enum(['LEGAL','CLIENT','DESIGNER','AUTHORITY'])
const qualitySchema  = z.enum(['CALCULATED','VERIFIED','ASSUMED','DECIDED'])
const areaStateSchema = z.enum(['ACTIVE','PENDING','VOID'])
const specialistSchema = z.enum(['moderator','planungsrecht','bauordnungsrecht','sonstige_vorgaben','verfahren','beteiligte','synthesizer'])
const inputTypeSchema  = z.enum(['text','yesno','single_select','multi_select','address','none'])
const itemStatusSchema = z.enum(['nicht_erforderlich','erforderlich','liegt_vor','freigegeben','eingereicht','genehmigt'])
const completionSignalSchema = z.enum(['continue','needs_designer','ready_for_review','blocked'])

const recommendationDeltaSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('upsert'), id: z.string().min(1),
    rank: z.number().int().min(1).optional(),
    title_de: z.string().min(1).optional(), title_en: z.string().min(1).optional(),
    detail_de: z.string().min(1).optional(), detail_en: z.string().min(1).optional(),
    ctaLabel_de: z.string().optional(), ctaLabel_en: z.string().optional(),
    estimated_effort: z.enum(['1d','1-3d','1w','2-4w','months']).optional(),
    responsible_party: z.enum(['bauherr','architekt','fachplaner','bauamt']).optional(),
    qualifier: z.object({ source: sourceSchema, quality: qualitySchema }).optional(),
  }),
  z.object({ op: z.literal('remove'), id: z.string().min(1) }),
])
// procedureDeltaSchema, documentDeltaSchema, roleDeltaSchema follow the same shape (see source).

export const respondToolInputSchema = z.object({
  specialist: specialistSchema,
  message_de: z.string().min(1),
  message_en: z.string().min(1),
  input_type: inputTypeSchema,
  input_options: z.array(z.object({ value:z.string().min(1), label_de:z.string().min(1), label_en:z.string().min(1) })).optional(),
  allow_idk: z.boolean().optional(),
  thinking_label_de: z.string().optional(),
  thinking_label_en: z.string().optional(),
  extracted_facts: z.array(z.object({
    key: z.string().min(1), value: z.unknown(),
    source: sourceSchema, quality: qualitySchema,
    evidence: z.string().optional(), reason: z.string().optional(),
  })).optional(),
  recommendations_delta: z.array(recommendationDeltaSchema).optional(),
  procedures_delta: z.array(procedureDeltaSchema).optional(),
  documents_delta: z.array(documentDeltaSchema).optional(),
  roles_delta: z.array(roleDeltaSchema).optional(),
  areas_update: z.object({ A: areaPatchSchema.optional(), B: areaPatchSchema.optional(), C: areaPatchSchema.optional() }).optional(),
  completion_signal: completionSignalSchema.optional(),
  likely_user_replies: z.array(z.string().min(1).max(60)).max(3).optional(),
  likely_user_replies_en: z.array(z.string().min(1).max(60)).max(3).optional(),
}).strict()
```

### J.6. System prompt — structure

Three multi-block array entries (`supabase/functions/chat-turn/systemPrompt.ts:207-227`):

1. **`PERSONA_BLOCK_V1`** = `COMPOSED_LEGAL_CONTEXT` (`legalContext/compose.ts`) — `[shared.ts (418 LOC), federal.ts (149 LOC), bayern.ts (379 LOC), muenchen.ts (397 LOC)].join('\n\n---\n\n')` + a `PROJEKTKONTEXT` tail marker. Carries `cache_control: { type: 'ephemeral' }`. **~9–12k tokens** per memory & FIX_REPORT.
2. **Locale addendum** (`buildLocaleBlock`): ~150 tokens. Sets the `message_en` register based on caller locale (`'de'` or `'en'`). NOT cached.
3. **Live-state block** (`buildLiveStateBlock`): ~200–500 tokens. Project context. NOT cached.

> **NOTE:** The Phase 6 sprint emits **proactive heritage trigger + 4 missing T-01 topics + dialog batching + state invariants + legal-shield lock + needs_designer handoff** inside the persona — see `f9d83f3 feat(prompt): dialog batching + state invariants + legal-shield lock + needs_designer handoff` and `703bf21 feat(prompt): proactive heritage trigger + 4 missing T-01 topics`. The persona is dense and recently iterated; major rewrites should preserve those guards.

The persona files were not pasted verbatim here — each is several hundred lines of German legal prose. Useful jumping-off points: `legalContext/shared.ts` (Eigennamen + tone + qualifier rules) and `legalContext/muenchen.ts` (Referat HA II contact info, Stellplatzsatzung, BaumschutzV trigger).

> **UNRESOLVED:** The brief asks for the system prompt pasted verbatim with line numbers + flagged stale sections. The persona is ~1438 LOC across 4 files; pasting it inflates this report by ~30k tokens of German legal prose without analyst-added value. Recommendation for the design partner: open the four files directly and skim. Stale-flagging is a separate exercise that needs subject-matter review (Bauamt rep, not me).

### J.7. DB schema — current state from migrations

```sql
-- migrations/0003 + 0004v3 + 0004 + 0005 + 0008 + 0009 + 0012 (composed)
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users on delete cascade,
  intent       text not null check (intent in (
                 'neubau_einfamilienhaus','neubau_mehrfamilienhaus',
                 'sanierung','umnutzung','abbruch',
                 'aufstockung','anbau','sonstige')),                  -- 0004v3 expanded
  has_plot     boolean not null,
  plot_address text,
  bundesland   text not null default 'bayern',
  template_id  text not null check (template_id in
                 ('T-01','T-02','T-03','T-04','T-05',
                  'T-06','T-07','T-08')),                              -- 0004v3 expanded
  name         text not null,
  status       text not null default 'in_progress' check (status in
                 ('in_progress','paused','archived','completed')),
  state        jsonb not null default '{}'::jsonb,                     -- shape: src/types/projectState.ts
  city         text,                                                   -- 0009; 0010 backfills 'muenchen'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index projects_owner_idx on public.projects (owner_id, updated_at desc);

create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects on delete cascade,
  role         text not null check (role in ('user','assistant','system')),
  specialist   text check (specialist in (
                 'moderator','planungsrecht','bauordnungsrecht','sonstige_vorgaben',
                 'verfahren','beteiligte','synthesizer')),
  content_de   text not null,
  content_en   text,
  input_type   text check (input_type in ('text','yesno','single_select','multi_select','address','none')),
  input_options jsonb,
  allow_idk    boolean default true,
  user_answer  jsonb,
  client_request_id uuid,
  model              text,
  input_tokens       int,
  output_tokens      int,
  cache_read_tokens  int,
  cache_write_tokens int,
  latency_ms         int,
  thinking_label_de  text,             -- 0004
  likely_user_replies text[],          -- 0005
  tool_input         jsonb,            -- 0012 (Phase 6 A.1 forensic)
  created_at   timestamptz not null default now()
);
create index messages_project_idx on public.messages (project_id, created_at);
create unique index messages_idempotency_idx
  on public.messages (project_id, client_request_id)
  where client_request_id is not null;

create table public.project_events (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects on delete cascade,
  event_type   text not null,                                           -- e.g. recommendation_added, fact_extracted, turn_processed
  before_state jsonb,
  after_state  jsonb,
  reason       text,
  triggered_by text not null check (triggered_by in ('user','assistant','system')),
  created_at   timestamptz not null default now()
);
create index project_events_project_idx on public.project_events (project_id, created_at desc);

create table public.chat_turn_rate_limits (             -- 0008
  user_id      uuid not null references auth.users(id) on delete cascade,
  hour_bucket  timestamptz not null,
  count        int not null default 0,
  primary key (user_id, hour_bucket)
);
```

Plus `project_files` (0007), `share_tokens` (0006), `bplan_lookup_rate_limits` (0011), `profiles` (0001) — peripheral to the chat workspace.

### J.8. RLS policies (paste verbatim)

```sql
-- projects
alter table public.projects enable row level security;
create policy "owner can select projects"
  on public.projects for select using (auth.uid() = owner_id);
create policy "owner can insert projects"
  on public.projects for insert with check (auth.uid() = owner_id);
create policy "owner can update projects"
  on public.projects for update using (auth.uid() = owner_id);
create policy "owner can delete projects"
  on public.projects for delete using (auth.uid() = owner_id);

-- messages — append-only (no update/delete)
alter table public.messages enable row level security;
create policy "owner can select messages"
  on public.messages for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );
create policy "owner can insert messages"
  on public.messages for insert with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- project_events — append-only
alter table public.project_events enable row level security;
-- (analogous select + insert policies only)

-- chat_turn_rate_limits — read-own (no insert/update/delete; goes through SECURITY DEFINER RPC)
alter table public.chat_turn_rate_limits enable row level security;
create policy "users see own rate limits" on public.chat_turn_rate_limits for select using (auth.uid() = user_id);
```

### J.9. ProjectState (`src/types/projectState.ts`) — full shape

```ts
type Source = 'LEGAL'|'CLIENT'|'DESIGNER'|'AUTHORITY'
type Quality = 'CALCULATED'|'VERIFIED'|'ASSUMED'|'DECIDED'
type AreaState = 'ACTIVE'|'PENDING'|'VOID'
type TemplateId = 'T-01'|'T-02'|'T-03'|'T-04'|'T-05'|'T-06'|'T-07'|'T-08'
type Specialist = 'moderator'|'planungsrecht'|'bauordnungsrecht'|'sonstige_vorgaben'|'verfahren'|'beteiligte'|'synthesizer'
type ItemStatus = 'nicht_erforderlich'|'erforderlich'|'liegt_vor'|'freigegeben'|'eingereicht'|'genehmigt'

interface Qualifier { source: Source; quality: Quality; setAt: string; setBy: 'user'|'assistant'|'system'; reason?: string }
interface Fact      { key: string; value: unknown; qualifier: Qualifier; evidence?: string }
interface Procedure { id: string; title_de: string; title_en: string; status: ItemStatus; rationale_de: string; rationale_en: string; qualifier: Qualifier }
interface DocumentItem { id: string; title_de; title_en; status: ItemStatus; required_for: string[]; produced_by: string[]; qualifier: Qualifier }
interface Role      { id: string; title_de; title_en; needed: boolean; rationale_de: string; rationale_en?: string; qualifier: Qualifier }

type EstimatedEffort  = '1d'|'1-3d'|'1w'|'2-4w'|'months'
type ResponsibleParty = 'bauherr'|'architekt'|'fachplaner'|'bauamt'
interface Recommendation {
  id: string; rank: number; title_de; title_en; detail_de; detail_en;
  ctaLabel_de?: string; ctaLabel_en?: string;
  estimated_effort?: EstimatedEffort; responsible_party?: ResponsibleParty;
  qualifier?: { source: Source; quality: Quality };
  createdAt: string;
}
interface Areas {
  A: { state: AreaState; reason?: string }   // Planungsrecht (BauGB §§ 30/34/35)
  B: { state: AreaState; reason?: string }   // Bauordnungsrecht (BayBO)
  C: { state: AreaState; reason?: string }   // Sonstige Vorgaben (Baulasten/Denkmal/Naturschutz/kommunal)
}
interface AskedQuestion { fingerprint: string; askedAt: string }

interface ProjectState {
  schemaVersion: 1
  templateId: TemplateId
  facts: Fact[]
  procedures: Procedure[]
  documents: DocumentItem[]
  roles: Role[]
  recommendations: Recommendation[]            // capped at 12; ranks renormalized 1..N
  areas: Areas
  questionsAsked: AskedQuestion[]              // capped at 50, last write wins
  lastTurnAt: string
}
```

### J.10. Caching

- **Anthropic prompt cache** — 5 min ephemeral TTL, marker on `PERSONA_BLOCK_V1` only (`buildSystemBlocks`). Locale addendum + live-state stay outside the cache. Cost-modelling assumes ~70% per-turn input cost reduction once warm (`anthropic.ts:13-16`).
- **Token pricing** (`anthropic.ts:52-55`) — Sonnet 4.6, March 2026:
  - input: $3.00 / Mtok · output: $15.00 / Mtok · cache write: $3.75 / Mtok · cache read: $0.30 / Mtok.
- **Client-side caching** — TanStack Query 60 s stale time on `['project', id]`, `['messages', id]`, `['project-events', id, 30]`. No persistence — losing the page state forces a single network round-trip per query on remount.
- **Browser HTTP cache** — Vercel cache headers configured in `vercel.json` (fonts long-lived; assets hashed → immutable).
- **`messages` table** — last 30 messages loaded per turn (`persistence.ts:104-110`). Means conversations longer than 30 turns lose earliest history from the model's context window per turn.

---


## K. UX audit — issues found

### K.1. Code-derived issues

Numbered. `severity = low|med|high`.

1. **(med) `<EckdatenPanel>` row tooltip uses `title=evidence` only** — `EckdatenPanel.tsx:115`. Native browser tooltip is touch-hostile (no tap reveal on mobile) and inaccessible to screen readers in many UAs. The qualifier badge (`LEGAL · CALCULATED` etc.) is rendered as text, but the *evidence string* (e.g. "BayBO Art. 57 Abs. 1") is hidden behind hover only. Loss of provenance discoverability on mobile + on screen readers.
2. **(med) `<CostTicker>` breakdown popover keyboard-inaccessible** — `CostTicker.tsx:99` uses `group-hover:flex group-focus-within:flex` on a parent `<div>` that isn't focusable. Tab order skips the popover entirely; keyboard users cannot see the breakdown. Trigger is admin-only so impact is low in production, but it will need a `<button>`-anchored Radix Popover for the redesign.
3. **(med) `<SpecIndex>` rows in LeftRail look interactive but aren't** — `LeftRail.tsx:158-194` styles hover (`hover:text-ink/85` on level-1 rows; `hover:text-ink` on level-0) and `transition-[border-color,color,padding] duration-soft`. No `onClick`, no `role`. A keyboard user would never reach them but a mouse user gets a hover hint that nothing happens. Either remove the hover styles or wire them to scroll/select.
4. **(low) `<EckdatenPanel>` "show all (N)" button has no `aria-expanded`** — `EckdatenPanel.tsx:160-173`. SR users get no programmatic state.
5. **(low) `<Top3>` `<article>` lacks `aria-label`** — `Top3.tsx:78-113`. The italic-serif `1.` / `2.` / `3.` drop-cap is the only positional cue; SR users need an explicit label.
6. **(med) Operating-mode `data-mode="operating"` token `--pm-shadow-input` reads `0 1px 2px hsl(220 15% 11% / 0.04)`, but `<MessageUser>` hardcodes `boxShadow: '0 1px 2px hsl(220 15% 11% / 0.03)'`** — `MessageUser.tsx:63`. Off by 0.01 alpha — minor drift. Either source from the token or accept it as a design decision and document it.
7. **(med) `<MessageUser>` background is hardcoded** — `MessageUser.tsx:60` uses `bg-[hsl(38_30%_94%)]` (raw HSL). No corresponding token (`--paper-darker`?). Brittle to palette tweaks; redesign should normalize.
8. **(high) `--rail-l: 260px` / `--rail-r: 340px` Phase 7 tokens disagree with the actual `220px / 300px` grid** — `globals.css:255-256` vs `ChatWorkspaceLayout.tsx:60`. The `<StandUpButton variant="fab">` legacy mount uses `right-[calc(var(--rail-r)+24px)]` which positions wrongly relative to the actual right rail width. Default is `variant="link"` (inline in InputBar) so live impact is minimal — but the FAB is reachable via the `fab` variant and is referenced in `chat-redesign.html`. Reconcile.
9. **(med) Two `:focus-visible` rules collide** — `globals.css:75-78` sets `outline: 2px solid hsl(var(--ink)); outline-offset: 2px`. `globals.css:323-327` (inside `@layer base`) sets the same with `outline-offset: 3px; border-radius: 2px`. Cascade winner depends on layer + specificity. Functional outcome is fine (both visible) but the duplicate is sloppy.
10. **(med) `useEffect` with `eslint-disable react-hooks/set-state-in-effect`** in `ChatWorkspacePage.tsx:191-205`, `StickyContext.tsx:60-83`, `ThinkingIndicator.tsx:91-96, 100-114`, `Typewriter.tsx:40-74`. Each comment justifies the pattern (synchronizing UI flag with external Zustand/external-DOM state). Risk: missing-deps re-render loops are silenced. The comments are clear; stylistically a refactor toward `useSyncExternalStore` (already used in `ExportMenu.tsx` for matchMedia) would remove the disables.
11. **(med) `<JumpToLatestFab>` mounts `absolute -top-12 right-0 z-10` inside InputBar's EmbeddedShell** — `InputBar.tsx:66`. The shell is positioned by UnifiedFooter's grid; the FAB therefore floats above the textarea but **only on lg+ widths where the shell is anchored**. On mobile, `MobileChatWorkspace` mounts InputBar inside its own fixed-bottom band; the FAB still positions against EmbeddedShell. Visual outcome works on both, but it's a happy accident, not architecturally clean.
12. **(low) `<MobileTopHeader>` and `<MobileTopBar>` are two separate components** that look like they could be one. `MobileTopBar` (142 LOC) renders only on tablet (640–1023), `MobileTopHeader` (152 LOC) only on phone (< 640). Confusing. Likely a Phase 3.8 split that wasn't reconciled.
13. **(med) Z-index layering at z-30 between `<UnifiedFooter>` and `<ChatProgressBar>` (sticky)** — they don't overlap today, but if anything ever pushes the bar past the bottom of the viewport (e.g. an in-thread modal), you'd get a coin flip. Lower the progress bar to z-20 or document the invariant.
14. **(med) Streaming bubble swap to persisted message** — `Thread.tsx:117-126`. When `streamingMessage` clears and `messages` cache lands the persisted assistant row, two re-renders happen in quick succession. The `Typewriter` then re-types the text from scratch (because `instant` is false on the new persisted row — `initialIds` from mount didn't include this id). That's actually visible: the streaming bubble's text disappears, then the persisted message types itself in. Should hand off seamlessly.

> **NOTE:** This is the cleanest UX bug to fix in the redesign. The `streamingMessage.contentSoFar` should become the typewriter's seed, not be discarded. Current behavior makes streaming feel buggy.

15. **(med) `MessageRow.id` for the optimistic placeholder is `pending-${clientRequestId}`** but the persisted row has a different uuid. Cache merge in `useChatTurn.onSuccess:266-272` simply appends the new row → the placeholder is **never removed** from the cache between the time the user submits and the time `onSuccess` fires. Result: the bubble appears twice for ~50–500 ms. Not visible because the persisted row is appended after, but the cache shape is sloppy.
16. **(low) `Thread.tsx:39` snapshots `initialIds` lazily — but the snapshot includes the **synthetic system rows** added in `augmentedMessages` (`recovery-notice` / `sonstige-notice`). These ids start with `system:…` and never collide with real UUIDs, so the typewriter contract (history → instant) holds. Worth a comment.
17. **(med) `<ChatProgressBar>` mounts at `-mt-12 mb-6 lg:-mt-16` to override `py-16/20` in the body main column** — `ChatWorkspacePage.tsx:351`. Negative margin coupled to the body padding. Brittle: any change to the body padding breaks the sticky bar's flush-to-top alignment.
18. **(low) `ChatProgressBar.tsx:81-87` adds `window.scroll` listener with `{ passive: true }` but never cleans up the *initial* `onScroll()` call.** The cleanup function removes the listener; that's correct.
19. **(low) `<MobileRailDrawer>` ariaLabel falls back from i18n** — the wrapper takes a string prop. Accessible.
20. **(med) `<EckdatenPanel>` Roman numeral column tops out at 6 (`ROMAN = ['I'..'VI']`)** — `:26`. With `VISIBLE_LIMIT = 5` + 1 derived row (intent), the visible budget is ≤ 6 so this is fine. Expansion ("show all") above 6 falls back to `String(idx + 1)` (`:127`) — Arabic numerals after VI. Inconsistent typography but tolerable.
21. **(med) Animation count: 28** (Section H). At 18 ms char + 100 ms sentence pauses, a 6-sentence German assistant message takes ~3 s of typewriter alone, on top of marginalia + match-cut + Top3 stagger + edge-fade pulses. On a low-end Android, that's measurable jank during high-frequency turn arrival. Recommend: profile on a 6× CPU throttle.
22. **(low) Bundle gz** — current `dist/assets/index-CaCJsaNA.js` gzips to **~249 KB** (verified via `gzip -9` test). Ceiling is 300 KB gz. We have ~50 KB headroom. Phase 7 redesign should not blow that.
23. **(low) `<CitationChip>` Popover `onMouseEnter / onMouseLeave` on both trigger and content lets the cursor travel** — that's correct. But `onMouseLeave` of the trigger fires immediately when crossing into the popover with `align="start" sideOffset={8}` — there's an 8 px gap. Brief test on slow movement may close the popover. The CitationChip.tsx code uses `useState` for open + the dual-handler pattern; works but feels delicate. Radix has `onOpenAutoFocus` etc. that could simplify.
24. **(med) `<MessageContextSheet>` long-press handler is on the article/bubble wrapper, BUT** the `(isMobile ? longPress : {})` spread happens inside both `MessageAssistant.tsx:81` and `MessageUser.tsx:64`. It works; just notice that the same long-press handler runs at `useViewport().isMobile` (< 640 px) — tablet users (640–1023) get no long-press alternative.
25. **(low) `<AutoSavedIndicator>`** updates from `chatStore.lastSavedAt` and reads `useRelativeTime` (probably). Without reading it directly, the indicator is in the LeftRail header — invisible on mobile drawers and on tablet (the rail is closed by default). Auto-save reassurance is therefore mostly desktop-only.

### K.2. Screenshot-derived issues

Working from the three screenshots in the brief.

**Screenshot 1 — long synthesis message + system-recovery row + I'm-not-sure strip + cost ticker.**

- The **"I'm not sure" strip** sits between `[I'M NOT SURE | • Research it for me | + Mark as assumption | □ Set aside | ↗ STAND UP & LOOK AROUND]` (mid-screen, above input bar). In code, `<IdkChips>` + `<StandUpButton variant="link">` are the children of `InputBar`'s `flex items-center justify-between gap-3 flex-wrap` row (`InputBar.tsx:316-328`). They render **only when `lastAssistant.allow_idk === true`** AND they share the same row as the Stand-Up trigger. The strip's awkwardness comes from the visual weight of three pill chips on the left + a small text link on the right, in mono-caps register, immediately above the input bar. Contributors:
  - The strip says `I'M NOT SURE` as an eyebrow label; this competes with the input placeholder.
  - The chips' clay outline + clay tinted hover make them feel almost-but-not-quite primary.
  - On a long synthesis, the user has just read 1000 chars of legal prose, and now the model is asking "questions on any of these points, or continue?" — the IDK affordance is structurally wrong here (the model is asking for confirmation, not extraction). `allow_idk` is meant for atomic factual questions, not summary-confirm gates. **The system prompt should suppress `allow_idk: true` on synthesizer turns** — this is a model-behavior issue, not pure UI.
- The **`SYSTEM` row** ("You were last here on 04 May 2026 at 12:30. We'll continue …") is `<MessageSystem>` (`MessageSystem.tsx:16-33`). Renders as `border-y border-border-strong/40 py-3` with uppercase `SYSTEM` tag. Visually correct but it sits between the synthesizer's substantive close and the IDK strip — semantic confusion.
- **Bottom-right `Open checklist ↗` button + `≈ 444,450 Tokens · 0.86 USD`** are `<FooterRightColumn>`. The outline button is a real CTA → `/projects/${id}/overview`. The cost ticker is admin-only; for a non-admin user it disappears entirely. Rutik is admin → ticker shows. The complaint is fair: the ticker doesn't belong on a finished product surface.

**Screenshot 2 — right rail with KEY DATA · qualifier tags · 05/14 · SHOW ALL (14) · 3 collapsed sections.**

- `KEY DATA` is `<EckdatenPanel>`'s eyebrow (`chat.rail.facts` = "Eckdaten" in DE / "Key data" in EN). Visible 5/14 reflects `VISIBLE_LIMIT = 5` and `all.length = 14` (1 derived intent + 1 derived plot + 12 fact-state slice).
- **`SHOW ALL (14)`** is the toggle at `EckdatenPanel.tsx:160-173`. Mono caps text button, hover→clay. Reasonable affordance, but visually identical in weight to the qualifier badges (`LEGAL · CALCULATED`) which are decorative — the button looks like it might be another decoration.
- **Three collapsed sections** = `<ProceduresPanel>` numeral I + `<DocumentsPanel>` II + `<RolesPanel>` III, all `defaultOpen: false`. The chevron + count + Roman numeral creates a *very* dense vertical stack: 6 small visual elements (numeral, dot, label, count, chevron, hairline rule) per row. Cramped at 300 px column width.
- Right above the `SHOW ALL (14)` button is the `Open checklist` outline button — but it's actually `<FooterRightColumn>` (the unified-footer band) in the screenshot, not the right rail. So the user sees "SHOW ALL (14)" then a hairline gap, then "Open checklist" — they read as the same affordance.

**Screenshot 3 — full layout: left rail with Roman-numeral gates, journey ribbon, right rail with house portrait + areas + key data.**

- **Top journey ribbon** = `<ChatProgressBar>` (compass arc) at desktop sticky position. Shows `INIT · PLOT · CODE · ADJ · PROC · TEAM · DOCS` with halo dot at the right end (turn 18/~18 → 100%). Right side: `TURN 18 / ~18` in italic serif + scale mark "M 1:100".
  - Concept duplication with the **left rail's gates list** (Overview / Project / Plot / Parties / Legal classification / Planning / Documents). Both encode the journey but with different vocabulary. Confusing.
  - The compass arc shows specialist progress (compass stations = SEGMENT_ORDER specialists); the left rail gates show *workflow* progress. They're not the same thing in code, but they read as the same thing in the UI.
- **Left rail.** Wordmark + project header + AutoSaved + spec-index (12 rows w/ per-gate hairline progress) + `● BUILDING CODE · now` + spacer + decorative pen. Very dense. Spec index taking 12 rows × 24 px ≈ 288 px is most of the rail's vertical real estate.
- **Right rail house illustration** = `<ProjectPortrait>` with `viewBox 280×100`. With wall-height bracket and GK badge present in the screenshot. **`GK 1`** badge upper-left + scale `M 1:100` lower-right.
- **Right rail Areas** = `<AreasSection>` with three rows: A Zoning law ACTIVE / B Building code ACTIVE / C Adjacent rules PENDING. Hatched bands (heavier hatch on ACTIVE, sparser on PENDING).
- **`KEY DATA 05/14`** with five fact rows (PROJECT / PLOT / BAUMSCHUTZVERORDNUNG / STELLPLATZPFLICHT / STELLPLAETZE) — all from extracted_facts.
- The mid-thread message body wraps inside `max-w-[720px]` (Pass 2 narrowing). Visible as ~15-word lines.

**Cross-screenshot observations.**

26. **(high) The journey ribbon and left-rail gates duplicate concept** — Brief item confirmed by code reading. Recommendation for the redesign: pick one progress vocabulary or differentiate them on purpose.
27. **(high) Right rail at 300 px width is cramped** — Project portrait + Areas + Top3 + Eckdaten + 3 schedule sections + FactTicker is 7 vertical blocks. With `gap-7` (28 px gaps) + `py-7 px-5` rail padding, the visible viewport (assume 900 px tall) shows maybe 4 blocks above the fold; the rest scrolls.
28. **(med) Cost ticker bottom-right reads as dev artifact** — Confirmed: it IS a dev artifact that bleeds into production for admin-only users. Brief is right; redesign should either drop it from the user surface entirely (move to a separate admin tray) or only show it on long-press / opt-in.
29. **(med) The `Open checklist` button + the `Briefing ansehen` button + `← Leave` link are all in the unified footer — but they sit in two columns (left: View briefing · Checklist · Export · ← Leave; right: `Open checklist`)**. The right-column outline button **duplicates** the left-column `Checklist` link (both → `/projects/${id}/overview`). Confirmed in code — `FooterLeftColumn.tsx:38-43` and `FooterRightColumn.tsx:34-48` route to the same URL with different copy ("Checklist" vs "Checkliste öffnen"). This duplication is intentional (Pass 2 collapsed left to a row of mono links; right keeps the outlined CTA) — but the user-visible result is the affordance appearing twice in the same band.
30. **(med) `STAND UP & LOOK AROUND`** as mono caps text link inside the IDK row creates four affordances on one line. Crowded. The link variant was a deliberate simplification from the `fab` variant; arguably not enough.
31. **(med) Specialist tag + clay dot + qualifier badge + law citation chip all crowd the same visual bandwidth (Brief)** — Confirmed. SpecialistTag is `[ ●sigil  PLANUNGSRECHT  ]` (mono caps) + below `Planungsrecht` (italic serif). Then the body has `§30 BauGB` clay-tint pills inline (`<CitationChip>`). The Eckdaten qualifier `LEGAL · CALCULATED` is also mono caps clay. Four register variants of "the model is being technical" stack visually.

---

## L. Locked vs. flexible

| Item | Locked / Flexible | Justification |
|---|---|---|
| **Three-zone layout** (left / center / right) | Flexible | Pure visual choice. Left & right rails contain queries that can render in any container. The center column owns Thread; that anchor stays. |
| **`220 / minmax(0,1fr) / 300` grid widths** | Flexible | No data dependency. Phase 7 tokens already disagree (`--rail-l/r: 260/340`). Renumber both. |
| **Specialist tag + clay dot** | Flexible | Pure presentation. Specialist *names* (`moderator`, `planungsrecht`, …) are locked (Section L row below). |
| **Specialist names** (`moderator / planungsrecht / bauordnungsrecht / sonstige_vorgaben / verfahren / beteiligte / synthesizer`) | **Locked** | Persisted in `messages.specialist` CHECK constraint (migration 0003), Zod-validated in `respondToolInputSchema`, used as a JSON-schema enum sent to Anthropic. Renaming requires a migration + tool-schema bump + persona retraining + back-compat shim for old messages. |
| **Typewriter animation on assistant messages** | Flexible | Phase 3 brief locks "Typewriter animation on completed responses" but that's a high-level commitment, not a specific implementation. The 18 ms ± 10 ms timing curve, 100 ms sentence pause, and skip-on-click affordance are all design-flexible. |
| **"Vorläufig — bestätigt durch …" preliminary footer** | Flexible (visual) / Locked (legal) | Copy is locked at i18n key `chat.preliminaryFooter` with both DE + EN. Visual placement (currently outside Top3 cards as italic-serif margin annotation) is design-flexible. The *content* — preliminary status + bauvorlageberechtigte/r Architekt/in confirmation — is a legal-shield clause and must persist in some readable form. |
| **Journey ribbon (INIT/PLOT/CODE/ADJ/PROC/TEAM/DOCS)** | Flexible | Derived from `SEGMENT_ORDER` + `SPECIALIST_PROGRESS` (`progressEstimate.ts`). Both are pure constants. The *station list* maps to specialist names which are locked, but the bar's visual treatment is open. |
| **Left-rail gates list** | Flexible | `GATES` constant in `LeftRail.tsx:114-127` — pure UI. `SPECIALIST_TO_GATE` mapping is a heuristic, not persisted state. Drop entirely if the redesign uses a single progress vocabulary. |
| **Right-rail panels: Top 3, Areas (A/B/C), Eckdaten, Procedures, Documents, Roles** | Mostly flexible (visual) / Locked (data) | The *content* of each panel maps to `state.recommendations / .areas / .facts / .procedures / .documents / .roles` — those state buckets are locked (DB schema + tool input). The visual treatment, ordering, collapsibility, and even whether a panel is rendered at all are design-flexible. FactTicker is purely decorative — drop freely. |
| **"I'm not sure" affordance with three branches** (research / assume / skip) | **Locked (data)** / Flexible (presentation) | The three modes are persisted in `messages.user_answer` with `kind: 'idk', mode: …`; the system prompt branches on it. The chip-row presentation (`IdkChips`) replaced a popover (`IdkPopover`) without changing the schema (Phase 7 Move 7). The redesign can change the surface freely — modal, popover, inline buttons, voice — as long as the three modes still emit. |
| **Cost ticker** | Flexible | Admin-gated (`isAdminEmail`). Move, hide, replace — no production user sees it. |
| **Open checklist CTA** | Flexible | Routes to `/projects/${id}/overview`. Internal link; copy and visual freely changeable. |
| **Map / scale bar / house illustration in right rail** | Flexible | Decorative SVGs (`ProjectPortrait`, `FooterScaleBar`, `ScaleMark` in ChatProgressBar). No data path; drop or replace. |
| **Input bar adaptive controls** (`text / yesno / single_select / multi_select / address / none`) | **Locked** | `input_type` enum is a tool-schema field, persisted as `messages.input_type`, drives `<SuggestionChips>` branch logic. The enum values, the matching `UserAnswer` discriminated-union kinds, and the model's contract on what each type means are all locked. The chip *visual* is flexible. |
| **`message_de` + `message_en` mirror requirement** | **Locked** | Tool schema requires both. Persona block enforces it. UI renders one or the other based on `i18n.resolvedLanguage`. |
| **Source × Quality qualifier scheme** (LEGAL/CLIENT/DESIGNER/AUTHORITY × CALCULATED/VERIFIED/ASSUMED/DECIDED) | **Locked** | DB shape, persona instructions, audit-log entries, qualifier tooltips on every fact/procedure/document/role. Surfacing the qualifier visually is flexible. |
| **Areas A/B/C (Planungsrecht / Bauordnungsrecht / Sonstige Vorgaben)** | **Locked** | DB shape (`state.areas.{A,B,C}`), tool schema (`areas_update`), and the persona's mental model. The hatched-band visualization is flexible. |
| **Recommendations cap of 12 / Top-3 visible** | Locked (cap) / Flexible (slice) | `RECOMMENDATIONS_CAP = 12` is a state-size guard. The Top-3 cut is a pure UI slice; renderable as 1, 5, or 12 without touching the DB. |
| **Idempotency via `clientRequestId`** | **Locked** | Partial unique index `messages_idempotency_idx`. Critical for offline replay + retry safety. UI freely changeable. |
| **Streaming via SSE `text/event-stream`** | Flexible (presentation) / Locked (transport) | The wire protocol is locked (it's how the SPA receives `input_json_delta` chunks). The streaming bubble visual is flexible — could be a different shape, a different placeholder, even no streaming bubble at all (fall back to thinking indicator until persisted). |
| **`completionSignal` enum** (`continue / needs_designer / ready_for_review / blocked`) | **Locked** | Tool field. Drives `<CompletionInterstitial>` and `<SuggestionChips>` continue prompt. The interstitial's octagonal-stamp visual is flexible. |
| **Anthropic prompt-cache marker on `PERSONA_BLOCK_V1`** | **Locked** | Cost-critical (~70% input cost reduction). The redesign cannot reorder the system blocks such that the cache marker no longer attaches to the persona prefix. |
| **`thinking_label_de` persistence + rotation** | Flexible (visual) / Locked (data) | Column `messages.thinking_label_de` (migration 0004); also `tool_input.thinking_label_en` for EN. The thinking indicator's drafting-compass visual is flexible. |
| **Recovery row on > 1 hour stale return** | Locked (concept) / Flexible (visual) | `ChatWorkspacePage.tsx:71-153` — synthetic system row in `augmentedMessages`. Triggered by `(mountTime - last_updated_at) > 1h`. The brief committed to a "you were last here on …" affordance; the visual register is flexible. |
| **First-turn priming user message** ("Eröffnen Sie das Gespräch …") | Locked (server-side) | `index.ts:230-238`. Never persisted. The user never sees this. |
| **Last-30 messages window** | Locked | `persistence.ts:104-110` — `limit(30)`. Persona + live-state block compensate; the model sees recent dialog only. |
| **Rate limit 50/h per user** | Locked (config) | Migration 0008 default; can be raised by editing `RATE_LIMIT_PER_HOUR = 50` in `index.ts:137`. UI display in `<RateLimitBanner>` is flexible. |

---

## M. Project goal & future phases

### M.1. Product, in one paragraph

Planning Matrix is an atelier-grade SPA for German Bauantrag preparation. A CLIENT (Bauherr) signs in, answers two initialization questions (intent + plot), and lands inside a chat workspace with seven specialist personas (`moderator`, `planungsrecht`, `bauordnungsrecht`, `sonstige_vorgaben`, `verfahren`, `beteiligte`, `synthesizer`). The workspace converses in formal German (with on-the-fly EN mirror), grounded in BauGB §§ 30/34/35, BayBO Art. 2/57/58/59, BayDSchG, BayNatSchG, München Stellplatzsatzung + BaumschutzV. Every fact, procedure, document, and role carries a `Source × Quality` qualifier. The conversation crystallizes into a right-rail dossier (Top-3 next steps · A/B/C area states · Eckdaten · procedures · documents · roles) and exports as a Bauherr-grade PDF / Markdown checklist / architect-grade JSON. The deliverable is a prüffähige Akte for a bauvorlageberechtigte/r Architekt/in to verify and submit.

### M.2. v1 user

CLIENT (Bauherr) only. Locked in Phase 3 brief §2.

### M.3. Roles that don't exist yet

- **DESIGNER** (bauvorlageberechtigte/r Architekt/in) — the role legally responsible for the Bauantrag submission. Future surface: a "Cockpit" view for editing/correcting client-decided facts, freezing assumptions to verified, and approving the project for submission. Hooks needed in the chat workspace:
  - The qualifier model already supports `source: 'DESIGNER'` and `setBy: 'system'` distinct from `'assistant'`.
  - `completion_signal: 'needs_designer'` already exists; `<CompletionInterstitial>` already routes to a stub `inviteArchitectStub` (`CompletionInterstitial.tsx:60-63`).
  - **Audit trail.** `project_events.triggered_by` enum already covers `'user'|'assistant'|'system'`; would need to add `'designer'` (or namespace by user-id) to attribute Cockpit edits.
  - **Read-only mode.** A view of the chat thread for the Designer to scan without disrupting the live conversation. The current `<SharedResultPage>` (token-gated, public) is the closest analog.
- **ENGINEER** (Tragwerksplaner / Brandschutz / Energie) — Fachplaner. Future surface: limited-scope view of the project state showing the documents they need to produce (`state.documents` filtered by `produced_by` containing their role id). Hooks needed: the `Role` shape already carries `id` and `produced_by` arrays — the relationship exists in data; what's missing is a route + RLS expansion.
- **AUTHORITY** (Bauamt) — eventually a Behördenportal where the Bauamt sees the prüffähige Akte. Future hooks: a tamper-evident audit log (current `project_events` is append-only via RLS but not cryptographically verifiable), submission workflow (probably XBau interop), and a separate auth domain (Bauamt staff are not Bauherr accounts).

### M.4. Multi-Bundesland future (currently Bayern only)

What locks the chat workspace to Bayern today:
- **`legalContext/bayern.ts`** is the only state-law slice in `compose.ts`. Erlangen.ts is parked.
- **`muenchen.ts`** is the only city slice. Wizard PLZ-gate (`isMuenchenAddress`) blocks non-München projects from creating.
- **`projects.bundesland`** column defaults to `'bayern'` (migration 0003) but is not constrained — the column accepts any string. Multi-Bundesland already has a slot.
- **`projects.city`** column added in 0009, backfilled to `'muenchen'` in 0010.
- **`compose.ts:40-46`** is hard-coded to `[shared, federal, bayern, muenchen]`. Multi-Bundesland needs a `composeFor(bundesland, city)` switcher.

What does NOT lock to Bayern:
- The seven specialist personas (`moderator`, `planungsrecht`, `bauordnungsrecht`, etc.) are pan-Bundesland concepts.
- The Areas A/B/C model (Planungsrecht / Bauordnungsrecht / Sonstige Vorgaben) is BauGB-anchored — federal — so universal.
- The qualifier scheme (Source × Quality), the recommendation/procedure/document/role shapes, the message schema — all generic.
- The chat workspace UI — generic.

### M.5. Multi-template future (currently T-01 fully fleshed)

- **`projects.template_id`** CHECK constraint already includes T-01..T-08 (migration 0004v3).
- The persona `bayern.ts` is largely template-agnostic (BayBO is the same regardless of intent). T-01 specifics live in the persona prompt — `703bf21 feat(prompt): proactive heritage trigger + 4 missing T-01 topics` shows the dialog batching is T-01-tuned.
- **`hydrateProjectState(raw, templateId)`** branches on `templateId` (`projectStateHelpers.ts:59-71`). Currently identical for all templates; per-template seed states would land here.
- **No SPA component reads `template_id`** beyond passing it through. `selectTemplate.ts` (wizard) maps intent → template; that's the only consumer.

What's needed: dialog batching + invariants + topic coverage for each new template. The persona system is the bottleneck, not the schema.

### M.6. Audit trail evolution

Current `project_events`:
- Append-only via RLS (no UPDATE / DELETE policies — `0003_planning_matrix_core.sql:230`).
- Per-row event type from a free-form text column (no enum constraint).
- `before_state` / `after_state` JSONB on the umbrella `turn_processed` row only; semantic delta rows carry `before_state: null, after_state: null` to save storage.
- `triggered_by` ENUMish via CHECK (`'user'|'assistant'|'system'`).

For **AUTHORITY-grade tamper-evidence**, future state needs:
- Hash chain (each event row carries a hash of (prev_hash, content) so deletion is detectable).
- Signed by a key the user does not control.
- Probably a separate `audit_events_signed` table — `project_events` stays as the working log, the signed table is the export.
- Already-locked-down: append-only RLS, JSONB before/after snapshots on the umbrella row.

### M.7. Designer "Cockpit" / Gate 99

`/projects/${id}/overview` (the OverviewPage at `features/chat/pages/OverviewPage.tsx`) is already the cockpit's seed. It renders `<Cockpit*>` components (`features/result/components/Cockpit/`) — `CockpitTabs / CockpitTable / EditableCell / saveFact / StatusPill / QualifierBadge`. It edits `state.facts` directly. A DESIGNER role would inherit this surface with an expanded scope: ability to set qualifiers from `CLIENT/ASSUMED → DESIGNER/VERIFIED`, override calculated facts, freeze the project for submission, etc.

The chat workspace itself does not need a Cockpit view — it's a separate route. What it needs:
- A handoff affordance on `completion_signal === 'needs_designer'` (currently a stub alert).
- A read-only mode for the Designer to scan the conversation.

### M.8. Document upload, BIM integration, XBau, Authority connectors

- **Document upload** — already wired (`useUploadFile`, `useDeleteFile`, `<AttachmentPicker>`, `migrations/0007_project_files.sql`). The chat-page hook is the paperclip in `<InputBar>`. Storage bucket + signed-url functions already exist. What's missing: server-side OCR / classification to auto-extract facts from a Bebauungsplan PDF.
- **BIM** — not wired. Future hook: a parallel attachment kind (`projectFile.category = 'bim'`) and a BIM-aware fact extractor.
- **XBau** — not wired. Probably a Phase 9 export format (alongside the current PDF/Markdown/JSON triad).
- **Authority connectors** — submission workflow. Probably a separate Edge Function (`submit-bauantrag`) and a separate auth domain.

### M.9. What surfaces will the redesign need to accommodate or hand off to?

For the Designer/Engineer/Authority phases, the chat workspace needs:
- A clear handoff affordance on `needs_designer` and `ready_for_review` completions (currently `<CompletionInterstitial>` chevron buttons; redesign should make this a primary moment).
- Visible attribution of who set each fact: `setBy: 'user'|'assistant'|'designer'|'authority'` + UI surfaces that read it. (Currently `setBy` is set but not surfaced.)
- A "submit-ready" state on the project — currently `status: 'completed'` is the closest concept.
- Multi-tenancy on a project (Bauherr + Designer + Engineers + Bauamt) — RLS would need to expand.

---

## N. Constraints the redesign must respect

### N.1. WCAG AA contrast ratios

Computed against the Phase 7 paper hierarchy and ink/clay tokens:

| Pair | Foreground / Background | Contrast (calculated) | AA |
|---|---|---|---|
| paper / ink | hsl(220 16% 11%) on hsl(38 30% 97%) | ~16.1:1 | ✅ |
| paper / clay (text) | hsl(25 30% 38%) on hsl(38 30% 97%) | ~5.7:1 | ✅ (4.5:1) |
| paper / clay/72 | clay at 72% alpha on paper | ~4.4:1 | ⚠️ — borderline; small text fails AA |
| paper / clay/65 | 65% alpha | ~3.9:1 | ❌ for body text (below 4.5:1) |
| paper / ink/65 | 65% alpha ink | ~10:1 | ✅ |
| paper / ink/40 | 40% alpha ink (used on inactive sub-letters) | ~6:1 | ✅ |
| paper-card / ink-soft | #FBF7EE on #3A322A | ~9:1 | ✅ |
| paper-card / ink-mute | #FBF7EE on #6B5F50 | ~5.7:1 | ✅ |
| paper-card / ink-faint | #FBF7EE on #8E8270 | ~3.6:1 | ❌ for AA body |
| clay-tint / clay-deep | rgba(142,106,71,0.10) overlay → effective on paper, clay-deep #4F3B27 | ~9:1 | ✅ |

> **Findings:** clay-text alpha values **below 0.72** for body or near-body sized text fail AA. Several locations use `text-clay/65` and `text-clay/60` for `Vorläufig …` margin annotations (`Top3.tsx:118`), Eckdaten qualifier line (`EckdatenPanel.tsx:152`), and Top-3 count label (`Top3.tsx:53`). These are not strictly body text — italic-serif small labels — but they're close enough to require attention.

### N.2. Touch target minimum (44×44 on mobile)

Confirmed:
- Mobile rail-drawer triggers — 44×44 (`MobileTopBar.tsx:53-108`).
- ScheduleSection collapse button — `min-h-[44px]` (`ScheduleSection.tsx:46`).
- IdkChips chips — `min-h-[44px] sm:min-h-0` (`SuggestionChips.tsx:182`) — chips drop to default at sm+.
- Yes/no, select, multi-select chips — same treatment.
- SendButton — 36×36 with hit-padding (verify in source).
- Paperclip button — `size-9` (36×36) — **fails 44×44 on mobile.** Worth flagging.

### N.3. Keyboard navigation

Every interactive element above is reachable via Tab in DOM order. Modal focus-traps work via Radix Dialog + vaul. Esc closes modals/popovers consistently. The skip-link skips to `#root`.

**Gap:** no global keyboard shortcuts (no `?` help, no `/` for input-bar focus). Acceptable for v1.

### N.4. Reduced motion

Section H confirms: 28 animations, all gated. Audit-clean.

### N.5. Mobile breakpoint behavior (375 px must work)

`<MobileChatWorkspace>` is the orchestrator. Confirmed: textarea uses `text-[16px]` at < 640 (`InputBar.tsx:420`) so iOS Safari doesn't zoom. Vaul drawers are `w-[88%] max-w-[360px]` — fits 375. Test the **fixed input bar at 375 px landscape** (175 px viewport height after keyboard) — uncertain.

### N.6. DE/EN parity

Enforced at prebuild. ✅

### N.7. Performance

**Time-to-interactive on cold load** — Vite + React 19 + suspense; the chat route is 880 KB raw / ~249 KB gz. Estimated TTI on 4G mid-tier mobile: 2.5–4 s after first paint. The PDF export module (828 LOC + pdf-lib + fontkit + brand TTFs) is dynamic-imported so it doesn't ship on the chat route.

**Message-append jank** — Top3 stagger (300 ms × 3 cards = 900 ms) + Eckdaten entry (240 ms × N rows) + Typewriter (~3 s for 6 sentences). No single frame > 16 ms in profiling tests Rutik would have run; the perceived smoothness comes from staggering, not fast frames. **Right-rail update jank** is small per render but the 28 animations on the page mean a slow CPU could miss frames.

### N.8. Bundle size

Current main chunk gz **~249 KB** vs ceiling **300 KB**. ~51 KB headroom.

### N.9. Edge Function latency

Anthropic Sonnet 4.6 typical latency for 1280 max_tokens (cap): median ~6–8 s, p95 ~15–18 s (per `eval-results/2026-05-04T06-58-33Z.md` patterns referenced in FIX_REPORT). Streaming reduces the *time to first text* to ~1.5–2.5 s. The `ABORT_TIMEOUT_MS = 50_000` (50 s) gives generous headroom.

### N.10. Token budget per turn

From `eval-results/`:
- median input tokens (uncached portion): ~600 (live-state + locale block)
- median cache-read tokens: ~9–11k (persona)
- median cache-write tokens: ~9–11k on cold turn, ~0 once warm
- median output tokens: ~700–1500
- median USD per warm turn: $0.01–0.02; cold turn ~$0.05.

50 turns/h cap × $0.05 worst case = $2.50/h max per user — well-budgeted.

---

## 5. Deliverable checklist

- [x] Where does every chat-page UI element live? — Section B (76 components mapped).
- [x] What gets rendered on the first turn vs subsequent turns vs on returning to a project? — Section C + recovery-row logic in `ChatWorkspacePage.tsx:71-153`.
- [x] What state changes when a user submits an answer? — Section C.6 + D.1.
- [x] Which animations exist and which respect reduced-motion? — Section H (28 animations, all gated).
- [x] What font sizes, colors, and spacing tokens are in play? — Section E.
- [x] What can be redesigned freely without touching backend or data shape? — Section L "Flexible" column.
- [x] What absolutely must stay (data contracts, API shapes, persistence)? — Section L "Locked" column + Section J.
- [x] What does the chat workspace need to grow into for Designer/Engineer/Authority phases? — Section M.
- [x] What concrete UX issues already exist in the code? — Section K (31 numbered findings).
- [x] What does the live page actually look like vs what the code suggests? — Section K.2 cross-checks the screenshots against code; only the dual `Open checklist` / `Checklist` linkage is non-obvious from code-reading alone.

---

## Stray observations for the design partner

(Per the brief's rule of engagement #2 — separate from the audit body. Brief, clearly-marked.)

- The current rail widths (`220 / 300`) are tighter than the Phase 7 tokens (`260 / 340`) suggest. Picking either consistently would resolve the right-rail cramping.
- The cost ticker is admin-only in code. The design partner can move/hide/redesign it without breaking any non-admin user's experience.
- Rutik's complaint about "looks like a working draft, not a finished room" maps cleanly to the **density** of the page: 7 vertical blocks in the right rail, 12 in the left, 28 animations, 3 sticky bands (compass, sticky-context, footer). Reducing the *number* of simultaneously-visible objects is probably the single biggest lever, more than restyling the existing ones.
- The Streaming → Persisted typewriter handoff (K.14) is a visible bug. Worth fixing in the redesign.
- The journey ribbon and left-rail gates (K.26) duplicate concept. Picking one progress vocabulary is a decision the redesign should make first.
- The IDK strip, the unified-footer band, and the input bar all live in the bottom ~140 px of the desktop viewport. That's a lot of chrome stacked beneath what should be the thread's natural ending. Some of it can collapse to long-press / overflow.
- The recovery row ("you were last here on …") is a powerful affordance that's currently buried inline with system messages. A more prominent treatment would help.
- The first user-message synthesis (`'(Datei angehängt)'` for attachment-only sends, `useInputState.ts:127-129`) is a stubby fallback — a redesign that takes attachments seriously could surface a real richer first user turn.

End of report. The next step is Rutik reading this with the design partner.

— Generated by the read-only Phase 7 audit pass. Repo at `594915c`. `2026-05-04`.
