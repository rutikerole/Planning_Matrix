#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// Thin-state propagation sprint — procedure + specialist + label regression.
//
// The MV/Rostock T-03 walk: chat said "vereinfachtes § 63 LBauO M-V · REQUIRED"
// but the result layer showed "Standard building permit · § 64 LBauO M-V ·
// LEGAL·ASSUMED", the structural engineer rendered NOT NEEDED despite a captured
// load-bearing intervention, and the Legal landscape cited the FORM § (§ 68) as
// the "permit procedure". Root cause: resolveProcedure had a renovation tree for
// NRW only (everything else fell to the generic standard-§64-ASSUMED branch);
// resolveRoles never read the captured fact; composeLegalDomains used the form §.
//
// This pins the fixes FUNCTIONALLY (calls the real resolvers), for ALL 11 thin
// states in one pass, plus the substantive-state regression (BW § 52 keyword
// verdict must still propagate).
//
// Run: npx tsx scripts/smoke-thin-state-propagation.mts  (npm run smoke:thin-state)
// ───────────────────────────────────────────────────────────────────────

import { resolveProcedure } from '../src/legal/resolveProcedure.ts'
import { resolveRoles } from '../src/features/result/lib/resolveRoles.ts'
import { composeLegalDomains } from '../src/features/result/lib/composeLegalDomains.ts'
import { getStateLocalization } from '../src/legal/stateLocalization.ts'

let passed = 0
let failed = 0
function ok(cond: boolean, msg: string): void {
  if (cond) { console.log(`  ✓ ${msg}`); passed++ }
  else { console.log(`  ✗ ${msg}`); failed++ }
}

const THIN_STATES = [
  'berlin', 'hamburg', 'bremen', 'sachsen', 'sh', 'rlp',
  'mv', 'sachsen-anhalt', 'thueringen', 'brandenburg', 'saarland',
] as const
const SUBSTANTIVE = ['bayern', 'nrw', 'bw', 'hessen', 'niedersachsen'] as const
const baseCase = { eingriff_aussenhuelle: false, denkmalschutz: false, ensembleschutz: false }

console.log('\n[smoke-thin-state] P1 — renovation procedure propagation (all 11 thin states)…')
// A thin-state sanierung with a captured load-bearing intervention (and even a
// citation-only verdict) must resolve to the SIMPLIFIED procedure, NOT the
// generic standard-§64-ASSUMED fallback.
for (const bundesland of THIN_STATES) {
  const simp = getStateLocalization(bundesland).procedure.simplified.citation.trim()
  for (const [variant, verdict] of [
    ['no verdict', undefined],
    ['citation-only verdict', simp || undefined],
  ] as const) {
    const d = resolveProcedure({ intent: 'sanierung', bundesland, eingriff_tragende_teile: true, verfahren_indikation: verdict, ...baseCase } as never)
    ok(
      d.kind === 'vereinfachtes' && d.confidence === 'CALCULATED',
      `${bundesland} sanierung (${variant}) → vereinfachtes·CALCULATED (was standard·ASSUMED): got ${d.kind}·${d.confidence} ${d.citation}`,
    )
    if (simp) ok(d.citation === simp, `${bundesland} (${variant}) cites the simplified § ${simp} (not the form §): got ${d.citation}`)
  }
}

console.log('\n[smoke-thin-state] P1 regression — substantive keyword verdicts + gates still win…')
const bwKeyword = resolveProcedure({ intent: 'sanierung', bundesland: 'bw', eingriff_tragende_teile: true, verfahren_indikation: 'vereinfachtes Baugenehmigungsverfahren § 52 LBO BW', ...baseCase } as never)
ok(bwKeyword.kind === 'vereinfachtes' && bwKeyword.citation === '§ 52 LBO BW' && bwKeyword.confidence === 'CALCULATED',
  `BW § 52 keyword verdict still propagates: got ${bwKeyword.kind}·${bwKeyword.confidence} ${bwKeyword.citation}`)
const sonderbau = resolveProcedure({ intent: 'sanierung', bundesland: 'mv', eingriff_tragende_teile: true, sonderbau_count: 1, ...baseCase } as never)
ok(sonderbau.kind === 'standard', `Sonderbau gate still forces the regular procedure: got ${sonderbau.kind}`)
const blocked = resolveProcedure({ intent: 'sanierung', bundesland: 'mv', eingriff_tragende_teile: true, mk_gebietsart: true, ...baseCase } as never)
ok(blocked.kind === 'bauvoranfrage', `hard blocker still short-circuits to bauvoranfrage: got ${blocked.kind}`)
const free = resolveProcedure({ intent: 'sanierung', bundesland: 'mv', eingriff_tragende_teile: false, verfahren_indikation: 'verfahrensfrei nach § 61 LBauO M-V', ...baseCase } as never)
ok(free.kind === 'verfahrensfrei', `persona verfahrensfrei verdict still honored: got ${free.kind}`)

console.log('\n[smoke-thin-state] P2 — structural engineer NEEDED from captured intervention…')
const personaStructFalse = { id: 'role-tw', title_de: 'Tragwerksplaner:in', title_en: 'Structural engineer', needed: false, rationale_de: 'Nur falls tragende Teile betroffen.', rationale_en: 'Required only if load-bearing elements are affected.', qualifier: { source: 'LEGAL', quality: 'CALCULATED' } }
const structRole = (rs: { title_de?: string; title_en?: string; needed: boolean }[]) =>
  rs.find((r) => /tragwerk|structural/.test(((r.title_de ?? '') + (r.title_en ?? '')).toLowerCase()))
for (const bundesland of ['mv', 'sachsen', 'berlin'] as const) {
  const forced = resolveRoles({ bundesland, intent: 'sanierung' } as never, { facts: [{ key: 'eingriff_tragende_teile', value: true }], roles: [personaStructFalse] } as never)
  ok(structRole(forced.roles)?.needed === true, `${bundesland}: captured intervention forces structural engineer NEEDED (persona needed:false overridden)`)
}
const notCaptured = resolveRoles({ bundesland: 'mv', intent: 'sanierung' } as never, { facts: [{ key: 'eingriff_tragende_teile', value: false }], roles: [personaStructFalse] } as never)
ok(structRole(notCaptured.roles)?.needed === false, 'no captured intervention → structural engineer stays as the persona set it (no over-force)')

console.log('\n[smoke-thin-state] cleanup — Legal-landscape procedure row cites the procedure §, not the form §…')
for (const bundesland of ['mv', 'sh', 'sachsen', 'berlin'] as const) {
  const domains = composeLegalDomains({ facts: [] }, 'en', bundesland)
  const rows = domains.flatMap((d) => d.rows ?? [])
  const proc = rows.find((r) => /permit procedure/i.test(r.status ?? ''))
  const form = getStateLocalization(bundesland) // §68 form is permitForm; assert the row is NOT §68
  ok(!!proc && !/§\s*68\b/.test(proc.label), `${bundesland}: permit-procedure row cites a procedure § (not the §68 form): got ${proc?.label}`)
  void form
}

console.log(`\n[smoke-thin-state] ${passed} passed · ${failed} failed`)
if (failed > 0) { console.error('[smoke-thin-state] FAIL'); process.exit(1) }
console.log('[smoke-thin-state] OK')
process.exit(0)
