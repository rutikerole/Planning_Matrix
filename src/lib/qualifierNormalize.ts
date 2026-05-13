// ───────────────────────────────────────────────────────────────────────
// v1.0.22 Bug Q — VERIFIED qualifier authority guard.
//
// The v1.0.20 Berlin × T-01 PDF rendered "Lage Charakteristik" with
// qualifier BAUHERR · VERIFIZIERT. Bauherr/user chatter is at best
// DECIDED — VERIFIED requires an explicit authority signal (Bauamt /
// ÖbVI report / architect chamber stamp / verified §§ resolver).
//
// Two-layer defense:
//   Layer 1 (write-time)  — gateQualifiersByRole in
//                           src/lib/projectStateHelpers.ts catches
//                           qualifier-write attempts at the chat-turn
//                           Edge Function boundary. v1.0.22 extends
//                           that gate so non-AUTHORITY/non-DESIGNER
//                           callers cannot mint VERIFIED on facts.
//   Layer 2 (read-time)   — this module's normalizeQualifier function
//                           runs at PDF / UI render time on any
//                           qualifier loaded from projects.state.
//                           Defends against (a) pre-v1.0.22 state
//                           rows with promoted CLIENT+VERIFIED that
//                           pre-date the write gate, (b) any future
//                           caller that skips the write gate (defense
//                           in depth).
//
// Rules enforced (normalize-down only, never normalize-up):
//   • CLIENT  + VERIFIED → CLIENT  + DECIDED
//   • DESIGNER + VERIFIED → DESIGNER + DECIDED
//     (architect-loop verification ships post-v1.0.22; until then
//     DESIGNER tops out at DECIDED at the project level)
//   • LEGAL   + VERIFIED → LEGAL   + VERIFIED (verified-citation
//     resolver path is legitimate; leave untouched)
//   • AUTHORITY + VERIFIED → AUTHORITY + VERIFIED (Bauamt response,
//     ÖbVI report — legitimate VERIFIED)
// ───────────────────────────────────────────────────────────────────────

export interface QualifierLike {
  source?: string
  quality?: string
}

export interface QualifierNormalization {
  source: string
  quality: string
  /** True when the input was changed. */
  downgraded: boolean
}

/**
 * Apply the v1.0.22 Bug Q downgrade rules to a qualifier shape.
 * Returns a normalized { source, quality, downgraded } tuple. The
 * downgraded flag is used by telemetry callers (e.g. the verification-
 * page tally) to count read-time normalizations.
 */
export function normalizeQualifier(
  q: QualifierLike | null | undefined,
): QualifierNormalization {
  const source = String(q?.source ?? '').toUpperCase()
  const quality = String(q?.quality ?? '').toUpperCase()
  if (quality !== 'VERIFIED') {
    return { source, quality, downgraded: false }
  }
  if (source === 'CLIENT' || source === 'USER' || source === 'BAUHERR') {
    return { source: 'CLIENT', quality: 'DECIDED', downgraded: true }
  }
  if (source === 'DESIGNER' || source === 'ARCHITEKT') {
    return { source: 'DESIGNER', quality: 'DECIDED', downgraded: true }
  }
  return { source, quality, downgraded: false }
}

/**
 * Apply normalization in-place to a qualifier-bearing object. Used by
 * the PDF / UI render layer to ensure rendered pills reflect the
 * authority-guard rules without mutating the input projects.state row.
 * Returns a fresh shallow-copy so callers can substitute it.
 */
export function withNormalizedQualifier<T extends { qualifier?: QualifierLike | null }>(
  obj: T,
): T {
  const norm = normalizeQualifier(obj.qualifier)
  if (!norm.downgraded) return obj
  return {
    ...obj,
    qualifier: {
      ...obj.qualifier,
      source: norm.source,
      quality: norm.quality,
    },
  } as T
}

// ───────────────────────────────────────────────────────────────────────
// v1.0.23 Bug R — DESIGNER source downgrade when no designer in loop.
//
// The v1.0.16 Bug 32 helper already normalized DESIGNER+ASSUMED →
// LEGAL+CALCULATED at display time (the gate-downgrade case where the
// persona attempted DESIGNER+VERIFIED from a non-designer caller). On
// projects without an invitedDesigner, ANY DESIGNER-sourced qualifier
// should downgrade to LEGAL — there is no architect actually in the
// loop to back the source claim.
//
// Rule (composes with normalizeQualifier above):
//   • If !project.invitedDesigner AND source === DESIGNER:
//       quality DECIDED   → LEGAL + ASSUMED
//       quality CALCULATED → LEGAL + CALCULATED
//       quality ASSUMED    → LEGAL + ASSUMED
//       quality VERIFIED   → already gated by Bug Q to DESIGNER+DECIDED;
//                            then this rule promotes DESIGNER+DECIDED
//                            into LEGAL+ASSUMED downstream.
// ───────────────────────────────────────────────────────────────────────

export function normalizeDesignerWithoutInLoop(
  q: QualifierLike | null | undefined,
  hasInvitedDesigner: boolean,
): { source: string; quality: string } {
  if (!q) return { source: 'LEGAL', quality: 'CALCULATED' }
  const source = String(q.source ?? '').toUpperCase() || 'LEGAL'
  const quality = String(q.quality ?? '').toUpperCase() || 'CALCULATED'
  if (hasInvitedDesigner) return { source, quality }
  if (source !== 'DESIGNER' && source !== 'ARCHITEKT') return { source, quality }
  // DESIGNER source with no designer in loop → LEGAL.
  if (quality === 'CALCULATED') return { source: 'LEGAL', quality: 'CALCULATED' }
  if (quality === 'DECIDED' || quality === 'VERIFIED') {
    return { source: 'LEGAL', quality: 'ASSUMED' }
  }
  return { source: 'LEGAL', quality: 'ASSUMED' }
}
