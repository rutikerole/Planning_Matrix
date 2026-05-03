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
import type { TemplateId } from '@/types/projectState'
import { INTENT_LABELS, type Intent } from '@/features/wizard/lib/selectTemplate'
import { extractStreetName, extractCity } from '@/lib/addressParse'

interface Props {
  /** Provided once the project row has been INSERTed. Null while inserting. */
  projectId: string | null
  /** True once the chat-turn priming call returns successfully. */
  primed: boolean
  /** True if INSERT or priming failed fatally. */
  failed: boolean
  /** Cancel handler — should delete the in-flight project (if any) and route home. */
  onCancel: () => void | Promise<void>
  /** Drives DraftingBoard archetype + template-name substitution in status copy. */
  templateId?: TemplateId
  /** Drives the {{template}} placeholder in step 1. */
  intent?: Intent | null
  /** Drives {{street}} (extracted) + {{city}} (postcode-derived). */
  plotAddress?: string | null
}

function cityFromAddress(addr: string | null | undefined): string {
  return extractCity(addr ?? '') ?? 'München'
}

/**
 * v3 loader screen between wizard submit and the chat workspace.
 * Replaces TransitionScreen. Drafting-board cinema + 3-segment
 * stepper + 6 cycling status lines with placeholder substitution.
 */
export function LoaderScreen({
  projectId,
  primed,
  failed,
  onCancel,
  templateId = 'T-01',
  intent,
  plotAddress,
}: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [cancelOpen, setCancelOpen] = useState(false)

  const { fills, messageIndex, phase } = useLoaderProgress({
    primed: primed && projectId !== null,
    failed,
    messageCount: 6,
    messagePeriodMs: 1100,
  })

  // Navigate when:
  //   • phase === 'completed' (the happy path) AND we have a projectId
  //   • phase === 'failed' AND we have a projectId — i.e. the INSERT
  //     succeeded but priming was slow / errored / timed out. The
  //     workspace at /projects/:id handles its own first-turn
  //     loading state, so the loader never blocks the user past the
  //     6 s timeout. FailState only renders when projectId is null
  //     (true INSERT failure — there is genuinely nothing to fall
  //     back to).
  //   • Reduced motion: navigate as soon as primed (skip the
  //     finalHold + sprint cinematic).
  useEffect(() => {
    if (!projectId) return
    if (reduced && primed) {
      navigate(`/projects/${projectId}`, { replace: true })
      return
    }
    if (phase === 'completed' || phase === 'failed') {
      navigate(`/projects/${projectId}`, { replace: true })
    }
  }, [phase, primed, reduced, projectId, navigate])

  useEffect(() => {
    const prev = document.title
    document.title = `${t('loader.h').replace(/\.$/, '')} · Planning Matrix`
    return () => {
      document.title = prev
    }
  }, [t])

  // FailState ONLY when there's nothing to navigate to (true INSERT
  // failure). When projectId exists, the navigate effect above
  // handles the handoff and the workspace shows its own state.
  if (phase === 'failed' && !projectId) {
    return (
      <FailState
        projectId={projectId}
        templateId={templateId}
        onBack={onCancel}
      />
    )
  }

  // Compose placeholders.
  const lang = i18n.language?.startsWith('en') ? 'en' : 'de'
  const templateLabel = intent
    ? INTENT_LABELS[intent][lang]
    : INTENT_LABELS.sonstige[lang]
  const street = extractStreetName(plotAddress ?? '') ?? 'Ihrem Standort'
  const city = cityFromAddress(plotAddress)
  const article = '58'
  const klass = '3'

  const stepLabels = [
    t('loader.steps.s1', { template: templateLabel }),
    t('loader.steps.s2', { street }),
    t('loader.steps.s3', { article, class: klass }),
    t('loader.steps.s4', { city }),
    t('loader.steps.s5'),
    t('loader.steps.s6'),
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
          <DraftingBoard templateId={templateId} animate />

          <div className="flex flex-col items-center gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
              {t('loader.eyebrow')}
            </p>

            <h1 className="font-serif text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] -tracking-[0.02em] text-pm-ink">
              {t('loader.h').replace(/\.$/, '')}
              <span className="text-pm-clay">.</span>
            </h1>
          </div>

          <div className="relative h-6 w-full max-w-[520px] overflow-hidden text-center">
            <AnimatePresence mode="wait" initial={false}>
              <m.p
                key={messageIndex}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: reduced ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-x-0 top-0 font-serif text-[16px] italic leading-relaxed text-pm-ink-mid"
              >
                {stepLabels[messageIndex]}
              </m.p>
            </AnimatePresence>
          </div>

          <Stepper fills={reduced ? [1, 1, 1] : fills} className="mt-4" />
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
  templateId,
  onBack,
}: {
  projectId: string | null
  templateId: TemplateId
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
        <DraftingBoard templateId={templateId} />

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
