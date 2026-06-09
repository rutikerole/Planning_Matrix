#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// FOUR-CLASS SWEEP — offline, detection-only audit of all 128 cells
// (16 Bundesländer × 8 templates) against the bug-CLASSES found across the
// T-01/T-02/T-03 campaign. DETECTION ONLY — this harness changes NO product
// behaviour (Bayern SHA must not move) and applies NO fixes. It runs the REAL
// deterministic resolvers on representative fixture ProjectStates (like
// smoke-thin-state) — it is NOT a regex-over-source check for CLASS 1/4.
//
//   CLASS 1 — two-sources-of-truth / fact→surface: a computed fact is present
//             but a surface renders a template/intent DEFAULT instead.
//   CLASS 2 — capture→read contract gap: reader fact-keys with no matching
//             documented persona write-directive (or vice-versa).
//   CLASS 3 — keyword / exact-match fragility: resolver branches keyed on
//             free-text/keyword/title rather than a structured fact/enum.
//   CLASS 4 — gate holes: §§ citable in a cell that the gates CANNOT
//             existence/heading-verify (out-of-corpus laws).
//
// Output: docs/FOUR_CLASS_SWEEP_<date>.md (matrix + findings + blind spots +
// fix-order) and a console summary. Exits 0 (report-only; NOT a CI gate yet).
//
// Run: npx tsx scripts/audit-four-class-sweep.mts            (npm run audit:four-class)
//      npx tsx scripts/audit-four-class-sweep.mts --write    (also (re)write the doc)
// ───────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { listRegisteredStates, resolveStateDelta } from '../src/legal/legalRegistry.ts'
import { getStateCitations } from '../src/legal/stateCitations.ts'
import { getStateLocalization } from '../src/legal/stateLocalization.ts'
import { resolveProcedure, buildProcedureCase, intentFromTemplate } from '../src/legal/resolveProcedure.ts'
import { resolveRoles, roleFunction } from '../src/features/result/lib/resolveRoles.ts'
import { resolveCostDisplayMode, costModeShowsEuroFigure } from '../src/features/result/lib/costNormsMuenchen.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WRITE = process.argv.includes('--write') || true // default: always write the doc
const STAMP = '2026-06-09'

const TEMPLATES = ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08'] as const
type TemplateId = (typeof TEMPLATES)[number]
const TEMPLATE_INTENT: Record<TemplateId, string> = {
  'T-01': 'neubau_einfamilienhaus', 'T-02': 'neubau_mehrfamilienhaus', 'T-03': 'sanierung',
  'T-04': 'umnutzung', 'T-05': 'abbruch', 'T-06': 'aufstockung', 'T-07': 'anbau', 'T-08': 'sonstige',
}
// The intent-appropriate procedure baseline (deriveBaselineProcedure): every
// residential/Bestand intent defaults to the SIMPLIFIED procedure; demolition
// follows the regular path. A resolver that returns generic standard-§-ASSUMED
// for a non-abbruch intent is masking the computed verdict (CLASS 1).
const EXPECTED_PROC_KIND: Record<string, 'vereinfachtes' | 'standard'> = {
  neubau: 'vereinfachtes', sanierung: 'vereinfachtes', umnutzung: 'vereinfachtes',
  aufstockung: 'vereinfachtes', anbau: 'vereinfachtes', sonstiges: 'vereinfachtes', abbruch: 'standard',
}
const STATES = listRegisteredStates()

type Severity = 'RED' | 'YELLOW' | 'INFO'
interface Finding { cls: 1 | 2 | 3 | 4; severity: Severity; state?: string; template?: string; surface: string; detail: string }
const findings: Finding[] = []
// matrix[state][template] = { 1: clean?, 2, 3, 4 }
const matrix: Record<string, Record<string, { 1: boolean; 2: boolean; 3: boolean; 4: boolean }>> = {}
for (const s of STATES) { matrix[s] = {}; for (const t of TEMPLATES) matrix[s][t] = { 1: true, 2: true, 3: true, 4: true } }
const mark = (state: string, template: string, cls: 1 | 2 | 3 | 4) => { matrix[state][template][cls] = false }

// ── Corpus registry (existence + heading) for CLASS 4 ─────────────────────
const corpus = new Map<string, Map<string, string>>() // law_short -> num -> heading
function addLaw(short: string, paragraphs: Record<string, { heading_de_official?: string }>): void {
  const m = corpus.get(short) ?? new Map<string, string>()
  for (const [num, p] of Object.entries(paragraphs ?? {})) m.set(num.toLowerCase(), p?.heading_de_official ?? '')
  corpus.set(short, m)
}
const fed = JSON.parse(readFileSync(join(ROOT, 'scripts/legal-corpus/federal.json'), 'utf8')) as { laws: Record<string, { paragraphs: Record<string, { heading_de_official?: string }> }> }
for (const [short, law] of Object.entries(fed.laws)) addLaw(short, law.paragraphs)
for (const f of readdirSync(join(ROOT, 'scripts/legal-corpus/states')).filter((x) => x.endsWith('.json'))) {
  const st = JSON.parse(readFileSync(join(ROOT, 'scripts/legal-corpus/states', f), 'utf8')) as { _meta: { law_short: string }; paragraphs: Record<string, { heading_de_official?: string }> }
  addLaw(st._meta.law_short, st.paragraphs)
}
const RECOGNISABLE = [...corpus.keys()].sort((a, b) => b.length - a.length)
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Real laws deliberately not in the §-corpus (the known, deferred gate gap).
const OUT_OF_CORPUS: Array<{ rx: RegExp; why: string }> = [
  { rx: /\bStPlS\b/i, why: 'München Stellplatzsatzung — municipal' },
  { rx: /DSchG|DSchPflG|DSchG\b/i, why: 'Denkmalschutzgesetz (monument law)' },
  { rx: /\bHOAI\b/i, why: 'HOAI fee schedule' },
  { rx: /LBOV?VO|LBOAVO|DVO|PrüfVO|BauVorlVO|BauuntPrüfVO|VVO/i, why: 'procedure/execution ordinance' },
]
function citationLaw(citation: string): string | null {
  return RECOGNISABLE.find((l) => new RegExp(`(?:^|[^A-Za-zÄÖÜäöüß0-9])${escapeRe(l)}(?:$|[^A-Za-zÄÖÜäöüß0-9])`).test(citation)) ?? null
}

// ════════════════════════════════════════════════════════════════════════
// CLASS 1 — fact→surface propagation (real resolvers, per cell)
// ════════════════════════════════════════════════════════════════════════
function sweepClass1(): void {
  for (const state of STATES) {
    const simpCite = getStateLocalization(state).procedure.simplified.citation.trim() || `§ X ${state}`
    for (const template of TEMPLATES) {
      const intent = intentFromTemplate(template)
      const projIntent = TEMPLATE_INTENT[template]
      // (a) PROCEDURE — a citation-only verdict (no German keyword) must resolve
      //     to the intent-appropriate procedure, NOT the generic standard-ASSUMED.
      const pcase = buildProcedureCase(
        { bundesland: state, intent: projIntent } as never,
        { templateId: template, facts: [
          { key: 'verfahren_indikation', value: simpCite }, // citation-only, no keyword
          ...(template === 'T-03' ? [{ key: 'eingriff_tragende_teile', value: true }] : []),
        ] } as never,
      )
      const decision = resolveProcedure(pcase)
      const expected = EXPECTED_PROC_KIND[intent]
      if (decision.kind !== expected && decision.confidence === 'ASSUMED') {
        mark(state, template, 1)
        findings.push({ cls: 1, severity: 'RED', state, template, surface: 'Procedure (resolveProcedure)', detail: `citation-only verdict "${simpCite}" → ${decision.kind}·ASSUMED (expected ${expected}); generic standard-ASSUMED masks the computed verdict` })
      }
      // (b) COST — the display mode must match the intent (stub for Bestand, € for
      //     new-build); a single resolver drives all four cost surfaces.
      const mode = resolveCostDisplayMode(template, projIntent)
      const bestand = intent === 'sanierung' || intent === 'umnutzung' || intent === 'abbruch'
      if (bestand && costModeShowsEuroFigure(mode)) {
        mark(state, template, 1)
        findings.push({ cls: 1, severity: 'RED', state, template, surface: 'Cost (resolveCostDisplayMode)', detail: `Bestand intent shows a € figure (mode=${mode}) instead of the honest stub` })
      }
      // (c) ROLES — a captured load-bearing intervention must force the structural
      //     engineer NEEDED, and no two cards may share a role-function.
      const { roles } = resolveRoles(
        { bundesland: state, intent: projIntent } as never,
        { facts: [{ key: 'eingriff_tragende_teile', value: true }], roles: [
          { id: 'p-struct', title_de: 'Tragwerksplaner:in', title_en: 'Structural engineer', needed: false, rationale_de: 'nur falls', rationale_en: 'only if', qualifier: { source: 'LEGAL', quality: 'CALCULATED' } },
        ] } as never,
      )
      const struct = roles.find((r) => roleFunction(r as never) === 'structural')
      if (!struct || !struct.needed) {
        mark(state, template, 1)
        findings.push({ cls: 1, severity: 'RED', state, template, surface: 'Team (resolveRoles)', detail: 'captured eingriff_tragende_teile=true did NOT force structural engineer NEEDED' })
      }
      const fns = roles.map((r) => roleFunction(r as never)).filter((f): f is string => f != null)
      if (fns.length !== new Set(fns).size) {
        mark(state, template, 1)
        findings.push({ cls: 1, severity: 'YELLOW', state, template, surface: 'Team (resolveRoles)', detail: `duplicate specialist cards share a role-function (${fns.join(', ')})` })
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// CLASS 4 — citation verifiability per state (existence + heading)
// ════════════════════════════════════════════════════════════════════════
function sweepClass4(): void {
  for (const state of STATES) {
    const pack = getStateCitations(state)
    const allowedCitations = resolveStateDelta(state).allowedCitations
    const loc = getStateLocalization(state).procedure
    const citable = new Set<string>([
      ...allowedCitations,
      pack.permitFormCitation, pack.permitSubmissionCitation, pack.structuralCertCitation,
      pack.abstandsFlaechenCitation, pack.brandschutzCitation, pack.permitFreeCitation,
      loc.simplified.citation, loc.regular.citation, loc.free?.citation ?? '',
    ].filter((c) => c && c.trim().length > 0))
    const unverifiable: string[] = []
    for (const cite of citable) {
      const law = citationLaw(cite)
      const num = cite.match(/(?:§§?|Art\.?|Anlage)\s*(\d+[a-z]?)/i)?.[1]?.toLowerCase()
      if (law && num && corpus.get(law)?.has(num)) continue // existence+heading checkable
      const ack = OUT_OF_CORPUS.find((a) => a.rx.test(cite))
      if (ack) {
        unverifiable.push(`${cite} [${ack.why}]`)
        // RED if it sits in the runtime-trusted allow-list; YELLOW otherwise.
        const inAllowlist = allowedCitations.includes(cite)
        findings.push({ cls: 4, severity: inAllowlist ? 'RED' : 'YELLOW', state, surface: inAllowlist ? 'allowedCitations (runtime firewall)' : 'citation pack', detail: `${cite} — out-of-corpus, UNVERIFIABLE (${ack.why})` })
      }
      // (law in corpus but § missing, or unparseable, would surface in verify-citations:strict; not re-reported here)
    }
    if (unverifiable.length) {
      for (const t of TEMPLATES) mark(state, t, 4)
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// CLASS 2 — capture→read contract gaps (curated from verified source inventories)
// ════════════════════════════════════════════════════════════════════════
// Reader fact-keys (exact-key reads) the resolvers REQUIRE, and whether the
// persona write-directive (personaBehaviour.ts A.5/D.5, shared.ts Rule 12)
// explicitly instructs emitting them. Free-form extracted_facts means the
// persona CAN emit any key, but an undirected key relies on the model guessing
// the exact string a reader matches — the capture→read contract gap.
const READER_EXACT_KEYS: Array<{ key: string; reader: string; relevantIntents: string[]; directed: boolean }> = [
  { key: 'eingriff_tragende_teile', reader: 'buildProcedureCase / resolveRoles structural-force', relevantIntents: ['sanierung', 'umnutzung', 'aufstockung', 'anbau'], directed: false },
  { key: 'eingriff_aussenhuelle', reader: 'buildProcedureCase (NRW sanierung)', relevantIntents: ['sanierung'], directed: false },
  { key: 'denkmalschutz', reader: 'buildProcedureCase hard-blocker / composeRisks', relevantIntents: ['sanierung', 'umnutzung', 'neubau', 'abbruch', 'aufstockung', 'anbau', 'sonstiges'], directed: false },
  { key: 'ensembleschutz', reader: 'buildProcedureCase', relevantIntents: ['sanierung', 'umnutzung'], directed: false },
  { key: 'aenderung_aeussere_erscheinung', reader: 'resolveNrwSanierung', relevantIntents: ['sanierung'], directed: false },
  { key: 'mk_gebietsart', reader: 'buildProcedureCase hard-blocker', relevantIntents: ['neubau', 'umnutzung'], directed: false },
  { key: 'bauvoranfrage_hard_blocker', reader: 'buildProcedureCase hard-blocker', relevantIntents: ['neubau', 'sanierung', 'umnutzung', 'aufstockung', 'anbau', 'sonstiges'], directed: false },
  { key: 'gebaeudeklasse', reader: 'AtAGlance explicit-GK / deriveGebaeudeklasse', relevantIntents: ['neubau', 'sanierung', 'umnutzung', 'aufstockung', 'anbau', 'sonstiges'], directed: true },
  { key: 'anzahl_sonderbau_tatbestaende', reader: 'detectSonderbauCount (shape-tolerant)', relevantIntents: ['neubau', 'umnutzung', 'sonstiges'], directed: true },
]
function sweepClass2(): void {
  for (const r of READER_EXACT_KEYS) {
    if (r.directed) continue // the persona is told to write this exact key — contract met
    findings.push({ cls: 2, severity: 'YELLOW', surface: r.reader, detail: `reader requires EXACT key '${r.key}' but the persona write-directive does not explicitly name it (free-form emission only) — capture→read gap for intents: ${r.relevantIntents.join('/')}` })
    for (const state of STATES) for (const t of TEMPLATES) {
      if (r.relevantIntents.includes(intentFromTemplate(t))) mark(state, t, 2)
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// CLASS 3 — keyword / exact-match fragility (curated from verified Inventory C)
// ════════════════════════════════════════════════════════════════════════
const FRAGILE_BRANCHES: Array<{ where: string; field: string; condition: string; breaks: string; intents: string[] }> = [
  { where: 'resolveProcedure.ts:401', field: 'verfahren_indikation', condition: "/verfahrensfrei|permit-free|genehmigungsfrei/", breaks: '"permit free" (two words), English "no permit required"', intents: ['sanierung', 'umnutzung', 'abbruch'] },
  { where: 'resolveProcedure.ts:432', field: 'verfahren_indikation', condition: "/vereinfacht|simplified/", breaks: 'citation-only verdict "§ 63 LBauO M-V" (no keyword) → falls to generic standard-ASSUMED (CLASS 1)', intents: ['neubau', 'sanierung', 'umnutzung', 'aufstockung', 'anbau', 'sonstiges'] },
  { where: 'resolveProcedure.ts:461', field: 'verfahren_indikation', condition: "/regul[äa]r|standard/", breaks: 'English "regular process" (no umlaut term)', intents: ['neubau', 'sanierung', 'umnutzung'] },
  { where: 'resolveProcedure.ts:149 extractProcedureCitation', field: 'verfahren_indikation', condition: "§/Art regex", breaks: '"§62 BauO" (no space), "Art 58" (no period)', intents: ['neubau', 'sanierung', 'umnutzung', 'abbruch'] },
  { where: 'resolveRoles.ts roleFunction', field: 'role title', condition: 'title keyword regex', breaks: 'a persona role title with no recognised keyword → null function (kept distinct, but cannot dedupe against a synonym)', intents: ['neubau', 'sanierung', 'umnutzung', 'aufstockung', 'anbau', 'abbruch', 'sonstiges'] },
  { where: 'costNormsMuenchen.ts:448 detectProcedure', field: 'procedure rationale', condition: "/art.?57|58|60|vereinfacht|.../", breaks: 'English "Article 60" / "simplified" (cost multiplier silently defaults to 1.0)', intents: ['neubau', 'sanierung', 'umnutzung', 'aufstockung', 'anbau', 'sonstiges'] },
  { where: 'composeLegalDomains.ts:106-299 has(/…/)', field: 'corpus text', condition: 'BauGB/GEG/Denkmal/Stellplatz regexes', breaks: 'non-string fact values coerced to "" (lost); English paraphrases', intents: ['neubau', 'sanierung', 'umnutzung', 'abbruch', 'aufstockung', 'anbau', 'sonstiges'] },
  { where: 'composeExecutiveRead.ts:388 extractStatuteCite', field: 'fact value/evidence', condition: '§/Art citation regex', breaks: '"§ 30/34 BauGB" → only §30 captured; "§34BauGB" (no space) missed', intents: ['neubau', 'sanierung', 'umnutzung', 'abbruch', 'aufstockung', 'anbau', 'sonstiges'] },
]
function sweepClass3(): void {
  for (const b of FRAGILE_BRANCHES) {
    findings.push({ cls: 3, severity: 'YELLOW', surface: b.where, detail: `keys on ${b.field} via ${b.condition} — breaks on: ${b.breaks}` })
    for (const state of STATES) for (const t of TEMPLATES) {
      if (b.intents.includes(intentFromTemplate(t))) mark(state, t, 3)
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// Run + report
// ════════════════════════════════════════════════════════════════════════
sweepClass1(); sweepClass4(); sweepClass2(); sweepClass3()

const red = findings.filter((f) => f.severity === 'RED')
const yellow = findings.filter((f) => f.severity === 'YELLOW')
const byClass = (c: number) => findings.filter((f) => f.cls === c)

// ── Matrix render (legend: ✓ clean · ✗ dirty, per class 1/2/3/4) ──
function cell(s: string, t: string): string {
  const m = matrix[s][t]
  return [m[1] ? '·' : '1', m[2] ? '·' : '2', m[3] ? '·' : '3', m[4] ? '·' : '4'].join('')
}
const header = '| State'.padEnd(18) + '| ' + TEMPLATES.map((t) => t.padEnd(5)).join('| ') + '|'
const sep = '|' + '-'.repeat(17) + '|' + TEMPLATES.map(() => '-'.repeat(6)).join('|') + '|'
const rows = STATES.map((s) => `| ${s.padEnd(15)} | ` + TEMPLATES.map((t) => cell(s, t).padEnd(4)).join('| ') + '|')

const lines: string[] = []
lines.push(`# Four-Class Sweep — ${STAMP}`)
lines.push('')
lines.push('Branch `audit/four-class-sweep`. **Detection only — no product fixes, no merge, no deploy.** Bayern SHA unchanged (additive harness).')
lines.push('')
lines.push(`Generated by \`scripts/audit-four-class-sweep.mts\` (\`npm run audit:four-class\`) — runs the REAL deterministic resolvers on representative fixtures for all ${STATES.length}×${TEMPLATES.length}=${STATES.length * TEMPLATES.length} cells.`)
lines.push('')
lines.push(`**Totals:** ${red.length} RED · ${yellow.length} YELLOW findings. CLASS counts — 1: ${byClass(1).length} · 2: ${byClass(2).length} · 3: ${byClass(3).length} · 4: ${byClass(4).length}.`)
lines.push('')
lines.push('## 128-cell matrix')
lines.push('')
lines.push('Each cell shows which CLASSES are **dirty** (digit shown) vs clean (`·`). Order: `1234`. `····` = clean on all four.')
lines.push('- **1** = fact→surface default-masking · **2** = capture→read key gap · **3** = keyword/exact-match fragility · **4** = unverifiable out-of-corpus citation')
lines.push('')
lines.push('```')
lines.push(header); lines.push(sep); rows.forEach((r) => lines.push(r))
lines.push('```')
lines.push('')
for (const c of [1, 2, 3, 4] as const) {
  const fs = byClass(c)
  lines.push(`## CLASS ${c} findings (${fs.length})`)
  lines.push('')
  if (fs.length === 0) { lines.push('_None — clean across all cells._'); lines.push(''); continue }
  // De-dup identical (surface+detail) findings that repeat per cell into one line with a scope.
  const grouped = new Map<string, { f: Finding; cells: string[] }>()
  for (const f of fs) {
    const k = `${f.severity}|${f.surface}|${f.detail}`
    const g = grouped.get(k) ?? { f, cells: [] }
    if (f.state) g.cells.push(`${f.state}${f.template ? '/' + f.template : ''}`)
    grouped.set(k, g)
  }
  for (const [, g] of [...grouped.entries()].sort((a, b) => (a[1].f.severity === 'RED' ? -1 : 1) - (b[1].f.severity === 'RED' ? -1 : 1))) {
    const scope = g.cells.length === 0 ? 'global' : g.cells.length > 12 ? `${g.cells.length} cells` : g.cells.join(', ')
    lines.push(`- **${g.f.severity}** · \`${g.f.surface}\` — ${g.f.detail}  _(scope: ${scope})_`)
  }
  lines.push('')
}
lines.push('## What this sweep CANNOT catch (blind spots)')
lines.push('')
lines.push('- **Fixtures, not live LLM output.** It exercises the deterministic resolvers with synthetic ProjectStates; it cannot see what the persona actually emits in a live turn (e.g. whether it writes the exact reader key, or phrases a verdict with the keyword). CLASS 2 "directed" judgements are from the directive prose, which is fuzzy.')
lines.push('- **Corpus-correct ≠ concept-correct.** CLASS 4 confirms a § exists with a heading; it does NOT judge whether that § is the RIGHT § for the concept (that is `verify:concept-citations` + a human). A § that exists but is mis-mapped is invisible here.')
lines.push('- **PDF/React rendering not directly run.** It checks the shared resolvers the PDF + tabs read; it does not render exportPdf or the React surfaces. `smoke:pdf-matrix` + a human walk still own pixel-level / layout regressions.')
lines.push('- **CLASS 3 is a curated inventory**, re-derived by reading the resolvers — it will not auto-discover a NEW fragile branch added later. Re-curate when resolvers change.')
lines.push('- **Out-of-corpus laws are listed, not checked.** CLASS 4 cannot existence-check a § inside DVOSächsBO/DSchG/etc. because we have no corpus for them — it can only flag them as unverifiable.')
lines.push('')
lines.push('## Recommended fix-order (recommendation only — no fixes applied)')
lines.push('')
lines.push('1. **CLASS 1 procedure gap (RED, highest coverage):** generalise the T-03 `sanierung` branch in `resolveProcedure` to neubau/aufstockung/anbau/sonstiges — a citation-only verdict currently falls to generic standard-§-ASSUMED for those intents, masking the computed verdict on every state. One resolver change clears the RED CLASS-1 cells in one pass (mirrors the umnutzung + sanierung fixes).')
lines.push('2. **CLASS 3 procedure keyword fragility (root of #1):** honor a verdict by COMPARING its cited § to the localization free/simplified/regular §§ (structured) instead of keyword-matching "vereinfacht" — fixes the citation-only class at the source and shrinks future CLASS-1 regressions.')
lines.push('3. **CLASS 2 structural/blocker write-directive:** add an explicit persona directive to emit the exact reader keys (`eingriff_tragende_teile`, `denkmalschutz`, …) — closes the capture→read gap so the resolvers are not relying on the model guessing the key. (Edge-fn: needs redeploy.)')
lines.push('4. **CLASS 4 out-of-corpus ingestion (largest YELLOW, lowest per-cell risk):** ingest the procedure-ordinance + monument laws (DVOSächsBO, DSchG variants, LBOVVO, BauVorlVO) so the gates can existence-check them. Bayern\'s StPlS/BayDSchG allow-list entries are the only RED here.')
lines.push('')

const report = lines.join('\n')
if (WRITE) {
  writeFileSync(join(ROOT, `docs/FOUR_CLASS_SWEEP_${STAMP}.md`), report + '\n')
}
// Console summary
console.log(`[four-class-sweep] ${STATES.length}×${TEMPLATES.length} cells swept.`)
console.log(`[four-class-sweep] ${red.length} RED · ${yellow.length} YELLOW · class 1:${byClass(1).length} 2:${byClass(2).length} 3:${byClass(3).length} 4:${byClass(4).length}`)
console.log('\n' + header + '\n' + sep + '\n' + rows.join('\n'))
console.log(`\n[four-class-sweep] report → docs/FOUR_CLASS_SWEEP_${STAMP}.md`)
console.log('[four-class-sweep] OK (detection-only; exits 0)')
process.exit(0)
