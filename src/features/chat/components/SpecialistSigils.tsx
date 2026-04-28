import type React from 'react'

/**
 * Phase 3.2 #38 — specialist sigils. One per voice in the roundtable.
 *
 * 14×14 SVG, 1px stroke, drafting-blue at 60% opacity. Restrained
 * architectural-drawing register: visible when the eye slows down on a
 * specialist, invisible during skim. Hand-drawn-feeling via slight
 * baked-in path imperfection (deterministic, not feTurbulence — Q4).
 *
 * Per Q3 (locked): moderator's sigil is the ROUNDTABLE itself (table +
 * 3 stools, top-down view), not a single drafting stool. The moderator's
 * job is the table.
 */

interface Props {
  className?: string
}

const COMMON = {
  width: 14,
  height: 14,
  viewBox: '0 0 14 14',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function withDefaults(className?: string) {
  return {
    ...COMMON,
    className: ['text-drafting-blue/60 shrink-0', className].filter(Boolean).join(' '),
    'aria-hidden': true,
  }
}

/** Roundtable seen from above — circular table with three stools around it. */
function ModeratorSigil({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      <circle cx="7" cy="7" r="3" />
      {/* three small circles for stools at 12 / 4 / 8 o'clock */}
      <circle cx="7" cy="2" r="0.9" />
      <circle cx="11.5" cy="9" r="0.9" />
      <circle cx="2.5" cy="9" r="0.9" />
    </svg>
  )
}

/** Folded site-plan icon — a rectangle with a triangular fold at the top-right. */
function PlanungsrechtSigil({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      <path d="M 2 3 L 9.5 3 L 12 5.5 L 12 11 L 2 11 Z" />
      <path d="M 9.5 3 L 9.5 5.5 L 12 5.5" />
      <path d="M 4.2 7 L 9.8 7 M 4.2 9 L 8 9" strokeOpacity="0.55" />
    </svg>
  )
}

/** Building section — vertical line + two horizontal floor rules + roof cap. */
function BauordnungsrechtSigil({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      <path d="M 3 3.5 L 7 1.5 L 11 3.5" />
      <path d="M 3 3.5 L 3 12 L 11 12 L 11 3.5" />
      <path d="M 3 7 L 11 7" strokeOpacity="0.55" />
      <path d="M 7 7 L 7 12" strokeOpacity="0.55" />
    </svg>
  )
}

/** Stamp — small rectangle with a diagonal slash and a corner dot. */
function SonstigeVorgabenSigil({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      <rect x="2.5" y="3.5" width="9" height="7" rx="0.4" />
      <path d="M 3.5 9.5 L 10.5 4.5" strokeOpacity="0.6" />
      <circle cx="11" cy="11" r="0.7" fill="currentColor" stroke="none" fillOpacity="0.6" />
    </svg>
  )
}

/** Flowchart arrow — three small boxes connected by short ticks. */
function VerfahrenSigil({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      <rect x="1.5" y="5.5" width="3" height="3" />
      <rect x="5.5" y="5.5" width="3" height="3" />
      <rect x="9.5" y="5.5" width="3" height="3" />
      <path d="M 4.7 7 L 5.5 7 M 8.7 7 L 9.5 7" />
      <path d="M 5.2 6.6 L 5.5 7 L 5.2 7.4 M 9.2 6.6 L 9.5 7 L 9.2 7.4" />
    </svg>
  )
}

/** Three figures — three small standing-person glyphs side by side. */
function BeteiligteSigil({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      <circle cx="3" cy="4" r="1.1" />
      <path d="M 3 5.4 L 3 9 M 1.5 6.5 L 4.5 6.5 M 2 11.5 L 4 11.5" />
      <circle cx="7" cy="4" r="1.1" />
      <path d="M 7 5.4 L 7 9 M 5.5 6.5 L 8.5 6.5 M 6 11.5 L 8 11.5" />
      <circle cx="11" cy="4" r="1.1" />
      <path d="M 11 5.4 L 11 9 M 9.5 6.5 L 12.5 6.5 M 10 11.5 L 12 11.5" />
    </svg>
  )
}

/** Fountain pen nib — triangular nib with the central slit. */
function SynthesizerSigil({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      <path d="M 7 1.5 L 11 11 L 3 11 Z" />
      <path d="M 7 4 L 7 11" strokeOpacity="0.7" />
      <circle cx="7" cy="8" r="0.5" />
    </svg>
  )
}

const REGISTRY: Record<string, (p: Props) => React.ReactElement> = {
  moderator: ModeratorSigil,
  planungsrecht: PlanungsrechtSigil,
  bauordnungsrecht: BauordnungsrechtSigil,
  sonstige_vorgaben: SonstigeVorgabenSigil,
  verfahren: VerfahrenSigil,
  beteiligte: BeteiligteSigil,
  synthesizer: SynthesizerSigil,
}

export function SpecialistSigil({
  specialist,
  className,
}: {
  specialist: string
  className?: string
}) {
  const Sigil = REGISTRY[specialist]
  if (!Sigil) {
    // Fallback for unknown specialist — small clay dot, matching the
    // Phase-3 default until a sigil is added.
    return (
      <span
        aria-hidden="true"
        className={['size-1.5 rounded-full bg-clay shrink-0', className]
          .filter(Boolean)
          .join(' ')}
      />
    )
  }
  return <Sigil className={className} />
}
