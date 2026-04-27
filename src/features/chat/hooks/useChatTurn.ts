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

      // Find the most recent assistant message; its specialist + thinking_label
      // become the seed for the indicator while the new turn computes.
      const lastAssistant = [...previousMessages]
        .reverse()
        .find((m) => m.role === 'assistant')
      const seedSpecialist = (lastAssistant?.specialist ?? 'moderator') as Specialist

      // Polish Move 4 — derive the right-rail section likely to update
      // from the previous assistant turn's content + the user's input.
      // Heuristic; falls back to top3 on a miss.
      const heuristicSource =
        (lastAssistant?.content_de ?? '') + ' ' + input.userMessage
      const activitySection = thinkingLabelToSection(heuristicSource)

      // input_options of the assistant doesn't carry thinking_label (we
      // don't persist that). Use a generic "Das Team berät sich." until
      // the rotating-label loop in ThinkingIndicator takes over after 6s.
      setThinking(true, seedSpecialist, null, activitySection)

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

      // Surface completion_signal — interstitial in Thread renders if
      // the value is non-null and non-'continue'. Cleared on next user
      // submit (onMutate) and on store reset (project unmount).
      const signal =
        (response.projectState as { lastCompletionSignal?: string })
          .lastCompletionSignal ??
        // The Edge Function persists completion_signal in projects.state
        // only inside project_events; the response's assistantMessage
        // doesn't carry it. Fall through to chat-turn's projectState
        // hint below if we ever extend it; for now we read from a
        // server-injected field on the response if present.
        null
      // Pull from the chat-turn response envelope when the Edge Function
      // exposes it (it currently does not — we'd need an extension).
      // For v1, we approximate: any state shift that changes lastTurnAt
      // without a new assistant question implies "ready_for_review".
      if (signal === 'needs_designer' || signal === 'ready_for_review' || signal === 'blocked') {
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
