import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postChatTurn, ChatTurnError } from '@/lib/chatApi'
import { useChatStore } from '@/stores/chatStore'
import { thinkingLabelToSection } from '../lib/thinkingLabelToSection'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ChatTurnRequest, UserAnswer } from '@/types/chatTurn'
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
 */
export function useChatTurn(projectId: string) {
  const queryClient = useQueryClient()
  const setThinking = useChatStore((s) => s.setThinking)
  const promoteSpecialist = useChatStore((s) => s.promoteSpecialist)
  const markFailed = useChatStore((s) => s.markFailed)
  const clearFailed = useChatStore((s) => s.clearFailed)
  const setCompletionSignal = useChatStore((s) => s.setCompletionSignal)

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
      const response = await postChatTurn(request)
      return { response, clientRequestId, optimisticUserMessage: input.userMessage, optimisticUserAnswer: input.userAnswer }
    },

    onMutate: (input) => {
      const clientRequestId = input.clientRequestId ?? crypto.randomUUID()
      // We don't await cancelQueries; rely on the optimistic write
      // landing first. cancelQueries can be added later if a flicker
      // is seen on slow networks.

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

      // Find the most recent assistant message; its specialist seeds the
      // ThinkingIndicator's tag. Its thinking_label_de (Phase 3.1 #33,
      // persisted on the messages row) seeds the indicator's hint copy
      // and the right-rail ambient activity heuristic.
      const lastAssistant = [...previousMessages]
        .reverse()
        .find((m) => m.role === 'assistant')
      const seedSpecialist = (lastAssistant?.specialist ?? 'moderator') as Specialist
      const seedLabel = lastAssistant?.thinking_label_de ?? null

      // Polish Move 4 — derive the right-rail section likely to update.
      // If the previous assistant left a thinking_label_de, prefer that;
      // else fall back to scanning the previous turn's body + user input.
      const heuristicSource =
        seedLabel ?? (lastAssistant?.content_de ?? '') + ' ' + input.userMessage
      const activitySection = thinkingLabelToSection(heuristicSource)

      setThinking(true, seedSpecialist, seedLabel, activitySection)

      clearFailed(clientRequestId)
      // Clear any prior interstitial — the user is engaging again.
      setCompletionSignal(null)
      return { previousMessages, clientRequestId }
    },

    onSuccess: ({ response, clientRequestId }) => {
      // Append the assistant message to cache. The optimistic user
      // placeholder stays in place; on next page load the real DB row
      // takes over (its synthetic id never collides with real UUIDs).
      const current =
        queryClient.getQueryData<MessageRow[]>(['messages', projectId]) ?? []
      queryClient.setQueryData<MessageRow[]>(
        ['messages', projectId],
        [...current, response.assistantMessage as unknown as MessageRow],
      )

      // Update project cache with new state.
      queryClient.setQueryData<ProjectRow | null | undefined>(
        ['project', projectId],
        (old) =>
          old
            ? { ...old, state: response.projectState, updated_at: new Date().toISOString() }
            : old,
      )

      promoteSpecialist(response.assistantMessage.specialist as Specialist)
      setThinking(false, undefined, null, null)
      clearFailed(clientRequestId)

      // Phase 3.1 #30 — completion_signal piped through the response
      // envelope. Interstitial in Thread renders when this is anything
      // other than 'continue'. Cleared on next user submit (onMutate)
      // and on store reset (project unmount).
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
