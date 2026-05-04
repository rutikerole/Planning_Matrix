// Phase 7 Chamber — SpecialistTeam strip.
//
// Always-visible row of 7 sigils in narrative order:
//   moderator → planungsrecht → bauordnungsrecht → sonstige_vorgaben
//   → verfahren → beteiligte → synthesizer
//
// Three states per sigil:
//   - active: full clay fill + 2px halo glow + scale-loop animation
//   - spoken: hairline outline + faint clay fill
//   - pending: hairline outline only, opacity 0.32
//
// Used inside AstrolabeStickyHeader and StandUp overlay.

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { Specialist } from '@/types/projectState'
import { SEGMENT_ORDER } from '../../lib/segmentOrder'
import { ChamberSigil } from '../../lib/specialistSigils'

interface Props {
  active: Specialist | null
  spoken: Set<Specialist>
  /** Per-specialist contribution count + last-line snippet. Optional. */
  contributions?: Record<Specialist, { count: number; lastSnippet?: string }>
  size?: 'sm' | 'md'
  onSigilClick?: (s: Specialist) => void
  className?: string
}

export function SpecialistTeam({
  active,
  spoken,
  contributions,
  size = 'sm',
  onSigilClick,
  className,
}: Props) {
  const { t } = useTranslation()
  const sigilSize = size === 'sm' ? 14 : 24
  const wrapSize = sigilSize + 6

  return (
    <ul
      role="list"
      aria-label={t('chat.chamber.specialistTeam')}
      className={cn('flex items-center gap-2 md:gap-3', className)}
    >
      {SEGMENT_ORDER.map((spec) => {
        const isActive = active === spec
        const isSpoken = spoken.has(spec)
        const contrib = contributions?.[spec]
        const tooltip = contrib && contrib.count > 0
          ? t('chat.chamber.specialistTooltip', {
              specialist: t(`chat.specialists.${spec}`),
              count: contrib.count,
            })
          : t('chat.chamber.specialistTooltipNeverSpoken', {
              specialist: t(`chat.specialists.${spec}`),
            })
        const specName = t(`chat.specialists.${spec}`)
        return (
          <li key={spec} className="relative group/sigil">
            <button
              type="button"
              onClick={onSigilClick ? () => onSigilClick(spec) : undefined}
              disabled={!onSigilClick}
              aria-label={tooltip}
              className={cn(
                'relative grid place-items-center rounded-full',
                onSigilClick && 'cursor-pointer hover:scale-110 transition-transform duration-200',
                !onSigilClick && 'cursor-default',
                isActive
                  ? 'opacity-100 chamber-sigil-active'
                  : isSpoken
                    ? 'opacity-65'
                    : 'opacity-32',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
              )}
              style={{ width: wrapSize, height: wrapSize }}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'rgba(123, 92, 63, 0.18)' }}
                />
              )}
              <span
                className="relative grid place-items-center"
                style={{
                  color: isActive ? 'hsl(var(--clay))' : 'hsl(var(--ink) / 0.6)',
                  width: sigilSize,
                  height: sigilSize,
                }}
              >
                <ChamberSigil specialist={spec} size={sigilSize} />
              </span>
            </button>
            {/* Phase 7.7 §1.7 — styled tooltip below each sigil.
              * 9 px caps clay name, hairline border + paper-card bg.
              * Reveals on hover/focus 4 px below the sigil. */}
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.18em] text-clay px-1.5 py-0.5 bg-paper-card border border-[var(--hairline,rgba(26,22,18,0.10))] rounded-sm opacity-0 translate-y-[-2px] transition-[opacity,transform] duration-150 group-hover/sigil:opacity-100 group-hover/sigil:translate-y-0 group-focus-within/sigil:opacity-100 group-focus-within/sigil:translate-y-0"
            >
              {specName}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
