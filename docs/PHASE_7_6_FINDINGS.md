# Phase 7.6 — Findings Report

> **Mode:** Audit before fix. This report lands as the first commit of Phase 7.6.
> **Methodology:** Code-side audit only (CLI agent — no browser available). Walked
> the Phase 7 + Phase 7.5 commit history, every Chamber/Spine component + hook +
> layout file, the screenshots Rutik shipped with the brief, and the real fact-key
> namespace inventory in `src/locales/factLabels.de.ts`. Live UI walkthrough is
> deferred to Rutik on the Vercel preview where flagged.
> **Repo HEAD at audit:** `700e50f docs: update PHASE_7_CHAMBER with Phase 7.5 Spine note`

---

## §3.1 Confirmed defects from §1

### 1.1 — Sidebar scrolls when chat scrolls

- **Status:** confirmed broken.
- **Root cause.** `src/features/chat/components/Chamber/ChamberLayout.tsx:55-87`. The Spine renders as `position: fixed` on the viewport (correct in isolation), but the page itself has document-level scroll: `<main>` is in document flow with `pb-[180px]`, and `<SpineStageList>` uses `overflow-y: auto` on a flex-1 child of the fixed Spine. Two interacting issues:
  1. Wheel events that originate in the Spine area (left 240 px) leak into either the SpineStageList's inner overflow OR the document scroll, depending on browser variant — the user can scroll the stage list out of position by hovering the sidebar and wheeling.
  2. There's no explicit scroll boundary between the conversation column and the rest of the page; the visual effect Rutik reports ("sidebar scrolls along with the chat") is the document scrolling and the Spine staying put while the inner stage-list scroller drifts out of sync.
- **Touched files.** `ChamberLayout.tsx`, `Spine/Spine.tsx`, `Spine/SpineStageList.tsx`, `AstrolabeStickyHeader.tsx`, `JumpToLatest.tsx`, `useAutoScroll.ts`.
- **Fix plan.** Replace document-level scroll with a viewport-height grid. `<ChamberLayout>` becomes `display: grid; grid-template-columns: var(--spine-width) 1fr; height: 100dvh; overflow: hidden`. Spine: `overflow: hidden` on outer, scroll lives only inside `SpineStageList` middle. Conversation column (`<main>`): `overflow-y: auto` — owns its own scroll context. The current `position: fixed bottom-0` InputBar becomes `position: sticky; bottom: 0` inside `<main>`. AstrolabeStickyHeader becomes `position: sticky; top: 0` inside `<main>` (or stays absolute over the viewport at `lg:left-spine` — both work). `useAutoScroll` + `JumpToLatest` swap `window.scrollY` for `mainRef.current?.scrollTop` to address the new scroll container.
- **Risk.** Medium. Touches every fixed/sticky element on the page. Verify mobile keyboard rise still works (the `useKeyboardHeight` path in InputBar must observe the right scroll container).

### 1.2 — i18n leaks German into the EN locale

- **Status:** confirmed broken — translation choice, not raw hardcoding.
- **Root cause.** `src/locales/en.json:1404-1455` (the `chat.spine.stages.*.title` block I shipped in Phase 7.5 commit 9). Three titles keep German specialist names:
  - `bauordnungsrecht.title`: `"Bauordnungsrecht"` — pure German.
  - `verfahren.title`: `"Verfahren synthesis"` — German + English.
  - `beteiligte.title`: `"Beteiligte & roles"` — German + English.
  - `planungsrecht.title`: `"Planungsrecht profile"` — German + English.
  - `sonstige_vorgaben.title`: `"Sonstige Vorgaben"` — pure German.
- These were intentional under the existing "sommelier rule" (legal domain names stay German for accuracy — see `SpecialistTag.tsx:65-73` `SPECIALIST_ROLE_LABELS_DE`), but Rutik's read is right: in EN locale, mongrel titles look broken.
- **Fix plan.** Two-part:
  1. Update `en.json` titles to a calm one-word English dominant + parenthetical German legal term: `"Building code (Bauordnungsrecht)"`, `"Procedure synthesis"`, `"Stakeholders & roles"`, `"Zoning law (Planungsrecht)"`, `"Other regulations (Sonstige)"`. Keeps domain accuracy without mongrel reading. Sub-lines (`subDone / subLive / subNext`) drop their German specialist names — already mostly clean but verify.
  2. Add `scripts/grep-hardcoded-de.mjs` that fails the prebuild on German-only patterns inside `.tsx`/`.ts` files outside an explicit allowlist (`legalContext/`, `systemPrompt.ts`, `factLabels.de.ts`, `SpecialistTag.tsx` — sommelier-locked). Greps for `Vorhaben|Grundstück|Beteiligte|Verfahren|Sonstige|Planungsrecht|Bauordnungsrecht|Bebauungsplan` outside `t('…', { defaultValue: '…' })` calls and outside i18n key strings. Wire into `package.json` prebuild.
- **Touched files.** `src/locales/en.json`, `src/locales/de.json` (parity), new `scripts/grep-hardcoded-de.mjs`, `package.json`.
- **Risk.** Low.

### 1.3 — Stage states feel fake / progress feels fake

- **Status:** confirmed worth investigating; root cause requires live data inspection.
- **Evidence from Rutik's screenshot 12.** ROUND 18 / ~22, 62 % progress, but only `project_intent` is `live` and 7 stages are `future`. A real conversation 18 turns deep with a Bebauungsplan reference rendered in the thread CANNOT plausibly have `state.facts` empty enough that `factPrefixCount('PROJECT.') === 0`. So either:
  - **Hypothesis A (most likely).** The `state.facts` list is genuinely sparse because the model isn't always emitting `extracted_facts` deltas in tool input. The persona prompt may be looser on facts than I assumed; the `respond` tool's `extracted_facts` field is *optional*. So the model can talk about a topic without ever calling `extracted_facts`, leaving `state.facts` empty.
  - **Hypothesis B.** Real fact keys differ from my heuristic. `factLabels.de.ts:21-260` confirms the canonical UPPERCASE namespaces (`PROJECT.*`, `PLOT.*`, `BUILDING.*`, `STELLPLATZ.*`, `HERITAGE.*`, `TREES.*`, `NATURSCHUTZ.*`, `BRANDSCHUTZ.*`, `STRUCTURAL.*`, `ENERGY.*`, `PROCEDURE.*`, `PARTIES.*`, `ABSTANDSFLAECHEN.*`). My `f.key.toUpperCase().startsWith('PROJECT.')` should match. So this is unlikely, but verifiable.
  - **Hypothesis C.** `useSpineStages` memo over `[state, messageCount, t]` may not invalidate when `state.facts.push(…)` happens via Zustand-style mutation — except `applyToolInputToState` returns a new ProjectState with a spread `[...state.facts, fact]`, and `updateProjectState` in the Edge Function does an `update().eq().select()` round-trip; client picks up the new object via TanStack Query refetch, so reference identity DOES change. This hypothesis is unlikely.
  - **Hypothesis D.** `isDone` is *too strict* on the legal-regime stages. `planungsrecht`'s `isDone` requires `areas.A.state === 'ACTIVE'`. But if the persona's areas-update logic only flips A → ACTIVE at the very end of its work (i.e., after committing a verdict), then mid-work the stage stays `live` for many turns even though the user perceives the planungsrecht conversation as advancing. **This is plausible** and matches the screenshot.
- **Fix plan.** Two layers:
  1. **Diagnostic.** Add `?debug=spine` URL-param-gated panel that prints (a) `useSpineStages` resolved output, (b) raw `state.facts.map(f => f.key)`, (c) `state.areas`, (d) `procedures.length`, `roles.length`, `recommendations.length`, (e) `currentSpecialist` + `currentTurn`. So next time something feels fake, Rutik can append `?debug=spine` and see what's happening. Also dumps the result to `console.table` for copy-paste.
  2. **Defensive heuristic widening.** For each stage, expand `isDone` to OR the area-state check with a count of facts in the relevant namespace (e.g., `planungsrecht` is done if `areas.A === 'ACTIVE'` OR `factPrefixCount('PLOT.B_PLAN') > 0` OR `factPrefixCount('PLOT.IS_INNENBEREICH') > 0`). This prevents the rail from hanging on an empty area. Late stages (verfahren / beteiligte / final_synthesis) keep their count thresholds.
- **Touched files.** `src/features/chat/lib/spineStageDefinitions.ts`, new `src/features/chat/components/Chamber/Spine/SpineDebugPanel.tsx`, `ChatWorkspacePage.tsx` (mount the panel under `useSearchParams().get('debug') === 'spine'`).
- **Risk.** Medium. The widening might mark stages as `done` too aggressively; the debug panel mitigates by giving Rutik a way to verify per-conversation.

### 1.4 — Hardcoded data audit

- **Status:** mostly clean; the perception of "fake" is a §1.3 + §1.2 + §1.5 blend.
- **What I checked code-side.**
  | Surface | Source | Verdict |
  |---|---|---|
  | Spine round counter (`Round 18 · ~ 22`) | `useChamberProgress.currentTurn` (assistant message count) + `totalEstimate` (T-01 = 22 const) | real |
  | Spine percent (`62 %`) | `useChamberProgress` blend formula | real |
  | Spine stages | `useSpineStages` derivation | real, but see §1.3 |
  | Astrolabe needle | `currentTurn` driven | real |
  | Astrolabe sigils | `spokenSpecialists` set + `recentSpecialist` | real |
  | LedgerPeek facts/areas/recs | `extractLedgerSummary(state)` | real |
  | StandUp body | `extractLedgerSummary` + per-section state reads | real |
  | Citation chips (`§ 34 BauGB`) | `parseCitations` regex on `content_de`/`content_en` | real |
- **Where the "fake" perception comes from.**
  - Stage sub-line "moderator · live" reads as canned because it's the same string for every stage at that status (i18n key `subLive`). It's a *label*, not a snippet. Live snippets exist (`stage.snippet`) but only render when present — and they often aren't, because `getSnippet` walks `factPrefixCount`-equivalent prefixes that may be empty (§1.3).
  - The Phase 7.5 brief's mockup screenshot showed a placeholder snippet `"§ 34 BauGB · assumed"` under the live row. Rutik may be expecting that, but the real `getSnippet` returns `null` when no fact is present. So the live row reads as bare. This is honest (no fake data!) but feels barren — fix is to widen snippet sources.
- **Touched files.** `spineStageDefinitions.ts:64-181` — widen `getSnippet` per stage to fall back to (a) most recent specialist message body's first sentence ≤ 60 chars, (b) most recent `recommendations` title.
- **Risk.** Low.

### 1.5 — Sidebar typography too small

- **Status:** confirmed.
- **Root cause.** `SpineStage.tsx` uses `text-[11px]` titles, `text-[9px]` sub-lines/snippets. `SpineHeader.tsx` uses `text-[12.5px]` project, `text-[10px]` plot, `text-[9px]` round, `text-[12px]` percent.
- **Fix plan per brief.**
  - Stage title: 11 → 13 px.
  - Stage sub-line: 9 → 11 px.
  - Stage snippet: 9 → 11 px italic.
  - Header project name: 12.5 → 14 px.
  - Header plot: 10 → 11 px.
  - Round counter: 9 → 10.5 px.
  - Verify 240 px column doesn't horizontal-scroll. Adjust line-height (1.3 → 1.35) on titles only.
- **Touched files.** `SpineStage.tsx`, `SpineHeader.tsx`.
- **Risk.** Low.

### 1.6 — InputBar not sticky + JumpToLatest missing

- **Status:** part-real, part-likely.
- **InputBar.** Currently `fixed bottom-0 left-0 lg:left-spine right-0 z-30` (`ChamberLayout.tsx:88-96`). Should always be visible. Rutik says it scrolls away — likely cause is screenshot cropping (the screenshots end above the fixed bar's y-position). With the §1.1 viewport-grid fix, the bar moves to `position: sticky; bottom: 0` inside `<main>` and is *guaranteed* visible by layout, not by z-stacking guesswork.
- **JumpToLatest.** Mounted in `InputBar.tsx` via `<JumpToLatestFab>` Phase 7 wrapper inside the SmartChips column. Reads `window.scrollY` + `getBoundingClientRect()` against `#spec-tag-<id>`. Two issues:
  1. With viewport-grid, document scrollY is always 0; need to read `mainRef.current?.scrollTop`.
  2. Threshold (`> 200 px scrolled away`) is computed against the document, so even at small scroll positions inside main, it never triggers.
- **Fix plan.** Refactor `JumpToLatest` to accept a `scrollContainer: HTMLElement | null` prop. ChamberLayout exposes a `mainRef` via context. JumpToLatest measures + scrolls within main. Same threshold + i18n + animation contract; just different scrollable.
- **Touched files.** `JumpToLatest.tsx`, `ChamberLayout.tsx` (export ref via context), `Thread.tsx` / `ChatWorkspacePage.tsx` (consume).
- **Risk.** Low.

### 1.7 — App header missing

- **Status:** confirmed missing on `/projects/:id` (and likely elsewhere). Discovered the dashboard already has a header (`DashboardPage.tsx:164-187`) with `Wordmark`, `LanguageSwitcher`, `signOut` button. **It's local to the dashboard route, not hoisted.**
- **Existing primitives I can compose.**
  - `<Wordmark>` at `src/components/shared/Wordmark.tsx`.
  - `<LanguageSwitcher>` at `src/components/shared/LanguageSwitcher.tsx`.
  - `useAuth().signOut` already wired.
  - `useAuthStore().user.email`, `user.user_metadata?.full_name` for avatar/menu.
- **Fix plan.**
  1. Build `src/components/shared/AppHeader.tsx` — 48 px, full-width, paper bg, hairline-bottom, z-50. Left: Wordmark → `/dashboard`. Right: `LanguageSwitcher` + `<UserMenu>` (avatar circle with initials → dropdown of `Sign out` and a stub `My profile`).
  2. Mount it in `app/router.tsx` as a wrapper around every protected route (the `<ProtectedRoute>` HOC already exists).
  3. Drop the dashboard's local header (or have the local one render `<AppHeader>` and keep its own command-palette button).
  4. ChamberLayout's grid template adds row 1 = 48 px for the header. Spine starts at `top: 48 px`. AstrolabeStickyHeader inside `<main>` starts at `top: 0` of the main scroll context (no longer overlays the app header).
- **Touched files.** New `AppHeader.tsx`, `UserMenu.tsx`. `app/router.tsx`. `ChamberLayout.tsx`. `Spine/SpineHeader.tsx` (drops the wordmark line; project name + plot + progress stays).
- **Risk.** Medium. Touches the router shell and three or more page layouts.

### 1.8 — Hunt items (covered in §3.2 below)

---

## §3.2 Hunt findings from §2

### Confirmed working code-side

- **Match-cut transition** (`MessageAssistant.tsx:88-119`, `MatchCut.tsx`) — wired. Renders only when `previousSpecialist != null && previousSpecialist !== specialist`. Uses Framer `m.div` with the existing 320 ms hairline sweep + 240 ms slide-in. Reduced-motion gated. **Confirmed wired; live verification deferred.**
- **AmbientTint** — wired in `ChamberLayout.tsx:62` with the tint cross-fade in `AmbientTint.tsx`. Mounted at z-0. **Confirmed wired; live verification deferred.**
- **CursorParallax** — wired at `ChamberLayout.tsx:63`. Mouse-move radial gradients. Disabled on `(hover: none)` + reduced-motion. **Confirmed wired; live verification deferred.**
- **Magnetic focus** — `useMagneticFocus()` mounted in `Thread.tsx:53`. Single IO with rootMargin `-40% 0px -40% 0px`. CSS in `globals.css` for distance-based fade. **Confirmed wired; live verification deferred.**
- **CapturedToast** — wired in `ChatWorkspacePage.tsx:439-444`. Reads `(project.state.facts ?? [])` and tracks new keys. **Confirmed wired; live verification deferred.**
- **Specialist team strip** — `SpecialistTeam` mounted in both top region + sticky header. **Confirmed wired.**
- **LedgerTab badge** — increments via `pulseKey` set in ChatWorkspacePage when `ledger.factCount > lastFactCountRef.current`. **Confirmed wired.**
- **StandUp overlay** — wired with real data from `useChamberProgress` + `extractLedgerSummary`. Opens via astrolabe click, `?` shortcut, "Stand up & look around" link. **Confirmed wired.**
- **Astrolabe drag-to-scrub** — `Astrolabe.tsx:160-220` has the `onPointerDown/Move/Up` handlers + `atan2` index resolution. **Confirmed wired.**
- **Streaming → persisted typewriter handoff (K.14)** — `Typewriter.tsx:36-54` reads `chatStore.getState().streamingMessage.contentSoFar` once on mount, computes longest common prefix, treats it as already emitted. **Confirmed wired.**
- **Recovery row** — synthesised in `ChatWorkspacePage.useAugmentedMessages` when `(mountTime - last_updated_at) > 1h`. **Confirmed wired.**
- **Empty state** — `Chamber/EmptyState.tsx` mounted when `messages.length === 0`. Renders the moderator sigil + breath-pulse hairline. **Confirmed wired.**
- **First-turn priming failure** — `useChatTurn.onError` sets `chatStore.lastError`, `<ErrorBanner>` surfaces it. **Confirmed wired.**
- **Citation chips** — `parseCitations` + `<CitationChip>` (Radix Popover, hover/focus/touch). **Confirmed wired.**
- **Cost ticker** — removed from UI; `useChatTurn.onSuccess` emits `console.log('[pm-cost]', ...)` for admin emails only. **Confirmed.**
- **IDK suppression on synthesizer turns** — `InputBar.tsx:59-61`. **Confirmed.**

### Confirmed broken or missing code-side

- **Stage rail uses generic clay dots, not specialist sigils.** `SpineStage.tsx:60-77` — every status renders a plain dot. The brief image shows distinct sigils per stage. **High.** *Visible to Rutik.*
- **Snippet line empty when no fact captured.** Live stage often shows just title + `subLive` and no snippet at all because `getSnippet` returned null. Reads as barren / fake. **High.** Fix in §3.1 1.4.
- **No `?debug=spine` instrumentation.** Brief explicitly requests it. **Medium.** Fix in §3.1 1.3.
- **Inline thread-end BriefingCTA** — Phase 7.5 collapsed early stages, but the inline CTA reads as missing entirely below 60 %. At 62 % it should be `outlined` per `useCompletionGate`. Untested live; verify on Vercel preview. **Low.**
- **Astrolabe at scroll-y = 0 may collide with LedgerTab on narrow desktops.** Phase 7.5 noted this risk; brief's §1.1 viewport-grid will change scroll-y semantics. Need a re-check after the layout shift. **Medium.**
- **`subDoneNoPlot` swap not wired.** Outstanding from Phase 7.5 — `chat.spine.stages.plot_address.subDoneNoPlot` exists in i18n but `SpineStage` always uses `subDone` for the done state. **Medium.**

### Suspect items I cannot verify code-side

- **Mobile drawer functional.** Vaul integration looks correct, esc + scrim dismissal + auto-close-on-stage-click hooked. **Deferred to Vercel preview.**
- **Mobile keyboard rise.** `useKeyboardHeight` was working before viewport-grid; need to retest after §1.1 fix.
- **Lighthouse a11y / performance.** Cannot run Lighthouse from CLI. **Deferred.**
- **Memory leak on long scroll.** Cannot profile without browser. **Deferred.**
- **60 fps scroll at 50 messages.** Cannot measure. **Deferred.**
- **OG / meta tags.** `<SEO>` is mounted; need to verify the Vercel preview generates a real `<head>` with og:title etc. **Deferred.**
- **Browser tab title.** `<SEO titleKey="seo.title.project" params={{name}} />` — wired. **Confirmed wired; deferred live check.**
- **Two-tab safety.** Last-write-wins on projects.state. Not regressed by Phase 7.5/7.6 changes. **Confirmed unchanged.**

---

## §3.3 Items I didn't find (gaps)

- **Settings / preferences surface.** No global preferences page. Auth has a sign-out, but no "set default language" toggle persisted to user metadata. **Deferred — out of Phase 7.6 scope** per brief §6 rule 4.
- **Notifications / activity feed.** Not asked for; not present. **Out of scope.**
- **Project sharing.** `share_tokens` exists in DB but no UI on chat page. **Out of scope.**

---

## §3.4 Priority order (Phase 7.6 sprint)

| # | Issue | Severity | Lands in commit |
|---|---|---|---|
| 1 | Findings report | meta | 1 |
| 2 | §1.1 Viewport-grid layout (sidebar fixed, main owns scroll, InputBar sticky) | blocker | 2 |
| 3 | §1.7 App header on protected routes + Spine wordmark drop | high | 3 |
| 4 | §1.6b JumpToLatest re-targeted to main scroll container | high | 4 |
| 5 | §1.5 Sidebar typography bump | high (visible) | 5 |
| 6 | §1.2 EN locale title cleanup + grep-hardcoded-de.mjs prebuild gate | high | 6 |
| 7 | §1.3 Debug panel (`?debug=spine`) | medium | 7 |
| 8 | §1.3 + §1.4 Defensive `isDone` + snippet widening | medium | 8 |
| 9 | §3.2 Stage rail specialist sigils (replace clay dots) | medium (visible) | 9 |
| 10 | Outstanding §1.7.5 `subDoneNoPlot` wire-up | low | 10 (if budget) |
| 11 | Final pass: lint + locales + bundle gate | meta | 11 |

Items deferred: live walkthroughs, Lighthouse, memory profiling, settings surface (out-of-scope).

---

## §3.5 Honest caveats

- **I have no browser.** Every "confirmed broken" code-side conclusion I drew above is a *static* read. The live model's behaviour (which fact keys land in `state.facts`, how often `extracted_facts` is emitted) cannot be verified from code alone — that's why the `?debug=spine` panel is the highest-ROI fix. After it lands, Rutik can answer §1.3 in 30 seconds on the live preview.
- **Some "confirmed wired" conclusions** in §3.2 are wired-in-source but I cannot confirm they *render correctly* without a browser. AmbientTint cross-fade, CursorParallax, magnetic focus dimming — code is in place; visual validation belongs to the preview pass.
- **My EN translation choice in §1.2** ("Building code (Bauordnungsrecht)") is a defensible compromise; if Rutik prefers fully native English titles, the keys are easy to swap.

— End of findings. Fix commits start in commit 2.
