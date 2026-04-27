import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { m, useReducedMotion } from 'framer-motion'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'
import { ProgressDots } from './ProgressDots'
import { ConfirmDialog } from './ConfirmDialog'
import { useWizardState } from '../hooks/useWizardState'

interface Props {
  step: 1 | 2
  totalSteps?: number
  children: ReactNode
}

/**
 * The shared chrome around the wizard's two questions. Full-bleed paper
 * background (intentionally distinct from the landing page's editorial
 * scroll and the auth split-screen — this is a focused workshop moment).
 * A subtle blueprint hairline grid breathes under the cursor; everything
 * else is restraint.
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
      <BlueprintReveal />

      <header className="relative z-10 px-4 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex h-16 md:h-[72px] items-center justify-between gap-3">
          <Wordmark size="sm" />
          <div className="flex items-center gap-3 sm:gap-5">
            <LanguageSwitcher />
            <span
              className="hidden sm:block h-4 w-px bg-border-strong/55"
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
        <div className="w-full max-w-[36rem]">{children}</div>
      </main>

      <footer className="relative z-10 pb-10 flex items-center justify-center">
        <ProgressDots count={totalSteps} active={step} />
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

/**
 * Subtle blueprint grid (4.5% opacity ink hairlines, defined in
 * globals.css as .bg-blueprint) revealed under the cursor via a
 * radial-gradient mask. The background is otherwise blank paper —
 * the grid only appears as a soft halo around the pointer, fading
 * to nothing 220 px out. Reduced-motion suppresses the mask entirely.
 */
function BlueprintReveal() {
  const reduced = useReducedMotion()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (reduced) return
    const handler = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('pointermove', handler, { passive: true })
    return () => window.removeEventListener('pointermove', handler)
  }, [reduced])

  if (reduced || !pos) {
    return null
  }
  const mask = `radial-gradient(circle 220px at ${pos.x}px ${pos.y}px, rgba(0,0,0,0.55), transparent 80%)`
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 bg-blueprint pointer-events-none"
      style={{ WebkitMaskImage: mask, maskImage: mask }}
    />
  )
}
