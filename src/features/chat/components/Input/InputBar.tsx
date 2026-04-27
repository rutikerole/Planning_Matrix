import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { MessageRow } from '@/types/db'
import type { UserAnswer } from '@/types/chatTurn'
import { InputText } from './InputText'

interface Props {
  lastAssistant: MessageRow | null
  onSubmit: (payload: { userMessage: string; userAnswer: UserAnswer }) => void
  disabled?: boolean
}

/**
 * Sticky bottom input bar. Reads the last assistant message's input_type
 * to decide which control to render. In commit #16 we handle text + none
 * + a fallback; the rest (yesno, single_select, multi_select, address)
 * land in #17. The IDK link wires up in #18.
 *
 * Note: never overlaps the rails because we live inside the center
 * column and the rails sit in their own grid tracks.
 */
export function InputBar({ lastAssistant, onSubmit, disabled }: Props) {
  const { t } = useTranslation()
  const inputType = lastAssistant?.input_type ?? 'text'
  const allowIdk = lastAssistant?.allow_idk ?? false

  const handleTextSubmit = (text: string) => {
    onSubmit({ userMessage: text, userAnswer: { kind: 'text', text } })
  }

  const handleNoneSubmit = () => {
    // Reserved for assistant turns that just deliver content with no
    // input expected. Surfaces a calm Weiter CTA for the user to advance.
    onSubmit({
      userMessage: 'Weiter.',
      userAnswer: { kind: 'text', text: 'Weiter.' },
    })
  }

  return (
    <div className="sticky bottom-0 bg-paper/95 backdrop-blur-[2px] border-t border-border-strong/25">
      <div className="flex justify-center px-6 sm:px-10 lg:px-14">
        <div
          className={cn(
            'w-full max-w-2xl py-4 sm:py-5',
            disabled && 'opacity-70 pointer-events-none',
          )}
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}
        >
          <div className="flex items-end gap-4">
            {/* Render control based on assistant's expected input_type. */}
            <div className="flex-1 min-w-0">
              {inputType === 'none' ? (
                <button
                  type="button"
                  onClick={handleNoneSubmit}
                  disabled={disabled}
                  className="h-11 px-5 rounded-[5px] bg-ink text-paper text-[14px] font-medium tracking-tight hover:bg-ink/92 transition-colors duration-soft ease-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {t('chat.input.continue')}
                </button>
              ) : (
                /* For #16: text fallback for everything else. Adaptive
                 * controls (yesno/single_select/multi_select/address)
                 * land in #17. */
                <InputText
                  placeholder={t('chat.input.text.placeholder')}
                  disabled={disabled}
                  onSubmit={handleTextSubmit}
                  autoFocus
                />
              )}
            </div>

            {/* Weiß ich nicht — link wired here, popover lands in #18. */}
            {allowIdk && !disabled && (
              <button
                type="button"
                disabled
                aria-label={t('chat.input.idk.label')}
                className="text-[11px] text-ink/55 underline underline-offset-4 decoration-clay/55 self-center pb-3 cursor-not-allowed"
              >
                {t('chat.input.idk.label')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
