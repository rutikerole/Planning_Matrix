import { centsToUsd } from '../lib/format'
import type { DailyBucket } from '../hooks/useCostMetrics'

interface Props {
  buckets: DailyBucket[]
}

/**
 * Phase 9 — daily stacked bar of cost by kind (json vs streaming).
 *
 * Hand-rolled SVG. Each day is one bar with two segments stacked
 * vertically. Y-axis auto-scales to the max-day total.
 */
export function StackedBarChart({ buckets }: Props) {
  if (buckets.length === 0) return null
  const width = 720
  const height = 200
  const padding = { top: 16, right: 12, bottom: 28, left: 48 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const max = Math.max(...buckets.map((b) => b.cost_cents), 1)
  const barW = innerW / buckets.length

  return (
    <div className="overflow-x-auto rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--paper))] p-3">
      <svg width={width} height={height} className="block min-w-full font-mono text-[9px]">
        {/* Y axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const y = padding.top + innerH * (1 - p)
          return (
            <g key={p}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="hsl(var(--ink) / 0.06)"
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                fill="hsl(var(--ink) / 0.4)"
                textAnchor="end"
              >
                {centsToUsd(max * p)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {buckets.map((b, i) => {
          const xLeft = padding.left + i * barW + 1
          const w = Math.max(2, barW - 2)
          const totalH = (b.cost_cents / max) * innerH
          const streamingH = (b.kind_streaming_cents / max) * innerH
          const jsonH = (b.kind_json_cents / max) * innerH
          const yStream = padding.top + innerH - totalH
          const yJson = yStream + streamingH
          return (
            <g key={b.date}>
              {streamingH > 0 && (
                <rect
                  x={xLeft}
                  y={yStream}
                  width={w}
                  height={streamingH}
                  fill="hsl(var(--clay))"
                  opacity={0.85}
                />
              )}
              {jsonH > 0 && (
                <rect
                  x={xLeft}
                  y={yJson}
                  width={w}
                  height={jsonH}
                  fill="hsl(var(--ink))"
                  opacity={0.55}
                />
              )}
              {/* X axis label every ~5 days */}
              {(i % Math.max(1, Math.floor(buckets.length / 6)) === 0 ||
                i === buckets.length - 1) && (
                <text
                  x={xLeft + w / 2}
                  y={height - padding.bottom + 14}
                  fill="hsl(var(--ink) / 0.45)"
                  textAnchor="middle"
                >
                  {b.date.slice(5)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/65">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 bg-[hsl(var(--clay))]" />
          stream
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 bg-[hsl(var(--ink))]/55" />
          json
        </span>
      </div>
    </div>
  )
}
