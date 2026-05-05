import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useLiveStream, DEFAULT_FILTERS, type LiveStreamFilters } from '../hooks/useLiveStream'
import { TraceCard } from '../components/TraceCard'
import { exportTracesJsonl } from '../lib/exportBundle'

export function LiveStream() {
  const [filters, setFilters] = useState<LiveStreamFilters>(DEFAULT_FILTERS)
  const { data, isLoading, error, dataUpdatedAt } = useLiveStream(filters)
  const adminEmail = useAuthStore((s) => s.user?.email ?? 'unknown@planning-matrix')

  const handleExport = () => {
    if (!data || data.length === 0) return
    exportTracesJsonl({ traces: data, adminEmail, filename: `live-${Date.now()}.jsonl` })
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl tracking-tight text-[hsl(var(--ink))]">Live stream</h1>
          <p className="text-sm text-[hsl(var(--ink))]/60">
            Recent traces across every project. Polls every 5 seconds (paused when this tab is in background).
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={!data || data.length === 0}
          className="rounded border border-[hsl(var(--ink))]/20 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/65 hover:text-[hsl(var(--ink))] disabled:opacity-30"
        >
          ↓ export jsonl
        </button>
      </header>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[hsl(var(--ink))]/10 pb-3">
        <ChipGroup<LiveStreamFilters['status']>
          label="status"
          value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={[
            { value: 'all', label: 'all' },
            { value: 'ok', label: 'ok' },
            { value: 'error', label: 'errors' },
            { value: 'partial', label: 'partial' },
            { value: 'idempotent_replay', label: 'replay' },
          ]}
        />
        <ChipGroup<LiveStreamFilters['kind']>
          label="kind"
          value={filters.kind}
          onChange={(v) => setFilters((f) => ({ ...f, kind: v }))}
          options={[
            { value: 'all', label: 'all' },
            { value: 'chat_turn_streaming', label: 'stream' },
            { value: 'chat_turn_json', label: 'json' },
          ]}
        />
        <ChipGroup<LiveStreamFilters['windowMinutes']>
          label="window"
          value={filters.windowMinutes}
          onChange={(v) => setFilters((f) => ({ ...f, windowMinutes: v }))}
          options={[
            { value: 5, label: '5m' },
            { value: 15, label: '15m' },
            { value: 60, label: '1h' },
            { value: 1440, label: '24h' },
          ]}
        />

        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
          {data?.length ?? 0} traces · refreshed {Math.floor((Date.now() - dataUpdatedAt) / 1000)}s ago
        </span>
      </div>

      {/* Body */}
      {isLoading ? (
        <Empty label="loading…" />
      ) : error ? (
        <Empty label={`load failed: ${(error as Error).message}`} tone="error" />
      ) : !data || data.length === 0 ? (
        <Empty label="no traces in this window" />
      ) : (
        <ul className="space-y-1.5">
          {data.map((t) => (
            <li key={t.trace_id}>
              <TraceCard trace={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface ChipOption<T> {
  value: T
  label: string
}

function ChipGroup<T extends string | number>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: ChipOption<T>[]
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] ${
              value === opt.value
                ? 'border-[hsl(var(--ink))] bg-[hsl(var(--ink))] text-[hsl(var(--paper))]'
                : 'border-[hsl(var(--ink))]/20 text-[hsl(var(--ink))]/65 hover:border-[hsl(var(--ink))]/45 hover:text-[hsl(var(--ink))]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
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
