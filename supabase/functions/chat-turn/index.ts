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
//   6. Insert user message, idempotently. If the unique partial index
//      on (project_id, client_request_id) fires, look up the existing
//      row; if there's an assistant message past it, short-circuit.
//   7. Build messages array + live-state block, call Anthropic with
//      forced tool_choice respond. Retry once on malformed tool input
//      (callAnthropicWithRetry).
//   8. Apply state mutations via projectStateHelpers.
//   9. Insert assistant message.
//  10. UPDATE project (state) + best-effort project_events row.
//  11. Return { ok: true, assistantMessage, projectState, costInfo }.
//
// Every error envelope carries a requestId for log correlation.
// ───────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import { buildCorsHeaders } from './cors.ts'
import { buildSystemBlocks, buildLiveStateBlock } from './systemPrompt.ts'
import {
  callAnthropicWithRetry,
  estimateCostUsd,
  UpstreamError,
} from './anthropic.ts'
import { MODEL } from './toolSchema.ts'
import {
  loadProjectAndMessages,
  insertUserMessageOrFetchExisting,
  commitChatTurnAtomic,
  mapMessagesForAnthropic,
  findAssistantAfter,
  type MessageRow,
} from './persistence.ts'
import { validateFactPlausibility } from './factPlausibility.ts'
import { runStreamingTurn, acceptsStream } from './streaming.ts'
import {
  hydrateProjectState,
  applyToolInputToState,
} from '../../../src/lib/projectStateHelpers.ts'
import {
  chatTurnRequestSchema,
  type ChatTurnError,
  type ChatTurnResponse,
  type AssistantMessageRow,
} from '../../../src/types/chatTurn.ts'
import type { ProjectState, Specialist, TemplateId } from '../../../src/types/projectState.ts'

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID()
  const origin = req.headers.get('Origin')
  const corsHeaders = buildCorsHeaders(origin)

  const respond = (error: ChatTurnError, status: number) =>
    jsonResponse({ ...error, requestId }, status, corsHeaders)

  // ── CORS preflight ────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return respond({ code: 'validation', message: 'POST required' }, 405)
  }

  // ── Auth ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return respond({ code: 'unauthenticated', message: 'Missing bearer token' }, 401)
  }

  // ── Body ──────────────────────────────────────────────────────────
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return respond({ code: 'validation', message: 'Invalid JSON body' }, 400)
  }
  const parsed = chatTurnRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return respond({ code: 'validation', message: parsed.error.message }, 400)
  }
  const {
    projectId,
    userMessage,
    userMessageEn,
    userAnswer,
    clientRequestId,
    locale,
  } = parsed.data

  // ── Env ───────────────────────────────────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!apiKey || !supabaseUrl || !anonKey) {
    return respond(
      {
        code: 'internal',
        message:
          'Missing function env (ANTHROPIC_API_KEY / SUPABASE_URL / SUPABASE_ANON_KEY).',
      },
      500,
    )
  }

  // ── Supabase client (RLS-scoped) ──────────────────────────────────
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    return respond({ code: 'unauthenticated', message: 'Invalid session' }, 401)
  }

  console.log(
    `[chat-turn] [${requestId}] user=${userData.user.id} project=${projectId}`,
  )

  // ── Rate limit ───────────────────────────────────────────────────
  // Phase 4.1 #125 — guard the Anthropic credit budget. The RPC is
  // SECURITY DEFINER and atomic (insert ... on conflict ... do update);
  // it returns one row whose `allowed` flag tells us whether the
  // caller is within their per-hour cap. Failures here fall through
  // to a 500 — we don't want to silently bypass the limiter on infra
  // hiccups.
  const RATE_LIMIT_PER_HOUR = 50
  const { data: rateRows, error: rateErr } = await supabase.rpc(
    'increment_chat_turn_rate_limit',
    { p_user_id: userData.user.id, p_max_per_hour: RATE_LIMIT_PER_HOUR },
  )
  if (rateErr) {
    console.error(`[chat-turn] [${requestId}] rate-limit RPC failed:`, rateErr)
    return respond(
      { code: 'internal', message: 'Rate-limit check failed' },
      500,
    )
  }
  const rateRow = Array.isArray(rateRows) ? rateRows[0] : rateRows
  if (rateRow && !rateRow.allowed) {
    console.log(
      `[chat-turn] [${requestId}] rate limit exceeded: ${rateRow.current_count}/${rateRow.max_count}`,
    )
    return respond(
      {
        code: 'rate_limit_exceeded',
        message: 'Too many chat turns this hour',
        rateLimit: {
          currentCount: rateRow.current_count,
          maxCount: rateRow.max_count,
          resetAt: rateRow.reset_at,
        },
      },
      429,
    )
  }

  // ── Load project + messages ──────────────────────────────────────
  const loadResult = await loadProjectAndMessages(supabase, projectId)
  if (!loadResult.ok) {
    return respond(loadResult.error, loadResult.status)
  }
  const { project, messages: history } = loadResult
  const templateId = project.template_id as TemplateId
  const currentState = hydrateProjectState(project.state, templateId)

  // ── Insert user message (with idempotency) ───────────────────────
  const allRows: MessageRow[] = [...history]
  if (userMessage) {
    const userInsert = await insertUserMessageOrFetchExisting(supabase, {
      projectId,
      content: userMessage,
      contentEn: userMessageEn ?? null,
      userAnswer,
      clientRequestId,
    })
    if (!userInsert.ok) {
      return respond(userInsert.error, userInsert.error.code === 'idempotency_replay' ? 409 : 500)
    }
    const userRow = userInsert.row

    // Idempotency short-circuit: same client_request_id, prior turn
    // already produced an assistant response. Return the cached pair
    // without re-calling Anthropic.
    if (userInsert.replayed) {
      const cachedAssistant = await findAssistantAfter(
        supabase,
        projectId,
        userRow.created_at,
      )
      if (cachedAssistant) {
        console.log(
          `[chat-turn] [${requestId}] idempotent replay — returning cached assistant ${cachedAssistant.id}`,
        )
        return respondSuccess(
          cachedAssistant as unknown as AssistantMessageRow,
          currentState,
          {
            inputTokens: cachedAssistant.input_tokens ?? 0,
            outputTokens: cachedAssistant.output_tokens ?? 0,
            cacheReadTokens: cachedAssistant.cache_read_tokens ?? 0,
            cacheWriteTokens: cachedAssistant.cache_write_tokens ?? 0,
          },
          cachedAssistant.latency_ms ?? 0,
          'continue',
          corsHeaders,
        )
      }
      // No assistant past the user msg — last run crashed before
      // persisting the response. Fall through and call Anthropic again.
      console.log(
        `[chat-turn] [${requestId}] idempotent retry detected; no cached assistant — calling Anthropic`,
      )
    }
    allRows.push(userRow)
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

  // ── Streaming branch (Phase 3.4 #52) ─────────────────────────────
  // If the caller asked for SSE, hand off to the streaming pipeline.
  // The streaming variant runs the same persistence work after Anthropic
  // signals message_stop, so the persisted artefacts are identical.
  if (acceptsStream(req)) {
    console.log(`[chat-turn] [${requestId}] streaming path locale=${locale ?? 'de'}`)
    return runStreamingTurn({
      apiKey,
      systemBlocks: buildSystemBlocks(liveStateText, locale),
      messages: anthropicMessages,
      supabase,
      projectId,
      currentState,
      corsHeaders,
      requestId,
      clientRequestId,
    })
  }

  // ── Anthropic call (with one retry on malformed tool input) ──────
  let anthropicResult
  try {
    anthropicResult = await callAnthropicWithRetry({
      apiKey,
      systemBlocks: buildSystemBlocks(liveStateText, locale),
      messages: anthropicMessages,
    })
  } catch (err) {
    console.error(`[chat-turn] [${requestId}] upstream error`, err)
    return respond(translateUpstream(err), upstreamStatus(err))
  }
  const { toolInput, usage, latencyMs } = anthropicResult

  // ── Phase 8.6 (D.4) — fact-plausibility validation ──────────────
  // Walk extracted_facts; downgrade DECIDED/VERIFIED → ASSUMED for any
  // value out of plausibility bounds (numeric) or outside its enum
  // (categorical). Mutates toolInput in place so applyToolInputToState
  // sees the downgraded qualifier. Warnings get committed in the same
  // transaction as the assistant + state via plausibilityEvents.
  const plausibility = validateFactPlausibility(toolInput)
  if (plausibility.downgraded > 0) {
    console.log(
      `[chat-turn] [${requestId}] plausibility: ${plausibility.downgraded} fact(s) downgraded to ASSUMED`,
    )
  }

  // ── Apply mutations ──────────────────────────────────────────────
  const newState = applyToolInputToState(currentState, toolInput)

  // ── Atomic commit (Phase 8.6 B.3 + D.4) ─────────────────────────
  // Single transactional call: assistant message + state update +
  // audit event + plausibility warnings. Fixes the gap from commit 5
  // (e1890cd): the JSON-fallback path had still been using the
  // sequential insertAssistantMessage + updateProjectState +
  // logTurnEvent trio; the streaming path was already converted.
  const commitResult = await commitChatTurnAtomic(supabase, {
    projectId,
    toolInput,
    model: MODEL,
    usage,
    latencyMs,
    beforeState: currentState,
    newState,
    clientRequestId,
    plausibilityEvents:
      plausibility.warnings.length > 0 ? plausibility.warnings : null,
  })
  if (!commitResult.ok) {
    return respond(commitResult.error, 500)
  }

  console.log(
    `[chat-turn] [${requestId}] ok specialist=${toolInput.specialist} latency=${latencyMs}ms tokens(in/out/cR/cW)=${usage.inputTokens}/${usage.outputTokens}/${usage.cacheReadTokens}/${usage.cacheWriteTokens}${commitResult.replayed ? ' (replayed)' : ''}`,
  )

  return respondSuccess(
    commitResult.row,
    newState,
    usage,
    latencyMs,
    toolInput.completion_signal ?? 'continue',
    corsHeaders,
  )
})

// ── Helpers ──────────────────────────────────────────────────────────

function respondSuccess(
  assistantMessage: AssistantMessageRow,
  projectState: ProjectState,
  usage: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
  },
  latencyMs: number,
  completionSignal: 'continue' | 'needs_designer' | 'ready_for_review' | 'blocked',
  corsHeaders: Record<string, string>,
): Response {
  const body: ChatTurnResponse = {
    ok: true,
    assistantMessage,
    projectState,
    completionSignal,
    costInfo: {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      latencyMs,
      usdEstimate: estimateCostUsd(usage),
    },
  }
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

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

function findLastSpecialist(
  rows: { role: string; specialist: string | null }[],
): Specialist | null {
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
      // Phase 8.6 (B.2) — server already attempted schema-reminder retry
      // inside callAnthropicWithSchemaReminder (anthropic.ts). If we
      // still landed here, both attempts failed. Hint the SPA to
      // auto-retry the whole turn (with the same clientRequestId — the
      // user-message idempotency makes this safe). User sees the
      // existing thinking indicator hang on longer instead of an
      // immediate error toast for what's effectively a transient
      // model-output glitch.
      return {
        code: 'model_response_invalid',
        message: err.message,
        autoRetryInMs: 3000,
      }
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
