#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// YELLOW-1 (T-04 walk) — confidence open-question knockdown regression guard.
//
// The brief showed 94% while flagging "1 flag needs professional eyes":
// computeOpenItems was severed from computeConfidence, so an open ASSUMED fact
// diluted the mix only ~0.4 (invisible at 4%) and never penalised the headline.
// Now every open ASSUMED fact applies a multiplicative knockdown; a structural-
// domain assumption knocks harder (soft blocker). This pins the invariants
// FUNCTIONALLY against the real computeConfidenceBreakdown:
//   - a single open flag pulls a low-90s mix BELOW 90 (not because the mix is
//     weak — factScore stays ≥90 — but because of the knockdown)
//   - resolving the flag (ASSUMED→DECIDED) raises confidence back above it
//   - a structural-domain ASSUMED knocks harder than a generic one
//
// Run: npx tsx scripts/smoke-confidence.mts  (npm run smoke:confidence)
// ───────────────────────────────────────────────────────────────────────

import { computeConfidenceBreakdown } from '../src/features/result/lib/computeConfidence.ts'

let pass = 0
let fail = 0
const ok = (cond: boolean, msg: string): void => {
  if (cond) {
    pass++
    console.log(`  ✓ ${msg}`)
  } else {
    fail++
    console.error(`  ✗ ${msg}`)
  }
}

const ACTIVE = { A: { state: 'ACTIVE' }, B: { state: 'ACTIVE' }, C: { state: 'ACTIVE' } }
const decided = (i: number) => ({ key: `d_${i}`, value: true, qualifier: { source: 'CLIENT', quality: 'DECIDED' } })
const calc = (i: number) => ({ key: `c_${i}`, value: true, qualifier: { source: 'LEGAL', quality: 'CALCULATED' } })
const assumed = (key: string) => ({ key, value: false, qualifier: { source: 'DESIGNER', quality: 'ASSUMED' } })

// Decided-heavy mix (~65/30/5, like the T-04 walk's donut) + ONE open ASSUMED.
const mk = (nDecided: number, nCalc: number, assumedKeys: string[]) =>
  ({
    schemaVersion: 1,
    templateId: 'T-04',
    facts: [
      ...Array.from({ length: nDecided }, (_, i) => decided(i)),
      ...Array.from({ length: nCalc }, (_, i) => calc(i)),
      ...assumedKeys.map(assumed),
    ],
    areas: ACTIVE,
    procedures: [],
    documents: [],
    roles: [],
    recommendations: [],
  }) as never

// 1 — single open flag pulls a low-90s mix BELOW 90 (knockdown, not weak mix).
{
  const b = computeConfidenceBreakdown(mk(13, 6, ['befreiung_erforderlich']))
  ok(b.factScore >= 90, `factScore is genuinely high (mix is strong): factScore=${b.factScore}`)
  ok(b.total < 90, `1 open ASSUMED flag ⇒ headline BELOW the low-90s: total=${b.total} (was ~94 theatre)`)
}

// 2 — resolving the flag (ASSUMED→DECIDED, no open item) raises it back up.
{
  const open = computeConfidenceBreakdown(mk(13, 6, ['befreiung_erforderlich'])).total
  const resolved = computeConfidenceBreakdown(mk(14, 6, [])).total
  ok(resolved > open, `open flag pulls DOWN: resolved=${resolved} > with-open=${open}`)
  ok(resolved >= 90, `no open flags ⇒ a strong mix can still read high: resolved=${resolved}`)
}

// 3 — structural-domain ASSUMED knocks harder than a generic ASSUMED.
{
  const structural = computeConfidenceBreakdown(mk(13, 6, ['verfahren_offen'])).total // VERFAHREN → priority 3
  const generic = computeConfidenceBreakdown(mk(13, 6, ['befreiung_erforderlich'])).total // priority 2
  ok(
    structural < generic,
    `structural-domain ASSUMED is a stronger knockdown: structural=${structural} < generic=${generic}`,
  )
}

console.log(`\n${pass} passed · ${fail} failed`)
if (fail > 0) process.exit(1)
