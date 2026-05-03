import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { splitBold } from '@/lib/text'
import { useWizardState } from '../hooks/useWizardState'
import { INTENT_VALUES_V3, selectTemplate } from '../lib/selectTemplate'
import { SketchCard } from './SketchCard'
import './../styles/sketches.css'

/**
 * v3 Q1 — 8 sketch cards in a 4×2 grid (2×4 tablet, 1×8 mobile).
 * Hover any card and the secondary stroke draws in. Selected card
 * shows a clay accent dot top-left and pm-paper-tint background.
 *
 * Selection does NOT auto-advance. Continue button or Enter on a
 * focused card moves to Q2.
 */
export function QuestionIntent() {
  const { t } = useTranslation()
  const intent = useWizardState((s) => s.intent)
  const setIntent = useWizardState((s) => s.setIntent)
  const setStep = useWizardState((s) => s.setStep)
  const [helpOpen, setHelpOpen] = useState(false)
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])

  const advance = () => {
    if (intent !== null) setStep(2)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (idx + 1) % INTENT_VALUES_V3.length
      cardRefs.current[next]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (idx - 1 + INTENT_VALUES_V3.length) % INTENT_VALUES_V3.length
      cardRefs.current[prev]?.focus()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const target = INTENT_VALUES_V3[idx]
      setIntent(target)
      setTimeout(() => setStep(2), 0)
    }
  }

  const helpBody = t('wizard.q1.help.body')
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
        className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4"
      >
        {INTENT_VALUES_V3.map((value, idx) => (
          <SketchCard
            key={value}
            ref={(el) => {
              cardRefs.current[idx] = el
            }}
            intent={value}
            templateCode={selectTemplate(value)}
            selected={intent === value}
            onSelect={() => setIntent(value)}
            onKeyDown={(e) => handleKey(e, idx)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setHelpOpen((v) => !v)}
        aria-expanded={helpOpen}
        className="self-start rounded-sm font-serif text-[14px] italic text-pm-clay underline underline-offset-4 decoration-pm-clay/40 transition-colors hover:text-pm-clay-deep hover:decoration-pm-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
      >
        {t('wizard.q1.help.link')}
      </button>

      {helpOpen ? (
        <div className="border border-pm-hair bg-pm-paper-tint p-5 text-[13px] leading-relaxed text-pm-ink-mid">
          {helpBody.split('\n\n').map((para, i) => (
            <p key={i} className={cn(i > 0 && 'mt-3')}>
              {splitBold(para).map((part, j) =>
                part.bold ? (
                  <strong key={j} className="font-medium text-pm-ink">
                    {part.text}
                  </strong>
                ) : (
                  <span key={j}>{part.text}</span>
                ),
              )}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-end gap-4">
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
