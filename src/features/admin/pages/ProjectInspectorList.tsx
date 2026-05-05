import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectsWithMetrics, type ProjectMetrics } from '../hooks/useProjectsWithMetrics'
import {
  centsToUsd,
  formatPercent,
  formatRelativeTime,
  formatTokens,
  truncateUuid,
} from '../lib/format'

type SortKey = 'name' | 'last_trace_at' | 'trace_count' | 'total_cost_cents' | 'error_rate'

export function ProjectInspectorList() {
  const { data, isLoading, error } = useProjectsWithMetrics()
  const [search, setSearch] = useState('')
  const [errorOnly, setErrorOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('last_trace_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const rows = useMemo(() => {
    const all = data ?? []
    const filtered = all.filter((p) => {
      if (errorOnly && p.error_count === 0) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          p.project_name.toLowerCase().includes(q) ||
          p.project_id.startsWith(q) ||
          p.bundesland.toLowerCase().includes(q)
        )
      }
      return true
    })
    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortKey) {
        case 'name':
          return a.project_name.localeCompare(b.project_name) * dir
        case 'last_trace_at':
          return ((a.last_trace_at ?? '').localeCompare(b.last_trace_at ?? '')) * dir
        case 'trace_count':
          return (a.trace_count - b.trace_count) * dir
        case 'total_cost_cents':
          return (a.total_cost_cents - b.total_cost_cents) * dir
        case 'error_rate': {
          const aRate = a.trace_count ? a.error_count / a.trace_count : 0
          const bRate = b.trace_count ? b.error_count / b.trace_count : 0
          return (aRate - bRate) * dir
        }
      }
    })
  }, [data, search, errorOnly, sortKey, sortDir])

  const flipSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl tracking-tight text-[hsl(var(--ink))]">Projects</h1>
        <p className="text-sm text-[hsl(var(--ink))]/60">
          Every project with admin-visible traces. Click a row to drop into its turn timeline.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-[hsl(var(--ink))]/10 pb-3">
        <input
          type="search"
          placeholder="filter by name, id, bundesland…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] rounded border border-[hsl(var(--ink))]/15 bg-transparent px-3 py-1.5 font-mono text-xs text-[hsl(var(--ink))] placeholder-[hsl(var(--ink))]/35 focus:border-[hsl(var(--ink))] focus:outline-none"
        />
        <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/65">
          <input
            type="checkbox"
            checked={errorOnly}
            onChange={(e) => setErrorOnly(e.target.checked)}
          />
          errors only
        </label>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
          {rows.length} / {data?.length ?? 0}
        </span>
      </div>

      {isLoading ? (
        <Empty label="loading projects…" />
      ) : error ? (
        <Empty label={`load failed: ${(error as Error).message}`} tone="error" />
      ) : rows.length === 0 ? (
        <Empty label="no projects match the filter" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--ink))]/15 text-[hsl(var(--ink))]/55">
                <Th onClick={() => flipSort('name')} active={sortKey === 'name'} dir={sortDir}>name</Th>
                <Th>owner</Th>
                <Th onClick={() => flipSort('last_trace_at')} active={sortKey === 'last_trace_at'} dir={sortDir}>last activity</Th>
                <Th onClick={() => flipSort('trace_count')} active={sortKey === 'trace_count'} dir={sortDir} align="right">turns</Th>
                <Th align="right">tokens</Th>
                <Th onClick={() => flipSort('total_cost_cents')} active={sortKey === 'total_cost_cents'} dir={sortDir} align="right">cost</Th>
                <Th onClick={() => flipSort('error_rate')} active={sortKey === 'error_rate'} dir={sortDir} align="right">err</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <Row key={p.project_id} p={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({
  children,
  onClick,
  active,
  dir,
  align,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  dir?: 'asc' | 'desc'
  align?: 'right'
}) {
  return (
    <th
      className={`px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] ${align === 'right' ? 'text-right' : ''} ${onClick ? 'cursor-pointer select-none hover:text-[hsl(var(--ink))]' : ''}`}
      onClick={onClick}
    >
      {children}
      {active ? <span className="ml-1 text-[hsl(var(--ink))]/45">{dir === 'asc' ? '↑' : '↓'}</span> : null}
    </th>
  )
}

function Row({ p }: { p: ProjectMetrics }) {
  const totalTokens =
    p.total_input_tokens +
    p.total_output_tokens +
    p.total_cache_read_tokens +
    p.total_cache_creation_tokens
  return (
    <tr className="border-b border-[hsl(var(--ink))]/5 hover:bg-[hsl(var(--ink))]/[0.02]">
      <td className="px-3 py-2.5">
        <Link
          to={`/admin/logs/projects/${p.project_id}`}
          className="block text-[hsl(var(--ink))] hover:underline"
        >
          {p.project_name}
        </Link>
        <span className="font-mono text-[10px] text-[hsl(var(--ink))]/45">
          {truncateUuid(p.project_id)} · {p.template_id} · {p.bundesland}
        </span>
      </td>
      <td className="px-3 py-2.5 font-mono text-[11px] text-[hsl(var(--ink))]/65">
        {truncateUuid(p.owner_id)}
      </td>
      <td className="px-3 py-2.5 text-[hsl(var(--ink))]/75">
        {formatRelativeTime(p.last_trace_at)}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-[hsl(var(--ink))]/85">
        {p.trace_count}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-[hsl(var(--ink))]/65">
        {formatTokens(totalTokens)}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-[hsl(var(--ink))]">
        {centsToUsd(p.total_cost_cents)}
      </td>
      <td className="px-3 py-2.5 text-right font-mono">
        <span
          className={
            p.error_count > 0 && p.trace_count > 0 && p.error_count / p.trace_count >= 0.1
              ? 'text-red-700'
              : 'text-[hsl(var(--ink))]/45'
          }
        >
          {formatPercent(p.error_count, p.trace_count)}
        </span>
      </td>
    </tr>
  )
}

function Empty({ label, tone }: { label: string; tone?: 'error' }) {
  return (
    <div
      className={`rounded border border-dashed px-5 py-12 text-center font-mono text-[11px] uppercase tracking-[0.18em] ${
        tone === 'error'
          ? 'border-red-300 text-red-700'
          : 'border-[hsl(var(--ink))]/15 text-[hsl(var(--ink))]/45'
      }`}
    >
      {label}
    </div>
  )
}
