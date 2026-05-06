import { useMemo } from 'react'
import { usePersonaPrompt } from '../hooks/usePersonaEvolution'

interface Props {
  fromHash: string
  toHash: string
  fromHashShort: string
  toHashShort: string
}

/**
 * Phase 9.2 — minimal line-level diff between two persona prompts.
 *
 * Hand-rolled (no jsdiff dep — saves ~12 KB gz on the admin chunk).
 * Uses LCS (longest common subsequence) over lines to mark each line
 * as unchanged / added / removed. ~80 lines of code total.
 *
 * Layout: stacked (top: removed lines from `from`, bottom: added
 * lines from `to`). Side-by-side would be cramped at 480px drawer
 * width on mobile and 320px on the standalone console.
 */
export function PersonaDiffViewer({ fromHash, toHash, fromHashShort, toHashShort }: Props) {
  const fromQ = usePersonaPrompt(fromHash)
  const toQ = usePersonaPrompt(toHash)

  const diff = useMemo(() => {
    if (!fromQ.data || !toQ.data) return null
    return computeDiff(fromQ.data, toQ.data)
  }, [fromQ.data, toQ.data])

  if (fromQ.isLoading || toQ.isLoading) {
    return (
      <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-3 py-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
        loading prompts…
      </p>
    )
  }
  if (!fromQ.data || !toQ.data) {
    return (
      <p className="rounded border border-dashed border-[hsl(var(--ink))]/15 px-3 py-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
        full prompt missing for one or both versions (sampling out / 30d retention nulled)
      </p>
    )
  }
  if (!diff) return null

  return (
    <div className="space-y-2 font-mono text-[10px] leading-relaxed">
      <div className="flex items-center justify-between text-[hsl(var(--ink))]/55">
        <span>
          {fromHashShort} → {toHashShort}
        </span>
        <span>
          {diff.added.length} added · {diff.removed.length} removed ·{' '}
          {diff.unchanged} unchanged
        </span>
      </div>
      <div className="overflow-auto rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--paper))]">
        {diff.lines.map((l, i) => (
          <div
            key={i}
            className={
              l.kind === 'add'
                ? 'bg-emerald-50 px-2 py-0.5 text-emerald-900'
                : l.kind === 'remove'
                  ? 'bg-red-50 px-2 py-0.5 text-red-900'
                  : 'px-2 py-0.5 text-[hsl(var(--ink))]/65'
            }
          >
            <span className="select-none pr-2 opacity-50">
              {l.kind === 'add' ? '+' : l.kind === 'remove' ? '-' : ' '}
            </span>
            {l.text || ' '}
          </div>
        ))}
      </div>
    </div>
  )
}

interface DiffLine {
  kind: 'add' | 'remove' | 'same'
  text: string
}

interface DiffResult {
  lines: DiffLine[]
  added: DiffLine[]
  removed: DiffLine[]
  unchanged: number
}

/**
 * Compute line-level diff via simple LCS. For prompts up to ~10 KB
 * with a few hundred lines, this runs in <5ms on the main thread.
 * Returns lines in original order with kind annotations.
 */
function computeDiff(a: string, b: string): DiffResult {
  const aLines = a.split('\n')
  const bLines = b.split('\n')
  const m = aLines.length
  const n = bLines.length

  // LCS table — m+1 × n+1.
  const lcs: Uint16Array = new Uint16Array((m + 1) * (n + 1))
  const idx = (i: number, j: number) => i * (n + 1) + j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (aLines[i - 1] === bLines[j - 1]) {
        lcs[idx(i, j)] = lcs[idx(i - 1, j - 1)] + 1
      } else {
        const up = lcs[idx(i - 1, j)]
        const left = lcs[idx(i, j - 1)]
        lcs[idx(i, j)] = up >= left ? up : left
      }
    }
  }

  // Walk back through the LCS table to emit lines.
  const out: DiffLine[] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (aLines[i - 1] === bLines[j - 1]) {
      out.push({ kind: 'same', text: aLines[i - 1] })
      i--
      j--
    } else if (lcs[idx(i - 1, j)] >= lcs[idx(i, j - 1)]) {
      out.push({ kind: 'remove', text: aLines[i - 1] })
      i--
    } else {
      out.push({ kind: 'add', text: bLines[j - 1] })
      j--
    }
  }
  while (i > 0) {
    out.push({ kind: 'remove', text: aLines[i - 1] })
    i--
  }
  while (j > 0) {
    out.push({ kind: 'add', text: bLines[j - 1] })
    j--
  }
  out.reverse()

  const added = out.filter((l) => l.kind === 'add')
  const removed = out.filter((l) => l.kind === 'remove')
  const unchanged = out.length - added.length - removed.length

  return { lines: out, added, removed, unchanged }
}
