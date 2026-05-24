// ───────────────────────────────────────────────────────────────────────
// C7 + C8 — architect verification flow smoke tests.
//
// The repo has no unit-test runner (smoke-script pattern, per
// reference_test_infra); this mirrors scripts/smoke-pdf-text.mts. It
// exercises the PURE, isolated logic of the architect flow without any
// live fetch / Supabase session / Edge Function call:
//
//   • parseInviteResponse — share-project CREATE response → result/throw
//     mapping (Commit 1): happy 201 + every error code + malformed.
//
// (Later commits append: aggregate-rollup + qualifier-downgrade sections.)
//
// Exit 0 if all assertions pass; exit 1 if any fail.
// ───────────────────────────────────────────────────────────────────────

import {
  parseInviteResponse,
  ArchitectInviteError,
  type ArchitectInviteErrorCode,
} from '../src/features/result/lib/architectInviteApi.ts'
import { computeVerificationRollup } from '../src/features/result/lib/verificationRollup.ts'

interface Tally {
  passed: number
  failed: number
}

function ok(t: Tally, cond: boolean, msg: string): void {
  if (cond) {
    console.log(`  ✓ ${msg}`)
    t.passed++
  } else {
    console.log(`  ✗ ${msg}`)
    t.failed++
  }
}

/** Assert parseInviteResponse throws an ArchitectInviteError with `code`. */
function expectThrowCode(
  t: Tally,
  status: number,
  body: unknown,
  code: ArchitectInviteErrorCode,
  label: string,
): void {
  try {
    parseInviteResponse(status, body)
    ok(t, false, `${label} → expected throw, got a value`)
  } catch (e) {
    const isTyped = e instanceof ArchitectInviteError
    ok(
      t,
      isTyped && e.code === code,
      `${label} → throws ArchitectInviteError code='${code}'${
        isTyped ? '' : ` (got ${e instanceof Error ? e.constructor.name : typeof e})`
      }${isTyped && e.code !== code ? ` (got code='${e.code}')` : ''}`,
    )
  }
}

function runInviteParse(): Tally {
  console.log('\n[smoke-architect] parseInviteResponse (Commit 1)…')
  const t: Tally = { passed: 0, failed: 0 }

  // Happy path — 201 CREATE success.
  const okBody = {
    ok: true,
    inviteToken: '11111111-1111-1111-1111-111111111111',
    expiresAt: '2026-05-31T00:00:00.000Z',
    acceptUrl:
      'https://planning-matrix.vercel.app/architect/accept?token=11111111-1111-1111-1111-111111111111',
    requestId: 'req-1',
  }
  try {
    const r = parseInviteResponse(201, okBody)
    ok(t, r.acceptUrl === okBody.acceptUrl, 'happy 201 → acceptUrl mapped')
    ok(t, r.expiresAt === okBody.expiresAt, 'happy 201 → expiresAt mapped')
    ok(t, r.inviteToken === okBody.inviteToken, 'happy 201 → inviteToken mapped')
  } catch (e) {
    ok(t, false, `happy 201 → unexpected throw: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Each labelled error code from the Edge Function.
  expectThrowCode(
    t,
    401,
    { ok: false, error: { code: 'unauthenticated', message: 'Missing bearer token' } },
    'unauthenticated',
    '401 unauthenticated',
  )
  expectThrowCode(
    t,
    403,
    { ok: false, error: { code: 'forbidden', message: 'Only the project owner can create architect invites.' } },
    'forbidden',
    '403 forbidden (not owner)',
  )
  expectThrowCode(
    t,
    404,
    { ok: false, error: { code: 'not_found', message: 'Project not found.' } },
    'not_found',
    '404 not_found',
  )
  expectThrowCode(
    t,
    400,
    { ok: false, error: { code: 'validation', message: 'Body must be …' } },
    'validation',
    '400 validation',
  )
  expectThrowCode(
    t,
    500,
    { ok: false, error: { code: 'persistence_failed', message: 'Insert returned no row.' } },
    'persistence_failed',
    '500 persistence_failed',
  )

  // Malformed success (ok:true but no acceptUrl) → internal.
  expectThrowCode(
    t,
    201,
    { ok: true, inviteToken: 'x', requestId: 'r' },
    'internal',
    'malformed success (missing acceptUrl)',
  )

  // HTTP-status fallback when the body has no labelled code.
  expectThrowCode(t, 403, null, 'forbidden', 'null body @ 403 → status-fallback forbidden')
  expectThrowCode(t, 401, undefined, 'unauthenticated', 'undefined body @ 401 → status-fallback')
  expectThrowCode(
    t,
    418,
    { ok: false, error: { code: 'teapot', message: 'nonsense' } },
    'internal',
    'unknown code + odd status → internal',
  )

  return t
}

function runRollup(): Tally {
  console.log('\n[smoke-architect] computeVerificationRollup (Commit 5 / Bug 33)…')
  const t: Tally = { passed: 0, failed: 0 }
  const v = (setAt?: string) => ({
    source: 'DESIGNER',
    quality: 'VERIFIED',
    ...(setAt ? { setAt } : {}),
  })
  const a = { source: 'LEGAL', quality: 'ASSUMED' }

  // Empty → total 0, NOT allVerified (vacuous-truth guard).
  const empty = computeVerificationRollup({})
  ok(t, empty.total === 0 && empty.verified === 0, 'empty state → total 0 / verified 0')
  ok(t, empty.allVerified === false, 'empty state → allVerified false (no vacuous clear)')

  // Partial → some verified, not all.
  const partial = computeVerificationRollup({
    facts: [
      { key: 'a', value: 1, qualifier: v('2026-05-24T10:00:00.000Z') },
      { key: 'b', value: 2, qualifier: a },
      { key: 'c', value: 3, qualifier: a },
    ],
  } as never)
  ok(t, partial.total === 3, 'partial → total 3')
  ok(t, partial.verified === 1, 'partial → verified 1')
  ok(t, partial.pending === 2, 'partial → pending 2')
  ok(t, partial.allVerified === false, 'partial → allVerified false')

  // All verified across categories → allVerified true; lastVerifiedAt = max setAt.
  const all = computeVerificationRollup({
    facts: [{ key: 'a', value: 1, qualifier: v('2026-05-24T10:00:00.000Z') }],
    recommendations: [{ id: 'r1', qualifier: v('2026-05-24T12:00:00.000Z') }],
    procedures: [{ id: 'p1', qualifier: v('2026-05-24T09:00:00.000Z') }],
  } as never)
  ok(t, all.total === 3 && all.verified === 3, 'all → total 3 / verified 3')
  ok(t, all.allVerified === true, 'all → allVerified true')
  ok(
    t,
    all.lastVerifiedAt === '2026-05-24T12:00:00.000Z',
    `all → lastVerifiedAt = latest setAt (got ${all.lastVerifiedAt})`,
  )

  // One pending item anywhere → NOT allVerified.
  const onePending = computeVerificationRollup({
    facts: [{ key: 'a', value: 1, qualifier: v() }],
    roles: [{ id: 'role1', qualifier: a }],
  } as never)
  ok(t, onePending.allVerified === false, 'one pending role → allVerified false')

  return t
}

function main(): void {
  const sections: Tally[] = [runInviteParse(), runRollup()]
  const passed = sections.reduce((n, s) => n + s.passed, 0)
  const failed = sections.reduce((n, s) => n + s.failed, 0)
  console.log(`\n[smoke-architect] ${passed} passed · ${failed} failed`)
  if (failed > 0) {
    console.log('[smoke-architect] FAIL — see violations above.')
    process.exit(1)
  }
  console.log('[smoke-architect] OK')
  process.exit(0)
}

main()
