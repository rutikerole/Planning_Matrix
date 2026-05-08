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
 * v1.0.3 — broadened per the locked spec: "if not DESIGNER+VERIFIED,
 * render the Vorläufig footer; if verified, hide." The earlier
 * narrower predicate only fired on DESIGNER-source entries; that left
 * LEGAL / CLIENT / AUTHORITY items unflagged, which the user-side
 * legal shield is meant to cover. Now: anything that is NOT
 * exactly DESIGNER+VERIFIED is treated as "still preliminary,
 * needs architect sign-off." Verified entries hide the footer.
 *
 * Aggregate use: composers can pass `someUnverified = items.some((it)
 * => isPending(it.qualifier?.source, it.qualifier?.quality))` to
 * decide whether to render an aggregate footer at the tab bottom.
 */
export function isPending(
  source: Source | null | undefined,
  quality: Quality | null | undefined,
): boolean {
  return !(source === 'DESIGNER' && quality === 'VERIFIED')
}
