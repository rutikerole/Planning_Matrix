// Phase 7 Chamber — re-export shim.
//
// /result/ConversationAppendix imports `SpecialistSigil` from this
// path. The Chamber's canonical sigil lives at
// `lib/specialistSigils.tsx` as `<ChamberSigil>`; this file re-exports
// it under the legacy name so the result page keeps compiling without
// edits.

import { ChamberSigil } from '../lib/specialistSigils'
import { SEGMENT_ORDER } from '../lib/segmentOrder'
import type { Specialist } from '@/types/projectState'

interface Props {
  /** Accept the broader DB-row string and narrow internally so legacy
   *  call sites that pass `message.specialist ?? 'moderator'` keep
   *  compiling without per-call casts. */
  specialist: Specialist | string
  size?: number
  className?: string
  isActive?: boolean
}

const KNOWN: Specialist[] = SEGMENT_ORDER

export function SpecialistSigil({ specialist, size, className, isActive }: Props) {
  const safe = (KNOWN.includes(specialist as Specialist)
    ? specialist
    : 'moderator') as Specialist
  return (
    <ChamberSigil
      specialist={safe}
      size={size}
      className={className}
      filled={isActive}
    />
  )
}
