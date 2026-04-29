import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWizardState } from '../hooks/useWizardState'
import { isErlangenAddress, isPlotAddressValid } from '../lib/plotValidation'
import type { Intent } from '../lib/selectTemplate'
import { WizardTitleBlock } from './WizardTitleBlock'

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
 * Phase 3.3 #48 — Q2 redesigned to live inside the wizard's paper card.
 *
 * Title block (eyebrow + Roman II + headline + sub) sits above the
 * Yes/No paper-tab toggle. Address input keeps its hairline-bottom
 * vocabulary (already aligned with chat workspace + auth) but the
 * focus-state border switches from clay → ink (#49 will re-align that
 * to drafting-blue across the product). Notice copy moves to italic
 * Serif clay register on the no-plot path.
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

  useEffect(() => {
    if (hasPlot === true && !plotAddress) {
      addressInputRef.current?.focus()
    }
  }, [hasPlot, plotAddress])

  const addressValid = isPlotAddressValid(plotAddress)
  // Phase 1 (post-audit) — v1 scope locked to Erlangen postcodes
  // (91052 / 91054 / 91056 / 91058). The format check is the first
  // floor; the Erlangen check is layered on top so the user sees a
  // helpful, calm out-of-scope notice rather than a generic
  // "Adresse ungültig". `addressInErlangen` is only consulted when
  // the format-floor passes — otherwise the existing format error
  // takes precedence.
  const addressInErlangen = isErlangenAddress(plotAddress)
  const showAddressError = touched && hasPlot === true && !addressValid
  const showOutOfErlangenError =
    touched && hasPlot === true && addressValid && !addressInErlangen
  const canSubmit =
    intent !== null &&
    (hasPlot === false ||
      (hasPlot === true && addressValid && addressInErlangen))

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

  const headline = t('wizard.q2.headline').replace(/[?]\s*$/, '')

  return (
    <div className="flex flex-col gap-7">
      <WizardTitleBlock
        numeral="II"
        eyebrowKey="wizard.q2.eyebrow"
        headline={headline}
        punct="?"
        sub={t('wizard.q2.sub')}
        headlineId="q2-headline"
      />

      {/* Ja / Nein paper-tab toggle */}
      <div role="group" aria-labelledby="q2-headline" className="flex gap-2.5">
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
                'group relative inline-flex items-center gap-2 px-6 py-3 rounded-[2px] border text-[14px] font-medium tracking-tight',
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
              <span
                aria-hidden="true"
                className={cn(
                  'block size-1.5 rounded-full shrink-0 transition-colors duration-soft',
                  isSelected ? 'bg-clay' : 'bg-transparent',
                )}
              />
              <span>{t(value ? 'wizard.q2.yes' : 'wizard.q2.no')}</span>
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
              <label
                htmlFor="plot-address"
                className="text-[10px] font-medium uppercase tracking-[0.20em] text-clay/85"
              >
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
                aria-invalid={showAddressError || showOutOfErlangenError || undefined}
                aria-describedby={
                  showAddressError || showOutOfErlangenError
                    ? 'plot-address-error'
                    : 'plot-address-helper'
                }
                className={cn(
                  'w-full bg-transparent border-0 border-b py-2.5 text-[16px] text-ink placeholder:text-ink/35 transition-colors duration-soft',
                  'focus:outline-none focus:ring-0',
                  showAddressError
                    ? 'border-destructive/70 focus:border-destructive'
                    : 'border-ink/25 focus:border-drafting-blue/60',
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
              ) : showOutOfErlangenError ? (
                <div
                  id="plot-address-error"
                  role="alert"
                  className="flex flex-col gap-1.5 text-[12px] leading-relaxed border-l-2 border-destructive/40 pl-4 py-1"
                >
                  <p className="text-destructive font-medium">
                    {t('wizard.q2.errorOutOfErlangen.title')}
                  </p>
                  <p className="text-destructive/85">
                    {t('wizard.q2.errorOutOfErlangen.body')}
                  </p>
                </div>
              ) : (
                <p
                  id="plot-address-helper"
                  className="font-serif italic text-[12px] text-clay/85 leading-relaxed"
                >
                  {t('wizard.q2.addressHelper')}
                </p>
              )}
              {/* Phase 1 — always-on scope hint sits below the helper /
                * error so users know the v1 city scope before they ever
                * get an out-of-scope error. Calm clay register, mirrors
                * the existing italic Serif vocabulary. */}
              <p
                className="font-serif italic text-[11px] text-clay/72 leading-relaxed"
                aria-live="off"
              >
                {t('wizard.q2.erlangenScopeNotice')}
              </p>
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
            <p className="font-serif italic text-[13px] text-clay-deep leading-relaxed border-l border-clay/35 pl-4 py-1 max-w-[34rem]">
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

      {/* Back + submit row.
       * Mobile: stacked column with full-width 48 px primary submit on
       * top (thumb-reach + Apple HIG primary-action floor) and the
       * back-link below. Desktop unchanged. */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={goBackToQ1}
          className="self-center sm:self-auto min-h-[44px] inline-flex items-center font-serif italic text-[13px] text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          ← {t('wizard.back')}
        </button>

        <button
          type="button"
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
          onClick={handleSubmit}
          className={cn(
            'group inline-flex items-center justify-center gap-2 w-full sm:w-auto h-12 sm:h-11 px-5 rounded-[5px] text-[14px] font-medium tracking-tight transition-[background-color,color,box-shadow,transform,opacity] duration-soft ease-soft',
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
