import type { TraceStatus } from '@/types/observability'

const PALETTE: Record<TraceStatus, { bg: string; fg: string; label: string }> = {
  ok:                  { bg: 'bg-emerald-50',     fg: 'text-emerald-800',   label: 'ok' },
  error:               { bg: 'bg-red-50',         fg: 'text-red-800',       label: 'error' },
  partial:             { bg: 'bg-amber-50',       fg: 'text-amber-800',     label: 'partial' },
  in_progress:         { bg: 'bg-sky-50',         fg: 'text-sky-800',       label: 'running' },
  idempotent_replay:   { bg: 'bg-slate-100',      fg: 'text-slate-700',     label: 'replay' },
}

export function StatusPill({ status }: { status: TraceStatus }) {
  const tone = PALETTE[status] ?? PALETTE.error
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${tone.bg} ${tone.fg}`}
    >
      {tone.label}
    </span>
  )
}
