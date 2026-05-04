// ───────────────────────────────────────────────────────────────────────
// Phase 7 Pass 2 / Pass 3 — Merged Project Portrait + Areas legend
//
// Pass 2 stacked drawing + legend side-by-side; Pass 3 stacks them
// vertically because the 240×160 viewBox couldn't breathe in the
// narrowed 300 px right rail. Card layout (top → bottom):
//
//   1. IntentAxonometric SVG, full-width inside the card
//   2. Three-column A/B/C legend row (mono caps, state pills aligned
//      right) — same density as the pre-merge BereichePlanSection
//   3. Title row: intent label + M 1:100 scale-mark
//
// Keeps the Move 10c live-pulse bar on whichever band the latest
// specialist is working.
// ───────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { AreaState, ProjectState } from '@/types/projectState'
import { IntentAxonometric, IntentScaleBar } from './IntentAxonometric'
import { INTENT_TO_I18N } from '@/features/wizard/lib/selectTemplate'

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
  const { t } = useTranslation()
  const areas = state?.areas ?? DEFAULT_AREAS
  const intentSlug =
    (INTENT_TO_I18N as Record<string, string>)[intent] ?? 'sonstige'
  const intentLabel = t(`wizard.q1.options.${intentSlug}.label`, {
    defaultValue: t('wizard.q1.options.sonstige.label'),
  })

  return (
    <div className="flex flex-col gap-2.5">
      {/* 1. Drawing — full-width of the card. */}
      <div className="w-full">
        <IntentAxonometric intent={intent} state={state} hideCaption />
      </div>

      {/* 2. A/B/C legend — three columns, same density as the
        * pre-merge BereichePlanSection. */}
      <ul className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-hairline-faint">
        {(['A', 'B', 'C'] as const).map((key) => {
          const area = areas[key] ?? DEFAULT_AREAS[key]
          return (
            <AreaCell
              key={key}
              letter={key}
              state={area.state}
              isLive={liveArea === key}
            />
          )
        })}
      </ul>

      {/* 3. Title row — intent label left, scale-mark right.
        * Replaces the figcaption that used to live inside
        * IntentAxonometric. */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="font-serif italic text-[10px] text-clay/85 leading-none truncate">
          {intentLabel}
        </span>
        <IntentScaleBar />
      </div>
    </div>
  )
}

interface AreaCellProps {
  letter: 'A' | 'B' | 'C'
  state: AreaState
  isLive: boolean
}

function AreaCell({ letter, state, isLive }: AreaCellProps) {
  const { t } = useTranslation()
  const stateClass =
    state === 'ACTIVE'
      ? 'bg-clay-tint text-clay-deep'
      : state === 'VOID'
        ? 'text-ink-faint border border-hairline'
        : 'bg-paper-deep text-ink-mute'

  return (
    <li
      className={cn(
        'relative flex flex-col gap-1 pl-2 leading-tight',
        isLive && 'text-ink',
      )}
    >
      {isLive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-clay rounded-[2px] pm-area-pulse"
        />
      )}
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="font-serif italic text-[11px] text-clay-deep shrink-0">
          {letter}
        </span>
        <span className="font-serif text-[11px] text-ink truncate">
          {t(`chat.areas.${letter}`)}
        </span>
      </div>
      <span
        className={cn(
          'font-mono text-[8px] tracking-[0.14em] uppercase px-1 py-px rounded-[2px] self-start leading-none',
          stateClass,
        )}
      >
        {t(`chat.areas.state.${state.toLowerCase()}`)}
      </span>
    </li>
  )
}
