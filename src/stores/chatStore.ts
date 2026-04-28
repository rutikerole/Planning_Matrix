import { create } from 'zustand'
import type { Specialist } from '@/types/projectState'
import type { PendingAttachment } from '@/types/chatInput'

/**
 * Phase 3.4 #52 — streaming bubble surfaced while Anthropic is emitting
 * the assistant's response. Replaces the ThinkingIndicator in the
 * thread for the duration of the stream. Cleared when persistence
 * completes and the persisted assistant message lands in the
 * react-query cache.
 */
export interface StreamingMessage {
  /** Synthetic id used as a render key. Different from the persisted UUID. */
  id: string
  specialist: Specialist | null
  /** User-visible text extracted from the model's tool input as it streams. */
  contentSoFar: string
  /** True after the final `complete` SSE frame lands. Cursor disappears. */
  isComplete: boolean
}

interface ChatState {
  /** True between SPA submit and Edge Function response. Drives ThinkingIndicator. */
  isAssistantThinking: boolean
  /** Whose voice is "currently speaking" — may lag DB by one turn during a handoff. */
  currentSpecialist: Specialist | null
  /** Whose voice spoke the previous turn. Drives match-cut transitions in #26. */
  previousSpecialist: Specialist | null
  /** Hint copy shown in ThinkingIndicator while the next turn is computed. */
  currentThinkingLabel: string | null
  /** Right-rail section the model hinted will update next (Polish Move 4 — wired in #26). */
  currentActivitySection:
    | 'top3'
    | 'areas'
    | 'facts'
    | 'procedures'
    | 'documents'
    | 'roles'
    | null
  /** Idempotency keys whose assistant turn failed — drives the Erneut senden affordance. */
  failedRequestIds: Set<string>
  /** Latest completion_signal from chat-turn (cleared on next user submit or dismiss). */
  lastCompletionSignal:
    | 'continue'
    | 'needs_designer'
    | 'ready_for_review'
    | 'blocked'
    | null
  /** Phase 3.4 #52 — streaming assistant bubble (null when no stream is in flight). */
  streamingMessage: StreamingMessage | null
  /** Phase 3.4 #53 — count of successful assistant turns this session.
   * Drives the progress meter algorithm. Resets on project unmount. */
  turnCount: number
  /** Phase 3.4 #59 — timestamp of the last successful turn. Drives the
   * Auto-saved indicator. Null until the first turn lands. */
  lastSavedAt: Date | null
  /** Phase 3.6 #67 — files staged in the input bar but not yet sent.
   * The store owns the array so chip removal + post-send clearing live
   * in one place; `useInputState` (the hook) wraps these for the
   * component layer. Wiring to Supabase Storage lands in #68. */
  pendingAttachments: PendingAttachment[]

  setThinking: (
    thinking: boolean,
    specialist?: Specialist | null,
    label?: string | null,
    activitySection?: ChatState['currentActivitySection'],
  ) => void
  promoteSpecialist: (next: Specialist | null) => void
  markFailed: (clientRequestId: string) => void
  clearFailed: (clientRequestId: string) => void
  setCompletionSignal: (signal: ChatState['lastCompletionSignal']) => void
  /** Phase 3.4 #52 — open a streaming bubble (called from useChatTurn.onMutate). */
  openStreamingMessage: (id: string, specialist: Specialist | null) => void
  /** Phase 3.4 #52 — append a text delta extracted from the model's JSON. */
  appendStreamingText: (delta: string) => void
  /** Phase 3.4 #52 — close the streaming bubble (after `complete` SSE frame). */
  closeStreamingMessage: () => void
  /** Phase 3.4 #53 — increment turnCount + stamp lastSavedAt on success. */
  noteSuccessfulTurn: () => void
  /** Phase 3.6 #67 — add a queued attachment row. */
  addAttachment: (attachment: PendingAttachment) => void
  /** Phase 3.6 #67 — patch a single attachment by id (status, errors, ids). */
  updateAttachment: (id: string, patch: Partial<PendingAttachment>) => void
  /** Phase 3.6 #67 — remove a chip pre-send. The Storage object cleanup
   * happens in #68's `useDeleteFile` mutation; the store just drops it. */
  removeAttachment: (id: string) => void
  /** Phase 3.6 #67 — empty the pending list (called after a successful send). */
  clearAttachments: () => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  isAssistantThinking: false,
  currentSpecialist: null,
  previousSpecialist: null,
  currentThinkingLabel: null,
  currentActivitySection: null,
  failedRequestIds: new Set(),
  lastCompletionSignal: null,
  streamingMessage: null,
  turnCount: 0,
  lastSavedAt: null,
  pendingAttachments: [],

  setThinking: (thinking, specialist, label, activitySection) =>
    set((s) => ({
      isAssistantThinking: thinking,
      currentSpecialist: specialist !== undefined ? specialist : s.currentSpecialist,
      currentThinkingLabel: label !== undefined ? label : s.currentThinkingLabel,
      currentActivitySection:
        activitySection !== undefined ? activitySection : s.currentActivitySection,
    })),
  promoteSpecialist: (next) =>
    set((s) => ({
      previousSpecialist: s.currentSpecialist,
      currentSpecialist: next,
    })),
  markFailed: (clientRequestId) =>
    set((s) => ({
      failedRequestIds: new Set([...s.failedRequestIds, clientRequestId]),
    })),
  clearFailed: (clientRequestId) =>
    set((s) => {
      const next = new Set(s.failedRequestIds)
      next.delete(clientRequestId)
      return { failedRequestIds: next }
    }),
  setCompletionSignal: (lastCompletionSignal) => set({ lastCompletionSignal }),

  openStreamingMessage: (id, specialist) =>
    set({
      streamingMessage: { id, specialist, contentSoFar: '', isComplete: false },
    }),
  appendStreamingText: (delta) =>
    set((s) =>
      s.streamingMessage
        ? {
            streamingMessage: {
              ...s.streamingMessage,
              contentSoFar: s.streamingMessage.contentSoFar + delta,
            },
          }
        : {},
    ),
  closeStreamingMessage: () => set({ streamingMessage: null }),

  noteSuccessfulTurn: () =>
    set((s) => ({ turnCount: s.turnCount + 1, lastSavedAt: new Date() })),

  addAttachment: (attachment) =>
    set((s) => ({ pendingAttachments: [...s.pendingAttachments, attachment] })),
  updateAttachment: (id, patch) =>
    set((s) => ({
      pendingAttachments: s.pendingAttachments.map((a) =>
        a.id === id ? { ...a, ...patch } : a,
      ),
    })),
  removeAttachment: (id) =>
    set((s) => {
      const target = s.pendingAttachments.find((a) => a.id === id)
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl)
        } catch {
          /* defensive — preview URL may already be revoked */
        }
      }
      return {
        pendingAttachments: s.pendingAttachments.filter((a) => a.id !== id),
      }
    }),
  clearAttachments: () =>
    set((s) => {
      for (const a of s.pendingAttachments) {
        if (a.previewUrl) {
          try {
            URL.revokeObjectURL(a.previewUrl)
          } catch {
            /* defensive */
          }
        }
      }
      return { pendingAttachments: [] }
    }),

  reset: () =>
    set((s) => {
      // Revoke any object URLs the previous project staged so we don't
      // leak blobs across project switches.
      for (const a of s.pendingAttachments) {
        if (a.previewUrl) {
          try {
            URL.revokeObjectURL(a.previewUrl)
          } catch {
            /* defensive */
          }
        }
      }
      return {
        isAssistantThinking: false,
        currentSpecialist: null,
        previousSpecialist: null,
        currentThinkingLabel: null,
        currentActivitySection: null,
        failedRequestIds: new Set(),
        lastCompletionSignal: null,
        streamingMessage: null,
        turnCount: 0,
        lastSavedAt: null,
        pendingAttachments: [],
      }
    }),
}))
