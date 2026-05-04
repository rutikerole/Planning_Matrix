// Phase 7 Chamber — per-specialist ambient tint.
//
// Very low-saturation HSL values applied as a fixed full-page overlay
// behind the substrate. The page never reads as "blue" or "green";
// the light just shifts as the active voice changes.

import type { Specialist } from '@/types/projectState'

export type TintKey = Specialist | 'none'

export const SPECIALIST_TINT: Record<TintKey, string> = {
  none: 'hsl(38 30% 97%)',
  moderator: 'hsl(38 30% 96%)',
  planungsrecht: 'hsl(212 22% 96%)',
  bauordnungsrecht: 'hsl(35 30% 96%)',
  sonstige_vorgaben: 'hsl(15 28% 96%)',
  verfahren: 'hsl(220 12% 96%)',
  beteiligte: 'hsl(140 14% 96%)',
  synthesizer: 'hsl(0 18% 96%)',
}

/** Resolves the tint string for a (possibly null) specialist. */
export function tintFor(specialist: Specialist | null): string {
  if (!specialist) return SPECIALIST_TINT.none
  return SPECIALIST_TINT[specialist] ?? SPECIALIST_TINT.none
}
