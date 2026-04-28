// ───────────────────────────────────────────────────────────────────────
// Planning Matrix — chat input types (Phase 3.6)
//
// The persistent input bar holds three orthogonal slots: free text,
// pending attachments (queued / uploading / uploaded), and an active
// suggestion (the structured chip the user picked above the textarea).
// All three travel together through `useInputState` and merge into the
// existing chat-turn payload at submit time.
//
// File-upload wiring lands in commit #68; #67 ships the types + chip
// surface so the layout + state machine are testable from day one.
// ───────────────────────────────────────────────────────────────────────

import type { UserAnswer } from './chatTurn'

/**
 * A file the user has staged in the input bar but not yet sent. The
 * upload may complete before send (`status: 'uploaded'`), still be in
 * flight (`'uploading'`), errored (`'failed'`), or queued before any
 * upload begins (`'queued'`). On send, only `'uploaded'` rows are
 * forwarded to the model via `messages.attachment_ids` (#68).
 */
export type AttachmentStatus =
  | 'queued'
  | 'uploading'
  | 'uploaded'
  | 'failed'

/**
 * Categories the model maps onto the document checklist. `other` is
 * the safe default; the user may re-categorize from the chip after
 * upload.
 */
export type FileCategory =
  | 'plot_plan'
  | 'building_plan'
  | 'b_plan'
  | 'photo'
  | 'grundbuch'
  | 'energy_certificate'
  | 'other'

export interface PendingAttachment {
  /** Client-only id (crypto.randomUUID). Different from `fileRowId`. */
  id: string
  file: File
  /** Object URL for image preview — null for non-image types. */
  previewUrl: string | null
  status: AttachmentStatus
  /** Set after #68's upload completes. */
  storagePath: string | null
  /** `project_files.id` — set after the row is inserted. */
  fileRowId: string | null
  category: FileCategory
  errorMessage: string | null
}

/**
 * The structured chip the user clicked above the textarea. Translates
 * to a `UserAnswer` at submit time. `null` means the user is going to
 * send free text.
 */
export type SuggestionId =
  | { kind: 'yesno'; value: 'ja' | 'nein' }
  | {
      kind: 'single_select'
      value: string
      label_de: string
      label_en: string
    }
  | {
      kind: 'multi_select'
      values: Array<{ value: string; label_de: string; label_en: string }>
    }
  | { kind: 'address'; text: string }
  | { kind: 'reply'; text: string }
  | { kind: 'continue' }

/**
 * Resolves a chip click into the text the chip should drop into the
 * textarea. Used by `useInputState.applySuggestion` so the chip ↔
 * textarea contract is one place. Locale-aware for select chips.
 */
export function suggestionToText(s: SuggestionId, lang: 'de' | 'en'): string {
  switch (s.kind) {
    case 'yesno':
      return s.value === 'ja' ? (lang === 'en' ? 'Yes.' : 'Ja.') : lang === 'en' ? 'No.' : 'Nein.'
    case 'single_select':
      return lang === 'en' ? s.label_en : s.label_de
    case 'multi_select':
      return s.values.map((v) => (lang === 'en' ? v.label_en : v.label_de)).join(', ')
    case 'address':
      return s.text
    case 'reply':
      return s.text
    case 'continue':
      return lang === 'en' ? 'Continue.' : 'Weiter.'
  }
}

/**
 * Resolves the active suggestion into the `UserAnswer` that goes onto
 * the chat-turn request alongside `userMessage`. The model gets both
 * the structured signal and the free text.
 */
export function suggestionToUserAnswer(s: SuggestionId, fallbackText: string): UserAnswer {
  switch (s.kind) {
    case 'yesno':
      return { kind: 'yesno', value: s.value }
    case 'single_select':
      return {
        kind: 'single_select',
        value: s.value,
        label_de: s.label_de,
        label_en: s.label_en,
      }
    case 'multi_select':
      return { kind: 'multi_select', values: s.values }
    case 'address':
      return { kind: 'address', text: s.text }
    case 'reply':
    case 'continue':
      return { kind: 'text', text: fallbackText }
  }
}
