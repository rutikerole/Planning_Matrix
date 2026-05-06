import { useState } from 'react'
import { useProjectEvents, type EventLogRow } from '../hooks/useProjectEvents'
import { formatRelativeTime, formatTimestamp, truncateUuid } from '../lib/format'

const SOURCE_OPTIONS = [
  { value: 'all', label: 'all' },
  { value: 'wizard', label: 'wizard' },
  { value: 'chat', label: 'chat' },
  { value: 'result', label: 'result' },
  { value: 'sentry', label: 'errors' },
  { value: 'system', label: 'system' },
] as const

const WINDOW_OPTIONS = [
  { value: 60 * 60 * 1000, label: '1h' },
  { value: 24 * 60 * 60 * 1000, label: '24h' },
  { value: 7 * 24 * 60 * 60 * 1000, label: '7d' },
  { value: 0, label: 'all' },
] as const

const SOURCE_TONE: Record<string, string> = {
  wizard: 'bg-amber-50 text-amber-800',
  chat: 'bg-sky-50 text-sky-800',
  result: 'bg-emerald-50 text-emerald-800',
  sentry: 'bg-red-50 text-red-800',
  system: 'bg-slate-100 text-slate-700',
  auth: 'bg-violet-50 text-violet-800',
  dashboard: 'bg-fuchsia-50 text-fuchsia-800',
}

interface Props {
  projectId: string
}

/**
 * Phase 9.2 — admin drawer Events tab.
 *
 * Vertical timeline of every event_log row for this project. Filter
 * chips: source bucket, name substring, time window. Each event
 * row expands to show its full attributes JSON.
 *
 * Render gate: confirmed manually at 1280×800 / 1440×900 / 375×812.
 * No animation — works under reduced-motion automatically.
 */
export function EventsTab({ projectId }: Props) {
  const [source, setSource] = useState<string>('all')
  const [namePattern, setNamePattern] = useState('')
  const [windowMs, setWindowMs] = useState<number>(24 * 60 * 60 * 1000)
  const { data, isLoading, error } = useProjectEvents(projectId, {
    source,
    namePattern: namePattern || undefined,
    windowMs,
  })

  return (
    <div className="space-y-3">
      <div className="space-y-2 border-b border-[hsl(var(--ink))]/10 pb-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
            source
          </span>
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSource(opt.value)}
              className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
                source === opt.value
                  ? 'border-[hsl(var(--ink))] bg-[hsl(var(--ink))] text-[hsl(var(--paper))]'
                  : 'border-[hsl(var(--ink))]/20 text-[hsl(var(--ink))]/65 hover:border-[hsl(var(--ink))]/45 hover:text-[hsl(var(--ink))]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
            window
          </span>
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setWindowMs(opt.value)}
              className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
                windowMs === opt.value
                  ? 'border-[hsl(var(--ink))] bg-[hsl(var(--ink))] text-[hsl(var(--paper))]'
                  : 'border-[hsl(var(--ink))]/20 text-[hsl(var(--ink))]/65 hover:border-[hsl(var(--ink))]/45 hover:text-[hsl(var(--ink))]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="filter by name (e.g. 'tab' or 'send_clicked')"
          value={namePattern}
          onChange={(e) => setNamePattern(e.target.value)}
          className="w-full rounded border border-[hsl(var(--ink))]/15 bg-transparent px-2 py-1 font-mono text-[11px] text-[hsl(var(--ink))] placeholder-[hsl(var(--ink))]/35 focus:border-[hsl(var(--ink))] focus:outline-none"
        />
      </div>

      {isLoading ? (
        <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-3 py-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
          loading events…
        </p>
      ) : error ? (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 font-mono text-[11px] text-red-800">
          load failed: {(error as Error).message}
        </p>
      ) : !data || data.length === 0 ? (
        <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-3 py-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
          no events match this filter
        </p>
      ) : (
        <ul className="space-y-1">
          {data.map((e) => (
            <EventRow key={e.event_id} event={e} />
          ))}
        </ul>
      )}
    </div>
  )
}

function EventRow({ event }: { event: EventLogRow }) {
  const [open, setOpen] = useState(false)
  const tone = SOURCE_TONE[event.source] ?? 'bg-slate-100 text-slate-700'
  const hasAttrs = Object.keys(event.attributes ?? {}).length > 0

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[3rem_5.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded border border-transparent px-2 py-1.5 text-left hover:border-[hsl(var(--ink))]/15 hover:bg-[hsl(var(--ink))]/[0.02]"
      >
        <span className="font-mono text-[10px] text-[hsl(var(--ink))]/45">
          {formatRelativeTime(event.server_ts)}
        </span>
        <span
          className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${tone}`}
        >
          {event.source}
        </span>
        <span className="truncate font-mono text-[11px] text-[hsl(var(--ink))]/85">
          {event.name}
        </span>
        <span className="font-mono text-[10px] text-[hsl(var(--ink))]/35">
          {hasAttrs ? (open ? '−' : '+') : ''}
        </span>
      </button>
      {open ? (
        <div className="mb-2 ml-12 mt-1 rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--ink))]/[0.02] p-2">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] text-[hsl(var(--ink))]/55">
            <span>{formatTimestamp(event.server_ts)}</span>
            <span>session {truncateUuid(event.session_id)}</span>
            {event.trace_id ? <span>trace {truncateUuid(event.trace_id)}</span> : null}
            {event.url_path ? <span>{event.url_path}</span> : null}
          </div>
          {hasAttrs ? (
            <pre className="max-h-48 overflow-auto rounded bg-[hsl(var(--paper))] p-2 font-mono text-[10px] leading-relaxed text-[hsl(var(--ink))]/85">
              {JSON.stringify(event.attributes, null, 2)}
            </pre>
          ) : (
            <p className="font-mono text-[10px] text-[hsl(var(--ink))]/45">
              (no attributes)
            </p>
          )}
        </div>
      ) : null}
    </li>
  )
}
