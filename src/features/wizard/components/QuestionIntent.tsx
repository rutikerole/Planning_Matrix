import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { splitBold } from '@/lib/text'
import { useWizardState } from '../hooks/useWizardState'
import { INTENT_VALUES_V3, selectTemplate } from '../lib/selectTemplate'
import { SketchCard } from './SketchCard'
import { useEventEmitter } from '@/hooks/useEventEmitter'
import './../styles/sketches.css'

/**
 * Phase 8.7.1 — Q1 restores tile parity. All 8 intents render in a
 * single 4×2 grid as full SketchCards (icon + label + T-XX code).
 * Phase 8.7 had split them into "4 primary tiles + 4 label-only
 * chips" which created an unintended tier-1/tier-2 hierarchy;
 * Demolition / Storey addition / Side extension / Something else
 * are real project types and warrant the same visual class.
 *
 * Viewport-fit is preserved by tightening the .sketch base metrics
 * in sketches.css (padding 24→16, SVG 120×80 → 96×64) so two rows
 * of 8 fit inside the WizardShell's flex lane at 1280×800.
 *
 * Selection still does NOT auto-advance. Continue button or Enter
 * on a focused tile moves to Q2.
 */
export function QuestionIntent() {
  const { t } = useTranslation()
  const intent = useWizardState((s) => s.intent)
  const setIntent = useWizardState((s) => s.setIntent)
  const setStep = useWizardState((s) => s.setStep)
  const [helpOpen, setHelpOpen] = useState(false)
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])
  const emit = useEventEmitter('wizard')

  const handleIntentSelect = (value: typeof INTENT_VALUES_V3[number]) => {
    emit(intent === null ? 'intent_selected' : 'intent_changed', {
      from: intent,
      to: value,
      template_id: selectTemplate(value),
    })
    setIntent(value)
  }

  const advance = () => {
    if (intent !== null) {
      emit('continue_clicked', { intent, template_id: selectTemplate(intent) })
      setStep(2)
    }
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
      emit(intent === null ? 'intent_selected' : 'intent_changed', {
        from: intent,
        to: target,
        template_id: selectTemplate(target),
        via: 'keyboard',
      })
      setIntent(target)
      setTimeout(() => {
        emit('continue_clicked', { intent: target, template_id: selectTemplate(target), via: 'keyboard' })
        setStep(2)
      }, 0)
    }
  }

  const helpBody = t('wizard.q1.help.body')
  const canContinue = intent !== null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
          {t('wizard.q1.eyebrow')}
        </p>
        <h1
          id="q1-headline"
          className="font-serif text-[clamp(2rem,4.4vw,3rem)] leading-[1.05] -tracking-[0.02em] text-pm-ink"
        >
          {t('wizard.q1.h').replace(/[?]\s*$/, '')}
          <span className="text-pm-clay">?</span>
        </h1>
        <p className="font-sans text-[15px] italic leading-relaxed text-pm-ink-mid max-w-[36rem]">
          {t('wizard.q1.sub')}
        </p>
      </header>

      <div
        role="radiogroup"
        aria-labelledby="q1-headline"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
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
            onSelect={() => handleIntentSelect(value)}
            onKeyDown={(e) => handleKey(e, idx)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          setHelpOpen((v) => {
            // Only emit when opening, not when closing — closing is
            // a navigation-back gesture, not a research signal.
            if (!v) emit('unsure_link_clicked')
            return !v
          })
        }}
        aria-expanded={helpOpen}
        className="self-start rounded-sm font-serif text-[13px] italic text-pm-clay underline underline-offset-4 decoration-pm-clay/40 transition-colors hover:text-pm-clay-deep hover:decoration-pm-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
      >
        {t('wizard.q1.help.link')}
      </button>

      {helpOpen ? (
        <div className="border border-pm-hair bg-pm-paper-tint p-4 text-[13px] leading-relaxed text-pm-ink-mid">
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

      {/* Phase 8.7 — sticky-bottom action row. mt-auto pushes it
          to the bottom of the WizardShell's flex-1 main lane so
          it stays in-viewport at 1280×800. The brief calls for
          "Question 1 of 2" left-aligned + Continue right-aligned. */}
      <div className="mt-auto flex items-center justify-between gap-4 pt-6">
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
