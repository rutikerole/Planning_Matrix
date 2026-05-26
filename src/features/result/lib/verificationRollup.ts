import type { ProjectState } from '@/types/projectState'

// ───────────────────────────────────────────────────────────────────────
// C8 (Bug 33) — project-wide verification rollup.
//
// The per-tab "Vorläufig" footer clears per item (isPending). This is the
// PROJECT-WIDE aggregate: the brief is fully architect-verified iff EVERY
// load-bearing, qualifier-bearing item is DESIGNER+VERIFIED. Same "verified
// = DESIGNER+VERIFIED, everything else pending" predicate as
// VorlaeufigFooter.isPending — kept consistent so the aggregate and the
// per-item footers never disagree.
//
// Load-bearing = the five qualifier-bearing categories the verify-fact
// Edge Function can flip (facts / recommendations / procedures / documents
// / roles — verify-fact/index.ts:296-337).
//
// v1.0.32 Bug 112 — architect identity is NO LONGER absent. The earlier design
// omitted the name because verify-fact recorded setBy:'user' with no display
// name and the owner cannot read the architect's profile under RLS. We now
// capture the architect's SELF-ATTESTED name + chamber number at first-verify
// time (VerificationPanel one-time prompt → verify-fact) and denormalize it
// into state.verification, so the client PDF can name them without an
// RLS-blocked profile read. Self-attested, never fabricated. lastVerifiedAt
// still drives the date.
// ───────────────────────────────────────────────────────────────────────

export interface VerificationRollup {
  /** Count of load-bearing qualifier items. */
  total: number
  /** Count of DESIGNER+VERIFIED items. */
  verified: number
  /** total - verified. */
  pending: number
  /** True iff there is ≥1 item and none are pending. */
  allVerified: boolean
  /** Latest qualifier.setAt among verified items (ISO), or null. */
  lastVerifiedAt: string | null
  /** v1.0.32 Bug 112 — self-attested verifying-architect identity from
   *  state.verification, or null when unset. */
  architectName: string | null
  architectChamberNo: string | null
  architectChamberState: string | null
}

interface QualifierLike {
  source?: string | null
  quality?: string | null
  setAt?: string | null
}

function isVerified(q: QualifierLike | null | undefined): boolean {
  return q?.source === 'DESIGNER' && q?.quality === 'VERIFIED'
}

export function computeVerificationRollup(
  state: Partial<ProjectState> | null | undefined,
): VerificationRollup {
  const buckets: ReadonlyArray<ReadonlyArray<{ qualifier?: QualifierLike }>> = [
    state?.facts ?? [],
    state?.recommendations ?? [],
    state?.procedures ?? [],
    state?.documents ?? [],
    state?.roles ?? [],
  ]

  let total = 0
  let verified = 0
  let lastVerifiedAt: string | null = null

  for (const bucket of buckets) {
    for (const item of bucket) {
      total++
      const q = item.qualifier
      if (isVerified(q)) {
        verified++
        const setAt = q?.setAt
        if (typeof setAt === 'string' && (!lastVerifiedAt || setAt > lastVerifiedAt)) {
          lastVerifiedAt = setAt
        }
      }
    }
  }

  const pending = total - verified
  const v = state?.verification ?? null
  return {
    total,
    verified,
    pending,
    allVerified: total > 0 && pending === 0,
    lastVerifiedAt,
    architectName: v?.architectName ?? null,
    architectChamberNo: v?.architectChamberNo ?? null,
    architectChamberState: v?.architectChamberState ?? null,
  }
}
