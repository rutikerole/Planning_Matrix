import { useTranslation } from 'react-i18next'
import type { ProjectState } from '@/types/projectState'
import { aggregateQualifiers, type SliceKey } from '../../lib/qualifierAggregate'

interface Props {
  state: Partial<ProjectState>
}

const SIZE = 56
const STROKE = 8
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

/**
 * Phase 8 — small donut chart for the Overview "Data quality" action
 * card. Reuses the `aggregateQualifiers` engine so the donut and the
 * header confidence percent stay derived from the same maths.
 *
 * Three concentric arcs (decided / calculated / assumed) sized by
 * count. Legend rendered alongside as 3 rows, color dot + label +
 * percentage. Empty state surfaces "—" as the percentage rather than
 * a misleading 0%.
 */
export function DataQualityDonut({ state }: Props) {
  const { t } = useTranslation()
  const aggregate = aggregateQualifiers(state)
  const total = aggregate.total

  const slices: Array<{ key: SliceKey; labelKey: string; tone: string; pct: number }> = [
    {
      key: 'DECIDED',
      labelKey: 'result.workspace.actions.decided',
      tone: 'bg-clay',
      pct: total ? aggregate.counts.DECIDED / total : 0,
    },
    {
      key: 'CALCULATED',
      labelKey: 'result.workspace.actions.calculated',
      tone: 'bg-clay/60',
      pct: total
        ? (aggregate.counts.CALCULATED + aggregate.counts.VERIFIED) / total
        : 0,
    },
    {
      key: 'ASSUMED',
      labelKey: 'result.workspace.actions.assumed',
      tone: 'bg-ink/22',
      pct: total
        ? (aggregate.counts.ASSUMED + aggregate.counts.UNKNOWN) / total
        : 0,
    },
  ]
  // v1.0.10 Bug 21 — independent Math.round per slice could sum to
  // 101 or 99 (Rutik's evidence: "65% + 12% + 24% = 101%"). Apply
  // the largest-remainder method (Hamilton) so the three labels
  // sum to exactly 100 when total > 0. The donut arcs themselves
  // continue to use the raw fractions for proportional widths; only
  // the legend integer labels are reconciled.
  const integerPercents: number[] = (() => {
    if (!total) return slices.map(() => 0)
    const raw = slices.map((s) => s.pct * 100)
    const floors = raw.map(Math.floor)
    const remainders = raw.map((r, i) => ({ idx: i, rem: r - floors[i] }))
    const sumFloor = floors.reduce((a, b) => a + b, 0)
    const distribute = Math.max(0, Math.min(slices.length, 100 - sumFloor))
    remainders.sort((a, b) => b.rem - a.rem || a.idx - b.idx)
    const out = floors.slice()
    for (let i = 0; i < distribute; i++) out[remainders[i].idx] += 1
    return out
  })()

  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
        className="shrink-0"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="hsl(var(--ink) / 0.10)"
          strokeWidth={STROKE}
        />
        {slices.map((slice) => {
          const dash = CIRC * slice.pct
          const dashArray = `${dash} ${CIRC - dash}`
          const dashOffset = -offset
          offset += dash
          const stroke =
            slice.key === 'DECIDED'
              ? 'hsl(var(--clay))'
              : slice.key === 'CALCULATED'
                ? 'hsl(var(--clay) / 0.55)'
                : 'hsl(var(--ink) / 0.22)'
          return (
            <circle
              key={slice.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={stroke}
              strokeWidth={STROKE}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              className="transition-[stroke-dasharray] duration-soft"
            />
          )
        })}
      </svg>
      <ul className="flex flex-col gap-1 text-[11px]">
        {slices.map((slice, i) => (
          <li key={slice.key} className="flex items-center gap-2 leading-snug">
            <span
              aria-hidden="true"
              className={`block size-2 rounded-[1px] ${slice.tone}`}
            />
            <span className="text-clay/85 flex-1">{t(slice.labelKey)}</span>
            <span className="font-medium text-ink/85 tabular-nums">
              {total ? `${integerPercents[i]}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
