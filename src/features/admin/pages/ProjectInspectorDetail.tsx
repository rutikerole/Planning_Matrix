import { Link, useParams } from 'react-router-dom'
import type { TraceRow } from '@/types/observability'
import { useProjectTraces } from '../hooks/useProjectTraces'
import { StatusPill } from '../components/StatusPill'
import {
  centsToUsd,
  formatDuration,
  formatRelativeTime,
  formatTimestamp,
  formatTokens,
  truncateUuid,
} from '../lib/format'

export function ProjectInspectorDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data, isLoading, error } = useProjectTraces(projectId)

  if (isLoading) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
        loading project…
      </p>
    )
  }
  if (error || !data) {
    return (
      <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
        {(error as Error)?.message ?? 'Project not found.'}
        <div className="mt-2">
          <Link to="/admin/logs/projects" className="font-mono text-[11px] uppercase tracking-[0.18em] hover:underline">
            ← back to projects
          </Link>
        </div>
      </div>
    )
  }

  const { project, traces } = data
  const totals = aggregate(traces)

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* ── Left: project context ───────────────────────────────── */}
      <aside className="space-y-6">
        <div>
          <Link
            to="/admin/logs/projects"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55 hover:text-[hsl(var(--ink))]"
          >
            ← projects
          </Link>
          <h1 className="mt-3 text-xl tracking-tight text-[hsl(var(--ink))]">
            {project.name}
          </h1>
          <p className="mt-1 font-mono text-[10px] text-[hsl(var(--ink))]/50">
            {truncateUuid(project.id, 12)} · {project.template_id} · {project.bundesland}
          </p>
          {project.plot_address ? (
            <p className="mt-2 text-sm text-[hsl(var(--ink))]/65">{project.plot_address}</p>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-[hsl(var(--ink))]/10 pt-4">
          <Field label="intent" value={project.intent} />
          <Field label="owner" value={truncateUuid(project.owner_id)} />
          <Field label="created" value={formatTimestamp(project.created_at)} />
          <Field label="last update" value={formatRelativeTime(project.updated_at)} />
        </div>

        <div className="space-y-2 border-t border-[hsl(var(--ink))]/10 pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--ink))]/35">
            cumulative
          </p>
          <Field label="turns" value={String(traces.length)} />
          <Field label="tokens" value={formatTokens(totals.tokens)} />
          <Field label="cost" value={centsToUsd(totals.cost_cents)} />
          <Field
            label="cache hit"
            value={
              totals.input_plus_cache > 0
                ? `${Math.round(
                    (totals.cache_read / totals.input_plus_cache) * 100,
                  )}%`
                : '—'
            }
          />
          <Field label="errors" value={`${totals.errors}`} />
        </div>

        <div className="border-t border-[hsl(var(--ink))]/10 pt-4">
          <Link
            to={`/projects/${project.id}`}
            target="_blank"
            rel="noreferrer"
            className="block font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55 hover:text-[hsl(var(--ink))]"
          >
            ↗ open as user
          </Link>
        </div>
      </aside>

      {/* ── Right: turn timeline ────────────────────────────────── */}
      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55">
          {traces.length} turn{traces.length === 1 ? '' : 's'}
        </h2>
        {traces.length === 0 ? (
          <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
            no traces yet for this project
          </p>
        ) : (
          <ol className="space-y-1.5">
            {traces.map((t, idx) => (
              <TurnRow
                key={t.trace_id}
                trace={t}
                index={traces.length - idx}
                projectId={project.id}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
        {label}
      </span>
      <span className="text-right text-xs text-[hsl(var(--ink))]/85">{value}</span>
    </div>
  )
}

function TurnRow({
  trace,
  index,
  projectId,
}: {
  trace: TraceRow
  index: number
  projectId: string
}) {
  return (
    <li>
      <Link
        to={`/admin/logs/projects/${projectId}/turns/${trace.trace_id}`}
        className="grid grid-cols-[2.5rem_5.5rem_minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded border border-transparent px-3 py-2 hover:border-[hsl(var(--ink))]/15 hover:bg-[hsl(var(--ink))]/[0.02]"
      >
        <span className="font-mono text-[10px] text-[hsl(var(--ink))]/45">#{index}</span>
        <StatusPill status={trace.status} />
        <span className="truncate font-mono text-[11px] text-[hsl(var(--ink))]/65">
          {formatTimestamp(trace.started_at)} ·{' '}
          {trace.kind === 'chat_turn_streaming' ? 'stream' : trace.kind === 'chat_turn_priming' ? 'priming' : 'json'}
          {trace.error_class ? ` · ${trace.error_class}` : ''}
        </span>
        <span className="font-mono text-[11px] text-[hsl(var(--ink))]/65">
          {formatDuration(trace.duration_ms)}
        </span>
        <span className="font-mono text-[11px] text-[hsl(var(--ink))]/65">
          {formatTokens(
            (trace.total_input_tokens ?? 0) +
              (trace.total_output_tokens ?? 0) +
              (trace.total_cache_read_tokens ?? 0) +
              (trace.total_cache_creation_tokens ?? 0),
          )}
        </span>
        <span className="font-mono text-[11px] text-[hsl(var(--ink))]">
          {centsToUsd(trace.total_cost_cents ?? 0)}
        </span>
      </Link>
    </li>
  )
}

function aggregate(traces: TraceRow[]) {
  let tokens = 0
  let cost_cents = 0
  let cache_read = 0
  let input_plus_cache = 0
  let errors = 0
  for (const t of traces) {
    const i = t.total_input_tokens ?? 0
    const o = t.total_output_tokens ?? 0
    const cr = t.total_cache_read_tokens ?? 0
    const cc = t.total_cache_creation_tokens ?? 0
    tokens += i + o + cr + cc
    cost_cents += t.total_cost_cents ?? 0
    cache_read += cr
    input_plus_cache += i + cr + cc
    if (t.status === 'error' || t.status === 'partial') errors++
  }
  return { tokens, cost_cents, cache_read, input_plus_cache, errors }
}
