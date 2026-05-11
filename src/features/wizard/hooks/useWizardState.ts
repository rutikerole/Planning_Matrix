import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Intent } from '../lib/selectTemplate'
import type { BundeslandCode } from '@/legal/states/_types'

export type WizardStep = 1 | 2

interface WizardState {
  step: WizardStep
  intent: Intent | null
  hasPlot: boolean | null
  plotAddress: string
  /** v1.0.6 (Bug 0 — B04 surgical mitigation) — explicit Bundesland
   *  selection in the wizard. Defaults to 'bayern' so existing München
   *  flows are unchanged. Persisted alongside the other answers. */
  bundesland: BundeslandCode

  setStep: (step: WizardStep) => void
  setIntent: (intent: Intent) => void
  setPlotChoice: (hasPlot: boolean) => void
  setPlotAddress: (address: string) => void
  setBundesland: (bundesland: BundeslandCode) => void
  goBackToQ1: () => void
  reset: () => void
}

const initialState = {
  step: 1 as WizardStep,
  intent: null,
  hasPlot: null,
  plotAddress: '',
  bundesland: 'bayern' as BundeslandCode,
}

/**
 * Wizard answers persist across refreshes via sessionStorage so a user
 * who reloads mid-flow lands back on the same step with the same input.
 * sessionStorage is per-tab and clears on tab close, which is the right
 * scope — no risk of leaking answers across users on shared machines.
 *
 * One slot per browser tab is enough; we do not key by user id because
 * sign-in/out clears auth state but rarely while the wizard is open,
 * and useAuth.signOut() already clears TanStack Query / auth store.
 */
export const useWizardState = create<WizardState>()(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ step }),
      setIntent: (intent) => set({ intent }),
      setPlotChoice: (hasPlot) =>
        set((s) => ({ hasPlot, plotAddress: hasPlot ? s.plotAddress : '' })),
      setPlotAddress: (plotAddress) => set({ plotAddress }),
      setBundesland: (bundesland) => set({ bundesland }),
      goBackToQ1: () => set({ step: 1 }),
      reset: () => set({ ...initialState }),
    }),
    {
      name: 'pm.wizard',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
