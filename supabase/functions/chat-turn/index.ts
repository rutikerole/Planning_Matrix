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

import { createClient } from 'npm:@supabase/supabase-js@2'
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
import { enforceCitationAllowList, lintCitations, logCitationViolations } from './citationLint.ts'
import { runStreamingTurn, acceptsStream } from './streaming.ts'
import {
  hydrateProjectState,
  applyToolInputToState,
  gateQualifiersByRole,
  QUALIFIER_GATE_REJECTS,
} from '../../../src/lib/projectStateHelpers.ts'
import { isRegisteredBundesland } from '../../../src/legal/legalRegistry.ts'
import {
  chatTurnRequestSchema,
  type ChatTurnError,
  type ChatTurnResponse,
  type AssistantMessageRow,
} from '../../../src/types/chatTurn.ts'
import type { ProjectState, Specialist, TemplateId } from '../../../src/types/projectState.ts'
import { createTracer } from './tracer.ts'
import type { TraceStatus } from '../../../src/types/observability.ts'

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

  // Phase 13 — fetch caller's profile role for the qualifier-write-gate.
  // We tolerate a missing profile row (defaults to 'client') so a
  // misconfigured profile never blocks a user's chat turn at the
  // role-lookup step. The gate itself runs in REJECTION mode since the
  // Week-2 flip (v1.0.2: QUALIFIER_GATE_REJECTS = true in
  // src/lib/projectStateHelpers.ts); a CLIENT-turn that emits
  // DESIGNER+VERIFIED is rejected with the qualifier_role_violation
  // envelope before applyToolInputToState runs.
  //
  // Historical note: an earlier comment block here described an
  // observability-only posture that was accurate for v1.0.0–v1.0.1 but
  // had drifted from runtime behaviour by v1.0.2; corrected in v1.0.4.
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  const callerRole = (profileRow?.role ?? 'client') as
    'client' | 'designer' | 'engineer' | 'authority'

  console.log(
    `[chat-turn] [${requestId}] user=${userData.user.id} role=${callerRole} project=${projectId}`,
  )

  // ── Tracer (Phase 9) ─────────────────────────────────────────────
  // Created once per turn, identity bound to requestId so existing
  // stdout logs and the trace row share an ID. Streaming branch hands
  // the tracer off to runStreamingTurn (it finalizes on stream close);
  // JSON branch finalizes in the finally below.
  const isStreaming = acceptsStream(req)
  const tracer = createTracer({
    project_id: projectId,
    user_id: userData.user.id,
    client_request_id: clientRequestId ?? null,
    kind: isStreaming ? 'chat_turn_streaming' : 'chat_turn_json',
    model: MODEL,
    region: Deno.env.get('SB_REGION') ?? Deno.env.get('AWS_REGION') ?? undefined,
    function_version: Deno.env.get('FUNCTION_VERSION') ?? undefined,
    trace_id: requestId,
  })
  const rootSpan = tracer.startSpan('chat_turn.root')
  let traceStatus: TraceStatus = 'ok'
  let tracerHandedOff = false

  try {

  // ── Rate limit ───────────────────────────────────────────────────
  // Phase 4.1 #125 — guard the Anthropic credit budget. The RPC is
  // SECURITY DEFINER and atomic (insert ... on conflict ... do update);
  // it returns one row whose `allowed` flag tells us whether the
  // caller is within their per-hour cap. Failures here fall through
  // to a 500 — we don't want to silently bypass the limiter on infra
  // hiccups.
  const RATE_LIMIT_PER_HOUR = 50
  const rateLimitSpan = tracer.startSpan('rate_limit.check', rootSpan.span_id)
  const { data: rateRows, error: rateErr } = await supabase.rpc(
    'increment_chat_turn_rate_limit',
    { p_user_id: userData.user.id, p_max_per_hour: RATE_LIMIT_PER_HOUR },
  )
  if (rateErr) {
    rateLimitSpan.setError(rateErr.message)
    rateLimitSpan.end('error')
    tracer.setError('rate_limit_check_failed', rateErr.message)
    traceStatus = 'error'
    console.error(`[chat-turn] [${requestId}] rate-limit RPC failed:`, rateErr)
    return respond(
      { code: 'internal', message: 'Rate-limit check failed' },
      500,
    )
  }
  const rateRow = Array.isArray(rateRows) ? rateRows[0] : rateRows
  rateLimitSpan.setAttributes({
    current_count: rateRow?.current_count ?? null,
    max_count: rateRow?.max_count ?? null,
    allowed: rateRow?.allowed ?? null,
  })
  rateLimitSpan.end()
  if (rateRow && !rateRow.allowed) {
    tracer.setError('rate_limit_exceeded', `${rateRow.current_count}/${rateRow.max_count}`)
    traceStatus = 'error'
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
  const loadSpan = tracer.startSpan('state.load', rootSpan.span_id)
  const loadResult = await loadProjectAndMessages(supabase, projectId)
  if (!loadResult.ok) {
    loadSpan.setError(loadResult.error.message)
    loadSpan.end('error')
    tracer.setError(loadResult.error.code, loadResult.error.message)
    traceStatus = 'error'
    return respond(loadResult.error, loadResult.status)
  }
  const { project, messages: history } = loadResult
  loadSpan.setAttributes({
    messages_loaded: history.length,
    template_id: project.template_id,
    bundesland: project.bundesland,
  })
  // Phase 11 — emit a span event when the project's Bundesland code
  // isn't registered in src/legal/legalRegistry.ts. resolveStateDelta
  // falls back to BAYERN_DELTA silently; this event is the queryable
  // signal that the fallback fired. Production wizard hardcodes
  // 'bayern' (audit B04, held), so this should never fire in prod
  // unless someone manually edited projects.bundesland in the DB.
  if (!isRegisteredBundesland(project.bundesland)) {
    loadSpan.addEvent('legal.bundesland.fallback', {
      raw: project.bundesland,
      fallback: 'bayern',
    })
  }
  loadSpan.end()
  const templateId = project.template_id as TemplateId
  const currentState = hydrateProjectState(project.state, templateId)

  // ── Insert user message (with idempotency) ───────────────────────
  const allRows: MessageRow[] = [...history]
  if (userMessage) {
    const userSpan = tracer.startSpan('user_message.insert', rootSpan.span_id)
    const userInsert = await insertUserMessageOrFetchExisting(supabase, {
      projectId,
      content: userMessage,
      contentEn: userMessageEn ?? null,
      userAnswer,
      clientRequestId,
    })
    if (!userInsert.ok) {
      userSpan.setError(userInsert.error.message)
      userSpan.end('error')
      tracer.setError(userInsert.error.code, userInsert.error.message)
      traceStatus = 'error'
      return respond(userInsert.error, userInsert.error.code === 'idempotency_replay' ? 409 : 500)
    }
    const userRow = userInsert.row
    userSpan.setAttributes({ replayed: userInsert.replayed })
    userSpan.end()

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
        traceStatus = 'idempotent_replay'
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
    // Phase 10 commit 13 — per-template first-turn priming. Synthesizes
    // a kickoff USER turn so the API has the required leading user
    // role. Never persisted. The content is template-specific so the
    // persona's first message names the right specialists for the
    // right project shape (T-03 → Energieberatung+Tragwerk; T-05 →
    // Vollabbruch-vs-Teilabbruch question; T-06 → Art. 46 Abs. 6
    // Privileg invocation; T-08 → eliciting opener with no assumed
    // structure; etc.).
    anthropicMessages.push({
      role: 'user',
      content: firstTurnPrimer(templateId),
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
  if (isStreaming) {
    console.log(`[chat-turn] [${requestId}] streaming path locale=${locale ?? 'de'}`)
    tracerHandedOff = true  // streaming pipeline will finalize
    return runStreamingTurn({
      apiKey,
      systemBlocks: buildSystemBlocks(liveStateText, locale, templateId, project.bundesland),
      messages: anthropicMessages,
      supabase,
      projectId,
      userId: userData.user.id,
      callerRole,
      currentState,
      bundesland: project.bundesland,
      corsHeaders,
      requestId,
      clientRequestId,
      tracer,
      rootSpan,
    })
  }

  // ── Anthropic call (with one retry on malformed tool input) ──────
  const callSpan = tracer.startSpan('anthropic.call', rootSpan.span_id)
  let anthropicResult
  try {
    anthropicResult = await callAnthropicWithRetry({
      apiKey,
      systemBlocks: buildSystemBlocks(liveStateText, locale, templateId, project.bundesland),
      messages: anthropicMessages,
      tracer,
      parentSpan: callSpan,
    })
    callSpan.end()
  } catch (err) {
    callSpan.setError(err instanceof Error ? err.message : String(err))
    callSpan.end('error')
    tracer.setError('anthropic_call_failed', err instanceof Error ? err.message : String(err))
    traceStatus = 'error'
    console.error(`[chat-turn] [${requestId}] upstream error`, err)
    return respond(translateUpstream(err), upstreamStatus(err))
  }
  const { toolInput, usage, latencyMs } = anthropicResult

  // ── Phase 8.6 (D.4) — fact-plausibility validation ──────────────
  const plausibilitySpan = tracer.startSpan('plausibility.check', rootSpan.span_id)
  const plausibility = validateFactPlausibility(toolInput)
  plausibilitySpan.setAttributes({
    facts_checked: toolInput.extracted_facts?.length ?? 0,
    downgraded_count: plausibility.downgraded,
    warnings: plausibility.warnings,
  })
  plausibilitySpan.end()
  if (plausibility.downgraded > 0) {
    console.log(
      `[chat-turn] [${requestId}] plausibility: ${plausibility.downgraded} fact(s) downgraded to ASSUMED`,
    )
  }

  // ── Phase 10.1 — citation linter ────────────────────────────────
  // Non-blocking. Scans message_de + message_en for known-bad
  // citation patterns (e.g. "Anlage 1 BayBO" in a Bayern context)
  // and logs each violation. The response always proceeds — this is
  // observability, not gating. Commit 6 wires violations to
  // public.event_log so the admin Logs drawer can surface trends.
  const citationLintSpan = tracer.startSpan('citation.lint', rootSpan.span_id)
  // Phase 10.1 + Phase 11 firewall — pass toolInput so the linter
  // scans every model-emitted text field, and pass project.bundesland
  // so the active state's own LBO citations are not flagged.
  const citationViolations = lintCitations(toolInput, project.bundesland)
  citationLintSpan.setAttributes({
    violations_count: citationViolations.length,
    error_count: citationViolations.filter((v) => v.severity === 'error').length,
    warning_count: citationViolations.filter((v) => v.severity === 'warning').length,
  })
  citationLintSpan.end()
  if (citationViolations.length > 0) {
    console.log(
      `[chat-turn] [${requestId}] citation-lint: ${citationViolations.length} violation(s)`,
      citationViolations.map((v) => ({
        pattern: v.pattern,
        match: v.match,
        severity: v.severity,
        field: v.field,
      })),
    )
    // Best-effort fan-out into public.event_log for the admin Logs
    // drawer Events tab. Awaited so the writes happen during the
    // same trace, but errors are swallowed inside the helper.
    await logCitationViolations({
      supabase,
      userId: userData.user.id,
      projectId,
      requestId,
      traceId: tracer.trace_id,
      violations: citationViolations,
    })
  }

  // v1.0.5 / audit B3 — Layer C positive-list enforcement.
  // Mutates toolInput in place: any delta-item whose citations are
  // NOT in the active state's allowedCitations gets its qualifier
  // downgraded to DESIGNER+ASSUMED. The Vorläufig footer renders
  // for that item on the result page. Best-effort fan-out into
  // event_log under name='citation.fabrication' (mirrors the
  // citation.violation event-log shape so the admin Logs drawer
  // surfaces both classes side-by-side).
  const allowListEvents = enforceCitationAllowList(toolInput, project.bundesland)
  if (allowListEvents.length > 0) {
    console.log(
      `[chat-turn] [${requestId}] citation-allow-list: ${allowListEvents.length} downgrade(s)`,
      allowListEvents.map((e) => ({
        field: e.field,
        item_id: e.item_id,
        fabricated: e.fabricated.map((f) => `${f.law.toUpperCase()} ${f.number}`),
      })),
    )
    const safeTraceId =
      tracer.trace_id && tracer.trace_id !== '00000000-0000-0000-0000-000000000000'
        ? tracer.trace_id
        : null
    const now = new Date().toISOString()
    const rows = allowListEvents.map((e) => ({
      session_id: requestId,
      user_id: userData.user.id,
      project_id: projectId,
      source: 'system' as const,
      name: 'citation.fabrication',
      attributes: {
        field: e.field,
        item_id: e.item_id,
        fabricated: e.fabricated,
        reason: e.reason,
        active_bundesland: project.bundesland,
      },
      client_ts: now,
      trace_id: safeTraceId,
    }))
    const { error: alErr } = await supabase.from('event_log').insert(rows)
    if (alErr) {
      console.warn(
        `[chat-turn] [${requestId}] citation-allow-list event_log insert failed: ${alErr.message}`,
      )
    }
  }

  // ── Phase 13 — qualifier-write-gate (rejection mode) ──────────────
  // Inspects every qualifier-bearing surface in toolInput. When a non-
  // designer caller attempts DESIGNER+VERIFIED, the gate collects
  // events AND mutates toolInput in-place to DESIGNER+ASSUMED.
  //   - Week 1 (observability):  log event, persist downgraded state.
  //   - Week 2+ (rejection, current): when QUALIFIER_GATE_REJECTS=true
  //     and events.length>0, log event with name='qualifier.rejected'
  //     and short-circuit with the qualifier_role_violation envelope
  //     BEFORE applyToolInputToState. The in-place mutation is left
  //     intact as a defensive secondary guard.
  const qualifierGateSpan = tracer.startSpan('qualifier.gate', rootSpan.span_id)
  const qualifierDowngrades = gateQualifiersByRole(toolInput, callerRole)
  const gateEventName = QUALIFIER_GATE_REJECTS
    ? 'qualifier.rejected'
    : 'qualifier.downgraded'
  qualifierGateSpan.setAttributes({
    caller_role: callerRole,
    downgrade_count: qualifierDowngrades.length,
    rejecting: QUALIFIER_GATE_REJECTS,
  })
  qualifierGateSpan.end()
  if (qualifierDowngrades.length > 0) {
    console.log(
      `[chat-turn] [${requestId}] qualifier-gate (${gateEventName}): ${qualifierDowngrades.length} event(s)`,
      qualifierDowngrades.map((e) => ({
        field: e.field,
        item_id: e.item_id,
        attempted: `${e.attempted_source}+${e.attempted_quality}`,
        enforced: `${e.enforced_source}+${e.enforced_quality}`,
      })),
    )
    const safeTraceId =
      tracer.trace_id && tracer.trace_id !== '00000000-0000-0000-0000-000000000000'
        ? tracer.trace_id
        : null
    const now = new Date().toISOString()
    const rows = qualifierDowngrades.map((e) => ({
      session_id: requestId,
      user_id: userData.user.id,
      project_id: projectId,
      source: 'system' as const,
      name: gateEventName,
      attributes: {
        field: e.field,
        item_id: e.item_id,
        attempted_source: e.attempted_source,
        attempted_quality: e.attempted_quality,
        enforced_source: e.enforced_source,
        enforced_quality: e.enforced_quality,
        caller_role: e.caller_role,
        reason: e.reason,
      },
      client_ts: now,
      trace_id: safeTraceId,
    }))
    const { error: qgErr } = await supabase.from('event_log').insert(rows)
    if (qgErr) {
      console.warn(
        `[chat-turn] [${requestId}] qualifier-gate event_log insert failed: ${qgErr.message}`,
      )
    }

    if (QUALIFIER_GATE_REJECTS) {
      // Mark the trace as errored — the outer finally block calls
      // rootSpan.end + tracer.finalize, so we must NOT do it here or
      // we double-finalize. setError stores the code+message; the
      // finally branches on traceStatus.
      tracer.setError(
        'qualifier_role_violation',
        `Gate rejected ${qualifierDowngrades.length} qualifier write(s) from caller_role=${callerRole}.`,
      )
      traceStatus = 'error'
      return respond(
        {
          code: 'qualifier_role_violation',
          message:
            'Diese Festlegung erfordert die Freigabe durch eine/n bauvorlageberechtigte/n Architekt/in.',
        },
        403,
      )
    }
  }

  // ── Apply mutations ──────────────────────────────────────────────
  const newState = applyToolInputToState(currentState, toolInput)

  // ── Capture persona snapshot (Phase 9 — replay artifact) ────────
  // Materializes "what the model saw and what it said" so a turn can
  // be reconstructed for debugging. Sampled inside the tracer:
  // always-store on non-ok, 1-in-50 on ok. Hash always stored.
  const systemBlocksFinal = buildSystemBlocks(liveStateText, locale, templateId, project.bundesland)
  tracer.capturePersonaSnapshot({
    system_prompt_full: systemBlocksFinal.map((b) => b.text).join('\n\n──\n\n'),
    state_block_full: liveStateText,
    messages_full: anthropicMessages,
    tool_use_response_raw: toolInput,
    tool_use_response_validated: toolInput,
  })

  // ── Atomic commit (Phase 8.6 B.3 + D.4 + Phase 9 trace_id) ──────
  const commitSpan = tracer.startSpan('rpc.commit_chat_turn', rootSpan.span_id)
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
    traceId: tracer.trace_id,
  })
  if (!commitResult.ok) {
    commitSpan.setError(commitResult.error.message)
    commitSpan.end('error')
    tracer.setError(commitResult.error.code, commitResult.error.message)
    traceStatus = 'error'
    return respond(commitResult.error, 500)
  }
  commitSpan.setAttributes({
    idempotency_replay: !!commitResult.replayed,
    plausibility_events_count: plausibility.warnings.length,
  })
  commitSpan.end()

  if (commitResult.replayed) {
    traceStatus = 'idempotent_replay'
  }

  // v1.0.4 A2 — emit `chat.turn_completed` per successful turn so the
  // 0032 qualifier_rates_7d_global view's `turns_count` denominator
  // counts real turns. The 0029 predecessor used `source='chat-turn'`
  // which is rejected by the event_log CHECK constraint
  // ('wizard'|'chat'|'result'|'auth'|'dashboard'|'sentry'|'system'),
  // so the threshold sat at 0 forever (audit CRIT-2). The migration
  // 0032 view aligns its WHERE to (source='chat', name='chat.turn_completed').
  // Best-effort fan-out: a transient DB blip on this insert must NOT
  // fail the user's turn — wrapped in warn-and-continue (mirrors
  // citationLint's logCitationViolations posture).
  if (!commitResult.replayed) {
    const safeTraceId =
      tracer.trace_id && tracer.trace_id !== '00000000-0000-0000-0000-000000000000'
        ? tracer.trace_id
        : null
    const { error: turnEvtErr } = await supabase.from('event_log').insert({
      session_id: requestId,
      user_id: userData.user.id,
      project_id: projectId,
      source: 'chat',
      name: 'chat.turn_completed',
      attributes: {
        specialist: toolInput.specialist,
        latency_ms: latencyMs,
        completion_signal: toolInput.completion_signal ?? 'continue',
      },
      client_ts: new Date().toISOString(),
      trace_id: safeTraceId,
    })
    if (turnEvtErr) {
      console.warn(
        `[chat-turn] [${requestId}] chat.turn_completed event_log insert failed: ${turnEvtErr.message}`,
      )
    }
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
  } finally {
    // ── Tracer finalize (Phase 9) ───────────────────────────────────
    // For the JSON path: every return above hits this finally before
    // the Response leaves the function. For the streaming path: the
    // tracer was handed to runStreamingTurn (which finalizes when the
    // stream closes), so we skip here.
    if (!tracerHandedOff) {
      try {
        rootSpan.end(traceStatus === 'ok' || traceStatus === 'idempotent_replay' ? 'ok' : 'error')
        await tracer.finalize(traceStatus)
      } catch (err) {
        // Tracer must never throw into the user path. Log + swallow.
        console.warn(`[chat-turn] [${requestId}] tracer finalize threw`, err)
      }
    }
  }
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

/**
 * Phase 10 commit 13 — per-template first-turn opener directives.
 *
 * Returns a one-line German instruction the persona reads as the
 * synthesized kickoff "user" turn. The persona's resulting first
 * assistant message reflects the template's project-shape:
 *   - T-03 mentions Sanierung verfahrensfreie Tier upfront
 *   - T-05 asks Vollabbruch vs Teilabbruch + Denkmal
 *   - T-06 invokes Art. 46 Abs. 6 Privileg as the value-prop
 *   - T-08 elicits sub-category before any procedure logic
 */
function firstTurnPrimer(templateId: TemplateId): string {
  const opener =
    'Eröffnen Sie das Gespräch mit dem Bauherrn. Begrüßen Sie kurz und fassen Sie die bekannten Eckdaten (Vorhaben, Grundstück) in einem Satz zusammen.'
  switch (templateId) {
    case 'T-01':
      return `${opener} Stellen Sie dann die erste Bauplanungsrechtliche Verständnisfrage (B-Plan / § 34 / § 35) für diesen Neubau.`
    case 'T-02':
      return `${opener} Setzen Sie Brandschutz und Schallschutz früh als Pflicht-Spezialisten am Tisch — bei einem Mehrfamilienhaus sind sie tragend. Klären Sie die Gebäudeklasse-Hypothese (3, 4 oder 5) als erste Frage.`
    case 'T-03':
      return `${opener} Setzen Sie Energieberatung und Tragwerk explizit an den Tisch (Sanierungs-Pflicht-Spezialisten). Erklären Sie kurz, dass Sanierungen seit 01.01.2025 oft verfahrensfrei sind (BayBO Art. 57 Abs. 3 Nr. 3) und stellen Sie als erste Frage: Werden tragende Teile, Brandwände oder Fluchtwege berührt?`
    case 'T-04':
      return `${opener} Klären Sie zuerst die Use-Change-Matrix: welche Nutzung war es, welche soll es werden? Ohne diese Paarung ist keine Verfahrenseinordnung möglich.`
    case 'T-05':
      return `${opener} Setzen Sie Tragwerk und Schadstoffgutachter:in als Pflicht-Spezialisten an den Tisch. Stellen Sie als ERSTE Frage zwei verbundene Punkte: Vollabbruch oder Teilabbruch? Steht das Gebäude unter Denkmalschutz?`
    case 'T-06':
      return `${opener} Benennen Sie das zentrale Privileg dieser Maßnahme: BayBO Art. 46 Abs. 6 — bei eingeschossiger Aufstockung zur Schaffung von Wohnraum gelten die Anforderungen der bisherigen Gebäudeklasse weiter, der Bestand muss nicht auf neue Brandschutz-Anforderungen ertüchtigt werden. Seit 01.10.2025 darf die Gemeinde zudem keine zusätzlichen Stellplätze verlangen (Art. 81 Abs. 1 Nr. 4 b). Stellen Sie als erste Frage die Bestandsstatik / Tragfähigkeit der vorhandenen Decke.`
    case 'T-07':
      return `${opener} Prüfen Sie zuerst die zwei Schwellen, die das Verfahren bestimmen: Brutto-Rauminhalt des Anbaus (≤ 75 m³ ist verfahrensfrei nach Art. 57 Abs. 1 Nr. 1 a) UND die Lage (Innen- oder Außenbereich). Stellen Sie genau diese zwei Fragen.`
    case 'T-08':
      return `${opener} ACHTUNG: Sie wissen NICHT um welche Art Bauwerk es sich handelt. Stellen Sie als erste und einzige Frage: „Welche Art von Bauwerk oder Anlage planen Sie? Garage, Pool, Werbeanlage, Photovoltaik, Mobilfunkmast oder etwas anderes?" Treffen Sie KEINE Annahmen über Verfahrensart, Spezialisten oder Dokumente, bevor die Sub-Kategorie steht.`
  }
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
