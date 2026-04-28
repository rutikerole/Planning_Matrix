// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #71 — Compact Source × Quality badge for the cockpit
//
//   CLIENT · D
//   LEGAL · C
//
// Single character for quality (DECIDED / CALCULATED / VERIFIED /
// ASSUMED → D / C / V / A) so the badge stays narrow in dense tables.
// Hover tooltip carries the full source + quality + reason.
// ───────────────────────────────────────────────────────────────────────

import { cn } from '@/lib/utils'
import type { Qualifier } from '@/types/projectState'

interface Props {
  qualifier: Qualifier
}

const QUALITY_SHORT: Record<Qualifier['quality'], string> = {
  DECIDED: 'D',
  CALCULATED: 'C',
  VERIFIED: 'V',
  ASSUMED: 'A',
}

const COLOR_BY_SOURCE: Record<Qualifier['source'], string> = {
  LEGAL: 'text-clay',
  CLIENT: 'text-ink/70',
  DESIGNER: 'text-drafting-blue',
  AUTHORITY: 'text-clay-deep',
}

export function QualifierBadge({ qualifier }: Props) {
  const short = `${qualifier.source} · ${QUALITY_SHORT[qualifier.quality]}`
  const tooltip = `${qualifier.source} · ${qualifier.quality}${
    qualifier.reason ? ` — ${qualifier.reason}` : ''
  }`
  return (
    <span
      title={tooltip}
      className={cn(
        'inline-flex items-center text-[10px] font-medium uppercase tracking-[0.16em] whitespace-nowrap',
        COLOR_BY_SOURCE[qualifier.source],
      )}
    >
      {short}
    </span>
  )
}
