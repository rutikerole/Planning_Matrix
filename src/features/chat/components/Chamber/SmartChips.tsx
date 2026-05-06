// Phase 7 Chamber — SmartChips.
//
// Replaces SuggestionChips. Renders directly under the latest
// assistant message that requested input. Larger, generous, beautiful.
//
// Per `input_type`:
//   - text          → no chips (input bar handles it)
//   - yesno         → [Ja] [Nein]
//   - single_select → row of pills
//   - multi_select  → toggle pills + Bestätigen primary
//   - address       → inline input + Submit
//   - none          → [Weiter] continuation
//
// IDK suppression: when the last assistant turn is from the
// `synthesizer`, hide the IDK pill (synthesizer turns are summary
// gates, not atomic factual asks). Schema unchanged.

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { isPlotAddressValid } from '@/lib/addressParse'
import type { MessageRow } from '@/types/db'
import type { UserAnswer } from '@/types/chatTurn'
import { useEventEmitter } from '@/hooks/useEventEmitter'
import { IdkAffordance } from './IdkAffordance'

interface SelectOption {
  value: string
  label_de: string
  label_en: string
}

interface Props {
  lastAssistant: MessageRow | null
  disabled: boolean
  onPick: (answer: UserAnswer) => void
  onContinue: () => void
  onIdkOpen: () => void
  showIdk: boolean
}

export function SmartChips({
  lastAssistant,
  disabled,
  onPick,
  onContinue,
  onIdkOpen,
  showIdk,
}: Props) {
  const inputType = lastAssistant?.input_type ?? 'text'
  const options = (lastAssistant?.input_options as SelectOption[] | null) ?? []
  const completionSignalLooksContinue = lastAssistant?.allow_idk === false
  const chatEmit = useEventEmitter('chat')

  // Phase 9.2 — wrap onPick once at the entry point so every chip
  // variant (Yes/No, single_select, multi_select, address) emits a
  // chat.chip_clicked event without each child sub-component having
  // to know about analytics.
  const wrappedOnPick = (answer: UserAnswer) => {
    chatEmit('chip_clicked', {
      input_type: inputType,
      // Strip any free-text body from `value` — for select chips
      // value is the option key (short, no PII); for address it's
      // the literal address which we don't want.
      value:
        inputType === 'address'
          ? '<address>'
          : (answer as { value?: unknown })?.value ?? null,
      kind: (answer as { kind?: string })?.kind ?? null,
    })
    onPick(answer)
  }
  const wrappedOnContinue = () => {
    chatEmit('continue_clicked', { input_type: inputType })
    onContinue()
  }
  const wrappedOnIdkOpen = () => {
    chatEmit('idk_opened', { input_type: inputType })
    onIdkOpen()
  }

  // Continue flow.
  if (
    inputType === 'none' ||
    completionSignalLooksContinue && inputType === 'text'
  ) {
    return (
      <ChipRow disabled={disabled}>
        <FilledButton onClick={wrappedOnContinue} disabled={disabled}>
          <ContinueLabel />
        </FilledButton>
        {showIdk && <IdkAffordance onOpen={wrappedOnIdkOpen} disabled={disabled} />}
      </ChipRow>
    )
  }

  if (inputType === 'yesno') {
    return (
      <ChipRow disabled={disabled}>
        <YesNoChip value="ja" disabled={disabled} onPick={wrappedOnPick} />
        <YesNoChip value="nein" disabled={disabled} onPick={wrappedOnPick} />
        {showIdk && <IdkAffordance onOpen={wrappedOnIdkOpen} disabled={disabled} />}
      </ChipRow>
    )
  }

  if (inputType === 'single_select' && options.length > 0) {
    return (
      <ChipRow disabled={disabled}>
        {options.map((opt) => (
          <SelectChip key={opt.value} option={opt} disabled={disabled} onPick={wrappedOnPick} />
        ))}
        {showIdk && <IdkAffordance onOpen={wrappedOnIdkOpen} disabled={disabled} />}
      </ChipRow>
    )
  }

  if (inputType === 'multi_select' && options.length > 0) {
    return (
      <MultiSelectRow
        options={options}
        disabled={disabled}
        onPick={wrappedOnPick}
        showIdk={showIdk}
        onIdkOpen={wrappedOnIdkOpen}
      />
    )
  }

  if (inputType === 'address') {
    return <AddressRow disabled={disabled} onPick={wrappedOnPick} />
  }

  // Free text — only an IDK affordance, no chips.
  if (showIdk) {
    return (
      <ChipRow disabled={disabled}>
        <IdkAffordance onOpen={wrappedOnIdkOpen} disabled={disabled} />
      </ChipRow>
    )
  }
  return null
}

// ── Layout ────────────────────────────────────────────────────────────

function ChipRow({
  children,
  disabled,
}: {
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div
      role="group"
      aria-label="Vorschläge"
      className={cn(
        'flex items-center flex-wrap gap-2.5',
        disabled && 'opacity-60 pointer-events-none',
      )}
    >
      {children}
    </div>
  )
}

function chipBase(highlighted = false): string {
  return cn(
    'inline-flex items-center justify-center gap-1.5 px-[18px] py-[12px] min-h-[44px] min-w-[100px]',
    'border text-[15px] leading-snug shrink-0',
    'rounded-full transition-[background-color,color,border-color,transform] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
    highlighted
      ? 'border-ink bg-ink text-paper hover:bg-ink/92'
      : 'border-[hsl(var(--clay)/0.55)] bg-paper-card text-ink/85 hover:border-clay hover:bg-[hsl(var(--clay)/0.08)] hover:text-ink motion-safe:hover:-translate-y-px',
  )
}

function FilledButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 px-5 py-3 min-h-[44px]',
        'bg-ink text-paper text-[15px] font-medium rounded-full',
        'transition-colors duration-150 hover:bg-ink/92',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
      )}
    >
      {children}
    </button>
  )
}

function ContinueLabel() {
  const { t } = useTranslation()
  return (
    <>
      {t('chat.chamber.smartChipsContinue')}
      <span aria-hidden="true">→</span>
    </>
  )
}

// ── Specific chips ─────────────────────────────────────────────────────

function YesNoChip({
  value,
  disabled,
  onPick,
}: {
  value: 'ja' | 'nein'
  disabled?: boolean
  onPick: (a: UserAnswer) => void
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const label = t(value === 'ja' ? 'chat.input.yesno.yes' : 'chat.input.yesno.no')
  return (
    <m.button
      type="button"
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
      disabled={disabled}
      onClick={() => onPick({ kind: 'yesno', value })}
      className={chipBase()}
    >
      {label}
    </m.button>
  )
}

function SelectChip({
  option,
  disabled,
  onPick,
}: {
  option: SelectOption
  disabled?: boolean
  onPick: (a: UserAnswer) => void
}) {
  const { i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const reduced = useReducedMotion()
  return (
    <m.button
      type="button"
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
      disabled={disabled}
      onClick={() => onPick({
        kind: 'single_select',
        value: option.value,
        label_de: option.label_de,
        label_en: option.label_en,
      })}
      className={chipBase()}
    >
      {lang === 'en' ? option.label_en : option.label_de}
    </m.button>
  )
}

function MultiSelectRow({
  options,
  disabled,
  onPick,
  showIdk,
  onIdkOpen,
}: {
  options: SelectOption[]
  disabled?: boolean
  onPick: (a: UserAnswer) => void
  showIdk: boolean
  onIdkOpen: () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const sigRef = useRef('')
  const sig = options.map((o) => o.value).join('|')
  useEffect(() => {
    if (sigRef.current !== sig) {
      sigRef.current = sig
      setSelected(new Set())
    }
  }, [sig])
  const toggle = (v: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }
  const confirm = () => {
    if (selected.size === 0) return
    const picked = options
      .filter((o) => selected.has(o.value))
      .map((o) => ({ value: o.value, label_de: o.label_de, label_en: o.label_en }))
    onPick({ kind: 'multi_select', values: picked })
  }
  return (
    <div className={cn('flex flex-col gap-3', disabled && 'opacity-60 pointer-events-none')}>
      <ChipRow disabled={disabled}>
        {options.map((opt) => {
          const isOn = selected.has(opt.value)
          const label = lang === 'en' ? opt.label_en : opt.label_de
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isOn}
              disabled={disabled}
              onClick={() => toggle(opt.value)}
              className={chipBase(isOn)}
            >
              {label}
            </button>
          )
        })}
      </ChipRow>
      <div className="flex items-center justify-between gap-3">
        <span className="font-serif italic text-[12.5px] text-clay/82">
          {selected.size === 0
            ? t('chat.input.multi.minHint')
            : t('chat.input.multi.countSelected', { n: selected.size })}
        </span>
        <div className="flex items-center gap-2">
          {showIdk && <IdkAffordance onOpen={onIdkOpen} disabled={disabled} />}
          <FilledButton onClick={confirm} disabled={disabled || selected.size === 0}>
            {t('chat.chamber.smartChipsConfirmMulti')}
            <span aria-hidden="true">→</span>
          </FilledButton>
        </div>
      </div>
    </div>
  )
}

function AddressRow({
  disabled,
  onPick,
}: {
  disabled?: boolean
  onPick: (a: UserAnswer) => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)
  const valid = isPlotAddressValid(value)
  const showError = touched && !valid
  const submit = () => {
    if (!valid) {
      setTouched(true)
      return
    }
    onPick({ kind: 'address', text: value.trim() })
    setValue('')
    setTouched(false)
  }
  return (
    <div className={cn('flex flex-col gap-2', disabled && 'opacity-60 pointer-events-none')}>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          inputMode="text"
          autoComplete="street-address"
          value={value}
          placeholder={t('chat.chamber.smartChipsAddressPlaceholder')}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          disabled={disabled}
          aria-invalid={showError || undefined}
          className={cn(
            'flex-1 min-w-[260px] h-12 px-4 bg-paper-card border text-[16px] text-ink placeholder:text-ink/40',
            'rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
            showError ? 'border-destructive/70' : 'border-[hsl(var(--clay)/0.55)] focus:border-clay',
          )}
        />
        <FilledButton onClick={submit} disabled={disabled || !valid}>
          {t('chat.chamber.smartChipsAddressSubmit')}
          <span aria-hidden="true">→</span>
        </FilledButton>
      </div>
      <p
        className={cn(
          'text-[12px] leading-relaxed',
          showError ? 'text-destructive' : 'font-serif italic text-clay/82',
        )}
      >
        {showError
          ? t('chat.input.address.invalid')
          : t('chat.input.address.helper')}
      </p>
    </div>
  )
}
