// ───────────────────────────────────────────────────────────────────────
// Phase 9 — observability types
//
// Shared between the Edge Function (Deno) and the Atelier Console (SPA).
// One source of truth for the trace/span/snapshot shape — change the
// DB schema in 0015, change the type here, both sides recompile.
//
// Field names match the columns in logs.traces / logs.spans /
// logs.persona_snapshots. Field names on AnthropicUsage match the SDK
// exactly so a copy-paste from anthropic-sdk usage objects lands clean.
// ───────────────────────────────────────────────────────────────────────

export type TraceStatus =
  | 'in_progress'
  | 'ok'
  | 'error'
  | 'partial'
  | 'idempotent_replay'

export type TraceKind =
  | 'chat_turn_streaming'
  | 'chat_turn_json'
  | 'chat_turn_priming'

export type SpanStatus = 'ok' | 'error' | 'cancelled'

// Subset of Anthropic SDK's `Usage` shape we care about. The SDK's
// real type has more fields (server_tool_use etc.) but we only persist
// these four. Keeping the type narrow means we don't depend on the
// SDK type from the SPA (which doesn't import it).
export interface AnthropicUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

export interface ModelPricing {
  model: string
  input_per_1m_cents: number
  output_per_1m_cents: number
  cache_read_per_1m_cents: number
  cache_creation_per_1m_cents: number
  effective_from: string
}

// Inline mini-event on a span (e.g. `{ name: 'cache_hit', ... }`)
export interface SpanEvent {
  at: string                          // ISO timestamp
  name: string
  attrs?: Record<string, unknown>
}

// Row shape — matches logs.traces
export interface TraceRow {
  trace_id: string
  project_id: string | null
  user_id: string | null
  client_request_id: string | null
  kind: TraceKind
  started_at: string                  // ISO
  ended_at: string | null
  duration_ms: number | null
  status: TraceStatus
  error_class: string | null
  error_message: string | null
  total_input_tokens: number
  total_output_tokens: number
  total_cache_read_tokens: number
  total_cache_creation_tokens: number
  total_cost_cents: number
  model: string | null
  function_version: string | null
  region: string | null
  request_size_bytes: number | null
  response_size_bytes: number | null
  created_at?: string                 // server-set
}

// Row shape — matches logs.spans
export interface SpanRow {
  span_id: string
  trace_id: string
  parent_span_id: string | null
  name: string
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  status: SpanStatus
  attributes: Record<string, unknown>
  events: SpanEvent[]
  created_at?: string
}

// Row shape — matches logs.persona_snapshots
export interface PersonaSnapshotRow {
  snapshot_id: string
  trace_id: string
  system_prompt_hash: string
  system_prompt_full: string | null
  state_block_full: string
  messages_full: unknown
  tool_use_response_raw: unknown
  tool_use_response_validated: unknown
  created_at?: string
}

// Linked row from public.project_events — used by the deep-dive view
// to render the "what mutated" section. Includes Phase 9's trace_id
// column.
export interface ProjectEventRow {
  id: string
  project_id: string
  event_type: string
  before_state: unknown
  after_state: unknown
  reason: string | null
  triggered_by: 'user' | 'assistant' | 'system' | null
  trace_id: string | null
  created_at: string
}
