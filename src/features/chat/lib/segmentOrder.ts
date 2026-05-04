// Phase 7 Chamber — narrative specialist order.
//
// Single source of truth for "the journey" — used by the astrolabe
// inner ring, SpecialistTeam strip, completion gate, and any future
// progress surface.

import type { Specialist } from '@/types/projectState'

export const SEGMENT_ORDER: Specialist[] = [
  'moderator',
  'planungsrecht',
  'bauordnungsrecht',
  'sonstige_vorgaben',
  'verfahren',
  'beteiligte',
  'synthesizer',
]
