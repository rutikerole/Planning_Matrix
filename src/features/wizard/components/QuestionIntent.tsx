import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWizardState } from '../hooks/useWizardState'
import { INTENT_VALUES, type Intent } from '../lib/selectTemplate'
import { WizardTitleBlock } from './WizardTitleBlock'

/**
 * Phase 3.3 #48 — Q1 redesigned to live inside the wizard's paper card.
 *
 * Title block (eyebrow + Roman I + headline + sub) sits above the chip
 * grid. Chips are now paper-tab cards: paper bg with hairline border,
 * inset white-edge highlight, and on selection drafting-blue 12% fill
 * + drafting-blue 60% border + a flush-left clay dot prefix that
 * matches the spec-index "ACTIVE" marker (Polish-Move-1 vocabulary).
 *
 * Selecting a chip immediately advances the wizard to step 2 via
 * setIntent (unchanged behaviour). Keyboard nav unchanged: Tab into
 * the group, Arrow keys cycle focus, Enter/Space activates.
 */
export function QuestionIntent() {
  const { t } = useTranslation()
  const intent = useWizardState((s) => s.intent)
  const setIntent = useWizardState((s) => s.setIntent)
  const reduced = useReducedMotion()

  const [unsureOpen, setUnsureOpen] = useState(false)
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (idx + 1) % INTENT_VALUES.length
      chipRefs.current[next]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (idx - 1 + INTENT_VALUES.length) % INTENT_VALUES.length
      chipRefs.current[prev]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      chipRefs.current[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      chipRefs.current[INTENT_VALUES.length - 1]?.focus()
    }
  }

  const headline = t('wizard.q1.headline').replace(/[?]\s*$/, '')

  return (
    <div className="flex flex-col gap-7">
      <WizardTitleBlock
        numeral="I"
        eyebrowKey="wizard.q1.eyebrow"
        headline={headline}
        punct="?"
        sub={t('wizard.q1.sub')}
        headlineId="q1-headline"
      />

      <div
        role="group"
        aria-labelledby="q1-headline"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1"
      >
        {INTENT_VALUES.map((value, idx) => {
          const isSelected = intent === value
          return (
            <button
              key={value}
              ref={(el) => {
                chipRefs.current[idx] = el
              }}
              type="button"
              onClick={() => handleSelect(value, setIntent)}
              onKeyDown={(e) => handleKey(e, idx)}
              aria-pressed={isSelected}
              className={cn(
                'group relative flex items-center gap-2 px-5 py-4 rounded-[2px] border text-left text-[14px] font-medium tracking-tight',
                'transition-[background-color,color,border-color,transform,box-shadow] duration-soft ease-soft',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isSelected
                  ? 'border-drafting-blue/60 bg-drafting-blue/[0.12] text-ink'
                  : 'border-ink/15 bg-paper text-ink/85 hover:border-ink/30 hover:bg-drafting-blue/[0.05] hover:text-ink motion-safe:hover:-translate-y-px',
              )}
              style={{
                boxShadow: isSelected
                  ? 'inset 0 1px 0 hsl(0 0% 100% / 0.55)'
                  : 'inset 0 1px 0 hsl(0 0% 100% / 0.6)',
              }}
            >
              {/* Selection dot — clay filled circle, matches the
               * left-rail spec-index ACTIVE marker. Renders only when
               * selected so unselected chips stay clean. */}
              <span
                aria-hidden="true"
                className={cn(
                  'block size-1.5 rounded-full shrink-0 transition-colors duration-soft',
                  isSelected ? 'bg-clay' : 'bg-transparent',
                )}
              />
              <span>{t(`wizard.q1.options.${value}`)}</span>
            </button>
          )
        })}
      </div>

      <div className="-mt-1">
        <button
          type="button"
          onClick={() => setUnsureOpen((v) => !v)}
          aria-expanded={unsureOpen}
          className="font-serif italic text-[12px] text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          {t('wizard.q1.unsureLink')}
        </button>

        {unsureOpen && (
          <m.div
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden mt-4"
          >
            <ul className="flex flex-col gap-3 text-[13px] text-ink/75 leading-relaxed border-l border-clay/35 pl-4">
              {INTENT_VALUES.map((value) => (
                <li key={value}>
                  <span className="font-medium text-ink">
                    {t(`wizard.q1.options.${value}`)}.
                  </span>{' '}
                  {t(`wizard.q1.unsureExplanation.${value}`)}
                </li>
              ))}
            </ul>
          </m.div>
        )}
      </div>
    </div>
  )
}

function handleSelect(value: Intent, setIntent: (i: Intent) => void) {
  setIntent(value)
}
