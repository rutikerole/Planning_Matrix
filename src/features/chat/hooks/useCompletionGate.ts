// Phase 7 Chamber — useCompletionGate.
//
// Maps progress + completionSignal + recommendations into a discrete
// prominence level for the BriefingCTA:
//
//   'hidden'       — empty thread, suppress entirely.
//   'whisper'      — text-link register, almost invisible (<30%).
//   'badge'        — text link with a small clay ring (30–60%).
//   'outlined'     — proper outlined button (60–85%).
//   'hero'         — filled hero button (>=85% or ready_for_review).
//   'ready'        — hero + a one-shot 800ms pulse + halo (first time
//                    progress >= 95% OR completionSignal flips to
//                    ready_for_review).
//
// 'ready' fires once per project session — onRevealReady() should be
// invoked by the consumer to acknowledge the pulse.

import { useEffect, useState } from 'react'

export type BriefingProminence = 'hidden' | 'whisper' | 'badge' | 'outlined' | 'hero' | 'ready'

export interface CompletionGateInput {
  hasMessages: boolean
  percent: number
  completionSignal:
    | 'continue'
    | 'needs_designer'
    | 'ready_for_review'
    | 'blocked'
    | null
  recommendationsCount: number
}

export interface CompletionGate {
  prominence: BriefingProminence
  visible: boolean
  shouldPulse: boolean
  acknowledgePulse: () => void
}

export function useCompletionGate(input: CompletionGateInput): CompletionGate {
  const [pulseFired, setPulseFired] = useState(false)

  // Phase 7.5 — inline thread-end variant collapses its early stages
  // because the Spine sidebar carries a full-volume CTA from turn 1:
  //   < 60 %                                    → hidden
  //   60–94 %                                   → outlined
  //   ≥ 95 % OR completionSignal=ready_for_review → hero (+ ready pulse)
  // The BriefingCTA's variant="sidebar" path ignores this and stays
  // always-prominent.
  let prominence: BriefingProminence = 'hidden'
  if (input.hasMessages) {
    if (input.completionSignal === 'ready_for_review' || input.percent >= 95) {
      prominence = 'hero'
    } else if (input.percent >= 60) {
      prominence = 'outlined'
    } else {
      prominence = 'hidden'
    }
  }

  const shouldPulse =
    !pulseFired &&
    input.hasMessages &&
    (input.completionSignal === 'ready_for_review' || input.percent >= 95)

  // 'ready' label is pinned for the first paint that triggers the
  // one-shot pulse. After acknowledgment the prominence stays
  // 'hero' on subsequent renders.
  if (shouldPulse) prominence = 'ready'

  // Auto-clear the pulse after 900ms.
  useEffect(() => {
    if (!shouldPulse) return
    const id = window.setTimeout(() => setPulseFired(true), 900)
    return () => window.clearTimeout(id)
  }, [shouldPulse])

  return {
    prominence,
    visible: prominence !== 'hidden',
    shouldPulse,
    acknowledgePulse: () => setPulseFired(true),
  }
}
