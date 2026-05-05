// ───────────────────────────────────────────────────────────────────────
// Phase 3 — DB ops for chat-turn
//
// Every query runs through the per-request Supabase client (anon key +
// caller's bearer token), so RLS gates everything. The function never
// holds a service-role client.
//
// Note on transactions: supabase-js doesn't offer multi-statement
// transactions over the REST API. We sequence the writes carefully —
// user message first (with its idempotency key), then the Anthropic
// call, then assistant message + project state UPDATE (one column
// each, atomic per row). The idempotency check in #7 handles partial
// retries by detecting an existing assistant message after the user
// message and short-circuiting.
// ───────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AssistantMessageRow,
  ChatTurnError,
  UserAnswer,
} from '../../../src/types/chatTurn.ts'
import type { ProjectState } from '../../../src/types/projectState.ts'
import type { RespondToolInput } from '../../../src/types/respondTool.ts'

// ── Row shapes ─────────────────────────────────────────────────────────

export interface ProjectRow {
  id: string
  owner_id: string
  intent: string
  has_plot: boolean
  plot_address: string | null
  bundesland: string
  template_id: string
  name: string
  status: string
  state: unknown
  created_at: string
  updated_at: string
}

export interface MessageRow {
  id: string
  project_id: string
  role: 'user' | 'assistant' | 'system'
  specialist: string | null
  content_de: string
  content_en: string | null
  input_type: string | null
  input_options: unknown
  allow_idk: boolean | null
  user_answer: unknown
  client_request_id: string | null
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  cache_write_tokens: number | null
  latency_ms: number | null
  created_at: string
}

// ── Load ───────────────────────────────────────────────────────────────

export type LoadResult =
  | { ok: true; project: ProjectRow; messages: MessageRow[] }
  | { ok: false; error: ChatTurnError; status: number }

/**
 * Load a project (owner-scoped via RLS) plus its 30 most recent messages
 * in chronological order. Returns 404 for both "doesn't exist" and "RLS
 * denied" so we don't leak project existence.
 */
export async function loadProjectAndMessages(
  supabase: SupabaseClient,
  projectId: string,
): Promise<LoadResult> {
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  if (pErr) {
    return {
      ok: false,
      status: 500,
      error: {
        code: 'persistence_failed',
        message: `loadProject: ${pErr.message}`,
      },
    }
  }
  if (!project) {
    return {
      ok: false,
      status: 404,
      error: { code: 'not_found', message: 'Project not found' },
    }
  }

  // Fetch the 30 most recent messages in DESC, then reverse so the
  // model sees them oldest-first.
  const { data: msgData, error: mErr } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (mErr) {
    return {
      ok: false,
      status: 500,
      error: {
        code: 'persistence_failed',
        message: `loadMessages: ${mErr.message}`,
      },
    }
  }

  const messages = ((msgData ?? []) as MessageRow[]).slice().reverse()

  return { ok: true, project: project as ProjectRow, messages }
}

// ── Insert: user message (with idempotency) ────────────────────────────

export type InsertResult<T> = { ok: true; row: T } | { ok: false; error: ChatTurnError }

export type UserInsertResult =
  | { ok: true; row: MessageRow; replayed: boolean }
  | { ok: false; error: ChatTurnError }

/**
 * Insert a user message, treating the unique partial index on
 * (project_id, client_request_id) as the idempotency key. On conflict
 * (Postgres 23505), look up the existing row and return it with
 * `replayed: true` so the caller can short-circuit instead of calling
 * Anthropic again.
 */
export async function insertUserMessageOrFetchExisting(
  supabase: SupabaseClient,
  args: {
    projectId: string
    content: string
    contentEn?: string | null
    userAnswer: UserAnswer | null
    clientRequestId: string
  },
): Promise<UserInsertResult> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      project_id: args.projectId,
      role: 'user',
      content_de: args.content,
      content_en: args.contentEn ?? null,
      user_answer: args.userAnswer,
      client_request_id: args.clientRequestId,
    })
    .select('*')
    .single()

  if (!error) {
    return { ok: true, row: data as MessageRow, replayed: false }
  }

  // 23505 = unique_violation. Anything else surfaces as persistence_failed.
  if (error.code === '23505') {
    const existing = await findExistingUserMessage(
      supabase,
      args.projectId,
      args.clientRequestId,
    )
    if (existing) {
      return { ok: true, row: existing, replayed: true }
    }
    return {
      ok: false,
      error: {
        code: 'idempotency_replay',
        message:
          'Unique conflict on client_request_id but existing row not visible (likely RLS). Refusing to silently overwrite.',
      },
    }
  }

  return {
    ok: false,
    error: {
      code: 'persistence_failed',
      message: `insertUserMessage: ${error.message}`,
    },
  }
}

/**
 * Look up a user message by its idempotency key. Returns null if not
 * found (or if RLS hides it).
 */
export async function findExistingUserMessage(
  supabase: SupabaseClient,
  projectId: string,
  clientRequestId: string,
): Promise<MessageRow | null> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .eq('client_request_id', clientRequestId)
    .maybeSingle()
  return (data as MessageRow | null) ?? null
}

/**
 * Find the first assistant message strictly after a given timestamp.
 * Used to detect "this turn was already processed" — if an assistant
 * row sits past the user message's created_at, the previous run made
 * it through and we short-circuit instead of paying for another
 * Anthropic call.
 */
export async function findAssistantAfter(
  supabase: SupabaseClient,
  projectId: string,
  afterCreatedAt: string,
): Promise<MessageRow | null> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .eq('role', 'assistant')
    .gt('created_at', afterCreatedAt)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return (data as MessageRow | null) ?? null
}

// ── Insert: assistant message ──────────────────────────────────────────

export async function insertAssistantMessage(
  supabase: SupabaseClient,
  args: {
    projectId: string
    toolInput: RespondToolInput
    model: string
    usage: {
      inputTokens: number
      outputTokens: number
      cacheReadTokens: number
      cacheWriteTokens: number
    }
    latencyMs: number
  },
): Promise<InsertResult<AssistantMessageRow>> {
  const t = args.toolInput
  // Phase 3.1 #33: thinking_label_de persists per assistant turn so
  // the next turn's ThinkingIndicator can show the prior turn's
  // explicit hint. Requires migration 0004_thinking_label.sql to be
  // applied before this code reaches production.
  // Phase 3.4 #54: likely_user_replies persists per assistant turn so
  // suggested-reply chips render above the input bar. Requires
  // migration 0005_likely_user_replies.sql.
  // Phase 6 A.1: tool_input persists the full validated tool-call
  // payload alongside the prose. Forensic foundation for the rest of
  // the sprint — lets us compare "what the model said in prose" with
  // "what the model emitted in the tool call" with "what landed in
  // projects.state." Requires migration 0012_messages_tool_input.sql.
  const { data, error } = await supabase
    .from('messages')
    .insert({
      project_id: args.projectId,
      role: 'assistant',
      specialist: t.specialist,
      content_de: t.message_de,
      content_en: t.message_en,
      input_type: t.input_type,
      input_options: t.input_options ?? null,
      allow_idk: t.allow_idk ?? true,
      thinking_label_de: t.thinking_label_de ?? null,
      likely_user_replies: t.likely_user_replies ?? null,
      tool_input: t,
      model: args.model,
      input_tokens: args.usage.inputTokens,
      output_tokens: args.usage.outputTokens,
      cache_read_tokens: args.usage.cacheReadTokens,
      cache_write_tokens: args.usage.cacheWriteTokens,
      latency_ms: args.latencyMs,
    })
    .select('*')
    .single()

  if (error) {
    return {
      ok: false,
      error: {
        code: 'persistence_failed',
        message: `insertAssistantMessage: ${error.message}`,
      },
    }
  }
  return { ok: true, row: data as unknown as AssistantMessageRow }
}

// ── Update: project state ──────────────────────────────────────────────

export async function updateProjectState(
  supabase: SupabaseClient,
  projectId: string,
  newState: ProjectState,
): Promise<{ ok: true } | { ok: false; error: ChatTurnError }> {
  const { error } = await supabase
    .from('projects')
    .update({ state: newState })
    .eq('id', projectId)

  if (error) {
    return {
      ok: false,
      error: {
        code: 'persistence_failed',
        message: `updateProjectState: ${error.message}`,
      },
    }
  }
  return { ok: true }
}

// ── Phase 8.6 (B.3): atomic commit ─────────────────────────────────────

interface CommitChatTurnAtomicArgs {
  projectId: string
  toolInput: RespondToolInput
  model: string
  usage: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
  }
  latencyMs: number
  beforeState: ProjectState
  newState: ProjectState
  clientRequestId: string | null
  /** Phase 8.6 (D.4) — plausibility-warning events to append in the
   *  same transaction. Null when no warnings. */
  plausibilityEvents?: Array<{ event_type: string; reason: string }> | null
  /** Phase 9 — propagated to project_events.trace_id so audit rows
   *  join cleanly back to logs.traces. Null when tracer is disabled. */
  traceId?: string | null
}

/**
 * Phase 8.6 (B.3) — atomic replacement for the
 * insertAssistantMessage + updateProjectState + logTurnEvent trio.
 * Calls the `commit_chat_turn` Postgres function (added in migration
 * 0013) which runs all three writes inside a single transaction.
 *
 * After the RPC returns, fetches the inserted (or replayed) assistant
 * row so callers continue to receive the full AssistantMessageRow
 * shape they did pre-RPC. The extra SELECT round-trip is cheap and
 * keeps the public API of this module stable.
 *
 * If the migration hasn't been applied yet, the RPC raises a
 * `function ... does not exist` error which we map to
 * `persistence_failed`. The Edge Function continues to deploy
 * cleanly even before the SQL is applied — the first turn will fail
 * with a clear error pointing at the missing migration.
 */
export async function commitChatTurnAtomic(
  supabase: SupabaseClient,
  args: CommitChatTurnAtomicArgs,
): Promise<InsertResult<AssistantMessageRow> & { replayed?: boolean }> {
  const t = args.toolInput
  const assistantRow = {
    specialist: t.specialist,
    content_de: t.message_de,
    content_en: t.message_en,
    input_type: t.input_type,
    input_options: t.input_options ?? null,
    allow_idk: t.allow_idk ?? true,
    thinking_label_de: t.thinking_label_de ?? null,
    likely_user_replies: t.likely_user_replies ?? null,
    tool_input: t,
    model: args.model,
    input_tokens: args.usage.inputTokens,
    output_tokens: args.usage.outputTokens,
    cache_read_tokens: args.usage.cacheReadTokens,
    cache_write_tokens: args.usage.cacheWriteTokens,
    latency_ms: args.latencyMs,
  }

  // Build the RPC payload conditionally — `p_trace_id` is only
  // sent when a real trace id is available AND we believe migration
  // 0016 is applied. Sending it against the pre-0016 7-arg signature
  // would fail with "function ... does not exist". Conservative path:
  // omit when null, so the RPC resolves on either schema.
  const rpcArgs: Record<string, unknown> = {
    p_project_id: args.projectId,
    p_assistant_row: assistantRow,
    p_new_state: args.newState,
    p_before_state: args.beforeState,
    p_event_reason: t.completion_signal ?? 'continue',
    p_event_payload: args.plausibilityEvents ?? null,
    p_client_request_id: args.clientRequestId,
  }
  if (args.traceId) {
    rpcArgs.p_trace_id = args.traceId
  }

  const { data, error } = await supabase.rpc('commit_chat_turn', rpcArgs)

  if (error) {
    return {
      ok: false,
      error: {
        code: 'persistence_failed',
        message: `commit_chat_turn rpc: ${error.message}`,
      },
    }
  }

  const result = data as
    | { assistant_id: string; replayed: boolean; state: ProjectState }
    | null
  if (!result?.assistant_id) {
    return {
      ok: false,
      error: {
        code: 'persistence_failed',
        message: 'commit_chat_turn returned no assistant_id',
      },
    }
  }

  // Fetch the full row so callers continue to receive the same shape
  // insertAssistantMessage returned pre-RPC. RLS allows the owner to
  // SELECT their own messages.
  const { data: row, error: fetchErr } = await supabase
    .from('messages')
    .select('*')
    .eq('id', result.assistant_id)
    .single()

  if (fetchErr || !row) {
    return {
      ok: false,
      error: {
        code: 'persistence_failed',
        message: `commit_chat_turn fetch: ${fetchErr?.message ?? 'no row'}`,
      },
    }
  }

  return {
    ok: true,
    row: row as unknown as AssistantMessageRow,
    replayed: result.replayed,
  }
}

// ── Audit log: project_events ──────────────────────────────────────────

/**
 * Best-effort audit row per turn. Captures before/after state so a future
 * audit UI can replay state evolution without parsing every assistant
 * message. Failure here is logged but does not abort the turn — missing
 * events are an audit gap, not a correctness issue.
 *
 * Phase 6 A.7 — emits SEMANTIC events derived from the diff between
 * beforeState and afterState, not just a single 'turn_processed' marker.
 * The Bauherr-grade PDF and Markdown exports filter to the meaningful
 * subset (recommendation_added / procedure_committed / area_state_changed
 * / document_added / role_added); the architect-grade JSON includes all
 * events including the umbrella 'turn_processed' marker.
 */
export async function logTurnEvent(
  supabase: SupabaseClient,
  args: {
    projectId: string
    beforeState: ProjectState
    afterState: ProjectState
    reason: string | null
  },
): Promise<void> {
  const events: Array<{
    event_type: string
    triggered_by: 'assistant' | 'user' | 'system'
    reason: string | null
  }> = [
    {
      event_type: 'turn_processed',
      triggered_by: 'assistant',
      reason: args.reason,
    },
  ]

  const before = args.beforeState
  const after = args.afterState

  // Recommendations — newly added.
  const beforeRecIds = new Set(before.recommendations.map((r) => r.id))
  for (const rec of after.recommendations) {
    if (!beforeRecIds.has(rec.id)) {
      events.push({
        event_type: 'recommendation_added',
        triggered_by: 'assistant',
        reason: `${rec.id} · rank ${rec.rank} · ${rec.title_de}`,
      })
    }
  }

  // Procedures — newly added or status-changed.
  const beforeProcs = new Map(before.procedures.map((p) => [p.id, p.status]))
  for (const p of after.procedures) {
    const prevStatus = beforeProcs.get(p.id)
    if (prevStatus === undefined) {
      events.push({
        event_type: 'procedure_committed',
        triggered_by: 'assistant',
        reason: `${p.id} · ${p.status} · ${p.title_de}`,
      })
    } else if (prevStatus !== p.status) {
      events.push({
        event_type: 'procedure_status_changed',
        triggered_by: 'assistant',
        reason: `${p.id} · ${prevStatus} → ${p.status}`,
      })
    }
  }

  // Areas — state transitions.
  ;(['A', 'B', 'C'] as const).forEach((key) => {
    const prev = before.areas[key]?.state
    const next = after.areas[key]?.state
    if (prev !== next) {
      events.push({
        event_type: 'area_state_changed',
        triggered_by: 'assistant',
        reason: `${key} · ${prev ?? 'PENDING'} → ${next ?? 'PENDING'}`,
      })
    }
  })

  // Documents — newly added.
  const beforeDocIds = new Set(before.documents.map((d) => d.id))
  for (const d of after.documents) {
    if (!beforeDocIds.has(d.id)) {
      events.push({
        event_type: 'document_added',
        triggered_by: 'assistant',
        reason: `${d.id} · ${d.status} · ${d.title_de}`,
      })
    }
  }

  // Roles — newly added or needed flag flipped.
  const beforeRoles = new Map(before.roles.map((r) => [r.id, r.needed]))
  for (const r of after.roles) {
    const prevNeeded = beforeRoles.get(r.id)
    if (prevNeeded === undefined) {
      events.push({
        event_type: 'role_added',
        triggered_by: 'assistant',
        reason: `${r.id} · ${r.needed ? 'needed' : 'not needed'} · ${r.title_de}`,
      })
    } else if (prevNeeded !== r.needed) {
      events.push({
        event_type: 'role_needed_changed',
        triggered_by: 'assistant',
        reason: `${r.id} · ${prevNeeded} → ${r.needed}`,
      })
    }
  }

  // Facts — key-level new additions.
  const beforeFactKeys = new Set(before.facts.map((f) => f.key))
  for (const f of after.facts) {
    if (!beforeFactKeys.has(f.key)) {
      events.push({
        event_type: 'fact_extracted',
        triggered_by: 'assistant',
        reason: `${f.key} · ${f.qualifier.source}/${f.qualifier.quality}`,
      })
    }
  }

  // Insert all events in one batch. Carry before/after state on the
  // umbrella row only — the per-delta rows are small chronological
  // markers, not state snapshots. Saves storage and keeps the audit
  // table queryable.
  const rows = events.map((e, i) => ({
    project_id: args.projectId,
    event_type: e.event_type,
    triggered_by: e.triggered_by,
    reason: e.reason,
    ...(i === 0
      ? { before_state: before, after_state: after }
      : { before_state: null, after_state: null }),
  }))

  const { error } = await supabase.from('project_events').insert(rows)
  if (error) {
    console.error(
      JSON.stringify({
        component: 'chat-turn',
        event: 'audit_drop',
        severity: 'warn',
        project_id: args.projectId,
        reason: args.reason,
        events_count: events.length,
        sql_error_code: error.code ?? null,
        sql_error_message: error.message,
        hint: 'project_events batch insert failed — turn proceeded but the audit rows were lost.',
      }),
    )
  }
}

/**
 * Phase 6 A.7 — set of event types considered "meaningful" for the
 * Bauherr-grade exports (PDF, Markdown). The architect-grade JSON
 * export includes everything including 'turn_processed' and the
 * high-volume 'fact_extracted' rows.
 */
export const MEANINGFUL_EVENT_TYPES: ReadonlySet<string> = new Set([
  'recommendation_added',
  'procedure_committed',
  'procedure_status_changed',
  'area_state_changed',
  'document_added',
  'role_added',
  'role_needed_changed',
])

// ── Map messages to Anthropic shape ────────────────────────────────────

/**
 * Translate DB rows into the {role, content} shape the Messages API
 * expects. System rows (UI-only conventions like the Sonstiges notice)
 * are filtered — they're informational, not part of the LLM exchange.
 * Both user and assistant rows feed `content_de` since that's the
 * canonical text; the model handles English user input gracefully.
 */
export function mapMessagesForAnthropic(
  rows: MessageRow[],
): { role: 'user' | 'assistant'; content: string }[] {
  return rows
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content_de,
    }))
}
