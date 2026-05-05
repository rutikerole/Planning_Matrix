// ───────────────────────────────────────────────────────────────────────
// Phase 9 — Atelier Console export helpers.
//
// Three formats:
//   * Single-trace bundle (JSON) — trace + spans + snapshot + events
//     plus a metadata header (exporter email, timestamp, schema version).
//   * Multi-trace stream (JSONL) — one trace row per line, no snapshots
//     (kept lean so a 30-day export doesn't blow up).
//   * Cost CSV — daily-bucket rollup, one row per date.
//
// All bundles are watermarked with "exported at <timestamp> by <email>"
// so any leaked file can be traced back to who pulled it.
// ───────────────────────────────────────────────────────────────────────

import type {
  PersonaSnapshotRow,
  ProjectEventRow,
  SpanRow,
  TraceRow,
} from '@/types/observability'
import type { DailyBucket } from '../hooks/useCostMetrics'

const SCHEMA_VERSION = 1

interface BundleMeta {
  schema_version: number
  exported_at: string
  exported_by: string
  source: 'planning_matrix_atelier_console'
}

function meta(adminEmail: string): BundleMeta {
  return {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    exported_by: adminEmail,
    source: 'planning_matrix_atelier_console',
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke on next tick so the download has finished initiating
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// ── Single trace bundle (JSON) ──────────────────────────────────────────

export function exportTraceBundle(args: {
  trace: TraceRow
  spans: SpanRow[]
  snapshot: PersonaSnapshotRow | null
  events: ProjectEventRow[]
  adminEmail: string
}) {
  const bundle = {
    meta: meta(args.adminEmail),
    trace: args.trace,
    spans: args.spans,
    persona_snapshot: args.snapshot,
    project_events: args.events,
  }
  const json = JSON.stringify(bundle, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const filename = `trace-${args.trace.trace_id.slice(0, 12)}.json`
  downloadBlob(blob, filename)
}

// ── Multi-trace JSONL ──────────────────────────────────────────────────

export function exportTracesJsonl(args: {
  traces: TraceRow[]
  adminEmail: string
  filename?: string
}) {
  const headerLine = JSON.stringify(meta(args.adminEmail))
  const lines = [headerLine, ...args.traces.map((t) => JSON.stringify(t))]
  const blob = new Blob([lines.join('\n')], { type: 'application/x-ndjson' })
  downloadBlob(blob, args.filename ?? `traces-${Date.now()}.jsonl`)
}

// ── Cost CSV ────────────────────────────────────────────────────────────

export function exportCostCsv(args: { buckets: DailyBucket[]; adminEmail: string }) {
  const m = meta(args.adminEmail)
  const lines: string[] = [
    `# exported at ${m.exported_at} by ${m.exported_by}`,
    `# schema_version=${m.schema_version} source=${m.source}`,
    'date,cost_cents,tokens,trace_count,error_count,kind_json_cents,kind_streaming_cents,cache_read,uncached_input',
  ]
  for (const b of args.buckets) {
    lines.push(
      [
        b.date,
        b.cost_cents,
        b.tokens,
        b.trace_count,
        b.error_count,
        b.kind_json_cents,
        b.kind_streaming_cents,
        b.cache_read,
        b.uncached_input,
      ].join(','),
    )
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  downloadBlob(blob, `cost-${Date.now()}.csv`)
}
