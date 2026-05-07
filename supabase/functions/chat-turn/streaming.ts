// ───────────────────────────────────────────────────────────────────────
// Phase 3.4 #52 — Streaming variant of the chat-turn pipeline
//
// Forwards Anthropic's `input_json_delta` events to the client as SSE
// frames so the SPA can extract the user-visible text (`message_de` /
// `message_en`) progressively while the model is still emitting JSON.
//
// Why client-side extraction:
//   • The model is in forced tool-use mode. The user-visible text is
//     a string field INSIDE the respond tool's input JSON, not a
//     standalone text content block. Anthropic streams the JSON as
//     `input_json_delta` chunks, which are not parseable mid-stream.
//   • Server-side partial JSON parsing would require an extra Deno
//     dependency. Forwarding raw delta chunks lets the client run a
//     ~30-line state machine to pull out the text field as bytes
//     arrive — same total work, no new dep, and persona prompt cache
//     stays untouched (Q1 of PHASE_3_4_PLAN.md).
//
// Wire format — text/event-stream, one JSON event per `data:` frame:
//
//   data: {"type":"json_delta","partial":"<chunk>"}
//
//   data: {"type":"complete","assistantMessage":{...},"projectState":{...},
//          "completionSignal":"continue","costInfo":{...},"requestId":"..."}
//
//   data: {"type":"error","code":"...","message":"...","retryAfterMs":4000,"requestId":"..."}
//
// On any failure mid-stream, an error frame is written and the stream
// closes. The client falls back to a single non-streaming retry.
// ───────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildSystemBlocks } from './systemPrompt.ts'
import { MODEL, respondToolDefinition, respondToolChoice } from './toolSchema.ts'
import { estimateCostUsd, UpstreamError, type AnthropicUsage } from './anthropic.ts'
import { commitChatTurnAtomic } from './persistence.ts'
import { validateFactPlausibility } from './factPlausibility.ts'
import { lintCitations, logCitationViolations } from './citationLint.ts'
import { applyToolInputToState } from '../../../src/lib/projectStateHelpers.ts'
import {
  respondToolInputSchema,
  type RespondToolInput,
} from '../../../src/types/respondTool.ts'
import type { ProjectState } from '../../../src/types/projectState.ts'
import type { AssistantMessageRow } from '../../../src/types/chatTurn.ts'
import type { Span, Tracer } from './tracer.ts'
import type { TraceStatus } from '../../../src/types/observability.ts'

const MAX_TOKENS = 1280
const ABORT_TIMEOUT_MS = 50_000

interface StreamingTurnArgs {
  apiKey: string
  systemBlocks: ReturnType<typeof buildSystemBlocks>
  messages: { role: 'user' | 'assistant'; content: string }[]
  supabase: SupabaseClient
  projectId: string
  /** Phase 10.1 — needed to attach citation.violation events to the
   *  authed user in public.event_log. RLS requires user_id to match
   *  auth.uid(); we pass it through explicitly rather than calling
   *  supabase.auth.getUser() a second time. */
  userId: string
  currentState: ProjectState
  corsHeaders: Record<string, string>
  requestId: string
  /** Phase 8.6 (B.3) — propagated to commit_chat_turn for replay
   *  detection. */
  clientRequestId: string
  /** Phase 9 — tracer handed off from index.ts. The streaming pipeline
   *  takes ownership and finalizes when the stream closes (success or
   *  error). The rootSpan is the parent for every span emitted here. */
  tracer: Tracer
  rootSpan: Span
}

/**
 * Run a chat turn with Anthropic streaming + SSE response. The Response
 * is an open `text/event-stream` body that emits `data:` frames per the
 * wire format documented above; persistence runs after `message_stop`
 * and the final `complete` frame contains the same shape the JSON
 * envelope would have returned.
 */
export function runStreamingTurn(args: StreamingTurnArgs): Response {
  const encoder = new TextEncoder()
  const { corsHeaders, tracer, rootSpan } = args
  let traceStatus: TraceStatus = 'ok'

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      const abort = new AbortController()
      const timeoutId = setTimeout(
        () => abort.abort(new Error('upstream_timeout')),
        ABORT_TIMEOUT_MS,
      )

      const callSpan = tracer.startSpan('anthropic.stream', rootSpan.span_id)
      callSpan.setAttributes({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages_count: args.messages.length,
        system_blocks_count: args.systemBlocks.length,
      })

      try {
        const client = new Anthropic({ apiKey: args.apiKey, maxRetries: 0 })

        // Run the streaming request. Anthropic SDK exposes an iterable
        // event stream; we forward `input_json_delta` events as they
        // arrive and rely on `finalMessage()` for the validated payload.
        const anthropicStream = client.messages.stream(
          {
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: args.systemBlocks,
            messages: args.messages,
            tools: [respondToolDefinition],
            tool_choice: respondToolChoice,
          },
          { signal: abort.signal },
        )

        const start = Date.now()
        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'input_json_delta'
          ) {
            const partial =
              (event.delta as { partial_json?: string }).partial_json ?? ''
            if (partial.length > 0) {
              send({ type: 'json_delta', partial })
            }
          }
        }

        const finalMessage = await anthropicStream.finalMessage()
        const latencyMs = Date.now() - start
        clearTimeout(timeoutId)

        // ── Validate tool input ────────────────────────────────────
        const toolUse = finalMessage.content.find(
          (b): b is {
            type: 'tool_use'
            id: string
            name: string
            input: unknown
          } => b.type === 'tool_use',
        )
        if (!toolUse) {
          callSpan.setError('no_tool_use_block')
          callSpan.end('error')
          throw new UpstreamError(
            'invalid_response',
            null,
            'Streaming: no tool_use block in final message',
          )
        }
        const parsed = respondToolInputSchema.safeParse(toolUse.input)
        if (!parsed.success) {
          callSpan.setAttributes({
            validation_result: 'zod_failure',
            validation_error: parsed.error.message,
          })
          callSpan.setError('zod_validation_failed')
          callSpan.end('error')
          throw new UpstreamError(
            'invalid_response',
            null,
            `Streaming: tool input failed Zod validation: ${parsed.error.message}`,
          )
        }
        const toolInput: RespondToolInput = parsed.data

        const usage: AnthropicUsage = {
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
          cacheReadTokens:
            (finalMessage.usage as { cache_read_input_tokens?: number })
              .cache_read_input_tokens ?? 0,
          cacheWriteTokens:
            (finalMessage.usage as { cache_creation_input_tokens?: number })
              .cache_creation_input_tokens ?? 0,
        }

        callSpan.setAttributes({
          anthropic_request_id: (finalMessage as { id?: string }).id ?? null,
          stop_reason: finalMessage.stop_reason,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          cache_read_tokens: usage.cacheReadTokens,
          cache_creation_tokens: usage.cacheWriteTokens,
          latency_ms: latencyMs,
          validation_result: 'ok',
        })
        callSpan.end('ok')
        tracer.setTokens({
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          cache_read_input_tokens: usage.cacheReadTokens,
          cache_creation_input_tokens: usage.cacheWriteTokens,
        })

        // ── Phase 8.6 (D.4) — fact-plausibility validation ─────────
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
            `[chat-turn] [${args.requestId}] plausibility (streaming): ${plausibility.downgraded} fact(s) downgraded to ASSUMED`,
          )
        }

        // ── Phase 10.1 — citation linter (streaming path) ──────────
        // Same observability as the JSON path. Non-blocking.
        const citationLintSpan = tracer.startSpan('citation.lint', rootSpan.span_id)
        // Phase 10.1 firewall — pass the full toolInput so the linter scans
        // recommendations_delta / procedures_delta / documents_delta /
        // extracted_facts.evidence in addition to message_de / message_en.
        const citationViolations = lintCitations(toolInput)
        citationLintSpan.setAttributes({
          violations_count: citationViolations.length,
          error_count: citationViolations.filter((v) => v.severity === 'error').length,
          warning_count: citationViolations.filter((v) => v.severity === 'warning').length,
        })
        citationLintSpan.end()
        if (citationViolations.length > 0) {
          console.log(
            `[chat-turn] [${args.requestId}] citation-lint (streaming): ${citationViolations.length} violation(s)`,
            citationViolations.map((v) => ({
              pattern: v.pattern,
              match: v.match,
              severity: v.severity,
              field: v.field,
            })),
          )
          await logCitationViolations({
            supabase: args.supabase,
            userId: args.userId,
            projectId: args.projectId,
            requestId: args.requestId,
            traceId: tracer.trace_id,
            violations: citationViolations,
          })
        }

        // ── Capture persona snapshot (Phase 9) ─────────────────────
        tracer.capturePersonaSnapshot({
          system_prompt_full: args.systemBlocks.map((b) => b.text).join('\n\n──\n\n'),
          state_block_full:
            args.systemBlocks[args.systemBlocks.length - 1]?.text ?? '',
          messages_full: args.messages,
          tool_use_response_raw: toolInput,
          tool_use_response_validated: toolInput,
        })

        // ── Persistence pipeline ───────────────────────────────────
        const newState = applyToolInputToState(args.currentState, toolInput)
        const commitSpan = tracer.startSpan('rpc.commit_chat_turn', rootSpan.span_id)
        const commitResult = await commitChatTurnAtomic(args.supabase, {
          projectId: args.projectId,
          toolInput,
          model: MODEL,
          usage,
          latencyMs,
          beforeState: args.currentState,
          newState,
          clientRequestId: args.clientRequestId,
          plausibilityEvents:
            plausibility.warnings.length > 0 ? plausibility.warnings : null,
          traceId: tracer.trace_id,
        })
        if (!commitResult.ok) {
          commitSpan.setError(commitResult.error.message)
          commitSpan.end('error')
          tracer.setError(commitResult.error.code, commitResult.error.message)
          traceStatus = 'error'
          send({
            type: 'error',
            code: commitResult.error.code,
            message: commitResult.error.message,
            requestId: args.requestId,
          })
          controller.close()
          return
        }
        commitSpan.setAttributes({
          idempotency_replay: !!commitResult.replayed,
          plausibility_events_count: plausibility.warnings.length,
        })
        commitSpan.end()
        if (commitResult.replayed) traceStatus = 'idempotent_replay'

        // ── Final complete frame ───────────────────────────────────
        send({
          type: 'complete',
          assistantMessage: commitResult.row as unknown as AssistantMessageRow,
          projectState: newState,
          completionSignal: toolInput.completion_signal ?? 'continue',
          costInfo: {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            cacheReadTokens: usage.cacheReadTokens,
            cacheWriteTokens: usage.cacheWriteTokens,
            latencyMs,
            usdEstimate: estimateCostUsd(usage),
          },
          requestId: args.requestId,
        })
        controller.close()
      } catch (err) {
        // Ensure callSpan is closed if we threw before we could close it.
        // (.end() is idempotent.)
        callSpan.end('error')
        traceStatus = 'error'
        const errMsg = err instanceof Error ? err.message : String(err)
        tracer.setError(
          err instanceof UpstreamError ? `upstream_${err.code}` : 'streaming_failed',
          errMsg,
        )
        clearTimeout(timeoutId)
        if (err instanceof UpstreamError) {
          send({
            type: 'error',
            code:
              err.code === 'invalid_response'
                ? 'model_response_invalid'
                : err.code === 'timeout'
                  ? 'upstream_timeout'
                  : 'upstream_overloaded',
            message: err.message,
            ...(err.retryAfterMs ? { retryAfterMs: err.retryAfterMs } : {}),
            requestId: args.requestId,
          })
        } else if (abort.signal.aborted) {
          send({
            type: 'error',
            code: 'upstream_timeout',
            message: 'Streaming request timed out (50s)',
            requestId: args.requestId,
          })
        } else {
          send({
            type: 'error',
            code: 'internal',
            message: err instanceof Error ? err.message : String(err),
            requestId: args.requestId,
          })
        }
        controller.close()
      } finally {
        // ── Tracer finalize (Phase 9) ────────────────────────────
        // Always runs whether the stream completed normally, errored,
        // or was cancelled mid-flight. Wrapped in its own try/catch
        // because finalize() must not throw out of this handler.
        try {
          rootSpan.end(
            traceStatus === 'ok' || traceStatus === 'idempotent_replay'
              ? 'ok'
              : 'error',
          )
          await tracer.finalize(traceStatus)
        } catch (finalizeErr) {
          console.warn(
            `[chat-turn] [${args.requestId}] streaming tracer finalize threw`,
            finalizeErr,
          )
        }
      }
    },

    cancel() {
      // Client closed the stream early. Anthropic call already aborted
      // via the AbortController; persistence may have already happened
      // and the next mount will see the persisted assistant message.
      // Mark the trace as partial so the Live Stream can flag cancelled
      // turns separately from errors.
      if (traceStatus === 'ok') traceStatus = 'partial'
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

/** Detect whether the caller wants SSE (Phase 3.4) or JSON (legacy). */
export function acceptsStream(req: Request): boolean {
  const accept = req.headers.get('Accept') ?? ''
  return accept.includes('text/event-stream')
}
