// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #67 — useInputState
//
// The persistent input bar holds three orthogonal slots in sync:
//   • textarea contents       (component-local — useState)
//   • pending attachments     (chatStore — survives focus changes)
//   • active suggestion chip  (component-local — useState)
//
// `applySuggestion` is the contract between SuggestionChips (a chip
// click) and the textarea. It honours Q1: when the textarea already
// has text, we APPEND the chip's text on a new line rather than
// replacing it. The Bauherr typing a clarifying note shouldn't lose
// it because they tapped a structured chip.
// ───────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type PendingAttachment,
  type SuggestionId,
  suggestionToText,
  suggestionToTextDe,
  suggestionToTextEn,
  suggestionToUserAnswer,
} from '@/types/chatInput'
import type { UserAnswer } from '@/types/chatTurn'
import { useChatStore } from '@/stores/chatStore'

export interface InputSubmitPayload {
  userMessage: string
  /** English mirror of userMessage (Phase 6.1). */
  userMessageEn?: string
  userAnswer: UserAnswer
  attachmentIds: string[]
}

export interface UseInputStateReturn {
  /** Textarea contents. */
  text: string
  setText: (next: string) => void
  /** Currently-selected chip (or null). */
  activeSuggestion: SuggestionId | null
  /** Apply a chip click — fills the textarea + records the suggestion. */
  applySuggestion: (s: SuggestionId) => void
  /** Clear an active suggestion without changing the textarea. */
  clearSuggestion: () => void
  /** Pending attachment chips (lifted from the store for convenience). */
  attachments: PendingAttachment[]
  /** True when the user has nothing to send. */
  isEmpty: boolean
  /** Build the submit payload + clear local state. Caller dispatches. */
  buildSubmitAndClear: () => InputSubmitPayload | null
}

/**
 * Wraps text + attachments + active-suggestion. The hook is component-
 * scoped — one InputBar instance per project — but reads attachments
 * from the global chatStore so the upload mutation in #68 can drive
 * status transitions without prop-drilling.
 */
export function useInputState(): UseInputStateReturn {
  const { i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const [text, setText] = useState('')
  const [activeSuggestion, setActiveSuggestion] = useState<SuggestionId | null>(
    null,
  )

  const attachments = useChatStore((s) => s.pendingAttachments)
  const clearAttachments = useChatStore((s) => s.clearAttachments)

  const applySuggestion = useCallback(
    (s: SuggestionId) => {
      const chipText = suggestionToText(s, lang)
      setText((prev) => {
        const trimmed = prev.trimEnd()
        if (!trimmed) return chipText
        // Q1 default — append on a new line so the user's typed note
        // survives the chip click. They can still edit before send.
        return `${trimmed}\n${chipText}`
      })
      setActiveSuggestion(s)
    },
    [lang],
  )

  const clearSuggestion = useCallback(() => setActiveSuggestion(null), [])

  // Only `'uploaded'` attachments get sent — queued or in-flight rows
  // would arrive with no storage row yet. #68 enforces this; here we
  // just compute the count for `isEmpty`.
  const sendableAttachmentCount = attachments.filter(
    (a) => a.status === 'uploaded',
  ).length

  const isEmpty =
    text.trim().length === 0 &&
    sendableAttachmentCount === 0 &&
    activeSuggestion === null

  const buildSubmitAndClear = useCallback((): InputSubmitPayload | null => {
    const trimmed = text.trim()
    const sendable = attachments.filter((a) => a.status === 'uploaded')

    // Determine the userAnswer + userMessage to forward to chat-turn.
    let userAnswer: UserAnswer
    let userMessage: string
    let userMessageEn: string | undefined

    if (activeSuggestion && trimmed === suggestionToText(activeSuggestion, lang)) {
      // The user clicked a chip and didn't edit. Forward the structured
      // answer; userMessage stores the German rendering for the model
      // and userMessageEn the English rendering for EN-locale display.
      userAnswer = suggestionToUserAnswer(activeSuggestion, trimmed)
      userMessage = suggestionToTextDe(activeSuggestion)
      userMessageEn = suggestionToTextEn(activeSuggestion)
    } else if (activeSuggestion && trimmed.length > 0) {
      // The user clicked a chip AND typed/edited around it. Send the
      // structured signal but let the model see the full free-text.
      userAnswer = suggestionToUserAnswer(activeSuggestion, trimmed)
      userMessage = trimmed
      userMessageEn = trimmed
    } else if (trimmed.length === 0 && sendable.length > 0) {
      // Attachment-only: synthesise the body so chat-turn doesn't reject
      // an empty message. Always store DE for the model; mirror EN.
      userAnswer = { kind: 'text', text: '(Datei angehängt)' }
      userMessage = '(Datei angehängt)'
      userMessageEn = '(File attached)'
    } else if (trimmed.length === 0) {
      // Should be filtered by `isEmpty`; defensive.
      return null
    } else {
      userAnswer = { kind: 'text', text: trimmed }
      userMessage = trimmed
      userMessageEn = trimmed
    }

    const attachmentIds = sendable
      .map((a) => a.fileRowId)
      .filter((id): id is string => id !== null)

    // Reset local + store state so the next turn starts clean.
    setText('')
    setActiveSuggestion(null)
    clearAttachments()

    return { userMessage, userMessageEn, userAnswer, attachmentIds }
  }, [text, attachments, activeSuggestion, lang, clearAttachments])

  return {
    text,
    setText,
    activeSuggestion,
    applySuggestion,
    clearSuggestion,
    attachments,
    isEmpty,
    buildSubmitAndClear,
  }
}
