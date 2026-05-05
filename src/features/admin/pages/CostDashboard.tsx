import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCostMetrics } from '../hooks/useCostMetrics'
import { CostKpi } from '../components/CostKpi'
import { StackedBarChart } from '../components/StackedBarChart'
import { RatioLineChart } from '../components/RatioLineChart'
import { centsToUsd, formatPercent, formatTokens, truncateUuid } from '../lib/format'
import type { LeaderboardEntry } from '../hooks/useCostMetrics'

type Window = 1 | 7 | 30

export function CostDashboard() {
  const [windowDays, setWindowDays] = useState<Window>(30)
  const { data, isLoading, error } = useCostMetrics(windowDays)

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl tracking-tight text-[hsl(var(--ink))]">Cost</h1>
          <p className="text-sm text-[hsl(var(--ink))]/60">
            Token spend, cache savings, and per-project rollups.
          </p>
        </div>
        <WindowToggle value={windowDays} onChange={setWindowDays} />
      </header>

      {isLoading || !data ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
          {error ? `error: ${(error as Error).message}` : 'loading…'}
        </p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <CostKpi
              label={`spend · last ${windowDays}d`}
              value={centsToUsd(data.totals.cost_cents)}
              subtext={`${data.totals.trace_count} traces`}
              spark={data.daily.map((d) => d.cost_cents)}
            />
            <CostKpi
              label={`tokens · last ${windowDays}d`}
              value={formatTokens(data.totals.tokens)}
              subtext={`cache hit ${Math.round(data.totals.cache_hit_ratio * 100)}%`}
              spark={data.daily.map((d) => d.tokens)}
            />
            <CostKpi
              label={`error rate · last ${windowDays}d`}
              value={formatPercent(data.totals.error_count, data.totals.trace_count)}
              subtext={`${data.totals.error_count} errored / partial`}
              spark={data.daily.map((d) => d.error_count)}
            />
          </div>

          {/* Charts */}
          <section className="space-y-2">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/65">
              daily cost · stacked by kind
            </h2>
            <StackedBarChart buckets={data.daily} />
          </section>

          <section className="space-y-2">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/65">
              cache hit ratio
            </h2>
            <RatioLineChart buckets={data.daily} />
          </section>

          {/* Leaderboards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Leaderboard
              title="top projects · cost"
              rows={data.topProjects}
              renderLink={(r) => (
                <Link
                  to={`/admin/logs/projects/${r.key}`}
                  className="font-mono text-[11px] text-[hsl(var(--ink))] hover:underline"
                >
                  {truncateUuid(r.key)}
                </Link>
              )}
            />
            <Leaderboard
              title="top users · cost"
              rows={data.topUsers}
            />
            <Leaderboard
              title="most retried projects"
              rows={data.topRetries}
              renderLink={(r) => (
                <Link
                  to={`/admin/logs/projects/${r.key}`}
                  className="font-mono text-[11px] text-[hsl(var(--ink))] hover:underline"
                >
                  {truncateUuid(r.key)}
                </Link>
              )}
              metric="retry_count"
            />
          </div>
        </>
      )}
    </div>
  )
}

function WindowToggle({ value, onChange }: { value: Window; onChange: (w: Window) => void }) {
  const options: Window[] = [1, 7, 30]
  return (
    <div className="flex gap-1">
      {options.map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => onChange(w)}
          className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] ${
            value === w
              ? 'border-[hsl(var(--ink))] bg-[hsl(var(--ink))] text-[hsl(var(--paper))]'
              : 'border-[hsl(var(--ink))]/20 text-[hsl(var(--ink))]/65 hover:border-[hsl(var(--ink))]/45 hover:text-[hsl(var(--ink))]'
          }`}
        >
          {w === 1 ? '24h' : `${w}d`}
        </button>
      ))}
    </div>
  )
}

function Leaderboard({
  title,
  rows,
  renderLink,
  metric = 'cost_cents',
}: {
  title: string
  rows: LeaderboardEntry[]
  renderLink?: (r: LeaderboardEntry) => React.ReactNode
  metric?: 'cost_cents' | 'retry_count'
}) {
  return (
    <div className="rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--paper))] p-4">
      <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/40">
          —
        </p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, idx) => (
            <li key={r.key} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-[hsl(var(--ink))]/35">
                  {idx + 1}
                </span>
                {renderLink ? (
                  renderLink(r)
                ) : (
                  <span className="font-mono text-[hsl(var(--ink))]/85">
                    {truncateUuid(r.key)}
                  </span>
                )}
              </span>
              <span className="font-mono text-[hsl(var(--ink))]">
                {metric === 'cost_cents' ? centsToUsd(r.cost_cents) : `${r.retry_count} retry${r.retry_count === 1 ? '' : ''}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
