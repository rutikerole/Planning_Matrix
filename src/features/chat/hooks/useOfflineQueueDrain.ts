import { useEffect, useRef } from 'react'
import type { useChatTurn } from './useChatTurn'
import { useChatStore } from '@/stores/chatStore'

/**
 * Phase 5 — drain the offline queue when the SPA reconnects.
 *
 * Mounted once inside <ChatWorkspacePage />. While the user is offline,
 * `useChatTurn` parks turns in `chatStore.offlineQueue` instead of
 * hitting the network. This hook listens for the `online` event and
 * replays each parked turn for the active project in FIFO order.
 *
 * Idempotency on the server (the `messages_idempotency_idx` partial
 * unique index on `(project_id, client_request_id)`) makes the replay
 * safe — even if connectivity is flapping during the drain, the same
 * clientRequestId will collapse to a single user-message row.
 *
 * Caveat: this hook does NOT batch — each queued turn fires its own
 * mutation, with the model thinking between them. That's deliberate;
 * the conversation arc would otherwise become incoherent.
 */
export function useOfflineQueueDrain(
  projectId: string,
  chatTurn: ReturnType<typeof useChatTurn>,
) {
  const drainingRef = useRef(false)
  // useMutation returns a new object on every render, so depending on
  // `chatTurn` directly would re-add the `online` listener on every
  // re-render of ChatWorkspacePage. Pin it via a ref synced in a
  // post-render effect — React's recommended pattern for "I want an
  // effect that runs once per project but always uses the latest
  // value of a fast-changing prop." (Mutating the ref inline during
  // render trips react-hooks/refs.)
  const chatTurnRef = useRef(chatTurn)
  useEffect(() => {
    chatTurnRef.current = chatTurn
  })

  useEffect(() => {
    const drain = async () => {
      if (drainingRef.current) return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return

      const queue = useChatStore.getState().offlineQueue
      const forThis = queue.filter((e) => e.projectId === projectId)
      if (forThis.length === 0) return

      drainingRef.current = true
      try {
        for (const entry of forThis) {
          // mutateAsync is the async-throwing variant of mutate; we
          // need it because we want to await between turns so the
          // conversation stays in order.
          try {
            await chatTurnRef.current.mutateAsync({
              userMessage: entry.userMessage,
              userAnswer: entry.userAnswer,
              attachmentIds: entry.attachmentIds,
              clientRequestId: entry.clientRequestId,
            })
            // Successful drain — remove from queue. (A failed drain
            // leaves the entry in the queue and the next online event
            // will retry; this matches the "idempotency makes retries
            // safe" contract above.)
            useChatStore.getState().removeFromOfflineQueue(entry.clientRequestId)
          } catch {
            // Stop the drain on the first failure; the queue is FIFO
            // and we don't want to skip ahead to a later entry that
            // depends on this one's assistant response. The next
            // `online` event will re-attempt.
            break
          }
        }
      } finally {
        drainingRef.current = false
      }
    }

    // Drain immediately on mount in case we came back online while
    // the page was elsewhere (or never went offline at all but the
    // queue has a leftover from an earlier mount).
    void drain()

    const handler = () => {
      void drain()
    }
    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
  }, [projectId])
}
