# Phase 3 — Decisions

> Companion to `docs/phase3-plan.md`. One section per decision (D1–D13)
> with the question, the answer, and the reasoning in 1–2 lines. Six
> minutes of reading; ten years of value when the next person asks
> "why is `*_delta` a discriminated union?"

---

## D1 · Migration filename

**Question:** Brief §4.1 proposed `0002_planning_matrix_core.sql`. We had `0002_autoconfirm.sql` from Phase 2. Should we use `0003_…`?

**Answer:** Yes — `supabase/migrations/0003_planning_matrix_core.sql`.

**Reasoning:** Filename collision avoidance. Sequential numbering preserved; the brief's intent (a single migration file applied via Supabase SQL Editor) survives unchanged.

## D2 · Dashboard scope

**Question:** Make the dashboard CTA real, or build the full project list?

**Answer:** Build the real dashboard CTA inline; defer the project list to a follow-up phase.

**Reasoning:** Manual test #16 implied a list, but a thin CTA-only dashboard was enough for batch 3 to ship the full chat experience without rebuilding `DashboardPlaceholder.tsx`. The list is queued for Phase 3.5.

## D3 · Cost-ticker admin allowlist

**Question:** What email(s) should see the right-rail cost ticker?

**Answer:** Both `erolerutik9@gmail.com` and `vibecoders786@gmail.com` in `src/lib/cn-feature-flags.ts` `ADMIN_EMAILS`.

**Reasoning:** Two working accounts in active use. Hardcoded allowlist with `// TODO(phase-4)` comment to swap to a role check when admin role lands.

## D4 · Sonnet 4.5 vs 4.6

**Question:** Use `claude-sonnet-4-5` per the brief or upgrade to 4.6?

**Answer:** Stay on 4.5 for v1; leave a `// TODO(model-upgrade)` comment near the `MODEL` constant.

**Reasoning:** Brief locks 4.5. Sonnet 4.6 is same pricing and reportedly stronger reasoning, but the eval needs real transcripts to A/B against — that comes after Phase 3 ships, not before.

## D5 · `*_delta` schema strictness

**Question:** Loose `Array<object>` (per brief) or strict discriminated unions?

**Answer:** Strict discriminated unions on every `recommendations_delta` / `procedures_delta` / `documents_delta` / `roles_delta`. Each entry must declare `op: 'upsert' | 'remove'`.

**Reasoning:** Forces the model to be explicit about intent — a missing field never silently means "remove". Top-level `.strict()` on the Zod input schema rejects unknown fields entirely; inner objects accept extras for forward-compat. JSON-schema mirror in `supabase/functions/chat-turn/toolSchema.ts` uses `oneOf` discriminators.

## D6 · `questionsAsked` shape

**Question:** Brief had `string[]`. Worth upgrading?

**Answer:** Upgraded to `{ fingerprint: string; askedAt: string }[]`.

**Reasoning:** Audit-friendly — we keep dedup-by-fingerprint while preserving when each question was asked. Loss-less change. `appendQuestionAsked` deduplicates on fingerprint (last-write-wins on `askedAt`).

## D7 · First-turn priming retry

**Question:** Auto-retry once silently or show manual CTA on first failure?

**Answer:** **One** silent auto-retry at 1.5 s; if that fails, surface manual `Erneut versuchen`. At ≥ 10 s of failure, expand the empty state with the "Sie können dieses Projekt jetzt verlassen — es ist gespeichert" honesty copy.

**Reasoning:** Two silent retries hide too much when the network is genuinely down. The 10-s honest copy reassures the user that the project row already exists and they can come back later.

## D8 · Address validation

**Question:** What's the bar for accepting a free-text address?

**Answer:** trim, length ≥ 6, contains a digit, AND (contains a comma OR matches `\b\d{5}\b`). No geocoding, no autocomplete, no Maps embed.

**Reasoning:** Minimal evidence the input is a real postal address rather than a stray phrase. Bayern postcodes start with 8 or 9 — the model uses that as a sanity signal but the wizard doesn't gate on it. Real geocoding is Phase 4.

## D9 · Email verification

**Question:** Custom SMTP now or later?

**Answer:** Leave the `0002_autoconfirm.sql` trigger in place; defer SMTP migration to a separate Phase 3.1 slice.

**Reasoning:** Auth concerns shouldn't bleed into the chat ship. The autoconfirm trigger gives instant signup → instant dashboard, which is the right UX for early pilots.

## D10 · Idempotency uniqueness scope

**Question:** Unique-per-project or unique-per-user on `client_request_id`?

**Answer:** `UNIQUE (project_id, client_request_id) WHERE client_request_id IS NOT NULL`.

**Reasoning:** Project-scoped is enough — RLS handles cross-tenant isolation, the partial index avoids NULL collisions, and per-project is the right grain for the SPA's retry logic.

## D11 · Per-project OG tags

**Question:** Update OG tags dynamically on `/projects/:id`?

**Answer:** No — keep OG tags static (existing landing OG). `<title>` updates dynamically to `<project name> · Planning Matrix`.

**Reasoning:** Project pages are private behind auth, so social cards never render dynamic OG. Dynamic project names could leak into history/share-to-X flows in unexpected ways. Document title alone is enough for browser-tab UX.

## D12 · "Sonstiges" notice

**Question:** When the wizard's intent is `sonstige`, surface it in-thread?

**Answer:** Yes — render as a calm in-thread **system row** (distinct visual register from assistant messages). Hairline-bordered top + bottom, uppercase `SYSTEM` tag without leading dot, Inter 13 clay body. Copy: *"Sie haben „Sonstiges" gewählt. Wir arbeiten zunächst mit dem Standard-Template für Einfamilienhaus und passen das im Gespräch an."*

**Reasoning:** Transparency builds trust; hiding the template fallback does not. Client-side only (synthetic id, never persisted).

## D13 · DEV-mode cache-write logging

**Question:** How does Rutik verify the prompt cache pattern from the live UI without parsing Edge Function logs?

**Answer:** In `chatApi.postChatTurn`, gated behind `import.meta.env.DEV`, log the full request/response/costInfo to `console.group('chat-turn ← HTTP …')` — including `cacheWriteTokens` and `cacheReadTokens`.

**Reasoning:** Real-time DevTools visibility into the cache pattern (cold first call writes 6.3k tokens; warm second call reads them). Closes the loop between the architecture decision and the runtime evidence.

---

## D14 · Recommendations cap (Phase 3.1)

**Question:** What stops the model from accumulating dozens of recommendations across a long conversation?

**Answer:** A constant cap of **12** in `applyRecommendationsDelta` → `normalizeRecommendations`. After every delta, the helper sorts by rank-then-createdAt, slices to 12, then renormalises ranks 1..N.

**Reasoning:** Twelve gives the visible top-3 plus 9 in the Overview modal — generous headroom for a conversation while bounding worst-case storage. Older drops by lowest rank (i.e. least important per the model). Tied to the Phase 3.1 #29 numbering fix because the renormalize step + cap share the same code path.

## D15 · Mobile drawers ship in Phase 3.1, not Phase 3

**Question:** Why did mobile drawers slip from Phase 3 batch 4 to Phase 3.1?

**Answer:** Batch 4 hit context-budget limits with the polish lift carrying the most weight; we deferred the drawer implementation to keep the polish moves clean. Phase 3.1 batch 4 ships them via vaul (already a dep), 85% screen-width drawers from left and right edges, with the right-rail peek-on-new-recommendation behaviour and a reduced-motion fallback badge dot.

**Reasoning:** Pattern: defer mechanical work that can be added cleanly later, ship the design moves that need careful first-pass thinking on time. Mobile drawers are mechanical (vaul does the heavy lift); the polish moves needed the room. This decision documents the deferral pattern so we know it was deliberate.

---

**Carried forward — instructions A and B (added 2026-04-27 mid-conversation):**

- **A** — `PLAN.md` is **not** deleted after the chat ships. It moves to `docs/phase3-plan.md` and is committed in the final commit of this phase. Future-Rutik and future-Claude need the decision archaeology.
- **B** — `docs/phase3-decisions.md` (this file) ships alongside the moved plan, one section per D1–D15.

---

## D21 · Mobile First, Pixel Perfect (Phase 3.8 · 2026-04-29)

**Question:** Phases 1–3.7 shipped desktop-first; mobile got "responsive enough" — vaul drawers, breakpoint stacking, no real testing. The viewport meta in index.html was missing `viewport-fit=cover`, which meant every `env(safe-area-inset-*)` call in the codebase silently returned 0 on iOS. Touch targets, keyboard handling, network-aware motion, the bundle on cellular — all neglected. How do we make mobile the primary surface from this batch forward without breaking desktop?

**Answer:** Eight commits (#83–#90) under autonomous-mode authority granted after the static-audit + Q1–Q12 sign-off. Mobile-first foundation in place: viewport meta fix (`viewport-fit=cover` + `interactive-widget=resizes-content`), three-dimensional CSS-token cascade (deliverable / operating × desktop / mobile), four foundational hooks (`useViewport`, `useSafeAreaInsets`, `useKeyboardHeight`, `useNetworkInfo`) plus `<MobileFrame>`, `<TouchTarget>`, `<AdaptiveAnimation>`, `<SkipLink>`. Dedicated `MobileChatWorkspace` orchestrator with collapsing top header, sticky compact progress band, fixed-bottom keyboard-aware input bar, and `MobileAttachmentSheet` (camera-capture / gallery / file). Cockpit table renders as card list at <640 px via internal `useViewport()` branch (one change unlocks all 8 cockpit tabs). Result-page section spacing compresses on mobile via `[data-pm-viewport='mobile'] [id^='sec-']` token rule; ConfidenceRadial scales 240 → 200 px. Auth / wizard / dashboard pass mobile criteria via existing responsive Tailwind (audit-only commit). Gesture primitives (`useSwipeGesture` with iOS edge-back-buffer, `useLongPress`) ship as foundations; wiring onto dashboard rows + message context sheet deferred to Phase 3.9. **Bundle reduction: main entry chunk 232 KB gzipped → 136 KB gzipped (-41 %)** via vite manualChunks splitting Supabase / TanStack Query / Zod / Lucide / Vaul / Radix into cache-friendly chunks; build-time gate at 250 KB ceiling. Locale parity gate from #81 stays + bundle gate joins `npm run build`.

**Reasoning:** The autonomous-mode brief released the Part-B device walk gate + the #84-walk gate, trading them for the post-batch 65-check verification matrix Rutik runs on real devices. That tradeoff is right for foundation work — the static audit + Q1–Q12 locks gave enough certainty for the load-bearing primitives (#83) to ship, and the chat workspace mobile redesign (#84) is replicating well-understood patterns (Claude.ai, ChatGPT, Stream Chat keyboard guides). The risk this commit log doesn't capture is real-device-only: VoiceOver / TalkBack labels, iOS keyboard show/hide animations, color contrast under bright sunlight, dashboard swipe vs iOS edge-back conflict in actual touch (the conflict is mitigated in `useSwipeGesture` with a 16 px edge buffer, but only real-device testing confirms). All eight commits ship green via the same plan-first discipline as 3.2–3.7; scope variance > 30 % flagged in the affected commits (#85 reused existing responsive layouts where they already stacked; #86 audit-only after finding auth/wizard/dashboard already mobile-friendly; #87 ships the gesture foundation but defers wiring; #89 ships skip-link but flags VoiceOver pass for real-device testing). The bundle-size win is the most defensible artefact: 96 KB gzipped saved on the initial route, which translates to ~0.5–1.0 s faster Time-to-Interactive on Slow 3G. **From this commit forward, every new feature ships mobile-first.**

---

## D20 · The polish pass (Phase 3.7 · 2026-04-29)

**Question:** Phase 3.6 shipped the working machinery (chat input, file upload, progress, cockpit, result-page interactivity, PDF fix), but Rutik's live walk surfaced nine concrete bugs that made the application *feel* unfinished even though it *worked*. How do we close the gap between "shipped" and "feels right" without scope creep?

**Answer:** Seven primary commits + two mid-batch hotfixes + Patch A baked into #76 (#75–#82, plus #75a Continue-chip hotfix and a chrome-removal hotfix on the unified footer). Surgical fixes only — no new architecture, no new dependencies, no migrations. New: unified sticky footer spanning the three-column grid (`<UnifiedFooter>` with FooterLeftColumn carrying the Briefing primary CTA at drafting-blue/15 + FooterRightColumn with the compact ScaleBar + CostTicker), extracted SendButton with abort-controller wiring (Q2), redesigned user message card without the BAUHERR eyebrow tag (Q11), redesigned scroll-to-latest as a circular FAB (Patch A), back-to-conversation link on the result page, T-01 Einfamilienhaus axonometric redrawn with mathematical 30° projection via `src/lib/axonometric.ts`, real architectural ScaleBar (alternating ink/paper segments), locale plumbed through to Anthropic via a non-cached system block AFTER the cached PERSONA_BLOCK so prompt cache stays warm (Q4), typography legibility sweep across operating mode (clay/55–65 → clay/72, text-[10px] → text-[11px]) with cover hero kept atelier (Q6), build-time DE/EN parity gate via `scripts/verify-locale-parity.mjs` (Q5: prebuild fail).

**Reasoning:** "Surgical, no scope creep" is the discipline. The mid-batch interrupts (Patch A jump-to-latest FAB, Patch B Continue-as-chip integration, footer-chrome removal, bigger axonometric + bigger labels) all stayed inside their commits' boundaries — when Rutik flagged a sub-bug after #75 had shipped, it became a hotfix commit (#75a / chrome-removal) rather than re-opening the parent. Locale plumbing was diagnostic-first per the #73 PDF discipline: the bug was fully traced (chatTurnRequestSchema had no `locale` field; system prompt was statically German-first; `MessageAssistant.tsx:41` already did the right render-time fallback) before a line of fix code shipped. The cache-warmth check (`cache_read_tokens > 0` on the second turn) is the gate Rutik confirms post-deploy; the locale block is positioned AFTER `cache_control: ephemeral` so the cache stays warm. The parity gate catches future drift before it reaches Rutik. Plan locked via `PHASE_3_7_PLAN.md` §6 Q1–Q11 (Q11 added on confirmation: BAUHERR tag drop) before any code shipped — same plan-first discipline as Phase 3.2 / 3.3 / 3.4 / 3.5 / 3.6.

---

## D19 · Operating-mode separation (Phase 3.6 · 2026-04-28)

**Question:** The atelier vocabulary built across 3.2 / 3.3 / 3.4 / 3.5 reads beautifully on deliverable surfaces but fights the user on working surfaces — the chat input bar replacing the textarea with "Continue", no file uploads, KEY DATA showing raw `STRUCTURAL.EXECUTION_DRAWINGS_REQUIRED`, the progress hairline communicating nothing, the PDF silently failing, the overview reading as newspaper. How do we keep what works on deliverable surfaces and fix what hurts on working ones?

**Answer:** Eight commits (#67–#74). Mode separation via CSS attribute scoping — atelier defaults at `:root`; operating tokens (rounded radii, functional drop shadows, looser tracking) opt in via `[data-mode="operating"]`. Operating-mode wrappers added to chat workspace, overview cockpit, result page sections II–XII container; landing / auth / wizard / cover hero / share view stay atelier. New: persistent rounded chat input bar with paperclip + suggestion chips above textarea (#67), file upload pipeline with `project_files` table + RLS + `signed-file-url` / `delete-file` Edge Functions + Supabase Storage `project-files` bucket (#68), 7-segment top-of-thread progress bar replacing the dotted hairline (#69), German fact labels via `factLabel(key, locale)` resolver covering ~115 keys (#70), Linear-style cockpit with sortable tables + edit-in-place on CLIENT-source facts (#71), result-page operating uplifts — Verdict expandable, Top-3 started checkbox, Legal inline-expand, Document kanban click-to-move, Risk resolve drawer (#72), and PDF export fix via `winAnsiSafe` sanitizer + telemetry to `project_events` + calm error UI with Markdown fallback (#73). Migration 0007 adds `project_files`. Eleven Q&A locked before commit #67 (Q1 append on chip-click, Q4 every CLIENT-source editable, Q5 inline-expandable, Q6 click-to-move, Q11 sanitizer-only).

**Reasoning:** Atelier is a brand register, not a totalizing system. Treating it as totalizing turns working surfaces into museum exhibits. CSS-attribute scoping preserves the atelier defaults (the safe baseline) and isolates operating-mode shifts to subtrees that opt in — if we forget to add the attribute somewhere, the component renders in atelier (visible-but-recoverable error, not a silent regression on landing). PDF bug diagnosed before a line of code shipped (no TTFs in `/public/fonts/` → `helveticaFallback` path → WinAnsi can't encode em-dash U+2014 in literal "— Vorläufig …" copy → `Error: WinAnsi cannot encode 0x2014` from `drawText`); confirmed via upstream pdf-lib issues #217 / #548 / #1759. Sanitizer fixes the bug today with zero new deps; bundling a font subset deferred to Phase 4 polish per Q11. The chat-turn Edge Function is unchanged — file linkage runs out-of-band via `client_request_id` lookup + `project_files.message_id` UPDATE, mirroring the read-only relationship with `messages` (which has no UPDATE RLS). Plan locked via `PHASE_3_6_PLAN.md` §6 Q1–Q11 before any code shipped — same plan-first discipline as Phase 3.2 / 3.3 / 3.4 / 3.5.

---

## D18 · Result page architecture (Phase 3.5 · 2026-04-28)

**Question:** The Result Page is the product's most important deliverable — twelve sections that read top-to-bottom as a real architectural-document briefing. How do we ship the right structural decisions across schema, auth, print, and the one new visual primitive?

**Answer:** Seven commits (#60–#66). Migration 0006 creates `project_share_tokens`. Two new Edge Functions: `create-share-token` (auth, owner-only) and `get-shared-project` (anon, validates token, queries with service role). Public route `/result/share/:token` mounts `<SharedResultPage>` which calls `useSharedProject(token)` and renders the same `<ResultPageBody>` the owned page uses with `source.kind === 'shared'` so mutation affordances hide. Recommendations gain optional `estimated_effort`, `responsible_party`, and `qualifier` (no Postgres migration — `projects.state` is JSONB; only Zod + persona changed). Print stylesheet scoped via `[data-print-target="result-page"]`. The one new visual primitive (240×240 confidence-radial doughnut) lives in `<ConfidenceRadial>`.

**Reasoning:** Edge Function with service role beats RLS-policy-allowing-anon for share access — keeps the projects table's read posture conservative + centralizes token validity in one auditable place. Schema migration applied additively (no breaking change to existing rows; new fields optional). The atelier vocabulary is locked across 3.2/3.3/3.4 — Phase 3.5 reuses every primitive verbatim and only invents the confidence radial. PDF export reuses pdf-lib + brand-fonts scaffolding from #55. Plan locked via PHASE_3_5_PLAN.md §6 Q1–Q10 before any code shipped.

---

## D17 · Streaming + engagement layer (Phase 3.4 · 2026-04-28)

**Question:** Three real UX problems — no sense of progress, no way to take work home, slow + boring during latency. How do we ship them in one batch without breaking Phase 3.2 / 3.3 atelier consistency?

**Answer:** Seven commits (#52–#59). Streaming foundation first (#52 Server-Sent Events from Anthropic, client-side state-machine extraction of the user-visible text from `input_json_delta` chunks — keeps the persona prompt + tool_choice contract untouched, no cache invalidation). Then progress meter (#53 — Roman-numeral spec-index vocabulary applied to a 16-cell SVG bar; chatStore gains turnCount + lastSavedAt). Suggested replies (#54 — `likely_user_replies` integrated into the `respond` tool schema, persisted via 0005 migration; paper-tab chips above the input bar). Export (#55 — pdf-lib + fontkit dynamic-imported; Inter + Instrument Serif TTFs lazy-loaded on click; Markdown + JSON + PDF brief). Engagement (#56 — 7 sigil micro-animations + 30 Bayern facts flagged `verifyBeforePublicLaunch`). Section celebration (#57 — checkmark + ripple + brightness pulse on PENDING → ACTIVE). Conversation map (#58 — 7 gates per Q7 override). Auto-saved + recovery (#59).

**Reasoning:** Streaming alone solves ~70% of the perceived-latency problem; the rest of the engagement layer absorbs the remainder. The atelier vocabulary is locked across Phase 3.2 / 3.3, so #52–#59 invent only ONE new visual primitive (the drafting-blue `▌` streaming cursor — Q9). Schema migration is additive (`messages.likely_user_replies text[] null`); brand fonts ship as a /public/fonts/ convention with Helvetica fallback; PDF + fontkit are code-split so the main JS bundle stays unchanged. Plan locked via PHASE_3_4_PLAN.md §6 Q1–Q10 (with Q5 + Q7 overrides) before any code shipped — same plan-first discipline as Phase 3.2 / 3.3.

---

## D16 · Atelier unification across all surfaces (Phase 3.3 · 2026-04-28)

**Question:** Phase 3.2 brought the chat workspace to "demo-ready German atelier" register, but the surfaces around it (dashboard, wizard, auth, wordmark) lagged. How do we bring them up to the same standard without inventing new vocabulary?

**Answer:** Five commits (#47–#51) of unification only — no new vocabulary. Dashboard rebuilt with project list as architectural-schedule index (Roman numerals + state pills + arrows + atelier substrate replacing the rooftop photo). Wizard wrapped in shared `<PaperSheet>` chrome with Roman-numeral progress and paper-tab chips. Auth headlines + photo captions reskinned (input focus state moves from clay → drafting-blue/60 to align with chat workspace). Wordmark replaces the 4-square monogram with a hand-drawn 16×16 axonometric building glyph, tightened lockup, context-aware tone. Final pass audits every surface for paper grain, blueprint substrate placement, eyebrow tracking (0.20em tags / 0.22em sections — `0.16em` legacy from Phase 3.0 retired everywhere outside the locked landing demo).

**Reasoning:** The atelier vocabulary already proved itself in 12 commits across Phase 3.2. The risk in 3.3 is *invention*, not execution. By extracting `<BlueprintSubstrate>` to a shared component and adding a small `<PaperSheet>` primitive — not a new chrome system — the dashboard, wizard, and auth all speak the chat workspace's language without redesign noise. Plan locked via PHASE_3_3_PLAN.md §6 Q1–Q8 before any code shipped (same plan-first discipline as Phase 3.2).
