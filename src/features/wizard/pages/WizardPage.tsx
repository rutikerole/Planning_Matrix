import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { WizardShell } from '../components/WizardShell'
import { QuestionIntent } from '../components/QuestionIntent'
import { QuestionPlot } from '../components/QuestionPlot'
import { AtelierOpening } from '@/features/loader/AtelierOpening'
import { useWizardState } from '../hooks/useWizardState'
import { useCreateProject } from '../hooks/useCreateProject'
import { selectTemplate } from '../lib/selectTemplate'
import { useEventEmitter } from '@/hooks/useEventEmitter'

const WIZARD_ENTRY_KEY = 'pm.wizard.entryKey'

/**
 * Wizard root. Three visual states:
 *   1. Q1 (8 sketch cards)
 *   2. Q2 (plot toggle + address + map + sidebar)
 *   3. Atelier opening (5-second roundtable assemble + handoff to
 *      /projects/:id) — Phase 8.7.2 replaced the prior LoaderScreen
 *      drafting-board cinema with this transition.
 *
 * Q1 ↔ Q2 cross-fade; atelier opening replaces the wizard entirely
 * so the paper background carries through but the chrome falls away.
 */
export function WizardPage() {
  const step = useWizardState((s) => s.step)
  const intent = useWizardState((s) => s.intent)
  const plotAddress = useWizardState((s) => s.plotAddress)
  const reset = useWizardState((s) => s.reset)
  const reduced = useReducedMotion()
  const {
    submit,
    cancelInFlight,
    isInFlight,
    primed,
    failed,
    projectId,
    error,
  } = useCreateProject()
  const emit = useEventEmitter('wizard')
  const location = useLocation()

  // Reset the wizard whenever the user enters via a fresh navigation
  // (dashboard "+ New project", command palette, direct URL paste, etc.)
  // so they always land on Q1. A browser refresh preserves the same
  // location.key (rehydrated from history.state), so the existing
  // refresh-mid-flow behavior still restores Q2 with prior input.
  // Stored in sessionStorage to survive React 18 Strict-Mode double-mount
  // — the second mount sees the key already saved and no-ops.
  useEffect(() => {
    const savedKey = sessionStorage.getItem(WIZARD_ENTRY_KEY)
    if (savedKey !== location.key) {
      reset()
      sessionStorage.setItem(WIZARD_ENTRY_KEY, location.key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Phase 9.2 — wizard.opened fires once on mount.
  const openedFired = useRef(false)
  useEffect(() => {
    if (openedFired.current) return
    openedFired.current = true
    emit('opened')
  }, [emit])

  // Phase 9.2 — submit_succeeded fires when projectId resolves.
  const succeededFired = useRef(false)
  useEffect(() => {
    if (projectId && !succeededFired.current) {
      succeededFired.current = true
      emit('submit_succeeded', {
        project_id: projectId,
        template_id: intent ? selectTemplate(intent) : null,
      })
    }
  }, [projectId, intent, emit])

  // Phase 9.2 — submit_failed when useCreateProject reports failure.
  const failedFired = useRef(false)
  useEffect(() => {
    if (failed && !failedFired.current) {
      failedFired.current = true
      emit('submit_failed', {
        error_class: (error as { code?: string } | null)?.code ?? 'unknown',
        error_message: (error as Error | null)?.message ?? null,
      })
    }
  }, [failed, error, emit])

  if (isInFlight) {
    const templateId = intent ? selectTemplate(intent) : 'T-01'
    return (
      <AtelierOpening
        projectId={projectId}
        primed={primed}
        failed={failed}
        templateId={templateId}
        intent={intent}
        plotAddress={plotAddress}
        onCancel={async () => {
          emit('cancel_clicked', { project_id: projectId, primed, failed })
          await cancelInFlight()
          reset()
        }}
      />
    )
  }

  return (
    <WizardShell step={step}>
      {/* Phase 8.7 — the wrapper m.div now claims flex-1 + min-h-0
          so the step's flex-col layout can chain mt-auto to the
          bottom of the lane (sticky action row in step 1). */}
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={step}
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 min-h-0 flex-col"
        >
          {step === 1 ? (
            <QuestionIntent />
          ) : (
            <QuestionPlot onSubmit={submit} submitError={error} />
          )}
        </m.div>
      </AnimatePresence>
    </WizardShell>
  )
}
