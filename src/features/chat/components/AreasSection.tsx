// ───────────────────────────────────────────────────────────────────────
// Phase 7 Pass 5 — Areas (A/B/C) hatched-bands visualization
//
// Restores the BereichePlanSection illustration deleted in Pass 2.
// Pass 5 brief: "three hatched horizontal bands with letters A/B/C
// in italic serif, state pills (ACTIVE/PENDING) on the right."
// Lives below ProjectPortrait as a separate visual.
//
// Move 10c live-pulse bar preserved on whichever band the latest
// specialist is working.
// ───────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { AreaState, ProjectState } from '@/types/projectState'

interface Props {
  state: Partial<ProjectState>
  liveArea?: 'A' | 'B' | 'C' | null
}

const DEFAULT_AREAS: Record<'A' | 'B' | 'C', { state: AreaState }> = {
  A: { state: 'PENDING' },
  B: { state: 'PENDING' },
  C: { state: 'PENDING' },
}

export function AreasSection({ state, liveArea = null }: Props) {
  const { t } = useTranslation()
  const areas = state.areas ?? DEFAULT_AREAS

  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-[4px] bg-paper-card border border-hairline">
      {(['A', 'B', 'C'] as const).map((key) => {
        const area = areas[key] ?? DEFAULT_AREAS[key]
        const isLive = liveArea === key
        const stateKey = area.state.toLowerCase() as 'active' | 'pending' | 'void'
        return (
          <div
            key={key}
            className={cn(
              'relative grid grid-cols-[22px_1fr_auto] items-center gap-2.5 px-2 py-2 rounded-[3px]',
              area.state === 'ACTIVE' &&
                'bg-[repeating-linear-gradient(135deg,transparent_0,transparent_3px,rgba(26,22,18,0.06)_3px,rgba(26,22,18,0.06)_4px)]',
              area.state === 'PENDING' &&
                'bg-[repeating-linear-gradient(135deg,transparent_0,transparent_5px,rgba(139,107,72,0.10)_5px,rgba(139,107,72,0.10)_6px)]',
            )}
          >
            {/* Live-pulse bar for the band whose specialist is speaking. */}
            {isLive && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 bottom-0 w-[2px] bg-clay rounded-[2px] pm-area-pulse"
              />
            )}
            {/* Letter glyph — italic serif on a small paper notch. */}
            <span
              className={cn(
                'flex items-center justify-center w-[22px] h-[22px]',
                'font-serif italic text-[13px] text-clay-deep',
                'bg-paper border border-hairline rounded-[2px]',
              )}
              aria-hidden="true"
            >
              {key}
            </span>
            {/* Area name */}
            <span
              className={cn(
                'font-serif text-[12px] leading-tight truncate',
                isLive ? 'text-ink' : 'text-ink-soft',
              )}
            >
              {t(`chat.areas.${key}`)}
            </span>
            {/* State pill */}
            <span
              className={cn(
                'font-mono text-[8.5px] tracking-[0.14em] uppercase px-1.5 py-px rounded-[2px] leading-none whitespace-nowrap',
                area.state === 'ACTIVE' && 'bg-clay-tint text-clay-deep',
                area.state === 'PENDING' && 'bg-paper-deep text-ink-mute',
                area.state === 'VOID' &&
                  'text-ink-faint border border-dashed border-hairline-strong',
              )}
            >
              {t(`chat.areas.state.${stateKey}`)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
