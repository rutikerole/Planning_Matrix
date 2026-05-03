import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWizardState } from '../hooks/useWizardState'
import { isMuenchenAddress, isPlotAddressValid } from '../lib/plotValidation'
import type { Intent } from '../lib/selectTemplate'
import { BPlanCheck } from './BPlanCheck'
import type { BplanLookupResult } from '@/types/bplan'

const PlotMap = lazy(() =>
  import('./PlotMap/PlotMap').then((mod) => ({ default: mod.PlotMap })),
)

interface Props {
  onSubmit: (input: {
    intent: Intent
    hasPlot: boolean
    plotAddress: string | null
    bplanResult: BplanLookupResult | null
  }) => Promise<void> | void
  submitError: string | null
}

/**
 * Q2 — plot. Yes/No, address input with hairline-bottom border, the
 * BPlanCheck pill, and the map. Out-of-coverage addresses produce a
 * soft note rather than a hard error — the user can still proceed.
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
  const [bplanResult, setBplanResult] = useState<BplanLookupResult | null>(null)
  const [bplanLoading, setBplanLoading] = useState(false)

  useEffect(() => {
    if (hasPlot === true && !plotAddress) {
      addressInputRef.current?.focus()
    }
  }, [hasPlot, plotAddress])

  const addressValid = isPlotAddressValid(plotAddress)
  const addressInMuenchen = isMuenchenAddress(plotAddress)
  const showFormatError = touched && hasPlot === true && !addressValid
  const showOutsideCoverage = hasPlot === true && addressValid && !addressInMuenchen

  // Outside-coverage is a SOFT note (brief): user can still submit.
  // Only the format-floor blocks submit.
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
      bplanResult,
    })
  }

  const handleAddressKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
          {t('wizard.q2.eyebrow')}
        </p>
        <h1
          id="q2-headline"
          className="font-serif text-[clamp(2.5rem,6vw,4rem)] leading-[1.05] -tracking-[0.02em] text-pm-ink"
        >
          {t('wizard.q2.h').replace(/[?]\s*$/, '')}
          <span className="text-pm-clay">?</span>
        </h1>
        <p className="font-sans text-[17px] italic leading-relaxed text-pm-ink-mid max-w-[36rem]">
          {t('wizard.q2.sub')}
        </p>
      </header>

      {/* Yes / No toggle */}
      <div role="radiogroup" aria-labelledby="q2-headline" className="flex gap-3">
        {[true, false].map((value) => {
          const isSelected = hasPlot === value
          return (
            <button
              key={String(value)}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                setPlotChoice(value)
                if (value === false) setTouched(false)
              }}
              className={cn(
                'group relative inline-flex items-center gap-2 border bg-pm-paper px-6 py-3 font-sans text-[14px] tracking-tight transition-colors duration-soft ease-soft',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper',
                isSelected
                  ? 'border-pm-clay-soft bg-pm-paper-tint text-pm-ink'
                  : 'border-pm-hair text-pm-ink-mid hover:border-pm-hair-strong hover:text-pm-ink',
              )}
            >
              {isSelected ? (
                <span aria-hidden="true" className="block size-1.5 rounded-full bg-pm-clay" />
              ) : null}
              <span>{t(value ? 'wizard.q2.yes' : 'wizard.q2.no')}</span>
            </button>
          )
        })}
      </div>

      {/* Yes path */}
      <AnimatePresence initial={false}>
        {hasPlot === true && (
          <m.div
            key="yes"
            initial={reduced ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="plot-address"
                  className="font-mono text-[10px] uppercase tracking-[0.20em] text-pm-clay"
                >
                  {t('wizard.q2.addressLabel')}
                </label>
                <input
                  id="plot-address"
                  ref={addressInputRef}
                  type="text"
                  inputMode="text"
                  autoComplete="street-address"
                  placeholder={t('wizard.q2.placeholder')}
                  value={plotAddress}
                  onChange={(e) => setPlotAddress(e.target.value)}
                  onBlur={() => setTouched(true)}
                  onKeyDown={handleAddressKey}
                  aria-invalid={showFormatError || undefined}
                  aria-describedby="plot-address-helper"
                  className={cn(
                    'w-full border-0 border-b bg-transparent py-2.5 font-sans text-[17px] text-pm-ink transition-colors duration-soft placeholder:text-pm-ink-mute2',
                    'focus:outline-none focus:ring-0',
                    showFormatError
                      ? 'border-pm-clay-deep/70 focus:border-pm-clay-deep'
                      : 'border-pm-ink/25 focus:border-pm-clay',
                  )}
                />
                <p
                  id="plot-address-helper"
                  className="font-serif text-[13px] italic leading-relaxed text-pm-clay"
                >
                  {t('wizard.q2.helper')}
                </p>
                <p className="font-mono text-[12px] leading-relaxed text-pm-ink-mute2">
                  {t('wizard.q2.coverage')}
                </p>
                {showOutsideCoverage ? (
                  <p
                    role="status"
                    className="font-serif text-[14px] italic leading-relaxed text-pm-clay"
                  >
                    {t('wizard.q2.outsideCoverage')}
                  </p>
                ) : null}
              </div>

              {/* B-Plan pill — sits above the map */}
              {plotAddress.trim().length >= 6 ? (
                <BPlanCheck result={bplanResult} isLoading={bplanLoading} />
              ) : null}

              {/* Map hint + map */}
              {plotAddress.trim().length >= 6 ? (
                <>
                  <p className="font-sans text-[13px] italic leading-relaxed text-pm-ink-mid">
                    {t('wizard.q2.mapHint')}
                  </p>
                  <Suspense
                    fallback={
                      <div className="pm-plotmap-empty">Karte wird geladen…</div>
                    }
                  >
                    <PlotMap
                      address={plotAddress}
                      onAddressChange={setPlotAddress}
                      onBplanResolved={setBplanResult}
                      onBplanLoadingChange={setBplanLoading}
                    />
                  </Suspense>
                </>
              ) : null}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* No path */}
      <AnimatePresence initial={false}>
        {hasPlot === false && (
          <m.div
            key="no"
            initial={reduced ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 max-w-[34rem] border border-pm-hair bg-pm-paper-tint p-4">
              <p className="font-sans text-[14px] leading-relaxed text-pm-ink-mid">
                {t('wizard.q2.noPlot')}
              </p>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {submitError ? (
        <p
          role="alert"
          className="border-l-2 border-pm-clay-deep/40 py-1 pl-4 font-sans text-[13px] leading-relaxed text-pm-clay-deep"
        >
          {submitError}
        </p>
      ) : null}

      <div className="mt-16 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBackToQ1}
          className="rounded-sm font-serif text-[13px] italic text-pm-clay underline underline-offset-4 decoration-pm-clay/40 transition-colors hover:text-pm-clay-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
        >
          ← {t('wizard.back')}
        </button>

        <div className="flex items-center gap-4">
          <span className="font-mono text-[12px] italic text-pm-ink-mute2">
            {t('wizard.progress.of', { current: 2, total: 2 })}
          </span>
          <button
            type="button"
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
            onClick={handleSubmit}
            className={cn(
              'inline-flex h-11 items-center justify-center px-5 font-sans text-[14px] tracking-tight transition-all duration-soft ease-soft',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper',
              canSubmit
                ? 'bg-pm-clay text-pm-paper hover:bg-pm-clay-deep'
                : 'cursor-not-allowed bg-pm-ink/15 text-pm-paper/80',
            )}
          >
            {t('wizard.q2.submit')} →
          </button>
        </div>
      </div>
    </div>
  )
}
