#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// EXPORT-PARITY SMOKE — pins the two MV-walk surface findings.
//
// #1 (CLASS-1): the .md export (buildExportMarkdown) must render the structural
//    engineer "needed" when eingriff_tragende_teile=true — i.e. it must read the
//    SAME resolveRoles output the PDF/Team use (forceStructuralWhenCaptured), NOT
//    raw state.roles (which carried the persona's "not needed").
// #2 (cosmetic): resolveArchiveLabel must NEVER name the state capital — a PLZ-
//    anchored city or a generic local reference, so a no-PLZ Rostock address can
//    never render "Stadtarchiv Schwerin".
// Deterministic — real functions, no network. Run: npm run smoke:export-parity
// ───────────────────────────────────────────────────────────────────────
import { buildExportMarkdown } from '../src/lib/export/exportMarkdown.ts'
import { resolveRoles } from '../src/features/result/lib/resolveRoles.ts'
import { resolveDocuments } from '../src/features/result/lib/resolveDocuments.ts'
import { resolveArchiveLabel, cityFromPlotAddress } from '../src/features/chat/lib/archiveLabel.ts'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) { console.log('  ✓ ' + m); pass++ } else { console.log('  ✗ ' + m); fail++ } }

// ── Fixture: MV/T-03 renovation, load-bearing intervention captured, persona
//    emitted the structural engineer as needed=false (the bug input). ──────
const project = {
  id: 'p1', name: 'Renovation', plot_address: 'Rostock, Lange Straße 14',
  intent: 'sanierung', bundesland: 'mv', template_id: 'T-03', status: 'in_progress',
  created_at: '2026-06-10T00:00:00Z',
  state: {
    facts: [
      { key: 'eingriff_tragende_teile', value: true, qualifier: { source: 'LEGAL', quality: 'CALCULATED' } },
    ],
    roles: [
      { id: 'R-Tragwerksplaner', title_de: 'Tragwerksplaner', title_en: 'Structural engineer', needed: false, rationale_de: 'persona said not needed', rationale_en: 'persona said not needed', qualifier: { source: 'LEGAL', quality: 'ASSUMED' } },
    ],
  },
} as unknown as Parameters<typeof buildExportMarkdown>[0]['project']

// ── #1 canonical resolver: structural forced NEEDED ──────────────────────
const resolved = resolveRoles(project as never, (project as never).state)
const structural = resolved.roles.find((r) => /tragwerk|structural/i.test(`${r.title_de} ${r.title_en}`))
ok(!!structural && structural.needed === true,
  `resolveRoles forces structural NEEDED when eingriff_tragende_teile=true (was persona needed=false): got needed=${structural?.needed}`)

// ── #1 the .md export must AGREE (reads resolveRoles, not raw state.roles) ─
const md = buildExportMarkdown({ project, events: [], lang: 'en' })
ok(/Structural engineer\s*—\s*\*needed\*/.test(md),
  '.md export renders "Structural engineer — *needed*" (parity with PDF/Team)')
ok(!/Structural engineer\s*—\s*\*not needed\*/.test(md),
  '.md export does NOT render the contradictory "Structural engineer — *not needed*"')
// non-vacuous: the INPUT really was needed=false, so the .md only flips via resolveRoles
ok((project as never).state.roles[0].needed === false,
  'non-vacuous: the fixture\'s raw state.roles had structural needed=false (the .md flipped it via resolveRoles)')

// ── #2 archive label: never the state capital ────────────────────────────
console.log('  — archive label (Finding 2):')
ok(cityFromPlotAddress('Lange Straße 14, 18055 Rostock') === 'Rostock',
  'PLZ-anchored city extracted: "…, 18055 Rostock" → Rostock')
ok(cityFromPlotAddress('Rostock, Lange Straße 14') === null,
  'no-PLZ address yields NO city guess (ordering is unreliable): → null')
ok(resolveArchiveLabel('Lange Straße 14, 18055 Rostock', 'en') === 'Stadtarchiv Rostock',
  'PLZ address → "Stadtarchiv Rostock"')
ok(resolveArchiveLabel('Rostock, Lange Straße 14', 'en') === 'the local Stadtarchiv',
  'no-PLZ address (en) → "the local Stadtarchiv" (NOT Schwerin)')
ok(resolveArchiveLabel('Rostock, Lange Straße 14', 'de') === 'dem örtlichen Stadtarchiv',
  'no-PLZ address (de) → "dem örtlichen Stadtarchiv" (NOT Schwerin)')
ok(!/Schwerin/.test(resolveArchiveLabel('Rostock, Lange Straße 14', 'de')),
  'the MV no-PLZ case can NEVER render the state capital "Schwerin"')

// ── Meta-sweep item 5: .md documents == resolveDocuments (NOT raw state) ──
console.log('  — .md documents parity (meta-sweep item 5):')
// The fixture has state.documents = [] (absent). PRE-FIX the .md rendered NO
// Documents section while the PDF listed the resolver-derived Anlagen for the
// identical project — the exact Bug-F drift, re-created on the .md surface.
const rd = resolveDocuments(project as never, (project as never).state)
ok(rd.required.length > 0 && !rd.blockedByVoranfrage,
  `non-vacuous: resolver derives ${rd.required.length} required Anlagen for the fixture (raw state.documents is empty)`)
ok(/## Documents Required/.test(md),
  '.md renders the Documents section from the resolver despite empty state.documents (was absent pre-fix)')
const firstRequired = rd.required[0]
ok(new RegExp(firstRequired.name_en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(md),
  `.md lists the resolver's first required Anlage ("${firstRequired.name_en}")`)
// Hard-blocker suppression must reach the .md too (PDF/web parity).
const blockedProject = JSON.parse(JSON.stringify(project)) as never
;(blockedProject as never as { state: { facts: unknown[] } }).state.facts.push(
  { key: 'mk_gebietsart', value: true, qualifier: { source: 'LEGAL', quality: 'CALCULATED' } })
const mdBlocked = buildExportMarkdown({ project: blockedProject, events: [], lang: 'en' })
ok(/Document requirements pending Bauvoranfrage/.test(mdBlocked),
  '.md hard-blocker state renders the blocked label (suppression reaches the .md)')
ok(!new RegExp(firstRequired.name_en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(mdBlocked.split('## Documents')[1]?.split('---')[0] ?? ''),
  '.md hard-blocker state does NOT enumerate Anlagen (parity with PDF Bug-F suppression)')

// ── Meta-sweep item 5: lang-aware specialist rationale ────────────────────
console.log('  — .md specialist rationale is lang-aware (meta-sweep item 5):')
const projectRat = JSON.parse(JSON.stringify(project)) as never
;(projectRat as never as { state: { roles: Array<{ needed: boolean; rationale_de: string; rationale_en: string }> } }).state.roles[0] = {
  ...(projectRat as never as { state: { roles: never[] } }).state.roles[0] as never,
  needed: true,
  rationale_de: 'Tragende Teile betroffen — Standsicherheitsnachweis nötig.',
  rationale_en: 'Load-bearing parts affected — structural proof needed.',
}
const mdEn = buildExportMarkdown({ project: projectRat, events: [], lang: 'en' })
const mdDe = buildExportMarkdown({ project: projectRat, events: [], lang: 'de' })
ok(/Load-bearing parts affected/.test(mdEn) && !/Tragende Teile betroffen/.test(mdEn),
  'EN .md carries the EN rationale, never the German one (was rationale_de hardcoded)')
ok(/Tragende Teile betroffen/.test(mdDe),
  'DE .md still carries the DE rationale')

console.log(`\n[smoke-export-parity] ${pass} passed · ${fail} failed`)
if (fail > 0) { console.error('[smoke-export-parity] FAIL'); process.exit(1) }
console.log('[smoke-export-parity] OK')
process.exit(0)
