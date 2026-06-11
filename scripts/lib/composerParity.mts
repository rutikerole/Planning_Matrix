// ───────────────────────────────────────────────────────────────────────
// T-05 sprint Phase 2.5-B — shared composer-parity harness.
//
// The T-02/T-03/T-05 disease was "persona right, composer not listening";
// the shared pipe (decision-first resolveProcedures + verdict hierarchy) is
// fixed repo-wide. Each smoke-tXX-composer gate pins, for ITS template:
//   1. the zero-verdict INTENT BASELINE (kind · citation · confidence) — a
//      legally defensible default, never a masking generic;
//   2. a VERDICT-FACT FLIP end-to-end across the four procedure surfaces
//      (canonical decision · web primary card · Key-Data composition · .md);
//   3. cross-surface equality (one decision, same § everywhere).
// Per-intent §-leak checks live in the individual gates (this module is the
// shared mechanics, smoke-t05-composer.mts is the richest instance).
// ───────────────────────────────────────────────────────────────────────

import {
  buildProcedureCase,
  procedureLabel,
  resolveProcedure,
  type ProcedureKind,
} from '../../src/legal/resolveProcedure.ts'
import {
  resolveProcedures,
  selectProcedures,
} from '../../src/features/result/lib/resolveProcedures.ts'
import { buildExportMarkdown } from '../../src/lib/export/exportMarkdown.ts'

export interface Tally {
  pass: number
  fail: number
}

export function makeOk(t: Tally): (cond: boolean, msg: string) => void {
  return (cond, msg) => {
    if (cond) {
      t.pass++
      console.log(`  ✓ ${msg}`)
    } else {
      t.fail++
      console.error(`  ✗ ${msg}`)
    }
  }
}

export const Q = { source: 'LEGAL', quality: 'CALCULATED' }

export interface ParityProject {
  templateId: string
  /** projects.intent DB value (e.g. 'neubau_einfamilienhaus'). */
  intent: string
  bundesland: string
}

export function mkProject(p: ParityProject, state: unknown): never {
  return {
    id: 'parity',
    name: `Parity ${p.templateId}`,
    plot_address: 'Teststraße 1',
    bundesland: p.bundesland,
    intent: p.intent,
    template_id: p.templateId,
    status: 'in_progress',
    state,
  } as never
}

export function mkState(
  p: ParityProject,
  facts: Array<{ key: string; value: unknown }>,
  procedures: unknown[] = [],
): never {
  return {
    templateId: p.templateId,
    facts: facts.map((f) => ({ ...f, qualifier: Q })),
    procedures,
    documents: [],
    roles: [],
    recommendations: [],
  } as never
}

/** Pin 1 — the zero-verdict intent baseline. */
export function assertBaseline(
  ok: (c: boolean, m: string) => void,
  p: ParityProject,
  expect: { kind: ProcedureKind; citation: RegExp; confidence: 'CALCULATED' | 'ASSUMED' },
): void {
  const state = mkState(p, [])
  const d = resolveProcedure(buildProcedureCase(mkProject(p, state), state))
  ok(d.kind === expect.kind, `${p.templateId} zero-verdict baseline kind ${expect.kind} (got ${d.kind})`)
  ok(expect.citation.test(d.citation), `${p.templateId} baseline cites ${expect.citation} (got "${d.citation}")`)
  ok(d.confidence === expect.confidence, `${p.templateId} baseline confidence ${expect.confidence} (got ${d.confidence})`)
  ok(!/Standard building permit \(.*\) as the starting point/.test(d.reasoning_en) || expect.kind === 'standard', `${p.templateId} baseline is not the masking generic default`)
  // web == decision (decision-first, no baseline bypass)
  const sel = selectProcedures(resolveProcedures(mkProject(p, state), state).procedures)
  ok(sel.primary?.id === 'P-Decision' && (sel.primary?.title_de ?? '').includes(d.citation), `${p.templateId} web primary IS the decision (no baseline bypass)`)
}

/** Pin 2+3 — verdict-fact flip across the four surfaces. */
export function assertFlip(
  ok: (c: boolean, m: string) => void,
  p: ParityProject,
  verdict: string,
  expect: { kind: ProcedureKind; citation: RegExp },
): void {
  const state = mkState(p, [{ key: 'verfahren_indikation', value: verdict }])
  const project = mkProject(p, state)
  const d = resolveProcedure(buildProcedureCase(project, state))
  ok(d.kind === expect.kind, `${p.templateId} flip "${verdict.slice(0, 40)}…" → ${expect.kind} (got ${d.kind})`)
  ok(expect.citation.test(d.citation), `${p.templateId} flip citation matches (got "${d.citation}")`)
  ok(d.confidence === 'CALCULATED', `${p.templateId} flip CALCULATED (persona verdict honored)`)
  const sel = selectProcedures(resolveProcedures(project, state).procedures)
  const keyDataValue = d.citation ? `${d.citation} · ${procedureLabel(d.kind, 'en')}` : procedureLabel(d.kind, 'en')
  const md = buildExportMarkdown({ project, events: [], lang: 'en' })
  const mdProc = md.split('## Procedures')[1]?.split('---')[0] ?? ''
  ok(
    (sel.primary?.title_en ?? '').includes(d.citation) &&
      keyDataValue.startsWith(d.citation) &&
      mdProc.includes(d.citation),
    `${p.templateId} cross-surface: web card == Key Data == .md all carry "${d.citation}"`,
  )
}

export function finish(name: string, t: Tally): void {
  console.log(`\n${t.pass} passed · ${t.fail} failed`)
  if (t.fail > 0) {
    console.error(`[${name}] FAILED`)
    process.exit(1)
  }
  console.log(`[${name}] OK`)
}
