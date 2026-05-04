// ───────────────────────────────────────────────────────────────────────
// Phase 7 Pass 2 — Merged Project Portrait + Areas legend
//
// Combines what used to be two separate right-rail blocks
// (IntentAxonometric + BereichePlanSection) into a single
// architectural drawing card. The intent SVG sits left; the A/B/C
// area legend stacks right with state badges + the Move 10c live-
// pulse bar on whichever band the latest specialist is working.
//
// Halves the right rail's vertical footprint — one drawing, one
// legend, one purpose: "what's the project + what's its legal
// surface area, at a glance".
// ───────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { AreaState, ProjectState } from '@/types/projectState'
import { IntentAxonometric } from './IntentAxonometric'

interface Props {
  intent: string
  state?: Partial<ProjectState>
  liveArea?: 'A' | 'B' | 'C' | null
}

const DEFAULT_AREAS: Record<'A' | 'B' | 'C', { state: AreaState }> = {
  A: { state: 'PENDING' },
  B: { state: 'PENDING' },
  C: { state: 'PENDING' },
}

export function ProjectPortrait({ intent, state, liveArea = null }: Props) {
  const areas = state?.areas ?? DEFAULT_AREAS

  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
      <div className="min-w-0">
        <IntentAxonometric intent={intent} state={state} />
      </div>
      <ul className="flex flex-col gap-2 pt-1 min-w-[88px]">
        {(['A', 'B', 'C'] as const).map((key) => {
          const area = areas[key] ?? DEFAULT_AREAS[key]
          return (
            <AreaLine
              key={key}
              letter={key}
              state={area.state}
              isLive={liveArea === key}
            />
          )
        })}
      </ul>
    </div>
  )
}

interface AreaLineProps {
  letter: 'A' | 'B' | 'C'
  state: AreaState
  isLive: boolean
}

function AreaLine({ letter, state, isLive }: AreaLineProps) {
  const { t } = useTranslation()
  const stateClass =
    state === 'ACTIVE'
      ? 'text-clay-deep'
      : state === 'VOID'
        ? 'text-ink-faint line-through'
        : 'text-ink-mute'

  return (
    <li
      className={cn(
        'relative flex items-baseline gap-2 pl-2 text-[11px] leading-tight',
        isLive && 'text-ink',
      )}
    >
      {isLive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-clay rounded-[2px] pm-area-pulse"
        />
      )}
      <span className="font-serif italic text-clay-deep w-3 shrink-0">
        {letter}
      </span>
      <span className="font-serif text-ink truncate flex-1">
        {t(`chat.areas.${letter}`)}
      </span>
      <span
        className={cn(
          'font-mono text-[8.5px] tracking-[0.14em] uppercase shrink-0',
          stateClass,
        )}
      >
        {t(`chat.areas.state.${state.toLowerCase()}`)}
      </span>
    </li>
  )
}
