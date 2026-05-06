import { useState } from 'react'
import {
  usePersonaEvolution,
  type PersonaVersion,
} from '../hooks/usePersonaEvolution'
import { PersonaDiffViewer } from './PersonaDiffViewer'
import { centsToUsd, formatRelativeTime, formatTimestamp } from '../lib/format'

interface Props {
  projectId: string
}

/**
 * Phase 9.2 — admin drawer Persona evolution tab.
 *
 * Aggregates traces by system_prompt_hash so admins can see how the
 * persona prompt has changed over a project's lifetime and whether
 * each change improved or hurt cache hit / error rate / cost.
 *
 * Each row: hash + first_seen + trace_count + cache_hit_ratio +
 * error_rate + avg_input_tokens + total_cost. Click a row to expand
 * a side-by-side diff against the previous version.
 *
 * Render gate: confirmed manually at 1280×800 / 1440×900 / 375×812.
 * Mobile diff is stacked rather than side-by-side (480px is too
 * narrow for two columns of mono text).
 */
export function PersonaEvolutionTab({ projectId }: Props) {
  const { data, isLoading, error } = usePersonaEvolution(projectId)
  const [expandedHash, setExpandedHash] = useState<string | null>(null)

  if (isLoading) {
    return (
      <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-3 py-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
        loading persona versions…
      </p>
    )
  }
  if (error) {
    return (
      <p className="rounded border border-red-300 bg-red-50 px-3 py-2 font-mono text-[11px] text-red-800">
        load failed: {(error as Error).message}
      </p>
    )
  }
  if (!data || data.versions.length === 0) {
    return (
      <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-3 py-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
        no persona snapshots recorded yet — sample lands at ~1/10 turns
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
        {data.versions.length} prompt {data.versions.length === 1 ? 'version' : 'versions'} ·
        oldest first
      </p>
      <ol className="space-y-2">
        {data.versions.map((v, idx) => {
          const prev = idx > 0 ? data.versions[idx - 1] : null
          return (
            <li key={v.hash}>
              <VersionRow
                version={v}
                prev={prev}
                expanded={expandedHash === v.hash}
                onToggle={() =>
                  setExpandedHash((cur) => (cur === v.hash ? null : v.hash))
                }
              />
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function VersionRow({
  version,
  prev,
  expanded,
  onToggle,
}: {
  version: PersonaVersion
  prev: PersonaVersion | null
  expanded: boolean
  onToggle: () => void
}) {
  const errorRate =
    version.trace_count > 0 ? version.error_count / version.trace_count : 0
  const cacheRegression =
    prev !== null && version.cache_hit_ratio < prev.cache_hit_ratio - 0.1
  const errorRegression =
    prev !== null &&
    errorRate > 0 &&
    errorRate >
      (prev.error_count / Math.max(1, prev.trace_count)) + 0.05

  return (
    <div className="rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--paper))]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[hsl(var(--ink))]/[0.02]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono text-[11px] text-[hsl(var(--ink))]">
            {version.hash_short}
          </span>
          <span className="font-mono text-[10px] text-[hsl(var(--ink))]/55">
            {formatRelativeTime(version.first_seen)}
          </span>
          <span className="font-mono text-[10px] text-[hsl(var(--ink))]/45">
            · {version.trace_count} turn{version.trace_count === 1 ? '' : 's'}
          </span>
        </div>
        <span className="font-mono text-[10px] text-[hsl(var(--ink))]/35">
          {expanded ? '−' : '+'}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-[hsl(var(--ink))]/5 px-3 py-2 font-mono text-[10px] sm:grid-cols-4">
        <Metric
          label="cache hit"
          value={`${Math.round(version.cache_hit_ratio * 100)}%`}
          tone={cacheRegression ? 'warn' : undefined}
        />
        <Metric
          label="errors"
          value={`${Math.round(errorRate * 100)}%`}
          tone={errorRegression ? 'warn' : undefined}
        />
        <Metric
          label="avg input"
          value={`${Math.round(version.avg_input_tokens / 1000) || '<1'}k`}
        />
        <Metric label="cost" value={centsToUsd(version.total_cost_cents)} />
      </div>

      {expanded ? (
        <div className="border-t border-[hsl(var(--ink))]/10 px-3 py-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/55">
            range: {formatTimestamp(version.first_seen)} →{' '}
            {formatTimestamp(version.last_seen)}
          </p>
          {prev ? (
            version.has_full_prompt && prev.has_full_prompt ? (
              <PersonaDiffViewer
                fromHash={prev.hash}
                toHash={version.hash}
                fromHashShort={prev.hash_short}
                toHashShort={version.hash_short}
              />
            ) : (
              <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-3 py-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
                full prompt not stored for one or both versions — diff unavailable
              </p>
            )
          ) : (
            <p className="font-mono text-[10px] text-[hsl(var(--ink))]/45">
              first version recorded — nothing to diff against
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'warn'
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
        {label}
      </p>
      <p
        className={
          tone === 'warn' ? 'text-red-700 font-medium' : 'text-[hsl(var(--ink))]/85'
        }
      >
        {value}
      </p>
    </div>
  )
}
