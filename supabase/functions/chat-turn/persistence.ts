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

// ── Audit log: project_events ──────────────────────────────────────────

/**
 * Best-effort audit row per turn. Captures before/after state so a future
 * audit UI can replay state evolution without parsing every assistant
 * message. Failure here is logged but does not abort the turn — missing
 * events are an audit gap, not a correctness issue.
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
  const { error } = await supabase.from('project_events').insert({
    project_id: args.projectId,
    event_type: 'turn_processed',
    before_state: args.beforeState,
    after_state: args.afterState,
    triggered_by: 'assistant',
    reason: args.reason,
  })
  if (error) {
    // Phase 2.5 — promote from a casual `console.warn` to a structured
    // line that platform log filters can pick up. The audit (Tier-2)
    // flagged that a silently-dropped audit-event row leaves no trail
    // for future investigation. We still do NOT abort the turn — a
    // missing audit row is an audit gap, not a correctness regression
    // — but failures are now greppable via the `event=audit_drop` tag.
    console.error(
      JSON.stringify({
        component: 'chat-turn',
        event: 'audit_drop',
        severity: 'warn',
        project_id: args.projectId,
        reason: args.reason,
        sql_error_code: error.code ?? null,
        sql_error_message: error.message,
        hint: 'project_events insert failed — turn proceeded but the audit row was lost.',
      }),
    )
  }
}

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
