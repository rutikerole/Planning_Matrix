import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useWizardState } from '../hooks/useWizardState'
import { INTENT_VALUES, INTENT_TO_I18N } from '../lib/selectTemplate'
import { IntentChip } from './IntentChip'

/**
 * Q1 — intent. Six chips with inline SVG line-icons. Chip selection
 * stores the intent but does NOT auto-advance: the user clicks
 * "Continue" or presses Enter on a focused chip to move to Q2.
 */
export function QuestionIntent() {
  const { t } = useTranslation()
  const intent = useWizardState((s) => s.intent)
  const setIntent = useWizardState((s) => s.setIntent)
  const setStep = useWizardState((s) => s.setStep)
  const [unsureOpen, setUnsureOpen] = useState(false)
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([])

  const advance = () => {
    if (intent !== null) setStep(2)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (idx + 1) % INTENT_VALUES.length
      chipRefs.current[next]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (idx - 1 + INTENT_VALUES.length) % INTENT_VALUES.length
      chipRefs.current[prev]?.focus()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const target = INTENT_VALUES[idx]
      setIntent(target)
      // Allow the next paint to settle so screen readers announce
      // the selection before we leave Q1.
      setTimeout(() => setStep(2), 0)
    }
  }

  const canContinue = intent !== null

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
          {t('wizard.q1.eyebrow')}
        </p>
        <h1
          id="q1-headline"
          className="font-serif text-[clamp(2.5rem,6vw,4rem)] leading-[1.05] -tracking-[0.02em] text-pm-ink"
        >
          {t('wizard.q1.h').replace(/[?]\s*$/, '')}
          <span className="text-pm-clay">?</span>
        </h1>
        <p className="font-sans text-[17px] italic leading-relaxed text-pm-ink-mid max-w-[36rem]">
          {t('wizard.q1.sub')}
        </p>
      </header>

      <div
        role="radiogroup"
        aria-labelledby="q1-headline"
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
      >
        {INTENT_VALUES.map((value, idx) => (
          <IntentChip
            key={value}
            ref={(el) => {
              chipRefs.current[idx] = el
            }}
            intent={value}
            selected={intent === value}
            onSelect={() => setIntent(value)}
            onKeyDown={(e) => handleKey(e, idx)}
          />
        ))}
      </div>

      <Collapsible open={unsureOpen} onOpenChange={setUnsureOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="self-start rounded-sm font-serif text-[13px] italic text-pm-clay underline underline-offset-4 decoration-pm-clay/40 transition-colors hover:text-pm-clay-deep hover:decoration-pm-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
          >
            {t('wizard.q1.unsureLink')}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent
          className={cn(
            'mt-4 overflow-hidden',
            'data-[state=open]:animate-accordion-down',
            'data-[state=closed]:animate-accordion-up',
          )}
        >
          <ul className="flex flex-col gap-3 border-l border-pm-clay/30 pl-4 text-[13px] leading-relaxed text-pm-ink-mid">
            {INTENT_VALUES.map((value) => (
              <li key={value}>
                <span className="font-sans font-medium text-pm-ink">
                  {t(`wizard.q1.options.${INTENT_TO_I18N[value]}.label`)}.
                </span>{' '}
                {t(`wizard.q1.unsureBody.${INTENT_TO_I18N[value]}`)}
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>

      <div className="mt-12 flex items-center justify-end gap-4">
        <span className="font-mono text-[12px] italic text-pm-ink-mute2">
          {t('wizard.progress.of', { current: 1, total: 2 })}
        </span>
        <button
          type="button"
          disabled={!canContinue}
          aria-disabled={!canContinue}
          onClick={advance}
          className={cn(
            'inline-flex h-11 items-center justify-center px-5 font-sans text-[14px] tracking-tight transition-all duration-soft ease-soft',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper',
            canContinue
              ? 'bg-pm-clay text-pm-paper hover:bg-pm-clay-deep'
              : 'cursor-not-allowed bg-pm-ink/15 text-pm-paper/80',
          )}
        >
          {t('wizard.q1.continue')}
        </button>
      </div>
    </div>
  )
}
