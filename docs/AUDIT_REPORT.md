# AUDIT_REPORT.md — Planning_Matrix (codename Neo)

Audit performed: 2026-05-07. Read-only. No code changes outside this file.
Cited references resolve to the codebase as of branch `main`, head `1baf37b`.

---

## 1. Project identity (in your own words)

Planning_Matrix is a B2B German Bauantrag pre-project decision-support tool.
A Bauherr arrives without (or barely with) a plot, walks a 2-question wizard
(I-01 Vorhaben + I-02 Grundstück), and lands inside an "atelier-style" chat
workspace where seven specialist personas — MODERATOR, PLANUNGSRECHT,
BAUORDNUNGSRECHT, SONSTIGE_VORGABEN, VERFAHREN, BETEILIGTE, SYNTHESIZER —
take turns helping the Bauherr articulate the project, identify the right
Genehmigungsverfahren, and produce a Top-3 + Master-Checklist briefing they
can hand to a bauvorlageberechtigte:r Architekt:in.

Legal frame: Bayern + München only (Phase 5 narrowed from
"all of Bayern" to "München-active"). Bayerische Bauordnung (BayBO) with
Modernisierung 2025 (01.01.2025 + 01.10.2025) wired through; BayDSchG;
München StPlS 926 v3.10.2025; LBK Sub-Bauamt routing per Stadtbezirk.
The product *recommends* and *prepares* — it is explicitly **not** a
replacement for the bauvorlageberechtigte:r Architekt:in (Durchführungsprinzip
in Konsolidierung v1.5 §1.0.04). Every recommendation card carries a
"Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in"
footer; the prompt forbids embedding that disclaimer in the prose
(`bayern.ts:386-394`).

Feel: paper, ink, clay; Inter + Instrument Serif; 0.5px hairlines; almost
no shadows on the design-DNA-locked surfaces; deliberately quiet, atelier-
not-SaaS register. Live at `planning-matrix.vercel.app`.

---

## 2. The three architectural docs and their disagreements

Three living documents:

- **Alignment v1** — `~/Downloads/Planning_Matrix_Alignment_v1.pdf`, 11pp,
  the original concept. Naming `Project_Data` / `Assessment_Engine` /
  `Application_Profile`; 4 functions per Block (Erfassen / Bewerten /
  Erläutern); **3-dimensional Qualifier_Framework** (Source × Quality ×
  Completeness Required/Conditional/Optional); release condition
  "alle Lichter auf grün" listed as 4 invariants.
- **Konsolidierung v1.5** — `~/Downloads/planning_matrix_konsolidierung_v15.docx`,
  559 lines extracted, the autoritative architectural snapshot. Renames
  to `KEY_DATA` / `PLN_INFO` / `EXEC_PLN` / `PRJ_MEMO` + Executive View;
  introduces 3 Schichten (Constitutional / Template / Project Instance);
  **drops the Completeness qualifier** — only Source × Quality + a new
  Bereichsqualifier (ACTIVE/PENDING/VOID) per area; 11 agents (counted
  3+8+2 = 13 actually, see below); 8 Gates; T-01..T-05 templates.
- **Handoff briefing** — pasted into the chat that spawned this audit;
  not in repo. Says: 7 specialists, 8 templates, 5-layer citation defence,
  Phase 11 = State-Delta Framework.

### Divergences

| Topic                               | Alignment v1                                | Konsolidierung v1.5                                   | Handoff briefing                | What the code does                                                                 |
| ----------------------------------- | ------------------------------------------- | ----------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| Repository name (master data)       | `Project_Data` / `Key_Data`                 | `KEY_DATA` (chapters 01–05)                           | "logical store with chapters"   | One JSONB blob `projects.state` (see `src/types/projectState.ts:172`). No chapters. |
| Engine name                         | `Assessment_Engine` / `PM_FE_2`             | Eight Analysis-Layer agents (`5.B.01..08`)            | 7 specialists                   | Seven specialists (`toolSchema.ts:34-42`); no Analysis-Layer agents.                |
| Qualifier dimensions                | **3** — Source, Quality, Completeness       | **2** — Source, Quality (+ Bereichsqualifier separate) | "Source × Quality"              | **2** (`projectState.ts:26-28`). Completeness gone everywhere — no Required/Conditional/Optional. |
| Source enum                         | Legal/Bauherr/Entwurfsverfasser/Behörde     | LEGAL/CLIENT/DESIGNER/AUTHORITY                       | LEGAL/CLIENT/DESIGNER/AUTHORITY | LEGAL/CLIENT/DESIGNER/AUTHORITY (`projectState.ts:26`).                            |
| Quality values                      | Calculated/Verified/Assumed/Decided         | CALCULATED/VERIFIED/ASSUMED/DECIDED                   | same                            | CALCULATED/VERIFIED/ASSUMED/DECIDED (`projectState.ts:27`).                        |
| Bereichsqualifier (area state)      | implicit                                    | ACTIVE/PENDING/VOID                                   | A/B/C VOID-on-no-plot           | ACTIVE/PENDING/VOID type exists (`projectState.ts:28`); **VOID never set by code on no-plot** (see §10). |
| Agent count                         | 1 engine                                    | "elf Agenten" (text says 11; subsection 5 lists 13: 5.A=3, 5.B=8, 5.C=2) | 7 specialists                   | 7 specialists rolled into one Anthropic call. The 11/13 agents are not implemented as runtime entities. |
| Template count                      | not normative                               | T-01..T-05 (the 4.5-fleshed catalogue)                | T-01..T-08                      | T-01..T-08 (8 templates) — code is ahead of v1.5.                                  |
| Application_Profile / "alle Lichter"| Yes — 4 release invariants                  | Replaced by Reifegrad + completion_signal             | Not surfaced                    | `completion_signal` enum on the tool (`toolSchema.ts:59-64`). No four-light gate.  |
| Initialisierungsphase sub-phases    | Opener/Erfassen/Bewerten/Erläutern          | Opener/Einstieg/Interview/Übergang                    | I-01 + I-02                     | One screen each: `WizardShell.tsx`, `QuestionIntent.tsx`, `QuestionPlot.tsx`. No discrete "Übergang" phase — just `useCreateProject` priming. |

**Authoritative-when-conflicting:** the **code is the truth**. The code
follows v1.5 wording (KEY_DATA-style name `keyData` not `Project_Data`,
2-D qualifier, areas A/B/C with ACTIVE/PENDING/VOID), but actually stores
everything in **one JSONB column** rather than four repositories with
chapters. The handoff briefing is closest to the code in Phase 7–10
specifics (7 specialists, 8 templates, 5-layer defence). Where v1.5 and
the briefing disagree (5 vs 8 templates), the code follows the briefing.
Where Alignment v1 and v1.5 disagree (3 vs 2 qualifier dims), the code
follows v1.5.

---

## 3. Stack inventory

From `package.json`:

- React **19.2.5** + react-dom **19.2.5**
- TypeScript **~6.0.2** (target ES2023, strict, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`)
- Vite **^8.0.10** (`@vitejs/plugin-react` ^6.0.1) — `tsc -b && vite build && npm run verify:bundle`
- Tailwind **3.4.19** + `tailwindcss-animate` 1.0.7 — `tailwind.config.js` (NOT v4 — `package.json:79`)
- shadcn-style primitives via `@radix-ui/react-{accordion,alert-dialog,collapsible,dialog,dropdown-menu,popover,select,slot,tabs}`
- TanStack Query **^5.100.5**
- Zustand **^5.0.12**
- React Hook Form **^7.74.0** + `@hookform/resolvers` ^5.2.2
- Zod **^4.3.6** (and `npm:zod@^4` in `supabase/functions/chat-turn/deno.json`)
- Framer Motion **^12.38.0**
- Lenis **^1.3.23**
- Vaul **^1.1.2**
- `@supabase/supabase-js` **^2.104.1**
- `i18next` **^26.0.8** + `react-i18next` ^17.0.4 + `i18next-browser-languagedetector` ^8.2.1
- Sentry: `@sentry/react` **^9.47.1** (consent-gated via `SentryLifecycle.tsx`)
- PostHog: `posthog-js` **^1.372.5** (consent-gated via `AnalyticsLifecycle.tsx`)
- Leaflet 1.9.4 + react-leaflet 5.0.0 (wizard map)
- pdf-lib 1.17.1 + @pdf-lib/fontkit 1.1.1 (briefing PDF export)
- Anthropic SDK in the Edge Function: `npm:@anthropic-ai/sdk@^0.30.0` (`supabase/functions/chat-turn/deno.json:3`)
- **Model: `claude-sonnet-4-6`** (`supabase/functions/chat-turn/toolSchema.ts:27`). Confirmed on the JSON path (`anthropic.ts:178`) and on the streaming path (`streaming.ts`). Cost rates baked: input $3 / output $15 / cache-write $3.75 / cache-read $0.30 per Mtok (`anthropic.ts:53-56`).
- **Two-block cache strategy:** confirmed (`systemPrompt.ts:225-252`). Block 1 = `COMPOSED_LEGAL_CONTEXT` (`compose.ts:67-83`) = SHARED+FEDERAL+BAYERN+MUENCHEN+PERSONA_BEHAVIOUR+TEMPLATE_SHARED, marked `cache_control: ephemeral`. Block 2 = `getTemplateBlock(templateId)` (`templates/index.ts:41-43`), separately marked ephemeral. Block 3 = locale addendum, NOT cached. Block 4 = live state block, NOT cached. ✓
- **`tool_choice` forcing:** confirmed (`toolSchema.ts:265-268` → `respondToolChoice = { type: 'tool', name: 'respond' }`; passed to the Messages API in `anthropic.ts:183` and in the streaming path).

### Outdated / drift flags

- `package.json:80` — `"typescript": "~6.0.2"`. As of 2026-05, TypeScript 6.x is current; nothing to flag, but pinning to a tilde is unusually loose for an exact-version project. **NIT**.
- `package.json:46` — `"lucide-react": "^1.11.0"`. lucide-react had a major reset (we shipped on the 1.x line). Verify intentional. **NIT**.
- `package.json:48` — `"i18next": "^26.0.8"`. Major-26 was published 2026-Q1; fine, just newer than typical guides assume.
- `tsconfig.app.json:7` — `target: "es2023"` — does not match `lib: ["ES2023", "DOM"]` (matches), but the ES2024+ shipped Promise.withResolvers / Object.groupBy which the codebase doesn't use. Fine.
- `vite.config.ts:14` — `chunkSizeWarningLimit: 800` while the bundle ceiling claim in `MEMORY.md` is 300 KB gz. The 800 KB warning is for a *single chunk* uncompressed; the gz ceiling is enforced by `scripts/verify-bundle-size.mjs` (which is run on every build via `package.json:12`). No conflict, just two different metrics.
- `vercel.json:20` — CSP allows `nominatim.openstreetmap.org`, `geoportal.muenchen.de`, `www.muenchen.info`, `*.basemaps.cartocdn.com`, `*.tile.openstreetmap.org`. Matches the wizard/map stack.
- The `chat-turn/deno.json` pins `@anthropic-ai/sdk@^0.30.0`. Anthropic SDK ^0.30 supports Sonnet 4.6 + prompt-caching multi-block; that's fine but recent. **NIT**.
- `eslint`, `eslint-plugin-react-hooks`, `typescript-eslint`, `@eslint/js` are all pinned to fresh majors (`10.x`, `7.x`, `8.x`, `10.x`) — no drift. Fine.

---

## 4. Database schema walkthrough

23 migrations in `supabase/migrations/`, in dependency order:

| #     | File                                              | Tables / functions added                                                                   | Repository mapping (v1.5)                                          |
| ----- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 0001  | `0001_profiles.sql`                               | `public.profiles` (id, email, full_name, locale, role) + RLS + auto-create trigger          | Auth — not a v1.5 repo.                                            |
| 0002  | `0002_autoconfirm.sql`                            | `handle_new_user_autoconfirm` trigger (bypass email verify; flagged "Phase 3 will swap")    | Auth.                                                              |
| 0003  | `0003_planning_matrix_core.sql`                   | `public.projects` (with JSONB `state`), `public.messages`, `public.project_events`. RLS owner-scoped, append-only on messages + events. | **THE ONE LOGICAL STORE.** `projects.state` JSONB carries the v1.5 four repositories merged into one blob (KEY_DATA = facts; PLN_INFO = procedures+documents; EXEC_PLN = roles; PRJ_MEMO = recommendations + areas + questionsAsked + lastTurnAt). Chapters are NOT modelled — they are flat collections. |
| 0004a | `0004_planning_matrix_v3_templates.sql`           | Widens `projects.intent` + `projects.template_id` CHECK to T-06/T-07/T-08 (8 total)        | Constitutional Layer (template catalogue).                          |
| 0004b | `0004_thinking_label.sql`                         | `messages.thinking_label_de TEXT`                                                          | UX state — not a v1.5 repo.                                        |
| 0005a | `0005_likely_user_replies.sql`                    | `messages.likely_user_replies TEXT[]`                                                      | UX.                                                                |
| 0005b | `0005_seed_dashboard_variety_OPTIONAL.sql`        | Optional dev seed (rolls back by default).                                                 | Test fixture.                                                      |
| 0006  | `0006_share_tokens.sql`                           | `public.project_share_tokens` + RLS owner-only manage; anon read goes through `get-shared-project` Edge Function. | Result-page sharing.                                                |
| 0007  | `0007_project_files.sql`                          | `public.project_files` (storage path + linkage to message + checklist doc).                | KEY_DATA-adjacent (Bauherr-uploaded sources).                       |
| 0008  | `0008_chat_turn_rate_limits.sql`                  | `chat_turn_rate_limits` (50/hour) + `increment_chat_turn_rate_limit` SECURITY DEFINER RPC.  | Operational.                                                        |
| 0009  | `0009_projects_city.sql`                          | `projects.city` + CHECK `('erlangen')` + Erlangen PLZ backfill.                            | Phase-1 narrowing.                                                  |
| 0010  | `0010_projects_city_muenchen.sql`                 | Widens CHECK to `('erlangen','muenchen')`, default = muenchen, München PLZ backfill (70 PLZs). | Phase-5 pivot.                                                      |
| 0011  | `0011_bplan_lookup_rate_limits.sql`               | `bplan_lookup_rate_limits` (30/min) + RPC.                                                 | Operational.                                                        |
| 0012  | `0012_messages_tool_input.sql`                    | `messages.tool_input JSONB` (raw respond-tool input for forensics).                        | Audit trail.                                                        |
| 0013  | `0013_chat_turn_atomic_commit.sql`                | `commit_chat_turn(uuid, jsonb, jsonb, jsonb, text, jsonb, uuid)` SECURITY DEFINER — atomic insert+update+event. | All-of-the-above writes go atomic.                                 |
| 0014  | `0014_fix_likely_user_replies_type.sql`           | Re-creates `commit_chat_turn` with `jsonb_array_elements_text` cast for `likely_user_replies`. | Bug-fix.                                                           |
| 0015  | `0015_atelier_console.sql`                        | New `logs` schema: `logs.traces`, `logs.spans`, `logs.persona_snapshots`, `public.model_pricing`, `logs.is_admin()`. Service-role-only writes; admin-gated reads. | Observability (the v1.5 audit/reify side).                          |
| 0016  | `0016_project_events_trace_link.sql`              | `project_events.trace_id` + new 8-arg `commit_chat_turn` (adds `p_trace_id`); also adds an FK to `logs.traces`. **Note: this overload's body silently dropped 0014's text[] cast.** | Audit linkage.                                                      |
| 0017  | `0017_logs_reaper.sql`                            | `logs.reap_stuck()` flips in_progress→partial after 60 s.                                  | Observability hygiene.                                              |
| 0018  | `0018_atelier_console_fixes.sql`                  | `public.admin_users` allow-list, `logs.is_admin()` reads BOTH the table and the GUC, admin-bypass SELECT policies on projects/messages/project_events, FK on `project_events.trace_id` with `ON DELETE SET NULL`. | Observability + admin.                                              |
| 0019  | `0019_is_admin_check_rpc.sql`                     | `public.is_admin_check()` thin wrapper around `logs.is_admin()` (so SPA can call without exposing `logs` schema via PostgREST). | Admin gating.                                                       |
| 0020  | `0020_event_log.sql`                              | `public.event_log` (client-side events), RLS for user-own + admin-all, FK to `logs.traces` `ON DELETE SET NULL`. | First-party observability.                                          |
| 0021  | `0021_fix_commit_chat_turn_replies.sql`           | Re-creates `commit_chat_turn` with the 0014 cast preserved on top of 0016's 8-arg signature. | Bug-fix (regression of 0016).                                       |
| 0022  | `0022_drop_project_events_trace_fk.sql`           | Drops the FK that 0018 added (because `commit_chat_turn` writes child rows BEFORE the parent trace row exists; tracer.finalize runs at end). | Tracer-ordering workaround.                                         |
| 0023  | `0023_messages_idempotency_role_scoped.sql`       | Re-scopes the messages idempotency unique index to include `role` (so user + assistant rows can share `client_request_id`). | Bug-fix (every non-priming turn was failing on 23505 since 0013).   |

### Repository mapping (formal)

The v1.5 spec's four repositories collapse into ONE JSONB blob. The table
below shows how the chapters/aspects map to fields inside `projects.state`
(typed by `src/types/projectState.ts:172-185`):

- `KEY_DATA` (Projekt + Grundstück + Planungsrecht + Baurecht + Baulasten) → `state.facts: Fact[]` (key/value/qualifier/evidence).
- `PLN_INFO` (Verfahren + Dokumente + Informationsbestandteile) → `state.procedures: Procedure[]` + `state.documents: DocumentItem[]`.
- `EXEC_PLN` (Rollen + Verfahrensweg + Dokumentationsziel + Zeitplan + Zugriffsregeln + Freigabelogik) → **only `state.roles: Role[]` exists**. Verfahrensweg / Zeitplan / Zugriffsregeln / Freigabelogik are **not modelled at all**. The "kanonische menschenlesbare Fassung des Projekthandbuchs" the v1.5 spec talks about doesn't exist in code.
- `PRJ_MEMO` (Historie + Aktive Beteiligte + Offene Rollenbedarfe + Behördenbeziehungen + Korrespondenz + Phasenstand) → `state.recommendations: Recommendation[]` (Top-3) + `state.areas: { A, B, C }` + `state.questionsAsked: AskedQuestion[]` + `state.lastTurnAt`. **Aktive Beteiligte / Behördenbeziehungen / Korrespondenz are not modelled.** Historie is implicit in `project_events`.
- `Executive View` → derived in the SPA from the same blob; it is not a real persisted view.

`projects.bundesland` (`0003_planning_matrix_core.sql:60`) defaults `'bayern'`
and is hard-coded by the wizard (`useCreateProject.ts:152`). Never re-derived
from the address. The chat-turn function reads it only to print one bullet
in the live state block (`systemPrompt.ts:73`) — see §9.

`messages` carries `model`, `input/output/cache_read/cache_write_tokens`,
`latency_ms`, `client_request_id` (now role-scoped per 0023), and
`tool_input JSONB` (the full raw respond-tool input for forensic compare).

RLS is consistently `auth.uid()` direct-or-via-projects sub-select. No
service-role usage outside the tracer (and the rate-limit RPCs which are
SECURITY DEFINER). Append-only enforced by the absence of UPDATE/DELETE
policies on `messages` and `project_events`.

---

## 5. The `chat-turn` Edge Function — line by line

Files in `supabase/functions/chat-turn/`:

- `index.ts` 624 LOC — main handler.
- `cors.ts` — origin allowlist.
- `systemPrompt.ts` 252 LOC — `buildSystemBlocks` + `buildLiveStateBlock`.
- `legalContext/{shared, federal, bayern, muenchen, erlangen, personaBehaviour, compose}.ts` — the cached prefix slices.
- `legalContext/templates/{index, shared, t01..t08}.ts` — the per-template tail.
- `toolSchema.ts` 269 LOC — JSON-schema view of `respond` (sent to Anthropic).
- `anthropic.ts` 418 LOC — single Messages-API call + `callAnthropicWithSchemaReminder` (one retry on Zod-fail with stricter reminder) + `callAnthropicWithRetry` (3-attempt outer backoff for transient upstream).
- `streaming.ts` — SSE variant.
- `factPlausibility.ts` 175 LOC — numeric/categorical bound check, downgrades to ASSUMED.
- `citationLint.ts` 251 LOC — Phase 10.1 forbidden-pattern scan + `event_log` fan-out.
- `persistence.ts` ~470 LOC — DB ops + atomic `commit_chat_turn` RPC wrapper.
- `tracer.ts` + `tracer.test.ts` + `cost.ts` + `retryPolicy.ts` — Phase 9 observability.

### Trace of one full request (JSON path)

1. `Deno.serve` handler `index.ts:60` mints `requestId = crypto.randomUUID()`.
2. CORS preflight check (`index.ts:69`); 204 on OPTIONS, 405 on non-POST.
3. Bearer-token presence check (`index.ts:78`). Platform `verify_jwt` already ran upstream (Supabase Edge config).
4. `chatTurnRequestSchema.safeParse(raw)` (Zod, in `src/types/chatTurn.ts`) — pulls `projectId`, `userMessage`, `userMessageEn`, `userAnswer`, `clientRequestId`, `locale`. **`clientRequestId` is required** in the schema (note: NOT `?`-optional in the request type).
5. Env check (`index.ts:103`) — `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Notice: `SUPABASE_SERVICE_ROLE_KEY` is **not** required here — when missing, `tracer.ts:58-78` falls open into a no-op tracer.
6. RLS-scoped Supabase client constructed with the user's bearer token (`index.ts:118-121`). `supabase.auth.getUser()` (`index.ts:123`) verifies session. **If this fails, return 401.**
7. Tracer created (`createTracer`, `index.ts:138`), `kind='chat_turn_streaming'|'chat_turn_json'` decided by `acceptsStream(req)`. Root span `chat_turn.root` opened.
8. **Rate limit** RPC `increment_chat_turn_rate_limit(p_user_id, 50)` (`index.ts:163`). Cap = 50/hour. On `!allowed`, return 429 with rateLimit metadata.
9. `loadProjectAndMessages(supabase, projectId)` (`persistence.ts:75`) — owner-RLS-scoped; loads project + last 30 messages DESC, reversed. Returns 404 for both not-found and RLS-denied (no leak).
10. `hydrateProjectState(project.state, templateId)` (`projectStateHelpers.ts:59-71`) — coerces empty `{}` or pre-schema state to a fresh `initialProjectState`.
11. **Insert user message** with idempotency (`insertUserMessageOrFetchExisting`, `persistence.ts:143`). `client_request_id` is the idempotency key. On 23505 (unique violation), look up existing row; if found → `replayed: true`. Then `findAssistantAfter` short-circuits — if the prior turn already committed the assistant message, return the cached (assistant, projectState) pair without calling Anthropic.
12. `anthropicMessages = mapMessagesForAnthropic(allRows)`. **First-turn priming:** if zero messages, synthesise a per-template kickoff USER turn via `firstTurnPrimer(templateId)` (`index.ts:538-559`). T-08 explicitly tells the model NOT to assume sub-category; T-06 invokes Art. 46 Abs. 6 BayBO; etc.
13. `liveStateText = buildLiveStateBlock({...})` (`systemPrompt.ts:66`) — bullet text format, NOT JSON. Includes templateId, intent, bundesland, plot, areas, last 8 facts, top-3 recs, last 8 questions asked, last user input (truncated to 240 chars), last specialist.
14. **Streaming branch** (`index.ts:318`) hands off to `runStreamingTurn` and returns a `text/event-stream`. The streaming path runs the same persistence work after `message_stop`.
15. **JSON path:** `callAnthropicWithRetry` (`anthropic.ts:373-403`). Composition: outer 3-attempt transient backoff (`retryPolicy.ts`) wrapping inner `callAnthropicWithSchemaReminder` (one retry on `invalid_response` with a stricter SCHEMA_REMINDER added to the system blocks, `anthropic.ts:316-323`). Single Anthropic call per attempt: `messages.create({ model: 'claude-sonnet-4-6', max_tokens: 1280, system: systemBlocks, messages, tools: [respondToolDefinition], tool_choice: respondToolChoice })`. AbortController at 50 s. SDK `maxRetries: 0`.
16. Tool-use block extraction (`anthropic.ts:207`). On no `tool_use` block or wrong tool name → `UpstreamError('invalid_response')` → outer index translates to `model_response_invalid` with `autoRetryInMs: 3000`.
17. **Zod validation** of tool input (`respondToolInputSchema.safeParse`, `anthropic.ts:230`). On fail → same path.
18. `validateFactPlausibility(toolInput)` — mutates qualifier in place, returns `{ downgraded, warnings }`. Numeric bounds for BGF / GF / Grundstück / vollgeschosse / bauwerks_hoehe; categorical sets for `gebaeudeklasse_*` and `baugb_paragraph` (`factPlausibility.ts:46-64`). DECIDED/VERIFIED downgrade to ASSUMED on out-of-range.
19. `lintCitations({ message_de, message_en })` (`citationLint.ts:148`). Scans 8 regex patterns. Findings logged via `logCitationViolations` to `event_log` (`citationLint.ts:207-249`). **Non-blocking** — observability only.
20. Persona snapshot (`tracer.capturePersonaSnapshot`, `index.ts:422`). Sampled 1-in-50 on success, always on error. Hash always stored.
21. `applyToolInputToState(currentState, toolInput)` (`projectStateHelpers.ts:449-463`). Order: extracted_facts → recommendations_delta → procedures_delta → documents_delta → roles_delta → areas_update → appendQuestionAsked(message_de) → bump `lastTurnAt`.
22. **Atomic commit** via `commit_chat_turn` RPC (`persistence.ts:372`). Inside one transaction the RPC inserts the assistant message, updates `projects.state`, optionally inserts `project_events` rows. `p_trace_id` is sent only when non-null and not the noop-tracer's all-zeros UUID (`persistence.ts:416`).
23. Return 200 with `{ ok: true, assistantMessage, projectState, completionSignal, costInfo }`.
24. `finally` block: `rootSpan.end(...)` + `tracer.finalize(traceStatus)` (unless tracer was handed off to streaming).

### How persona output is "linted before it leaves the function"

After Zod validation but BEFORE persistence and BEFORE the response is
emitted, both `factPlausibility` and `citationLint` run. Plausibility
**mutates** qualifiers (so projects.state stores the downgraded version);
citationLint **does not block** — it only emits `event_log` rows. So the
*UI-visible* text and citations are NOT scrubbed; the only guard against
wrong-Bundesland citations leaving the function is the system-prompt
content (Layer 1–3 of the 5-layer defence), with citationLint serving as
post-hoc telemetry.

### How Bundesland is resolved and injected

- Wizard **hard-codes** `bundesland: 'bayern'` (`useCreateProject.ts:152`). No reverse-geocode → state derivation.
- The chat-turn function reads `project.bundesland` (`index.ts:219, 308`) and passes it into `buildLiveStateBlock` (`systemPrompt.ts:67-73`). Renders one line: `bundesland: bayern`.
- The actual Bayern-specific content is the constant `BAYERN_BLOCK` (`legalContext/bayern.ts:12-500`) — **always loaded** for every request via `compose.ts:67-83`. **Changing `projects.bundesland` in the DB has no effect on the system prompt** — the cached prefix is unconditionally Bayern. **HIGH** (see §16).

---

## 6. The 5-layer citation defense — does it actually work?

Layers, in the order a wrong citation would have to defeat them:

1. **Bundesland-Disziplin block** in `bayern.ts:12-105`. Hard list of `✗ FALSCHE ZITATE` (Anlage 1 BayBO, Annex 1 BayBO, § N BayBO, BauO NRW, BbgBO, BauO Bln, "Musterbauordnung als Rechtsgrundlage", "die relevante Bauordnung" placeholder) and `✓ KORREKTE ZITATE` (Art. 57 forms with Absatz/Nummer). Always cached, ~1.5k tokens.
2. **PERSONA_BEHAVIOURAL_RULES — section B.1 ZITATE-DISZIPLIN** (`personaBehaviour.ts:184-238`). Four invariants: Bundesland-correct, Struktur-correct (Art. vs §), Anlage-frei bei BayBO, aktuell (2025-Stände). Adds a hedge phrase ("die genaue Rechtsgrundlage prüfen wir bei der Verfahrensentscheidung").
3. **Per-template tail TYPISCHE / VERBOTENE Zitate blocks** (`templates/t01..t08`). Each tail has both blocks; smokeWalk's static gate enforces their presence (`smokeWalk.mjs:159-176`).
4. **Edge Function `citationLint`** post-Zod scan (`citationLint.ts`). 8 regex patterns: `Anlage\s+1\s+BayBO`, `Annex\s+1\s+BayBO`, `§\s*\d+...\s*BayBO`, `Bauordnung\s+NRW|BauO\s+NRW`, `Bauordnung\s+Brandenburg|BbgBO`, `Bauordnung\s+Berlin|BauO\s+Bln`, `Musterbauordnung|\bMBO\b` (warning), `relevante (Bauordnung|Vorschrift)|einschlägige (Bauordnung|Vorschrift)` (warning).
5. **`scripts/smokeWalk.mjs`** static-gate (and live-mode if env set). Asserts the prompt structure and that the lint regex catches a curated negative-sample set + ignores legitimate StPlS Anlage 1 references.

### Attack vectors the lint doesn't catch (≥3, asked for)

- **A1. Capitalisation/spacing variants of "MBO".** The regex `\bMBO\b` catches it as a warning, but **not** "Muster-Bauordnung" (with hyphen), "MBO-Bayern", "Modell-BO", "Muster Bauordnung" (with space, no hyphen). A model paraphrase would slip through. The lint is brittle to literal phrasing.
- **A2. Hesse / Saxony / others not in the list.** Patterns enumerate NRW, Brandenburg, Berlin only. A wrong-Bundesland citation to `BauO Hessen`, `HBO`, `SächsBO`, `LBauO RLP`, `SBauVO`, `LBO BW` (the exact bug from the screenshot — Baden-Württemberg) **passes the lint untouched**. **BLOCKER** for the stated acceptance test (München project citing LBO BW).
- **A3. The "§ N BayBO" regex demands the trailing `BayBO`.** A model that writes "§ 57 Bayerische Bauordnung" or "§ 57 der BayBO" or "§ 57 Abs. 1 Nr. 1 a Bay. BO" routes around it. Also `Paragraph 57 BayBO` (literal word, not glyph) is missed.
- **A4. The discriminated-union approach to "BayBO §" only fires on the `§` glyph.** "Para. 57 BayBO" / "Art 57 (BayBO)" / mid-line abbreviations would not trip it.
- **A5. The lint runs only on `message_de` + `message_en`.** It does NOT scan `recommendations_delta[*].title_*` / `detail_*` / `procedures_delta[*].rationale_*` / `documents_delta[*].title_*` / `extracted_facts[*].evidence`. **HIGH** — an LBO-BW citation embedded in a Recommendation `detail_de` would pass through to the result page silently.
- **A6. The lint catches "Musterbauordnung" only as a warning, not as an error.** A turn that cites "Musterbauordnung § 50" passes (warning ≠ block, and the function is non-blocking anyway).
- **A7. The English mirror is even leakier.** The forbidden English variants only enumerate `Annex 1 BayBO`. A translation like "the Building Code of Brandenburg", "Berlin's Building Ordinance", "the model code" would slip the EN scan — only `Bauordnung Berlin` exact strings are matched, German tokens.

In short: the defence is well-targeted at the *one* pattern it has been
trained on (Anlage 1 BayBO + the three named wrong-Bundesländer + § vs Art.).
Anything outside that narrow target is dependent on the prompt content
holding the model in line. The "**LBO BW screenshot**" acceptance test
would currently **fail at layer 4** (no LBO-BW pattern) and be rescued
only if the model itself remembers the rules from layers 1–3.

---

## 7. The 7 specialists vs the 11-agent v1.5 spec

v1.5 §5 lists 13 named agents (text says 11 — likely counted before
adding/splitting; or counted excluding 5.A.02-03 + 5.B.02 as "infrastructure"
and 5.C.* as "governance"). The mapping to the 7 specialists in
`toolSchema.ts:34-42` and `shared.ts:25-53`:

| 7-specialist (code)                    | v1.5 agent (Konsolidierung §5)                                          | Status   | Evidence                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `moderator`                            | 5.A.01 Dialog-Orchestrator (Skript-+PRJ_MEMO-Modus)                      | merged   | `shared.ts:26-28` — "Hält das Gespräch zusammen, fasst zusammen, leitet Übergaben ein, begrüßt zu Beginn".                          |
| `planungsrecht`                        | 5.B.03 Zoning-Interpreter                                                | merged   | `shared.ts:29-32`.                                                                                                                  |
| `bauordnungsrecht`                     | 5.B.04 Building-Code-Interpreter                                         | merged   | `shared.ts:33-37`.                                                                                                                  |
| `sonstige_vorgaben`                    | 5.B.05 Special-Case-Interpreter                                          | merged   | `shared.ts:39-42`.                                                                                                                  |
| `verfahren`                            | 5.B.06 Procedure-Synthesizer                                             | merged   | `shared.ts:44-45`.                                                                                                                  |
| `beteiligte`                           | 5.B.07 Role-Needs-Analyst                                                | merged   | `shared.ts:47-50`.                                                                                                                  |
| `synthesizer`                          | + parts of 5.C.02 Status-Agent (Top-3 derivation, Reifegrad)             | merged   | `shared.ts:52-53`.                                                                                                                  |
| (none)                                 | 5.A.02 Validator                                                         | DEFERRED | Replaced by Zod + `factPlausibility.ts`. No separate runtime entity.                                                                |
| (none)                                 | 5.A.03 Repository-Gateway                                                | DEFERRED | Replaced by `commit_chat_turn` RPC (`persistence.ts:372`). No separate runtime entity.                                              |
| (none)                                 | 5.B.01 Schema-Architect                                                  | DROPPED  | No dynamic schema. Templates are static; the JSON shape of `state` is fixed.                                                        |
| (none)                                 | 5.B.02 Consistency-Keeper                                                | DROPPED  | No qualifier-rückstufung-on-stammdaten-change in code (`projectStateHelpers.ts` doesn't propagate downgrades).                      |
| (none)                                 | 5.B.08 Gap-Analyst                                                       | DEFERRED | Implicit in the persona's prompt-driven question selection. No separate ranking layer.                                               |
| (none)                                 | 5.C.01 Execution-Agent (canonical EXEC_PLN, `DESIGNER+VERIFIED` gate)    | DROPPED  | No EXEC_PLN handbook. No DESIGNER role at runtime. **The qualifier `DESIGNER+VERIFIED` can be set by ANY assistant turn** — no role check. |

So 7 of 13 agents got merged into prompt-personas, 4 are "deferred to
prompt logic", 2 are dropped outright. Anywhere the code references a
specialist that isn't wired up: not found — the seven `specialist` enum
values match across `toolSchema.ts:34-42`, `respondTool.ts:32-40`,
`projectState.ts:40-47`, `messages.specialist` CHECK in
`0003_planning_matrix_core.sql:121`. Internally consistent.

---

## 8. The qualifier system in code

Defined: `Source = LEGAL/CLIENT/DESIGNER/AUTHORITY` (`projectState.ts:26`),
`Quality = CALCULATED/VERIFIED/ASSUMED/DECIDED` (`projectState.ts:27`).
Confirmed identical in `toolSchema.ts:31-32` and `respondTool.ts:28-29`.

| Rule (v1.5)                                                                    | Enforced?                | Evidence                                                                                                                               |
| ------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `DESIGNER+VERIFIED` only via Execution-Agent path                                | **NO** — not enforced.   | `applyExtractedFacts` (`projectStateHelpers.ts:113-138`) writes whatever `source/quality` the model emits. There is no role check, no Execution-Agent. The system prompt asks the persona to be honest (`shared.ts:217-225` qualifier honesty rules), but nothing rejects DESIGNER+VERIFIED on a CLIENT turn. **HIGH**. |
| Derived values inherit the weakest qualifier                                    | **NO** — not enforced.   | No derivation pipeline. The model is *instructed* in `personaBehaviour.ts` to mark assumptions as ASSUMED, but no graph propagation runs in code.                                                                                                       |
| Master-data changes downgrade dependents to ASSUMED                              | **NO** — not enforced.   | `applyExtractedFacts:133-135` — when a fact's `key` already exists, it overwrites in place; there is no dependency map and no cascade.                                                                                                                  |
| Every transition writes an audit event                                           | **PARTIAL**.             | `commit_chat_turn` writes ONE `project_events` row per turn (`event_type='turn_committed'` with `before_state` + `after_state` blobs, `0013_chat_turn_atomic_commit.sql`). **Per-fact qualifier transitions are NOT individually logged** — you have to diff the before/after blobs. The v1.5 spec asks for a per-transition audit row with `Vor- und Nach-Status`, which is approximately what we have at the *whole-state* level, not per-datum. |
| Plausibility downgrade → ASSUMED + warning event                                 | **YES** — enforced.      | `factPlausibility.ts:101-115` mutates `quality='ASSUMED'`, appends a `[plausibility]` reason, returns a warning that `commit_chat_turn` writes as a `project_events` row.                                                                                |

There is also a documented honesty pattern in the prompt (`shared.ts:217-237`)
asking the model to use CLIENT/ASSUMED for client-stated assumptions, never
CLIENT/DECIDED until "decided". This is a **prompt-level convention**,
not a code-enforced invariant.

The Bereichsqualifier (areas A/B/C) ACTIVE/PENDING/VOID is partially
enforced — `applyAreasUpdate` (`projectStateHelpers.ts:366-383`) writes
whatever the model emits, defaulting missing keys to `PENDING`. The v1.5
spec invariant "VOID → ACTIVE triggers reassessment of defaults" is **not
enforced** anywhere — just like all the other qualifier-cascade invariants.

---

## 9. The Bundesland resolution path

Walked end-to-end:

1. **Address entry.** `QuestionPlot.tsx` (wizard, `src/features/wizard/components/QuestionPlot.tsx`) handles type-or-pin-pick. Reverse-geocode goes through Nominatim (`PlotMap/geocode.ts`); B-Plan lookup goes through the WMS proxy `bplan-lookup` (`supabase/functions/bplan-lookup/`).
2. **Validation.** `plotValidation.ts:isMuenchenAddress` gates the wizard to München PLZs. A non-München PLZ surfaces a soft warning + an `outsideMunichAcknowledged` opt-in path (persisted as a `CLIENT/DECIDED` fact in `useCreateProject.ts:130-140`).
3. **Insert.** `useCreateProject.ts:152` writes `bundesland: 'bayern'` — a **literal**. There is no derivation from the address. There is no path to set `bundesland: 'bw'` even if the user explicitly entered a Stuttgart address.
4. **Read in chat-turn.** `index.ts:219` reads `project.bundesland` and passes it to `buildLiveStateBlock`. `systemPrompt.ts:73` renders one bullet `bundesland: bayern`.
5. **Effect on persona.** Zero. The cached prefix `BAYERN_BLOCK` is loaded unconditionally (`compose.ts:67-83`). The model never sees a different jurisdictional brief.

Edge cases:

- **Address outside Germany.** The wizard's `isPlotAddressValid` does basic plausibility but not country gating. Nominatim might return a foreign address; the user gets the soft "outside München" warning but can proceed with `outsideMunichAcknowledged`. The chat then runs Bayern-only Bundesland logic against, say, an Austrian Vorarlberg address. **BLOCKER** in principle, **LOW** in practice (PLZ regex limits to 5-digit DE-shaped strings).
- **Geocoder can't resolve.** Nominatim returns no result → wizard surfaces an error, user types literal text → still saved as `plot_address` text + `has_plot=true`. The model gets the address as text but no coordinates.
- **User changes address mid-project.** **There is no mid-project address-change UI.** `plot_address` is set at wizard time only. To change it, the user has to delete the project. So "what happens" is "nothing — they can't". **MEDIUM**.

---

## 10. The wizard (I-01 + I-02) and how it seeds the project

v1.5 §7.0 says: 4 sub-phases (Opener, Einstieg, Interview, Übergang).
**I-02 = no plot named** ⇒ areas A and C → VOID.

What the code does:

- **Opener.** Lives in `LandingPage.tsx` + the dashboard's "Neues Projekt" CTA. There is no first-time-only Opener in the v1.5 sense; it's a generic SaaS landing.
- **Einstieg.** `AuthGate` + `DashboardPage`. Generic SaaS.
- **Interview.** `WizardPage.tsx` — `WizardShell.tsx` with a `step` state ∈ {1, 2}. Step 1 = `QuestionIntent.tsx` (8 SketchCards per `INTENT_VALUES_V3` in `selectTemplate.ts`); Step 2 = `QuestionPlot.tsx` (text + map + B-Plan lookup).
- **Übergang.** `useCreateProject.submit` (`useCreateProject.ts:105-201`):
  1. Build seeded-fact array from B-Plan WMS result + `outsideMunichAcknowledged` flag.
  2. INSERT `projects` row with `state: { facts: seededFacts }` (or empty `{}`).
  3. Call `chat-turn` with `userMessage: null` to prime — this triggers the per-template first-turn primer (`firstTurnPrimer` in `index.ts:538-559`).
  4. Cache the priming response in TanStack Query and route to `/projects/:id`.

### Does I-02 = no-plot actually set areas A and C to VOID?

**NO.** Read the seed path:

- `useCreateProject.ts:142-144` — initial state passed at INSERT is **only** `{ facts: seededFacts }` or omitted entirely. **`areas` is never set.**
- The chat-turn hydration path on the very first turn calls `hydrateProjectState({}, templateId)` (`projectStateHelpers.ts:59-71`). Because the blob has no `schemaVersion: 1`, hydrate falls through to `initialProjectState(templateId)` which sets all three areas to `PENDING` (`projectStateHelpers.ts:34-52`).
- The wizard does NOT branch on `hasPlot` to set `areas.A.state = 'VOID'` and `areas.C.state = 'VOID'` (grep for `VOID` in `useCreateProject.ts` — zero hits).
- The chat-turn function's first-turn primer text (`firstTurnPrimer`) does not instruct the model to emit `areas_update` for VOID either. The persona-behaviour rule A.2 (`personaBehaviour.ts:141-160`) tells the model to emit `areas_update` for substantively-discussed domains — but it has no special-case for "user has no plot".

**Net: a no-plot project starts with areas = `{A: PENDING, B: PENDING, C: PENDING}`,
not `{A: VOID, B: PENDING, C: VOID}`.** Direct violation of v1.5 §7.0.04. **HIGH**.

The only compensation is that the prompt has Bauern-specific honesty
rules ("Erkennen Sie eine Außenbereichs-Indikation… benennen Sie § 35 BauGB
explizit und setzen Sie completion_signal=blocked", `federal.ts:41-46`),
but that's reactive, not the structural VOID bracket the v1.5 spec asks
for.

---

## 11. Observability surface

### Tables (`logs.*` + `public.event_log`)

- `logs.traces` (`0015`) — one row per Edge Function invocation. Token+cost totals; status enum `in_progress|ok|error|partial|idempotent_replay`. Service-role written; admin-RLS read.
- `logs.spans` — many per trace, with `parent_span_id` for nesting, `attributes` + `events` JSONB.
- `logs.persona_snapshots` — sampled artefacts. `system_prompt_hash` always; `system_prompt_full` 1-in-50 on success / always on error.
- `public.project_events` (`0003`+`0016`+`0022`) — append-only audit log linked to traces (FK dropped per `0022` due to ordering issue).
- `public.event_log` (`0020`) — first-party client events: `wizard|chat|result|auth|dashboard|sentry|system`. `user_id` nullable for anon; `client_ts` + `server_ts`.

### Tracer

`tracer.ts` 100+ LOC; emits `chat_turn.root`, `state.load`, `rate_limit.check`,
`user_message.insert`, `anthropic.call`, `anthropic.attempt_<N>`,
`anthropic.attempt_<N>_reminder`, `anthropic.retry` (event), `plausibility.check`,
`citation.lint`, `rpc.commit_chat_turn`, `persona.snapshot`, plus the
streaming variants `anthropic.stream`. Spans nest correctly via
`parent_span_id`. ✓

### Sentry / PostHog

- Sentry consent gate: `SentryLifecycle.tsx` (Functional). DSN-init lazy, on consent-grant.
- PostHog consent gate: `AnalyticsLifecycle.tsx` (Analytics). DSN-init lazy, on consent-grant.
- Cookie banner (`CookieBanner.tsx`) writes `cookieConsent` to `localStorage` with three buckets (Functional / Analytics / Marketing).
- `event_log` is independent of PostHog — first-party only. PostHog is a re-export bridge for product analytics.

### What's instrumented vs silent

- ✓ Every chat turn (start to finalize) — full span tree.
- ✓ Token usage + USD cost — captured on every Anthropic attempt and accumulated.
- ✓ Persona snapshots on errors + 1-in-50 successes.
- ✓ Citation violations to `event_log`.
- ✓ Wizard funnel events (`useEventEmitter('wizard')`, `phase 9.2`).
- ✗ **Address geocoding errors** — `nominatim` failures aren't wired to `event_log`.
- ✗ **B-Plan WMS errors** — only logged to console.
- ✗ **Auth flow events** — `event_log` source `'auth'` exists but Phase 9.2 didn't wire all auth paths.
- ✗ **Mid-project edits** — no events. (Mostly because there are no mid-project edits — see §9 / §16.)

### PII

`event_log` privacy contract documented in `0020_event_log.sql:626-632`:
address strings → `length: N`, message bodies → length only, coordinates →
public (OK). I sampled `useEventEmitter` callers; the contract is honored
in the Phase 9.2 commit batch I checked (`b0a6e8a`, `7d93abc`, `d468e1b`).
**MEDIUM** — no automated test enforces the privacy contract. A future
event emit could leak. Consider a Zod schema on emits.

---

## 12. Design DNA enforcement

Locked: paper, ink, clay; Inter + Instrument Serif; 0.5px hairlines; NO
shadows; NO rounded outline cards.

### Font violations (non-Inter, non-Instrument Serif)

| File:line                                                                          | Family                                                                            | Severity |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------- |
| `src/features/landing/styles/tokens.css:12,20`                                     | `'JetBrains Mono'`                                                                 | LOW (tokens block; legitimate display tier; verify with Rutik) |
| `src/features/landing/components/Analyzer.tsx:230,248,264`                         | `JetBrains Mono, monospace`                                                        | LOW (landing analyzer is ornament) |
| `src/features/wizard/styles/sketches.css:80,121`                                   | `'JetBrains Mono', ui-monospace, ...`                                              | LOW (sketch-card label) |
| `src/features/wizard/components/PlotMap/styles.css:65,105,143`                     | `Inter, system-ui, sans-serif` ✓ ; `'JetBrains Mono'` ; `Source Serif Pro, Georgia, serif` | **HIGH** — `Source Serif Pro` is a third serif. Should be Instrument Serif. |
| `src/features/dashboard/styles/siteplan.css:27`                                    | `'JetBrains Mono', ui-monospace, ...`                                              | LOW |
| `src/features/loader/AtelierOpening.tsx:475,496`                                   | `'Inter, system-ui, sans-serif'`                                                   | ✓ matches DNA |
| `src/features/loader/components/DraftingBoard.tsx:60`                              | `JetBrains Mono`                                                                   | LOW |
| `src/features/chat/components/Chamber/MessageAssistant.tsx:104,128`                | `Georgia, 'Instrument Serif', serif`                                               | NIT — Instrument Serif is the second-listed family; Georgia is first. The fallback is harmless (Instrument Serif loads on every page) but the order is the wrong way around. |
| `src/features/chat/pages/ChatWorkspacePage.tsx:215`                                | `Georgia, 'Instrument Serif', serif`                                               | NIT — same |
| `src/features/chat/components/Chamber/Spine/SpineStage.tsx:101`                    | `Georgia, 'Instrument Serif', serif`                                               | NIT |
| `src/features/chat/components/Chamber/CompactAstrolabe.tsx:109`                    | `Georgia, 'Instrument Serif', serif`                                               | NIT |
| `src/features/chat/components/Chamber/LedgerPeek.tsx:56`                           | `Georgia, 'Instrument Serif', serif`                                               | NIT |

### Shadow violations

The brief says NO shadows. Code has many. Sample (not exhaustive — grep
returned dozens):

| File:line                                                                          | Token             | Severity |
| ---------------------------------------------------------------------------------- | ----------------- | -------- |
| `src/styles/globals.css:182-183`                                                   | `--pm-shadow-input: 0 1px 2px hsl(...)`, `--pm-shadow-card: 0 1px 3px hsl(...)` | **HIGH** — these are the global tokens for input + card; their existence with non-`0 0 0 transparent` values legitimises shadows everywhere. (Note: `:166-174` declares them as transparent under one mode and as real shadows under another — that's a mode toggle, but neither the brief nor the code documents which mode is "DNA". Surface this.) |
| `src/features/landing/components/Pricing.tsx:36,99`                                | `shadow-sm`, `shadow-lg`                                                       | **HIGH** — landing pricing card has prominent `shadow-lg`. Direct DNA violation. |
| `src/features/landing/components/Hero.tsx:119,155,205`                             | `shadow-sm`, `shadow-md` ×2                                                    | **HIGH** — three Hero ornament cards have shadows. |
| `src/features/result/components/ResultFooter.tsx:74`                               | `shadow-[0_18px_36px_-22px_rgba(22,19,16,0.32)]`                                | MEDIUM (only the floating jump-to-top pill) |
| `src/features/chat/components/CitationChip.tsx:54`                                 | `shadow-[0_1px_0_rgba(...),0_12px_36px_-10px_rgba(...)]`                        | MEDIUM (popover) |
| `src/features/chat/components/Chamber/BriefingCTA.tsx:84`                          | `shadow-[0_0_0_4px_var(--spine-stage-halo)]`                                   | LOW (halo, more like a ring) |
| `src/features/chat/components/MessageContextSheet.tsx:58`                          | `shadow-[0_-12px_32px_-12px_hsl(220_15%_11%/0.18)]`                            | MEDIUM (bottom sheet) |
| `src/features/chat/components/Chamber/LedgerPeek.tsx:43`                           | `shadow-[-1px_0_0_0_rgba(123,92,63,0.18)]`                                     | NIT (effectively a 1px hairline rendered as a shadow) |
| `src/features/chat/components/ExportMenu.tsx:199-200`                              | `shadow-[0_-8px_32px_-12px_hsl(220_15%_11%/0.22)]`, `shadow-[0_8px...]`        | MEDIUM (dropdown panel) |
| `src/features/chat/components/Chamber/InputBar.tsx:220-222`                        | `shadow-[0_1px_2px_rgba(...),0_4px_18px_-8px_rgba(...)]`, `focus-within:shadow-[...]` | **HIGH** — InputBar is the most-visible chrome surface. |
| `src/features/chat/components/Chamber/LedgerTab.tsx:53,125`                        | `shadow-[0_0_0_4px_hsl(var(--clay)/0.18)]`                                     | LOW (pulsed ring) |
| `src/features/auth/components/SubmitButton.tsx:39-40`                              | `shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_2px_4px_-1px_hsl(220_15%_11%/0.18)]`, hover-stronger | **HIGH** |
| `src/features/dashboard/components/ActivityTicker.tsx:84`                          | `shadow-[0_0_0_4px_hsl(140_18%_60%_/_0.25)]`                                   | LOW (pulsed dot) |
| `src/features/dashboard/components/ProjectCard.tsx:68`                             | `hover:shadow-[0_14px_40px_-16px_rgba(22,19,16,0.18),0_4px_8px_-4px_rgba(22,19,16,0.08)]` | **HIGH** — the Project Card hover state is one of the most-visible interactions on the dashboard. |
| `src/features/cookies/CookieBanner.tsx:61`                                         | `shadow-[0_-2px_12px_-4px_hsl(0_0%_0%/0.08)]`                                  | LOW |
| `src/components/ui/select.tsx:40`                                                  | `shadow-[0_18px_36px_-22px_rgba(22,19,16,0.22)]`                               | MEDIUM (select dropdown) |

### Rounded-outline cards

`grep -rn "rounded-\(full\|2xl\|xl\|3xl\)" src/ --include="*.tsx" | wc -l` →
**91 occurrences**. Most are pills / chips / radio dots (legit), but a
hand-pick on each card surface (Pricing, Hero, ProjectCard, BriefingCTA)
should be reviewed against the "no rounded outline cards" rule. Sample
without me opening every file; flag for a focused sweep. **MEDIUM**.

### Verdict

The DNA "no shadows, no rounded outline cards" is **not enforced** in
code. The tokens (`--pm-shadow-card`, `--pm-shadow-input`) exist as a
real value in one mode, a `transparent` value in another. The brief is a
lockdown; the code, in 30+ places, is more permissive than the brief.
Either the brief needs to relax (pricing/hero cards have shadows by
design and look right), or those surfaces need to be reworked to remove
them. Right now we have **drift, not lockdown**. **HIGH** at the systemic
level; individual occurrences as listed.

---

## 13. The Render Gate, match-cut, magnetic focus, captured toast, Stand-up — Phase 7.9 LOCKED features

Found in code:

- **Match-cut** — `src/features/chat/components/Chamber/MatchCut.tsx` (62 LOC). Rendered in `ChatWorkspacePage` for hand-off transitions between specialists. Driven by Framer Motion `layout` IDs on the message cards. **No tests** — visual regression depends on the prompt emitting clean specialist switches.
- **Magnetic focus** — `useMagneticFocus.ts` hook in `chat/hooks/`. Pulls the latest message into focus when the user is idle; releases on interaction. Wired in `ChatWorkspacePage`.
- **Captured toast** — `CapturedToast.tsx` (97 LOC). Toast that fires when an `extracted_facts` delta lands; uses Framer Motion presence + a ledger-integration animation.
- **Stand-up** — `StandUp.tsx` (269 LOC). The brief-overlay "Stand-up der drei Bereiche" surface. Reads `extractLedgerSummary(state)` (`projectStateHelpers.ts:400-438`) and renders A/B/C ACTIVE/PENDING/VOID + top facts + top recs.
- **Render Gate** — searched, see below. The terminology "Render Gate" doesn't appear verbatim. Closest matches: `useCompletionGate.ts` (gates the briefing CTA), `Astrolabe.tsx` + `CompactAstrolabe.tsx` (the radial reify-meter). This may be the "Render Gate" in disguise. **Open question** — verify with Rutik.

Regression risk: each of these is structurally entangled with the prompt
(specialist switches → match-cut; `extracted_facts` → captured toast;
`areas` → stand-up). A future tweak to any of those payload paths could
silently break the visual. There is **no test that exercises the
animation pipeline** — the only Phase 7.9 acceptance is the static
smoke-walk on prompt structure. **MEDIUM**.

---

## 14. State of Phase 11 readiness (State Delta Framework)

The brief envisions: `src/legal/federal.ts` + `src/legal/states/<lan>.ts` +
a `StateDelta` interface + `legalRegistry.ts` that composes at runtime.

What exists today:

- `supabase/functions/chat-turn/legalContext/federal.ts` — 149 LOC of pure federal content (BauGB, BauNVO, GEG, § 246e BauGB Bauturbo). **Already extractable.**
- `supabase/functions/chat-turn/legalContext/bayern.ts` — **500 LOC.** Genuinely Bayern-specific: BayBO articles (Art. 2/6/44a/47/57/58/58a/59/60/61/62/64/65/66/69/82c) ≈ 200 LOC; BayDSchG ≈ 30 LOC; ÖbVI / ADBV correction ≈ 20 LOC; PLZ heuristic ≈ 10 LOC; T-01 PFLICHTTHEMEN block ≈ 100 LOC (this is half-template, half-Bayern); Vorbehalt + DISZIPLIN blocks ≈ 80 LOC.
- `supabase/functions/chat-turn/legalContext/muenchen.ts` — 397 LOC of city-level (StPlS 926, Stadtbezirke, LBK Sub-Bauamt routing, Maxvorstadt block-rand, Münchner Architektenkammer addresses).

### Honest assessment of "80 LOC per state"

The brief's 80-LOC-per-state estimate is **wildly optimistic** given the
actual Bayern slice. After moving cleanly federal-extractable content
(MBO heuristics, Sonderbau-Schwellen common to all LBOs, Gebäudeklassen
shape) up to `federal.ts`, what remains *Bayern-specific* in `bayern.ts`
is realistically **300+ LOC** to hold the same legal completeness:

- 16 Landesbauordnungen each have different article numbers for the same
  matter (BW: §; NRW: §; Hessen: §; Bayern: Art. — this **alone** is a
  StateDelta the prompt has to encode).
- Verfahrenstypologie names diverge (vereinfachtes vs Kenntnisgabe vs
  Vorabbescheid).
- Gebäudeklassen-Schwellen are mostly common but not identical (Bayern
  shifted Versammlungsstätten-Schwelle to 200 in 2025, BW to 300, NRW to
  200 — verify, but the point is each state needs its own table).
- Bauvorlageberechtigung-Listen (BAYAK vs AKBW vs AKNW) diverge.
- Per-state Modernisierungsdaten (Bayern 01.01.2025, others on different
  dates) need to be carried.

A realistic per-state slice is **150–250 LOC** of substantive content.
The brief's 80-LOC estimate may have been counting only the "delta from
federal", but federal.ts is barely a quarter of the full Bayern context.
**Push back on the 80-LOC estimate when scoping Phase 11.**

### Sketch of `StateDelta` based on what bayern.ts actually contains

```ts
export interface StateDelta {
  // Identity
  bundesland: 'bayern' | 'bw' | 'nrw' | 'berlin' | ...;
  bundeslandLabelDe: string;
  bundeslandLabelEn: string;
  postcodeRanges: string[];          // for the Bundesland-PLZ heuristic block

  // Bauordnung
  lboShortName: string;              // "BayBO"
  lboLongName: string;               // "Bayerische Bauordnung"
  lboArticleSep: 'Art.' | '§';       // glyph used in citations
  forbiddenCitations: ForbiddenPattern[];   // for citationLint
  correctCitations: { article: string; gist: string }[];

  // Verfahrenstypen
  procedures: {
    id: string;                      // "verfahrensfrei" | "vereinfacht" | ...
    article: string;                 // "Art. 57" | ...
    name_de: string;
    description_de: string;
  }[];

  // Gebäudeklassen
  gebaeudeklassen: {
    id: 'GK1'|...|'GK5';
    schwellen: { hoehe_m?: number; bgf_m2?: number; hint?: string };
    description_de: string;
  }[];

  // Modernisierungs-Stände
  modernisierungen: {
    inKraftAt: string;               // ISO date
    aenderungen_de: string[];        // bullet list
  }[];

  // Bauvorlageberechtigung
  bauvorlageberechtigt: {
    architektenkammerName: string;
    architektenkammerUrl: string;
    ingenieurekammerName: string;
    ingenieurekammerUrl: string;
  };

  // Vermessung (the ÖbVI vs ADBV correction lives here)
  vermessungsstellen: {
    primaryName: string;             // "ADBV" in Bayern, "ÖbVI" in NRW
    altNamesAccepted: string[];
    cityOffices: { city: string; name: string; url: string }[];
  };

  // Denkmalschutz
  denkmalSchutzGesetz: { shortName: string; relevantArticles: string[] };

  // Per-template overrides (optional)
  templateOverrides?: Partial<Record<TemplateId, string>>;
}
```

This shape lets `legalRegistry.ts` look up by `projects.bundesland` and
compose: `SHARED + FEDERAL + applyDelta(delta) + (cityDelta if present) +
PERSONA_BEHAVIOUR + TEMPLATE_SHARED + getTemplateBlock(t)`. The current
hard-coded composition is what to replace.

**LBO BW** would fall out cleanly from this: the StateDelta swaps
`Art.` → `§`, BAYAK → AKBW, ADBV → ÖbVI, postcodeRanges to BW PLZs.
Per the bayern.ts size, expect **~180 LOC** for a faithful BW slice.

---

## 15. The full v1.5 TL/CL backlog

Konsolidierung v1.5 has ~60 open TL- and CL-Zuarbeiten across §1–§7. I
walked the document; below is the full table. **DONE / PARTIAL / MISSING**
is judged against what the code actually delivers; "evidence" cites
file:line where applicable.

| ID                  | Status   | Evidence / Notes                                                                                                        |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| TL-1.0.05.A-01      | PARTIAL  | T-01..T-08 tails carry planungsrechtliche Annahmen (`templates/t01..t08.ts`). Quality of "characteristic assumption" varies; T-08 deliberately abstains. |
| TL-1.0.05.A-02      | MISSING  | No structured BauGB-Paragraphen-Liste per template. Inline in prompt only.                                              |
| CL-1.0.05.A-01      | PARTIAL  | Federal/Bayern blocks contain BauGB/BauNVO interpretation (`federal.ts:21-46`). Not separated as a Constitutional-Layer subbereich. |
| CL-1.0.05.A-02      | MISSING  | No Aktualitätsprüfung process. There's a `freshness-check.mjs` script (data sources) but not for legal citations.       |
| TL-1.0.05.B-01      | DONE     | Each template tail names its Gebäudeklasse-Hypothese + Verfahrensart-Vermutung.                                          |
| TL-1.0.05.B-02      | PARTIAL  | T-01 block has `T-01 PFLICHTTHEMEN` listing expected Nachweise (`bayern.ts:397-499`); other templates carry per-tail mention but inconsistent. |
| CL-1.0.05.B-01      | PARTIAL  | BayBO + MBO present; the 16 LBOen are NOT structured. Bayern only.                                                       |
| CL-1.0.05.B-02      | DONE     | MBO/Bayern Schwellen mentioned (`bayern.ts:122-130, 138-147`).                                                            |
| CL-1.0.05.B-03      | MISSING  | Technische Baubestimmungen list — none.                                                                                 |
| TL-1.0.05.C-01      | PARTIAL  | Per-template tails mention typical Sonstige (Denkmal, Stellplatzsatzung, etc.). Not a structured list.                  |
| TL-1.0.05.C-02      | OPEN-INTENT | Template scope-of-Bereich-C is left to the model; no fixed structure.                                                 |
| CL-1.0.05.C-01      | PARTIAL  | BayDSchG present (`bayern.ts:339-352`); StPlS 926 in `muenchen.ts`. Many other Fachgesetze missing.                      |
| CL-1.0.05.C-02      | MISSING  | No strategy for kommunale Sondersatzungen — München-only hard-coded.                                                     |
| CL-1.0.05.C-03      | PARTIAL  | Nutzung→Zusatzgenehmigungs-Matrix exists implicitly in prompt, not as data.                                              |
| TL-2.0.01-01        | VOID     | Per spec.                                                                                                               |
| CL-2.0.01-01        | MISSING  | Constitutional Layer governance — nothing in repo about "wer pflegt".                                                   |
| CL-2.0.01-02        | MISSING  | No CL-subdivision (CL.Agenten / CL.Recht / CL.Vokabular / ...) structure on disk.                                        |
| TL-2.0.02-01        | DONE     | Per template: KEY_DATA defaults are seeded by wizard for B-Plan facts; PLN_INFO/EXEC_PLN/PRJ_MEMO are seeded by the priming turn. Not exactly per-spec but functionally equivalent. |
| TL-2.0.02-02        | MISSING  | Template-Revisions-Logik — there is no concept of "the schema changed mid-project". `projects.template_id` is fixed at INSERT.                       |
| CL-2.0.02-01        | DONE     | Template catalogue with 8 entries (`templates/index.ts:24-33`).                                                          |
| CL-2.0.02-02        | DONE     | I-01 → template selection is `selectTemplate(intent)` in `src/features/wizard/lib/selectTemplate.ts` (1:1 mapping intent → templateId). I-02 doesn't influence template selection — see §16. |
| TL-2.0.03-01        | VOID     | Per spec.                                                                                                               |
| CL-2.0.03-01        | DONE     | Project isolation = RLS (`0003_planning_matrix_core.sql` + per-table policies).                                          |
| CL-2.0.03-02        | MISSING  | Aufbewahrungs-/Löschfristen — only `logs.prune_old()` (90 days) for traces. Project data has no retention policy.        |
| TL-3.A-01           | PARTIAL  | Template tails seed initial KEY_DATA via the per-template primer (`firstTurnPrimer`, `index.ts:538`); not structured per-template constants. |
| TL-3.A-02           | PARTIAL  | Default-Werte are emitted by the model on first turn, not persisted by template constants.                                |
| CL-3.A-01           | PARTIAL  | KEY_DATA "5 chapters" structure NOT modelled — just `state.facts: Fact[]` flat.                                          |
| CL-3.A-02           | MISSING  | No per-field validation. Plausibility is bounds-only (`factPlausibility.ts`).                                            |
| CL-3.A-03           | MISSING  | No "Schlüssel-Datenpunkte" list. No Re-Instantiation logic.                                                              |
| TL-3.B-01           | PARTIAL  | Templates name typical Verfahren in prose; not as data.                                                                  |
| TL-3.B-02           | PARTIAL  | Same.                                                                                                                   |
| TL-3.B-03           | MISSING  | Nutzungsart→Verfahren→Dokumente matrix not modelled as data.                                                              |
| CL-3.B-01           | MISSING  | Verfahrenskatalog V-01..V-05 / N-01..N-07 — not as data.                                                                  |
| CL-3.B-02           | MISSING  | Dokumentenkatalog — not as structured data; see `src/data/legalRuleSnippets.ts` for the closest analogue (which is for a different surface). |
| CL-3.B-03           | MISSING  | No status-lifecycle enforcement. The 6 statuses exist as `ItemStatus` (`projectState.ts:78-84`) but transitions are not gated. |
| TL-3.C-01           | MISSING  | EXEC_PLN as a "menschenlesbares Projekthandbuch" doesn't exist.                                                          |
| TL-3.C-02           | N/A      | Same — there's nothing to template.                                                                                      |
| CL-3.C-01           | MISSING  | EXEC_PLN 6-area structure — not modelled.                                                                                |
| CL-3.C-02           | MISSING  | No machine-readable Spiegelung logic.                                                                                    |
| CL-3.C-03           | MISSING  | Versionierungsstrategie — none.                                                                                          |
| TL-3.D-01           | PARTIAL  | Initial PRJ_MEMO populated by priming turn; HOAI Phase guess implicit.                                                   |
| TL-3.D-02           | MISSING  | PRJ_MEMO 6-area structure — only `recommendations` (Top-3) is implemented. Historie / Aktive Beteiligte / Behördenbeziehungen / Korrespondenz / Phasenstand are missing. |
| CL-3.D-01           | MISSING  | Eintragsformat (Zeitstempel, Person, Ereignistyp, Beschreibung) — only `project_events` schema, not the spec's structure. |
| CL-3.D-02           | PARTIAL  | Top-3 priorisierungs-Regel implicit in prompt.                                                                           |
| CL-3.D-03           | MISSING  | Ticket-Format — not modelled.                                                                                           |
| TL-3.E-01           | VOID     | Per spec.                                                                                                                |
| CL-3.E-01           | PARTIAL  | Top-3 format implicit in `Recommendation` shape (`projectState.ts:131-149`).                                              |
| CL-3.E-02           | PARTIAL  | Fallback for <3 recs handled by `RECOMMENDATIONS_CAP` rendering.                                                          |
| TL-4.C-01           | VOID     | Per spec.                                                                                                                |
| CL-4.C-01           | MISSING  | Propagationsregel "weakest qualifier inherits" — not enforced. See §8.                                                    |
| CL-4.C-02           | MISSING  | Rückstufung bei Stammdaten-Änderung — not enforced.                                                                       |
| CL-4.C-03           | PARTIAL  | Audit-Format — `commit_chat_turn` writes single per-turn rows; not per-qualifier-transition.                              |
| TL-5.A.01-01        | DONE-ish | Per-template grundton in the first-turn primer text (`firstTurnPrimer`).                                                  |
| CL-5.A.01-01        | MISSING  | Initialisierungs-Skript (Opener, Einstieg, Interview, Übergang) — not in CL form. Wizard hard-codes the equivalent. |
| CL-5.A.01-02        | PARTIAL  | Dialogblock-Bündelungsregel in `shared.ts:83-111`.                                                                       |
| CL-5.A.01-03        | PARTIAL  | Sprachliche Register present in personaBehaviour.ts.                                                                      |
| CL-5.A.01-04        | MISSING  | Sichtbarkeits-Meldungstexte — none.                                                                                      |
| TL-5.A.02-01        | VOID     | Per spec.                                                                                                                |
| CL-5.A.02-01        | MISSING  | Field-validation rules — only Zod-shape + bounds. No A1/A2/A3 typology.                                                  |
| CL-5.A.02-02        | MISSING  | Konfliktauflösungs-Regeln — none.                                                                                       |
| TL-5.A.03-01        | VOID     | Per spec.                                                                                                                |
| CL-5.A.03-01        | PARTIAL  | Qualifier-Zuweisungs-Regeln — model emits, code stores. No automatic rules.                                              |
| CL-5.A.03-02        | DONE     | Audit format in `commit_chat_turn`.                                                                                       |
| TL-5.B.01-01        | PARTIAL  | Template catalogue per `templates/t01..t08.ts`.                                                                          |
| TL-5.B.01-02        | DONE     | I-01 → template via `selectTemplate.ts`. I-02 → not used in selection.                                                   |
| CL-5.B.01-01        | MISSING  | Schema-Erweiterungs-/Reduktions-Regeln — no dynamic schema.                                                              |
| CL-5.B.01-02        | MISSING  | Schwellen-Antworten-Definition — none.                                                                                   |
| TL-5.B.02-01        | VOID     | Per spec.                                                                                                                |
| CL-5.B.02-01        | MISSING  | Abhängigkeitsgraph — none.                                                                                               |
| CL-5.B.02-02        | N/A      | Without Schema-Architect / Consistency-Keeper this is moot.                                                              |
| TL-5.B.03-01        | DONE-ish | See TL-1.0.05.A-01.                                                                                                       |
| CL-5.B.03-01        | PARTIAL  | See CL-1.0.05.A-01.                                                                                                       |
| CL-5.B.03-02        | MISSING  | External Geodaten-Quelle for B-Pläne — only WMS proxy for München; no general strategy.                                  |
| TL-5.B.04-01        | DONE-ish |                                                                                                                          |
| CL-5.B.04-01        | PARTIAL  | Bayern only.                                                                                                             |
| CL-5.B.04-02        | OPEN-INTENT | "full LBO vs deltas-only" — Phase 11 will decide.                                                                     |
| TL-5.B.05-01        | PARTIAL  |                                                                                                                          |
| CL-5.B.05-01        | PARTIAL  |                                                                                                                          |
| CL-5.B.05-02        | MISSING  | Priorisierungs-Strategie für Bereich C.                                                                                  |
| TL-5.B.06-01        | PARTIAL  |                                                                                                                          |
| CL-5.B.06-01        | MISSING  | Synthese-Regel als Matrix.                                                                                               |
| CL-5.B.06-02        | PARTIAL  | Begründungstext-Schablonen implicit.                                                                                     |
| CL-5.B.06-03        | MISSING  | Pflichtgrad-Konflikte.                                                                                                   |
| TL-5.B.07-01        | PARTIAL  |                                                                                                                          |
| CL-5.B.07-01        | PARTIAL  | Rollen in `src/data/legalRuleSnippets.ts` and BAYAK/BAYIKA in `bayern.ts:263-282`.                                       |
| CL-5.B.07-02        | MISSING  | Bauvorlageberechtigungs-Regeln je Bundesland — only Bayern.                                                              |
| TL-5.B.08-01        | VOID     |                                                                                                                          |
| CL-5.B.08-01        | MISSING  | Priorisierungs-Regeln formal.                                                                                            |
| CL-5.B.08-02        | MISSING  | Ticket-Format formal.                                                                                                     |
| TL-5.C.01-01        | MISSING  | EXEC_PLN handbook templates — not modelled.                                                                              |
| CL-5.C.01-01        | MISSING  | Freigabelogik DESIGNER+VERIFIED — see §8.                                                                                |
| CL-5.C.01-02        | MISSING  |                                                                                                                          |
| CL-5.C.01-03        | MISSING  | Eskalationslogik — none.                                                                                                |
| TL-5.C.02-01        | PARTIAL  | Initial Top-3 not per-template constants.                                                                                |
| CL-5.C.02-01        | MISSING  | Reifegrad-Aggregations-Regeln formal.                                                                                    |
| CL-5.C.02-02        | MISSING  | HOAI-Phasenstand-Ableitung — not in code.                                                                                |
| CL-5.C.02-03        | MISSING  | Top-3-Priorisierungs-Regel formal.                                                                                       |
| TL-7.0-01           | VOID     |                                                                                                                          |
| CL-7.0-01           | MISSING  | Initialisierungs-Skript — wizard hard-codes; not as CL data.                                                             |
| CL-7.0-02           | MISSING  | Freistellungs-Seitenpfad ("Sonstige" → side branch) — Sonstige currently routes to T-08, no side branch.                  |
| CL-7.0-03           | OPEN-INTENT |                                                                                                                       |
| TL-7.A.0X-01 (×8)   | MIXED    | Most are PARTIAL (per-template Untergate-Strukturen exist as prompt content; not as Gates per se).                        |
| CL-7.A.0X-01 (×8)   | MIXED    | Mostly MISSING — Gates 00/10/20/30/40/50/60/99 don't exist as a navigation surface. The chat workspace is one-pane; the result page is another. |
| TL-7.D-01           | VOID     |                                                                                                                          |
| CL-7.D-01..04       | MOSTLY MISSING | Verarbeitungsrhythmik (asynchroner Hintergrundtakt) is **not implemented**. Everything is one synchronous Anthropic call per user turn. There is no separate Hintergrund-Analyse process. **HIGH** if v1.5 Vordergrund/Hintergrund is non-negotiable; otherwise flag for product alignment. |
| 8.0.04 / 8.0.05 / 8.0.06 (cross-cuts) | OPEN | Governance, Template-Katalog-Vollausarbeitung, systematische TL/CL-Bearbeitung — these ARE the Phase 11 backlog. |

Quick stats: of ~60 line items above, **DONE** ≈ 6, **PARTIAL** ≈ 20, **MISSING** ≈ 30, **VOID** (per spec) ≈ 8.

---

## 16. Bugs you found while reading

| #   | Severity | File:line                                                                                                       | Description                                                                                                                                                                                                                                                                                                                                              |
| --- | -------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B01 | BLOCKER  | `supabase/functions/chat-turn/citationLint.ts:55-104`                                                           | **citationLint does not catch LBO BW** (Baden-Württemberg) — exactly the screenshot's bug. The list enumerates only NRW, Brandenburg, Berlin. It also doesn't catch Hessen, Saxony, Niedersachsen, RLP, Schleswig-Holstein, MV, Bremen, Hamburg. The defence's "fifth layer" is incomplete by 12 of 16 wrong-Bundesländer.                                |
| B02 | BLOCKER  | `src/features/wizard/hooks/useCreateProject.ts:142-158`                                                         | **No-plot does NOT set areas A and C to VOID.** Direct violation of v1.5 §7.0.04 and the brief's I-02 invariant. State is seeded as `{ facts: ... }` only; chat-turn hydrates to `{A: PENDING, B: PENDING, C: PENDING}` per `initialProjectState`. The model is not instructed via the prompt to special-case no-plot for VOID either. |
| B03 | HIGH     | `supabase/functions/chat-turn/citationLint.ts:152-159`                                                          | **citationLint scans only `message_de` + `message_en`.** Recommendations / procedures / documents / facts evidence text bypass the lint. A bad citation embedded in a `recommendations_delta[*].detail_de` ships to the result page.                                                                                                                     |
| B04 | HIGH     | `src/features/wizard/hooks/useCreateProject.ts:152` + `supabase/functions/chat-turn/legalContext/compose.ts:67` | **`projects.bundesland` is decorative.** It's hard-coded `'bayern'` at insert and never used to gate `BAYERN_BLOCK` vs anything else. The cached prefix is unconditionally Bayern. A future BW project (after Phase 11) will silently get Bayern law unless the registry is wired.                                                                       |
| B05 | HIGH     | `src/lib/projectStateHelpers.ts:113-138` + `:113`                                                               | **No qualifier-provenance enforcement.** `applyExtractedFacts` writes whatever `source/quality` the model emits. DESIGNER+VERIFIED can be set on a CLIENT turn. v1.5 §6.B.01 requires this combination only via the Execution-Agent path.                                                                                                                |
| B06 | HIGH     | `src/lib/projectStateHelpers.ts` (whole file)                                                                   | **No dependency-graph cascade.** Master-data changes don't downgrade dependents to ASSUMED. The brief's "lebendiges Bewertungssystem" (P-07) is not implemented.                                                                                                                                                                                          |
| B07 | HIGH     | Many; sample `src/features/dashboard/components/ProjectCard.tsx:68`, `src/features/landing/components/Hero.tsx:119,155,205`, `src/features/landing/components/Pricing.tsx:36,99`, `src/features/chat/components/Chamber/InputBar.tsx:220-222` | **Design DNA "no shadows" is not enforced.** Several high-visibility surfaces ship `shadow-md`, `shadow-lg`, custom `shadow-[…]`. Either drift or the brief is wrong.                                                                                                                                                              |
| B08 | HIGH     | `src/features/wizard/components/PlotMap/styles.css:143`                                                         | **Third serif family `Source Serif Pro`** not in the DNA. Should be Instrument Serif.                                                                                                                                                                                                                                                                  |
| B09 | HIGH     | `src/styles/globals.css:182-183`                                                                                | **Shadow tokens `--pm-shadow-input` / `--pm-shadow-card` are non-zero in one mode.** Legitimises shadows everywhere. Either set them transparent in *all* modes or document which mode is "DNA-strict". |
| B10 | HIGH     | `supabase/functions/chat-turn/persistence.ts:407-418` + `tracer.ts`                                             | **Tracer ordering = chronic FK pain.** `commit_chat_turn` writes child `project_events.trace_id` BEFORE `tracer.finalize` writes the parent `logs.traces` row. 0018 added an FK; 0022 dropped it because every Phase-9-aware turn was failing. The "future fix" comment in `0022` (write a trace stub on creation, UPDATE at finalize) is the right fix, not yet implemented. Net: `project_events.trace_id` is a dangling pointer with no DB-level integrity. |
| B11 | HIGH     | `src/features/chat/pages/ChatWorkspacePage.tsx` + `useCreateProject.ts:174-188`                                 | **Wizard priming caches a server response without `areas`.** The `queryClient.setQueryData(['project', newProjectId], { ...projectRow, state: response.projectState, ... })` works, but earlier-Phase comments in `projectStateHelpers.ts:414-425` mention a defensive `?.` because "the cache seed from useCreateProject (after a successful priming turn) does NOT always include `areas`". The defensive read is a workaround; the seed should always include the canonical shape. |
| B12 | HIGH     | `supabase/functions/chat-turn/index.ts:163-203`                                                                 | **Rate-limit failures are user-facing 500.** When the rate-limit RPC errors transiently (network blip), the function returns `internal` and the SPA shows "Storage error". A "fail-closed-with-retry" or "warn-and-continue with sentry tag" might be more appropriate. **Verify product intent before fixing.** |
| B13 | MEDIUM   | `supabase/functions/chat-turn/anthropic.ts:46-47`                                                               | **`MAX_TOKENS = 1280`** with a TODO from Phase 4 to evaluate streaming or 4.6 upgrade. We *are* on 4.6 (`toolSchema.ts:27`), so the TODO is stale. The cap is plausible, just verify it isn't truncating Synthese-Turns (the persona-rule allows up to 1500 chars in `message_de` only, which is roughly ~600 tokens, leaving headroom). |
| B14 | MEDIUM   | `supabase/functions/chat-turn/streaming.ts:50-51` + `anthropic.ts:46-47`                                        | **`MAX_TOKENS` and `ABORT_TIMEOUT_MS` are duplicated** in two files. A change to one is silent on the other. Hoist to a shared constants module.                                                                                                                                                                                                       |
| B15 | MEDIUM   | `supabase/functions/chat-turn/factPlausibility.ts:101-106`                                                       | **Plausibility downgrade ALSO downgrades `DECIDED`** (not just VERIFIED) to ASSUMED. v1.5 §4.B.03 says DECIDED is a definitive Bauherr-Festlegung — downgrading it on a numeric range disagreement is a semantic error (the value is what the user said, even if implausible). DECIDED should arguably stay DECIDED with a warning, not be silently demoted. **Discuss with Rutik.** |
| B16 | MEDIUM   | `src/lib/projectStateHelpers.ts:82-93` (`fingerprintQuestion`)                                                  | **Question-asked dedup is brittle.** `replace(/[^a-z0-9]+/g, ' ')` collapses umlauts to ASCII pre-NFKD, but the regex `/[̀-ͯ]/g` strips combining marks AFTER. The visible normalisation is fine, but the model is known to rephrase liberally; the fingerprint catches the literal-similarity case only. The helper itself is honest about this in the comment. **NIT** elevation: dedup might be slightly too aggressive (200 char cap with diacritics-stripped + lowercased — a long question fingerprints to a prefix). |
| B17 | MEDIUM   | `supabase/migrations/0023_messages_idempotency_role_scoped.sql` and `0023`'s comment                             | **Pre-0023 history.** Every non-priming chat turn was failing on 23505 since 0013 was applied. This was found and fixed, but the bug pattern (idempotency-key scope drift between 0003 and 0013) is the kind of thing that should have been caught by an integration test. There is no integration test for the idempotency path. |
| B18 | MEDIUM   | `0016_project_events_trace_link.sql:289-345`                                                                    | **0016 silently reverted 0014's `text[]` cast.** Comment claimed "unchanged from 0013" — copy-pasted 0013 instead of 0014, dropping the fix. 0021 had to re-apply. The migrations are not diff-aware; a "ratchet" check or a meta-test of the function body's invariants would have caught it. |
| B19 | MEDIUM   | `supabase/functions/chat-turn/index.ts:286-299`                                                                 | **First-turn primer is invented every turn for empty histories.** If `anthropicMessages.length === 0` true on a non-first call (e.g. all 30 history messages were filtered), the primer fires unintentionally. The check should also assert "we believe this is the first turn" (e.g. project's message count is zero), not just "the slice we built is empty". **LOW practical risk** because `loadProjectAndMessages` returns the actual messages, but the assertion is fragile. |
| B20 | MEDIUM   | `supabase/functions/chat-turn/factPlausibility.ts:46-64` + `personaBehaviour.ts:165-178`                         | **Plausibility bounds list is short** (6 numeric keys + 3 categorical). The persona prompt instructs the model to use specific keys; if the model emits a typo of the key, the value bypasses both the bound check and the categorical check (no key-allowlist). |
| B21 | LOW      | `supabase/functions/chat-turn/index.ts:138-147`                                                                 | **`SB_REGION` / `AWS_REGION` env shim** is fine but the fallback ordering (SB first) is the opposite of what some platforms do. **NIT.** |
| B22 | LOW      | `supabase/functions/chat-turn/persistence.ts:402-418`                                                           | **Hard-coded all-zeros UUID** as the noop-tracer marker, in two places. Define a constant. |
| B23 | LOW      | `src/types/projectState.ts:185`                                                                                  | **`lastTurnAt` is a `string`** (ISO). Fine, but a Branded-type would prevent accidental Date arithmetic without `new Date(...)`. **NIT.** |
| B24 | LOW      | `src/features/chat/pages/ChatWorkspacePage.tsx:215`                                                             | **Inline `style={{ fontFamily: ... }}`** instead of a Tailwind class or token. Consistency-only. **NIT.** |
| B25 | LOW      | `supabase/functions/chat-turn/legalContext/erlangen.ts`                                                         | **Sleeping** (291 LOC, never composed). Confirmed unused via `compose.ts:35`. Either re-enable as city #2 in Phase 11 or delete; right now it's dead code that's eligible for the next dead-code sweep but explicitly retained per the comment. |
| B26 | NIT      | `supabase/functions/chat-turn/anthropic.ts:309`                                                                 | **`import { ... } from './retryPolicy.ts'` is mid-file.** Cosmetics. |
| B27 | NIT      | `supabase/functions/chat-turn/systemPrompt.ts:38-42`                                                            | **Comment says "lint will flag it after the next dead-code sweep"** — the dead `_LEGACY_PERSONA_BLOCK_V1` is referenced but doesn't exist in the file (already removed). Stale comment. |
| B28 | NIT      | `src/lib/projectStateHelpers.ts:88`                                                                              | **The unicode range `[̀-ͯ]` in source is the literal U+0300..U+036F glyphs.** Functional but confusing on read. Use `̀-ͯ`. |
| B29 | NIT      | `supabase/functions/chat-turn/index.ts:585-614`                                                                 | **`translateUpstream` mutates an enum-shaped object based on `err.code`** — the `if (err.code === 'invalid_response')` etc. cascade is fine, but a `switch (err.code)` is more idiomatic for an enum. |
| B30 | NIT      | `supabase/migrations/0005_seed_dashboard_variety_OPTIONAL.sql`                                                  | **A migration file with a hardcoded ROLLBACK at the bottom** is unusual; it's documented but a future maintainer might commit a `BEGIN; ... COMMIT;` after editing. Move to `seed/` not `migrations/`. |

(I grepped for `any`, `as any`, `as unknown as`, useEffect missing-deps,
fetch-with-no-timeout patterns; the codebase is unusually disciplined on
those. I did not find a smoking gun for OWASP-class issues — RLS is
consistent, SECURITY DEFINER functions all `SET search_path`, the CSP
in `vercel.json:20` is reasonably tight. Nothing screamed at me on the
secret-leak axis.)

---

## 17. What I'd change first

Top 5, opinionated:

1. **Fix B02 first.** `useCreateProject.ts:152` should write the canonical full-shape state, including `areas`. When `hasPlot=false`, areas A and C must be VOID; areas B PENDING. This is **one line** in v1.5 (§7.0.04) and zero lines in code. It's also a pre-condition for anything Phase 11 says about state-delta composition — without it, every no-plot project is structurally lying.
2. **Generalise citationLint to all wrong Bundesländer (B01) AND all model-emitted text fields (B03).** Specifically: build a `forbiddenBundeslandPatterns` table covering BW / Hessen / Sachsen / Niedersachsen / RLP / SH / MV / Bremen / Hamburg / Saarland / Thüringen / Sachsen-Anhalt / Berlin / Brandenburg / NRW. And run the lint over `recommendations_delta[*].title_*` + `detail_*`, `procedures_delta[*].rationale_*`, `documents_delta[*].title_*`, `extracted_facts[*].evidence`. This is the *acceptance test* for the Phase 10.1 defence, and right now it would fail on the LBO-BW screenshot.
3. **Wire `projects.bundesland` to actually pick the legal slice (B04).** Even before Phase 11. If the value is `'bayern'`, compose with `BAYERN_BLOCK`; if anything else, **refuse to load the chat** (or hard-redirect to a "this Bundesland not yet supported" screen). The current silent Bayern-default is the kind of thing that is invisible until it shows up in a screenshot.
4. **Rebuild the tracer ordering (B10).** Insert a trace stub when `createTracer` runs (parent row first, status='in_progress'), then UPDATE at finalize. Re-add the FK with `ON DELETE SET NULL`. The "future fix" was the right call; right now `project_events.trace_id` is informational-only.
5. **Decide the design DNA dispute (B07/B08/B09).** Either remove every `shadow-*` from non-ornamental surfaces (Hero, Pricing, ProjectCard, InputBar, ExportMenu, MessageContextSheet, CitationChip, SubmitButton, CookieBanner, select.tsx) — which is a coherent rewrite — OR relax the brief to "shadows allowed on ornamental surfaces, never on Chamber/Spine/Astrolabe/Stand-up/Render-Gate primitives". Either is fine; status quo is incoherent.

Lower-priority but flagged: the **qualifier provenance enforcement** (B05)
needs a real Execution-Agent path, but that's bigger than a quick fix.
The **dependency cascade** (B06) requires modelling EXEC_PLN/PRJ_MEMO
properly, which is a Phase 12+ effort. The **HOAI Phasenstand derivation**
(CL-5.C.02-02) is product, not engineering — needs Rutik input.

### Push-back on the roadmap

- The brief's claim that Phase 11 needs ~80 LOC per state is optimistic.
  Realistic is **150–250 LOC**. Plan Phase 11 with that budget, not 80.
- v1.5's "Vordergrundtakt vs Hintergrundtakt" (§7.D) is **not implemented at all**.
  The current implementation is one synchronous turn per user message.
  If the asymmetric-takt is non-negotiable, that's a Phase 12+ rebuild,
  not a tweak. **Surface this with Rutik before Phase 11 scoping is final.**
- The "11 agents → 7 specialists" merger is fine as a delivery shortcut,
  but **none** of the 4 deferred agents (Schema-Architect, Consistency-Keeper,
  Gap-Analyst, Execution-Agent) are coming back via prompt content alone.
  Specifically: there is no path to "Decided→bindend, Re-Bewertung, Audit-Trail per
  qualifier transition" without dedicated code. If v1.5 §4.0.01 stays
  authoritative, we're not architecturally there.

---

## 18. Open questions for Rutik

1. **Does the Completeness qualifier (Required/Conditional/Optional) need to come back?** Alignment v1 §4.1.3 specified it; v1.5 dropped it; the briefing didn't mention it. The code has nothing for it. If Required-vs-Conditional-vs-Optional matters for the "Reifegrad" / "alle Lichter auf Grün" gate, we need it back.
2. **Should `projects.bundesland` be allowed to drift?** Today it's hardcoded `'bayern'`. Phase 11 plans to make it dynamic. Until then, what's the right behaviour for a non-München address (B04 above) — fail closed, soft warn (current), or silent allow?
3. **"Render Gate" — does this mean `useCompletionGate` + `Astrolabe`, or something else?** I couldn't find the literal term in code. Want to make sure I haven't missed a Phase 7.9 surface.
4. **Is the synchronous-only turn architecture a final answer or a temporary?** v1.5 §7.D's Vordergrund/Hintergrund split is one of the doc's load-bearing ideas. The code does not implement it. Is this a design pivot or technical debt?
5. **Is the "Anlage 1 BayBO" focus of citationLint intentional?** The defence is laser-targeted at one bug. The screenshot you mentioned is LBO BW — a different bug class entirely. Should citationLint stay narrow + we add BW-specific patterns case-by-case, or rebuild it as a "wrong-Bundesland firewall" generally?
6. **`DESIGNER+VERIFIED` enforcement.** Today any turn can write it. v1.5 §6.B.01 says only the DESIGNER role. Are we okay with prompt-discipline as the only guard, or do we want code-side rejection?
7. **Plausibility downgrade of `DECIDED` (B15).** Should an out-of-range numeric value the Bauherr explicitly DECIDED really get demoted to ASSUMED, or stay DECIDED with a warning attached? The semantics differ.
8. **Erlangen slice (B25).** Park indefinitely, document a re-enable plan, or delete? Right now it's 291 LOC of dead code with a comment promising future use.
9. **Result Page sharing tokens.** 30-day expiry by default (`0006_share_tokens.sql:30`). Acceptable for B2B, but no rotation, no audit on revoke, no "view count" — fine?
10. **DSGVO retention.** `logs.prune_old()` clears traces at 90 days; `event_log` has its own prune helper. **Project data has NO retention policy** (CL-2.0.03-02 missing). What should happen at month 24?

---

> Audit complete. AUDIT_REPORT.md written. 2 blockers, 10 highs, 8 mediums, 5 lows. Ready for Rutik review.
