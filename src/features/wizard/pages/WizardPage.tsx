import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { WizardShell } from '../components/WizardShell'
import { QuestionIntent } from '../components/QuestionIntent'
import { QuestionPlot } from '../components/QuestionPlot'
import { TransitionScreen } from '../components/TransitionScreen'
import { useWizardState } from '../hooks/useWizardState'
import { useCreateProject } from '../hooks/useCreateProject'

/**
 * Wizard root. Three visual states:
 *
 *   1. Asking Q1 (intent chips)
 *   2. Asking Q2 (plot toggle + address)
 *   3. Transitioning to chat (INSERT + priming + navigate)
 *
 * Step 1 ↔ 2 cross-fade; transition replaces the entire wizard so the
 * paper background carries through but the chrome falls away.
 */
export function WizardPage() {
  const step = useWizardState((s) => s.step)
  const reduced = useReducedMotion()
  const { submit, status, error } = useCreateProject()

  const transitioning =
    status === 'inserting' || status === 'priming' || status === 'navigating'

  if (transitioning) {
    return <TransitionScreen />
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
