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
  type ProcedureDecision,
  type ProcedureKind,
} from '../../src/legal/resolveProcedure.ts'
import {
  resolveProcedures,
  selectProcedures,
} from '../../src/features/result/lib/resolveProcedures.ts'
import {
  composeLegalDomains,
  procedureAnchorStatus,
} from '../../src/features/result/lib/composeLegalDomains.ts'
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

/**
 * Meta-sweep item 1 — the legal-landscape PROCEDURE ANCHOR row must agree with
 * the canonical decision on BOTH languages. Pre-fix the composer re-classified
 * the verdict with its own substring regex: a "Genehmigungsfreistellung …"
 * verdict rendered status "permit-free"/"verfahrensfrei" on this tab while the
 * procedure card said notification-only (proven failing before the fix on the
 * T-01 § 62 SächsBO Freistellung flip below).
 */
function assertLegalLandscape(
  ok: (c: boolean, m: string) => void,
  p: ParityProject,
  state: never,
  d: ProcedureDecision,
  tag: string,
): void {
  for (const lang of ['en', 'de'] as const) {
    const anchor = composeLegalDomains(state, lang, p.bundesland, d).find(
      (x) => x.key === 'R',
    )?.rows[0]
    const want = procedureAnchorStatus(d, lang)
    ok(
      anchor?.status === want,
      `${p.templateId} ${tag} ${lang}: legal-landscape anchor status == decision kind ("${want}"; got "${anchor?.status}")`,
    )
    ok(
      !d.citation.trim() || (anchor?.label ?? '').includes(d.citation),
      `${p.templateId} ${tag} ${lang}: legal-landscape anchor cites the decision § (got "${anchor?.label}")`,
    )
    // The substring trap, pinned structurally: a Freistellung decision must
    // never read as permit-free on this row.
    if (d.kind === 'genehmigungsfreigestellt') {
      ok(
        !/verfahrensfrei|permit-free/i.test(anchor?.status ?? ''),
        `${p.templateId} ${tag} ${lang}: Freistellung anchor does NOT read permit-free (got "${anchor?.status}")`,
      )
    }
  }
}

/** fix/t07-walk1 — a verdict word per kind, for the per-template phantom-
 *  conflict probe below. Each maps to a string classifyVerdictDirection reads
 *  as that kind's direction. */
const KIND_VERDICT_WORD: Record<ProcedureKind, string> = {
  verfahrensfrei: 'verfahrensfrei',
  genehmigungsfreigestellt: 'Genehmigungsfreistellung',
  kenntnisgabe: 'Kenntnisgabeverfahren',
  vereinfachtes: 'vereinfachtes Baugenehmigungsverfahren',
  standard: 'reguläres Baugenehmigungsverfahren',
  bauvoranfrage: 'Bauvoranfrage',
}

/**
 * fix/t07-walk1 — exercise the verfahren_konflikt path PER TEMPLATE (it was
 * dormant in every composer smoke because mkState defaults procedures:[]).
 * A persona structured entry that AGREES with the verdict (same direction)
 * but whose RATIONALE mentions verfahrensfrei in an EXCEEDANCE sense must NOT
 * be re-classified into a phantom conflict. RED pre-fix for every non-free
 * baseline (the rationale re-classified to 'free' → false conflict + ASSUMED).
 */
function assertNoPhantomConflict(
  ok: (c: boolean, m: string) => void,
  p: ParityProject,
  d: ProcedureDecision,
): void {
  const word = KIND_VERDICT_WORD[d.kind]
  const verdict = `${word}${d.citation ? ` nach ${d.citation}` : ''}`
  const persona = [
    {
      id: 'pc',
      status: 'erforderlich',
      title_de: verdict,
      title_en: verdict,
      rationale_de: 'Brutto-Rauminhalt übersteigt jede verfahrensfreie Schwelle.',
      rationale_en: 'Gross volume exceeds any verfahrensfreie threshold.',
      qualifier: Q,
    },
  ]
  const state = mkState(p, [{ key: 'verfahren_indikation', value: verdict }], persona)
  const cd = resolveProcedure(buildProcedureCase(mkProject(p, state), state))
  ok(
    !cd.caveats.some((c) => c.kind === 'verdikt_konflikt'),
    `${p.templateId} no phantom conflict when an agreeing rationale mentions verfahrensfrei`,
  )
  ok(
    cd.confidence === 'CALCULATED',
    `${p.templateId} same-verdict stays CALCULATED (no phantom downgrade; got ${cd.confidence})`,
  )
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
  assertLegalLandscape(ok, p, state, d, 'baseline')
  // fix/t07-walk1 — per-template conflict-path coverage.
  assertNoPhantomConflict(ok, p, d)
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
  const keyDataValue = d.citation ? `${d.citation} · ${procedureLabel(d.kind, 'en', d.intent)}` : procedureLabel(d.kind, 'en', d.intent)
  const md = buildExportMarkdown({ project, events: [], lang: 'en' })
  const mdProc = md.split('## Procedures')[1]?.split('---')[0] ?? ''
  ok(
    (sel.primary?.title_en ?? '').includes(d.citation) &&
      keyDataValue.startsWith(d.citation) &&
      mdProc.includes(d.citation),
    `${p.templateId} cross-surface: web card == Key Data == .md all carry "${d.citation}"`,
  )
  assertLegalLandscape(ok, p, state, d, `flip:${expect.kind}`)
}

export function finish(name: string, t: Tally): void {
  console.log(`\n${t.pass} passed · ${t.fail} failed`)
  if (t.fail > 0) {
    console.error(`[${name}] FAILED`)
    process.exit(1)
  }
  console.log(`[${name}] OK`)
}
