import { create } from 'zustand'
import type { Specialist } from '@/types/projectState'

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
  reset: () =>
    set({
      isAssistantThinking: false,
      currentSpecialist: null,
      previousSpecialist: null,
      currentThinkingLabel: null,
      currentActivitySection: null,
      failedRequestIds: new Set(),
      lastCompletionSignal: null,
    }),
}))
