import { useMemo, useState } from 'react'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import type { TraceRow } from '@/types/observability'
import { useProjectTraces } from '../hooks/useProjectTraces'
import { useTraceDetail } from '../hooks/useTraceDetail'
import { SpanGantt } from './SpanGantt'
import { JsonViewer } from './JsonViewer'
import { TraceCardButton } from './TraceCard'
import {
  centsToUsd,
  formatPercent,
  formatRelativeTime,
  formatTimestamp,
} from '../lib/format'

interface Props {
  projectId: string
  projectName: string
  open: boolean
  onClose: () => void
}

/**
 * Phase 9.1 — admin-only logs drawer for a single project.
 *
 * Right-side vaul drawer, 480px on desktop, full-width on mobile.
 * Shows three vertical sections:
 *   1. Quick stats — total traces, total cost, error rate
 *   2. Trace list — last 50, click row to expand inline
 *   3. Inline detail (when a row is expanded) — Gantt + persona
 *      snapshot + linked events. Reuses Phase 9 components directly.
 *
 * Mounts only when the user clicks the InlineLogsButton; the lazy
 * import means SpanGantt + JsonViewer + Vaul markup never enter
 * the main bundle.
 */
export default function InlineLogsDrawer({
  projectId,
  projectName,
  open,
  onClose,
}: Props) {
  const { data, isLoading, error } = useProjectTraces(projectId)
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null)

  const traces = data?.traces ?? []
  const stats = useMemo(() => computeStats(traces), [traces])

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
      direction="right"
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-[hsl(var(--ink))]/30" />
        <Drawer.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-[hsl(var(--paper))] outline-none md:w-[480px] md:border-l md:border-[hsl(var(--ink))]/15"
        >
          {/* Header */}
          <header className="flex items-start justify-between gap-3 border-b border-[hsl(var(--ink))]/10 px-4 py-3 md:px-5 md:py-4">
            <div className="min-w-0">
              <Drawer.Title className="truncate text-base text-[hsl(var(--ink))]">
                Logs · {projectName}
              </Drawer.Title>
              <Drawer.Description className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
                {traces.length} trace{traces.length === 1 ? '' : 's'}
                {traces[0]?.started_at ? (
                  <> · last {formatRelativeTime(traces[0].started_at)}</>
                ) : null}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close logs drawer"
              className="rounded p-1 text-[hsl(var(--ink))]/55 hover:bg-[hsl(var(--ink))]/[0.06] hover:text-[hsl(var(--ink))]"
            >
              <X className="size-4" />
            </button>
          </header>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 border-b border-[hsl(var(--ink))]/10 px-4 py-3 md:px-5">
            <Stat label="traces" value={String(stats.count)} />
            <Stat label="cost" value={centsToUsd(stats.cost_cents)} />
            <Stat
              label="errors"
              value={formatPercent(stats.errors, stats.count)}
              tone={stats.errors > 0 && stats.count > 0 && stats.errors / stats.count >= 0.1 ? 'warn' : undefined}
            />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3 md:px-5">
            {isLoading ? (
              <Empty label="loading traces…" />
            ) : error ? (
              <Empty label={`load failed: ${(error as Error).message}`} tone="error" />
            ) : traces.length === 0 ? (
              <Empty label="no traces yet — send a chat turn to see logs populate" />
            ) : (
              <ol className="space-y-1.5">
                {traces.slice(0, 50).map((t) => (
                  <li key={t.trace_id}>
                    <TraceCardButton
                      trace={t}
                      expanded={expandedTraceId === t.trace_id}
                      hideProjectId
                      onClick={() =>
                        setExpandedTraceId((cur) =>
                          cur === t.trace_id ? null : t.trace_id,
                        )
                      }
                    />
                    {expandedTraceId === t.trace_id ? (
                      <div className="mt-2 mb-3 rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--ink))]/[0.02] p-3">
                        <TraceDetailPanel traceId={t.trace_id} />
                      </div>
                    ) : null}
                  </li>
                ))}
                {traces.length > 50 ? (
                  <li className="pt-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
                    showing 50 of {traces.length} · use /admin/logs for the full history
                  </li>
                ) : null}
              </ol>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

// ── Sub-components ────────────────────────────────────────────────────

function Stat({
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
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
        {label}
      </p>
      <p
        className={`mt-0.5 text-base ${tone === 'warn' ? 'text-red-700' : 'text-[hsl(var(--ink))]'}`}
      >
        {value}
      </p>
    </div>
  )
}

function Empty({ label, tone }: { label: string; tone?: 'error' }) {
  return (
    <div
      className={`rounded border border-dashed px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] ${
        tone === 'error'
          ? 'border-red-300 text-red-700'
          : 'border-[hsl(var(--ink))]/15 text-[hsl(var(--ink))]/45'
      }`}
    >
      {label}
    </div>
  )
}

function TraceDetailPanel({ traceId }: { traceId: string }) {
  const { data, isLoading, error } = useTraceDetail(traceId)

  if (isLoading) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
        loading…
      </p>
    )
  }
  if (error || !data) {
    return (
      <p className="font-mono text-[10px] text-red-700">
        load failed: {(error as Error)?.message ?? 'unknown'}
      </p>
    )
  }

  const { trace, spans, snapshot, events } = data

  return (
    <div className="space-y-4 text-xs">
      {/* Compact metadata strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-[hsl(var(--ink))]/55">
        <span>{formatTimestamp(trace.started_at)}</span>
        {trace.model ? <span>· {trace.model}</span> : null}
        {trace.error_message ? (
          <span className="text-red-700">· {trace.error_message}</span>
        ) : null}
      </div>

      {/* Span Gantt */}
      <section>
        <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55">
          spans · {spans.length}
        </h3>
        <SpanGantt trace={trace} spans={spans} />
      </section>

      {/* Persona snapshot */}
      {snapshot ? (
        <SnapshotSection
          systemPrompt={snapshot.system_prompt_full}
          stateBlock={snapshot.state_block_full}
          messages={snapshot.messages_full}
          toolUseRaw={snapshot.tool_use_response_raw}
        />
      ) : (
        <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-3 py-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
          no snapshot captured for this trace (sampled out)
        </p>
      )}

      {/* Linked events */}
      <section>
        <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55">
          linked events · {events.length}
        </h3>
        {events.length === 0 ? (
          <p className="font-mono text-[10px] text-[hsl(var(--ink))]/45">none</p>
        ) : (
          <ul className="space-y-1">
            {events.slice(0, 12).map((e) => (
              <li
                key={e.id}
                className="rounded bg-[hsl(var(--paper))] px-2 py-1.5 text-[11px]"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/65">
                  {e.event_type}
                </span>
                {e.reason ? (
                  <span className="ml-2 text-[hsl(var(--ink))]/80">{e.reason}</span>
                ) : null}
              </li>
            ))}
            {events.length > 12 ? (
              <li className="font-mono text-[10px] text-[hsl(var(--ink))]/45">
                +{events.length - 12} more
              </li>
            ) : null}
          </ul>
        )}
      </section>
    </div>
  )
}

function SnapshotSection({
  systemPrompt,
  stateBlock,
  messages,
  toolUseRaw,
}: {
  systemPrompt: string | null
  stateBlock: string
  messages: unknown
  toolUseRaw: unknown
}) {
  const [section, setSection] = useState<'system' | 'state' | 'messages' | 'response' | null>(null)
  const tabs: Array<{ id: typeof section; label: string }> = [
    { id: 'system', label: `system${systemPrompt ? '' : ' (sampled out)'}` },
    { id: 'state', label: 'state' },
    { id: 'messages', label: 'messages' },
    { id: 'response', label: 'response' },
  ]
  return (
    <section>
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55">
        persona snapshot
      </h3>
      <div className="mb-2 flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.id ?? 'none'}
            type="button"
            onClick={() => setSection((cur) => (cur === t.id ? null : t.id))}
            className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
              section === t.id
                ? 'border-[hsl(var(--ink))] bg-[hsl(var(--ink))] text-[hsl(var(--paper))]'
                : 'border-[hsl(var(--ink))]/20 text-[hsl(var(--ink))]/65 hover:border-[hsl(var(--ink))]/45 hover:text-[hsl(var(--ink))]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {section === 'system' ? (
        systemPrompt ? (
          <pre className="max-h-72 overflow-auto rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--paper))] p-2 font-mono text-[10px] leading-relaxed text-[hsl(var(--ink))]/85 whitespace-pre-wrap">
            {systemPrompt}
          </pre>
        ) : (
          <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-3 py-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
            sampling skipped this turn
          </p>
        )
      ) : null}
      {section === 'state' ? (
        <pre className="max-h-72 overflow-auto rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--paper))] p-2 font-mono text-[10px] leading-relaxed text-[hsl(var(--ink))]/85 whitespace-pre-wrap">
          {stateBlock}
        </pre>
      ) : null}
      {section === 'messages' ? <JsonViewer value={messages} compact /> : null}
      {section === 'response' ? <JsonViewer value={toolUseRaw} compact /> : null}
    </section>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────

interface TraceStats {
  count: number
  cost_cents: number
  errors: number
}

function computeStats(traces: TraceRow[]): TraceStats {
  let cost = 0
  let errors = 0
  for (const t of traces) {
    cost += t.total_cost_cents ?? 0
    if (t.status === 'error' || t.status === 'partial') errors++
  }
  return { count: traces.length, cost_cents: cost, errors }
}
