#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// ITEM A (T-04 Saarland walk) — qualifier gate DOWNGRADE-AND-CONTINUE guard.
//
// The Saarland walk hit ~33% turn-failure ("Planungsteam hat nicht
// geantwortet") because the persona occasionally tagged a fact VERIFIED
// (architect-reserved) and the Week-2 gate REJECTED the whole turn. Fixed by
// reverting QUALIFIER_GATE_REJECTS to false: the gate STILL downgrades the
// offending qualifier in-place, but the turn COMPLETES instead of erroring.
//
// This pins both halves of the contract FUNCTIONALLY:
//   1. gateQualifiersByRole still downgrades a client DESIGNER/CLIENT+VERIFIED
//      write (the offending qualifier never reaches state).
//   2. QUALIFIER_GATE_REJECTS === false → the edge fn does NOT fail the turn.
//   3. legitimate LEGAL/AUTHORITY+VERIFIED and designer callers are untouched.
//
// Run: npx tsx scripts/smoke-qualifier-gate.mts  (npm run smoke:qualifier-gate)
// ───────────────────────────────────────────────────────────────────────

import {
  gateQualifiersByRole,
  QUALIFIER_GATE_REJECTS,
} from '../src/lib/projectStateHelpers.ts'

let pass = 0
let fail = 0
const ok = (cond: boolean, msg: string): void => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`) }
  else { fail++; console.error(`  ✗ ${msg}`) }
}

const base = { specialist: 'moderator', message_de: 'm', message_en: 'm', input_type: 'none' } as const

// 1 — the offending qualifier is DOWNGRADED in-place (never reaches state).
{
  const tool: any = { ...base, extracted_facts: [{ key: 'denkmalschutz', value: false, source: 'DESIGNER', quality: 'VERIFIED' }] }
  const events = gateQualifiersByRole(tool, 'client' as never)
  ok(events.length === 1, `DESIGNER+VERIFIED → 1 downgrade event (got ${events.length})`)
  ok(tool.extracted_facts[0].quality === 'ASSUMED', `DESIGNER+VERIFIED → downgraded to ASSUMED in-place (got ${tool.extracted_facts[0].quality})`)
}

// 2 — DOWNGRADE-AND-CONTINUE: the flag must be false so the edge fn does NOT
//     fail the turn over a (now-downgraded) qualifier.
ok(QUALIFIER_GATE_REJECTS === false, `QUALIFIER_GATE_REJECTS === false → turn COMPLETES, no qualifier_role_violation (got ${QUALIFIER_GATE_REJECTS})`)

// 3 — client CLIENT+VERIFIED → CLIENT+DECIDED (the user-confirmed-fact case,
//     e.g. "no Denkmal"); turn still completes.
{
  const tool: any = { ...base, extracted_facts: [{ key: 'denkmal_bestaetigt', value: false, source: 'CLIENT', quality: 'VERIFIED' }] }
  const events = gateQualifiersByRole(tool, 'client' as never)
  ok(events.length === 1 && tool.extracted_facts[0].quality === 'DECIDED' && tool.extracted_facts[0].source === 'CLIENT',
    `CLIENT+VERIFIED → CLIENT+DECIDED (got ${tool.extracted_facts[0].source}·${tool.extracted_facts[0].quality})`)
}

// 4 — non-vacuous: legitimate LEGAL+VERIFIED + designer caller untouched.
{
  const tool: any = { ...base, extracted_facts: [{ key: 'x', value: 1, source: 'LEGAL', quality: 'VERIFIED' }] }
  ok(gateQualifiersByRole(tool, 'client' as never).length === 0 && tool.extracted_facts[0].quality === 'VERIFIED',
    'LEGAL+VERIFIED untouched on client (legitimate)')
  const tool2: any = { ...base, extracted_facts: [{ key: 'y', value: 1, source: 'DESIGNER', quality: 'VERIFIED' }] }
  ok(gateQualifiersByRole(tool2, 'designer' as never).length === 0 && tool2.extracted_facts[0].quality === 'VERIFIED',
    'designer caller passes DESIGNER+VERIFIED through (architect override)')
}

console.log(`\n${pass} passed · ${fail} failed`)
if (fail > 0) process.exit(1)
