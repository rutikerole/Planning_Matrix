#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// T-05 sprint (fix/t05-procedure-class) — demolition composer regression
// guard. THE standing gate whose absence is where the Sachsen/Leipzig
// silent-wrong lived (T-04 had smoke-t04-composer; T-05 had nothing).
//
// Pins, end-to-end across the FOUR procedure surfaces (canonical decision =
// PDF source · resolveProcedures = web tab + markdown source · Key-Data
// value composition · markdown export):
//   F1  Sachsen bespoke-key flip — the walk's exact facts (verdict stored as
//       `abbruch_verfahrensfrei_sachsbo`, NO canonical key) must resolve to
//       verfahrensfrei § 61 SächsBO CALCULATED everywhere; § 64 nowhere.
//   F2  anzeige tier — attached building, no verdict → anzeige CALCULATED,
//       Anzeige form + REQUIRED neighbour-stability attestation, anzeige
//       timeline lane with a statutory-wait row, no Baugenehmigung milestone.
//   F3  Denkmal — LBO verdict NEVER renders bare; DSchG overlay procedure is
//       preserved as supplementary (pinned design #2: both present).
//   F4  conflict hierarchy — canonical-fact vs persona-structured direction
//       conflict → CONSERVATIVE path + ASSUMED + verdikt_konflikt flag;
//       agreement → CALCULATED (pinned design #3, fixtured both ways).
//   F5  no § 10 GEG / no § 68 Bauantrag on a verfahrensfrei demolition.
//   F6  bespoke-key scan is conservative (hint/excluded keys never read as a
//       verdict; the no-verdict baseline is conservative anzeige, NEVER the
//       regular permit).
//   F7  heading-gate beseitigung concept — § 63a HBO passes, wrong-topic §
//       still caught (C4 guard).
//   F8  GK freistehend fact — attached/absent are conservative (C3 guard).
//
// Run: npx tsx scripts/smoke-t05-composer.mts   (npm run smoke:t05-composer)
// ───────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import {
  buildProcedureCase,
  procedureLabel,
  resolveProcedure,
} from '../src/legal/resolveProcedure.ts'
import {
  resolveProcedures,
  selectProcedures,
} from '../src/features/result/lib/resolveProcedures.ts'
import { requiredDocumentsForCase } from '../src/legal/requiredDocuments.ts'
import { resolveRoles } from '../src/features/result/lib/resolveRoles.ts'
import {
  ANZEIGE_DEMOLITION_PHASES,
  VERFAHRENSFREI_DEMOLITION_PHASES,
} from '../src/features/chat/lib/pdfSections/timeline.ts'
import { PDF_STRINGS } from '../src/features/chat/lib/pdfStrings.ts'
import { buildExportMarkdown } from '../src/lib/export/exportMarkdown.ts'
import {
  deriveGebaeudeklasse,
  deriveGkInputFromFacts,
} from '../src/legal/deriveGebaeudeklasse.ts'
import { enforceCitationHeadingMatch } from '../supabase/functions/chat-turn/citationHeadingGate.ts'
import { resolveCostDisplayMode } from '../src/features/result/lib/costNormsMuenchen.ts'

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

const sachsenProject = { bundesland: 'sachsen', intent: 'abbruch' } as never
const q = { source: 'LEGAL', quality: 'CALCULATED' }

// ── F1: the Sachsen/Leipzig walk, reproduced ─────────────────────────────
const walkState = {
  templateId: 'T-05',
  facts: [
    { key: 'abbruch_typ', value: 'Vollabbruch', qualifier: q },
    { key: 'gebaeude_freistehend', value: true, qualifier: q },
    { key: 'gebaeudeklasse', value: 'GK 3', qualifier: q },
    { key: 'abbruch_verfahrensfrei_sachsbo', value: 'verfahrensfrei nach § 61 SächsBO (vorläufig)', qualifier: q },
    { key: 'nachbargebaeude_freistehend', value: true, qualifier: q },
  ],
  procedures: [
    { id: 'pp1', title_de: 'Abbruchverfahren nach § 61 SächsBO (Vollabbruch)', title_en: 'Demolition procedure under § 61 SächsBO (full demolition)', status: 'erforderlich', rationale_de: 'verfahrensfrei oder anzeigepflichtig nach § 61 SächsBO', rationale_en: 'procedure-free or notification requirement under § 61 SächsBO', qualifier: q },
    { id: 'pp2', title_de: 'Verfahrensfreier Vollabbruch nach § 61 SächsBO', title_en: 'Permit-free full demolition under § 61 SächsBO', status: 'nicht_erforderlich', rationale_de: '', rationale_en: '', qualifier: q },
  ],
  documents: [],
  roles: [],
  recommendations: [],
} as never

console.log('F1 — Sachsen bespoke-key flip (4 surfaces):')
const d1 = resolveProcedure(buildProcedureCase(sachsenProject, walkState))
ok(d1.kind === 'verfahrensfrei', `decision kind verfahrensfrei (got ${d1.kind})`)
ok(/§\s*61\s+SächsBO/.test(d1.citation), `decision cites § 61 SächsBO (got "${d1.citation}")`)
ok(d1.confidence === 'CALCULATED', `decision CALCULATED (got ${d1.confidence})`)
const rp1 = resolveProcedures(sachsenProject, walkState)
const sel1 = selectProcedures(rp1.procedures)
ok(sel1.primary?.id === 'P-Decision', 'web primary IS the decision card (P-Decision)')
ok(/§\s*61/.test(sel1.primary?.title_en ?? ''), 'web primary title carries § 61')
ok(sel1.primary?.status === 'nicht_erforderlich', `web primary status nicht_erforderlich — no REQUIRED tag on a verfahrensfrei card (got ${sel1.primary?.status})`)
const keyDataValue = d1.citation ? `${d1.citation} · ${procedureLabel(d1.kind, 'en')}` : procedureLabel(d1.kind, 'en')
ok(/^§\s*61\s+SächsBO/.test(keyDataValue), `Key-Data value is citation-first (survives ellipsis): "${keyDataValue}"`)
const md1 = buildExportMarkdown({ project: { id: 'x', name: 'Demolition Eisenbahnstraße', plot_address: 'Eisenbahnstraße 100, 04315 Leipzig', bundesland: 'sachsen', intent: 'abbruch', template_id: 'T-05', status: 'in_progress', state: walkState } as never, events: [], lang: 'en' })
const mdProc1 = md1.split('## Procedures')[1]?.split('---')[0] ?? ''
ok(/§\s*61\s+SächsBO/.test(mdProc1), '.md Procedures cites § 61 SächsBO')
ok(!/§\s*64\s+SächsBO/.test(md1), '.md contains NO § 64 SächsBO anywhere')
ok(/Permit-free/.test(mdProc1), '.md Procedures shows the permit-free verdict')
ok(!/Fallback:/.test(mdProc1), '.md has no "Fallback:" mislabel (persona LBO entries absorbed)')
// timeline gate inputs: the verfahrensfrei demolition lane fires
ok(resolveCostDisplayMode('T-05', 'abbruch') === 'demolition', 'timeline/cost gate sees costMode=demolition')
ok(VERFAHRENSFREI_DEMOLITION_PHASES.length === 3, 'verfahrensfrei demolition phase set exists (3 lanes)')
// cross-surface equality (pinned design #1): one decision, all surfaces
ok(
  (sel1.primary?.title_en ?? '').includes(d1.citation) &&
    mdProc1.includes(d1.citation) &&
    keyDataValue.includes(d1.citation),
  'cross-surface: web card == Key Data == .md all carry the SAME decision citation',
)

// ── F5: no § 10 GEG / no Bauantrag set on verfahrensfrei ────────────────
console.log('F5 — verfahrensfrei demolition documents + GEG excision:')
const docsVf = requiredDocumentsForCase({ procedureKind: 'verfahrensfrei', intent: 'abbruch', bundesland: 'sachsen', eingriff_tragende_teile: false, eingriff_aussenhuelle: false, denkmalschutz: false, gebaeude_freistehend: true, geg_trigger: false } as never)
ok(!docsVf.some((d) => d.key === 'bauantragsformular'), 'no Bauantragsformular')
ok(!docsVf.some((d) => ['lageplan', 'bauzeichnungen', 'baubeschreibung'].includes(d.key)), 'no new-build trio')
ok(!docsVf.some((d) => /§\s*68|GEG/.test(d.citation ?? '')), 'no § 68 / no GEG citation in any document')
ok(docsVf.some((d) => d.key === 'entsorgungsnachweise'), 'disposal/recovery records present')
const pdfSrc = readFileSync('src/features/chat/lib/exportPdf.ts', 'utf-8')
ok(/intent === 'abbruch'\s*\n\s*\? undefined/.test(pdfSrc), 'exportPdf derivation line: abbruch → NO gegRef (source pin)')
ok(/omitGeg: procedureCase.intent === 'abbruch'/.test(pdfSrc), 'exportPdf glossary: GEG entry suppressed on abbruch (source pin)')

// ── F2: anzeige tier (attached, no verdict) ──────────────────────────────
console.log('F2 — anzeige tier (attached building):')
const attachedState = { templateId: 'T-05', facts: [{ key: 'gebaeude_freistehend', value: false }], procedures: [], documents: [], roles: [], recommendations: [] } as never
const d2 = resolveProcedure(buildProcedureCase(sachsenProject, attachedState))
ok(d2.kind === 'anzeige', `attached no-verdict → anzeige (got ${d2.kind})`)
ok(d2.confidence === 'CALCULATED', 'attached tier CALCULATED (computed from the attached fact)')
ok(d2.caveats.some((c) => c.kind === 'nachbarbeteiligung'), 'neighbour-stability caveat present')
const docsAz = requiredDocumentsForCase({ procedureKind: 'anzeige', intent: 'abbruch', bundesland: 'sachsen', eingriff_tragende_teile: false, eingriff_aussenhuelle: false, denkmalschutz: false, gebaeude_freistehend: false, geg_trigger: false } as never)
ok(docsAz.some((d) => d.key === 'beseitigungsanzeige' && d.status === 'required'), 'Beseitigungsanzeige REQUIRED')
ok(docsAz.find((d) => d.key === 'standsicherheit_nachbar')?.status === 'required', 'attached → Standsicherheit attestation REQUIRED')
const rolesAz = resolveRoles(sachsenProject, attachedState)
ok(rolesAz.roles.find((r) => r.id === 'R-Tragwerksplaner')?.needed === true, 'attached → Tragwerksplaner NEEDED')
ok(rolesAz.roles.find((r) => r.id === 'R-Bauamt')?.needed === true, 'anzeige → Bauamt NEEDED (receives the notification)')
const waitLane = ANZEIGE_DEMOLITION_PHASES.find((p) => p.labelKey === 'timeline.demo.wait')
ok(waitLane?.kind === 'wait', 'anzeige timeline has the statutory-wait lane')
ok(
  /demolition may begin/.test(PDF_STRINGS.en['timeline.demo.anzeige.milestone.detail'] ?? '') &&
    /Abbruch darf beginnen/.test(PDF_STRINGS.de['timeline.demo.anzeige.milestone.detail'] ?? ''),
  'anzeige milestone is "work may begin" — NOT "Baugenehmigung issued" (EN+DE)',
)

// ── roles on the verfahrensfrei walk (contractor-led framing) ────────────
console.log('F2b — verfahrensfrei roles (contractor-led):')
const rolesVf = resolveRoles(sachsenProject, walkState)
ok(rolesVf.roles.find((r) => r.id === 'R-Abbruchunternehmen')?.needed === true, 'contractor NEEDED')
ok(rolesVf.roles.find((r) => r.id === 'R-Architekt')?.needed !== true, 'architect NOT "NEEDED" (no Antragstellung exists)')
ok(rolesVf.roles.find((r) => r.id === 'R-Tragwerksplaner')?.needed !== true, 'freestanding → Tragwerksplaner conditional, not NEEDED')

// ── F3: Denkmal — LBO verdict + DSchG overlay BOTH present ──────────────
console.log('F3 — Denkmal overlay (pinned design #2):')
const denkmalState = {
  templateId: 'T-05',
  facts: [
    { key: 'verfahren_indikation', value: 'verfahrensfrei nach § 61 SächsBO', qualifier: q },
    { key: 'denkmalschutz', value: true, qualifier: q },
  ],
  procedures: [
    { id: 'ov1', title_de: 'Denkmalrechtliche Erlaubnis', title_en: 'Heritage consent (DSchG)', status: 'erforderlich', rationale_de: 'Erlaubnis der Denkmalbehörde vor Beginn', rationale_en: 'Heritage authority consent before work', qualifier: q },
  ],
  documents: [], roles: [], recommendations: [],
} as never
const d3 = resolveProcedure(buildProcedureCase(sachsenProject, denkmalState))
ok(d3.kind === 'verfahrensfrei', 'LBO tier kept (verfahrensfrei)')
ok(/DSchG|denkmalrechtliche Erlaubnis|heritage consent/i.test(d3.reasoning_en) && /denkmalrechtliche Erlaubnis/i.test(d3.reasoning_de), 'reasoning LEADS with the DSchG consent duty — never bare verfahrensfrei')
ok(d3.caveats.some((c) => c.kind === 'denkmalschutz_check'), 'denkmalschutz_check caveat present')
const sel3 = selectProcedures(resolveProcedures(sachsenProject, denkmalState).procedures)
ok(sel3.primary?.id === 'P-Decision' && sel3.supplementary.some((s) => /Denkmal|Heritage/i.test(`${s.title_de} ${s.title_en}`)), 'BOTH the LBO decision AND the DSchG overlay render (overlay never collapsed/dropped)')
const md3 = buildExportMarkdown({ project: { id: 'y', name: 'x', plot_address: 'x', bundesland: 'sachsen', intent: 'abbruch', template_id: 'T-05', status: 'in_progress', state: denkmalState } as never, events: [], lang: 'en' })
ok(/Heritage consent/.test(md3) && /Permit-free/.test(md3), '.md lists the decision AND the heritage overlay')

// ── F4: conflict hierarchy, both ways ─────────────────────────────────────
console.log('F4 — verdict-conflict hierarchy (pinned design #3):')
const conflictState = {
  templateId: 'T-05',
  facts: [{ key: 'verfahren_indikation', value: 'reguläres Verfahren nach § 64 SächsBO' }],
  procedures: [{ id: 'pf', title_de: 'Verfahrensfreier Vollabbruch nach § 61 SächsBO', title_en: 'Permit-free demolition under § 61 SächsBO', status: 'nicht_erforderlich', rationale_de: '', rationale_en: '', qualifier: q }],
  documents: [], roles: [], recommendations: [],
} as never
const d4 = resolveProcedure(buildProcedureCase(sachsenProject, conflictState))
ok(d4.kind === 'standard', `conflict → CONSERVATIVE path (regular; got ${d4.kind})`)
ok(d4.confidence === 'ASSUMED', 'conflict → qualifier DOWNGRADED to ASSUMED')
ok(d4.caveats[0]?.kind === 'verdikt_konflikt', 'conflict → flagged for architect verification (verdikt_konflikt caveat)')
const agreeState = { ...((conflictState as unknown) as Record<string, unknown>), facts: [{ key: 'verfahren_indikation', value: 'verfahrensfrei nach § 61 SächsBO' }] } as never
const d4b = resolveProcedure(buildProcedureCase(sachsenProject, agreeState))
ok(d4b.kind === 'verfahrensfrei' && d4b.confidence === 'CALCULATED', 'agreement → CALCULATED, no downgrade (non-vacuous counter-case)')
ok(!d4b.caveats.some((c) => c.kind === 'verdikt_konflikt'), 'agreement → no conflict flag')

// ── F6: bespoke-key scan stays conservative ──────────────────────────────
console.log('F6 — bespoke-key scan negatives:')
const negState = {
  templateId: 'T-05',
  facts: [
    { key: 'verfahrensfrei_hinweis', value: 'verfahrensfrei laut Bauherr' },
    { key: 'procedure_freistellung_excluded', value: 'Freistellung ausgeschlossen' },
  ],
  procedures: [], documents: [], roles: [], recommendations: [],
} as never
const pcNeg = buildProcedureCase(sachsenProject, negState)
ok(pcNeg.verfahren_indikation === undefined, 'hint/excluded keys are NOT read as a verdict')
const dNeg = resolveProcedure(pcNeg)
ok(dNeg.kind === 'anzeige' && dNeg.confidence === 'ASSUMED', `no-verdict baseline is conservative anzeige·ASSUMED, NEVER the regular permit (got ${dNeg.kind}·${dNeg.confidence})`)
ok(!/Standard building permit/.test(dNeg.reasoning_en), 'no "Standard building permit as the starting point" framing on T-05')
// four-class-sweep catch (ordering contract): a citation-only verdict citing
// the state's SIMPLIFIED § resolves by its CLASS (vereinfachtes·CALCULATED) —
// the abbruch facts-tier must NOT consume it as a demolition citation.
const dCiteOnly = resolveProcedure(buildProcedureCase(sachsenProject, { templateId: 'T-05', facts: [{ key: 'verfahren_indikation', value: '§ 63 SächsBO', qualifier: q }], procedures: [], documents: [], roles: [], recommendations: [] } as never))
ok(dCiteOnly.kind === 'vereinfachtes' && dCiteOnly.confidence === 'CALCULATED', `citation-only simplified-§ verdict resolves by CLASS, not the abbruch tier (got ${dCiteOnly.kind}·${dCiteOnly.confidence})`)
const dCite63a = resolveProcedure(buildProcedureCase({ bundesland: 'hessen', intent: 'abbruch' } as never, { templateId: 'T-05', facts: [{ key: 'verfahren_indikation', value: 'verfahrensfrei nach § 63a HBO', qualifier: q }], procedures: [], documents: [], roles: [], recommendations: [] } as never))
ok(dCite63a.kind === 'verfahrensfrei' && /63a/.test(dCite63a.citation), `beseitigung-§ verdict (§ 63a HBO) honored with its § (got ${dCite63a.kind} · ${dCite63a.citation})`)

// ── F7: heading-gate beseitigung concept (C4 guard) ──────────────────────
console.log('F7 — heading-gate beseitigung concept:')
const t63a = { procedures_delta: [{ op: 'upsert', id: 'p1', title_de: 'Beseitigung (Abbruch) nach § 63a HBO', title_en: '', rationale_de: '', rationale_en: '', quality: 'CALCULATED' }] }
ok(enforceCitationHeadingMatch(t63a as never, 'hessen').length === 0 && (t63a.procedures_delta[0] as { quality: string }).quality === 'CALCULATED', '§ 63a HBO demolition title passes (no over-downgrade)')
const tWrong = { procedures_delta: [{ op: 'upsert', id: 'p2', title_de: 'Abbruchverfahren nach § 36 HBO', title_en: '', rationale_de: '', rationale_en: '', quality: 'CALCULATED' }] }
const eWrong = enforceCitationHeadingMatch(tWrong as never, 'hessen')
ok(eWrong.length === 1 && eWrong[0].concept === 'beseitigung', 'wrong-topic § on a demolition title still caught (non-vacuous)')

// ── F8: GK freistehend fact (C3 guard) ───────────────────────────────────
console.log('F8 — Gebäudeklasse freistehend fact:')
const gk = (facts: Array<{ key: string; value: unknown }>) =>
  deriveGebaeudeklasse(deriveGkInputFromFacts(facts, 'T-05')).klasse
ok(gk([{ key: 'gebaeude_freistehend', value: true }, { key: 'traufhoehe_m', value: 6 }]) === 1, 'freestanding captured → GK 1 (current behavior preserved)')
ok(gk([{ key: 'gebaeude_freistehend', value: false }, { key: 'traufhoehe_m', value: 6 }]) === 2, 'attached captured → GK 2 (neighbour-stability duties stay on)')
ok(gk([{ key: 'traufhoehe_m', value: 6 }]) === 2, 'absent → conservative GK 2 (T-05 no longer hardcoded freistehend)')
ok(gk([{ key: 'nachbargebaeude_freistehend', value: true }, { key: 'traufhoehe_m', value: 6 }]) === 2, "neighbour's freestanding fact never leaks into the building's GK")

console.log(`\n${pass} passed · ${fail} failed`)
if (fail > 0) {
  console.error('[smoke-t05-composer] FAILED')
  process.exit(1)
}
console.log('[smoke-t05-composer] OK')
