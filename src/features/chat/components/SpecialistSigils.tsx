import type React from 'react'

/**
 * Phase 3.2 #38 + Phase 3.4 #56 — specialist sigils with optional
 * micro-animations during their thinking phase.
 *
 * 14×14 SVG, 1px stroke, drafting-blue at 60% opacity. Restrained
 * architectural-drawing register: visible when the eye slows down on
 * a specialist, invisible during skim. Hand-drawn-feeling via slight
 * baked-in path imperfection.
 *
 * Phase 3.4 — when `isActive` is true (the specialist is currently
 * thinking), each sigil plays a tiny domain-specific loop:
 *
 *   moderator           three stools rotate slowly around the table
 *   planungsrecht       fold scales 1→0.85→1 (plan unfolds slightly)
 *   bauordnungsrecht    a tiny ruler line sweeps vertically
 *   sonstige_vorgaben   stamp lifts + ink slash pulses
 *   verfahren           arrow heads extend and retract
 *   beteiligte          heads tilt sequentially
 *   synthesizer         a tiny ink drop falls from the nib
 *
 * Reduced-motion: all sigils fully static, no animation. The `isActive`
 * prop is honoured but the CSS keyframes are gated by `prefers-reduced-
 * motion: no-preference`, so accessibility users get a static sigil.
 */

interface Props {
  className?: string
  /** True while this specialist is the one thinking on the current turn. */
  isActive?: boolean
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

const SIGIL_STYLES = `
@media (prefers-reduced-motion: no-preference) {
  /* Moderator — three stools rotate around the table */
  .pm-sigil-moderator-active .pm-stools { animation: pmStoolsRotate 4s linear infinite; transform-origin: 7px 7px; }
  @keyframes pmStoolsRotate { to { transform: rotate(360deg); } }

  /* Planungsrecht — fold scales 1→0.88→1 over 3s */
  .pm-sigil-planungsrecht-active .pm-fold { animation: pmFoldBreath 3s ease-in-out infinite; transform-origin: 10.75px 4.25px; }
  @keyframes pmFoldBreath { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.88); } }

  /* Bauordnungsrecht — vertical ruler sweep */
  .pm-sigil-bauordnungsrecht-active .pm-ruler { animation: pmRulerSweep 3s ease-in-out infinite; }
  @keyframes pmRulerSweep {
    0%   { transform: translateY(-2px); opacity: 0; }
    20%  { opacity: 0.85; }
    80%  { opacity: 0.85; }
    100% { transform: translateY(7px); opacity: 0; }
  }

  /* Sonstige Vorgaben — stamp lifts + slash ink pulses */
  .pm-sigil-sonstige-active .pm-stamp { animation: pmStampLift 3.5s ease-in-out infinite; transform-origin: 7px 7px; }
  .pm-sigil-sonstige-active .pm-stamp-slash { animation: pmSlashPulse 3.5s ease-in-out infinite; }
  @keyframes pmStampLift { 0%, 100% { transform: scale(1); } 45% { transform: scale(1.05) translateY(-0.4px); } 55% { transform: scale(1.04); } }
  @keyframes pmSlashPulse { 0%, 100% { stroke-opacity: 0.6; } 50% { stroke-opacity: 1; } }

  /* Verfahren — arrow heads extend and retract */
  .pm-sigil-verfahren-active .pm-arrow-head { animation: pmArrowExtend 2s ease-in-out infinite; transform-origin: center; }
  @keyframes pmArrowExtend { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.4); } }

  /* Beteiligte — heads tilt sequentially */
  .pm-sigil-beteiligte-active .pm-head-1 { animation: pmHeadTilt 4s ease-in-out infinite; transform-origin: 3px 4px; animation-delay: 0s; }
  .pm-sigil-beteiligte-active .pm-head-2 { animation: pmHeadTilt 4s ease-in-out infinite; transform-origin: 7px 4px; animation-delay: 0.2s; }
  .pm-sigil-beteiligte-active .pm-head-3 { animation: pmHeadTilt 4s ease-in-out infinite; transform-origin: 11px 4px; animation-delay: 0.4s; }
  @keyframes pmHeadTilt { 0%, 80%, 100% { transform: rotate(0deg); } 40% { transform: rotate(5deg); } }

  /* Synthesizer — ink drop falls from the nib */
  .pm-sigil-synthesizer-active .pm-ink-drop { animation: pmInkDrop 3.5s ease-in-out infinite; }
  @keyframes pmInkDrop {
    0%   { transform: translateY(0); opacity: 0; }
    20%  { opacity: 0.8; }
    80%  { opacity: 0.8; }
    100% { transform: translateY(4px); opacity: 0; }
  }
}
`

function ModeratorSigil({ className, isActive }: Props) {
  return (
    <svg
      {...withDefaults(className)}
      className={[withDefaults(className).className, isActive && 'pm-sigil-moderator-active']
        .filter(Boolean)
        .join(' ')}
    >
      <circle cx="7" cy="7" r="3" />
      <g className="pm-stools">
        <circle cx="7" cy="2" r="0.9" />
        <circle cx="11.5" cy="9" r="0.9" />
        <circle cx="2.5" cy="9" r="0.9" />
      </g>
      <style>{SIGIL_STYLES}</style>
    </svg>
  )
}

function PlanungsrechtSigil({ className, isActive }: Props) {
  return (
    <svg
      {...withDefaults(className)}
      className={[withDefaults(className).className, isActive && 'pm-sigil-planungsrecht-active']
        .filter(Boolean)
        .join(' ')}
    >
      <path d="M 2 3 L 9.5 3 L 12 5.5 L 12 11 L 2 11 Z" />
      <g className="pm-fold">
        <path d="M 9.5 3 L 9.5 5.5 L 12 5.5" />
      </g>
      <path d="M 4.2 7 L 9.8 7 M 4.2 9 L 8 9" strokeOpacity="0.55" />
      <style>{SIGIL_STYLES}</style>
    </svg>
  )
}

function BauordnungsrechtSigil({ className, isActive }: Props) {
  return (
    <svg
      {...withDefaults(className)}
      className={[
        withDefaults(className).className,
        isActive && 'pm-sigil-bauordnungsrecht-active',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <path d="M 3 3.5 L 7 1.5 L 11 3.5" />
      <path d="M 3 3.5 L 3 12 L 11 12 L 11 3.5" />
      <path d="M 3 7 L 11 7" strokeOpacity="0.55" />
      <path d="M 7 7 L 7 12" strokeOpacity="0.55" />
      {/* Animated ruler line — only visible when active via CSS opacity */}
      <line
        className="pm-ruler"
        x1="3.5"
        y1="4"
        x2="10.5"
        y2="4"
        strokeWidth="0.6"
        strokeOpacity="0"
      />
      <style>{SIGIL_STYLES}</style>
    </svg>
  )
}

function SonstigeVorgabenSigil({ className, isActive }: Props) {
  return (
    <svg
      {...withDefaults(className)}
      className={[withDefaults(className).className, isActive && 'pm-sigil-sonstige-active']
        .filter(Boolean)
        .join(' ')}
    >
      <g className="pm-stamp">
        <rect x="2.5" y="3.5" width="9" height="7" rx="0.4" />
        <path className="pm-stamp-slash" d="M 3.5 9.5 L 10.5 4.5" strokeOpacity="0.6" />
        <circle cx="11" cy="11" r="0.7" fill="currentColor" stroke="none" fillOpacity="0.6" />
      </g>
      <style>{SIGIL_STYLES}</style>
    </svg>
  )
}

function VerfahrenSigil({ className, isActive }: Props) {
  return (
    <svg
      {...withDefaults(className)}
      className={[withDefaults(className).className, isActive && 'pm-sigil-verfahren-active']
        .filter(Boolean)
        .join(' ')}
    >
      <rect x="1.5" y="5.5" width="3" height="3" />
      <rect x="5.5" y="5.5" width="3" height="3" />
      <rect x="9.5" y="5.5" width="3" height="3" />
      <path d="M 4.7 7 L 5.5 7 M 8.7 7 L 9.5 7" />
      <g className="pm-arrow-head">
        <path d="M 5.2 6.6 L 5.5 7 L 5.2 7.4 M 9.2 6.6 L 9.5 7 L 9.2 7.4" />
      </g>
      <style>{SIGIL_STYLES}</style>
    </svg>
  )
}

function BeteiligteSigil({ className, isActive }: Props) {
  return (
    <svg
      {...withDefaults(className)}
      className={[withDefaults(className).className, isActive && 'pm-sigil-beteiligte-active']
        .filter(Boolean)
        .join(' ')}
    >
      <g className="pm-head-1">
        <circle cx="3" cy="4" r="1.1" />
      </g>
      <path d="M 3 5.4 L 3 9 M 1.5 6.5 L 4.5 6.5 M 2 11.5 L 4 11.5" />
      <g className="pm-head-2">
        <circle cx="7" cy="4" r="1.1" />
      </g>
      <path d="M 7 5.4 L 7 9 M 5.5 6.5 L 8.5 6.5 M 6 11.5 L 8 11.5" />
      <g className="pm-head-3">
        <circle cx="11" cy="4" r="1.1" />
      </g>
      <path d="M 11 5.4 L 11 9 M 9.5 6.5 L 12.5 6.5 M 10 11.5 L 12 11.5" />
      <style>{SIGIL_STYLES}</style>
    </svg>
  )
}

function SynthesizerSigil({ className, isActive }: Props) {
  return (
    <svg
      {...withDefaults(className)}
      className={[withDefaults(className).className, isActive && 'pm-sigil-synthesizer-active']
        .filter(Boolean)
        .join(' ')}
    >
      <path d="M 7 1.5 L 11 11 L 3 11 Z" />
      <path d="M 7 4 L 7 11" strokeOpacity="0.7" />
      <circle cx="7" cy="8" r="0.5" />
      {/* Ink drop — falls below the nib when active */}
      <circle
        className="pm-ink-drop"
        cx="7"
        cy="11.5"
        r="0.45"
        fill="currentColor"
        stroke="none"
        fillOpacity="0"
      />
      <style>{SIGIL_STYLES}</style>
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
  isActive,
}: {
  specialist: string
  className?: string
  isActive?: boolean
}) {
  const Sigil = REGISTRY[specialist]
  if (!Sigil) {
    return (
      <span
        aria-hidden="true"
        className={['size-1.5 rounded-full bg-clay shrink-0', className]
          .filter(Boolean)
          .join(' ')}
      />
    )
  }
  return <Sigil className={className} isActive={isActive} />
}
