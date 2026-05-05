interface Props {
  data: number[]
  width?: number
  height?: number
  color?: string
}

/**
 * Phase 9 — minimal SVG sparkline. ~25 lines. No dep.
 *
 * Used inside KPI cards. Renders a polyline scaled to the box.
 * Data is just a number[]; values are normalised to fit.
 */
export function Sparkline({ data, width = 120, height = 32, color = 'hsl(var(--clay))' }: Props) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = 0
  const stepX = width / (data.length - 1)
  const points = data
    .map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / (max - min)) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={width} height={height} className="block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  )
}
