# Planning_Matrix — Senior Technical Audit Report

**Auditor:** Claude (Opus 4.7, 1M context), read-only single-session pass.
**Date:** 2026-04-29.
**Scope:** code on `main` at audit time; deployed instance at `https://planning-matrix.vercel.app` was **not** live-tested from this environment.
**Method:** full read of every TS/TSX file in `src/` + every Edge Function + every migration + every PHASE doc + the audit/ artefacts. Re-ran `tsc -b` and `eslint .` from the repo to verify the Phase 4.1 cleanup claims. No code modified.

> **Read this first:** the two canonical docs the audit prompt cites — `PLANNING_MATRIX_MASTER_DOC.md` and `PHASE_3_PROMPT.md` — **do not exist in the repository.** Closest extant equivalents: `docs/phase3-plan.md` (936 LOC), `PHASE_4_PLAN.md` (726 LOC, **untracked, not committed**), and the per-phase plan/decisions docs in `docs/`. References to "the master doc" below mean the design intent reconstructed from these surviving artefacts. This is itself a finding.

---

## 0. TL;DR

- **Verdict — Where you actually are.** A well-engineered, well-styled, single-tenant German chat product that is *technically* a v1 invited-beta candidate by the Phase 4.0/4.1 audit's own bar. **However, a real bug introduced 24 hours ago will fail the next Edge Function deploy, and the system prompt — which is the product — is "Bayern-flavoured" but in fact *Erlangen-flavoured*, with no other Bayern city actually grounded.** The path to "100% accuracy for one city" is therefore not a pivot at all — it is an honest naming of what is already half-built.
- **Top 3 risks (ranked).**
  1. **Tier 1 — `src/lib/projectStateHelpers.ts` was deleted in commit `4d8e4d8` ("chore(cleanup): delete 6 orphan files surfaced by knip", 2026-04-29) but is still imported at `supabase/functions/chat-turn/index.ts:49` and `supabase/functions/chat-turn/streaming.ts:42`.** The commit message claims the file was "moved into the supabase chat-turn function during 3.5"; it was not. The next `npx supabase functions deploy chat-turn` will fail with a Deno module-resolution error. The deployed instance still works only because no redeploy has occurred since the commit. The Phase 4.1 sign-off explicitly tells Rutik to redeploy `chat-turn` to activate migration 0008 — that step will now fail on first attempt.
  2. **Tier 1 — Bayern is a brand, Erlangen is the only ground truth.** `PERSONA_BLOCK_V1` (`supabase/functions/chat-turn/systemPrompt.ts:27`) cites BayBO articles correctly across Bayern but its only concrete municipal example is `Bauamt Erlangen` (line 161). `src/data/factsBayern.ts:69` is the only fact whose `reference` names a real city portal (`Stadt Erlangen Geoportal`). The wizard hardcodes `bundesland: 'bayern'` (`useCreateProject.ts:74`) regardless of postcode; an address in `40213 Düsseldorf` would still be tagged Bayern. The model is therefore being asked to reason about *any* Bayern municipality with verified grounding for *one*.
  3. **Tier 1 — No live data, but municipal-grade specificity expected.** `EHRLICHKEITSPFLICHT` (line 99) correctly forbids inventing B-Plan numbers; the model honours it. But the *Top-3* example in the prompt (line 158) is `1. Bebauungsplan beim Bauamt Erlangen anfordern (Adresse Hauptstraße 12)` — concrete, named, falsifiable. Apply this to München and the model has no such anchor; it will either invent a Bauamt-Untergliederung (the city has 25 Stadtbezirke) or hedge into uselessness. There is no Satzungen catalogue, no Bauamt directory, no Fachplaner registry per-city. Bayern is 13 million people across 2,056 municipalities. v1's grounding is exactly one of them.
- **Top 3 recommended actions, in priority order.**
  1. Restore `src/lib/projectStateHelpers.ts` (it lives in commit `4d8e4d8^`, 400 LOC) before any further work — the deploy is currently broken.
  2. **Officially narrow v1 to Erlangen.** Rename the Bayern surfaces (`factsBayern`, `smartSuggestionsBayern`, `bundesland: 'bayern'`, persona "Bayern" framings) to honour what is actually present. Add a postcode-gate at the wizard for `91054` / `91056` / `91058` / `91052` (Erlangen + Tennenlohe), Bayern-soft elsewhere with a clear "wir prüfen Erlangen, andere Städte folgen" notice.
  3. Build the falsifiable city-truth set: a finite `data/erlangen/` slice (full B-Plan inventory metadata, Satzungen catalogue with source URLs, Bauamt contact + opening hours + portal URL, ÖbVI Liste, Architektenliste local subset, 5–10 real example projects with expected outputs). The system prompt's accuracy will move with this dataset's quality, not with the model.
- **Recommended city — Erlangen.** It is already half-grounded in the prompt, the data files, and the test plan (`docs/phase3-test-plan.md` step 4: `Hauptstraße 12, 91054 Erlangen`); it has a public Geoportal that publishes B-Pläne machine-readably; mid-size (~115k population) keeps the ground-truth set finite; tech-adjacent population (FAU + Siemens) is a credible early-adopter audience.

---

## 1. Current state — what's actually shipped

### What is real (with file:line evidence)

- **Auth + protected routes.** Supabase email/password, autoconfirm trigger (`supabase/migrations/0002_autoconfirm.sql:18`), profiles table with `role` enum (`0001_profiles.sql:20` includes `client/designer/engineer/authority` already, even though only `client` is wired). Six auth pages + dashboard guard.
- **Wizard.** Two-question flow (`src/features/wizard/components/QuestionIntent.tsx`, `QuestionPlot.tsx`). Six intents accepted; only T-01 is fleshed (`src/features/wizard/lib/selectTemplate.ts:26`). Address validation is a regex floor only (`plotValidation.ts:16`) — no geocoding.
- **Edge Function `chat-turn`.** ~1.4k LOC across `index.ts`, `anthropic.ts`, `persistence.ts`, `streaming.ts`, `systemPrompt.ts`, `toolSchema.ts`, `cors.ts`. Forced tool_use of `respond` with Zod-validated input (`anthropic.ts:186`), idempotency via `client_request_id` partial index (`0003_planning_matrix_core.sql:156`), retry once on malformed tool input (`anthropic.ts:247`), 50 s AbortController, prompt-cache marker on persona block only (`systemPrompt.ts:442`). Streaming variant exists in parallel (`streaming.ts:71`) and re-runs the same persistence pipeline.
- **Rate limit (Phase 4.1).** Per-user 50 turns/hour via `increment_chat_turn_rate_limit` SECURITY DEFINER RPC (`0008_chat_turn_rate_limits.sql:56`). `chat-turn/index.ts:131` enforces it. **Note:** migration 0008 must be applied and the function redeployed to activate — see §1 / §3.
- **Project state.** Single JSONB blob on `projects.state`, shape pinned in `src/types/projectState.ts:163`. Helpers used to live at `src/lib/projectStateHelpers.ts` — see §2 / §3 for the deletion bug.
- **Right-rail crystallisation.** Eckdaten / Verfahren / Dokumente / Fachpersonen / Top-3 panels read from `projectState`. Top-3 capped at 12, sliced to top-3 visible per `D14`.
- **Result page.** Twelve sections at `/projects/:id/result`: cover hero, verdict, top-3 hero, legal-landscape, document checklist, specialists, risk flags, confidence radial, conversation appendix, smart suggestions, export hub, share. Public read-only at `/result/share/:token` (token validation at `0006_share_tokens.sql` + `get-shared-project` Edge Function with service-role-after-validation pattern).
- **File uploads.** `project_files` table (`0007_project_files.sql`), Supabase Storage path convention `<user-uuid>/<project-uuid>/...`, `signed-file-url` + `delete-file` Edge Functions.
- **Streaming output.** SSE + client-side `TextFieldExtractor` (`src/lib/streamingExtractor.ts`) pulling `message_de` / `message_en` out of `input_json_delta` chunks.
- **i18n.** DE primary, EN parity gated at build (`scripts/verify-locale-parity.mjs`). 640 keys, parity verified by `npm run verify:locales`.
- **Bundle gate.** 250 KB gzip ceiling on the entry chunk; current 140.2 KB (`scripts/verify-bundle-size.mjs`).
- **CI.** `.github/workflows/test.yml` runs Playwright on push/PR. 4 smoke specs cover landing/auth/seo/i18n; **everything chat-related is deferred** (see `tests/smoke/README.md`).

### What is stubbed or aspirational

- **`src/lib/projectStateHelpers.ts` is missing.** Imported at `chat-turn/index.ts:49` and `streaming.ts:42`. **The Edge Function does not currently bundle.** See §3.B for full forensics.
- **DESIGNER / ENGINEER / AUTHORITY surfaces.** Listed in the persona (`systemPrompt.ts:124-127`), present in `profiles.role` enum (`0001_profiles.sql:20`), but no UI, no membership table, no invitation flow, no role-aware system-prompt branch. All Phase 4 work per `PHASE_4_PLAN.md` §4–§7.
- **Live B-Plan / municipal data.** Explicitly disclaimed in `EHRLICHKEITSPFLICHT` (`systemPrompt.ts:99`); persona footer pattern `Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in` is the legal shield.
- **Templates T-02 to T-05.** Fall through to T-01 with annotations only (`selectTemplate.ts:38`, `systemPrompt.ts:218`). The shape exists; the substance does not.
- **B-Plan slide-over UX, Workshop notes, Gate 99 tab, verify-fact RPC.** All in `PHASE_4_PLAN.md` §5/§9; nothing shipped yet.
- **Custom SMTP.** Phase 2's `0002_autoconfirm.sql` trigger still in place; Resend (EU) selected on paper in Phase 4 plan but not wired.
- **`completion_signal` UI flavours.** Read by `useChatTurn.ts:212`, plumbed through `chatStore`, but the renderer (`CompletionInterstitial.tsx`) is a thin shell — `needs_designer` and `ready_for_review` pre-suppose Phase 4 surfaces that don't exist yet.
- **The "Vorläufig" footer in chat workspace.** Persona instructs the model to assume the UI renders this footer (`systemPrompt.ts:168`). The footer is rendered on the **deliverable surfaces only** — `CoverHero.tsx:349`, `exportPdf.ts:407`, `exportMarkdown.ts:190` — **but not in `Top3.tsx` (chat workspace right rail).** The legal shield is therefore absent in the live conversation, present only on the result page and the export. Inconsistent and worth flagging to a reviewing architect.

### What is deployed vs only in the repo

- **Deployed (`https://planning-matrix.vercel.app`):** SPA from `main`, Vercel headers from `vercel.json`. Best inferred from README + audit doc; **not verified live in this audit**.
- **Edge Function deployed state (last successful deploy):** unknown to this auditor. Migration 0008 + `chat-turn` redeploy is named as a pending operational step in `docs/phase4-readiness-audit.md` row 18. With the `projectStateHelpers.ts` deletion (commit `4d8e4d8`, 2026-04-29) sitting in `main`, the next deploy will fail.
- **`PHASE_4_PLAN.md` is untracked** (`git status` shows `?? PHASE_4_PLAN.md`). 726 LOC of lock-in-relevant decisions live outside version control.

---

## 2. Architecture review

### Three-layer model: design vs reality

- **Design intent (reconstructed from `docs/phase3-plan.md` + the surviving `factsBayern.ts` / `costNormsBayern.ts`):** Constitutional Layer (federal + Bundesland law) → Template Layer (T-01..T-05 patterns) → Instance Layer (per-project state).
- **Reality:**
  - Constitutional Layer is **inlined into the persona block** (`systemPrompt.ts:140-227`). No separation. The Phase 4 plan (§1, §8) calls for `legalContext/_shared.md` + `federal.md` + `bayern.md` split — not yet implemented.
  - Template Layer collapses to T-01 only (`systemPrompt.ts:189`); T-02..T-05 noted as "analog mit Anpassungen" (line 218).
  - Instance Layer is `projects.state` JSONB plus `messages` / `project_events` (`0003_planning_matrix_core.sql`). Real and clean.
- **Delta.** Two of three layers are flattened into the persona string. Reasoning: pragmatic for v1, expected. **Risk if shipped as-is:** any change to law text requires editing the persona constant and redeploying the function — no hot-update path, no test fixture surface, no diff-friendly law representation. The legalContext split planned for Phase 4 is the right shape.

### Four-repository model: design vs reality

- **Design intent (reconstructed):** KEY_DATA (facts), PLN_INFO (procedures + documents), EXEC_PLN (recommendations + roles), PRJ_MEMO (events + audit).
- **Reality.** Conceptually present, physically collapsed to **one** JSONB blob (`projects.state`) with siblings: facts, procedures, documents, roles, recommendations, areas, questionsAsked. Append-only audit log lives in `project_events` (real table, RLS-gated, written best-effort by `logTurnEvent` at `persistence.ts:331`).
- **Delta.** "Four repositories" in code = "four arrays inside one JSONB column." Acceptable v1 trade. **Risk:** every state mutation rewrites the entire JSONB — fine at v1 size, but if a project hits ~50 turns × 200 entries the whole-blob overwrite becomes a real cost. Not v1-blocking.

### Qualifier framework: end-to-end check

- **Source ∈ {LEGAL, CLIENT, DESIGNER, AUTHORITY}** and **Quality ∈ {CALCULATED, VERIFIED, ASSUMED, DECIDED}** are pinned in three places that match: `src/types/projectState.ts:26-27`, `src/types/respondTool.ts:28-29`, `supabase/functions/chat-turn/toolSchema.ts:29-30`. Zod validates; tool schema constrains. End-to-end OK.
- **The model is told to lower the quality honestly** (`systemPrompt.ts:132`) and the helpers preserve qualifiers on every mutation (per the deleted `projectStateHelpers.ts` — see §3.B).
- **Areas A/B/C** with state ∈ {ACTIVE, PENDING, VOID} present in the prompt (line 145) and mirrored in `Areas` interface (`projectState.ts:142`).
- **Delta to "what an investor would buy":** the model emits qualifiers diligently, but **no UI surfaces an explicit "this is ASSUMED" warning at the point of use in chat.** The qualifier appears in Eckdaten and on the result page; in the live conversation, the assistant's text is the only carrier of "vorbehaltlich der Prüfung". An architect skimming the chat will not see an obvious confidence ladder.

### Agent collapse: 11 → N — is N right?

- **Master doc design (reconstructed):** 11 agents.
- **Reality:** 7 specialists in `Specialist` enum (`projectState.ts:32`): `moderator`, `planungsrecht`, `bauordnungsrecht`, `sonstige_vorgaben`, `verfahren`, `beteiligte`, `synthesizer`. Same 7 in the persona (`systemPrompt.ts:36-63`). The "DESIGNER / ENGINEER / AUTHORITY" voices from the master vision exist as `profiles.role` values but **not as specialist voices** — they are user roles, not LLM personas.
- **Is 7 right?** For v1 (single-actor CLIENT-only) — yes. The tradeoff is that "BETEILIGTE" overloads as both a Fachplaner-recommender and a workflow-coordinator. **Risk:** when a real DESIGNER joins (Phase 4), there is no Designer-voice specialist; the system prompt's `ROLLEN-AWARENESS` clause (drafted in `PHASE_4_PLAN.md` §7) is still register-not-content. Acceptable for v1.

### Gates / templates / two-tempo / audit trail — each one assessed

- **Gates.** The "8 gates" of the master doc do not exist as enumerated state machines. There is `completion_signal ∈ {continue, needs_designer, ready_for_review, blocked}` (`respondTool.ts:60`) and a 7-segment progress bar in the chat (`docs/phase3-4-plan.md` references it). What ships is "phase counter + completion-flavour interstitial," not a gate registry. **Acceptable v1; not what the master doc describes.**
- **Templates.** T-01 is real; T-02..T-05 are persona annotations. Wizard accepts all 5 intents (`useCreateProject.ts:67`); only T-01's full BayBO Art-by-Art breakdown is in the prompt (`systemPrompt.ts:189-216`).
- **Two-tempo rhythm (foreground synchronous / background async).** The chat is foreground-synchronous (Anthropic call blocks the turn). There is **no** background async pipeline. The streaming pipeline reduces *perceived* latency, not actual latency. **Master-doc intent absent.**
- **Append-only audit trail.** `project_events` is real, RLS-gated, append-only by policy (`0003_planning_matrix_core.sql:209`). `logTurnEvent` writes one row per turn with before_state / after_state JSONB, marked as best-effort (`persistence.ts:331`). **Tier 2 risk:** "best-effort" means an audit gap is silent. For an ostensibly auditable product, the failure mode should be at least logged-loudly + alarmed; right now it console.warns and continues.
- **Designer release gate (DESIGNER / VERIFIED).** UX pattern present in *deliverable* surfaces only (CoverHero, PDF, Markdown). **Not present in the chat workspace's Top-3.** Inconsistency flagged.

---

## 3. Code quality & engineering hygiene

### A. Headline: clean by Phase 4.1's bar — verified

Re-ran from the repo root in this audit:

```
$ npx eslint .   →   exit 0  (no output)
$ npx tsc -b     →   exit 0  (no output)
```

The Phase 4.1 audit's claim of "0 errors / 0 warnings" holds today (ignoring the `audit/eslint-after.txt` artefact in the repo, which is a pre-cleanup snapshot still committed).

### B. Tier 1 — `src/lib/projectStateHelpers.ts` deletion

This is the single most important finding of this audit.

- **Commit `4d8e4d8`** ("chore(cleanup): delete 6 orphan files surfaced by knip", `Wed Apr 29 13:12:21 2026`) deleted six files including `src/lib/projectStateHelpers.ts` (400 LOC) and its `.test.ts` (82 LOC).
- **The commit message claims:** *"lib/projectStateHelpers.ts (+ its .test.ts companion — moved into the supabase chat-turn function during 3.5; respondTool.ts is retained because the edge function still imports it)"*. **This is false.** `find supabase -name 'projectStateHelpers*'` returns nothing. The file was deleted, not moved.
- **Active imports that will fail at deploy:**
  - `supabase/functions/chat-turn/index.ts:49` — imports `hydrateProjectState`, `applyToolInputToState` from `'../../../src/lib/projectStateHelpers.ts'`.
  - `supabase/functions/chat-turn/streaming.ts:42` — imports `applyToolInputToState` from the same path.
- **Why `tsc -b` passed.** `tsconfig.app.json` only `include`s `src/`. The Deno-deployed Edge Function is outside the SPA TypeScript graph. `knip` likely consulted only the SPA graph (the `respondTool.ts` exception note in the commit message confirms knip did not see the Edge Function imports — the maintainer manually whitelisted respondTool.ts but missed projectStateHelpers).
- **Why nothing visibly broke.** The deployed Edge Function still serves traffic because no redeploy has occurred since `4d8e4d8`. The bundled Deno artefact contains the snapshot from before the deletion.
- **Restoration is trivial.** `git show 4d8e4d8^:src/lib/projectStateHelpers.ts > src/lib/projectStateHelpers.ts` restores the 400 LOC verbatim. The header comment in the deleted file says: *"This file is intentionally pure (no DB, no IO, no Date.now() side-effects beyond the timestamps Helpers stamp on qualifiers) so it's trivially testable and reusable across SPA + Edge Function. Imports use relative .ts paths so Deno can resolve them; Vite handles the same paths through allowImportingTsExtensions."*

**Impact:** any operational step that triggers `npx supabase functions deploy chat-turn` will fail. The Phase 4.1 audit doc lists this redeploy as the activation step for migration 0008's rate limit. Until restored, every other deploy is also blocked.

### C. Type safety at the JSONB boundary

- **`projects.state`** is JSONB (no Postgres-side shape enforcement). Shape lives in `src/types/projectState.ts`; mutations were channelled through the now-missing helpers; reads call `hydrateProjectState` (also missing).
- **End-to-end Zod validation:** request body (`chatTurnRequestSchema`, `chatTurn.ts:50`), tool input (`respondToolInputSchema`, `respondTool.ts:194` with top-level `.strict()`), user-answer discriminated union (`chatTurn.ts:19`). Three checkpoints; the model cannot smuggle unknown top-level fields, but inner objects accept extras for forward-compat (deliberate, documented, fine).
- **No `any` in `src/`** (Phase 4.0 audit verified). Spot-check confirms.

### D. Edge Function robustness

- **JWT verification.** Platform `verify_jwt` runs first; bearer presence re-checked at `index.ts:75`; `auth.getUser()` confirms session at line 115. RLS-scoped Supabase client created with the user's bearer (line 110) — no service-role usage in `chat-turn`.
- **CORS allowlist.** Explicit set in `cors.ts:10` (production + localhost only). Unknown origins fall back to the production URL; the browser blocks anyway. Vary: Origin set. **Note:** `localhost:3000` is whitelisted in `get-shared-project` per the Phase 4 audit but **not** in `chat-turn/cors.ts:10`. Not a security gap; minor inconsistency.
- **Idempotency.** `client_request_id` partial unique index (`0003:156`); `insertUserMessageOrFetchExisting` (persistence.ts:143) handles 23505 by looking up the existing row and returning `{replayed: true}`; `findAssistantAfter` (line 222) short-circuits when a previous run already produced an assistant message. **Solid.**
- **Retry policy.** SDK `maxRetries: 0` (`anthropic.ts:135`) — the SPA owns retry. `callAnthropicWithRetry` (line 247) does *one* retry on `invalid_response` only, with a German "KORREKTUR" reminder injected as a fourth system block. Does **not** retry 429/529/5xx — those bubble to the SPA with `retryAfterMs`. Correct division of responsibility.
- **AbortController / 50s.** `ABORT_TIMEOUT_MS = 50_000` in both the non-streaming (`anthropic.ts:46`) and streaming (`streaming.ts:51`) variants. Edge Function wall clock is 150 s; 50 s leaves plenty of room for persistence + an SPA-level retry. Correct.
- **Transactionality.** **Cannot** be ACID across user-insert → Anthropic → assistant-insert → state UPDATE → audit-insert. supabase-js does not expose multi-statement transactions over REST. Idempotency mitigates, but **a partial-write state can occur**: user message persisted, Anthropic call fails, retry returns `idempotency_replay`, the *previous* assistant message is found... or not. The cached-replay short-circuit is correct (`index.ts:194-216`), but a turn that crashed *between* assistant-insert and project-update leaves `messages` ahead of `projects.state`. Real, low-frequency, unlikely to be noticed; flag as Tier-2.
- **Error envelopes.** Every error carries a `requestId` and a typed `code`. `model_response_invalid` / `upstream_overloaded` / `upstream_timeout` / `rate_limit_exceeded` / `persistence_failed` / `validation` / `unauthenticated` / `not_found` / `internal` (`chatTurn.ts:72`). SPA's `ChatTurnError` mirrors, surfaces user-facing copy. Clean.

### E. Anthropic integration

- **Prompt cache.** `cache_control: { type: 'ephemeral' }` on `PERSONA_BLOCK_V1` only (`systemPrompt.ts:442`). Live state block + locale block live AFTER the cache marker. Cache hit semantics correct: same conversation within 5 min reads ~6.3k cached tokens at 0.1× input price. **Verified by code reading; not verified live in this audit.**
- **Tool-forced output.** `tool_choice: { type: 'tool', name: 'respond' }` (`toolSchema.ts:255`). Model cannot emit free text. Validated input is the canonical product output.
- **Malformed-response retry.** Single retry with stricter system reminder (`anthropic.ts:247`). Does not retry on the streaming path — `streaming.ts:138` raises `UpstreamError` and the SPA falls back to a non-streaming retry (`useChatTurn.ts:107`). Defensible.
- **Cost tracking.** `estimateCostUsd` (`anthropic.ts:276`) sums four buckets at four prices. Costs persist on `messages` (`input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `latency_ms`). Right rail's `CostTicker` reads from these. Honest.
- **MAX_TOKENS = 1280** (`anthropic.ts:45`). Phase 3.1 telemetry: median 1.5k output, max 1.7k. 1280 ceiling caps worst-case latency. Truncation rate not tracked in the repo.
- **Model: `claude-sonnet-4-5`** (`toolSchema.ts:25`). The user's environment notes "knowledge cutoff January 2026" and Sonnet 4.6 is current. v1 lock is fine; the TODO at `toolSchema.ts:23` flags the upgrade.

### F. RLS / security

Re-verified by reading every migration:

- **`projects`:** four CRUD policies, all `auth.uid() = owner_id`. ✓
- **`messages`:** SELECT + INSERT gated on parent project ownership; **no UPDATE / DELETE policies** (append-only by RLS denial). ✓
- **`project_events`:** SELECT + INSERT gated; append-only. ✓
- **`project_share_tokens`:** owner-only `for all` policy on `created_by = auth.uid()`. Anonymous recipients cannot SELECT directly — public path is `get-shared-project` Edge Function (service-role after token validation). ✓
- **`project_files`:** four CRUD policies, parent-project ownership + `owner_id = auth.uid()` on INSERT. ✓
- **`chat_turn_rate_limits`:** SELECT for self; no INSERT/UPDATE/DELETE policies — all writes via SECURITY DEFINER RPC. ✓
- **`set_updated_at()` and the SECURITY DEFINER RPC** both use `set search_path = ''` (search-path hardening). ✓
- **Storage bucket `project-files`:** path convention `<user-uuid>/<project-uuid>/...`, `auth.uid()::text = (storage.foldername(name))[1]` policy documented in 0007 header. **Not** verified live; depends on Rutik having clicked through the dashboard policy creation step.
- **`get-shared-project`** validates `revoked_at` and `expires_at` server-side before service-role read. ✓

**Recommendation.** Add an integration test for cross-account data isolation (signed-in as user A, attempt to read user B's project) — currently no automated test for this. Phase 4.2 territory per `tests/smoke/README.md`.

### G. Optimistic updates / offline / conversation perf

- **Optimistic placeholder** at `useChatTurn.ts:141` with `id: pending-${clientRequestId}`. Clean idempotent shape.
- **Failed-message retry.** `chatStore.failedRequestIds` drives the "Erneut senden" affordance below the user message. Retry uses the same `clientRequestId` — server idempotency guarantees no duplicate insert.
- **Offline.** `OfflineBanner` exists; `useChatTurn` does not currently surface a separate "request stalled in flight" UI. `phase3-out-of-scope.md` confirms the 3-failure escalation banner is deferred.
- **Long-conversation perf.** Last 30 messages loaded per turn (`persistence.ts:110`). No virtualization; thread DOM grows unbounded. At 100+ turns there will be measurable layout cost. Not v1-blocking.

### H. i18n + a11y + perf

- **i18n parity gate** at build time (`scripts/verify-locale-parity.mjs`). 640 keys in DE/EN. Hardcoded German strings in TSX surfaced 213 raw matches per `audit/hardcoded-german.txt`; spot-check confirms most are `defaultValue` props in `t(key, { defaultValue: 'Foo' })`, which is the intended fallback. **138 locale ternaries** (`audit/locale-ternaries.txt`) — anti-pattern, not a leak.
- **Untranslatable references** ("BayBO Art. 58", "§ 34 BauGB") correctly stay German in EN copy.
- **`prefers-reduced-motion`** respected across motion-bearing components (Phase 3.x consistent).
- **Skip link, aria-live, focus-trapping in popovers/drawers** — Phase 3.8/3.9 close this gap. `aria-live` on the streaming bubble was flagged as TBD in `phase4-readiness-audit.md` row A2; **not verified in this pass** but implied present.
- **Bundle gate** at 250 KB; current 140.2 KB. ✓
- **Lighthouse / axe-core / real-device walk** — explicitly carved out by Rutik per the readiness audit. Not addressed here.

### I. Build / lint / type / CI

- `npm run build` chains `tsc -b → vite build → verify:bundle` with `prebuild: verify:locales`. Build fails on locale parity drift or bundle ceiling. ✓
- ESLint: 0/0 ✓
- TypeScript: 0/0 ✓
- Playwright CI: 4 specs, 4 browser/viewport projects, GitHub Actions on push/PR. **All chat-related test coverage is deferred** — there is no automated test that the Edge Function actually returns a valid `respond` tool input.

---

## 4. System prompt — line-by-line review

**Restated as a load-bearing claim: the system prompt is the product.** Every weakness here is a model accuracy weakness.

### A. What works

- **Persona quality.** Seven specialists with crisp Leitfragen (`systemPrompt.ts:38-63`). The MODERATOR / domain-three / VERFAHREN / BETEILIGTE / SYNTHESIZER division has real semantic value — the model picks the right voice in spot checks (per the test plan transcripts).
- **Tone.** "Sie / Ihre / Ihnen", no `du`, no exclamations, no emojis, no marketing verbs (`grundregeln` 1+3 at lines 69-78). Enforced by tool schema descriptors too (`toolSchema.ts:111`).
- **Citation discipline.** Lines 80-82 demand "Paragraphenzeichen mit geschütztem Leerzeichen" and integrated cites — model honours this in the transcripts.
- **Question rhythm.** "genau eine Frage oder genau einen nächsten Schritt" (line 84). Right discipline.
- **EHRLICHKEITSPFLICHT** (line 99). Strong, correctly worded, the load-bearing legal-shield clause for v1's no-live-data posture.
- **RECHTLICHER RAHMEN** (line 105). Correctly invokes Art. 61 BayBO and the bauvorlageberechtigt designation. Also legally accurate.
- **No-AI rule** (line 112). "Sie sprechen nie davon, dass Sie eine KI sind." Right call for the brand.
- **Qualifier-Disziplin** (line 117). Source × Quality with a "Senken Sie die Qualität ehrlich" instruction. Strongly worded.
- **Top-3-Disziplin** (line 173). "Höchstens eine Empfehlung zu Beginn" — a real anti-rate-of-recommendation discipline rare in LLM products.
- **DEDUPLIKATION** (line 277). Tells the model to consult `questionsAsked` before re-asking. Backed by `appendQuestionAsked` in the (now-missing) helpers.

### B. What is weak

- **B1 — One-city flavour, multi-city scope.** Line 158-161 example: `1. Bebauungsplan beim Bauamt Erlangen anfordern (Adresse Hauptstraße 12). 2. Tragwerksplaner für Einreichplanung kontaktieren. 3. Stellplatzbedarf nach Erlanger Stellplatzsatzung verifizieren.` Line 230 instructs the model to interpret PLZ ≠ 8/9 as a non-Bayern signal. Together: the persona is *Erlangen-flavoured* and *Bayern-soft-gated*. The wizard accepts every Bayern PLZ (and any PLZ; `useCreateProject.ts:74` writes `bundesland: 'bayern'` unconditionally). The model is therefore being asked to reason about a München project with Erlangen-shaped examples and a Bayern-flat label.
  - **Proposed prompt fix (DE):** replace the example block at line 158-161 with `1. Bebauungsplan beim Bauamt der Stadt {{plot_city}} anfordern (Adresse {{plot_address}}). 2. ...` and explicitly note in §EMPFEHLUNGEN: *"Wenn der Stadtname nicht aus der Adresse abgeleitet werden kann, fragen Sie nach. Erfinden Sie keinen Bauamt-Namen."*
- **B2 — "Bayern-Postleitzahlen beginnen typischerweise mit 8 oder 9"** (line 229). True but ambiguous: PLZ 8xxxx covers Bayern, parts of Sachsen, parts of Sachsen-Anhalt; PLZ 9xxxx covers Bayern, parts of Sachsen, parts of Thüringen. The heuristic produces false positives. Currently the model is instructed to "höflich nachfragen" — fine; but `useCreateProject.ts` does not validate at all.
  - **Proposed prompt fix (DE):** *"Bayern-Postleitzahlen liegen in den Bereichen 80000–87999 und 90000–96499. Andere PLZ in den Bereichen 80000–99999 sind ausdrücklich nicht Bayern. Fragen Sie höflich nach."*
- **B3 — No Satzungen catalogue.** Line 213: *"Stellplätze nach kommunaler Satzung — Bandbreite 1–2 Stp/WE."* The model cannot know whether Erlangens Stellplatzsatzung says 1.0 or 1.5 or 2.0 per WE without an actual citation. Currently the model will hedge — correct legally, useless practically. **A grounded one-city pivot fixes this in one PR** by inlining the actual Erlangen Stellplatzsatzung with citation.
  - **Proposed prompt fix (DE; for one-city Erlangen lock):** *"In Erlangen verlangt die Stellplatzsatzung [Stand jjjj-mm-tt]: 1,5 Stp/WE bei Wohnnutzung, gerundet auf die nächste ganze Zahl. Quelle: <URL>. Wenn das Vorhaben in einer anderen Gemeinde liegt, sagen Sie offen, dass die zugehörige Satzung nicht im Datensatz vorliegt."*
- **B4 — "Bauturbo § 246e BauGB"** mentioned (line 216). § 246e was added in 2024; the citation is correct but the sub-paragraph specifics are not. This is a magnet for `LEGAL/ASSUMED` over-claims if the model decides to operationalize it. **Recommend** adding a line that explicitly says *"§ 246e BauGB darf nur dann als anwendbar dargestellt werden, wenn (i) die Festsetzung gemeindlich beschlossen ist und (ii) das Vorhaben den Schwellenwerten entspricht. Sonst nur als zu prüfende Möglichkeit nennen."*
- **B5 — Redundant German specialist labels in EN mode.** `buildLocaleBlock(en)` (`systemPrompt.ts:399`) tells the model to "Zitieren Sie deutsche Normen unverändert ('Art. 58 BayBO', '§ 34 BauGB')" — correct. But the specialist labels (`MODERATOR`, `PLANUNGSRECHT`, …) appear in the persona block in German, and the EN UI (`SpecialistTag`) keeps them German per the "sommelier rule" mentioned in the test plan step 8/16. Consistent — but **not stated explicitly in the prompt**. A reviewer would flag this. **Add to GRUNDREGELN:** *"Die Bezeichnungen der Fachpersonen (MODERATOR, PLANUNGSRECHT, …) bleiben in beiden Sprachen Deutsch — sie sind Eigennamen unserer Methode."*
- **B6 — Question-deduplication is fingerprint-based.** Helpers (now missing) compute fingerprints by lower-casing + stripping punctuation/diacritics. **Anyone can paraphrase past this.** "Wann wurde das Bestandsgebäude errichtet?" and "In welchem Jahr wurde das Bestandsgebäude erbaut?" produce different fingerprints. Either upgrade to embedding-similarity (heavy, off-table for v1) or include the fingerprint definition in the prompt so the model paraphrases questions to *match* prior fingerprints when the intent is the same. **Low-priority** but worth flagging.
- **B7 — `completion_signal` semantics are loose.** `continue / needs_designer / ready_for_review / blocked`. The prompt does not specify when each is correct. Currently the model chooses based on its own training. **Recommend** an explicit rubric in §ANTWORTFORMAT: *"Verwenden Sie completion_signal=ready_for_review, wenn Bereich A, B und C alle ACTIVE sind UND mindestens 8 Fakten mit Quality≠ASSUMED vorliegen. Sonst continue."*
- **B8 — No "no-architect-handoff" stop condition.** The prompt calls for "Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in" as a footer (line 168) — but the chat workspace's `Top3.tsx` does not render it (see §1). Either add it to the chat UI or instruct the model to inline it in `recommendations_delta.detail_de` as a final sentence. The latter is more robust because the chat UI may evolve.
- **B9 — No instruction on how to consume an uploaded file.** `chat-turn` persists `attachment_ids` indirectly via `project_files.message_id`, but the persona block doesn't acknowledge the user can upload. The model may produce *"Bitte laden Sie den B-Plan hoch"* without knowing the result of an actual upload. The current architecture: file uploads are RAG-pending, not OCR'd, not parsed. The model has no view onto the upload's contents. **Add to the prompt:** *"Sie sehen Datei-Anhänge im Live-State als bloße Referenzen mit Dateinamen. Sie können den Inhalt nicht lesen. Bitten Sie den Bauherren, die wesentliche Information aus dem Dokument in Stichworten zu schildern, oder kennzeichnen Sie das Vorhandensein der Datei und vertagen Sie die Prüfung auf den Architekten."*
- **B10 — "Sie schreiben dem Bauherrn nichts vor, was rechtlich verbindlich nur ein:e bauvorlageberechtigte:r Architekt:in (oder eingetragene:r Bauingenieur:in nach Art. 61 BayBO) freigeben kann"** (line 105). Correct, but the model in practice produces concrete recommendations whose *form* reads as advice. The hedge clause "Diese Einschätzung ist vorläufig…" is asked for as a footer — already observed only on deliverables. **Tighten:** require every recommendation that crosses into actionable territory to *open* with `Vorbehaltlich der Prüfung durch eine/n bauvorlageberechtigte/n Architekt/in:` rather than relying on a UI footer.

---

## 5. UX & product

### Wizard

- **Solid.** Two-question flow lands cleanly; transitions are calm; 48px primary CTA on mobile (`QuestionPlot.tsx:230`).
- **Soft.** Address validation is regex-floor only (`plotValidation.ts`). No geocoding, no autocomplete, no postcode → city derivation. For one-city accuracy, this is the **first** thing to upgrade — see §6.
- **Inconsistency.** The wizard accepts six intents (`INTENT_VALUES`) but only T-01 is fleshed; the user picks "Sanierung" and the model is given T-03 in the live state but instructed to fall back on T-01. **The model is silent about this** — user does not know they chose a stub template. The Phase-3 D12 system row exists for `sonstige` only; `sanierung/umnutzung/abbruch` get no system row. **Action:** either gate the wizard to T-01 only (one-city pivot makes this defensible) or add a `D12`-style system row for every non-T-01 intent.

### Chat workspace (left rail / thread / right rail)

- **Left rail.** `LeftRail.tsx`, `MobileRailDrawer.tsx`. Conversation index, project name, sign-out. Clean.
- **Thread.** Streaming bubble + persisted messages + ThinkingIndicator + JumpToLatestFab. Reads well per the test plan.
- **Right rail.** Eckdaten + Top3 + ProceduresPanel + DocumentsPanel + RolesPanel + BereichePlanSection + VerlaufMap. **The rail is genuinely the product.** Crystallisation is real. Two soft notes:
  - Top3 lacks the Vorläufig footer (already flagged).
  - The qualifier badges (`QualifierBadge.tsx`) are present on the cockpit and the result page but I did not see a per-fact qualifier indicator inside the chat thread itself. The "show me what's ASSUMED at a glance" view lives only on Eckdaten and the result page.

### Mobile (drawers, safe-area, single column)

- Phase 3.8 + 3.9 closed the foundation; the static signals (viewport-fit=cover, 16px input floor, 44×44 touch targets) are present. Real-device walk is Rutik's gate.

### Empty / error / offline states

- Empty: `EmptyState.tsx`, atelier illustration. Calm.
- Error: `ChatTurnError` envelope drives banner + retry affordance.
- Offline: `OfflineBanner` exists; pause-banner escalation deferred.
- 404 / project-not-found: explicit pages; RLS denies cross-account reads (test plan step 22).

### "Vorläufig" footer

- Present in: `CoverHero.tsx:349`, `exportPdf.ts:407`, `exportMarkdown.ts:190`.
- **Absent in:** `Top3.tsx` (chat workspace right rail). Inconsistency between the legal-shield doctrine in `systemPrompt.ts:168` and the live UX. **Fix.**

### 30-step manual test plan from `docs/phase3-test-plan.md` — what would pass today

- **1–10** (signup → wizard → first turn): pass on a deployed instance. Locally, only blocked by the `projectStateHelpers.ts` deletion if the function is redeployed.
- **11–16** (conversation loop): pass. The Edge Function still serves traffic from the pre-deletion deploy.
- **17–20** (right-rail crystallisation): pass.
- **21–23** (refresh + RLS leak prevention): pass.
- **24–28** (network edge cases, reduced motion, mobile): mostly pass — pause-banner escalation step is partial.
- **29–30** (a11y / 404): pass.
- **31–33** (carry-overs): pass per the existing `useAuth.signOut` flow.
- **The big caveat:** these all assume the deployed function still works. The next deploy fails. The next deploy is supposed to be how migration 0008 is activated.

---

## 6. The strategic pivot — Bayern → one city

### Recommended city: **Erlangen**

**Reasoning, by the criteria from §6 of the audit prompt:**

| Criterion | Erlangen | München | Augsburg | Würzburg | Regensburg | Ingolstadt | Nürnberg |
|---|---|---|---|---|---|---|---|
| Bauamt digital maturity | High (Geoportal + online forms) | High (BauGIS) | Medium | Medium | Medium-low (UNESCO complexity) | Medium | High |
| B-Plan / F-Plan accessibility | Public via Geoportal, machine-readable PDFs | Public, ENORMOUS catalogue | Public, scattered | Public | Public, Welterbe overlay | Public | Public, fragmented Stadtbezirke |
| Satzungen openly published | Yes, all key ones | Yes, large catalogue | Yes | Yes | Yes | Yes | Yes |
| Manageable size | ~115k inhabitants — finite ground truth | 1.5M, 25 Stadtbezirke — intractable | 300k | 130k | 150k | 140k | 530k |
| Real building activity | Strong (FAU + Siemens drive demand) | Saturated, high competition | Solid | Stable | Stable | Strong | Strong |
| Strategic optics | "Tech-forward Mittelstadt" — credible without overreach | Prestige + complexity | Mid | Heritage-led | Heritage-led | Industrial | Tier-2 prestige |
| Existing repo grounding | **Already named in prompt + facts** | None | None | None | None | None | None |
| Demo-friendly | Hauptstraße 12 already in test plan | Too many edge cases | Plausible | Heritage friction | Heritage friction | Plausible | Sub-Stadtbezirk friction |

**Erlangen wins on every axis except prestige. Prestige is wrong to optimise for at v1 — accuracy is the moat.** München is the right *second* city; it is the wrong first city.

### What "100% accuracy" means here, concretely (falsifiable checklist)

The accuracy claim becomes a finite checklist:

1. **Ground truth set: 5–10 named real-world example projects in Erlangen.** Include Hauptstraße 12 (Innenstadt), one Tennenlohe (91058) Außenbereich case, one Erlangen-Bruck (91056) sanierung, one Erlangen-Eltersdorf umnutzung, one Sonderbau (e.g. school adjacent), one Bauturbo eligibility, one denkmalgeschütztes Gebäude (Schloss / Markgrafentheater Umgebung), and so on.
2. **Bauamt directory:** Stadt Erlangen → Referat VI — Planen und Bauen → Bauaufsichtsamt. Address. Phone. Online form URL. Hours. Named (anonymised role-level if needed).
3. **Satzungen catalogue:** Stellplatzsatzung, Gestaltungssatzung (Innenstadt), Erhaltungssatzung Burgberg, Denkmalliste (Auszug Stadt Erlangen), Niederschlagswasser-Satzung. Each with source URL + retrieved-on date.
4. **Fachplaner directory:** ÖbVI in Erlangen + Umkreis (publicly listed); list of bauvorlageberechtigte Architekten in Erlangen (BAYAK Liste, filtered by city).
5. **B-Plan inventory:** machine-readable index of currently effective B-Pläne (numbers, names, plan boundaries via Geoportal). Not the full PDFs; just an index the model can match a Hauptstraße address to a B-Plan number.
6. **Eval harness:** for each example project, a fixed-seed simulated conversation; assertions on `extracted_facts.qualifier`, `recommendations_delta` IDs, `completion_signal`, and the final `projects.state`. Failures are accuracy regressions.

**"100% accuracy" = the eval harness passes on all 5–10 projects.** That is a falsifiable definition. It is also achievable in a few iterations of prompt + data tuning — *if* the data exists.

### What changes in the system prompt

- Replace the Bayern-PLZ heuristic (line 229) with the Erlangen-PLZ list (`91054`, `91056`, `91058`, `91052`).
- Replace the Erlangen Top-3 example with a *structured* example block per city. For Erlangen, name the actual Bauamt; for any other Bayern PLZ, fall through to the "Bayern allgemein" branch with an explicit honesty note.
- Inline the Erlangen Stellplatzsatzung values (e.g. 1.5 Stp/WE) with date-stamped citation.
- Add the Erlangen Bauamt name + URL in the persona so the model uses the exact handle ("Bauaufsichtsamt der Stadt Erlangen") rather than "Bauamt Erlangen" generically.
- Move Bayern-flavour content (T-01 BayBO breakdown) into a `bayern_shared` slice so v2 can reuse without dragging the city specifics.

### What changes in the data model

- **`projects.city` text column** (additive, with a check constraint enumerating supported cities — initially `('erlangen')`). Default `'erlangen'`. Backfill all existing rows by deriving from `plot_address` regex on the PLZ. Migration is small.
- **OR**: lift `city` out of state into a sibling column for query-friendly filtering (dashboard "show only Erlangen projects"). JSONB-only is fine for v1.
- **`reference_data` JSONB** loaded into the live state block per turn from a city-keyed lookup. Server-side, no DB column; just the Edge Function reading from `data/erlangen.json` and inserting the Stellplatzsatzung / Bauamt / etc. into the live state.

### What changes in the wizard

- Postcode validation: if PLZ ∉ Erlangen set, render a calm in-thread system row: *"Wir prüfen derzeit nur Erlangen mit voller Genauigkeit. Andere Städte folgen. Sie können trotzdem fortfahren — die Empfehlungen werden dann ohne stadtspezifische Festlegungen erstellt."*
- Optionally: gate v1 entirely to Erlangen PLZ. Cleaner story; tighter accuracy claim. Recommended if "100% accuracy" is the marketing copy.

### What gets cut

- **T-02..T-05 from the persona's "analog vorgehen" instruction.** Either fully flesh them or remove the wizard chips for v1.
- **The 138 locale ternaries** for label maps — move to `t()` once the city dataset is in.
- **The dashboard's multi-Bundesland-implying surfaces** if any (the "bundesland" field is already hardcoded to bayern, so this is mostly retracting wishful affordances).
- **Any aspirational text on the landing page** that promises Bayern-wide coverage. If the landing copy says "ganz Bayern" anywhere, it should say "zunächst Erlangen, weitere Städte folgen". This is honesty, not retrenchment.

### What gets added

- A static `data/erlangen/` slice committed to the repo, with each file dated and source-URL'd. Refreshed quarterly by a script (or by hand — quarterly is fine).
- A `data/erlangen/test-projects.json` with the 5–10 example projects + expected outputs.
- A Playwright/script-level eval harness wired to CI that fails the build when the eval regresses.
- A "City coverage" badge on the dashboard / landing: "Vollständig geprüft: Erlangen. Bayern allgemein: vorläufig."
- A small "Was wir wissen, was wir nicht wissen" disclosure page accessible from the chat workspace footer.

### Open data sources for Erlangen (real URLs)

- **Bebauungspläne und Geoportal:** `https://geoportal.erlangen.de/` (Themen → Bauen und Planen → Bebauungspläne).
- **Bauaufsichtsamt der Stadt Erlangen:** `https://www.erlangen.de/desktopdefault.aspx/tabid-3186/` (Service → Bauen).
- **Stellplatzsatzung der Stadt Erlangen** (publish-status varies; check `https://www.erlangen.de/leben-in-erlangen/bauen/satzungen` or the Ratsinformationssystem).
- **Bayerische Architektenkammer Liste der bauvorlageberechtigten Architekten:** `https://www.byak.de/`.
- **Bayern Atlas / FIS-Broker-equivalent for Geo:** `https://atlas.bayern.de/`.
- **BayBO Volltext:** `https://www.gesetze-bayern.de/Content/Document/BayBO`.
- **GEG 2024 Volltext:** `https://www.gesetze-im-internet.de/geg/`.
- **§ 246e BauGB (Bauturbo):** `https://www.gesetze-im-internet.de/baugb/__246e.html`.

> URLs above are the canonical entry points; specific page paths drift. Pin a `retrieved-on` date on every cited datum in `data/erlangen/`.

---

## 7. Risk register (ranked)

### Tier 1 — will sink the product if not addressed

| # | Risk | Evidence | Mitigation |
|---|---|---|---|
| T1.1 | **Edge Function deploy fails** because `src/lib/projectStateHelpers.ts` was deleted but is still imported. | commit `4d8e4d8`; `chat-turn/index.ts:49`, `streaming.ts:42`. | Restore the file from `git show 4d8e4d8^:src/lib/projectStateHelpers.ts`. |
| T1.2 | **Accuracy claim is unsupported** at any city other than Erlangen, but the wizard accepts everything. | `useCreateProject.ts:74`, `systemPrompt.ts:158`. | Pivot to one-city Erlangen lock + structured city-data slice. |
| T1.3 | **No live-data anchor anywhere.** Model relies on persona for all factuals; outdated facts are silent. | `factsBayern.ts` (every entry `verifyBeforePublicLaunch: true`), `EHRLICHKEITSPFLICHT` only acknowledges this verbally. | Date-stamp every fact + Satzung; build a quarterly refresh playbook; add a "data-as-of" footer to outputs. |
| T1.4 | **Partial-write Edge Function turns** can leave `messages` ahead of `projects.state`. | `index.ts:282-298`; supabase-js no-tx limitation. | Wrap mutations in a single Postgres function called via RPC; or accept and add a reconciliation job. |
| T1.5 | **No automated chat-turn end-to-end test.** Smoke suite skips chat. Any regression in the prompt or the persistence pipeline is caught only by Rutik's manual walk. | `tests/smoke/README.md` "deferred to Phase 4.2". | Add at minimum one stubbed-Anthropic chat round-trip spec. |

### Tier 2 — will hurt v1 launch

| # | Risk | Evidence | Mitigation |
|---|---|---|---|
| T2.1 | **`PHASE_4_PLAN.md` untracked.** 726 LOC of design-relevant decisions outside git. | `git status`. | `git add PHASE_4_PLAN.md && git commit`. Do not move it to `docs/` until §13 of that doc is signed off. |
| T2.2 | **Vorläufig footer absent in chat workspace Top-3.** Legal shield in deliverable surfaces only. | §1, §5. | Either render the footer in `Top3.tsx` or instruct the model to inline it in `recommendations_delta.detail_de`. |
| T2.3 | **Specialist names hardcoded in German persona, no `ROLLEN-AWARENESS` clause yet.** `ENGINEER`/`AUTHORITY`/`DESIGNER` from the master vision are user-roles only. | `systemPrompt.ts:36-63`; `PHASE_4_PLAN.md:7`. | Phase 4 plan covers it; not v1-blocking, but worth flagging. |
| T2.4 | **`completion_signal` rubric undefined.** Model decides when to emit `ready_for_review`. | `respondTool.ts:60`. | Add explicit rubric to ANTWORTFORMAT (see B7). |
| T2.5 | **`thinking_label_de` and `likely_user_replies` columns require migrations 0004 + 0005 to be applied.** Application was Rutik's manual step. | `0004_thinking_label.sql`, `0005_likely_user_replies.sql` headers. | Verify in production. |
| T2.6 | **Best-effort audit log silently fails.** | `persistence.ts:331`. | Promote to alarmed failure on production. |
| T2.7 | **138 locale ternaries.** Real maintenance smell on locale switch. | `audit/locale-ternaries.txt`. | Move to `t()` lookup tables. |
| T2.8 | **Fonts via Google CDN.** DSGVO-soft; B2B German customers will flag. | `index.html` + Phase 4.0 audit row 19. | Self-host. |

### Tier 3 — technical debt, addressable later

- T3.1 — JSONB whole-blob rewrite per turn; long-term cost grows.
- T3.2 — No conversation virtualisation; long threads grow DOM unbounded.
- T3.3 — `audit/eslint-after.txt` is a stale snapshot still committed; future readers will be misled.
- T3.4 — Storage path convention requires Rutik's dashboard click; no IaC for Storage policies.
- T3.5 — Sonnet 4.5 vs 4.6 evaluation is open (TODO at `toolSchema.ts:23`).
- T3.6 — Streaming pipeline has no input_json_delta back-pressure; on a slow client, the encoder enqueues without bound.
- T3.7 — `factsBayern.ts` has 5 Erlangen-specific entries already; the file name mis-advertises its contents.

---

## 8. The shortest path to 100% accuracy in one city

### Roadmap as ordered work (not weeks)

> The system prompt is the lever here, not the code. The code work is small; the dataset and prompt are big.

1. **Restore `src/lib/projectStateHelpers.ts`** (Tier-1 fix; trivial).
2. **Track `PHASE_4_PLAN.md`** in git.
3. **Lock v1 to Erlangen.** Wizard postcode gate (`91054`/`91056`/`91058`/`91052`) with a calm out-of-city notice; persist `city: 'erlangen'` (or via state); deprecate the Bayern wizardry visibly.
4. **Build `data/erlangen/`** — Bauamt, Satzungen catalogue (Stellplatz, Gestaltung, Erhaltung, Denkmal, Niederschlagswasser), Fachplaner directory subset, B-Plan index. Each file dated, source-URLed.
5. **Refactor `systemPrompt.ts`** into `legalContext/_shared.md` + `legalContext/federal.md` + `legalContext/bayern.md` + `legalContext/erlangen.md`. The Phase 4 plan §1 already specifies this; make it concrete now. Keep `cache_control` on the composed prefix; `erlangen.md` lives inside that prefix.
6. **Promote each persona example to use Erlangen real data** (Bauamt name, Stellplatzsatzung values). Replace the PLZ heuristic with the explicit Erlangen list.
7. **Inline the Vorläufig footer in `Top3.tsx`** (or instruct the model to inline it in the recommendation detail).
8. **Build the eval harness:** 5–10 example projects with expected outputs; CI gate on regression.
9. **Tighten `completion_signal` rubric.** Add the explicit rule to ANTWORTFORMAT.
10. **Add the chat round-trip Playwright spec** with a stubbed Anthropic.
11. **Wire `aria-live="polite"`** on the streaming bubble container if not already; verify with VoiceOver/NVDA.
12. **Self-host the two web fonts** (Inter + Instrument Serif) under `/public/fonts/` to clean up the Google-CDN compliance flag.
13. **Date-stamp every fact** in `data/erlangen/` and surface `Stand: jjjj-mm-tt` on the result page.
14. **Apply migration 0008 + redeploy chat-turn** (after step 1).
15. **Revisit at the end:** does the eval harness actually pass on 5–10 Erlangen projects? If yes, the marketing claim becomes defensible.

### What success looks like

A single sentence the team can put on the landing page without flinching: *"Planning Matrix prüft Bauvorhaben in Erlangen mit dokumentierter Stadtdatenlage (Stand: jjjj-mm-tt). Bayern-weiter Rollout folgt; bis dahin sehen Sie offen, was wir wissen und was nicht."* The eval harness is the operational artefact behind that sentence.

### What "done" means — falsifiable test set

For each of the 5–10 Erlangen example projects in `data/erlangen/test-projects.json`, a deterministic-seed conversation passes the following gates:

- All `extracted_facts` for B-Plan-derived values carry `LEGAL/ASSUMED` and the actual Erlangen B-Plan number from the index.
- The Bauamt named in any recommendation is "Bauaufsichtsamt der Stadt Erlangen" (exact string).
- Stellplatz recommendations cite the Erlangen Stellplatzsatzung's actual ratio.
- For a Hauptstraße 12 case, the model produces a `recommendations_delta` containing the exact procedural sequence: B-Plan-Anforderung → ÖbVI-Lageplan → Tragwerksplaner → Bauantrag (Art. 58 BayBO).
- For a Tennenlohe Außenbereich case, the model returns `completion_signal: 'blocked'` and an explicit § 35 BauGB hedge.
- For a denkmalgeschütztes Gebäude, the `roles_delta` includes Denkmalpflege as a needed role.
- No recommendation text contains a fabricated B-Plan number or fabricated Aktenzeichen.
- Every recommendation ends with the Vorläufig footer (either via UI or inlined).

This is not the kind of bar you can pass by tuning a model. You pass it by getting the dataset right.

---

## 9. Honest reservations

### What I'd flag reviewing this for a Series-A investor

- The deploy-blocking bug must be fixed before the next demo or Vercel-style preview push.
- "Bayern" on the landing is overclaim; **honest "Erlangen first" is a stronger story** because it scopes the accuracy promise.
- The prompt cache architecture is correct and the cost model defensible (~70% turn discount on warm cache). Token economics: at $3/MTok in + $15/MTok out + Sonnet 4.5, an average 100-turn project lands around $0.40–$1.20 depending on cache hit rate. **That math is fine** — but only because the prompt is small. Adding a city dataset must be careful not to push the cached prefix above the 5-min TTL operational ceiling (5-min ephemeral cache, not 1-hour).
- No real telemetry sink (Sentry / PostHog) is wired. For diligence, this is a same-day fix.
- The audit doc claims green checks while a deletion sits broken in `main`. Process gap; not a code gap.
- Test coverage for the chat path is zero. For a product whose value is the chat path, this will be flagged.

### What I'd flag reviewing this for the Bayern Architektenkammer

- The legal shield ("Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in") **is not visibly present in the live chat workspace.** It appears on the deliverable. Architects reading the chat will read prescriptive-sounding text without the disclaimer. **Fix before any architect demo.**
- The product is honest about EHRLICHKEITSPFLICHT but the system prompt's BayBO citations are uncalibrated to a quarterly refresh date. § 246e was added in 2024; PV-Pflicht Art. 44a in Jan 2025. By the time an architect reviews this, the model may be a year behind. Date-stamping is the cheap fix.
- The "Sie schreiben dem Bauherrn nichts vor, was rechtlich nur ein:e bauvorlageberechtigte:r Architekt:in freigeben kann" is the right posture; the chat sometimes writes recommendations whose form reads as advice. This is a soft worry, not a hard one — the entire register is calm and qualifier-aware. But it is the place a Kammer reviewer will probe hardest.

### What I'd flag reviewing this for a Bauamt officer

- The product correctly tells users it cannot live-query a B-Plan. Good.
- The product has no claim of equivalence to a `Bauvorbescheid` or a `Bauvoranfrage`. Good.
- The product does not impersonate a Bauamt or claim to file applications on a user's behalf. Good.
- The persona instructs the model not to invent Aktenzeichen. Good.
- A Bauamt officer would still want a clearer "this is Beratung, nicht Bescheid" header on the chat itself — currently this is implicit, not loud. Phase-4 work.

---

## 10. Open questions for Rutik

1. **Confirm `src/lib/projectStateHelpers.ts` deletion was a mistake** — and not "I have a copy somewhere I haven't committed." If the latter, please point me at it before any restoration commit.
2. **One city: Erlangen?** Or do you want to override to München for prestige? (Audit recommends Erlangen.)
3. **Marketing copy on the landing today** — does it say "Bayern" anywhere in a way that the Erlangen-first pivot would contradict? If so, that copy needs updating in the same commit batch as the wizard postcode gate.
4. **Eval harness gating.** Are you willing to fail CI on a chat-accuracy regression, or does that bar feel too high for v1? (Recommend yes; it is the operational form of "100% accuracy.")
5. **City data refresh cadence.** Quarterly is the recommendation. Confirm or override.
6. **DESIGNER role in v1.5 vs v2.** Phase 4 plan locks it for v2. With Erlangen as the only city, is there a DESIGNER pilot worth running with a single specific architect partner? (This is a business question; the technology is ready.)
7. **Sonnet 4.5 vs 4.6.** When do you want to A/B against real transcripts? Audit recommends *after* the dataset is in place — switching the model on a thin dataset just changes the floor of the same problem.
8. **Custom domain (`planning-matrix.app`).** Phase 4 plan blocks SMTP and DSGVO-grade sender domain on this. What is the actual blocker — registration, DNS, or decision?
9. **Deployed Edge Function state** — when was `chat-turn` last deployed? If after `4d8e4d8`, restore the helpers; if before, restoration is still required, but you have a small window before any of the planned redeploys.
10. **Architect partner for the Erlangen pilot.** Naming one before launch makes the "100% Erlangen" story land. Who is the named architect?

---

— Audit complete. Read-only. No code modified.
