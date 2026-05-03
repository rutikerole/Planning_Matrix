import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { m, useReducedMotion } from 'framer-motion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import { ProgressHairline } from './ProgressHairline'
import { useWizardState } from '../hooks/useWizardState'

interface Props {
  step: 1 | 2
  children: ReactNode
}

/**
 * Wizard shell. Sticky top bar (wordmark + DE/EN + Cancel), top hairline
 * progress (replaces the old footer Roman-numeral dots), and a centred
 * max-w-3xl content region. Cancel is wired to a shadcn AlertDialog.
 */
export function WizardShell({ step, children }: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const reset = useWizardState((s) => s.reset)
  const reduced = useReducedMotion()
  const [cancelOpen, setCancelOpen] = useState(false)

  useEffect(() => {
    document.title = t('wizard.title')
    document.documentElement.lang = i18n.resolvedLanguage ?? 'de'
  }, [t, i18n.resolvedLanguage])

  return (
    <m.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative isolate flex min-h-dvh flex-col bg-pm-paper"
    >
      <BlueprintSubstrate lensRadius={220} breathing={false} driftPx={0} />

      <header className="relative z-10 px-4 pt-safe sm:px-10 lg:px-14 xl:px-20">
        <div className="flex h-16 items-center justify-between gap-3 md:h-[72px]">
          <Wordmark />
          <div className="flex items-center gap-3 sm:gap-5">
            <LanguageSwitcher />
            <span aria-hidden="true" className="hidden h-4 w-px bg-pm-ink/20 sm:block" />
            <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center rounded-sm px-2 py-1.5 font-sans text-[13px] font-medium text-pm-ink-mid transition-colors hover:text-pm-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
                >
                  {t('wizard.cancel')}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('wizard.cancelConfirm.h')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('wizard.cancelConfirm.body')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setCancelOpen(false)}>
                    {t('wizard.cancelConfirm.cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setCancelOpen(false)
                      reset()
                      navigate('/dashboard', { replace: true })
                    }}
                  >
                    {t('wizard.cancelConfirm.ok')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Top hairline progress */}
        <div className="mt-8">
          <ProgressHairline current={step} total={2} />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-6 py-16">
        <div className="w-full max-w-3xl">{children}</div>
      </main>
    </m.div>
  )
}
