// Phase 7 Chamber — specialist sigils.
//
// Tiny abstract SVG glyphs, one per specialist. Used in the astrolabe
// inner ring, the SpecialistTeam strip, MessageAssistant nameplate,
// LedgerPeek, and the StandUp overlay.
//
// Each sigil is drawn in a 24×24 viewBox with hairline stroke; the
// caller scales via the `size` prop and recolors via `color` (default
// `currentColor` so callers can drive it from CSS).

import type { ReactElement } from 'react'
import type { Specialist } from '@/types/projectState'

interface SigilDef {
  viewBox: string
  paths: ReactElement
}

const STROKE = 1.5

export const SIGIL_DEFS: Record<Specialist, SigilDef> = {
  // Diamond + center cross — balance / mediation.
  moderator: {
    viewBox: '0 0 24 24',
    paths: (
      <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinejoin="round">
        <polygon points="12,3 21,12 12,21 3,12" />
        <line x1="12" y1="9" x2="12" y2="15" strokeWidth={1} />
        <line x1="9" y1="12" x2="15" y2="12" strokeWidth={1} />
      </g>
    ),
  },
  // Plot frame — square with thicker top edge (Bebauungsplan boundary).
  planungsrecht: {
    viewBox: '0 0 24 24',
    paths: (
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <rect x="4" y="6" width="16" height="14" strokeWidth={STROKE} />
        <line x1="4" y1="6" x2="20" y2="6" strokeWidth={2.5} />
      </g>
    ),
  },
  // Floor line — square with horizontal hairline (BayBO Gebäudeklasse).
  bauordnungsrecht: {
    viewBox: '0 0 24 24',
    paths: (
      <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round">
        <rect x="4" y="4" width="16" height="16" />
        <line x1="4" y1="13" x2="20" y2="13" strokeWidth={1} />
      </g>
    ),
  },
  // Triangle with center dot — sonstige Vorgaben (other things).
  sonstige_vorgaben: {
    viewBox: '0 0 24 24',
    paths: (
      <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinejoin="round">
        <polygon points="12,4 21,20 3,20" />
        <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
      </g>
    ),
  },
  // Procedural arc — circle with two parallel hairlines.
  verfahren: {
    viewBox: '0 0 24 24',
    paths: (
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="12" cy="12" r="8" strokeWidth={STROKE} />
        <line x1="5" y1="10" x2="19" y2="10" strokeWidth={1} />
        <line x1="5" y1="14" x2="19" y2="14" strokeWidth={1} />
      </g>
    ),
  },
  // Two overlapping circles — stakeholders.
  beteiligte: {
    viewBox: '0 0 24 24',
    paths: (
      <g fill="none" stroke="currentColor" strokeWidth={STROKE}>
        <circle cx="9" cy="12" r="5" />
        <circle cx="15" cy="12" r="5" />
      </g>
    ),
  },
  // Asterisk — synthesis.
  synthesizer: {
    viewBox: '0 0 24 24',
    paths: (
      <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round">
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
        <line x1="5.6" y1="18.4" x2="18.4" y2="5.6" />
      </g>
    ),
  },
}

interface SigilProps {
  specialist: Specialist
  size?: number
  className?: string
  /** When true, render a clay-filled disc behind the glyph (active state). */
  filled?: boolean
}

export function ChamberSigil({ specialist, size = 24, className, filled }: SigilProps) {
  const def = SIGIL_DEFS[specialist]
  if (!def) return null
  return (
    <svg
      viewBox={def.viewBox}
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={filled ? { color: 'hsl(var(--paper))' } : undefined}
    >
      {filled && (
        <circle cx="12" cy="12" r="11" fill="hsl(var(--clay))" stroke="none" />
      )}
      {def.paths}
    </svg>
  )
}
