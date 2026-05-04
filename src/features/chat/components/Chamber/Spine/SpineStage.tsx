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

  const subKey = `chat.spine.stages.${stage.id}.${
    stage.status === 'done'
      ? // Phase 7.6 — no-plot path swaps to subDoneNoPlot when the
        // stage carries the snippet sentinel that ResolvedSpineStage
        // emits for areas.A === 'VOID' on the plot_address row.
        stage.id === 'plot_address' && stage.snippet === '__no_plot__'
        ? 'subDoneNoPlot'
        : 'subDone'
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
      {/* Indicator column. Phase 7.6 §3.2 — done stages get the
        * owner specialist's sigil (clay-tint disc + glyph), giving
        * the rail real domain identity instead of a generic dot.
        * Live keeps the halo + filled clay disc as the dominant
        * focal point. Next + future stay simple geometric markers. */}
      <span
        aria-hidden="true"
        className="relative grid place-items-center w-[56px] pt-1"
      >
        {stage.status === 'live' ? (
          <span className="relative grid place-items-center">
            <span
              className="absolute inset-[-7px] rounded-full spine-glow"
              style={{ background: 'var(--spine-stage-halo)' }}
            />
            <span
              className="relative grid place-items-center size-[22px] rounded-full"
              style={{ background: 'hsl(var(--clay))', color: 'hsl(var(--paper))' }}
            >
              <SigilFor stageId={stage.id} size={12} />
            </span>
          </span>
        ) : stage.status === 'next' ? (
          <span
            className="size-[8px] rounded-full border"
            style={{ borderColor: 'hsl(var(--clay))', background: 'transparent' }}
          />
        ) : stage.status === 'done' ? (
          <span
            className="grid place-items-center size-[18px] rounded-full"
            style={{
              background: 'var(--spine-stage-halo-soft, rgba(123,92,63,0.08))',
              color: 'hsl(var(--clay))',
            }}
          >
            <SigilFor stageId={stage.id} size={10} />
          </span>
        ) : (
          <span
            className="size-1.5 rounded-full"
            style={{ background: 'rgba(26, 22, 18, 0.18)' }}
          />
        )}
      </span>

      {/* Content column — Phase 7.6 §1.5 typography bump:
        * title 11→13, sub 9→11, snippet 9→11. Line-height stays
        * 1.35 to keep three lines in the live row from overflowing
        * the 240 px column. */}
      <div className="relative flex flex-col gap-1 py-1 pr-3 min-w-0">
        <span
          id={titleId}
          className={cn(
            'text-[13px] leading-[1.35] text-ink',
            stage.status === 'live' ? 'font-medium' : 'font-normal',
          )}
        >
          {stage.title}
        </span>
        {showSub && (
          <span
            className={cn(
              'text-[11px] leading-tight',
              // Phase 7.7 §1.3 — live row's sub-line is italic-serif
              // marginalia ("Moderator · spricht / · speaking") to
              // give the live focal point character. Done / next stay
              // sans clay caps so the live row reads as the moment.
              stage.status === 'live'
                ? 'font-serif italic text-clay'
                : 'text-clay',
            )}
            style={
              stage.status === 'live'
                ? { letterSpacing: '0' }
                : { letterSpacing: '0.04em' }
            }
          >
            {t(subKey, { defaultValue: stage.specialistName })}
          </span>
        )}
        {showSnippet && (
          <span
            id={tooltipId}
            className="text-[11px] italic text-clay/85 font-serif leading-snug line-clamp-2"
            title={stage.snippet ?? ''}
          >
            {stage.snippet}
          </span>
        )}
        {/* Done-stage hover snippet — revealed via the
          * [data-spine-status='done']:hover rule in globals.css.
          * Suppressed for the __no_plot__ sentinel: the subDoneNoPlot
          * sub-line already says everything. */}
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
      {/* Live-stage left bar comes from globals.css ::before pseudo
        * (commit 5 — soft 4 px clay-tint shadow). The previous
        * inline absolute span is gone; the pseudo-element renders the
        * 2 px clay bar with `box-shadow: 4px 0 8px -2px rgba(...)`. */}
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

      {/* Phase 7.7 §1.3 — Roman numeral on done stages. Echoes the
        * architect's checklist register. 11 px italic Georgia clay,
        * right-aligned to the row edge. */}
      {stage.status === 'done' && (
        <span
          aria-hidden="true"
          className="absolute right-3 top-1.5 font-serif italic text-clay/72 leading-none"
          style={{ fontSize: '11px' }}
        >
          {romanNumeral(stage.index)}
        </span>
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

/** Render the stage's owner-specialist sigil. Falls back to a moderator
 *  glyph if a stage id is somehow not registered. */
function SigilFor({ stageId, size }: { stageId: string; size: number }) {
  const def = SPINE_STAGES.find((s) => s.id === stageId)
  const spec = def?.ownerSpecialist ?? 'moderator'
  return <ChamberSigil specialist={spec} size={size} />
}

const ROMAN_NUMERALS = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii']
function romanNumeral(index: number): string {
  return ROMAN_NUMERALS[index] ?? String(index)
}
