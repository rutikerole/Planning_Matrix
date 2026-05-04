// Phase 7 Chamber — per-specialist ambient tint.
//
// Phase 7.7 §1.10 — saturation bump. The original Phase 7 tints sat
// at 96 % lightness with 12–30 % saturation, which on a real laptop
// at 100 % zoom read as identical paper-warm across all
// specialists. The Phase 7.7 audit confirmed they were
// "kept-but-invisible." Bump saturation to 28–48 % and drop lightness
// to 93–94 % so the active specialist's hue is felt without the
// page ever reading as colour-flooded. Each tint still sits behind
// the grain overlay (z-60, 4 % multiply) so atmospheric warmth
// dominates; the tint is the second order of the light, not the
// first.

import type { Specialist } from '@/types/projectState'

export type TintKey = Specialist | 'none'

export const SPECIALIST_TINT: Record<TintKey, string> = {
  none: 'hsl(38 30% 97%)',
  // moderator stays nearly-paper — they're "neutral roundtable host."
  moderator: 'hsl(38 36% 95%)',
  // Cooler drafting-blue tint when planungsrecht has the floor.
  planungsrecht: 'hsl(212 38% 94%)',
  // Warmer amber when bauordnungsrecht (BayBO, building-class) speaks.
  bauordnungsrecht: 'hsl(35 42% 94%)',
  // Coral when sonstige_vorgaben (heritage, trees, naturschutz) speaks.
  sonstige_vorgaben: 'hsl(15 38% 94%)',
  // Cool steel when verfahren (procedure synthesis) speaks.
  verfahren: 'hsl(220 18% 93%)',
  // Sage when beteiligte (Fachplaner roles) speaks.
  beteiligte: 'hsl(140 22% 94%)',
  // Burgundy for synthesizer (closing voice).
  synthesizer: 'hsl(0 28% 94%)',
}

/** Resolves the tint string for a (possibly null) specialist. */
export function tintFor(specialist: Specialist | null): string {
  if (!specialist) return SPECIALIST_TINT.none
  return SPECIALIST_TINT[specialist] ?? SPECIALIST_TINT.none
}
