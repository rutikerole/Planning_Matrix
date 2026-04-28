import type React from 'react'

/**
 * Phase 3.5 #62 — role glyphs for the Specialists Required section.
 *
 * Six 14×14 SVG glyphs, 1px stroke, drafting-blue at 60% opacity.
 * Same hand-drawn-feeling baked-imperfection technique as the
 * `SpecialistSigils` family from Phase 3.2.
 *
 * Roles covered:
 *   • architekt          — drafting compass + crossed ruler
 *   • tragwerksplaner    — I-beam glyph
 *   • energieberater     — thermometer + insulation hatch
 *   • vermesser          — tripod + sight line
 *   • brandschutzplaner  — flame + protective shield
 *   • bauamt             — official stamp
 *
 * Falls back to a small clay dot for unknown role keys.
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

/** Architekt — drafting compass + ruler crossed (a hand at the table). */
function ArchitektGlyph({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      {/* Compass — small triangle with a circle joint at the top */}
      <circle cx="7" cy="3" r="0.85" />
      <path d="M 7 3.5 L 4.2 11.5" />
      <path d="M 7 3.5 L 9.8 11.5" />
      <path d="M 5.4 8 L 8.6 8" strokeOpacity="0.55" />
      {/* Ruler — short horizontal hairline crossing the page */}
      <path d="M 1.5 12.5 L 12.5 12.5" strokeOpacity="0.45" />
      <path d="M 3 12 L 3 13" strokeOpacity="0.45" />
      <path d="M 7 12 L 7 13" strokeOpacity="0.45" />
      <path d="M 11 12 L 11 13" strokeOpacity="0.45" />
    </svg>
  )
}

/** Tragwerksplaner — I-beam in elevation. */
function TragwerksplanerGlyph({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      <path d="M 2.5 3 L 11.5 3" />
      <path d="M 7 3 L 7 11" />
      <path d="M 2.5 11 L 11.5 11" />
      <path d="M 4 3 L 4 4 M 10 3 L 10 4" strokeOpacity="0.55" />
      <path d="M 4 10 L 4 11 M 10 10 L 10 11" strokeOpacity="0.55" />
    </svg>
  )
}

/** Energieberater — thermometer with hatched insulation lines. */
function EnergieberaterGlyph({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      <circle cx="7" cy="11" r="1.5" />
      <path d="M 7 9.5 L 7 2.5" />
      <path d="M 6 2.5 L 8 2.5" strokeOpacity="0.55" />
      <path d="M 8 4 L 9 4" strokeOpacity="0.5" />
      <path d="M 8 5.6 L 9 5.6" strokeOpacity="0.5" />
      <path d="M 8 7.2 L 9 7.2" strokeOpacity="0.5" />
      {/* Insulation hatch on the right */}
      <path d="M 11 4 L 12.5 5.5" strokeOpacity="0.4" />
      <path d="M 11 6 L 12.5 7.5" strokeOpacity="0.4" />
      <path d="M 11 8 L 12.5 9.5" strokeOpacity="0.4" />
    </svg>
  )
}

/** Vermesser — tripod + sight line. */
function VermesserGlyph({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      {/* Tripod legs */}
      <path d="M 7 6 L 3 12" />
      <path d="M 7 6 L 11 12" />
      <path d="M 7 6 L 7 12" strokeOpacity="0.55" />
      {/* Theodolite head */}
      <rect x="5.5" y="3.5" width="3" height="2.5" />
      <path d="M 7 4.7 L 12.5 4.7" strokeOpacity="0.45" />
      <path d="M 12.5 4.4 L 12.8 4.7 L 12.5 5" strokeOpacity="0.45" />
    </svg>
  )
}

/** Brandschutzplaner — flame glyph inside a small shield. */
function BrandschutzGlyph({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      {/* Shield outline */}
      <path d="M 7 1.5 L 11.5 3 L 11 9 L 7 12 L 3 9 L 2.5 3 Z" />
      {/* Flame */}
      <path d="M 7 4 Q 8.5 6 7.5 8 Q 6.5 7 7 5.5 Q 6 6.5 7 4 Z" strokeOpacity="0.7" />
    </svg>
  )
}

/** Bauamt — octagonal stamp. */
function BauamtGlyph({ className }: Props) {
  return (
    <svg {...withDefaults(className)}>
      <path d="M 4.5 1.5 L 9.5 1.5 L 12.5 4.5 L 12.5 9.5 L 9.5 12.5 L 4.5 12.5 L 1.5 9.5 L 1.5 4.5 Z" />
      <path d="M 5.5 4 L 8.5 4" strokeOpacity="0.55" />
      <path d="M 5.5 7 L 8.5 7" strokeOpacity="0.55" />
      <path d="M 5.5 10 L 8.5 10" strokeOpacity="0.55" />
    </svg>
  )
}

const REGISTRY: Record<string, (p: Props) => React.ReactElement> = {
  architekt: ArchitektGlyph,
  tragwerksplaner: TragwerksplanerGlyph,
  energieberater: EnergieberaterGlyph,
  vermesser: VermesserGlyph,
  brandschutzplaner: BrandschutzGlyph,
  bauamt: BauamtGlyph,
}

/** Returns the role glyph component for a key, or a small clay dot fallback. */
export function RoleGlyph({
  role,
  className,
}: {
  role: string
  className?: string
}) {
  const Glyph = REGISTRY[role] ?? null
  if (!Glyph) {
    return (
      <span
        aria-hidden="true"
        className={['size-1.5 rounded-full bg-clay shrink-0', className]
          .filter(Boolean)
          .join(' ')}
      />
    )
  }
  return <Glyph className={className} />
}

/**
 * Heuristic: map a role title (German) to the glyph key. Pattern-based;
 * falls through to `bauamt` for any obvious "amt/behörde" mention,
 * `architekt` for any "architekt:in", etc. Returns null when no
 * confident match — caller renders the dot fallback.
 */
export function inferRoleGlyphKey(titleDe: string): string {
  const t = titleDe.toLowerCase()
  if (/architekt|bauvorlageberechtigt/.test(t)) return 'architekt'
  if (/tragwerk|statik/.test(t)) return 'tragwerksplaner'
  if (/energieberat|w(ä|ae)rmeschutz|energie/.test(t)) return 'energieberater'
  if (/vermess/.test(t)) return 'vermesser'
  if (/brandschutz/.test(t)) return 'brandschutzplaner'
  if (/bauamt|beh(ö|oe)rde|amt/.test(t)) return 'bauamt'
  return 'architekt' // safest default for "Fachplaner"-style entries
}
