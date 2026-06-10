#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// RED-1 (T-04 NRW/Düsseldorf walk) — role fact-gating regression guard.
//
// The live walk captured eingriff_tragende_teile=false and
// eingriff_aussenhuelle=false (a Lager→Büro fit-out, no structural work), yet
// the Team tab + PDF + markdown rendered "Structural engineer — NEEDED" and
// "Energy consultant — NEEDED" from the unconditional RENOVATION_ROLES baseline.
//
// resolveRoles now applies catalog-declared conditional gates (tri-state, same
// fact parse as the procedure verdict). This pins the contract FUNCTIONALLY
// (calls the real resolveRoles), for the whole class — not just T-04:
//   structural-negated  ⇒ Structural engineer NOT NEEDED (clean drop)
//   envelope-negated     ⇒ Energy consultant CONDITIONAL (present, not needed)
//   either UNKNOWN        ⇒ CONDITIONAL (honest deferral, never absent)
//   captured-true         ⇒ NEEDED (preserves the thin-state forceStructural)
//   new-build             ⇒ structural stays unconditionally NEEDED (no over-gate)
//
// Run: npx tsx scripts/smoke-role-gating.mts  (npm run smoke:role-gating)
// ───────────────────────────────────────────────────────────────────────

import { resolveRoles } from '../src/features/result/lib/resolveRoles.ts'

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

const proj = (intent: string, bundesland = 'nrw'): never =>
  ({ bundesland, intent }) as never
const st = (facts: Array<{ key: string; value: unknown }>): never =>
  ({ facts, roles: [] }) as never

type R = { title_de?: string; title_en?: string; needed: boolean; conditional?: boolean }
const byFn = (rs: R[], rx: RegExp): R | undefined =>
  rs.find((r) => rx.test(`${r.title_de ?? ''} ${r.title_en ?? ''}`))
const structural = (rs: R[]) => byFn(rs, /tragwerk|structural/i)
const energy = (rs: R[]) => byFn(rs, /energ/i)

// 1 — structural-negated use-change ⇒ Structural engineer NOT NEEDED (clean drop).
{
  const { roles } = resolveRoles(
    proj('umnutzung'),
    st([{ key: 'eingriff_tragende_teile', value: false }]),
  )
  const s = structural(roles as R[])
  ok(
    !!s && s.needed === false && s.conditional !== true,
    `umnutzung + eingriff_tragende_teile=false ⇒ structural NOT NEEDED (needed=${s?.needed}, conditional=${s?.conditional})`,
  )
}

// 2 — envelope-negated ⇒ Energy consultant CONDITIONAL (present, NOT needed, NOT absent).
{
  const { roles } = resolveRoles(
    proj('umnutzung'),
    st([{ key: 'eingriff_aussenhuelle', value: false }]),
  )
  const e = energy(roles as R[])
  ok(!!e, 'envelope=false ⇒ energy consultant still PRESENT (not absent)')
  ok(
    !!e && e.needed === false && e.conditional === true,
    `umnutzung + eingriff_aussenhuelle=false ⇒ energy CONDITIONAL (needed=${e?.needed}, conditional=${e?.conditional})`,
  )
}

// 3 — structural UNKNOWN (not captured either way) ⇒ CONDITIONAL deferral.
{
  const { roles } = resolveRoles(proj('sanierung'), st([]))
  const s = structural(roles as R[])
  ok(
    !!s && s.needed === false && s.conditional === true,
    `sanierung + structural UNKNOWN ⇒ structural CONDITIONAL (needed=${s?.needed}, conditional=${s?.conditional})`,
  )
}

// 4 — captured-true ⇒ NEEDED (regression guard: preserves forceStructuralWhenCaptured).
{
  const { roles } = resolveRoles(
    proj('sanierung'),
    st([{ key: 'eingriff_tragende_teile', value: true }]),
  )
  const s = structural(roles as R[])
  ok(
    !!s && s.needed === true,
    `sanierung + eingriff_tragende_teile=true ⇒ structural NEEDED (was the thin-state contract)`,
  )
}

// 5 — NEW BUILD: structural is unconditional → must NOT be downgraded by the gate.
{
  const { roles } = resolveRoles(proj('neubau_einfamilienhaus'), st([]))
  const s = structural(roles as R[])
  ok(
    !!s && s.needed === true && s.conditional !== true,
    `neubau structural stays unconditionally NEEDED (no over-gating) (needed=${s?.needed}, conditional=${s?.conditional})`,
  )
}

// 6 — envelope captured-true ⇒ Energy NEEDED.
{
  const { roles } = resolveRoles(
    proj('umnutzung'),
    st([{ key: 'eingriff_aussenhuelle', value: true }]),
  )
  const e = energy(roles as R[])
  ok(!!e && e.needed === true, `umnutzung + eingriff_aussenhuelle=true ⇒ energy NEEDED`)
}

console.log(`\n${pass} passed · ${fail} failed`)
if (fail > 0) process.exit(1)
