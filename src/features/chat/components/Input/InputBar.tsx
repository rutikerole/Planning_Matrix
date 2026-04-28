import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chatStore'
import type { MessageRow } from '@/types/db'
import type { UserAnswer } from '@/types/chatTurn'
import { InputText } from './InputText'
import { InputYesNo } from './InputYesNo'
import { InputSelect, type SelectOption } from './InputSelect'
import { InputMultiSelect } from './InputMultiSelect'
import { InputAddress } from './InputAddress'
import { SuggestedReplies } from './SuggestedReplies'

interface Props {
  lastAssistant: MessageRow | null
  onSubmit: (payload: { userMessage: string; userAnswer: UserAnswer }) => void
  /** Render the IDK trigger if allow_idk on the last assistant turn. */
  onIdkClick?: () => void
  /** Optional override (e.g. while a turn is in flight). */
  forceDisabled?: boolean
}

/**
 * Sticky bottom input bar. Reads the last assistant message's
 * input_type and dispatches to the right control. Each control yields
 * a structured UserAnswer + free-text userMessage; we forward both to
 * onSubmit. Disabled when assistant is thinking. Mobile safe-area
 * inset honoured.
 */
export function InputBar({ lastAssistant, onSubmit, onIdkClick, forceDisabled }: Props) {
  const { t } = useTranslation()
  const inputType = lastAssistant?.input_type ?? 'text'
  const allowIdk = lastAssistant?.allow_idk ?? false
  const options = (lastAssistant?.input_options as SelectOption[] | null) ?? []
  const disabled = !!forceDisabled
  const completionSignal = useChatStore((s) => s.lastCompletionSignal)
  const suggestedReplies = lastAssistant?.likely_user_replies ?? []
  // Only show suggestions on free-text turns, when a non-continue
  // completion_signal isn't owning the surface, and not while a turn
  // is in flight.
  const showSuggestions =
    inputType === 'text' &&
    suggestedReplies.length > 0 &&
    !disabled &&
    (completionSignal === null || completionSignal === 'continue')

  const submit = (answer: UserAnswer, userMessage: string) => {
    onSubmit({ userMessage, userAnswer: answer })
  }

  let control: React.ReactNode
  if (inputType === 'none') {
    control = (
      <button
        type="button"
        onClick={() => submit({ kind: 'text', text: 'Weiter.' }, 'Weiter.')}
        disabled={disabled}
        className={cn(
          'h-11 px-5 rounded-[5px] bg-ink text-paper text-[14px] font-medium tracking-tight transition-colors duration-soft hover:bg-ink/92',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          disabled && 'opacity-60 pointer-events-none',
        )}
      >
        {t('chat.input.continue')}
      </button>
    )
  } else if (inputType === 'yesno') {
    control = (
      <InputYesNo
        disabled={disabled}
        onSubmit={(v) =>
          submit({ kind: 'yesno', value: v }, v === 'ja' ? 'Ja' : 'Nein')
        }
      />
    )
  } else if (inputType === 'single_select' && options.length > 0) {
    control = (
      <InputSelect
        options={options}
        disabled={disabled}
        onSubmit={(opt) =>
          submit(
            {
              kind: 'single_select',
              value: opt.value,
              label_de: opt.label_de,
              label_en: opt.label_en,
            },
            opt.label_de,
          )
        }
      />
    )
  } else if (inputType === 'multi_select' && options.length > 0) {
    control = (
      <InputMultiSelect
        options={options}
        disabled={disabled}
        onSubmit={(picked) =>
          submit(
            { kind: 'multi_select', values: picked },
            picked.map((p) => p.label_de).join(', '),
          )
        }
      />
    )
  } else if (inputType === 'address') {
    control = (
      <InputAddress
        disabled={disabled}
        onSubmit={(text) => submit({ kind: 'address', text }, text)}
      />
    )
  } else {
    control = (
      <InputText
        disabled={disabled}
        onSubmit={(text) => submit({ kind: 'text', text }, text)}
        autoFocus
      />
    )
  }

  return (
    <div className="sticky bottom-0 bg-paper/95 backdrop-blur-[2px] border-t border-border-strong/25">
      <div className="flex justify-center px-6 sm:px-10 lg:px-14">
        <div
          className="w-full max-w-2xl py-4 sm:py-5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}
        >
          {showSuggestions && (
            <SuggestedReplies
              replies={suggestedReplies}
              disabled={disabled}
              onSelect={(text) => submit({ kind: 'text', text }, text)}
            />
          )}
          <div className="flex items-end gap-4">
            <div className="flex-1 min-w-0">{control}</div>
            {allowIdk && !disabled && onIdkClick && (
              <button
                type="button"
                onClick={onIdkClick}
                aria-label={t('chat.input.idk.label')}
                className="text-[11px] text-ink/65 hover:text-ink underline underline-offset-4 decoration-clay/55 self-center pb-3 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
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
