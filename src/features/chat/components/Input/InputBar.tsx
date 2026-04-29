// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #67 — Persistent input bar with attachments + suggestion-
// chip-above-input pattern.
//
// Replaces the Phase-3.0 swap behaviour where `input_type: 'none'` would
// hide the textarea and surface a Continue button. The input bar is now
// always visible — textarea + paperclip + send — and structured chips
// render ABOVE the bar as suggestions, never replacements. The user can
// always type.
//
// Q1 (locked): clicking a chip while text is in the textarea APPENDS on
// a new line. The Bauherr typing a clarifying note shouldn't lose it.
//
// File-upload pipeline lands in #68; here the paperclip opens a stub
// AttachmentPicker (Coming-Soon panel) so the open / close / focus
// paths get exercised on the live deploy.
// ───────────────────────────────────────────────────────────────────────

import {
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chatStore'
import type { MessageRow } from '@/types/db'
import type { UserAnswer } from '@/types/chatTurn'
import { useInputState } from '../../hooks/useInputState'
import { useDeleteFile } from '../../hooks/useDeleteFile'
import { SuggestionChips } from './SuggestionChips'
import { AttachmentChip } from './AttachmentChip'
import { AttachmentPicker } from './AttachmentPicker'
import { SendButton } from './SendButton'
import { JumpToLatestFab } from '../JumpToLatestFab'

/** Resolve the send-now text for the Continue button. */
function continueText(lang: 'de' | 'en'): string {
  return lang === 'en' ? 'Continue.' : 'Weiter.'
}

// Two module-level shell components for the bar's outer chrome. The
// embedded variant is used when InputBar is composed into UnifiedFooter
// (which owns the sticky band). The standalone variant carries its own
// sticky / safe-area inset chrome. Defining them at module level keeps
// the children stable across renders — previously they were defined
// inside InputBar's body, which forced focus-loss on every keystroke.
//
// Phase 4.1.6 — both shells are now `relative` and constrain their
// inner content to `max-w-3xl mx-auto` so the chip row, the textarea
// card, and the absolutely-positioned <JumpToLatestFab /> all align
// to the same focused 768 px column. Mobile (<768 px) still fills the
// available width via min(w-full, max-w-3xl).
function EmbeddedShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative w-full max-w-3xl mx-auto"
      data-pm-input-bar="embedded"
    >
      <div className="w-full flex flex-col gap-2">{children}</div>
      <JumpToLatestFab />
    </div>
  )
}

function StandaloneShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="sticky bottom-0 z-20 bg-paper/95 backdrop-blur-[2px] border-t border-border-strong/25"
      data-pm-input-bar="true"
    >
      <div className="flex justify-center px-4 sm:px-6 lg:px-8">
        <div
          className="relative w-full max-w-3xl py-3 sm:py-4 flex flex-col gap-2"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)',
          }}
        >
          {children}
          <JumpToLatestFab />
        </div>
      </div>
    </div>
  )
}

interface Props {
  lastAssistant: MessageRow | null
  onSubmit: (payload: {
    userMessage: string
    userAnswer: UserAnswer
    attachmentIds: string[]
  }) => void
  /** Render the IDK trigger if `allow_idk` on the last assistant turn. */
  onIdkClick?: () => void
  /** Optional override (e.g. while a turn is in flight). */
  forceDisabled?: boolean
  /**
   * Phase 3.7 #75 — when embedded inside `<UnifiedFooter>`, drop the
   * outer sticky/border/bg wrapper. The footer owns the band chrome.
   * Default false preserves the standalone behaviour for any caller
   * that hasn't migrated to the unified footer yet.
   */
  embedded?: boolean
}

const MAX_ROWS = 5
const MAX_LENGTH = 4000

/**
 * The persistent operating-mode input bar. Three-row layout:
 *
 *   1. Suggestion chips (yesno / select / multi / address / replies)   ↑ optional
 *   2. Attachment chips (file row + remove-X)                          ↑ optional
 *   3. Textarea + paperclip + send                                     ← always
 *
 * `data-mode="operating"` already lives on the chat workspace root, so
 * the rounded-card / shadow tokens render correctly without any wrapper
 * here.
 */
export function InputBar({
  lastAssistant,
  onSubmit,
  onIdkClick,
  forceDisabled,
  embedded,
}: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const disabled = !!forceDisabled
  const allowIdk = lastAssistant?.allow_idk ?? false
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

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Auto-grow up to MAX_ROWS, then scroll. Recompute on text change.
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
  }, [text])

  // After a chip click, refocus the textarea so the user can edit
  // immediately. Picker open never steals focus.
  useEffect(() => {
    if (activeSuggestion && !disabled && textareaRef.current) {
      textareaRef.current.focus()
      // Place caret at end so further typing reads naturally.
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [activeSuggestion, disabled])

  // Clear an active-suggestion if the user types over the chip text
  // (so the structured signal isn't sent alongside arbitrary prose).
  // Heuristic: if the textarea no longer contains the chip's
  // canonical text, we drop the suggestion. Done in `buildSubmitAndClear`
  // implicitly — here we just expose the manual clear via the chip-row.

  const handleSubmit = () => {
    if (disabled) return
    const payload = buildSubmitAndClear()
    if (!payload) return
    onSubmit({
      userMessage: payload.userMessage,
      userAnswer: payload.userAnswer,
      attachmentIds: payload.attachmentIds,
    })
  }

  const handleRemoveAttachment = (localId: string) => {
    const target = attachments.find((a) => a.id === localId)
    deleteFile.mutate({
      localId,
      fileRowId: target?.fileRowId ?? null,
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl+Enter always submits.
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
      return
    }
    // Shift+Enter newline; Enter submits.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Show suggestion chips above the bar based on the last turn's input
  // type. The chip surface itself decides what to render.
  const showSuggestions = lastAssistant !== null

  // Subtle hint above the bar reminding the user they can still type
  // when the model expects a structured answer.
  // Only shown when chips are present; avoids visual noise on plain
  // text turns.
  const inputType = lastAssistant?.input_type ?? 'text'
  const showFreeTextHint =
    showSuggestions &&
    (inputType === 'yesno' || inputType === 'single_select' || inputType === 'multi_select')

  // Phase 3.7 #75 — when embedded in UnifiedFooter, the band chrome
  // (sticky position, border-top, background, safe-area inset) lives
  // on the parent. We render only the inner stack: chips + attachments
  // + textarea card + helper row.
  const Shell = embedded ? EmbeddedShell : StandaloneShell

  return (
    <Shell>
          {/* Suggestion chips above the bar — never replace it. */}
          {showSuggestions && (
            <SuggestionChips
              lastAssistant={lastAssistant}
              disabled={disabled}
              onPick={applySuggestion}
              onContinue={() => {
                // Continue is a direct send — primary CTA, no detour
                // through the textarea. The italic helper next to the
                // button covers the "or type instead" path. Avoids a
                // stale-closure read on textarea state.
                if (disabled) return
                const msg = continueText(lang)
                onSubmit({
                  userMessage: msg,
                  userAnswer: { kind: 'text', text: msg },
                  attachmentIds: [],
                })
              }}
              completionSignal={completionSignal}
            />
          )}

          {/* Attachment chips — always above the textarea, never replace. */}
          {attachments.length > 0 && (
            <ul
              role="list"
              aria-label={t('chat.input.attachment.list', {
                defaultValue: 'Angehängte Dateien',
              })}
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

          {/* The textarea card — always visible. */}
          <div
            className={cn(
              'pm-input-card flex items-end gap-2 bg-paper border border-ink/15 px-3 py-2',
              'rounded-[var(--pm-radius-input)] transition-colors duration-soft',
              'focus-within:border-ink/35',
              disabled && 'opacity-95',
            )}
            style={{ boxShadow: 'var(--pm-shadow-input)' }}
          >
            {/* Paperclip — opens AttachmentPicker stub in #67; real
              picker lands in #68. The button is always interactive so
              users discover the affordance early; the panel itself
              communicates that uploads are coming. */}
            <div className="relative shrink-0 self-end pb-1">
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                disabled={disabled}
                aria-label={t('chat.input.attachment.title', {
                  defaultValue: 'Datei anhängen',
                })}
                aria-haspopup="dialog"
                aria-expanded={pickerOpen}
                className={cn(
                  'inline-flex items-center justify-center size-9 rounded-full text-ink/55 hover:text-ink hover:bg-ink/[0.04] transition-colors duration-soft',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  attachments.length > 0 && 'text-drafting-blue hover:text-drafting-blue',
                  disabled && 'pointer-events-none',
                )}
              >
                <Paperclip aria-hidden="true" className="size-[18px]" />
              </button>
              <AttachmentPicker open={pickerOpen} onOpenChange={setPickerOpen} />
            </div>

            {/* The textarea. */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                // If the user erases the chip text, drop the active
                // suggestion so we don't send a stale structured signal.
                if (
                  activeSuggestion &&
                  e.target.value.trim().length === 0
                ) {
                  clearSuggestion()
                }
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={MAX_LENGTH + 200}
              placeholder={
                disabled
                  ? t('chat.input.thinkingPlaceholder', {
                      defaultValue: 'Team antwortet…',
                    })
                  : inputType === 'none'
                    ? t('chat.input.placeholderOrContinue', {
                        defaultValue:
                          'Antworten Sie hier, oder klicken Sie *Weiter* →',
                      })
                    : t('chat.input.text.placeholder')
              }
              aria-label={t('chat.input.text.label')}
              disabled={disabled}
              className={cn(
                'flex-1 min-w-0 bg-transparent border-0 py-2 text-[16px] sm:text-[15px] leading-[1.55] text-ink placeholder:text-ink/40 resize-none focus:outline-none',
                disabled && 'placeholder:italic placeholder:text-clay/72',
              )}
              style={{ letterSpacing: 'var(--pm-tracking-body)' }}
            />

            {/* Phase 3.7 #76 — extracted SendButton. Adds streaming-stop
              * affordance backed by chatStore's AbortController, hover
              * scale, and a sharper disabled style. */}
            <SendButton isEmpty={isEmpty} disabled={disabled} onSend={handleSubmit} />
          </div>

          {/* Bottom row — IDK link + tiny helper hint. */}
          <div className="flex items-center justify-between gap-3 px-1">
            <p
              className={cn(
                'text-[11px] italic leading-relaxed transition-opacity duration-soft',
                showFreeTextHint ? 'text-clay/70 opacity-100' : 'opacity-0',
              )}
              aria-hidden={!showFreeTextHint}
            >
              {t('chat.input.freeTextHint', {
                defaultValue: 'Sie können auch frei antworten.',
              })}
            </p>
            {allowIdk && !disabled && onIdkClick ? (
              <button
                type="button"
                onClick={onIdkClick}
                aria-label={t('chat.input.idk.label')}
                className="text-[11px] text-ink/65 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
              >
                {t('chat.input.idk.label')}
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
          </div>
    </Shell>
  )
}
