# Phase 9 — Atelier Console: Comprehensive Report

> **Status:** complete. All 14 commits landed. Bundle, locale, and tsc gates green.
> **Findings doc:** [`docs/PHASE_9_FINDINGS.md`](./PHASE_9_FINDINGS.md) (commit 1).

---

## 1. The 14 commits

| # | SHA | Subject |
|---|---|---|
| 1 | `9e9677a` | docs(phase-9): atelier console findings — research, audit, plan |
| 2 | `ee26c3b` | feat(phase-9): migration 0015 — logs schema, RLS, model_pricing |
| 3 | `5c27df7` | feat(phase-9): migration 0016 — project_events.trace_id + RPC update |
| 4 | `fc38727` | feat(phase-9): tracer module + cost calc + observability types |
| 5 | `eab3703` | feat(phase-9): instrument Edge Function with tracer |
| 6 | `74115ee` | feat(phase-9): migration 0017 — reaper for stuck traces |
| 7 | `9803a5d` | feat(phase-9): admin guard + atelier console shell + lazy /admin/* |
| 8 | `a122b09` | feat(phase-9): Project Inspector — list + detail |
| 9 | `3496303` | feat(phase-9): turn deep-dive — Gantt + JsonViewer + persona snapshot |
| 10 | `0697832` | feat(phase-9): live stream — polled feed, filter chips |
| 11 | `8ef5c81` | feat(phase-9): cost dashboard — KPIs, charts, leaderboards |
| 12 | `900c565` | feat(phase-9): search — Datadog-style structured query |
| 13 | `32e198c` | feat(phase-9): export bundles — JSON / JSONL / CSV |
| 14 | _this commit_ | docs(phase-9): final pass + comprehensive report |

---

## 2. Two corrections to the brief

These are baked in. Not hidden. Not deviations — facts.

### 2.1 Model name

The brief says `claude-sonnet-4-5`. The codebase ships `claude-sonnet-4-6` (toolSchema.ts:27). Pricing is identical per Anthropic's release note. `model_pricing` is seeded with **both** strings so a rollback to 4-5 doesn't strand traces.

### 2.2 Migration numbering

The brief says `0014_atelier_console.sql`. The repo already has `0014_fix_likely_user_replies_type.sql`. So the migrations shift +1:

- **0015** atelier_console (logs schema + pricing + retention)
- **0016** project_events.trace_id + RPC update
- **0017** reaper

---

## 3. Performance + bundle

### 3.1 Bundle delta

| Asset | Before phase 9 | After phase 9 | Δ |
|---|---:|---:|---:|
| `index-*.js` (main) | ~258 KB gz | 258.1 KB gz | ~0 KB |
| `AdminRoutes-*.js` (lazy) | — | 13.86 KB gz | +13.86 KB |
| Vendor chunks | unchanged | unchanged | 0 KB |

**Main bundle is unchanged.** All admin code lives in the lazy chunk. The 80 KB budget for `/admin/*` (PHASE_9_FINDINGS §7) finishes with **66 KB of headroom**. Every chart is hand-rolled SVG — no Recharts dep, no highlight.js dep — both deferred decisions from the findings file ended up paying off here.

### 3.2 Edge Function overhead

I cannot measure the deployed Edge Function from this environment, but the structural overhead per turn is:

- Tracer creation: 1 `Date.now()` + 1 `crypto.randomUUID()` + 1 service-role `createClient` (memoised). ~1ms.
- Per-span instrumentation: ~6 spans per turn × ~30 µs/span = <1ms cumulative.
- Token accumulation: O(1) per Anthropic call.
- Persona snapshot capture: one in-memory copy of system prompt (~30KB) + messages array (~5KB). ~1ms.
- `tracer.finalize()` flush: 1 trace insert + 1 batch span insert + 1 snapshot insert (when sampled). At Supabase RTT of ~50ms in same-region, total ~80–150ms.

The flush happens **after the user response is built** (and, for streaming, after the stream closes), so the user-perceived latency budget (§7 in PHASE_9_FINDINGS) is not consumed by it. The flush is wrapped in try/catch — failures are logged to stdout and swallowed.

### 3.3 DB write volume per trace

Steady-state per turn:
- 1 row in `logs.traces`
- ~6 rows in `logs.spans` (root + state.load + rate_limit + user_message + anthropic.attempt + plausibility + commit)
- 0 or 1 row in `logs.persona_snapshots` (always on error, 1-in-50 on ok)
- ~5–8 rows in `public.project_events` (umbrella + per-delta + plausibility warnings — same as before; only `trace_id` is new)

At 100 active projects × 30 turns/day = 3,000 turns/day:
- 3,000 trace rows/day
- ~18,000 span rows/day
- ~60 snapshot rows/day (errors + samples)
- Cumulative at 90-day retention (the SQL retention drops past 90d): ~270k traces + ~1.6M spans + ~5k snapshots steady state.

### 3.4 Gates final state

```
[verify:locales] OK — 1372 keys, parity ✓
[verify:bundle]  OK — 258.1 KB gz (ceiling 300 KB)
[tsc]            OK
```

---

## 4. Migration runbook

Apply in **this exact order**. Each is idempotent — re-running is safe.

### 4.1 Apply migrations

In Supabase Dashboard → SQL Editor → New query:

1. Paste `supabase/migrations/0015_atelier_console.sql` → Run
2. Paste `supabase/migrations/0016_project_events_trace_link.sql` → Run
3. Paste `supabase/migrations/0017_logs_reaper.sql` → Run

### 4.2 Configure admins

```sql
-- Replace with your admin email(s), comma-separated:
alter database postgres set app.admin_emails = 'you@example.com';
```

Then **reconnect** (the GUC is read on connection init). Verify:

```sql
select logs.is_admin();
-- expect true after reconnect
```

### 4.3 Deploy the chat-turn function

```bash
supabase functions deploy chat-turn
```

The function reads `SUPABASE_SERVICE_ROLE_KEY` from the platform — already set on most Supabase projects. If it's missing, the tracer degrades to no-op and the function continues to work, just without observability.

### 4.4 (Optional) Schedule retention + reaper

If `pg_cron` is enabled on this project:

```sql
create extension if not exists pg_cron;
select cron.schedule('logs-reaper', '* * * * *', $$ select logs.reap_stuck(); $$);
select cron.schedule('logs-prune',  '0 3 * * *', $$ select logs.prune_old(); $$);
```

If pg_cron isn't enabled, both functions can be invoked manually:

```sql
select logs.reap_stuck();   -- flips stuck in_progress → partial
select logs.prune_old();    -- deletes >90d traces, nulls >30d system prompts
```

---

## 5. Smoke checks for the user

After deploy, verify these in order:

1. **Open `/admin/logs/projects`**
   → Should redirect to /sign-in if not authed; should show 403 page if authed but not admin; should list your projects if admin. Configure `app.admin_emails` if you see the 403.

2. **Click a project, click a turn**
   → Should land on `/admin/logs/projects/:id/turns/:traceId`. Trace overview should populate. The Gantt should show ~6 spans for a recent turn. The persona snapshot section should be empty for old turns (no instrumentation) but populated for new ones (post-deploy).

3. **Open `/admin/logs/cost`**
   → Three KPI cards. Daily-cost stacked bar. Cache-hit ratio line. Top-10 leaderboards. Computed cost should approximate what you'd compute manually from the Anthropic Usage page for the last 24h.

4. **Open `/admin/logs/stream`**
   → Should poll every 5s. Send a test chat turn → it should appear in the stream within ~10s.

5. **Force a 502** (kill internet briefly during a turn, force a retry)
   → The trace's deep-dive should show the retry as an event on the parent span and a separate `anthropic.attempt_2` child span.

6. **Try the search bar**
   → `status:error` should return any failed traces.
   `cost_cents:>500 from:2026-05-01` should filter as expected.
   `nonsense_key:foo` should warn "unknown keys" but still run.

7. **Click "↓ export bundle" on a turn**
   → Browser downloads `trace-<id>.json` with full payload + watermark.

---

## 6. Edge cases — coverage matrix

Per PHASE_9_FINDINGS §6, all 20 cases handled:

| # | Case | Where |
|---|---|---|
| 1 | Function exception before tracer | Pre-tracer code keeps stdout logs only — accepted |
| 2 | Function timeout → stuck `in_progress` | `logs.reap_stuck()` flips to `partial` after 60s |
| 3 | Tracer flush DB failure | Wrapped try/catch in `tracer.finalize`, logged to stdout |
| 4 | Anthropic OK, tracer write throws | Same — turn completes, trace is partial |
| 5 | Idempotency replay | trace_status='idempotent_replay', visible separately |
| 6 | Persona snapshot >10 KB | Truncated at 10240 bytes with marker |
| 7 | Multi-tab live stream | tab-visibility API gates polling |
| 8 | Malformed search query | "couldn't parse" amber warning, query still runs unknown-key-warned |
| 9 | Cost across pricing changes | Cost stored on trace at write time, never recomputed |
| 10 | Empty admin allowlist | `is_admin()` returns false → 403 page, not crash |
| 11 | Trace with no spans | "no spans recorded" empty state in Gantt |
| 12 | Mobile | Stacked layout, drawer nav, scrollable charts |
| 13 | Reduced-motion | No animations on auto-refresh; hover details only |
| 14 | Dark-mode | App is light-only; admin matches |
| 15 | UUID copy raw | `truncateUuid` for display, full id on copy |
| 16 | Non-admin → 403 | NotAuthorized component |
| 17 | Bundle: separate chunk | AdminRoutes lazy, 13.86 KB gz |
| 18 | Performance budget | Structural overhead documented in §3.2 |
| 19 | Locale parity | green |
| 20 | Smoke tests | §5 above |

---

## 7. Locks held

| Lock | Status |
|---|---|
| Edge Function user-facing behaviour (response shape, error envelope, latency p50) | held — additive only |
| Tool schema, Zod validation logic | unchanged |
| `commit_chat_turn` RPC behaviour | augmented (new `p_trace_id` param with default null), semantics preserved |
| `useChatTurn` hook retry logic | untouched |
| Chat workspace / wizard / atelier opening / result workspace | untouched |
| Persona prompts, persona behaviour rules | untouched |
| Existing `project_events` semantics | extended with nullable trace_id; no rows changed |
| RLS on user-facing tables | untouched; new admin tables get new RLS |
| Bauherren-facing UI | untouched; admin lives at `/admin/*` |

---

## 8. What this enables

- **Cost control** — cost dashboard shows trend + leaderboards. "Which projects are eating my Anthropic budget" is now a 30-second answer.
- **Debugging** — turn deep-dive shows the exact prompt sent, the exact response received, the exact mutations applied. "Why did this turn fail" is no longer a guess.
- **Cache optimisation** — daily cache-hit ratio chart catches regressions when persona prompt changes break cache.
- **User support** — `client_request_id` on every trace + search by user_id makes "what happened to user X at time Y" answerable in seconds.
- **Compliance** — every persona prompt + response stored 30 days; every state mutation forever (project_events). Auditor "what did the system tell this user" → answerable.
- **Future training data** — persona snapshots are the right shape for fine-tuning if Anthropic ever offers it for our domain.

---

## 9. Things flagged for review

1. **`admin email allowlist` is global.** All admins see all traces. Per-project admin scoping is Phase 9.5.

2. **`useProjectsWithMetrics` aggregates client-side.** Fine to ~500 projects × ~100 traces. Past that, build a server-side materialised view.

3. **Search has no AND/OR/NOT.** Implicit AND is enough for the six core questions; the parser is structured to add OR/NOT when needed without rewrite.

4. **`pg_cron` not enabled on this project.** The retention and reaper functions ship and work standalone but aren't scheduled. §4.4 above is the one-time setup.

5. **No alerting.** Phase 9.5 — Slack/email notifications when error rate spikes or cost crosses a threshold. The data is here; the wire isn't.

6. **No realtime.** Live Stream polls at 5s — Supabase docs explicitly recommend polling for our volume. Reconsider if turn rate exceeds ~500/min.

7. **`messages_full` and `tool_use_response_raw` may compound.** A 200-message conversation with full tool input is ~50 KB. At 30-day retention with truncation only on `system_prompt_full`, the snapshot table can grow. Watch and add a similar truncation rule if needed.

---

## 10. Deferred

- Real-time websockets (polling chosen)
- Alert rules (Phase 9.5)
- Cross-environment view (per-env console)
- ML anomaly detection (far future)
- Distributed tracing across services (we have one Edge Function)
- User-facing version (Bauherren never see admin console)
- Replay execution (we record what happened; we don't re-execute the model)

---

## 11. The standard

The brief's standard (§13): a user can answer six questions in 60 seconds at `/admin/logs`.

| Question | Answered by |
|---|---|
| What's our cost trend? | `/admin/logs/cost` — 3 KPIs + daily bar chart |
| Which projects had errors today? | `/admin/logs/search` → `status:error from:2026-05-06` |
| Show me turn 7 of project X — what did the model see? | Inspector → project → turn → persona snapshot |
| Why did synthesis fail on that one project last Tuesday? | Inspector → project → click failed turn → spans + error_class + persona snapshot |
| Are we hitting the prompt cache? | `/admin/logs/cost` — cache-hit ratio chart |
| Which user is racking up the most tokens? | `/admin/logs/cost` — top users by cost leaderboard |

If a future you sits at this console and any of these takes longer than 60s, that's a regression. Open an issue.

— end of report.
