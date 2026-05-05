import { useMemo, useState } from 'react'
import type { SpanRow, TraceRow } from '@/types/observability'
import { formatDuration } from '../lib/format'

interface Props {
  trace: TraceRow
  spans: SpanRow[]
}

/**
 * Phase 9 — SVG Gantt for span timing within a single trace.
 *
 * Each span gets one row. Indent depth = parent_span_id chain length.
 * X-axis is absolute ms from trace.started_at; bar width = duration_ms.
 * Status maps to colour: ok = clay, error = red, cancelled = slate.
 *
 * Mobile fallback: SVG flattens to a vertical list with a relative
 * "fill bar" — same data, no horizontal scrolling.
 */
export function SpanGantt({ trace, spans }: Props) {
  const layout = useMemo(() => buildLayout(trace, spans), [trace, spans])
  const [hovered, setHovered] = useState<string | null>(null)

  if (spans.length === 0) {
    return (
      <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
        no spans recorded for this trace
      </p>
    )
  }

  const rowHeight = 22
  const labelWidth = 220
  const padding = 12
  const totalHeight = layout.rows.length * rowHeight + padding * 2
  const innerWidth = 560

  const detail = hovered ? spans.find((s) => s.span_id === hovered) : null

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded border border-[hsl(var(--ink))]/15 bg-[hsl(var(--ink))]/[0.015]">
        <svg
          width={labelWidth + innerWidth + padding * 2}
          height={totalHeight}
          className="block min-w-full font-mono text-[10px]"
        >
          {/* Time axis */}
          <line
            x1={labelWidth}
            x2={labelWidth + innerWidth}
            y1={padding - 2}
            y2={padding - 2}
            stroke="hsl(var(--ink) / 0.18)"
          />
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <g key={p}>
              <line
                x1={labelWidth + innerWidth * p}
                x2={labelWidth + innerWidth * p}
                y1={padding - 6}
                y2={totalHeight - padding}
                stroke="hsl(var(--ink) / 0.06)"
              />
              <text
                x={labelWidth + innerWidth * p}
                y={padding - 8}
                fill="hsl(var(--ink) / 0.4)"
                fontSize={9}
                textAnchor={p === 0 ? 'start' : p === 1 ? 'end' : 'middle'}
              >
                {formatDuration(layout.totalMs * p)}
              </text>
            </g>
          ))}

          {/* Span rows */}
          {layout.rows.map((row, idx) => {
            const y = padding + idx * rowHeight
            const x = labelWidth + (row.startMs / Math.max(layout.totalMs, 1)) * innerWidth
            const w = Math.max(2, (row.durationMs / Math.max(layout.totalMs, 1)) * innerWidth)
            const fill =
              row.status === 'error'
                ? 'hsl(0 65% 55%)'
                : row.status === 'cancelled'
                  ? 'hsl(220 12% 60%)'
                  : 'hsl(var(--clay))'
            return (
              <g
                key={row.span_id}
                onMouseEnter={() => setHovered(row.span_id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}
              >
                <text
                  x={padding}
                  y={y + rowHeight / 2 + 3}
                  fill="hsl(var(--ink) / 0.85)"
                  fontSize={10}
                >
                  {'· '.repeat(row.depth)}
                  {row.name}
                </text>
                <rect
                  x={x}
                  y={y + 5}
                  width={w}
                  height={rowHeight - 10}
                  fill={fill}
                  rx={2}
                  opacity={hovered && hovered !== row.span_id ? 0.45 : 0.85}
                />
                <text
                  x={x + w + 4}
                  y={y + rowHeight / 2 + 3}
                  fill="hsl(var(--ink) / 0.55)"
                  fontSize={9}
                >
                  {formatDuration(row.durationMs)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {detail ? (
        <div className="rounded border border-[hsl(var(--ink))]/15 bg-[hsl(var(--ink))]/[0.02] px-3 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55">
            {detail.name} · {formatDuration(detail.duration_ms)} · {detail.status}
          </p>
          {Object.keys(detail.attributes ?? {}).length > 0 ? (
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-[hsl(var(--ink))]/[0.04] p-2 font-mono text-[10px] leading-relaxed text-[hsl(var(--ink))]/85">
              {JSON.stringify(detail.attributes, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/35">
          hover a span for attributes
        </p>
      )}
    </div>
  )
}

interface LayoutRow {
  span_id: string
  name: string
  startMs: number
  durationMs: number
  depth: number
  status: SpanRow['status']
}

interface Layout {
  rows: LayoutRow[]
  totalMs: number
}

function buildLayout(trace: TraceRow, spans: SpanRow[]): Layout {
  const traceStart = new Date(trace.started_at).getTime()
  const totalMs = trace.duration_ms ?? Math.max(
    ...spans.map((s) =>
      s.ended_at ? new Date(s.ended_at).getTime() - traceStart : 0,
    ),
    0,
  )

  // Build a parent map for depth calc
  const byId = new Map<string, SpanRow>(spans.map((s) => [s.span_id, s]))
  function depthOf(s: SpanRow): number {
    let d = 0
    let cur: SpanRow | undefined = s
    while (cur && cur.parent_span_id) {
      cur = byId.get(cur.parent_span_id)
      d++
      if (d > 10) break  // defensive against cycles
    }
    return d
  }

  const rows = spans.map((s): LayoutRow => ({
    span_id: s.span_id,
    name: s.name,
    startMs: Math.max(0, new Date(s.started_at).getTime() - traceStart),
    durationMs: s.duration_ms ?? 0,
    depth: depthOf(s),
    status: s.status,
  }))

  return { rows, totalMs }
}
