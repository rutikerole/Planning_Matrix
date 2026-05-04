import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  postChatTurn,
  postChatTurnStreaming,
  ChatTurnError,
} from '@/lib/chatApi'
import {
  fetchPersistedUserMessageId,
  linkFilesToMessage,
} from '@/lib/uploadApi'
import { useChatStore, OFFLINE_QUEUE_CAP } from '@/stores/chatStore'
import { thinkingLabelToSection } from '../lib/thinkingLabelToSection'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ChatTurnRequest, ChatTurnResponse, UserAnswer } from '@/types/chatTurn'
import type { Specialist } from '@/types/projectState'

/**
 * Phase 5 — sentinel value returned by mutationFn when the SPA is
 * offline at submit time. The turn is parked in the offline queue
 * (see chatStore.enqueueOffline). onSuccess detects the sentinel and
 * leaves the optimistic placeholder in place rather than appending a
 * (non-existent) assistant response. The queued turn is replayed by
 * useOfflineQueueDrain when the `online` event fires.
 */
type ChatTurnSettled =
  | {
      kind: 'sent'
      response: Extract<ChatTurnResponse, { ok: true }>
      clientRequestId: string
      optimisticUserMessage: string
      optimisticUserAnswer: UserAnswer
      attachmentIds: string[]
    }
  | { kind: 'queued'; clientRequestId: string }

interface SubmitInput {
  userMessage: string
  /** Phase 6.1 — English mirror of userMessage (rendered when EN locale). */
  userMessageEn?: string
  userAnswer: UserAnswer
  clientRequestId?: string
  /** Phase 3.6 #68 — project_files row ids to bind to the persisted
   * user message after chat-turn returns. */
  attachmentIds?: string[]
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
  const setAbortController = useChatStore((s) => s.setAbortController)
  const setRateLimit = useChatStore((s) => s.setRateLimit)
  const setLastError = useChatStore((s) => s.setLastError)
  const enqueueOffline = useChatStore((s) => s.enqueueOffline)

  return useMutation<
    ChatTurnSettled,
    unknown,
    SubmitInput,
    { previousMessages: MessageRow[]; clientRequestId: string }
  >({
    mutationKey: ['chat-turn', projectId],
    retry: 0,

    mutationFn: async (input: SubmitInput): Promise<ChatTurnSettled> => {
      const clientRequestId = input.clientRequestId ?? crypto.randomUUID()
      const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

      // Phase 5 — offline guard. When navigator reports offline, park
      // the turn in the queue and resolve with a `queued` sentinel so
      // onSuccess can keep the optimistic user-bubble in place without
      // pretending an assistant response arrived. The drain hook will
      // replay this with the same clientRequestId when connectivity
      // returns; idempotency on the messages partial unique index
      // makes the replay safe.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const accepted = enqueueOffline({
          clientRequestId,
          projectId,
          userMessage: input.userMessage,
          userMessageEn: input.userMessageEn,
          userAnswer: input.userAnswer,
          attachmentIds: input.attachmentIds ?? [],
          queuedAt: new Date().toISOString(),
        })
        if (!accepted) {
          throw new Error(
            `Offline-Warteschlange voll (max. ${OFFLINE_QUEUE_CAP}). Bitte stellen Sie die Verbindung wieder her.`,
          )
        }
        return { kind: 'queued', clientRequestId }
      }
      const request: ChatTurnRequest = {
        projectId,
        userMessage: input.userMessage,
        userMessageEn: input.userMessageEn ?? null,
        userAnswer: input.userAnswer,
        clientRequestId,
        // Phase 3.7 #79 — tell the Edge Function which locale the user
        // is in so the system prompt can adapt. Q4 locked: forwarded on
        // every turn, including first-turn priming.
        locale: lang,
      }
      const lastAssistant = mostRecentAssistant(
        queryClient.getQueryData<MessageRow[]>(['messages', projectId]) ?? [],
      )
      const seedSpecialist = (lastAssistant?.specialist ?? 'moderator') as Specialist

      // Phase 3.7 #76 — register an AbortController so SendButton's
      // stop affordance can interrupt the in-flight stream.
      const abortController = new AbortController()
      setAbortController(abortController)

      // Open the streaming bubble immediately. ThinkingIndicator hides
      // when streamingMessage is non-null (Thread.tsx swap).
      const streamingId = `streaming-${clientRequestId}`
      openStreamingMessage(streamingId, seedSpecialist)

      const response = await new Promise<
        Extract<ChatTurnResponse, { ok: true }>
      >((resolve, reject) => {
        let textArrived = false
        let resolved = false

        postChatTurnStreaming(
          request,
          lang,
          {
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
              if (textArrived) {
                reject(err)
                return
              }
              try {
                const fallback = await postChatTurn(request, abortController.signal)
                resolve(fallback)
              } catch (fallbackErr) {
                reject(fallbackErr)
              }
            },
          },
          abortController.signal,
        ).catch(reject)
      })

      return {
        kind: 'sent',
        response,
        clientRequestId,
        optimisticUserMessage: input.userMessage,
        optimisticUserAnswer: input.userAnswer,
        attachmentIds: input.attachmentIds ?? [],
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
        content_en: input.userMessageEn ?? null,
        input_type: null,
        input_options: null,
        allow_idk: null,
        thinking_label_de: null,
        likely_user_replies: null,
        tool_input: null,
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
      // Phase 6.1 — locale-correct thinking label. EN mirror lives in
      // tool_input (no DB column), with DE as the always-present fallback.
      const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
      const labelDe = lastAssistant?.thinking_label_de ?? null
      const labelEn =
        (lastAssistant?.tool_input as { thinking_label_en?: string } | null)
          ?.thinking_label_en ?? null
      const seedLabel = lang === 'en' ? labelEn ?? labelDe : labelDe ?? labelEn

      const heuristicSource =
        (lastAssistant?.thinking_label_de ?? '') +
        ' ' +
        (lastAssistant?.content_de ?? '') +
        ' ' +
        input.userMessage
      const activitySection = thinkingLabelToSection(heuristicSource)

      setThinking(true, seedSpecialist, seedLabel, activitySection)

      clearFailed(clientRequestId)
      setCompletionSignal(null)
      return { previousMessages, clientRequestId }
    },

    onSuccess: (settled) => {
      // Phase 5 — offline-queued turn. Leave the optimistic placeholder
      // visible (so the user sees their message) and STOP — no
      // assistant message exists yet, no thinking-indicator finalisation
      // is needed. The drain hook will replay this turn when online.
      if (settled.kind === 'queued') {
        // Just stop the thinking indicator; the placeholder stays.
        setThinking(false, undefined, null, null)
        closeStreamingMessage()
        setAbortController(null)
        return
      }

      const { response, clientRequestId, attachmentIds } = settled

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
      setAbortController(null)
      noteSuccessfulTurn()
      clearFailed(clientRequestId)
      // Phase 4.1 #125 — clear any prior rate-limit banner once a turn
      // succeeds (either the bucket rolled over or the user waited).
      setRateLimit(null)
      // Phase 3 — clear any prior error banner on success.
      setLastError(null)

      const signal = response.completionSignal
      if (signal && signal !== 'continue') {
        setCompletionSignal(signal)
      } else {
        setCompletionSignal(null)
      }

      // Phase 3.6 #68 — bind uploaded files to the persisted user
      // message. Done out-of-band: chat-turn doesn't return the user
      // message id, so we look it up by client_request_id then update
      // each project_files.message_id. Best-effort; failures are logged
      // in DEV but don't break the turn.
      if (attachmentIds.length > 0) {
        void (async () => {
          const userMsgId = await fetchPersistedUserMessageId({
            projectId,
            clientRequestId,
          })
          if (!userMsgId) return
          await linkFilesToMessage({
            fileIds: attachmentIds,
            messageId: userMsgId,
          })
          // Invalidate the project-level attachments cache so every
          // MessageAttachment in the thread sees the now-linked rows.
          // Phase 4.1.9 — was previously keyed `['messageAttachments',
          // userMsgId]` to match the per-message fetch; that fetch is
          // gone (batched into useProjectAttachments).
          queryClient.invalidateQueries({
            queryKey: ['projectAttachments', projectId],
          })
        })()
      }
    },

    onError: (err, _input, context) => {
      const clientRequestId = context?.clientRequestId
      if (clientRequestId) markFailed(clientRequestId)
      setThinking(false, undefined, null, null)
      closeStreamingMessage()
      setAbortController(null)

      // Phase 4.1 #125 — surface rate-limit envelopes to the UI banner.
      if (
        err instanceof ChatTurnError &&
        err.code === 'rate_limit_exceeded' &&
        err.rateLimit
      ) {
        setRateLimit(err.rateLimit)
      } else if (err instanceof ChatTurnError) {
        // Phase 3 — every other ChatTurnError code routes to the new
        // ErrorBanner via chatStore.lastError. The banner looks up
        // chat.errors.<code>.title / .body i18n keys; unknown codes
        // fall through to a generic copy inside the banner itself.
        setLastError({ code: err.code })
      }

      if (import.meta.env.DEV) {
        console.error('[chat-turn] mutation error', err)
        if (err instanceof ChatTurnError) {
          console.info('[chat-turn] error detail', {
            code: err.code,
            httpStatus: err.httpStatus,
            requestId: err.requestId,
            retryAfterMs: err.retryAfterMs,
            rateLimit: err.rateLimit,
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
