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
import { resolveRoles, roleFunction } from '../src/features/result/lib/resolveRoles.ts'
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
  // Meta-sweep item 1 — composeLegalDomains now REQUIRES the canonical
  // decision (no local verdict re-derivation); build it the way the tab does.
  const decision = resolveProcedure({ intent: 'sanierung', bundesland, eingriff_tragende_teile: true, ...baseCase } as never)
  const domains = composeLegalDomains({ facts: [] }, 'en', bundesland, decision)
  const rows = domains.flatMap((d) => d.rows ?? [])
  const proc = rows.find((r) => /permit procedure/i.test(r.status ?? ''))
  const form = getStateLocalization(bundesland) // §68 form is permitForm; assert the row is NOT §68
  ok(!!proc && !/§\s*68\b/.test(proc.label), `${bundesland}: permit-procedure row cites a procedure § (not the §68 form): got ${proc?.label}`)
  void form
}

console.log('\n[smoke-thin-state] P1 cleanup — specialist deduplication by role-function (no duplicate cards)…')
// Persona emits RICHER titles than the baseline ("…architect (Saxony)" vs
// "Architect"; "Energy consultant (GEG)" vs "Energy consultant") — the prior
// exact-title union rendered BOTH. Assert: after resolveRoles, no two cards share
// a role-function, the count reflects DISTINCT roles, and a genuinely distinct
// (null-function) role survives. Swept across state × template.
const dupPersona = [
  { id: 'p-arch', title_de: 'Bauvorlageberechtigte:r Architekt:in', title_en: 'Building-permit-authorised architect', needed: true, rationale_de: '§', rationale_en: '§', qualifier: { source: 'LEGAL', quality: 'CALCULATED' } },
  { id: 'p-energy', title_de: 'Energieberater:in (GEG)', title_en: 'Energy consultant (GEG)', needed: true, rationale_de: 'GEG', rationale_en: 'GEG', qualifier: { source: 'LEGAL', quality: 'CALCULATED' } },
  { id: 'p-haz', title_de: 'Schadstoffgutachter:in', title_en: 'Hazardous-materials assessor', needed: true, rationale_de: 'x', rationale_en: 'x', qualifier: { source: 'LEGAL', quality: 'CALCULATED' } },
]
for (const bundesland of ['sachsen', 'mv', 'berlin', 'bw'] as const) {
  for (const intent of ['sanierung', 'neubau_einfamilienhaus'] as const) {
    const { roles } = resolveRoles({ bundesland, intent } as never, { facts: [{ key: 'eingriff_tragende_teile', value: true }], roles: dupPersona } as never)
    const fns = roles.map(roleFunction).filter((f): f is string => f != null)
    const uniqueFns = new Set(fns)
    ok(fns.length === uniqueFns.size, `${bundesland}×${intent}: no two specialist cards share a role-function (${roles.length} cards, ${uniqueFns.size} distinct functions)`)
    const architects = roles.filter((r) => roleFunction(r) === 'architect').length
    const energy = roles.filter((r) => roleFunction(r) === 'energy').length
    ok(architects <= 1 && energy <= 1, `${bundesland}×${intent}: architect + energy each render at most once (was 2× each)`)
    ok(roles.some((r) => roleFunction(r) == null && /hazardous/i.test(r.title_en ?? '')), `${bundesland}×${intent}: a genuinely distinct (null-function) specialist is NOT dropped`)
  }
}

// ── Four-class campaign Phase 1 — structural verdict honoring ─────────────
// GUARDRAILS (must pass BEFORE and AFTER the §-comparison change): the cases
// where the current dispatch is correct must stay correct. THE hunted regression
// is a §-comparison that flips a correct standard verdict to simplified.
console.log('\n[smoke-thin-state] Phase 1 guardrails — legitimate-standard / blocker / free cases must survive…')
const baseC = (over: Record<string, unknown>) => ({ eingriff_aussenhuelle: false, denkmalschutz: false, ensembleschutz: false, ...over })
for (const bundesland of ['mv', 'sachsen', 'bw', 'bayern'] as const) {
  const reg = getStateLocalization(bundesland).procedure.regular.citation.trim()
  // Sonderbau gate → standard (must override any verdict).
  ok(resolveProcedure(baseC({ intent: 'neubau', bundesland, sonderbau_count: 1, verfahren_indikation: getStateLocalization(bundesland).procedure.simplified.citation }) as never).kind === 'standard', `${bundesland}: Sonderbau forces standard (overrides a simplified verdict)`)
  // Hard blockers → bauvoranfrage.
  ok(resolveProcedure(baseC({ intent: 'sanierung', bundesland, denkmalschutz: true }) as never).kind === 'bauvoranfrage', `${bundesland}: denkmalschutz hard-blocker → bauvoranfrage`)
  ok(resolveProcedure(baseC({ intent: 'neubau', bundesland, mk_gebietsart: true }) as never).kind === 'bauvoranfrage', `${bundesland}: mk_gebietsart hard-blocker → bauvoranfrage`)
  // verfahrensfrei verdict → verfahrensfrei.
  ok(resolveProcedure(baseC({ intent: 'sanierung', bundesland, verfahren_indikation: 'verfahrensfrei' }) as never).kind === 'verfahrensfrei', `${bundesland}: verfahrensfrei verdict honored`)
  // THE REGRESSION GUARD: a citation-only REGULAR-§ verdict must map to standard,
  // NEVER flipped to simplified. (pre-fix: generic standard-ASSUMED kind=standard;
  // post-fix: §-comparison standard-CALCULATED kind=standard — standard both ways.)
  if (reg) ok(resolveProcedure(baseC({ intent: 'neubau', bundesland, verfahren_indikation: reg }) as never).kind === 'standard', `${bundesland}: citation-only REGULAR § verdict → standard (NOT flipped to simplified)`)
}

// FIX-PROOF (FAILS before the change, PASSES after): a citation-only SIMPLIFIED-§
// verdict for neubau/aufstockung/anbau/sonstiges must resolve to vereinfachtes,
// not the generic standard-§-ASSUMED that currently masks it (CLASS 1, 78 cells).
console.log('\n[smoke-thin-state] Phase 1 fix-proof — citation-only simplified verdict must propagate (was masked)…')
for (const bundesland of ['mv', 'sachsen', 'bw', 'bayern', 'sh', 'thueringen'] as const) {
  const simp = getStateLocalization(bundesland).procedure.simplified.citation.trim()
  for (const intent of ['neubau', 'aufstockung', 'anbau', 'sonstiges'] as const) {
    const d = resolveProcedure(baseC({ intent, bundesland, verfahren_indikation: simp }) as never)
    ok(d.kind === 'vereinfachtes' && d.confidence === 'CALCULATED', `${bundesland}/${intent}: citation-only "${simp}" → vereinfachtes·CALCULATED (was standard·ASSUMED): got ${d.kind}·${d.confidence}`)
  }
}

// ── Phase 1b — defaulting branches must honor a CONTRADICTING verdict § ──────
// The NRW-neubau / sanierung / umnutzung branches default to 'simplified'. If the
// persona's verdict cites the state's FREE or REGULAR § (contradicting that
// default), the branch must honor the verdict, not force simplified. This is the
// sweep blind spot (its fixtures inject only simplified verdicts). FAILS before
// the Phase-1b fix, PASSES after. (Simplified-§ verdict + no verdict stay
// simplified — pinned above — so the common path doesn't drift.)
console.log('\n[smoke-thin-state] Phase 1b — defaulting branches honor a contradicting (regular/free) verdict §…')
for (const [bundesland, intent] of [['mv', 'sanierung'], ['sachsen', 'sanierung'], ['bw', 'umnutzung'], ['sachsen', 'umnutzung'], ['nrw', 'neubau']] as const) {
  const p = getStateLocalization(bundesland).procedure
  const reg = p.regular.citation.trim()
  const free = p.free?.citation?.trim() ?? ''
  if (reg) { const d = resolveProcedure(baseC({ intent, bundesland, verfahren_indikation: reg }) as never); ok(d.kind === 'standard', `${bundesland}/${intent}: REGULAR-§ verdict "${reg}" → standard (was forced simplified): got ${d.kind}`) }
  if (free) { const d = resolveProcedure(baseC({ intent, bundesland, verfahren_indikation: free }) as never); ok(d.kind === 'verfahrensfrei', `${bundesland}/${intent}: FREE-§ verdict "${free}" → verfahrensfrei (was forced simplified): got ${d.kind}`) }
  // And the common path must NOT drift: a simplified-§ verdict still → vereinfachtes.
  const simp = p.simplified.citation.trim()
  if (simp) { const d = resolveProcedure(baseC({ intent, bundesland, verfahren_indikation: simp }) as never); ok(d.kind === 'vereinfachtes', `${bundesland}/${intent}: simplified-§ verdict still → vereinfachtes (no drift): got ${d.kind}`) }
}

// pre-test audit #3 — NRW-SANIERUNG was the HOLE in the Phase-1b loop above (it
// omits ['nrw','sanierung']). resolveNrwSanierung intercepts the nrw/sanierung
// branch BEFORE the general honorContradictingVerdict can run, and decides from
// FACTS only — with eingriff_tragende_teile=true it returns vereinfachtes § 64.
// A persona verdict citing the REGULAR § 65 / FREE § 62 BauO NRW must now OVERRIDE
// that fact-default (the same CLASS-1 default-masks-verdict closed elsewhere).
console.log('\n[smoke-thin-state] pre-test #3 — NRW-sanierung honors a contradicting verdict over resolveNrwSanierung…')
{
  const nrwP = getStateLocalization('nrw').procedure
  const reg65 = nrwP.regular.citation.trim()
  const free62 = nrwP.free?.citation?.trim() ?? ''
  const simp64 = nrwP.simplified.citation.trim()
  const reg = resolveProcedure(baseC({ intent: 'sanierung', bundesland: 'nrw', eingriff_tragende_teile: true, verfahren_indikation: reg65 }) as never)
  ok(reg.kind === 'standard', `nrw/sanierung: REGULAR "${reg65}" verdict overrides resolveNrwSanierung vereinfachtes (eingriff=true): got ${reg.kind}·${reg.confidence}`)
  if (free62) { const free = resolveProcedure(baseC({ intent: 'sanierung', bundesland: 'nrw', eingriff_tragende_teile: true, verfahren_indikation: free62 }) as never); ok(free.kind === 'verfahrensfrei', `nrw/sanierung: FREE "${free62}" verdict overrides resolveNrwSanierung vereinfachtes: got ${free.kind}`) }
  // No drift: a simplified-§ verdict keeps resolveNrwSanierung's fact-driven output.
  const simp = resolveProcedure(baseC({ intent: 'sanierung', bundesland: 'nrw', eingriff_tragende_teile: true, verfahren_indikation: simp64 }) as never)
  ok(simp.kind === 'vereinfachtes', `nrw/sanierung: simplified "${simp64}" verdict + eingriff → vereinfachtes unchanged (no drift): got ${simp.kind}`)
}

console.log(`\n[smoke-thin-state] ${passed} passed · ${failed} failed`)
if (failed > 0) { console.error('[smoke-thin-state] FAIL'); process.exit(1) }
console.log('[smoke-thin-state] OK')
process.exit(0)
