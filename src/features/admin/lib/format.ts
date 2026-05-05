// ───────────────────────────────────────────────────────────────────────
// Phase 9 — formatting helpers for the Atelier Console.
//
// All money is stored as integer cents on the trace row (`total_cost_cents`)
// to avoid float drift. Display in USD with two decimals.
// All durations are stored as ms; display as ms / seconds depending on
// magnitude. All tokens are integers; display with k/M suffixes for
// readability above 10k.
// ───────────────────────────────────────────────────────────────────────

export function centsToUsd(cents: number): string {
  if (!Number.isFinite(cents)) return '$0.00'
  return `$${(cents / 100).toFixed(2)}`
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  const min = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return `${min}m ${s}s`
}

export function formatTokens(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

export function formatPercent(numerator: number, denominator: number): string {
  if (denominator === 0) return '0%'
  return `${((numerator / denominator) * 100).toFixed(0)}%`
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  const days = Math.floor(diff / 86_400_000)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function truncateUuid(id: string | null | undefined, len = 8): string {
  if (!id) return '—'
  return id.slice(0, len)
}
