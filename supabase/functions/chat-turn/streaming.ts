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
import { applyToolInputToState } from '../../../src/lib/projectStateHelpers.ts'
import {
  respondToolInputSchema,
  type RespondToolInput,
} from '../../../src/types/respondTool.ts'
import type { ProjectState } from '../../../src/types/projectState.ts'
import type { AssistantMessageRow } from '../../../src/types/chatTurn.ts'

const MAX_TOKENS = 1280
const ABORT_TIMEOUT_MS = 50_000

interface StreamingTurnArgs {
  apiKey: string
  systemBlocks: ReturnType<typeof buildSystemBlocks>
  messages: { role: 'user' | 'assistant'; content: string }[]
  supabase: SupabaseClient
  projectId: string
  currentState: ProjectState
  corsHeaders: Record<string, string>
  requestId: string
  /** Phase 8.6 (B.3) — propagated to commit_chat_turn for replay
   *  detection. */
  clientRequestId: string
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
  const { corsHeaders } = args

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
          throw new UpstreamError(
            'invalid_response',
            null,
            'Streaming: no tool_use block in final message',
          )
        }
        const parsed = respondToolInputSchema.safeParse(toolUse.input)
        if (!parsed.success) {
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

        // ── Phase 8.6 (D.4) — fact-plausibility validation ─────────
        // Same logic as the JSON path in index.ts: downgrades
        // out-of-bounds qualifiers to ASSUMED before
        // applyToolInputToState reads the toolInput, and surfaces
        // warnings via plausibilityEvents inside the same transaction.
        const plausibility = validateFactPlausibility(toolInput)
        if (plausibility.downgraded > 0) {
          console.log(
            `[chat-turn] [${args.requestId}] plausibility (streaming): ${plausibility.downgraded} fact(s) downgraded to ASSUMED`,
          )
        }

        // ── Persistence pipeline ───────────────────────────────────
        // Phase 8.6 (B.3 + D.4) — single transactional commit replaces
        // the sequential insertAssistantMessage + updateProjectState +
        // logTurnEvent trio AND carries plausibility warnings into the
        // same transaction.
        const newState = applyToolInputToState(args.currentState, toolInput)

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
        })
        if (!commitResult.ok) {
          send({
            type: 'error',
            code: commitResult.error.code,
            message: commitResult.error.message,
            requestId: args.requestId,
          })
          controller.close()
          return
        }

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
      }
    },

    cancel() {
      // Client closed the stream early. Anthropic call already aborted
      // via the AbortController; persistence may have already happened
      // and the next mount will see the persisted assistant message.
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
