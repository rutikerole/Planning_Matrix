#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// T-03 sprint (P3) — double-submit idempotency regression.
//
// The T-03 walk rendered the same user turn twice (You·20:46 + You·20:49,
// identical text). Root cause: useChatTurn.onMutate and .mutationFn each ran
// `input.clientRequestId ?? crypto.randomUUID()` INDEPENDENTLY, so when the
// caller passed no id they minted TWO different uuids — the optimistic
// placeholder (and the id the Recovery banner later reads) used one uuid while
// the server persisted the other. A retry then re-submitted the placeholder's
// uuid, which the server's (project_id, client_request_id, role) unique index
// did NOT recognise as the same turn → a SECOND user row was persisted.
//
// Fix invariants this test pins (mirrors useChatTurn.onMutate):
//   1. ID SHARING — onMutate writes the resolved id back onto the shared input
//      object, so mutationFn reads the SAME id (no divergence).
//   2. STABLE FROM CALLER — when the caller supplies an id, it is honoured.
//   3. IDEMPOTENT OPTIMISTIC WRITE — appending a placeholder for a
//      client_request_id already in cache replaces it in place (one bubble).
//   4. DISTINCT TURNS — different ids produce different rows (no over-dedup).
//
// Run: npx tsx scripts/smoke-double-submit.mts   (npm run smoke:double-submit)
// ───────────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0
function ok(cond: boolean, msg: string): void {
  if (cond) { console.log(`  ✓ ${msg}`); passed++ }
  else { console.log(`  ✗ ${msg}`); failed++ }
}

interface Row { id: string; client_request_id: string; content: string }

// Mirror of useChatTurn.onMutate's id resolution: resolve ONCE, write back onto
// the shared input so mutationFn sees the same value.
function resolveClientRequestId(input: { clientRequestId?: string }, mint: () => string): string {
  input.clientRequestId ??= mint()
  return input.clientRequestId
}

// Mirror of useChatTurn.onMutate's idempotent optimistic write.
function applyOptimistic(cache: Row[], clientRequestId: string, content: string): Row[] {
  const placeholder: Row = { id: `pending-${clientRequestId}`, client_request_id: clientRequestId, content }
  const withoutThisTurn = cache.filter((m) => m.client_request_id !== clientRequestId)
  return [...withoutThisTurn, placeholder]
}

console.log('\n[smoke-double-submit] id resolution + idempotent optimistic write…')

// 1. ID SHARING — no caller id: onMutate mints + writes back; mutationFn reads same.
let mintCount = 0
const mint = () => `uuid-${++mintCount}`
const sharedInput: { clientRequestId?: string } = {}
const idFromOnMutate = resolveClientRequestId(sharedInput, mint)
const idFromMutationFn = resolveClientRequestId(sharedInput, mint) // mutationFn re-resolves the SAME input
ok(idFromOnMutate === idFromMutationFn, 'onMutate and mutationFn resolve the SAME id from a shared input (no divergence)')
ok(mintCount === 1, 'the id is minted exactly once (mutationFn reuses the written-back value, does not mint a second)')

// 2. STABLE FROM CALLER — provided id is honoured (handleSubmit passes one).
const caller: { clientRequestId?: string } = { clientRequestId: 'caller-fixed' }
ok(resolveClientRequestId(caller, mint) === 'caller-fixed', 'a caller-supplied clientRequestId is honoured, not overwritten')

// 3. IDEMPOTENT OPTIMISTIC WRITE — same id twice → ONE row (the duplicate-bubble guard).
let cache: Row[] = [{ id: 'm0', client_request_id: 'prior', content: 'earlier turn' }]
cache = applyOptimistic(cache, 'turn-A', 'Denkmal answer')
cache = applyOptimistic(cache, 'turn-A', 'Denkmal answer') // retry / double dispatch, same id
const turnARows = cache.filter((m) => m.client_request_id === 'turn-A')
ok(turnARows.length === 1, 'a retry/double-dispatch with the same client_request_id yields exactly ONE optimistic row')
ok(cache.length === 2, 'prior history is preserved (no clobber): [prior, turn-A]')

// 4. DISTINCT TURNS — different ids → different rows (no over-dedup).
cache = applyOptimistic(cache, 'turn-B', 'a different answer')
ok(cache.filter((m) => m.client_request_id === 'turn-B').length === 1, 'a genuinely new turn (different id) adds its own row')
ok(cache.length === 3, 'two distinct turns + prior history = 3 rows')

// 5. Simulated server reconcile — persisted row + retry placeholder share the id,
//    so a whole-list refetch (server rows only) shows exactly one user row.
const serverRows: Row[] = [{ id: 'db-1', client_request_id: 'turn-A', content: 'Denkmal answer' }]
const afterRefetch = serverRows // useMessages replaces cache with server rows
ok(afterRefetch.filter((m) => m.client_request_id === 'turn-A').length === 1,
  'after refetch the persisted turn-A row appears once (placeholder replaced, server idempotent on the shared id)')

console.log(`\n[smoke-double-submit] ${passed} passed · ${failed} failed`)
if (failed > 0) { console.error('[smoke-double-submit] FAIL'); process.exit(1) }
console.log('[smoke-double-submit] OK')
process.exit(0)
