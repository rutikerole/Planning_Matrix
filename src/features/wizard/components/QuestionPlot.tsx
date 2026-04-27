import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWizardState } from '../hooks/useWizardState'
import { isPlotAddressValid } from '../lib/plotValidation'
import type { Intent } from '../lib/selectTemplate'

interface Props {
  /** Submit handler — orchestrates INSERT + first-turn priming + navigate. */
  onSubmit: (input: {
    intent: Intent
    hasPlot: boolean
    plotAddress: string | null
  }) => Promise<void> | void
  /** Optional submit error from the orchestrator (e.g. INSERT failed). */
  submitError: string | null
}

/**
 * I-02 — "Haben Sie bereits ein Grundstück?". Two-pill toggle (Ja/Nein),
 * a conditional address input that slides in for "Ja", a calm clay
 * notice for "Nein". Primary CTA Projekt anlegen calls onSubmit when
 * valid; insert errors surface inline above the back/submit row. The
 * "submitting" visual state is owned by the wizard root, which swaps to
 * TransitionScreen the moment INSERT begins — QuestionPlot never sees
 * an in-flight state.
 */
export function QuestionPlot({ onSubmit, submitError }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const intent = useWizardState((s) => s.intent)
  const hasPlot = useWizardState((s) => s.hasPlot)
  const plotAddress = useWizardState((s) => s.plotAddress)
  const setPlotChoice = useWizardState((s) => s.setPlotChoice)
  const setPlotAddress = useWizardState((s) => s.setPlotAddress)
  const goBackToQ1 = useWizardState((s) => s.goBackToQ1)

  const addressInputRef = useRef<HTMLInputElement>(null)
  const [touched, setTouched] = useState(false)

  // Auto-focus the address input when the user first picks Ja and the
  // field is empty. We don't steal focus on every re-render of step 2.
  useEffect(() => {
    if (hasPlot === true && !plotAddress) {
      addressInputRef.current?.focus()
    }
  }, [hasPlot, plotAddress])

  const addressValid = isPlotAddressValid(plotAddress)
  const showAddressError = touched && hasPlot === true && !addressValid
  const canSubmit =
    intent !== null &&
    (hasPlot === false || (hasPlot === true && addressValid))

  const handleSubmit = () => {
    if (!intent) return
    if (!canSubmit) {
      setTouched(true)
      return
    }
    void onSubmit({
      intent,
      hasPlot: hasPlot === true,
      plotAddress: hasPlot === true ? plotAddress.trim() : null,
    })
  }

  return (
    <div className="flex flex-col gap-7">
      <p className="eyebrow inline-flex items-center text-foreground/65">
        <span className="accent-dot" aria-hidden="true" />
        {t('wizard.q2.eyebrow')}
      </p>

      <h1
        id="q2-headline"
        className="font-display text-display-3 md:text-display-2 text-ink leading-[1.05] -tracking-[0.02em]"
      >
        {t('wizard.q2.headline').replace(/[?]\s*$/, '')}
        <span className="text-clay">?</span>
      </h1>

      <p className="text-body-lg text-ink/70 leading-relaxed max-w-[28rem]">
        {t('wizard.q2.sub')}
      </p>

      {/* Ja / Nein pill toggle */}
      <div
        role="group"
        aria-labelledby="q2-headline"
        className="flex gap-2"
      >
        {[true, false].map((value) => {
          const isSelected = hasPlot === value
          return (
            <button
              key={String(value)}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setPlotChoice(value)
                if (value === false) setTouched(false)
              }}
              className={cn(
                'px-6 h-10 rounded-sm border text-[13.5px] font-medium tracking-tight transition-colors duration-soft ease-soft',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isSelected
                  ? 'border-clay/60 bg-clay/[0.08] text-ink'
                  : 'border-border-strong/55 bg-paper text-ink/85 hover:border-ink/40 hover:bg-muted/40 hover:text-ink',
              )}
            >
              {t(value ? 'wizard.q2.yes' : 'wizard.q2.no')}
            </button>
          )
        })}
      </div>

      {/* Ja → address input */}
      <AnimatePresence initial={false}>
        {hasPlot === true && (
          <m.div
            key="ja"
            initial={reduced ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="plot-address" className="sr-only">
                {t('wizard.q2.addressLabel')}
              </label>
              <input
                id="plot-address"
                ref={addressInputRef}
                type="text"
                inputMode="text"
                autoComplete="street-address"
                placeholder={t('wizard.q2.addressPlaceholder')}
                value={plotAddress}
                onChange={(e) => setPlotAddress(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={showAddressError || undefined}
                aria-describedby={
                  showAddressError ? 'plot-address-error' : 'plot-address-helper'
                }
                className={cn(
                  'w-full bg-transparent border-0 border-b py-2.5 text-[16px] text-ink placeholder:text-ink/35 transition-colors duration-soft',
                  'focus:outline-none focus:ring-0',
                  showAddressError
                    ? 'border-destructive/70 focus:border-destructive'
                    : 'border-border-strong/45 focus:border-ink',
                )}
              />
              {showAddressError ? (
                <p
                  id="plot-address-error"
                  role="alert"
                  className="text-[12px] text-destructive leading-relaxed"
                >
                  {t('wizard.q2.addressInvalid')}
                </p>
              ) : (
                <p
                  id="plot-address-helper"
                  className="text-[12px] text-clay/85 italic leading-relaxed"
                >
                  {t('wizard.q2.addressHelper')}
                </p>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Nein → notice */}
      <AnimatePresence initial={false}>
        {hasPlot === false && (
          <m.div
            key="nein"
            initial={reduced ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm text-clay/85 leading-relaxed border-l-2 border-clay/35 pl-4 py-1 max-w-[34rem]">
              {t('wizard.q2.noPlotNotice')}
            </p>
          </m.div>
        )}
      </AnimatePresence>

      {/* Inline submit error — INSERT failure surfaces here. */}
      {submitError && (
        <p
          role="alert"
          className="text-sm text-destructive/85 leading-relaxed border-l-2 border-destructive/40 pl-4 py-1"
        >
          {submitError}
        </p>
      )}

      {/* Back + submit row */}
      <div className="flex items-center justify-between gap-4 pt-2 flex-wrap">
        <button
          type="button"
          onClick={goBackToQ1}
          className="text-[13px] text-ink/60 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          ← {t('wizard.back')}
        </button>

        <button
          type="button"
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
          onClick={handleSubmit}
          className={cn(
            'group inline-flex items-center gap-2 h-11 px-5 rounded-[5px] text-[14px] font-medium tracking-tight transition-[background-color,color,box-shadow,transform,opacity] duration-soft ease-soft',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            canSubmit
              ? 'bg-ink text-paper hover:bg-ink/92 motion-safe:hover:-translate-y-px shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_2px_4px_-1px_hsl(220_15%_11%/0.18)] hover:shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_8px_18px_-6px_hsl(220_15%_11%/0.32)]'
              : 'bg-ink/25 text-paper/80 cursor-not-allowed',
          )}
        >
          {t('wizard.submit')}
        </button>
      </div>
    </div>
  )
}
