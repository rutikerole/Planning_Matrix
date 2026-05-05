# Phase 9 — Atelier Console: Findings & Plan

> **Status:** commit 1 of ~14. This document is the audit-first artifact. Subsequent commits (`0015_atelier_console.sql` onwards) implement against the plan locked here.
>
> **Authority:** the brief grants full architectural authority within the locks. This doc records the deltas from the brief, the reasoning, and the resulting plan. Where the brief is wrong (it has two such cases — the model name and the migration number), the plan corrects and notes.

---

## 1. What I read and what I'm taking from it

I read the OpenTelemetry traces concept page (canonical `trace_id` / `span_id` / `parent_id` / `attributes` / `events` / `status`), the Anthropic prompt-caching docs (verbatim field names `cache_creation_input_tokens` and `cache_read_input_tokens`, the 0.1× / 1.25× / 2× pricing ratios, and the cache-invalidation hierarchy `tools → system → messages`), the Anthropic rate-limits page (the `anthropic-ratelimit-*` header family and `retry-after` semantics, plus the fact that `cache_read_input_tokens` does **not** count toward ITPM on Sonnet 4.x — material for the Cost Dashboard's cache-savings story), Datadog's structured-search syntax (`key:value`, `AND/OR/-`, range `:>100`, brackets `[a TO b]`, parens — the subset I'll implement), Sentry's issue-vs-event grouping (kept as a future-phase concept; not in v1), and Supabase's Realtime/Postgres-Changes guide (which has a hard warning that change events are checked on a single thread and recommends polling for low-volume admin feeds — confirms the brief's polling decision). The **adoption decisions** I'm carrying forward: full OTel field naming on `logs.spans` (so anyone fluent in OTel can read it), Anthropic's exact usage field names on `logs.traces` totals (so a copy-paste from the SDK lands cleanly), Datadog's parser shape for the search bar (because users already know it), polling not realtime for the Live Stream (~5s, paused on tab-blur), and Sentry-style fingerprint-grouping deferred to Phase 9.5 alerts.

---

## 2. Codebase audit — current state of the chat-turn pipeline

A focused tour of what exists today, oriented around where Phase 9 plugs in.

### 2.1 Edge Function structure (`supabase/functions/chat-turn/`)

```
chat-turn/
├── index.ts              ← JSON entrypoint; wraps everything
├── streaming.ts          ← SSE entrypoint; parallel pipeline
├── anthropic.ts          ← callAnthropic / WithSchemaReminder / WithRetry
├── persistence.ts        ← loadProjectAndMessages, commitChatTurnAtomic, audit
├── factPlausibility.ts   ← validateFactPlausibility — produces inline warnings
├── systemPrompt.ts       ← buildSystemBlocks (cached) + buildLiveStateBlock (dynamic)
├── toolSchema.ts         ← MODEL constant, respond tool, Zod schema
├── retryPolicy.ts        ← isRetryable + backoff helpers
├── cors.ts               ← CORS headers
├── deno.json             ← Deno config
└── legalContext/         ← legal templates baked into the system prompt
```

The pipeline already emits a strong correlation `requestId` per invocation, which I reuse directly as the `trace_id` (UUID v4, generated at function entry — same scope, same lifetime). The `clientRequestId` is the idempotency key from the SPA and is preserved on the trace as `client_request_id`. No new identifier is introduced.

### 2.2 What's already structured-logged (we don't lose it; we replace its destination)

Today the function writes ~5 categorical `console.log` lines per turn (`auth_ok`, `rate_limited`, `idempotency_replay`, `plausibility_downgrade`, `success`) plus error logs. These remain as Supabase Function stdout (cheap, ephemeral, useful for Supabase Dashboard log search) **and** are mirrored as spans/attributes on the trace (durable, queryable, joinable). The two paths are not redundant — stdout survives function crashes that happen before `tracer.finalize()` runs, which the trace cannot. This is the §8 case 1 in the brief.

### 2.3 What's already on `messages` (we don't duplicate; we sum)

Per-message metric columns exist: `model`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `latency_ms`, `tool_input` (the full RespondToolInput JSON for forensics — Phase 6 A.1). Phase 9 trace totals are SUMs across these — but only conceptually; the totals are stored on the trace row at write time so the analytics SQL stays cheap and pricing-as-of-trace stays correct.

### 2.4 What `commit_chat_turn` does today (and how 0016 evolves it)

The RPC takes `(p_project_id, p_assistant_row, p_new_state, p_before_state, p_event_reason, p_event_payload, p_client_request_id)` and atomically: inserts the assistant row, updates `projects.state`, appends a `turn_committed` audit row to `project_events`, and appends per-payload events (plausibility warnings). It also implements idempotency replay (returns the existing assistant row + current state if the client_request_id already produced one).

Migration 0016 adds an 8th parameter `p_trace_id uuid`, propagates it into both event-insert paths, and adds `project_events.trace_id uuid` (nullable — old rows stay null forever). The behavior contract is unchanged: same idempotency, same atomicity, same replay semantics. Only an additional column on event rows.

### 2.5 What primitives we have to build on

- **shadcn-style primitives:** `alert-dialog`, `collapsible`, `dialog`, `dropdown-menu`, `popover`, `select` exist in `src/components/ui/`. Tabs is needed for the TurnDeepDive sections — `@radix-ui/react-tabs` is in deps so adding `tabs.tsx` is trivial. A simple `button` and `input` may also be needed; will add only if absent at use site.
- **Charting:** none. Adding `recharts` to deps. It's tree-shakable and lazy-loaded inside the `/admin/*` chunk so it doesn't touch the main bundle.
- **Router:** React Router v7, currently all routes eager. Existing `<ProtectedRoute>` pattern in `src/app/router.tsx` is the model for `<AdminGuard>`. `/admin/*` will be the project's first lazy-loaded route subtree (a separate Vite chunk).
- **Sentry/PostHog:** both wired (`@sentry/react`, `posthog-js`). Different concern — they observe **client-side errors and product analytics**. Phase 9 observes the **server-side pipeline**. No overlap, no conflict.
- **pg_cron:** **not enabled** on this project. The brief assumes it for retention and reaper jobs. Plan: ship the `logs.prune_old()` and `logs.reap_stuck()` SQL functions; document `CREATE EXTENSION pg_cron` + `cron.schedule(...)` in the runbook for the user to apply once via the Supabase Dashboard. If the user defers cron setup, retention is a 5-second `select prune_old()` they can run manually; reaper is the same.

---

## 3. Architectural decisions (deltas from brief)

### 3.1 ⚠ Migration numbering: 0014 is taken — start at 0015

The brief calls for `0014_atelier_console.sql`, `0015_project_events_trace_link.sql`. The repo already has `0014_fix_likely_user_replies_type.sql`. Renumbering to:

- **0015** — `0015_atelier_console.sql` (logs schema, RLS, `model_pricing`, retention)
- **0016** — `0016_project_events_trace_link.sql` (column add + RPC update)
- **0017** — `0017_logs_reaper.sql` (reaper job — split out so retention vs reaper can be applied independently if needed)

### 3.2 ⚠ Model name: `claude-sonnet-4-6`, not `4-5`

The brief seeds `model_pricing` with `('claude-sonnet-4-5', ...)`. The codebase ships `claude-sonnet-4-6` (toolSchema.ts:27). Same per-token pricing, but the model string must match what the API returns or trace rows will have a NULL FK lookup to pricing. Seeding **both** strings (4-5 and 4-6) so a rollback to 4-5 doesn't strand traces, and the next model bump is also a one-row insert.

### 3.3 Cache write pricing: 5-min and 1-hour rows

Anthropic offers 5-minute cache (1.25× input) and 1-hour cache (2× input). The current code uses default ephemeral (5-min). The pricing table only needs to express what we use today — but to future-proof, schema is `cache_creation_per_1m_cents` (5-min default), with an effective_from column so a TTL upgrade later becomes a one-row insert, not a schema migration. If we ever switch to 1-hour, we add a row with the new ratio.

### 3.4 `total_input_tokens` semantics — define carefully

Per Anthropic docs: `total_input_tokens = cache_read + cache_creation + input_tokens` (where `input_tokens` is post-last-cache-breakpoint only). The brief's trace fields `total_input_tokens / total_output_tokens / total_cache_read_tokens / total_cache_creation_tokens` are kept as four separate sums (matching SDK field names). The "Total tokens" UI label sums all four. Cost calculation uses the model_pricing row at trace-write time; cost is not recomputed.

### 3.5 Realtime vs polling — polling, decisively

Supabase's own docs warn that Postgres-Changes are processed on a single thread and that compute upgrades don't help throughput. Our peak is ~30 traces/min; polling at 5s with tab-visibility gating is structurally safer and ~50 lines less code. Reconsider in Phase 9.5 if the rate exceeds ~500/min.

### 3.6 Charts — Recharts (npm), not CDN

Brief says "Recharts (already in deps if present, otherwise Chart.js from CDN)". Recharts isn't in deps, but adding via npm and lazy-loading it inside the `/admin/*` chunk is simpler than a CDN load (no global pollution, no CSP exception, tree-shakable). Approximate gz cost: ~85 KB inside admin chunk, 0 KB on main bundle. Brief's 80 KB admin-chunk budget is tight; if we exceed, fall back to a hand-rolled SVG bar chart for the few panels Recharts is used on. Decision deferred to commit 11; documented here.

### 3.7 JSON syntax highlighting — `highlight.js` from CDN

Loaded once inside `/admin/*`. ~25 KB gz, only the JSON grammar bundled. No tree-shake concerns since it's used on a single component. No npm install — keeps main `package.json` clean.

### 3.8 Persona snapshot storage strategy — sample on success, always-store on failure

Brief specifies 1-in-50 sampling for `system_prompt_full` on successful turns + always on errors. Implementing exactly this. For `messages_full` and `tool_use_response_raw`, always store (each is small — last 30 turns max). Truncate `system_prompt_full` to 10 KB if larger (it can balloon when legal context is loaded), with a `[truncated; original X bytes]` marker. The hash is always stored regardless, so cache-hit analysis still works.

### 3.9 Tracer flush is **never** in the user response critical path

Brief's spirit. Concretizing: `tracer.finalize()` is called inside a `try/catch` after the user response is constructed, and any failure in the flush is logged to stdout (`[tracer] flush_failed: ...`) and swallowed. The user-facing turn never fails because the tracer failed. For the streaming path, the response is already streamed by the time we flush, so this is structurally enforced. For the JSON path, the response object is built first, then the flush runs in a `then()` chain after `Response` construction. This is §8 case 3 in the brief.

### 3.10 Admin gate — Postgres setting + RPC, not env var on the SPA

Admin emails live in `app.admin_emails` (Postgres GUC, comma-separated, set via `ALTER DATABASE postgres SET app.admin_emails = '...'`). The SPA calls `logs.is_admin()` RPC (security definer, returns boolean) once on `<AdminGuard>` mount and again on each route navigation. No admin email leaks into the client bundle. This is the pattern that survives both an open-source repo and a `.env.local` exfiltration.

### 3.11 Tabs primitive — building it (uses existing `@radix-ui/react-tabs`)

`src/components/ui/tabs.tsx` will be added as part of commit 9 (when TurnDeepDive needs it). Same shadcn-style wrapper pattern as the existing primitives.

---

## 4. Confirmed schema (with corrections applied)

Identical to brief §2.3 except:

- File `0015_atelier_console.sql` (not 0014).
- `model_pricing` seeded with `claude-sonnet-4-5` AND `claude-sonnet-4-6`, both at $3/MTok input, $15/MTok output, $0.30/MTok cache_read, $3.75/MTok cache_creation.
- `logs.is_admin()` reads `current_setting('app.admin_emails', true)`. Empty/null setting = no admins (gate denies all). Documented behavior: §8 case 10.

Migration 0016 adds:
```sql
alter table public.project_events add column if not exists trace_id uuid;
create index if not exists project_events_trace_idx on public.project_events (trace_id) where trace_id is not null;
-- + DROP and CREATE OR REPLACE commit_chat_turn with p_trace_id as 8th param,
--   propagated to all event-insert paths.
```

Migration 0017 adds:
```sql
create or replace function logs.reap_stuck() returns int as $$
  with reaped as (
    update logs.traces
       set status = 'partial',
           error_class = 'timeout_no_finalize',
           ended_at = now(),
           duration_ms = extract(epoch from (now() - started_at))::int * 1000
     where status = 'in_progress'
       and started_at < now() - interval '60 seconds'
     returning trace_id
  )
  select count(*)::int from reaped;
$$ language sql;
-- pg_cron schedule documented in runbook (not auto-applied)
```

---

## 5. File plan — locked

### Create (in commit order)

| # | Path | Lands in commit |
|---|---|---|
| 1 | `docs/PHASE_9_FINDINGS.md` | 1 (this file) |
| 2 | `supabase/migrations/0015_atelier_console.sql` | 2 |
| 3 | `supabase/migrations/0016_project_events_trace_link.sql` | 3 |
| 4 | `supabase/functions/chat-turn/tracer.ts` | 4 |
| 5 | `supabase/functions/chat-turn/cost.ts` | 4 |
| 6 | `src/types/observability.ts` | 4 |
| 7 | `supabase/migrations/0017_logs_reaper.sql` | 6 |
| 8 | `src/features/admin/AdminGuard.tsx` | 7 |
| 9 | `src/features/admin/AtelierConsoleLayout.tsx` | 7 |
| 10 | `src/features/admin/pages/ProjectInspectorList.tsx` | 8 |
| 11 | `src/features/admin/pages/ProjectInspectorDetail.tsx` | 8 |
| 12 | `src/features/admin/pages/TurnDeepDive.tsx` | 9 |
| 13 | `src/features/admin/components/SpanGantt.tsx` | 9 |
| 14 | `src/features/admin/components/JsonViewer.tsx` | 9 |
| 15 | `src/features/admin/components/TraceCard.tsx` | 9 |
| 16 | `src/components/ui/tabs.tsx` | 9 |
| 17 | `src/features/admin/pages/LiveStream.tsx` | 10 |
| 18 | `src/features/admin/pages/CostDashboard.tsx` | 11 |
| 19 | `src/features/admin/components/CostKpi.tsx` | 11 |
| 20 | `src/features/admin/pages/Search.tsx` | 12 |
| 21 | `src/features/admin/lib/parseSearchQuery.ts` | 12 |
| 22 | `src/features/admin/hooks/useTraces.ts` | 8 |
| 23 | `src/features/admin/hooks/useTraceDetail.ts` | 9 |
| 24 | `src/features/admin/hooks/useLiveStream.ts` | 10 |
| 25 | `src/features/admin/hooks/useCostMetrics.ts` | 11 |
| 26 | `src/features/admin/hooks/useSearchQuery.ts` | 12 |
| 27 | `src/features/admin/lib/exportBundle.ts` | 13 |

### Modify

| Path | Touched in commit |
|---|---|
| `supabase/functions/chat-turn/index.ts` | 5 |
| `supabase/functions/chat-turn/streaming.ts` | 5 |
| `supabase/functions/chat-turn/anthropic.ts` | 5 |
| `supabase/functions/chat-turn/persistence.ts` | 5 |
| `supabase/functions/chat-turn/factPlausibility.ts` | 5 |
| `src/app/router.tsx` | 7 |
| `src/locales/de.json` + `en.json` | 7 (admin strings, EN-leaning) |
| `package.json` | 11 (recharts) |

---

## 6. Edge case acknowledgments

Brief §8 1–20 — I'm logging which commit handles each:

| # | Edge case | Handled in |
|---|---|---|
| 1 | Function exception before tracer created → bare stdout log only | 5 (try/catch around `createTracer`) |
| 2 | Function timeout → trace stuck `in_progress` → reaper flips to `partial` | 6 |
| 3 | Tracer flush fails → swallow + stdout, never block user | 4 + 5 |
| 4 | Anthropic OK but tracer write throws → user gets response, trace partial | 4 + 5 |
| 5 | Idempotency replay → trace stored with `status='idempotent_replay'` | 5 |
| 6 | Persona snapshot >10 KB → truncate with marker | 4 |
| 7 | Multi-tab live stream → tab-visibility-API dedupe | 10 |
| 8 | Malformed search query → graceful "couldn't parse" message + syntax help | 12 |
| 9 | Cost dashboard date range crossing pricing change → use as-of-trace pricing | 4 (cost stored on trace) |
| 10 | Empty admin allowlist → friendly 403 message instead of crash | 7 |
| 11 | Trace with no spans → detail shows trace metadata + "no spans recorded" | 9 |
| 12 | Mobile → stacked cards; Gantt becomes vertical relative bars | 9 + 10 + 11 |
| 13 | Reduced-motion → no animations, no auto-refresh | 7 + 10 |
| 14 | Dark-mode → matches app (light-only) | 7 |
| 15 | Locale dates yes; UUIDs always raw | 7 + 9 |
| 16 | Non-admin → 403; anonymous → redirect login | 7 |
| 17 | Bundle: `/admin/*` separate chunk, main unchanged | 7 (verified per commit) |
| 18 | Performance: §6 budgets measured | 14 |
| 19 | Locale parity green | 14 (`npm run verify:locales` is prebuild) |
| 20 | Smoke specs pass | 14 |

---

## 7. Performance budget plan

| Metric | Budget | Measurement plan |
|---|---|---|
| Edge Function p50 overhead | ≤ +120 ms | Compare 100 turns pre/post on the same prompt set; report on commit 14 |
| Edge Function p99 overhead | ≤ +300 ms | Same |
| Console initial route load | ≤ 1.5 s on 3G fast | Lighthouse CI on `/admin/logs/projects` |
| Live Stream poll latency | ≤ 200 ms p95 | Network tab measurement; `traces` table EXPLAIN |
| `/admin/*` chunk gz | ≤ 80 KB (brief) — likely 90–110 KB with Recharts | Will report and decide on commit 11; if over, swap Recharts for hand-rolled SVG on the 2 charts |
| Main bundle delta | 0 KB | `dist/assets/*.js` size diff before/after; verified each commit |
| DB write per trace | ≤ 1 trace row + ~6 span rows + ≤1 snapshot row + ≤8 event rows | Documented commit 14 |

---

## 8. Risk register

| Risk | Mitigation |
|---|---|
| Tracer batch insert latency under bad network | Insert is `upsert` with no `returning *`; one round-trip; failure swallowed |
| `pg_cron` not yet enabled — retention/reaper don't auto-run | Document manual `cron.schedule(...)` in runbook; SQL functions ship and work standalone |
| Admin email allowlist is global (one config across all admins) | Acceptable for v1; per-project admin scoping is Phase 9.5 |
| 4-5 → 4-6 model rollback would orphan traces | Pricing seeded for both model strings; cost calc takes whatever string is on the trace |
| Anthropic SDK adds new usage fields | `attributes` is jsonb on spans; new fields land as keys, no schema migration |
| Recharts pushes admin chunk over budget | Decision deferred to commit 11 with hand-rolled fallback ready |
| Streaming path's response is already sent when tracer flushes | Architecturally fine: flush is post-stream, can't break the stream. Belt+braces: wrapped in try/catch. |
| `messages_full` column might balloon on long conversations (>100 turns) | Capped at last 30 messages already (per current pipeline); jsonb compresses well; revisit if avg row >5 KB |

---

## 9. Commit sequence (15 commits — was 14, finding doc adds one)

> 1 was implicit in the brief; counting it explicitly.

1. **Findings** — this doc.
2. **Migration 0015** — logs schema + RLS + `model_pricing` (sonnet-4-5 + 4-6) + `prune_old`.
3. **Migration 0016** — `project_events.trace_id` + `commit_chat_turn` updated.
4. **Tracer + cost + types** — TS module with smoke unit. *Status ping.*
5. **Edge Function instrumentation** — index + streaming + anthropic + persistence + plausibility wrapped.
6. **Migration 0017** — reaper.
7. **AdminGuard + console shell + routes** — empty pages, lazy-loaded chunk verified.
8. **Project Inspector list + detail.** *Status ping.*
9. **Turn deep-dive** — Gantt + JsonViewer + persona snapshot + linked events.
10. **Live Stream** — polled feed.
11. **Cost Dashboard** — Recharts (or fallback) + leaderboards.
12. **Search** — Datadog-syntax parser + saved searches. *Status ping.*
13. **Export bundles** — JSON / JSONL / CSV.
14. **Final pass** — perf measurement, edge case sweep, locales, bundle audit.
15. **Report** — landed inside commit 14's message; no separate commit.

The brief said ~14, this works out to 14 atomic commits with the findings as commit 1. Ship.

---

## 10. What this document is not

It is not a re-statement of the brief. The brief is the source of truth on *what* to build and *the standard* it must hit (§13). This document records *the plan I'm executing against* and the *facts I've verified before writing one line of production code*. Reading order: brief first, then this. Conflicts: this document wins on facts about the codebase (model name, migration numbering, deps); the brief wins on everything else.

— end of findings.
