import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  postChatTurn,
  postChatTurnStreaming,
  ChatTurnError,
} from '@/lib/chatApi'
import { useChatStore } from '@/stores/chatStore'
import { thinkingLabelToSection } from '../lib/thinkingLabelToSection'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ChatTurnRequest, ChatTurnResponse, UserAnswer } from '@/types/chatTurn'
import type { Specialist } from '@/types/projectState'

interface SubmitInput {
  userMessage: string
  userAnswer: UserAnswer
  clientRequestId?: string
}

/**
 * The conversation loop. Optimistic user message + thinking indicator
 * while the Edge Function processes the turn. Idempotent retries via
 * stable clientRequestId (passed from caller or generated). Error
 * surfaces as Erneut-senden affordance below the failed user message
 * (chatStore.failedRequestIds drives the UI in MessageUser).
 *
 * Phase 3.4 #52: prefers streaming. The Edge Function emits SSE frames
 * carrying tool-input JSON deltas; the client extracts the user-visible
 * text progressively and pushes it into chatStore.streamingMessage.
 * On any streaming-side failure, falls back to a single non-streaming
 * retry with the same clientRequestId — idempotency on the server
 * dedupes the user-message insert.
 */
export function useChatTurn(projectId: string) {
  const queryClient = useQueryClient()
  const { i18n } = useTranslation()
  const setThinking = useChatStore((s) => s.setThinking)
  const promoteSpecialist = useChatStore((s) => s.promoteSpecialist)
  const markFailed = useChatStore((s) => s.markFailed)
  const clearFailed = useChatStore((s) => s.clearFailed)
  const setCompletionSignal = useChatStore((s) => s.setCompletionSignal)
  const openStreamingMessage = useChatStore((s) => s.openStreamingMessage)
  const appendStreamingText = useChatStore((s) => s.appendStreamingText)
  const closeStreamingMessage = useChatStore((s) => s.closeStreamingMessage)
  const noteSuccessfulTurn = useChatStore((s) => s.noteSuccessfulTurn)

  return useMutation({
    mutationKey: ['chat-turn', projectId],
    retry: 0,

    mutationFn: async (input: SubmitInput) => {
      const clientRequestId = input.clientRequestId ?? crypto.randomUUID()
      const request: ChatTurnRequest = {
        projectId,
        userMessage: input.userMessage,
        userAnswer: input.userAnswer,
        clientRequestId,
      }
      const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
      const lastAssistant = mostRecentAssistant(
        queryClient.getQueryData<MessageRow[]>(['messages', projectId]) ?? [],
      )
      const seedSpecialist = (lastAssistant?.specialist ?? 'moderator') as Specialist

      // Open the streaming bubble immediately. ThinkingIndicator hides
      // when streamingMessage is non-null (Thread.tsx swap).
      const streamingId = `streaming-${clientRequestId}`
      openStreamingMessage(streamingId, seedSpecialist)

      const response = await new Promise<
        Extract<ChatTurnResponse, { ok: true }>
      >((resolve, reject) => {
        let textArrived = false
        let resolved = false

        postChatTurnStreaming(request, lang, {
          onTextDelta: (delta) => {
            textArrived = true
            appendStreamingText(delta)
          },
          onComplete: (env) => {
            if (resolved) return
            resolved = true
            resolve(env)
          },
          onError: async (err) => {
            if (resolved) return
            resolved = true
            // If the stream failed mid-way after some text had already
            // arrived, the user has seen partial content — falling back
            // to non-streaming would yield a duplicate render. Bubble
            // the error so the SPA shows the Erneut-senden affordance.
            // If no text arrived (i.e. the streaming endpoint failed
            // before any progress), fall back to one non-streaming
            // retry — idempotency on the server makes this safe.
            if (textArrived) {
              reject(err)
              return
            }
            try {
              const fallback = await postChatTurn(request)
              resolve(fallback)
            } catch (fallbackErr) {
              reject(fallbackErr)
            }
          },
        }).catch(reject)
      })

      return {
        response,
        clientRequestId,
        optimisticUserMessage: input.userMessage,
        optimisticUserAnswer: input.userAnswer,
      }
    },

    onMutate: (input) => {
      const clientRequestId = input.clientRequestId ?? crypto.randomUUID()

      const previousMessages =
        queryClient.getQueryData<MessageRow[]>(['messages', projectId]) ?? []

      const placeholder: MessageRow = {
        id: `pending-${clientRequestId}`,
        project_id: projectId,
        role: 'user',
        specialist: null,
        content_de: input.userMessage,
        content_en: null,
        input_type: null,
        input_options: null,
        allow_idk: null,
        thinking_label_de: null,
        likely_user_replies: null,
        user_answer: input.userAnswer,
        client_request_id: clientRequestId,
        model: null,
        input_tokens: null,
        output_tokens: null,
        cache_read_tokens: null,
        cache_write_tokens: null,
        latency_ms: null,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<MessageRow[]>(
        ['messages', projectId],
        [...previousMessages, placeholder],
      )

      const lastAssistant = mostRecentAssistant(previousMessages)
      const seedSpecialist = (lastAssistant?.specialist ?? 'moderator') as Specialist
      const seedLabel = lastAssistant?.thinking_label_de ?? null

      const heuristicSource =
        seedLabel ?? (lastAssistant?.content_de ?? '') + ' ' + input.userMessage
      const activitySection = thinkingLabelToSection(heuristicSource)

      setThinking(true, seedSpecialist, seedLabel, activitySection)

      clearFailed(clientRequestId)
      setCompletionSignal(null)
      return { previousMessages, clientRequestId }
    },

    onSuccess: ({ response, clientRequestId }) => {
      // Append the persisted assistant message to cache.
      const current =
        queryClient.getQueryData<MessageRow[]>(['messages', projectId]) ?? []
      queryClient.setQueryData<MessageRow[]>(
        ['messages', projectId],
        [...current, response.assistantMessage as unknown as MessageRow],
      )

      queryClient.setQueryData<ProjectRow | null | undefined>(
        ['project', projectId],
        (old) =>
          old
            ? { ...old, state: response.projectState, updated_at: new Date().toISOString() }
            : old,
      )

      promoteSpecialist(response.assistantMessage.specialist as Specialist)
      setThinking(false, undefined, null, null)
      // Close the streaming bubble — the persisted message takes over.
      closeStreamingMessage()
      noteSuccessfulTurn()
      clearFailed(clientRequestId)

      const signal = response.completionSignal
      if (signal && signal !== 'continue') {
        setCompletionSignal(signal)
      } else {
        setCompletionSignal(null)
      }
    },

    onError: (err, _input, context) => {
      const clientRequestId = context?.clientRequestId
      if (clientRequestId) markFailed(clientRequestId)
      setThinking(false, undefined, null, null)
      closeStreamingMessage()

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('[chat-turn] mutation error', err)
        if (err instanceof ChatTurnError) {
          // eslint-disable-next-line no-console
          console.info('[chat-turn] error detail', {
            code: err.code,
            httpStatus: err.httpStatus,
            requestId: err.requestId,
            retryAfterMs: err.retryAfterMs,
          })
        }
      }
    },
  })
}

function mostRecentAssistant(messages: MessageRow[]): MessageRow | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') return messages[i]
  }
  return undefined
}
