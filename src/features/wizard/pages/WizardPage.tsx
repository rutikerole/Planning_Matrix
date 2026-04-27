import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { WizardShell } from '../components/WizardShell'
import { QuestionIntent } from '../components/QuestionIntent'
import { QuestionPlot } from '../components/QuestionPlot'
import { useWizardState } from '../hooks/useWizardState'

/**
 * Wizard root. Hosts the shell + the two questions, swapping between
 * them with a 300 ms cross-fade + 8 px y-shift. Reduced-motion users
 * see an instant swap. State (current step + answers) lives in
 * useWizardState and is sessionStorage-persisted.
 */
export function WizardPage() {
  const step = useWizardState((s) => s.step)
  const reduced = useReducedMotion()

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
          {step === 1 ? <QuestionIntent /> : <QuestionPlot />}
        </m.div>
      </AnimatePresence>
    </WizardShell>
  )
}
