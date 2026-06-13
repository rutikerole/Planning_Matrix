#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// T-04 walk YELLOW-2 + YELLOW-4 — composer regression guard.
//
// YELLOW-2: the markdown Procedures section listed every raw state.procedures
//   row, so two persona-emitted §64-erforderlich entries (same verdict, two
//   rationale strings "warehouse → office" / "Lager → Büro") rendered as TWO
//   cards while PDF/tab showed one. Fixed by selectProcedures (dedup on the
//   structured verdict key) shared by the tab + markdown.
// YELLOW-4: composeDoNext bucketed umnutzung WITH sanierung → a "Commission an
//   existing-condition survey · Renovation scope follows the existing
//   structure" step bled onto a use-change; and the altlast/excavation risk
//   ("soil pre-investigation before excavation") fired on a fit-out. Fixed by
//   splitting umnutzung into a use-change baseline + excludeIntents on the risk.
//
// Each fix is pinned WITH a non-vacuous counter-case (sanierung still gets the
// survey + altlast). Run: npx tsx scripts/smoke-t04-composer.mts
// ───────────────────────────────────────────────────────────────────────

import { selectProcedures } from '../src/features/result/lib/resolveProcedures.ts'
import { buildProcedureCase, resolveProcedure } from '../src/legal/resolveProcedure.ts'
import { composeDoNext } from '../src/features/result/lib/composeDoNext.ts'
import { composeRisks } from '../src/features/result/lib/composeRisks.ts'
import { buildExportMarkdown } from '../src/lib/export/exportMarkdown.ts'

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

const proc = (id: string, status: string, rDe: string, rEn: string, titleDe: string, titleEn: string) =>
  ({ id, title_de: titleDe, title_en: titleEn, status, rationale_de: rDe, rationale_en: rEn, qualifier: { source: 'LEGAL', quality: 'CALCULATED' } })

// ── YELLOW-2: two identical §64 verdicts (different rationale) collapse ──
const twoSame = [
  proc('p1', 'erforderlich', 'warehouse → office', 'warehouse → office', 'Vereinfachtes Baugenehmigungsverfahren (§ 64 BauO NRW)', 'Simplified building permit procedure (§ 64 BauO NRW)'),
  proc('p2', 'erforderlich', 'Lager → Büro', 'Lager → Büro', 'Vereinfachtes Baugenehmigungsverfahren (§ 64 BauO NRW)', 'Simplified building permit procedure (§ 64 BauO NRW)'),
]
const sel = selectProcedures(twoSame as never)
ok(!!sel.primary && !sel.fallback, 'two identical §64 verdicts → ONE primary, NO fallback (dedup on verdict key, not rationale)')

// non-vacuous: a genuinely different verdict is retained as fallback
const twoDiff = [
  twoSame[0],
  proc('p3', 'nicht_erforderlich', 'x', 'x', 'Verfahrensfrei (§ 62 BauO NRW)', 'Permit-free (§ 62 BauO NRW)'),
]
const sel2 = selectProcedures(twoDiff as never)
ok(!!sel2.primary && !!sel2.fallback, 'different verdict → fallback retained (non-vacuous)')

// render-verify: re-exported T-04 markdown Procedures section has ONE bullet
const project = {
  id: 'x', name: 'Change of use Speditionstraße', plot_address: 'Speditionstraße 21, 40221 Düsseldorf',
  bundesland: 'nrw', intent: 'umnutzung', template_id: 'T-04', status: 'in_progress',
  state: { schemaVersion: 1, templateId: 'T-04', facts: [], procedures: twoSame, documents: [], roles: [], recommendations: [] },
} as never
const md = buildExportMarkdown({ project, events: [], lang: 'en' })
const section = md.split('## Procedures')[1]?.split('---')[0] ?? ''
const bullets = (section.match(/^- \[/gm) ?? []).length
ok(bullets === 1, `re-exported T-04 markdown Procedures has ONE card (was 2): got ${bullets}`)

// ── YELLOW-4: use-change Do-Next has no renovation bleed ──
const dn = (intent: string) =>
  composeDoNext({
    project: { intent, bundesland: 'nrw' } as never,
    state: { facts: [], recommendations: [], areas: { A: { state: 'ACTIVE' }, B: { state: 'ACTIVE' }, C: { state: 'ACTIVE' } } } as never,
    lang: 'en',
    limit: 10,
  })
const um = dn('umnutzung')
ok(!um.some((i) => /existing-condition survey|Renovation scope/i.test(`${i.title} ${i.detail}`)), 'umnutzung Do-Next has NO renovation existing-condition-survey bleed')
ok(um.some((i) => /admissible|use change/i.test(`${i.title} ${i.detail}`)), 'umnutzung Do-Next HAS use-change steps (use-class admissibility)')
ok(dn('sanierung').some((i) => /existing-condition survey/i.test(`${i.title} ${i.detail}`)), 'sanierung still gets the existing-condition survey (non-vacuous)')

// ── YELLOW-4: use-change Risk Register has no altlast/excavation ──
const risks = (intent: string) =>
  composeRisks({
    project: { intent, bundesland: 'nrw' } as never,
    state: { facts: [{ key: 'lage', value: 'altes Gewerbe-/Lagergebäude Bestand' }], areas: {} } as never,
    limit: 50,
  })
ok(!risks('umnutzung').visible.some((r) => /altlast/i.test(r.entry.id)), 'umnutzung Risk Register has NO altlast / "before excavation" risk')
ok(risks('sanierung').visible.some((r) => /altlast/i.test(r.entry.id)), 'sanierung still surfaces altlast (non-vacuous)')

// ── fix/t07-walk1 item 1 — phantom-conflict coverage for T-04 (umnutzung).
// The conflict bug is in template-agnostic buildProcedureCase; T-04 is the one
// composer smoke that does not use the shared assertBaseline probe, so pin it
// here too: an agreeing persona entry whose rationale mentions verfahrensfrei
// in an exceedance sense must NOT trigger a phantom conflict.
const t04Conflict = resolveProcedure(buildProcedureCase(
  { bundesland: 'nrw', intent: 'umnutzung' } as never,
  {
    templateId: 'T-04',
    facts: [{ key: 'verfahren_indikation', value: 'vereinfachtes Verfahren nach § 64 BauO NRW' }],
    procedures: [{
      id: 'p', status: 'erforderlich',
      title_de: 'Vereinfachtes Baugenehmigungsverfahren (§ 64 BauO NRW)',
      title_en: 'Simplified building permit (§ 64 BauO NRW)',
      rationale_de: 'Die Nutzfläche übersteigt jede verfahrensfreie Schwelle.',
      rationale_en: 'The floor area exceeds any verfahrensfreie threshold.',
      qualifier: { source: 'LEGAL', quality: 'CALCULATED' },
    }],
  } as never,
))
ok(!t04Conflict.caveats.some((c) => c.kind === 'verdikt_konflikt') && t04Conflict.confidence === 'CALCULATED',
  'T-04 umnutzung: agreeing rationale mentioning verfahrensfrei → NO phantom conflict, stays CALCULATED')

console.log(`\n${pass} passed · ${fail} failed`)
if (fail > 0) process.exit(1)
