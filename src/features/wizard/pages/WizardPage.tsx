import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { WizardShell } from '../components/WizardShell'
import { QuestionIntent } from '../components/QuestionIntent'
import { QuestionPlot } from '../components/QuestionPlot'
import { LoaderScreen } from '@/features/loader/LoaderScreen'
import { useWizardState } from '../hooks/useWizardState'
import { useCreateProject } from '../hooks/useCreateProject'
import { selectTemplate } from '../lib/selectTemplate'

/**
 * Wizard root. Three visual states:
 *   1. Q1 (8 sketch cards)
 *   2. Q2 (plot toggle + address + map + sidebar)
 *   3. Loader (INSERT + priming + handoff to /projects/:id)
 *
 * Q1 ↔ Q2 cross-fade; loader replaces the wizard entirely so the
 * paper background carries through but the chrome falls away.
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

  if (isInFlight) {
    const templateId = intent ? selectTemplate(intent) : 'T-01'
    return (
      <LoaderScreen
        projectId={projectId}
        primed={primed}
        failed={failed}
        templateId={templateId}
        intent={intent}
        plotAddress={plotAddress}
        onCancel={async () => {
          await cancelInFlight()
          reset()
        }}
      />
    )
  }

  return (
    <WizardShell step={step}>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={step}
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
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
