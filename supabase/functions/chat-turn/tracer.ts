// ───────────────────────────────────────────────────────────────────────
// Phase 9 — Tracer module for chat-turn
//
// One trace per Edge Function invocation. Spans are buffered in memory
// during the request and flushed in a single batch insert at finalize().
// This keeps the hot path latency-bounded: spec budget is +120ms p50,
// +300ms p99 vs un-instrumented baseline (PHASE_9_FINDINGS.md §7).
//
// Structural guarantees:
//
//   1. The tracer NEVER throws into the user-facing path. Every public
//      method is wrapped in try/catch and falls open. If the DB is
//      unreachable, finalize() logs to stdout and returns; the user's
//      turn completes normally.
//
//   2. The tracer uses a service-role client to write to logs.*
//      (which are RLS-locked to admins for reads). The service-role
//      key is read from SUPABASE_SERVICE_ROLE_KEY at first use; if
//      absent, the tracer degrades to a no-op (createTracer returns
//      noopTracer()). This means: enabling Phase 9 is just setting
//      the env var.
//
//   3. The Anthropic call wrapper accumulates token usage across
//      multiple attempts (retry, schema-reminder) into a single
//      total_* sum on the trace row.
//
//   4. Persona snapshot sampling: always-on for non-ok status, 1-in-50
//      random sample on success. Hash always stored.
//
// Naming: span names follow OTel conventions (lowercase + dot.separated
// scopes). Examples used by the instrumentation in commit 5:
//   chat_turn.root, state.load, anthropic.call, anthropic.attempt_1,
//   anthropic.retry, tool_use.validate, plausibility.check,
//   rpc.commit_chat_turn, persona.snapshot.
// ───────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  AnthropicUsage,
  PersonaSnapshotRow,
  SpanEvent,
  SpanRow,
  SpanStatus,
  TraceKind,
  TraceRow,
  TraceStatus,
} from '../../../src/types/observability.ts'
import {
  computeCostCents,
  getPricing,
  sumUsage,
} from './cost.ts'

// ── Service-role client (lazy, single-flight) ───────────────────────────
let _serviceClient: SupabaseClient | null = null
let _serviceClientFailed = false

function getServiceClient(): SupabaseClient | null {
  if (_serviceClientFailed) return null
  if (_serviceClient) return _serviceClient
  try {
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) {
      _serviceClientFailed = true
      console.warn(
        '[tracer] disabled: SUPABASE_SERVICE_ROLE_KEY missing — observability writes will be no-op',
      )
      return null
    }
    _serviceClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    return _serviceClient
  } catch (err) {
    _serviceClientFailed = true
    console.warn('[tracer] disabled: failed to create service client', err)
    return null
  }
}

// ── Public types ────────────────────────────────────────────────────────

export interface CreateTracerOpts {
  project_id: string
  user_id: string
  client_request_id: string | null
  kind: TraceKind
  model?: string
  region?: string
  function_version?: string
  request_size_bytes?: number
  /**
   * Optional externally-generated UUID. When provided, used as
   * trace_id directly — useful for keeping the existing requestId
   * (already in stdout logs) and the trace identity in lock-step.
   * If absent, a fresh UUID is generated.
   */
  trace_id?: string
}

export interface PersonaSnapshotInput {
  system_prompt_full: string
  state_block_full: string
  messages_full: unknown
  tool_use_response_raw: unknown
  tool_use_response_validated?: unknown
}

export interface Span {
  readonly span_id: string
  setAttributes(attrs: Record<string, unknown>): void
  addEvent(name: string, attrs?: Record<string, unknown>): void
  setError(message: string): void
  end(status?: SpanStatus): void
}

export interface Tracer {
  readonly trace_id: string
  readonly enabled: boolean
  startSpan(name: string, parent_span_id?: string | null): Span
  setError(error_class: string, error_message: string): void
  setTokens(usage: AnthropicUsage): void
  setResponseSize(bytes: number): void
  capturePersonaSnapshot(input: PersonaSnapshotInput): void
  finalize(status: TraceStatus): Promise<void>
}

// ── Internal state ──────────────────────────────────────────────────────

interface InternalSpan {
  span_id: string
  parent_span_id: string | null
  name: string
  started_at: string
  ended_at: string | null
  start_perf: number
  end_perf: number | null
  status: SpanStatus
  attributes: Record<string, unknown>
  events: SpanEvent[]
}

const PERSONA_SAMPLE_RATE = 1 / 50         // 1-in-50 on success
const SYSTEM_PROMPT_TRUNCATE_BYTES = 10_240

// ── Factory ─────────────────────────────────────────────────────────────

export function createTracer(opts: CreateTracerOpts): Tracer {
  const client = getServiceClient()
  if (!client) return noopTracer()

  const trace_id = opts.trace_id ?? crypto.randomUUID()
  const started_at = new Date().toISOString()
  const start_perf = performance.now()
  const spans: InternalSpan[] = []
  let totalUsage: AnthropicUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  }
  let error_class: string | null = null
  let error_message: string | null = null
  let response_size_bytes: number | null = null
  let snapshot: PersonaSnapshotInput | null = null
  let finalized = false

  function makeSpan(name: string, parent_span_id: string | null): Span {
    const internal: InternalSpan = {
      span_id: crypto.randomUUID(),
      parent_span_id,
      name,
      started_at: new Date().toISOString(),
      ended_at: null,
      start_perf: performance.now(),
      end_perf: null,
      status: 'ok',
      attributes: {},
      events: [],
    }
    spans.push(internal)

    return {
      span_id: internal.span_id,
      setAttributes(attrs) {
        try {
          Object.assign(internal.attributes, attrs)
        } catch { /* never throw into user path */ }
      },
      addEvent(eventName, attrs) {
        try {
          internal.events.push({
            at: new Date().toISOString(),
            name: eventName,
            attrs,
          })
        } catch { /* */ }
      },
      setError(msg) {
        try {
          internal.status = 'error'
          internal.attributes.error_message = msg
        } catch { /* */ }
      },
      end(status) {
        try {
          if (internal.ended_at) return  // idempotent .end()
          internal.ended_at = new Date().toISOString()
          internal.end_perf = performance.now()
          if (status) internal.status = status
        } catch { /* */ }
      },
    }
  }

  return {
    trace_id,
    enabled: true,

    startSpan(name, parent_span_id) {
      try {
        return makeSpan(name, parent_span_id ?? null)
      } catch {
        return noopSpan()
      }
    },

    setError(cls, msg) {
      try {
        error_class = cls
        error_message = msg
      } catch { /* */ }
    },

    setTokens(usage) {
      try {
        totalUsage = sumUsage(totalUsage, usage)
      } catch { /* */ }
    },

    setResponseSize(bytes) {
      try {
        response_size_bytes = bytes
      } catch { /* */ }
    },

    capturePersonaSnapshot(input) {
      try {
        snapshot = input
      } catch { /* */ }
    },

    async finalize(status) {
      if (finalized) return
      finalized = true
      try {
        const ended_at = new Date().toISOString()
        const duration_ms = Math.round(performance.now() - start_perf)

        // Force any unclosed span to end now (defensive — shouldn't happen
        // if every startSpan has a paired .end()). Mark them cancelled
        // so the UI can show the gap.
        for (const s of spans) {
          if (!s.ended_at) {
            s.ended_at = ended_at
            s.end_perf = performance.now()
            s.status = 'cancelled'
          }
        }

        // Pricing lookup → cost. If the row is missing, fall back to 0.
        let total_cost_cents = 0
        if (opts.model) {
          const pricing = await getPricing(client, opts.model)
          if (pricing) {
            total_cost_cents = computeCostCents(totalUsage, pricing).total_cost_cents
          }
        }

        const traceRow: Omit<TraceRow, 'created_at'> = {
          trace_id,
          project_id: opts.project_id,
          user_id: opts.user_id,
          client_request_id: opts.client_request_id,
          kind: opts.kind,
          started_at,
          ended_at,
          duration_ms,
          status,
          error_class,
          error_message,
          total_input_tokens: totalUsage.input_tokens ?? 0,
          total_output_tokens: totalUsage.output_tokens ?? 0,
          total_cache_read_tokens: totalUsage.cache_read_input_tokens ?? 0,
          total_cache_creation_tokens: totalUsage.cache_creation_input_tokens ?? 0,
          total_cost_cents,
          model: opts.model ?? null,
          function_version: opts.function_version ?? null,
          region: opts.region ?? null,
          request_size_bytes: opts.request_size_bytes ?? null,
          response_size_bytes,
        }

        const spanRows: Omit<SpanRow, 'created_at'>[] = spans.map((s) => ({
          span_id: s.span_id,
          trace_id,
          parent_span_id: s.parent_span_id,
          name: s.name,
          started_at: s.started_at,
          ended_at: s.ended_at,
          duration_ms: s.end_perf !== null
            ? Math.round(s.end_perf - s.start_perf)
            : null,
          status: s.status,
          attributes: s.attributes,
          events: s.events,
        }))

        // Trace must land before spans (FK). Three sequential awaits;
        // total ~50–80ms p50 against the same region.
        const { error: traceErr } = await client
          .schema('logs')
          .from('traces')
          .insert(traceRow as never)
        if (traceErr) {
          console.warn('[tracer] trace insert failed', traceErr)
          return
        }

        if (spanRows.length > 0) {
          const { error: spanErr } = await client
            .schema('logs')
            .from('spans')
            .insert(spanRows as never)
          if (spanErr) console.warn('[tracer] spans insert failed', spanErr)
        }

        if (snapshot) {
          await writeSnapshot(client, trace_id, snapshot, status)
        }
      } catch (err) {
        console.warn('[tracer] finalize failed', err)
        // Swallowed by design — see structural guarantee #1.
      }
    },
  }
}

// ── Snapshot writer ─────────────────────────────────────────────────────

async function writeSnapshot(
  client: SupabaseClient,
  trace_id: string,
  input: PersonaSnapshotInput,
  status: TraceStatus,
): Promise<void> {
  try {
    const hash = await sha256Hex(input.system_prompt_full)

    // Sampling decision per PHASE_9_FINDINGS.md §3.8:
    //   * non-ok status → always store full prompt
    //   * ok → 1-in-50 random sample
    const storeFull = status !== 'ok' || Math.random() < PERSONA_SAMPLE_RATE
    const truncated = storeFull ? truncate(input.system_prompt_full) : null

    const row: Omit<PersonaSnapshotRow, 'created_at'> = {
      snapshot_id: crypto.randomUUID(),
      trace_id,
      system_prompt_hash: hash,
      system_prompt_full: truncated,
      state_block_full: input.state_block_full,
      messages_full: input.messages_full,
      tool_use_response_raw: input.tool_use_response_raw,
      tool_use_response_validated: input.tool_use_response_validated ?? null,
    }

    const { error } = await client
      .schema('logs')
      .from('persona_snapshots')
      .insert(row as never)
    if (error) console.warn('[tracer] snapshot insert failed', error)
  } catch (err) {
    console.warn('[tracer] snapshot write failed', err)
  }
}

function truncate(s: string): string {
  // Encode-aware truncation: count BYTES not characters, since UTF-8
  // bytes is what the Postgres text column counts toward storage.
  const bytes = new TextEncoder().encode(s)
  if (bytes.length <= SYSTEM_PROMPT_TRUNCATE_BYTES) return s
  const head = new TextDecoder().decode(bytes.slice(0, SYSTEM_PROMPT_TRUNCATE_BYTES))
  return `${head}\n[truncated; original ${bytes.length} bytes]`
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── No-op fallbacks ─────────────────────────────────────────────────────
// Used when SUPABASE_SERVICE_ROLE_KEY is missing or the client fails
// to construct. Every method is a stub. Callers don't branch on
// `enabled` — they just use the API and observability silently no-ops.

function noopSpan(): Span {
  return {
    span_id: '00000000-0000-0000-0000-000000000000',
    setAttributes() {},
    addEvent() {},
    setError() {},
    end() {},
  }
}

export function noopTracer(): Tracer {
  return {
    trace_id: '00000000-0000-0000-0000-000000000000',
    enabled: false,
    startSpan() { return noopSpan() },
    setError() {},
    setTokens() {},
    setResponseSize() {},
    capturePersonaSnapshot() {},
    async finalize() {},
  }
}
