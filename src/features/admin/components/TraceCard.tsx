import { Link } from 'react-router-dom'
import type { TraceRow } from '@/types/observability'
import { StatusPill } from './StatusPill'
import {
  centsToUsd,
  formatDuration,
  formatRelativeTime,
  formatTokens,
  truncateUuid,
} from '../lib/format'

/**
 * Phase 9 — shared trace summary card.
 *
 * Used by Live Stream and Search views. One row per trace. Status
 * pill + timestamp + kind + project link + duration/tokens/cost
 * inline. Click-through goes to /admin/logs/projects/:projectId/turns/:traceId.
 */
export function TraceCard({ trace }: { trace: TraceRow }) {
  const tokens =
    (trace.total_input_tokens ?? 0) +
    (trace.total_output_tokens ?? 0) +
    (trace.total_cache_read_tokens ?? 0) +
    (trace.total_cache_creation_tokens ?? 0)

  const href = trace.project_id
    ? `/admin/logs/projects/${trace.project_id}/turns/${trace.trace_id}`
    : '#'

  const kindLabel =
    trace.kind === 'chat_turn_streaming'
      ? 'stream'
      : trace.kind === 'chat_turn_priming'
        ? 'priming'
        : 'json'

  return (
    <Link
      to={href}
      className="grid grid-cols-1 gap-2 rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--paper))] px-3 py-2.5 text-sm hover:border-[hsl(var(--ink))]/25 hover:bg-[hsl(var(--ink))]/[0.02] md:grid-cols-[5.5rem_minmax(0,1fr)_auto_auto_auto] md:items-center md:gap-3"
    >
      <div className="flex items-center gap-2">
        <StatusPill status={trace.status} />
        <span className="font-mono text-[10px] text-[hsl(var(--ink))]/55">
          {kindLabel}
        </span>
      </div>

      <div className="min-w-0">
        <p className="truncate font-mono text-[11px] text-[hsl(var(--ink))]/85">
          {truncateUuid(trace.trace_id)}
          {trace.error_class ? (
            <span className="ml-2 text-red-700">· {trace.error_class}</span>
          ) : null}
        </p>
        <p className="font-mono text-[10px] text-[hsl(var(--ink))]/45">
          {formatRelativeTime(trace.started_at)} · project {truncateUuid(trace.project_id)}
        </p>
      </div>

      <span className="font-mono text-[11px] text-[hsl(var(--ink))]/65 text-right">
        {formatDuration(trace.duration_ms)}
      </span>
      <span className="font-mono text-[11px] text-[hsl(var(--ink))]/65 text-right">
        {formatTokens(tokens)}
      </span>
      <span className="font-mono text-[11px] text-[hsl(var(--ink))] text-right">
        {centsToUsd(trace.total_cost_cents ?? 0)}
      </span>
    </Link>
  )
}
