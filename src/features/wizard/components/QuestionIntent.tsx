import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWizardState } from '../hooks/useWizardState'
import { INTENT_VALUES, type Intent } from '../lib/selectTemplate'

/**
 * I-01 — "Was möchten Sie bauen?" Six chips, single-select. Selecting
 * a chip immediately advances the wizard to step 2 via setIntent.
 *
 * Keyboard: Tab into the group, Arrow keys cycle focus across chips,
 * Enter or Space activates. aria-pressed reflects the *previously*
 * selected intent so a user returning via Zurück sees their answer.
 *
 * "Ich bin mir nicht sicher" expands an inline list of one-paragraph
 * explanations per option — calm, no marketing tone, restrained.
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

  return (
    <div className="flex flex-col gap-7">
      <p className="eyebrow inline-flex items-center text-foreground/65">
        <span className="accent-dot" aria-hidden="true" />
        {t('wizard.q1.eyebrow')}
      </p>

      <h1
        id="q1-headline"
        className="font-display text-display-3 md:text-display-2 text-ink leading-[1.05] -tracking-[0.02em]"
      >
        {t('wizard.q1.headline').replace(/[?]\s*$/, '')}
        <span className="text-clay">?</span>
      </h1>

      <p className="text-body-lg text-ink/70 leading-relaxed max-w-[28rem]">
        {t('wizard.q1.sub')}
      </p>

      <div
        role="group"
        aria-labelledby="q1-headline"
        className="flex flex-wrap gap-2"
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
                'px-4 h-10 rounded-sm border text-[13.5px] font-medium tracking-tight transition-colors duration-soft ease-soft',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isSelected
                  ? 'border-clay/60 bg-clay/[0.08] text-ink'
                  : 'border-border-strong/55 bg-paper text-ink/85 hover:border-ink/40 hover:bg-muted/40 hover:text-ink',
              )}
            >
              {t(`wizard.q1.options.${value}`)}
            </button>
          )
        })}
      </div>

      <div className="-mt-1">
        <button
          type="button"
          onClick={() => setUnsureOpen((v) => !v)}
          aria-expanded={unsureOpen}
          className="text-[13px] text-ink/60 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
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
            <ul className="flex flex-col gap-3 text-sm text-ink/75 leading-relaxed border-l-2 border-clay/30 pl-4">
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
