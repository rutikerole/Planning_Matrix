// ───────────────────────────────────────────────────────────────────────
// Phase 3 Edge Function — chat-turn
//
// Per-turn entrypoint. The flow:
//
//   1. CORS preflight + origin allowlist.
//   2. Bearer-token gate (platform verify_jwt has already run).
//   3. JSON body parsed against chatTurnRequestSchema (Zod).
//   4. Per-request Supabase client scoped to the caller via the bearer
//      token — every downstream query runs as the user, RLS-enforced.
//   5. Load project + last 30 messages.
//   6. Insert user message (if userMessage present).
//   7. Build messages array + live-state block, call Anthropic with
//      forced tool_choice respond.
//   8. Apply state mutations via projectStateHelpers.
//   9. Insert assistant message.
//  10. UPDATE project (state).
//  11. Return { ok: true, assistantMessage, projectState, costInfo }.
//
// Idempotency on duplicate user-message inserts (ON CONFLICT) and
// retry-once-on-malformed-tool-input land in commit 7.
// ───────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import { buildCorsHeaders } from './cors.ts'
import { buildSystemBlocks, buildLiveStateBlock } from './systemPrompt.ts'
import { callAnthropic, estimateCostUsd, UpstreamError } from './anthropic.ts'
import { MODEL } from './toolSchema.ts'
import {
  loadProjectAndMessages,
  insertUserMessage,
  insertAssistantMessage,
  updateProjectState,
  mapMessagesForAnthropic,
} from './persistence.ts'
import {
  hydrateProjectState,
  applyToolInputToState,
} from '../../../src/lib/projectStateHelpers.ts'
import {
  chatTurnRequestSchema,
  type ChatTurnError,
  type ChatTurnResponse,
} from '../../../src/types/chatTurn.ts'
import type { Specialist, TemplateId } from '../../../src/types/projectState.ts'

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = buildCorsHeaders(origin)

  // ── CORS preflight ────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse(
      { code: 'validation', message: 'POST required' },
      405,
      corsHeaders,
    )
  }

  // ── Auth ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(
      { code: 'unauthenticated', message: 'Missing bearer token' },
      401,
      corsHeaders,
    )
  }

  // ── Body ──────────────────────────────────────────────────────────
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return jsonResponse(
      { code: 'validation', message: 'Invalid JSON body' },
      400,
      corsHeaders,
    )
  }
  const parsed = chatTurnRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return jsonResponse(
      { code: 'validation', message: parsed.error.message },
      400,
      corsHeaders,
    )
  }
  const { projectId, userMessage, userAnswer, clientRequestId } = parsed.data

  // ── Env ───────────────────────────────────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!apiKey || !supabaseUrl || !anonKey) {
    return jsonResponse(
      {
        code: 'internal',
        message:
          'Missing function env (ANTHROPIC_API_KEY / SUPABASE_URL / SUPABASE_ANON_KEY).',
      },
      500,
      corsHeaders,
    )
  }

  // ── Supabase client (RLS-scoped) ──────────────────────────────────
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    return jsonResponse(
      { code: 'unauthenticated', message: 'Invalid session' },
      401,
      corsHeaders,
    )
  }

  // ── Load project + messages ──────────────────────────────────────
  const loadResult = await loadProjectAndMessages(supabase, projectId)
  if (!loadResult.ok) {
    return jsonResponse(loadResult.error, loadResult.status, corsHeaders)
  }
  const { project, messages: history } = loadResult
  const templateId = project.template_id as TemplateId
  const currentState = hydrateProjectState(project.state, templateId)

  // ── Insert user message (if any) ─────────────────────────────────
  const allRows = [...history]
  if (userMessage) {
    const userInsert = await insertUserMessage(supabase, {
      projectId,
      content: userMessage,
      userAnswer,
      clientRequestId,
    })
    if (!userInsert.ok) {
      return jsonResponse(userInsert.error, 500, corsHeaders)
    }
    allRows.push(userInsert.row)
  }

  // ── Build messages array for Anthropic ───────────────────────────
  const anthropicMessages = mapMessagesForAnthropic(allRows)
  if (anthropicMessages.length === 0) {
    // First-turn priming — synthesize a kickoff "user" turn so the API
    // has the required leading user role. Never persisted.
    anthropicMessages.push({
      role: 'user',
      content:
        'Eröffnen Sie das Gespräch mit dem Bauherrn. Begrüßen Sie kurz, fassen Sie die bekannten Eckdaten (Vorhaben, Grundstück) in einem Satz zusammen, und stellen Sie die erste substantielle Verständnisfrage.',
    })
  }

  // ── Build live-state block ───────────────────────────────────────
  const lastSpecialist = findLastSpecialist(allRows)
  const liveStateText = buildLiveStateBlock({
    templateId,
    intent: project.intent,
    hasPlot: project.has_plot,
    plotAddress: project.plot_address,
    bundesland: project.bundesland,
    state: currentState,
    lastUserMessageText: userMessage,
    lastSpecialist,
  })

  // ── Anthropic call ───────────────────────────────────────────────
  let anthropicResult
  try {
    anthropicResult = await callAnthropic({
      apiKey,
      systemBlocks: buildSystemBlocks(liveStateText),
      messages: anthropicMessages,
    })
  } catch (err) {
    return jsonResponse(translateUpstream(err), upstreamStatus(err), corsHeaders)
  }
  const { toolInput, usage, latencyMs } = anthropicResult

  // ── Apply mutations ──────────────────────────────────────────────
  const newState = applyToolInputToState(currentState, toolInput)

  // ── Insert assistant message ─────────────────────────────────────
  const assistantInsert = await insertAssistantMessage(supabase, {
    projectId,
    toolInput,
    model: MODEL,
    usage,
    latencyMs,
  })
  if (!assistantInsert.ok) {
    return jsonResponse(assistantInsert.error, 500, corsHeaders)
  }

  // ── Persist state ────────────────────────────────────────────────
  const stateUpdate = await updateProjectState(supabase, projectId, newState)
  if (!stateUpdate.ok) {
    return jsonResponse(stateUpdate.error, 500, corsHeaders)
  }

  // ── Done ─────────────────────────────────────────────────────────
  const response: ChatTurnResponse = {
    ok: true,
    assistantMessage: assistantInsert.row,
    projectState: newState,
    costInfo: {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      latencyMs,
      usdEstimate: estimateCostUsd(usage),
    },
  }
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
})

// ── Helpers ──────────────────────────────────────────────────────────

function jsonResponse(
  error: ChatTurnError,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  const body: ChatTurnResponse = { ok: false, error }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function findLastSpecialist(rows: { role: string; specialist: string | null }[]): Specialist | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i]
    if (r.role === 'assistant' && r.specialist) {
      return r.specialist as Specialist
    }
  }
  return null
}

function translateUpstream(err: unknown): ChatTurnError {
  if (err instanceof UpstreamError) {
    if (err.code === 'invalid_response') {
      return { code: 'model_response_invalid', message: err.message }
    }
    if (err.code === 'timeout') {
      return { code: 'upstream_timeout', message: err.message }
    }
    // rate_limit | overloaded | server
    return {
      code: 'upstream_overloaded',
      message: err.message,
      ...(err.retryAfterMs ? { retryAfterMs: err.retryAfterMs } : {}),
    }
  }
  console.error('[chat-turn] unexpected upstream error', err)
  return { code: 'internal', message: err instanceof Error ? err.message : String(err) }
}

function upstreamStatus(err: unknown): number {
  if (err instanceof UpstreamError) {
    if (err.code === 'timeout') return 504
    if (err.code === 'invalid_response') return 502
    return 502 // rate_limit / overloaded / server
  }
  return 500
}
