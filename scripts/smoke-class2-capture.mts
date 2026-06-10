#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// CLASS-2 CAPTURE SMOKE — pins the layer diagnosis as a permanent guard.
//
// The MV walk proved the persona does not EMIT the structured reader keys
// (prose-only). The layer diagnosis proved the PIPELINE is innocent: an
// emitted key lands in state.facts, renders in the PDF Key Data assembly,
// AND drives the resolver. This smoke pins that capture→render→read path so
// a future change to the capture reducer, the Key Data composer's filter, or
// the procedure-case reader cannot SILENTLY break it (which would make the
// hardened directive a no-op without anyone noticing).
//
// It also pins the QUALITY pass-through: an emitted `denkmalschutz:false`
// ASSUMED keeps its quality on the way to state.facts — the property the
// over-emission safety valve relies on (so an honest ASSUMED tag is at least
// preserved end-to-end; the directive's job is to not emit ungrounded
// negatives at all, since composeRisks Bug 57/96 suppress on value===false
// regardless of quality — documented here, not asserted as desirable).
//
// DETERMINISTIC — runs the REAL production functions on synthetic facts. No
// network, no LLM, no Bayern-SHA impact. Run: npm run smoke:class2-capture
// ───────────────────────────────────────────────────────────────────────
import { applyExtractedFacts } from '../src/lib/projectStateHelpers.ts'
import { isSystemFlagKey } from '../src/legal/systemFlagFilter.ts'
import { factLabel } from '../src/lib/factLabel.ts'
import { buildProcedureCase } from '../src/legal/resolveProcedure.ts'
import { composeRisks } from '../src/features/result/lib/composeRisks.ts'
import type { ProjectState } from '../src/types/projectState.ts'

const project = { bundesland: 'mv', intent: 'sanierung' }
const base = { facts: [], templateId: 'T-03' } as unknown as ProjectState

const pass: string[] = []
const fail: string[] = []
const check = (cond: boolean, msg: string) => (cond ? pass : fail).push(msg)

// Synthetic persona emission — EXACTLY the shape extracted_facts produces.
const emit = (
  facts: Array<{ key: string; value: unknown; source: string; quality: string }>,
) => applyExtractedFacts(base, facts as unknown as NonNullable<Parameters<typeof applyExtractedFacts>[1]>)

// ── BEFORE: baseline reader value (no fact) ──────────────────────────────
check(buildProcedureCase(project, base).eingriff_tragende_teile === false,
  'baseline: no fact → eingriff_tragende_teile=false')

// ── CAPTURE: applyExtractedFacts persists verbatim (no whitelist/drop) ────
const next = emit([
  { key: 'eingriff_tragende_teile', value: true, source: 'LEGAL', quality: 'CALCULATED' },
  { key: 'denkmalschutz', value: true, source: 'LEGAL', quality: 'VERIFIED' },
])
check(next.facts.find((f) => f.key === 'eingriff_tragende_teile')?.value === true,
  'capture: eingriff_tragende_teile lands in state.facts = true')
check(next.facts.some((f) => f.key === 'denkmalschutz'),
  'capture: denkmalschutz also persisted')

// ── COMPOSER: exportPdf Key Data assembly, replicated verbatim ────────────
const keyDataRows = next.facts
  .filter((f) => f.key !== 'verfahren_indikation')
  .filter((f) => !isSystemFlagKey(f.key))
  .map((f) => ({ key: f.key, field: factLabel(f.key, 'en').label }))
check(keyDataRows.some((r) => r.key === 'eingriff_tragende_teile'),
  'composer: Key Data row produced for eingriff_tragende_teile')
check(!isSystemFlagKey('eingriff_tragende_teile'),
  'composer: eingriff_tragende_teile is NOT a system flag (not filtered)')

// ── READER: captured key drives buildProcedureCase ────────────────────────
const caseAfter = buildProcedureCase(project, next)
check(caseAfter.eingriff_tragende_teile === true,
  'reader: captured eingriff_tragende_teile → true')
check(caseAfter.denkmalschutz === true,
  'reader: captured denkmalschutz → true')

// ── QUALITY pass-through: an ASSUMED tag survives into the fact qualifier ──
const assumedNeg = emit([
  { key: 'denkmalschutz', value: false, source: 'LEGAL', quality: 'ASSUMED' },
])
check(assumedNeg.facts.find((f) => f.key === 'denkmalschutz')?.qualifier?.quality === 'ASSUMED',
  'quality: emitted denkmalschutz:false ASSUMED keeps quality=ASSUMED end-to-end')

// ── BLAST-RADIUS DOCUMENTATION (the over-emission risk, pinned as current
//    behavior so a change to the risk logic is caught): an emitted
//    denkmalschutz:false suppresses the Heritage risk — REGARDLESS of quality.
//    This is exactly why the directive must NOT emit ungrounded negatives. ──
// limit:50 so the comparison isolates SUPPRESSION, not top-N ranking (the
// empty fixture under-ranks denkmal vs other universal risks; the real walk's
// richer corpus bumps it to the top — both irrelevant to the suppression point).
const heritageFires = (s: ProjectState) =>
  composeRisks({ project: project as never, state: s, limit: 50 })
    .visible.some((r) => /denkmal|heritage|monument/i.test(r.entry.id))
check(heritageFires(base) === true,
  'blast-radius: absent denkmalschutz → Heritage risk SCORED (conservative default — the MV-walk safe state)')
check(heritageFires(assumedNeg) === false,
  'blast-radius: emitted denkmalschutz:false (even ASSUMED) SUPPRESSES Heritage → why ungrounded negatives must never be emitted')

console.log('\n=== CLASS-2 CAPTURE SMOKE (real production functions) ===')
for (const m of pass) console.log('  ✓ ' + m)
for (const m of fail) console.log('  ✗ ' + m)
console.log(`\n[smoke-class2-capture] ${pass.length} passed · ${fail.length} failed`)
if (fail.length > 0) {
  console.error('[smoke-class2-capture] FAIL — the capture→render→read path or risk blast-radius drifted.')
  process.exit(1)
}
console.log('[smoke-class2-capture] OK')
process.exit(0)
