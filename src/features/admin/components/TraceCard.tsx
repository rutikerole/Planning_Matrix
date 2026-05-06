import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
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
 * Used by Live Stream, Search, and (Phase 9.1) the inline admin
 * drawer. The visual shell + the inner content are decoupled:
 *
 *   * `<TraceCard>` wraps content in a react-router <Link> for
 *     standalone-console navigation.
 *
 *   * `<TraceCardButton>` wraps content in a <button> for inline
 *     expand/collapse UX (the inline drawer doesn't change URL).
 *
 *   * `<TraceCardContent>` renders the layout-agnostic body so a
 *     future caller can wrap with anything else.
 */

const TRACE_CARD_BASE_CLASS =
  'grid grid-cols-1 gap-2 rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--paper))] px-3 py-2.5 text-sm transition-colors hover:border-[hsl(var(--ink))]/25 hover:bg-[hsl(var(--ink))]/[0.02] md:grid-cols-[5.5rem_minmax(0,1fr)_auto_auto_auto] md:items-center md:gap-3'

export function TraceCard({ trace }: { trace: TraceRow }) {
  const href = trace.project_id
    ? `/admin/logs/projects/${trace.project_id}/turns/${trace.trace_id}`
    : '#'
  return (
    <Link to={href} className={TRACE_CARD_BASE_CLASS}>
      <TraceCardContent trace={trace} showProjectId />
    </Link>
  )
}

interface ButtonProps {
  trace: TraceRow
  onClick: () => void
  expanded?: boolean
  /** Hide the project_id sub-line — pointless when the drawer is
   *  already scoped to a known project. */
  hideProjectId?: boolean
}

export function TraceCardButton({ trace, onClick, expanded, hideProjectId }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded ?? undefined}
      className={cn(
        TRACE_CARD_BASE_CLASS,
        'w-full text-left',
        expanded && 'border-[hsl(var(--ink))]/40 bg-[hsl(var(--ink))]/[0.03]',
      )}
    >
      <TraceCardContent trace={trace} showProjectId={!hideProjectId} />
    </button>
  )
}

function TraceCardContent({
  trace,
  showProjectId,
}: {
  trace: TraceRow
  showProjectId: boolean
}) {
  const tokens =
    (trace.total_input_tokens ?? 0) +
    (trace.total_output_tokens ?? 0) +
    (trace.total_cache_read_tokens ?? 0) +
    (trace.total_cache_creation_tokens ?? 0)

  const kindLabel =
    trace.kind === 'chat_turn_streaming'
      ? 'stream'
      : trace.kind === 'chat_turn_priming'
        ? 'priming'
        : 'json'

  return (
    <>
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
          {formatRelativeTime(trace.started_at)}
          {showProjectId ? ` · project ${truncateUuid(trace.project_id)}` : null}
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
    </>
  )
}
