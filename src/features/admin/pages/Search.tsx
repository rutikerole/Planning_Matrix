import { useEffect, useMemo, useState } from 'react'
import { useSearchQuery } from '../hooks/useSearchQuery'
import { TraceCard } from '../components/TraceCard'

const SAVED_KEY = 'pm-admin-saved-searches'
const EXAMPLES = [
  { label: 'errors today', query: `status:error from:${todayIsoDate()}` },
  { label: 'slow turns this week', query: `duration_ms:>10000 from:${daysAgo(7)}` },
  { label: 'expensive turns', query: 'cost_cents:>500' },
  { label: 'upstream overloads', query: 'error_class:upstream_overloaded' },
  { label: 'streaming only', query: 'kind:chat_turn_streaming' },
]

export function Search() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const { data, error, isFetching } = useSearchQuery(submitted)
  const [saved, setSaved] = useState<string[]>([])

  // Load saved searches from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY)
      setSaved(raw ? (JSON.parse(raw) as string[]) : [])
    } catch {
      // localStorage blocked or full — silently empty
    }
  }, [])

  const persistSaved = (list: string[]) => {
    setSaved(list)
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(list))
    } catch {
      // ignore
    }
  }

  const onSubmit = (q: string) => {
    setQuery(q)
    setSubmitted(q)
  }

  const onSave = () => {
    if (!query.trim()) return
    if (saved.includes(query)) return
    persistSaved([...saved, query])
  }

  const onRemoveSaved = (q: string) => {
    persistSaved(saved.filter((s) => s !== q))
  }

  const summary = useMemo(() => {
    if (!data) return null
    const c = data.parsed.clauses
    const u = data.parsed.unknownKeys
    return {
      clauses: c.length,
      unknown: u,
    }
  }, [data])

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl tracking-tight text-[hsl(var(--ink))]">Search</h1>
        <p className="text-sm text-[hsl(var(--ink))]/60">
          Datadog-style. Examples:{' '}
          <code className="rounded bg-[hsl(var(--ink))]/5 px-1.5 py-0.5 font-mono text-xs">
            status:error
          </code>{' '}
          ·{' '}
          <code className="rounded bg-[hsl(var(--ink))]/5 px-1.5 py-0.5 font-mono text-xs">
            cost_cents:&gt;500
          </code>{' '}
          ·{' '}
          <code className="rounded bg-[hsl(var(--ink))]/5 px-1.5 py-0.5 font-mono text-xs">
            from:2026-05-01 kind:chat_turn_streaming
          </code>
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(query)
        }}
        className="flex gap-2"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="status:error duration_ms:>10000"
          className="flex-1 rounded border border-[hsl(var(--ink))]/20 bg-transparent px-3 py-1.5 font-mono text-sm text-[hsl(var(--ink))] placeholder-[hsl(var(--ink))]/35 focus:border-[hsl(var(--ink))] focus:outline-none"
        />
        <button
          type="submit"
          className="rounded border border-[hsl(var(--ink))] bg-[hsl(var(--ink))] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--paper))]"
        >
          run
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!query.trim() || saved.includes(query)}
          className="rounded border border-[hsl(var(--ink))]/25 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/65 hover:text-[hsl(var(--ink))] disabled:opacity-30"
        >
          save
        </button>
      </form>

      {/* Example chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
          examples
        </span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => onSubmit(ex.query)}
            className="rounded border border-[hsl(var(--ink))]/15 px-2 py-0.5 font-mono text-[11px] text-[hsl(var(--ink))]/65 hover:border-[hsl(var(--ink))]/45 hover:text-[hsl(var(--ink))]"
            title={ex.query}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Saved */}
      {saved.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[hsl(var(--ink))]/10 pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
            saved
          </span>
          {saved.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded border border-[hsl(var(--ink))]/15 px-2 py-0.5 font-mono text-[11px] text-[hsl(var(--ink))]/75"
            >
              <button type="button" onClick={() => onSubmit(s)} className="hover:text-[hsl(var(--ink))]">
                {s}
              </button>
              <button
                type="button"
                onClick={() => onRemoveSaved(s)}
                className="text-[hsl(var(--ink))]/35 hover:text-red-700"
                aria-label={`Remove saved search ${s}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Result summary */}
      {submitted && (
        <div className="border-t border-[hsl(var(--ink))]/10 pt-3">
          {error ? (
            <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              couldn't parse: {(error as Error).message}
            </p>
          ) : isFetching ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
              searching…
            </p>
          ) : data ? (
            <div className="space-y-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55">
                {data.rows.length} matches · {summary?.clauses ?? 0} clauses
                {summary && summary.unknown.length > 0 ? (
                  <span className="ml-3 text-amber-700">
                    unknown keys: {summary.unknown.join(', ')}
                  </span>
                ) : null}
              </p>
              {data.rows.length === 0 ? (
                <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
                  no traces match
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {data.rows.map((t) => (
                    <li key={t.trace_id}>
                      <TraceCard trace={t} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
}
