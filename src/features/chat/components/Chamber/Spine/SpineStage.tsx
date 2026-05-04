// Phase 7.5 — SpineStage.
//
// One stage row over the rail. Status determines indicator + label
// + interactivity:
//   done   — small filled dot, opacity 0.42, clickable (scrolls to
//             firstMessageIndex), hover bumps opacity + reveals snippet.
//   live   — 12 px filled clay + halo pulse, full opacity, left bar
//             accent, snippet inline, no click handler.
//   next   — 7 px hollow ring, regular weight title, "next" sub.
//   future — 6 px faint dot, opacity 0.55, title only.
//
// Grid: [56 px indicator col | 1fr content col].

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { ResolvedSpineStage } from '../../../hooks/useSpineStages'

interface Props {
  stage: ResolvedSpineStage
  onClick?: (id: string) => void
}

export function SpineStage({ stage, onClick }: Props) {
  const { t } = useTranslation()
  const isClickable =
    stage.status === 'done' &&
    stage.firstMessageIndex != null &&
    onClick != null

  const subKey = `chat.spine.stages.${stage.id}.${
    stage.status === 'done'
      ? 'subDone'
      : stage.status === 'live'
        ? 'subLive'
        : 'subNext'
  }`
  const showSub = stage.status !== 'future'
  const showSnippet = stage.status === 'live' && stage.snippet
  const titleId = `spine-stage-${stage.id}-title`
  const tooltipId = `spine-stage-${stage.id}-tooltip`
  const ariaCurrent = stage.status === 'live' ? 'step' : undefined

  const Inner = (
    <>
      {/* Indicator column */}
      <span
        aria-hidden="true"
        className="relative grid place-items-center w-[56px] pt-1.5"
      >
        {stage.status === 'live' ? (
          <span className="relative grid place-items-center">
            <span
              className="absolute inset-[-6px] rounded-full spine-glow"
              style={{ background: 'var(--spine-stage-halo)' }}
            />
            <span
              className="relative size-3 rounded-full"
              style={{ background: 'hsl(var(--clay))' }}
            />
          </span>
        ) : stage.status === 'next' ? (
          <span
            className="size-[7px] rounded-full border"
            style={{ borderColor: 'hsl(var(--clay))', background: 'transparent' }}
          />
        ) : stage.status === 'done' ? (
          <span
            className="size-2 rounded-full"
            style={{ background: 'hsl(var(--clay))' }}
          />
        ) : (
          <span
            className="size-1.5 rounded-full"
            style={{ background: 'rgba(26, 22, 18, 0.18)' }}
          />
        )}
      </span>

      {/* Content column */}
      <div className="flex flex-col gap-0.5 py-1 pr-3 min-w-0">
        <span
          id={titleId}
          className={cn(
            'text-[11px] leading-[1.3] text-ink',
            stage.status === 'live' ? 'font-medium' : 'font-normal',
          )}
        >
          {stage.title}
        </span>
        {showSub && (
          <span
            className="text-[9px] text-clay leading-tight"
            style={{ letterSpacing: '0.04em' }}
          >
            {t(subKey, { defaultValue: stage.specialistName })}
          </span>
        )}
        {showSnippet && (
          <span
            id={tooltipId}
            className="text-[9px] italic text-clay/85 font-serif leading-tight truncate"
            title={stage.snippet ?? ''}
          >
            {stage.snippet}
          </span>
        )}
      </div>
    </>
  )

  return (
    <li
      data-spine-stage={stage.id}
      data-spine-status={stage.status}
      aria-current={ariaCurrent}
      aria-labelledby={titleId}
      className={cn(
        'relative grid grid-cols-[56px_1fr] py-1.5 transition-[opacity,transform] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        stage.status === 'done' && 'opacity-[var(--spine-stage-done-opacity)] hover:opacity-70 cursor-pointer',
        stage.status === 'future' && 'opacity-[var(--spine-stage-future-opacity)]',
        stage.status === 'live' && 'opacity-100',
        stage.status === 'next' && 'opacity-100',
      )}
    >
      {/* Live-stage left bar */}
      {stage.status === 'live' && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{ background: 'var(--spine-stage-live-bar)' }}
        />
      )}
      {/* Live-stage soft bg */}
      {stage.status === 'live' && (
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, var(--spine-stage-halo-soft) 0%, transparent 60%)',
          }}
        />
      )}
      {isClickable ? (
        <button
          type="button"
          onClick={() => onClick?.(stage.id)}
          aria-label={`${stage.title} — ${stage.specialistName}`}
          aria-describedby={stage.snippet ? tooltipId : undefined}
          className="absolute inset-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card z-[2]"
        >
          <span className="sr-only">{stage.title}</span>
        </button>
      ) : null}
      <span className="contents relative z-[1]">{Inner}</span>
    </li>
  )
}
