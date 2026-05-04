// Phase 7 Chamber — ambient specialist tint.
//
// Fixed, full-page color overlay that sits behind the substrate at
// z-index 0 and softly cross-fades over 1200ms when the active
// specialist changes. Runs through a single CSS transition; we just
// flip the inline `backgroundColor` value.
//
// Reduced-motion: snaps via the global `*::after { transition-duration:
// 0.001ms !important }` rule.

import { useReducedMotion } from 'framer-motion'
import type { Specialist } from '@/types/projectState'
import { tintFor } from '../../lib/specialistTints'

interface Props {
  specialist: Specialist | null
}

export function AmbientTint({ specialist }: Props) {
  const reduced = useReducedMotion()
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundColor: tintFor(specialist),
        transition: reduced
          ? 'none'
          : 'background-color 1200ms cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    />
  )
}
