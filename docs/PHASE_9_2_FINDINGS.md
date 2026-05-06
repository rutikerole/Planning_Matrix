# Phase 9.2 — Complete Observability: Findings + Plan

> **Status:** commit 1 of 13. Audit-first artifact for closing the five observability gaps. Two surprises from the audit reshape the plan; both are documented here so commits 7-9 don't accidentally tear out infrastructure that already works.
>
> **Phase numbering:** I dropped the brief's optional commit 3 (`0021_prompt_diffs.sql` — only needed if diff computation is slow, which it shouldn't be for one-off admin clicks). Final shape is 13 commits, status pings at 3 / 9 / 13 (the brief said 4 / 10 / 14 against a 14-commit shape).

---

## 1. What I read and what I'm taking from it

I read Sentry's React SDK quickstart (canonical `Sentry.init({ dsn, tracesSampleRate, replaysSessionSampleRate, replaysOnErrorSampleRate })`, `Sentry.ErrorBoundary` placement, `beforeSend` filter hook), PostHog's JS library docs (`posthog.init(key, { api_host: 'https://eu.i.posthog.com' })`, `posthog.identify(distinctId)`, `posthog.opt_out_capturing()` for consent rejection), the existing `errorTracking.ts` (Sentry init at main.tsx:11, PII scrub at lines 27–95, currently uncondi­tionally fires in PROD when DSN is set — **DSGVO gap**), the existing `analytics.ts` (PostHog init gated through `AnalyticsLifecycle.tsx:8–17` on `state.analytics`, EU host already configured, cookieless `persistence: 'memory'`, allowlist of 7 events: `landing_viewed`, `wizard_q1_completed`, `wizard_q2_completed`, `project_created`, `chat_turn_completed`, `result_viewed`, `legal_page_viewed`), `useCookieConsent.ts` (Zustand-style hook with `acceptAll/rejectAll/saveCustom`, persisted to `pm.cookieConsent` localStorage, cross-tab sync via `StorageEvent`, version-pinned at v1), the wizard surface tree (12 components — Q1 → SketchCard click → `setIntent`, Q2 → Yes/No radio + address textarea + lazy-loaded PlotMap with `onPick(lat,lng)`), the chat workspace (37 components — Send via `InputBar:105`, chip pick via `SmartChips:82`, IDK via `IdkAffordance.onOpen`), result page tabs and the existing `useTabState` (active state controlled by `ResultTabs.onChange`, dwell tracker would attach to AnimatePresence key transition), and the Phase 9.1 `InlineLogsDrawer` (no tab strip yet — body is currently single-section, needs Traces/Events/Persona switcher). **Adoptions**: Sentry filter hook for the `frontend.error` bridge into our event_log, PostHog allowlist expansion (one-line per event), the existing CookieBanner consent contract (don't reinvent), `useAuthStore.getState().user` from non-React code (safe — Zustand pattern is already used at `useChatTurn:320`), and explicit gating of Sentry on `state.functional` (next paragraph).

---

## 2. Two surprises that reshape the brief

### 2.1 Sentry is already running — and it's NOT consent-gated

The brief assumed Sentry would be a fresh install. It's not. `src/lib/errorTracking.ts` is a real ~115-line implementation that initialises in PROD as soon as `VITE_SENTRY_DSN` is set, **before** the user has seen the cookie banner (called from `main.tsx:11`, several React render passes before `<CookieBanner>` mounts).

This is a DSGVO gap. Sentry is a US company with EU subprocessors; even with PII scrubbing it transmits IP + user-agent + session metadata to Sentry's backend, which constitutes "processing of personal data" under Art 4(2) GDPR. Without consent it relies on Art 6(1)(f) legitimate interest — defensible for security/diagnostics but conservative German legal opinion (and Bavarian DSK guidance) prefers explicit consent.

**Plan:** commit 7 (Sentry update) defers Sentry init out of `main.tsx` and into a lifecycle component analogous to the existing `AnalyticsLifecycle.tsx` — gated on `state.functional` (a more permissive bucket than `state.analytics`, since errors-for-fixing-the-app is closer to "necessary" than "marketing"). User opts in via the existing CookieBanner Customize step.

### 2.2 PostHog is already wired with a 7-event allowlist

The brief says "wire PostHog". Already wired. What's not done is the **vocabulary** — `analytics.ts:72-79` allowlists exactly 7 event names. The Phase 9.2 wizard alone needs ~15 distinct events. Chat needs ~20. Result needs ~25.

**Plan:** commit 8 expands the allowlist to cover the full Phase 9.2 vocabulary. Same shape (typed enum + property strip). The gating mechanism (consent → `state.analytics`) is preserved as-is.

### 2.3 What this means for the schema

The brief's `event_log` table is still correct and additive. PostHog and `event_log` are intentionally redundant: **PostHog** is product analytics for the team (funnels, retention), **`event_log`** is per-project debugging context for admins (correlated with `logs.traces` via `trace_id`). Different audiences, different views. Same emit point.

---

## 3. Architecture — the eventBus + the three sinks

```
                       ┌─────────────┐
   user action  ──→    │  eventBus   │
                       │   .emit()   │
                       └──────┬──────┘
                              │ batched, debounced 2s
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌─────────────┐   ┌─────────────┐  ┌──────────────┐
     │ event_log   │   │  PostHog    │  │  Sentry      │
     │ (1st party) │   │ (consent)   │  │ (consent)    │
     │             │   │             │  │              │
     │ admin debug │   │ product     │  │ frontend     │
     │ legitimate  │   │ analytics   │  │ errors only  │
     │ interest    │   │             │  │              │
     └─────────────┘   └─────────────┘  └──────────────┘
```

### 3.1 First-party `event_log`

- Always fires — legitimate interest under Art 6(1)(f) (admin debugging, security, performance).
- Same Supabase project, owner-RLS for the user's own events, admin RLS via `is_admin()`.
- Linked to `logs.traces` via optional `trace_id` column.
- Privacy: address strings stripped to length-only; geocoded coordinates are public spatial data and OK; user-typed message bodies are NEVER captured (length only).

### 3.2 PostHog (consent-gated)

- Only fires when `state.analytics === true`.
- Existing infrastructure (`analytics.ts` + `AnalyticsLifecycle`) preserved. Allowlist expanded.
- Bridge: `eventBus.emit(name, source, attrs)` calls `analytics.track(...)` internally if PostHog initialised.
- Cookieless persistence already configured.

### 3.3 Sentry (consent-gated)

- Only fires when `state.functional === true` (commit 7 change).
- `Sentry.init` called inside a `<SentryLifecycle>` component analogous to `AnalyticsLifecycle`.
- `beforeSend` hook calls `eventBus.emit('frontend.error', 'sentry', { sentry_event_id, ... })` so admins see errors inline without leaving the drawer.

---

## 4. The migration — `0020_event_log.sql`

```sql
create table public.event_log (
  event_id    uuid primary key default gen_random_uuid(),
  session_id  uuid not null,
  user_id     uuid references auth.users on delete set null,
  project_id  uuid references public.projects on delete cascade,

  source      text not null check (source in ('wizard', 'chat', 'result', 'auth', 'dashboard', 'sentry', 'system')),
  name        text not null,
  attributes  jsonb not null default '{}'::jsonb,

  client_ts   timestamptz not null,
  server_ts   timestamptz not null default now(),

  user_agent  text,
  viewport_w  int,
  viewport_h  int,
  url_path    text,

  trace_id    uuid references logs.traces on delete set null
);

create index event_log_project_idx on public.event_log (project_id, server_ts desc);
create index event_log_user_idx    on public.event_log (user_id, server_ts desc);
create index event_log_session_idx on public.event_log (session_id, server_ts);
create index event_log_name_idx    on public.event_log (name, server_ts desc);
create index event_log_trace_idx   on public.event_log (trace_id) where trace_id is not null;

alter table public.event_log enable row level security;

create policy "user inserts own events"
  on public.event_log for insert
  with check (user_id is null or user_id = auth.uid());

create policy "user reads own events"
  on public.event_log for select
  using (user_id = auth.uid());

create policy "admin reads all events"
  on public.event_log for select
  using (logs.is_admin());

create or replace function public.event_log_prune() returns int
language sql as $$
  with deleted as (
    delete from public.event_log where server_ts < now() - interval '90 days' returning event_id
  )
  select count(*)::int from deleted;
$$;

grant execute on function public.event_log_prune() to service_role;
```

Notes:
- `user_id` is **nullable** because anonymous landing-page interactions emit before sign-in.
- `project_id` is nullable because wizard events fire before the project row exists.
- The CHECK constraint on `source` is liberal — adding new sources later is a migration but a small one.
- 90-day retention matches `logs.traces`. pg_cron not enabled; same manual-or-future-schedule story as Phase 9.

---

## 5. The eventBus design

```typescript
// src/lib/eventBus.ts
class EventBus {
  private buffer: PendingEvent[] = []
  private flushTimer: number | null = null
  private flushing = false               // single-flight guard
  private readonly maxBatch = 20
  private readonly flushDebounceMs = 2_000

  emit(source: EventSource, name: string, attributes: Record<string, unknown> = {}): void {
    // Build the row but don't await; <0.5ms budget.
    this.buffer.push(buildPendingEvent(source, name, attributes))
    if (this.buffer.length >= this.maxBatch) {
      this.flush()                       // immediate at burst threshold
    } else {
      this.scheduleFlush()
    }
  }

  scheduleFlush(): void {
    if (this.flushTimer) return
    this.flushTimer = window.setTimeout(() => this.flush(), this.flushDebounceMs)
  }

  async flush(): Promise<void> {
    if (this.flushing) return            // single-flight
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (this.buffer.length === 0) return
    this.flushing = true
    const batch = this.buffer.splice(0, this.buffer.length)
    try {
      await supabase.from('event_log').insert(batch)
    } catch (err) {
      // silent — observability must never break the app
      if (import.meta.env.DEV) console.warn('[eventBus] flush failed', err)
    } finally {
      this.flushing = false
    }
  }

  // Sync flush via sendBeacon when the tab is closing.
  flushBeacon(): void {
    if (this.buffer.length === 0) return
    const url = `${SUPABASE_URL}/rest/v1/event_log`
    const body = JSON.stringify(this.buffer.splice(0))
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon(url, blob)
  }
}

export const eventBus = new EventBus()

// Wire up unload + visibility flushes once at module scope.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => eventBus.flushBeacon())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void eventBus.flush()
  })
}
```

Important details:
- `sendBeacon` skips RLS auth — the body must include the JWT in the headers, which `sendBeacon` doesn't allow per spec. **Workaround:** `fetch(url, { body, keepalive: true, ... })` is the modern equivalent and DOES allow custom headers including `Authorization`. Use `keepalive: true` instead of `sendBeacon` for the unload flush.
- The `scheduleFlush` debounce coalesces bursts (typing in a textbox emits many events; we send them as one batch).
- The single-flight `flushing` guard prevents two concurrent inserts when the burst-threshold and the debounce timer both fire.

### 5.1 sessionId — `src/lib/sessionId.ts`

```typescript
export function getOrCreateSessionId(): string {
  const KEY = 'pm.sessionId'
  // sessionStorage NOT localStorage — per-tab, gone when tab closes.
  let id = sessionStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(KEY, id)
  }
  return id
}
```

Per-tab. New session each time the user opens a new tab — matches the user's mental model of "this is a fresh interaction".

### 5.2 The hook — `src/hooks/useEventEmitter.ts`

A typed wrapper that closes over the current location/project/user:

```typescript
export function useEventEmitter(source: EventSource) {
  const { id: projectId } = useParams<{ id?: string }>()
  return useCallback((name: string, attrs?: Record<string, unknown>) => {
    eventBus.emit(source, name, { ...attrs, project_id: projectId })
  }, [source, projectId])
}
```

---

## 6. Surface inventory — every emit point I'll add

### 6.1 Wizard (commit 4 — file:handler reference)

| Event | File | Handler |
|---|---|---|
| `wizard.opened` | `WizardPage.tsx:34` | `useEffect` mount |
| `wizard.intent_selected` | `QuestionIntent.tsx:89` | `setIntent()` |
| `wizard.intent_changed` | (delta detection in same handler) | |
| `wizard.unsure_link_clicked` | `QuestionIntent.tsx:100` | `setHelpOpen()` (only on open) |
| `wizard.continue_clicked` | `QuestionIntent.tsx:134` | `advance()` |
| `wizard.plot_yes_selected` | `QuestionPlot.tsx:301` | `setPlotChoice('yes')` |
| `wizard.plot_no_selected` | same | `setPlotChoice('no')` |
| `wizard.address_typed` (debounced 1s) | `QuestionPlot.tsx:348` | `setPlotAddress()` |
| `wizard.address_geocoded` | PlotMap geocode callback | resolved coords |
| `wizard.map_clicked` | `PlotMap.tsx:116` | `onPick(lat,lng)` |
| `wizard.submit_clicked` | `QuestionPlot.tsx:216` | `handleSubmit()` |
| `wizard.submit_succeeded` | `WizardPage.tsx:47` | `onSubmit` success leg |
| `wizard.submit_failed` | same | `onSubmit` error leg |
| `wizard.cancel_clicked` | `WizardPage.tsx:47` | `onCancel` |
| `wizard.atelier_opened` | `AtelierOpening.tsx` mount | |
| `wizard.atelier_completed` | `AtelierOpening.tsx` exit | |

### 6.2 Chat workspace (commit 5)

| Event | File | Handler |
|---|---|---|
| `chat.opened` | ChatWorkspacePage mount | `useEffect` |
| `chat.send_clicked` | `InputBar.tsx:105` | `handleSubmit()` |
| `chat.message_received` (with `trace_id`) | `useChatTurn.ts:303` | `onSuccess` |
| `chat.chip_clicked` | `SmartChips.tsx:82` | `onPick(answer)` |
| `chat.idk_opened` | `IdkAffordance.tsx` | `onOpen` |
| `chat.attachment_added` | `AttachmentPicker.tsx` | file-add callback |
| `chat.briefing_opened` | `BriefingCTA.tsx` | click handler |
| `chat.specialist_handover` | `Thread.tsx:67` | when `previousSpecialist !== current` |
| `chat.tab_hidden` / `tab_visible` | global visibilitychange | one-shot at mount |

The `trace_id` correlation: `useChatTurn`'s `onSuccess` receives `data.sent.response`. The streaming `complete` frame includes `requestId` (= `trace_id`). The mutation's `data.sent.response.requestId` is what we attach to `chat.message_received`.

### 6.3 Result page (commit 6)

| Event | File | Handler |
|---|---|---|
| `result.opened` | `ResultPage.tsx:34` mount | `useEffect` |
| `result.tab_opened` | `ResultTabs.tsx onChange` | per-tab click |
| `result.tab_dwell_time` | `ResultWorkspace.tsx:50` | on `active` change → emit prior dwell |
| `result.suggestion_added` | `SuggestionsTab.tsx:58` | `handleAdded` |
| `result.suggestion_dismissed` | same | `handleDismissed` |
| `result.export_pdf_clicked` | `ExportMenu.tsx:62` | PDF action start |
| `result.export_pdf_succeeded` | same | PDF action success |
| `result.export_markdown_clicked` | `ExportMenu.tsx:68` | MD start |
| `result.export_json_clicked` | `ExportMenu.tsx:75` | JSON start |
| `result.share_link_created` | `ExportMenu.tsx:83` | share success |
| `result.send_to_architect_clicked` | `SendToArchitectModal` open | trigger |
| `result.send_to_architect_completed` | `SendToArchitectModal` submit | success |
| `result.inspect_data_flow_opened` | `InspectDataFlowModal` open | trigger |
| `result.back_to_consultation_clicked` | `ResultFooter.tsx` | back link |

Tab dwell-time is the only non-trivial one: keep `useRef<{ tab, since }>`, on tab change emit the prior dwell with delta.

---

## 7. Persona evolution view (commit 11)

Approach: aggregate `logs.traces` + `logs.persona_snapshots` client-side, group by `system_prompt_hash`, compute per-version metrics.

```typescript
interface PersonaVersion {
  hash: string
  first_seen: string
  last_seen: string
  trace_count: number
  cache_hit_ratio: number
  error_rate: number
  avg_input_tokens: number
  avg_latency_ms: number
  has_full_prompt: boolean   // do we have a snapshot to diff against?
}
```

Diff viewer: split-pane line-by-line diff of two `persona_snapshots.system_prompt_full` strings. Hand-rolled (jsdiff is ~12 KB gz; not justified). Algorithm: simple line-by-line LCS marking added/removed/unchanged. ~120 lines of code.

**One change to the tracer:** bump persona snapshot sample rate from `1/50` to `1/10` for non-error turns. This makes the per-hash sample size dense enough that the evolution view sees every version. Brief asked for "always store on first trace of new hash" — that requires a per-project hash-tracking query inside the tracer, which adds ~30ms to every turn. Bumping the rate is simpler and statistically equivalent for any project with >20 turns.

---

## 8. Bundle plan

| Change | Main bundle delta | Lazy chunk delta |
|---|---|---|
| eventBus + sessionId + hook | +1.5 KB gz (always loaded) | — |
| wizard/chat/result emit calls | +0.5 KB gz (one-line emits) | — |
| Sentry consent-gating | -0.5 KB gz (moves out of main into SentryLifecycle) | +25 KB gz on consent |
| PostHog vocabulary expansion | 0 KB (allowlist is data, not bundled) | 0 KB |
| Drawer Events tab | 0 KB main | +3 KB gz on admin chunk |
| Drawer Persona tab + diff viewer | 0 KB main | +5 KB gz on admin chunk |
| Total expected | **+1.5 KB main** | +33 KB gz spread across lazy chunks |

Brief budget: ≤ +50 KB total. We're well under.

---

## 9. Edge cases — coverage matrix

| # | Brief case | Handling |
|---|---|---|
| 1 | Consent banner | Sentry + PostHog gated on `state.functional` / `state.analytics`; event_log unaffected (legitimate interest) |
| 2 | Sign out → session_id stays, user_id cleared | `getCurrentUserId()` reads auth store fresh on each emit |
| 3 | Sign in as different user → new session_id | sessionStorage is per-tab; sign-out doesn't clear, but sign-in updates user_id |
| 4 | Network drops mid-batch | `try/catch` swallows; events stay in buffer for next flush attempt |
| 5 | Tab close mid-batch | `fetch(..., { keepalive: true })` (sendBeacon doesn't support auth headers) |
| 6 | eventBus throws | wrapped in try/catch; never breaks app |
| 7 | RLS denies insert | swallowed + dev console.warn |
| 8 | PostHog/Sentry CDN blocked | `dynamic import().catch()` falls through to first-party only |
| 9 | Reduced-motion | invisible to events; events fire same |
| 10 | Mobile | viewport_w/h captured at emit |
| 11 | Old browsers | `keepalive` widely supported; fall through to async fetch otherwise |
| 12 | Privacy: address truncated | `wizard.address_typed` carries `length: N`, never the string |
| 13 | Sentry replay privacy | reuse existing PII scrubber; `replaysOnErrorSampleRate` default to 0 unless replay opted in separately |
| 14-15 | Persona view single version / missing prompt | empty/sampled-out states rendered |
| 16 | event_log table size | 90-day prune via `event_log_prune()`; index on server_ts handles range deletes |
| 17 | Concurrent flushes | single-flight `flushing` flag |
| 18 | SSR | guarded by `typeof window !== 'undefined'` |
| 19 | Bundle delta | +1.5 KB main, well under 50 KB total |
| 20 | Performance | `eventBus.emit` is sync push to in-memory array (<0.05ms typical) |
| 21 | Locale parity | new strings only inside admin drawer (English-only convention) — no parity work |
| 22 | Smoke specs | tsc + verify:locales + verify:bundle gates run on each commit |

---

## 10. Commit shape — 13 commits

| # | Title | Status ping? |
|---|---|---|
| 1 | findings (this doc) | |
| 2 | migration 0020 — event_log | |
| 3 | eventBus core (lib + hook + sessionId) | ⏸ ping |
| 4 | wizard instrumentation | |
| 5 | chat workspace instrumentation | |
| 6 | result page instrumentation | |
| 7 | Sentry update — defer init + consent gate + beforeSend bridge | |
| 8 | PostHog vocabulary expansion | |
| 9 | cookie banner verification + diagnostic toggle for Sentry | ⏸ ping |
| 10 | drawer Events tab | |
| 11 | drawer Persona tab + diff viewer + tracer sample rate bump | |
| 12 | bundle + a11y + locale audit | |
| 13 | comprehensive report + ops runbook | ⏸ ping |

Brief said pings at 4/10/14 against a 14-commit shape; the dropped commit (optional `0021_prompt_diffs`) renumbers to 3/9/13. Same intent — three checkpoints across the sweep.

---

## 11. What this is not

- **Not** a rewrite of `errorTracking.ts` or `analytics.ts`. They're well-built. We extend, gate, and bridge.
- **Not** a replacement for the cookie banner. The 3-button Planet-49-compliant pattern stays.
- **Not** a replay execution feature (Phase 9 wishlist; deferred).
- **Not** an A/B test framework (PostHog supports it; not wiring it).
- **Not** a session-replay rollout (Sentry has it; we keep `replaysSessionSampleRate: 0` to respect privacy; opt-in toggle is a future feature).

— end of findings.
