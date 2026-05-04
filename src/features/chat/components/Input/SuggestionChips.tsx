// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #67 — SuggestionChips
//
// Renders the structured affordances ABOVE the textarea instead of
// replacing it. The conversation model still emits `input_type` and
// `input_options`; we translate them into a horizontal chip row that
// fills the textarea on click (Q1 default — append on a new line if
// the user already typed something).
//
// Multi-select keeps a local toggle set + a "Bestätigen" button at
// the end of the row. Address renders a one-shot inline form. The
// model's `likely_user_replies` (Phase 3.4) collapse into the same
// chip row as gentle suggestions on free-text turns.
//
// All chip flavours emit `SuggestionId` to the parent; the parent
// decides what fills the textarea via `useInputState.applySuggestion`.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SuggestionId } from '@/types/chatInput'
import type { MessageRow } from '@/types/db'
import { isPlotAddressValid } from '@/lib/addressParse'

interface SelectOption {
  value: string
  label_de: string
  label_en: string
}

interface Props {
  lastAssistant: MessageRow | null
  /** True while the assistant is composing — chips are inert. */
  disabled: boolean
  onPick: (s: SuggestionId) => void
  /** Continue handler for `input_type: 'none'` — sends "Weiter." now. */
  onContinue: () => void
  /** Latest completion_signal — drives the soft Continue prompt. */
  completionSignal:
    | 'continue'
    | 'needs_designer'
    | 'ready_for_review'
    | 'blocked'
    | null
}

/**
 * Decide what chip surface to render based on the last assistant turn.
 * Returns null when there's nothing structured to show — the input bar
 * still renders the textarea + paperclip + send.
 *
 * Phase 4.1.11 — Continue chip restored to render here as a chip in
 * the chip row (the original Phase 3.7 #75a shape). Phase 4.1.8's
 * absolute-positioned chip was a regression that created a 40 px
 * floating band; the actual root cause (FooterLeftColumn inflating
 * the grid row above InputBar) is fixed at the source by collapsing
 * FooterLeftColumn's vertical secondary stack into a horizontal row
 * — see FooterLeftColumn.tsx.
 */
export function SuggestionChips({
  lastAssistant,
  disabled,
  onPick,
  onContinue,
  completionSignal,
}: Props) {
  const { i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const inputType = lastAssistant?.input_type ?? 'text'
  const options = (lastAssistant?.input_options as SelectOption[] | null) ?? []
  // Phase 6.1 — pick the locale-correct reply set. The DE column is the
  // legacy field (always present); the EN mirror lives in tool_input
  // since it has no dedicated DB column.
  const repliesDe = lastAssistant?.likely_user_replies ?? []
  const repliesEn =
    (lastAssistant?.tool_input as { likely_user_replies_en?: string[] } | null)
      ?.likely_user_replies_en ?? []
  const replies =
    lang === 'en' && repliesEn.length > 0 ? repliesEn : repliesDe

  // input_type: 'none' — show a Weiter button + companion note,
  // never replace the textarea.
  if (
    inputType === 'none' ||
    completionSignal === 'continue' ||
    completionSignal === 'ready_for_review'
  ) {
    return <ContinueRow disabled={disabled} onContinue={onContinue} />
  }

  if (inputType === 'yesno') {
    return (
      <ChipRow disabled={disabled}>
        <YesNoChip value="ja" disabled={disabled} onPick={onPick} />
        <YesNoChip value="nein" disabled={disabled} onPick={onPick} />
      </ChipRow>
    )
  }

  if (inputType === 'single_select' && options.length > 0) {
    return (
      <ChipRow disabled={disabled}>
        {options.map((opt) => (
          <SelectChip key={opt.value} option={opt} disabled={disabled} onPick={onPick} />
        ))}
      </ChipRow>
    )
  }

  if (inputType === 'multi_select' && options.length > 0) {
    return (
      <MultiSelectRow
        options={options}
        disabled={disabled}
        onPick={onPick}
      />
    )
  }

  if (inputType === 'address') {
    return <AddressRow disabled={disabled} onPick={onPick} />
  }

  // Free text + likely replies → soft suggestion chips.
  if (inputType === 'text' && replies.length > 0) {
    return (
      <ChipRow disabled={disabled} variant="reply">
        {replies.slice(0, 3).map((reply, idx) => (
          <ReplyChip
            key={`${idx}-${reply}`}
            text={reply}
            disabled={disabled}
            onPick={onPick}
          />
        ))}
      </ChipRow>
    )
  }

  return null
}

// ── Layout ─────────────────────────────────────────────────────────────

function ChipRow({
  children,
  disabled,
  variant,
}: {
  children: React.ReactNode
  disabled?: boolean
  variant?: 'reply'
}) {
  // Phase 4.1.7 — `mb-3` removed so the chip is visually contiguous
  // with the textarea card below (parent EmbeddedShell uses `gap-2` →
  // 8 px total gap, the user's max-acceptable threshold). `pl-3` aligns
  // the leftmost chip with the paperclip's x position inside the input
  // card (which has `px-3` internal padding) — same vertical column,
  // not floating leftward at the EmbeddedShell edge.
  return (
    <div
      className={cn(
        'flex items-center gap-2 overflow-x-auto pm-chip-row pl-3',
        variant === 'reply' && 'opacity-95',
        disabled && 'opacity-60 pointer-events-none',
      )}
      role="group"
      aria-label="Vorschläge"
      // Hide horizontal scrollbar visually; keep keyboard scroll.
      style={{ scrollbarWidth: 'none' }}
    >
      {children}
    </div>
  )
}

function chipBase(highlighted = false): string {
  return cn(
    'inline-flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 border text-[13px] leading-snug shrink-0',
    'rounded-[var(--pm-radius-pill)] transition-[background-color,color,border-color,transform] duration-soft ease-soft',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    highlighted
      ? 'border-ink bg-ink text-paper hover:bg-ink/92'
      : 'border-ink/15 bg-paper text-ink/85 hover:border-ink/30 hover:bg-drafting-blue/[0.05] hover:text-ink motion-safe:hover:-translate-y-px',
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
  onPick: (s: SuggestionId) => void
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  return (
    <m.button
      type="button"
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
      disabled={disabled}
      onClick={() => onPick({ kind: 'yesno', value })}
      className={chipBase()}
    >
      {t(value === 'ja' ? 'chat.input.yesno.yes' : 'chat.input.yesno.no')}
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
  onPick: (s: SuggestionId) => void
}) {
  const { i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const reduced = useReducedMotion()
  return (
    <m.button
      type="button"
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
      disabled={disabled}
      onClick={() =>
        onPick({
          kind: 'single_select',
          value: option.value,
          label_de: option.label_de,
          label_en: option.label_en,
        })
      }
      className={chipBase()}
    >
      {lang === 'en' ? option.label_en : option.label_de}
    </m.button>
  )
}

function ReplyChip({
  text,
  disabled,
  onPick,
}: {
  text: string
  disabled?: boolean
  onPick: (s: SuggestionId) => void
}) {
  const reduced = useReducedMotion()
  return (
    <m.button
      type="button"
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
      disabled={disabled}
      onClick={() => onPick({ kind: 'reply', text })}
      className={chipBase()}
    >
      <span
        aria-hidden="true"
        className="font-serif italic text-[11px] text-clay/70"
      >
        ←
      </span>
      <span className="truncate max-w-[40ch]">{text}</span>
    </m.button>
  )
}

// ── Multi-select ───────────────────────────────────────────────────────

function MultiSelectRow({
  options,
  disabled,
  onPick,
}: {
  options: SelectOption[]
  disabled?: boolean
  onPick: (s: SuggestionId) => void
}) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Reset selection when the parent question changes — we key off
  // option-value identity since the options-array reference changes.
  const sigRef = useRef('')
  const sig = options.map((o) => o.value).join('|')
  useEffect(() => {
    if (sigRef.current !== sig) {
      sigRef.current = sig
      setSelected(new Set())
    }
  }, [sig])

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
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
    <div className={cn('flex flex-col gap-2 pl-3', disabled && 'opacity-60 pointer-events-none')}>
      <div
        className="flex items-center gap-2 overflow-x-auto pm-chip-row"
        role="group"
        aria-label={t('chat.input.multi.minHint', { defaultValue: 'Mindestens eine Option wählen.' })}
        style={{ scrollbarWidth: 'none' }}
      >
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
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] italic text-clay/75">
          {selected.size === 0
            ? t('chat.input.multi.minHint', {
                defaultValue: 'Mindestens eine Option wählen.',
              })
            : t('chat.input.multi.countSelected', {
                defaultValue: '{{n}} ausgewählt',
                n: selected.size,
              })}
        </p>
        <button
          type="button"
          onClick={confirm}
          disabled={disabled || selected.size === 0}
          className={cn(
            'inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium transition-colors duration-soft',
            'rounded-[var(--pm-radius-pill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            disabled || selected.size === 0
              ? 'bg-ink/15 text-ink/40 cursor-not-allowed'
              : 'bg-ink text-paper hover:bg-ink/92',
          )}
        >
          {t('chat.input.multi.confirmIntoText', {
            defaultValue: 'Übernehmen',
          })}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Address ────────────────────────────────────────────────────────────

function AddressRow({
  disabled,
  onPick,
}: {
  disabled?: boolean
  onPick: (s: SuggestionId) => void
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
    <div className={cn('flex flex-col gap-1.5 pl-3 pr-3', disabled && 'opacity-60 pointer-events-none')}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="text"
          autoComplete="street-address"
          value={value}
          placeholder={t('chat.input.address.placeholder')}
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
            'flex-1 min-w-0 h-11 sm:h-10 px-3 bg-paper border text-[16px] sm:text-[14px] text-ink placeholder:text-ink/35 transition-colors duration-soft',
            'rounded-[var(--pm-radius-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            showError ? 'border-destructive/70' : 'border-ink/15 focus:border-ink/35',
          )}
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !valid}
          className={cn(
            'inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium transition-colors duration-soft shrink-0',
            'rounded-[var(--pm-radius-pill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            disabled || !valid
              ? 'bg-ink/15 text-ink/40 cursor-not-allowed'
              : 'bg-ink text-paper hover:bg-ink/92',
          )}
        >
          {t('chat.input.multi.confirmIntoText', { defaultValue: 'Übernehmen' })}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </button>
      </div>
      <p
        className={cn(
          'text-[11px] leading-relaxed',
          showError ? 'text-destructive' : 'text-clay/75 italic',
        )}
      >
        {showError
          ? t('chat.input.address.invalid')
          : t('chat.input.address.helper')}
      </p>
    </div>
  )
}

// ── Continue prompt (input_type === 'none') ────────────────────────────

/**
 * Continue chip — same render path as yesno / single_select / multi_select
 * / address chips. Renders inside the EmbeddedShell's flex column at the
 * top of the chip slot, 8 px above the input card via flex `gap-2`. The
 * "you can also type instead" cue lives in the textarea placeholder so
 * we don't need a third floating helper element.
 */
function ContinueRow({
  disabled,
  onContinue,
}: {
  disabled: boolean
  onContinue: () => void
}) {
  const { t } = useTranslation()
  return (
    <ChipRow disabled={disabled}>
      <button
        type="button"
        onClick={onContinue}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 h-9 px-4 bg-ink text-paper text-[13px] font-medium transition-colors duration-soft shrink-0',
          'rounded-[var(--pm-radius-pill)] hover:bg-ink/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        {t('chat.input.continue')}
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </button>
    </ChipRow>
  )
}
