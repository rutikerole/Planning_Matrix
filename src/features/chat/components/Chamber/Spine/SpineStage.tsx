// Phase 7.8 — Reading Room layout (Direction A).
//
// Stage row composition: `[sigil 14×14] [name + optional sub-line]`.
// Per status:
//   done   — paper-card sigil disc + clay strike-through name (0.45 opacity).
//   live   — filled-clay sigil disc + paper glyph + 13 px ink name +
//             italic-serif "speaking now" sub-line + clay-tint row bg
//             + 2 px clay left bar (from the [data-spine-status='live']
//             ::before pseudo in globals.css).
//   next   — paper-card sigil disc + clay-bordered hairline (0.6
//             alpha) + ink name (regular weight).
//   future — no fill + ink/18 hairline border on the disc + sigil
//             at ink/32 + name at ink/55.
//
// The 7.7 dot column + Roman numerals + halo pulse are gone. The
// row's left bar + clay-tint bg are the live prominence.

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { ResolvedSpineStage } from '../../../hooks/useSpineStages'
import { SPINE_STAGES } from '../../../lib/spineStageDefinitions'
import { ChamberSigil } from '../../../lib/specialistSigils'

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

  const titleId = `spine-stage-${stage.id}-title`
  const tooltipId = `spine-stage-${stage.id}-tooltip`
  const ariaCurrent = stage.status === 'live' ? 'step' : undefined

  const def = SPINE_STAGES.find((s) => s.id === stage.id)
  const owner = def?.ownerSpecialist ?? 'moderator'

  return (
    <li
      data-spine-stage={stage.id}
      data-spine-status={stage.status}
      aria-current={ariaCurrent}
      aria-labelledby={titleId}
      className={cn(
        'relative grid grid-cols-[20px_1fr] items-center gap-3 transition-[opacity,background-color] duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        stage.status === 'live'
          ? 'py-1.5 -mx-2 px-2 rounded-[3px]'
          : 'py-1',
        stage.status === 'done' && 'opacity-100 hover:opacity-90 cursor-pointer',
        stage.status === 'next' && 'opacity-100',
        stage.status === 'future' && 'opacity-100',
      )}
      style={
        stage.status === 'live'
          ? { background: 'rgba(123,92,63,0.06)' }
          : undefined
      }
    >
      {/* Sigil column — 14×14 disc, status-keyed fill / glyph color. */}
      <span
        aria-hidden="true"
        className="relative grid place-items-center w-5 h-5"
      >
        <SigilDisc owner={owner} status={stage.status} />
      </span>

      {/* Content column */}
      <div className="relative flex flex-col gap-0.5 min-w-0 pr-3">
        <span
          id={titleId}
          className={cn(
            'leading-[1.3] text-ink',
            stage.status === 'live'
              ? 'text-[13px] font-medium'
              : stage.status === 'future'
                ? 'text-[12.5px] font-normal text-ink/55'
                : 'text-[12.5px] font-normal',
            stage.status === 'done' && 'opacity-45',
          )}
          style={
            stage.status === 'done'
              ? {
                  textDecoration: 'line-through',
                  textDecorationColor: 'rgba(123,92,63,0.4)',
                  textDecorationThickness: '0.5px',
                }
              : undefined
          }
        >
          {stage.title}
        </span>

        {stage.status === 'live' && (
          <span
            className="text-[11px] italic text-clay leading-tight"
            style={{ fontFamily: "Georgia, 'Instrument Serif', serif" }}
          >
            {t('chat.chamber.stage.speakingNow')}
          </span>
        )}

        {/* Done-stage hover snippet — revealed via the
          * [data-spine-status='done']:hover rule in globals.css.
          * Suppressed for the __no_plot__ sentinel. */}
        {stage.status === 'done' &&
          stage.snippet &&
          stage.snippet !== '__no_plot__' && (
            <span
              id={tooltipId}
              data-spine-tooltip="true"
              role="tooltip"
              className="absolute left-0 right-0 top-full mt-0.5 text-[11px] italic text-clay/85 font-serif leading-snug line-clamp-2"
              title={stage.snippet}
            >
              {t('chat.spine.tooltip.donePrefix')} {stage.snippet}
            </span>
          )}
      </div>

      {isClickable ? (
        <button
          type="button"
          onClick={() => onClick?.(stage.id)}
          aria-label={`${stage.title} — ${stage.specialistName}`}
          aria-describedby={stage.snippet ? tooltipId : undefined}
          className="absolute inset-0 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card z-[2]"
        >
          <span className="sr-only">{stage.title}</span>
        </button>
      ) : null}
    </li>
  )
}

/** 14×14 sigil disc per status. */
type Owner =
  | 'moderator'
  | 'planungsrecht'
  | 'bauordnungsrecht'
  | 'sonstige_vorgaben'
  | 'verfahren'
  | 'beteiligte'
  | 'synthesizer'

function SigilDisc({
  owner,
  status,
}: {
  owner: Owner
  status: ResolvedSpineStage['status']
}) {
  const size = 14
  const inner = 9

  if (status === 'live') {
    return (
      <span
        className="grid place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          background: 'hsl(var(--clay))',
          color: 'hsl(var(--paper))',
        }}
      >
        <ChamberSigil specialist={owner} size={inner} />
      </span>
    )
  }
  if (status === 'next') {
    return (
      <span
        className="grid place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          background: 'hsl(var(--paper))',
          border: '0.5px solid rgba(123,92,63,0.6)',
          color: 'hsl(var(--clay))',
        }}
      >
        <ChamberSigil specialist={owner} size={inner} />
      </span>
    )
  }
  if (status === 'done') {
    return (
      <span
        className="grid place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          background: 'hsl(var(--paper))',
          border: '0.5px solid rgba(123,92,63,0.4)',
          color: 'hsl(var(--clay))',
          opacity: 0.55,
        }}
      >
        <ChamberSigil specialist={owner} size={inner} />
      </span>
    )
  }
  // future
  return (
    <span
      className="grid place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: 'transparent',
        border: '0.5px solid rgba(26,22,18,0.18)',
        color: 'rgba(26,22,18,0.32)',
      }}
    >
      <ChamberSigil specialist={owner} size={inner} />
    </span>
  )
}
