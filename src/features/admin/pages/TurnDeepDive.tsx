import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as Collapsible from '@radix-ui/react-collapsible'
import type { TraceRow } from '@/types/observability'
import { useTraceDetail } from '../hooks/useTraceDetail'
import { SpanGantt } from '../components/SpanGantt'
import { JsonViewer } from '../components/JsonViewer'
import { StatusPill } from '../components/StatusPill'
import {
  centsToUsd,
  formatDuration,
  formatTimestamp,
  formatTokens,
} from '../lib/format'

/**
 * Phase 9 — replay view.
 *
 * Four sections, all independently collapsible:
 *   1. Trace overview card (IDs, status, tokens, cost, model)
 *   2. SVG Gantt of spans
 *   3. Persona snapshot — what the model saw and what it said
 *   4. Linked project_events (audit rows tagged with this trace_id)
 */
export function TurnDeepDive() {
  const { projectId, traceId } = useParams<{ projectId: string; traceId: string }>()
  const { data, isLoading, error } = useTraceDetail(traceId)

  if (isLoading) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
        loading trace…
      </p>
    )
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <Link
          to={`/admin/logs/projects/${projectId}`}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55 hover:text-[hsl(var(--ink))]"
        >
          ← back to project
        </Link>
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {(error as Error)?.message ?? 'Trace not found.'}
        </div>
      </div>
    )
  }

  const { trace, spans, snapshot, events } = data

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to={`/admin/logs/projects/${projectId}`}
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55 hover:text-[hsl(var(--ink))]"
      >
        ← back to project
      </Link>

      <Section title="overview" defaultOpen>
        <TraceOverview trace={trace} />
      </Section>

      <Section title={`spans · ${spans.length}`} defaultOpen>
        <SpanGantt trace={trace} spans={spans} />
      </Section>

      <Section title="persona snapshot — what the model saw + said">
        {snapshot ? (
          <PersonaSnapshotView
            systemPrompt={snapshot.system_prompt_full}
            stateBlock={snapshot.state_block_full}
            messages={snapshot.messages_full}
            toolUseRaw={snapshot.tool_use_response_raw}
            toolUseValidated={snapshot.tool_use_response_validated}
            hash={snapshot.system_prompt_hash}
          />
        ) : (
          <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
            no snapshot recorded for this turn
            <br />
            <span className="mt-1 block text-[hsl(var(--ink))]/30">
              successful turns are sampled at 1-in-50 to cap storage
            </span>
          </p>
        )}
      </Section>

      <Section title={`linked project_events · ${events.length}`}>
        {events.length === 0 ? (
          <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
            no audit events for this trace
          </p>
        ) : (
          <ul className="space-y-1.5">
            {events.map((e) => (
              <li
                key={e.id}
                className="rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--ink))]/[0.02] px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/65">
                    {e.event_type}
                  </span>
                  <span className="font-mono text-[10px] text-[hsl(var(--ink))]/45">
                    {formatTimestamp(e.created_at)}
                  </span>
                </div>
                {e.reason ? (
                  <p className="mt-1 text-[hsl(var(--ink))]/80">{e.reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────

function Section({
  title,
  defaultOpen,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className="flex w-full items-center justify-between border-b border-[hsl(var(--ink))]/10 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/65 hover:text-[hsl(var(--ink))]">
        <span>{title}</span>
        <span aria-hidden>{open ? '−' : '+'}</span>
      </Collapsible.Trigger>
      <Collapsible.Content className="pt-4">{children}</Collapsible.Content>
    </Collapsible.Root>
  )
}

function TraceOverview({ trace }: { trace: TraceRow }) {
  const totalTokens =
    (trace.total_input_tokens ?? 0) +
    (trace.total_output_tokens ?? 0) +
    (trace.total_cache_read_tokens ?? 0) +
    (trace.total_cache_creation_tokens ?? 0)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-3 rounded border border-[hsl(var(--ink))]/10 p-4">
        <div className="flex items-center justify-between">
          <CopyId label="trace_id" value={trace.trace_id} />
          <StatusPill status={trace.status} />
        </div>
        <CopyId label="client_request_id" value={trace.client_request_id ?? '—'} />
        <Field label="kind" value={trace.kind} />
        <Field label="model" value={trace.model ?? '—'} />
        <Field label="started" value={formatTimestamp(trace.started_at)} />
        <Field label="ended" value={formatTimestamp(trace.ended_at)} />
        <Field label="duration" value={formatDuration(trace.duration_ms)} />
        {trace.error_class ? (
          <Field
            label="error_class"
            value={trace.error_class}
            tone="error"
          />
        ) : null}
      </div>

      <div className="space-y-3 rounded border border-[hsl(var(--ink))]/10 p-4">
        <Field label="input tokens" value={formatTokens(trace.total_input_tokens)} mono />
        <Field label="output tokens" value={formatTokens(trace.total_output_tokens)} mono />
        <Field label="cache read" value={formatTokens(trace.total_cache_read_tokens)} mono />
        <Field label="cache creation" value={formatTokens(trace.total_cache_creation_tokens)} mono />
        <div className="border-t border-[hsl(var(--ink))]/10 pt-2">
          <Field label="total tokens" value={formatTokens(totalTokens)} mono />
          <Field label="cost" value={centsToUsd(trace.total_cost_cents ?? 0)} mono />
          <Field
            label="cache hit"
            value={
              totalTokens > 0
                ? `${Math.round(((trace.total_cache_read_tokens ?? 0) / Math.max(1, (trace.total_input_tokens ?? 0) + (trace.total_cache_read_tokens ?? 0) + (trace.total_cache_creation_tokens ?? 0))) * 100)}%`
                : '—'
            }
            mono
          />
        </div>
        {trace.function_version || trace.region ? (
          <div className="border-t border-[hsl(var(--ink))]/10 pt-2">
            <Field label="version" value={trace.function_version ?? '—'} />
            <Field label="region" value={trace.region ?? '—'} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PersonaSnapshotView({
  systemPrompt,
  stateBlock,
  messages,
  toolUseRaw,
  toolUseValidated,
  hash,
}: {
  systemPrompt: string | null
  stateBlock: string
  messages: unknown
  toolUseRaw: unknown
  toolUseValidated: unknown
  hash: string
}) {
  return (
    <div className="space-y-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
        prompt hash · <span className="text-[hsl(var(--ink))]/70">{hash.slice(0, 16)}…</span>
      </p>

      <SubSection title="system prompt — full">
        {systemPrompt ? (
          <pre className="max-h-96 overflow-auto rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--ink))]/[0.03] p-3 font-mono text-[11px] leading-relaxed text-[hsl(var(--ink))]/90 whitespace-pre-wrap">
            {systemPrompt}
          </pre>
        ) : (
          <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-3 py-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
            not stored on this turn — sampling skipped (or 30-day retention nulled it)
          </p>
        )}
      </SubSection>

      <SubSection title="state block (live, dynamic)">
        <pre className="max-h-96 overflow-auto rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--ink))]/[0.03] p-3 font-mono text-[11px] leading-relaxed text-[hsl(var(--ink))]/90 whitespace-pre-wrap">
          {stateBlock}
        </pre>
      </SubSection>

      <SubSection title="messages array (sent to Anthropic)">
        <JsonViewer value={messages} />
      </SubSection>

      <SubSection title="tool use — raw response from model">
        <JsonViewer value={toolUseRaw} />
      </SubSection>

      {toolUseValidated && toolUseValidated !== toolUseRaw ? (
        <SubSection title="tool use — validated/post-fix">
          <JsonViewer value={toolUseValidated} />
        </SubSection>
      ) : null}
    </div>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className="flex w-full items-center justify-between rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--ink))]/[0.02] px-3 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/65 hover:text-[hsl(var(--ink))]">
        <span>{title}</span>
        <span aria-hidden>{open ? '−' : '+'}</span>
      </Collapsible.Trigger>
      <Collapsible.Content className="pt-2">{children}</Collapsible.Content>
    </Collapsible.Root>
  )
}

function Field({
  label,
  value,
  tone,
  mono,
}: {
  label: string
  value: string
  tone?: 'error'
  mono?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
        {label}
      </span>
      <span
        className={`text-right text-xs ${mono ? 'font-mono' : ''} ${tone === 'error' ? 'text-red-700' : 'text-[hsl(var(--ink))]/85'}`}
      >
        {value}
      </span>
    </div>
  )
}

function CopyId({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable
    }
  }
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--ink))]/45">
        {label}
      </p>
      <button
        type="button"
        onClick={copy}
        className="font-mono text-[11px] text-[hsl(var(--ink))] hover:underline"
        title="click to copy"
      >
        {value}
        <span className="ml-2 text-[10px] text-[hsl(var(--ink))]/45">
          {copied ? 'copied' : '↗ copy'}
        </span>
      </button>
    </div>
  )
}
