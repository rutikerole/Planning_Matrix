#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// ITEM C — runtime citation HEADING gate regression guard + render-verify.
//
// A persona-emitted citation whose own-state § is NOT the corpus-canonical §
// for its asserted concept must DOWNGRADE (quality→ASSUMED) + flag; a correct
// § is untouched. State-specific: the canonical § comes from the corpus pack
// per state, never an assumed-uniform number.
//
// Drift guard: if the known wrong-topic § (§ 49 BauO NRW = Barrierefreies Bauen,
// cited as the architect's Bauvorlage §) stops being caught, this FAILS.
//
// Run: npx tsx scripts/smoke-citation-heading-gate.mts  (npm run smoke:citation-heading-gate)
// ───────────────────────────────────────────────────────────────────────

import { enforceCitationHeadingMatch } from '../supabase/functions/chat-turn/citationHeadingGate.ts'

let pass = 0
let fail = 0
const ok = (cond: boolean, msg: string): void => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`) }
  else { fail++; console.error(`  ✗ ${msg}`) }
}

const env = { specialist: 'moderator', message_de: 'm', message_en: 'm', input_type: 'none' } as const
const archRole = (rationale: string) => ({ ...env, roles_delta: [{ op: 'upsert', id: 'R-Architekt', title_de: 'Architekt:in', title_en: 'Architect', rationale_de: rationale, source: 'LEGAL', quality: 'CALCULATED' }] }) as never
const proc = (title: string, rationale = '') => ({ ...env, procedures_delta: [{ op: 'upsert', id: 'p1', title_de: title, title_en: title, rationale_de: rationale, rationale_en: rationale, source: 'LEGAL', quality: 'CALCULATED' }] }) as never

// 1 — WRONG (render-verify): architect cites § 49 BauO NRW (Barrierefreies Bauen)
//     as the Bauvorlage §. NRW canonical bauvorlage = § 67. → downgrade + flag.
{
  const tool: any = archRole('bauvorlageberechtigt nach § 49 BauO NRW')
  const ev = enforceCitationHeadingMatch(tool, 'nrw')
  ok(ev.length === 1 && ev[0].concept === 'bauvorlage' && ev[0].cited.includes('49') && ev[0].expected.includes('67'),
    `§ 49 cited as Bauvorlage → heading_mismatch flagged (cited ${ev[0]?.cited}, expected ${ev[0]?.expected})`)
  ok(tool.roles_delta[0].quality === 'ASSUMED', `wrong-topic § → quality downgraded CALCULATED→ASSUMED (got ${tool.roles_delta[0].quality})`)
}

// 2 — CORRECT: architect cites the real NRW Bauvorlage § 67 → untouched.
{
  const tool: any = archRole('bauvorlageberechtigt nach § 67 BauO NRW')
  const ev = enforceCitationHeadingMatch(tool, 'nrw')
  ok(ev.length === 0 && tool.roles_delta[0].quality === 'CALCULATED', 'correct § 67 Bauvorlage → no flag, qualifier untouched')
}

// 3 — CORRECT procedure (the Saarland walk): § 64 LBO Saarland for vereinfachtes.
{
  const tool: any = proc('Vereinfachtes Baugenehmigungsverfahren (§ 64 LBO Saarland)')
  const ev = enforceCitationHeadingMatch(tool, 'saarland')
  ok(ev.length === 0 && tool.procedures_delta[0].quality === 'CALCULATED', 'Saarland § 64 for vereinfachtes → untouched (the walk was correct)')
}

// 4 — WRONG procedure: § 49 BauO NRW cited as the procedure verdict.
{
  const tool: any = proc('Verfahren (§ 49 BauO NRW)')
  const ev = enforceCitationHeadingMatch(tool, 'nrw')
  ok(ev.length === 1 && ev[0].concept === 'procedure' && tool.procedures_delta[0].quality === 'ASSUMED',
    `§ 49 cited as procedure → flagged + downgraded (expected one of ${ev[0]?.expected})`)
}

// 5 — Sonderbau proximity: § 49 cited right next to "Sonderbau" → flagged
//     (NRW canonical Sonderbau = § 50); a passing mention with the right § is OK.
{
  const wrong: any = proc('Vereinfachtes (§ 64 BauO NRW)', 'Kein Sonderbau-Tatbestand nach § 49 BauO NRW.')
  const ev = enforceCitationHeadingMatch(wrong, 'nrw')
  ok(ev.some((e: any) => e.concept === 'sonderbau' && e.cited.includes('49')), `Sonderbau cited with § 49 → flagged (NRW Sonderbau is § 50)`)
  const right: any = proc('Vereinfachtes (§ 64 BauO NRW)', 'Sonderbau-Prüfung nach § 50 BauO NRW: kein Tatbestand.')
  ok(!enforceCitationHeadingMatch(right, 'nrw').some((e: any) => e.concept === 'sonderbau'), 'Sonderbau cited with the correct § 50 → no flag')
}

// 6 — state-specificity: a § number that's right in NRW can be wrong elsewhere.
//     § 67 is NRW's Bauvorlage § but Saarland's Bauvorlage § is § 66 → § 67 in
//     Saarland is flagged (proves it's NOT an assumed-uniform number).
{
  const tool: any = archRole('bauvorlageberechtigt nach § 67 LBO Saarland')
  const ev = enforceCitationHeadingMatch(tool, 'saarland')
  ok(ev.length === 1 && ev[0].expected.includes('66'), `§ 67 as Bauvorlage in Saarland → flagged (Saarland Bauvorlage is § 66, not § 67) — state-specific`)
}

console.log(`\n${pass} passed · ${fail} failed`)
if (fail > 0) process.exit(1)
