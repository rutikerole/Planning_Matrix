import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { m, useReducedMotion } from 'framer-motion'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import { PaperSheet } from '@/components/shared/PaperSheet'
import { WizardProgress } from './WizardProgress'
import { ConfirmDialog } from './ConfirmDialog'
import { useWizardState } from '../hooks/useWizardState'

interface Props {
  step: 1 | 2
  totalSteps?: number
  children: ReactNode
}

/**
 * Phase 3.3 #48 — wizard shell rebuilt around the shared atelier
 * vocabulary. The full-bleed paper background, the cancel-confirm
 * choreography, and the cross-fade between steps are unchanged. What
 * shipped here:
 *
 *   • Inline `BlueprintReveal` removed; mounts shared
 *     `<BlueprintSubstrate lensRadius={220} breathing={false} driftPx={0} />`
 *     instead. One source of truth across chat workspace + dashboard
 *     + wizard.
 *   • Step children now wrap in a `<PaperSheet>` so the wizard reads
 *     as a sheet of paper sitting on the substrate, not a bare canvas.
 *   • Footer progress meter is `<WizardProgress>` — Roman numerals on
 *     a 64px hairline rule, replacing the breath-dot pattern.
 */
export function WizardShell({ step, totalSteps = 2, children }: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const reset = useWizardState((s) => s.reset)
  const reduced = useReducedMotion()
  const [cancelOpen, setCancelOpen] = useState(false)

  useEffect(() => {
    document.title = t('wizard.title')
    document.documentElement.lang = i18n.resolvedLanguage ?? 'de'
  }, [t, i18n.resolvedLanguage])

  const handleCancelClick = () => setCancelOpen(true)
  const handleCancelDismiss = () => setCancelOpen(false)
  const handleCancelConfirm = () => {
    setCancelOpen(false)
    reset()
    navigate('/dashboard', { replace: true })
  }

  return (
    <m.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-dvh bg-paper relative isolate flex flex-col"
    >
      {/* Shared atelier substrate — calmer settings on the wizard so the
       * headline + paper card stay the focal point. */}
      <BlueprintSubstrate lensRadius={220} breathing={false} driftPx={0} />

      <header className="relative z-10 px-4 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex h-16 md:h-[72px] items-center justify-between gap-3">
          <Wordmark size="sm" />
          <div className="flex items-center gap-3 sm:gap-5">
            <LanguageSwitcher />
            <span
              className="hidden sm:block h-4 w-px bg-ink/20"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={handleCancelClick}
              className="text-[13px] font-medium text-ink/65 hover:text-ink transition-colors duration-soft px-2 py-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t('wizard.cancel')}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-start sm:items-center justify-center px-6 sm:px-10 pt-10 sm:pt-0 pb-24">
        <PaperSheet padded="md" className="w-full">
          {children}
        </PaperSheet>
      </main>

      <footer className="relative z-10 pb-10 flex items-center justify-center">
        <WizardProgress count={totalSteps} active={step} />
      </footer>

      <ConfirmDialog
        open={cancelOpen}
        title={t('wizard.cancelDialog.title')}
        body={t('wizard.cancelDialog.body')}
        confirmLabel={t('wizard.cancelDialog.confirm')}
        cancelLabel={t('wizard.cancelDialog.dismiss')}
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelDismiss}
      />
    </m.div>
  )
}
