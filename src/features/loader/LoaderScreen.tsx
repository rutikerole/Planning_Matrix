import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
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
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import { DraftingBoard } from './components/DraftingBoard'
import { Stepper } from './components/Stepper'
import { useLoaderProgress } from './hooks/useLoaderProgress'

interface Props {
  /** Provided once the project row has been INSERTed. Null while inserting. */
  projectId: string | null
  /** True once the chat-turn priming call returns successfully. */
  primed: boolean
  /** True if INSERT or priming failed fatally. */
  failed: boolean
  /** Cancel handler — should delete the in-flight project (if any) and route home. */
  onCancel: () => void | Promise<void>
}

/**
 * Loader screen between wizard submit and the chat workspace.
 * Replaces TransitionScreen. Shows the drafting-board illustration
 * (with stroke-draw motion on mount), a 3-segment stepper, and the
 * current step's label below.
 *
 * Holds for at least ~1.6 s (perceived effort) and at most 8 s
 * (timeout). When the backend reports the project is primed, the
 * stepper sprints to 100% and we navigate to /projects/:id.
 */
export function LoaderScreen({ projectId, primed, failed, onCancel }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [cancelOpen, setCancelOpen] = useState(false)

  const { fills, activeStep, phase } = useLoaderProgress({
    primed: primed && projectId !== null,
    failed,
  })

  // Navigate when the loader's phase reports completion.
  useEffect(() => {
    if (phase !== 'completed' || !projectId) return
    navigate(`/projects/${projectId}`, { replace: true })
  }, [phase, projectId, navigate])

  // Reduced motion: render all segments full immediately and navigate
  // as soon as the backend is ready.
  useEffect(() => {
    if (!reduced || !primed || !projectId) return
    navigate(`/projects/${projectId}`, { replace: true })
  }, [reduced, primed, projectId, navigate])

  // Document title
  useEffect(() => {
    const prev = document.title
    document.title = `${t('loader.h').replace(/\.$/, '')} · Planning Matrix`
    return () => {
      document.title = prev
    }
  }, [t])

  if (phase === 'failed') {
    return <FailState projectId={projectId} onBack={onCancel} />
  }

  const stepLabels = [
    t('loader.steps.s1'),
    t('loader.steps.s2'),
    t('loader.steps.s3'),
  ]

  return (
    <m.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative isolate flex min-h-dvh flex-col bg-pm-paper"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <BlueprintSubstrate lensRadius={220} breathing={false} driftPx={0} />

      <main className="relative z-10 flex flex-1 items-center justify-center px-6">
        <div className="flex w-full max-w-[34rem] flex-col items-center gap-8 text-center">
          <DraftingBoard animate />

          <div className="flex flex-col items-center gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
              {t('loader.eyebrow')}
            </p>

            <h1 className="font-serif text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] -tracking-[0.02em] text-pm-ink">
              {t('loader.h').replace(/\.$/, '')}
              <span className="text-pm-clay">.</span>
            </h1>
          </div>

          <Stepper fills={reduced ? [1, 1, 1] : fills} className="mt-2" />

          <div className="h-6">
            <AnimatePresence mode="wait" initial={false}>
              <m.p
                key={activeStep}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
                className="font-sans text-[15px] italic leading-relaxed text-pm-ink-mid"
              >
                {stepLabels[activeStep]}
              </m.p>
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="relative z-10 pb-10 text-center">
        <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="font-serif text-[13px] italic text-pm-clay underline underline-offset-4 decoration-pm-clay/40 transition-colors hover:text-pm-clay-deep hover:decoration-pm-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
            >
              {t('loader.cancel')}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('loader.cancelConfirm.h')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('loader.cancelConfirm.body')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCancelOpen(false)}>
                {t('loader.cancelConfirm.back')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setCancelOpen(false)
                  void onCancel()
                }}
              >
                {t('loader.cancelConfirm.ok')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </footer>
    </m.div>
  )
}

function FailState({
  projectId,
  onBack,
}: {
  projectId: string | null
  onBack: () => void | Promise<void>
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  return (
    <m.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.3 }}
      className="relative isolate flex min-h-dvh flex-col items-center justify-center bg-pm-paper px-6"
      role="alert"
    >
      <BlueprintSubstrate lensRadius={220} breathing={false} driftPx={0} />

      <div className="relative z-10 flex w-full max-w-[34rem] flex-col items-center gap-6 text-center">
        <DraftingBoard />

        <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-tight text-pm-ink">
          {t('loader.fail.h')}
        </h1>
        <p className="font-sans text-[15px] italic leading-relaxed text-pm-ink-mid">
          {t('loader.fail.sub')}
        </p>

        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {projectId ? (
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}`, { replace: true })}
              className="inline-flex items-center justify-center bg-pm-clay px-5 py-2.5 font-sans text-[14px] text-pm-paper transition-colors hover:bg-pm-clay-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
            >
              {t('loader.fail.open')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void onBack()}
            className="inline-flex items-center justify-center border border-pm-hair px-5 py-2.5 font-sans text-[14px] text-pm-ink transition-colors hover:bg-pm-paper-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
          >
            {t('loader.fail.back')}
          </button>
        </div>
      </div>
    </m.div>
  )
}
