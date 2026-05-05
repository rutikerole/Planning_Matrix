import type { DailyBucket } from '../hooks/useCostMetrics'

interface Props {
  buckets: DailyBucket[]
}

/**
 * Phase 9 — line chart of cache-hit ratio over time.
 *
 * cache_read / (cache_read + uncached_input) per day. Hand-rolled SVG.
 */
export function RatioLineChart({ buckets }: Props) {
  if (buckets.length === 0) return null
  const width = 720
  const height = 180
  const padding = { top: 16, right: 12, bottom: 28, left: 48 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const ratios = buckets.map((b) => {
    const total = b.cache_read + b.uncached_input
    return total > 0 ? b.cache_read / total : 0
  })

  const stepX = innerW / Math.max(1, buckets.length - 1)
  const points = ratios
    .map((r, i) => {
      const x = padding.left + i * stepX
      const y = padding.top + innerH - r * innerH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className="overflow-x-auto rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--paper))] p-3">
      <svg width={width} height={height} className="block min-w-full font-mono text-[9px]">
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
                {Math.round(p * 100)}%
              </text>
            </g>
          )
        })}

        <polyline
          fill="none"
          stroke="hsl(var(--clay))"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />

        {ratios.map((r, i) => {
          if (i % Math.max(1, Math.floor(buckets.length / 10)) !== 0) return null
          const x = padding.left + i * stepX
          const y = padding.top + innerH - r * innerH
          return <circle key={i} cx={x} cy={y} r={2} fill="hsl(var(--clay))" />
        })}

        {buckets.map((b, i) => {
          if (
            i % Math.max(1, Math.floor(buckets.length / 6)) !== 0 &&
            i !== buckets.length - 1
          )
            return null
          const x = padding.left + i * stepX
          return (
            <text
              key={b.date}
              x={x}
              y={height - padding.bottom + 14}
              fill="hsl(var(--ink) / 0.45)"
              textAnchor="middle"
            >
              {b.date.slice(5)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
