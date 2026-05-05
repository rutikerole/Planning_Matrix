// Phase 7 Chamber — InputBar.
//
// Generous, calm input. Renders SmartChips above, attachment chips,
// and the textarea card with paperclip + send. Long-press on the
// textarea (600ms) opens the LongPressMenu.
//
// IDK suppression: the parent decides via `idkAllowed` whether to
// surface the affordance. Synthesizer turns turn it off (per audit
// K-derived note + the brief's §24 #51).

import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chatStore'
import { useLongPress } from '@/lib/useLongPress'
import { useDeleteFile } from '../../hooks/useDeleteFile'
import { useInputState } from '../../hooks/useInputState'
import type { MessageRow } from '@/types/db'
import type { UserAnswer } from '@/types/chatTurn'
import { SmartChips } from './SmartChips'
import { SendButton } from './SendButton'
import { LongPressMenu, type IdkMode } from './LongPressMenu'
import { AttachmentChip } from './AttachmentChip'
import { AttachmentPicker } from './AttachmentPicker'

interface Props {
  lastAssistant: MessageRow | null
  onSubmit: (payload: {
    userMessage: string
    userMessageEn?: string
    userAnswer: UserAnswer
    attachmentIds: string[]
  }) => void
  onIdkChoose: (mode: IdkMode) => void
  forceDisabled?: boolean
  textareaRef?: RefObject<HTMLTextAreaElement>
}

const MAX_ROWS = 5
const MAX_LENGTH = 4000

export function InputBar({
  lastAssistant,
  onSubmit,
  onIdkChoose,
  forceDisabled,
  textareaRef: textareaRefExt,
}: Props) {
  const { t } = useTranslation()
  const disabled = !!forceDisabled
  const allowIdk = lastAssistant?.allow_idk ?? false
  const isSynthesizer = lastAssistant?.specialist === 'synthesizer'
  // §24 #51 — suppress IDK on synthesizer turns (summary gates).
  const showIdk = allowIdk && !isSynthesizer && !disabled
  const isThinking = useChatStore((s) => s.isAssistantThinking)
  const completionSignal = useChatStore((s) => s.lastCompletionSignal)
  const deleteFile = useDeleteFile()

  const {
    text,
    setText,
    activeSuggestion,
    applySuggestion,
    clearSuggestion,
    attachments,
    isEmpty,
    buildSubmitAndClear,
  } = useInputState()

  const localRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = textareaRefExt ?? localRef
  const [pickerOpen, setPickerOpen] = useState(false)
  const [longPressOpen, setLongPressOpen] = useState(false)

  // Auto-grow up to MAX_ROWS.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 22
    const padding =
      parseFloat(getComputedStyle(el).paddingTop) +
      parseFloat(getComputedStyle(el).paddingBottom)
    const max = lineHeight * MAX_ROWS + padding
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden'
  }, [text, textareaRef])

  // Refocus textarea after a chip click.
  useEffect(() => {
    if (activeSuggestion && !disabled && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [activeSuggestion, disabled, textareaRef])

  const handleSubmit = () => {
    if (disabled) return
    const payload = buildSubmitAndClear()
    if (!payload) return
    onSubmit({
      userMessage: payload.userMessage,
      userMessageEn: payload.userMessageEn,
      userAnswer: payload.userAnswer,
      attachmentIds: payload.attachmentIds,
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleRemoveAttachment = (localId: string) => {
    const target = attachments.find((a) => a.id === localId)
    deleteFile.mutate({
      localId,
      fileRowId: target?.fileRowId ?? null,
    })
  }

  const longPressBind = useLongPress({
    onLongPress: () => {
      if (showIdk) setLongPressOpen(true)
    },
    delay: 600,
  })

  // Smart placeholder rotates by state.
  const placeholderKey = isThinking
    ? 'chat.chamber.inputPlaceholderThinking'
    : completionSignal === 'ready_for_review'
      ? 'chat.chamber.inputPlaceholderCompletion'
      : 'chat.chamber.inputPlaceholderText'

  const handleContinue = () => {
    if (disabled) return
    onSubmit({
      userMessage: 'Weiter.',
      userMessageEn: 'Continue.',
      userAnswer: { kind: 'text', text: 'Weiter.' },
      attachmentIds: [],
    })
  }

  return (
    <div className="relative flex flex-col gap-3">
      {/* Smart chips. Phase 7.9 §2.5 — 56 px left-indent so the
        * chip row aligns with the chapter-heading body indent and
        * reads as a continuation of the conversation, not a chrome
        * detail of the input bar. */}
      <div className="pl-14">
        <SmartChips
          lastAssistant={lastAssistant}
          disabled={disabled}
          onPick={(a) => applySuggestion(suggestionFromAnswer(a))}
          onContinue={handleContinue}
          onIdkOpen={() => setLongPressOpen(true)}
          showIdk={showIdk}
        />
      </div>

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <ul
          role="list"
          aria-label={t('chat.input.attachment.list', { defaultValue: 'Angehängte Dateien' })}
          className="flex flex-wrap items-center gap-2"
        >
          {attachments.map((a) => (
            <li key={a.id}>
              <AttachmentChip
                attachment={a}
                onRemove={handleRemoveAttachment}
                disabled={disabled}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Phase 7.7 §1.5 — textarea row.
        * Phase 7.10 — wrapped as a centered cylindrical pill
        * (rounded-full, solid paper-card bg, hairline clay border,
        * soft shadow). Max-width 680 px so the input reads as a
        * "modern chat capsule" instead of an edge-to-edge band; the
        * sticky-bottom band's transparent bg is dropped in
        * ChamberLayout so message content cannot bleed behind. */}
      <div className="mx-auto w-full max-w-[680px]">
        <div
          className={cn(
            'flex items-end gap-1 px-2 py-1.5',
            'rounded-full bg-paper-card',
            'border border-[rgba(123,92,63,0.28)]',
            'shadow-[0_1px_2px_rgba(26,22,18,0.04),0_4px_18px_-8px_rgba(26,22,18,0.10)]',
            'transition-[border-color,box-shadow] duration-150',
            'focus-within:border-clay/55 focus-within:shadow-[0_1px_2px_rgba(26,22,18,0.05),0_6px_22px_-8px_rgba(26,22,18,0.14)]',
            disabled && 'opacity-95',
          )}
        >
          {/* Paperclip */}
          <div className="relative shrink-0 self-end pb-0.5">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              disabled={disabled}
              aria-label={t('chat.input.attachment.title', { defaultValue: 'Datei anhängen' })}
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              className={cn(
                'inline-flex items-center justify-center size-9 rounded-full',
                'text-ink/55 hover:text-ink hover:bg-ink/[0.04] transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card',
                attachments.length > 0 && 'text-clay hover:text-clay-deep',
                disabled && 'pointer-events-none',
              )}
            >
              <Paperclip aria-hidden="true" className="size-[18px]" />
            </button>
            <AttachmentPicker open={pickerOpen} onOpenChange={setPickerOpen} />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (activeSuggestion && e.target.value.trim().length === 0) {
                clearSuggestion()
              }
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={MAX_LENGTH + 200}
            placeholder={t(placeholderKey)}
            aria-label={t('chat.input.text.label', { defaultValue: 'Ihre Antwort' })}
            disabled={disabled}
            className="flex-1 min-w-0 bg-transparent border-0 px-1 py-2 text-[16px] md:text-[16.5px] leading-[1.55] text-ink placeholder:text-ink/40 resize-none focus:outline-none"
            style={{ letterSpacing: 'var(--pm-tracking-body)' }}
            {...longPressBind}
          />

          <div className="self-end pb-0.5">
            <SendButton isEmpty={isEmpty} disabled={disabled} onSend={handleSubmit} />
          </div>
        </div>
      </div>

      {/* Hint row */}
      {showIdk && (
        <p className="text-[11px] italic text-clay/72 leading-relaxed pl-2">
          {t('chat.chamber.inputLongPressHint')}
        </p>
      )}

      {/* Long-press / IDK menu */}
      <LongPressMenu
        open={longPressOpen}
        onOpenChange={setLongPressOpen}
        onChoose={(mode) => {
          setLongPressOpen(false)
          onIdkChoose(mode)
        }}
      />
    </div>
  )
}

// Translate UserAnswer back into a SuggestionId for `applySuggestion`.
import type { SuggestionId } from '@/types/chatInput'
function suggestionFromAnswer(a: UserAnswer): SuggestionId {
  switch (a.kind) {
    case 'yesno':
      return { kind: 'yesno', value: a.value }
    case 'single_select':
      return {
        kind: 'single_select',
        value: a.value,
        label_de: a.label_de,
        label_en: a.label_en,
      }
    case 'multi_select':
      return { kind: 'multi_select', values: a.values }
    case 'address':
      return { kind: 'address', text: a.text }
    case 'text':
      return { kind: 'reply', text: a.text }
    case 'idk':
      // SmartChips never picks 'idk' — handled by LongPressMenu.
      return { kind: 'reply', text: '' }
  }
}
