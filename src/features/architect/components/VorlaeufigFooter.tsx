import type { Quality, Source } from '@/types/projectState'

interface VorlaeufigFooterProps {
  source: Source | null | undefined
  quality: Quality | null | undefined
  /** Optional architect note (qualifier.reason) shown after the dash. */
  note?: string | null
  /**
   * Render mode:
   *   - 'card'   — full-width muted footer at the bottom of a result-card
   *   - 'inline' — compact tag suitable for a row in a list/table.
   * Defaults to 'card'.
   */
  variant?: 'card' | 'inline'
}

/**
 * Phase 13 Week 3 — surface-locked "Vorläufig" footer.
 *
 * Shown on result-page cards when a qualifier is DESIGNER+ASSUMED —
 * i.e. the model emitted a designer-source claim that the
 * qualifier-write-gate downgraded to ASSUMED, OR a CLIENT/LEGAL claim
 * that has not yet been verified by an architect. The text is
 * locked in the user's spec and must not be reworded:
 *
 *   "Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n
 *   Architekt/in noch ausstehend."
 *
 * On DESIGNER+VERIFIED, returns null so the card has no extra
 * footer. On any other combination (LEGAL, CLIENT, AUTHORITY, or
 * a missing qualifier) returns null too — the "Vorläufig" framing
 * is specifically about architect-pending cases.
 *
 * Exposed as a primitive so the result-page cards (Cost, Procedure,
 * Document, Recommendation) can drop it in without each card having
 * to repeat the conditional.
 */
export function VorlaeufigFooter({
  source,
  quality,
  note,
  variant = 'card',
}: VorlaeufigFooterProps) {
  if (!isPending(source, quality)) return null

  const message =
    'Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in noch ausstehend.'

  if (variant === 'inline') {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--clay))]">
        Vorläufig
      </span>
    )
  }
  return (
    <div className="mt-3 border-t border-[hsl(var(--ink))]/10 pt-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--clay))]">
        Vorläufig
      </p>
      <p className="mt-0.5 text-[12px] text-[hsl(var(--ink))]/65">
        {message}
        {note ? <span className="text-[hsl(var(--ink))]/45"> — {note}</span> : null}
      </p>
    </div>
  )
}

/**
 * Pure predicate so card composers can branch without rendering the
 * component (e.g. for ordering / sorting "pending first" rows).
 *
 * "Pending" = the entry's authoritative reading depends on architect
 * sign-off:
 *   - DESIGNER+ASSUMED  (gate-downgraded or never-verified)
 *   - DESIGNER+CALCULATED (architect-derived but not yet blessed)
 *
 * NOT pending: DESIGNER+VERIFIED (already blessed), LEGAL+anything
 * (statute-grounded), CLIENT+anything (factual user input), AUTHORITY+
 * anything.
 */
export function isPending(
  source: Source | null | undefined,
  quality: Quality | null | undefined,
): boolean {
  if (source !== 'DESIGNER') return false
  return quality === 'ASSUMED' || quality === 'CALCULATED'
}
