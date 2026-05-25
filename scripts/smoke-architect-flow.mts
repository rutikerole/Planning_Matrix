// ───────────────────────────────────────────────────────────────────────
// C7 + C8 — architect verification flow smoke tests.
//
// The repo has no unit-test runner (smoke-script pattern, per
// reference_test_infra); this mirrors scripts/smoke-pdf-text.mts. It
// exercises the PURE, isolated logic of the architect flow without any
// live fetch / Supabase session / Edge Function call:
//
//   • parseInviteResponse — share-project CREATE response → result/throw
//     mapping (Commit 1): happy 201 + every error code + malformed.
//
// (Later commits append: aggregate-rollup + qualifier-downgrade sections.)
//
// Exit 0 if all assertions pass; exit 1 if any fail.
// ───────────────────────────────────────────────────────────────────────

import {
  parseInviteResponse,
  ArchitectInviteError,
  type ArchitectInviteErrorCode,
} from '../src/features/result/lib/architectInviteApi.ts'
import { computeVerificationRollup } from '../src/features/result/lib/verificationRollup.ts'
import { erodeVerificationOnEdit } from '../src/lib/projectStateHelpers.ts'
import { composeLegalDomains } from '../src/features/result/lib/composeLegalDomains.ts'
import { composeRisks } from '../src/features/result/lib/composeRisks.ts'
import { composeDoNext } from '../src/features/result/lib/composeDoNext.ts'
import { findRuleSnippet } from '../src/data/legalRuleSnippets.ts'
import { humanizeFact } from '../src/features/result/lib/humanizeFact.ts'
import { resolveAreaSqmByTemplate } from '../src/features/result/lib/costNormsMuenchen.ts'
import { resolveRoles } from '../src/features/result/lib/resolveRoles.ts'
import { stripVersionTokens } from '../src/lib/stripVersionTokens.ts'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
function loadFixtureState(file: string): {
  state: Record<string, unknown>
  bundesland: string
} {
  const fx = JSON.parse(readFileSync(join(REPO_ROOT, file), 'utf-8'))
  return { state: fx.project.state, bundesland: fx.project.bundesland }
}

interface Tally {
  passed: number
  failed: number
}

function ok(t: Tally, cond: boolean, msg: string): void {
  if (cond) {
    console.log(`  ✓ ${msg}`)
    t.passed++
  } else {
    console.log(`  ✗ ${msg}`)
    t.failed++
  }
}

/** Assert parseInviteResponse throws an ArchitectInviteError with `code`. */
function expectThrowCode(
  t: Tally,
  status: number,
  body: unknown,
  code: ArchitectInviteErrorCode,
  label: string,
): void {
  try {
    parseInviteResponse(status, body)
    ok(t, false, `${label} → expected throw, got a value`)
  } catch (e) {
    const isTyped = e instanceof ArchitectInviteError
    ok(
      t,
      isTyped && e.code === code,
      `${label} → throws ArchitectInviteError code='${code}'${
        isTyped ? '' : ` (got ${e instanceof Error ? e.constructor.name : typeof e})`
      }${isTyped && e.code !== code ? ` (got code='${e.code}')` : ''}`,
    )
  }
}

function runInviteParse(): Tally {
  console.log('\n[smoke-architect] parseInviteResponse (Commit 1)…')
  const t: Tally = { passed: 0, failed: 0 }

  // Happy path — 201 CREATE success.
  const okBody = {
    ok: true,
    inviteToken: '11111111-1111-1111-1111-111111111111',
    expiresAt: '2026-05-31T00:00:00.000Z',
    acceptUrl:
      'https://planning-matrix.vercel.app/architect/accept?token=11111111-1111-1111-1111-111111111111',
    requestId: 'req-1',
  }
  try {
    const r = parseInviteResponse(201, okBody)
    ok(t, r.acceptUrl === okBody.acceptUrl, 'happy 201 → acceptUrl mapped')
    ok(t, r.expiresAt === okBody.expiresAt, 'happy 201 → expiresAt mapped')
    ok(t, r.inviteToken === okBody.inviteToken, 'happy 201 → inviteToken mapped')
  } catch (e) {
    ok(t, false, `happy 201 → unexpected throw: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Each labelled error code from the Edge Function.
  expectThrowCode(
    t,
    401,
    { ok: false, error: { code: 'unauthenticated', message: 'Missing bearer token' } },
    'unauthenticated',
    '401 unauthenticated',
  )
  expectThrowCode(
    t,
    403,
    { ok: false, error: { code: 'forbidden', message: 'Only the project owner can create architect invites.' } },
    'forbidden',
    '403 forbidden (not owner)',
  )
  expectThrowCode(
    t,
    404,
    { ok: false, error: { code: 'not_found', message: 'Project not found.' } },
    'not_found',
    '404 not_found',
  )
  expectThrowCode(
    t,
    400,
    { ok: false, error: { code: 'validation', message: 'Body must be …' } },
    'validation',
    '400 validation',
  )
  expectThrowCode(
    t,
    500,
    { ok: false, error: { code: 'persistence_failed', message: 'Insert returned no row.' } },
    'persistence_failed',
    '500 persistence_failed',
  )

  // Malformed success (ok:true but no acceptUrl) → internal.
  expectThrowCode(
    t,
    201,
    { ok: true, inviteToken: 'x', requestId: 'r' },
    'internal',
    'malformed success (missing acceptUrl)',
  )

  // HTTP-status fallback when the body has no labelled code.
  expectThrowCode(t, 403, null, 'forbidden', 'null body @ 403 → status-fallback forbidden')
  expectThrowCode(t, 401, undefined, 'unauthenticated', 'undefined body @ 401 → status-fallback')
  expectThrowCode(
    t,
    418,
    { ok: false, error: { code: 'teapot', message: 'nonsense' } },
    'internal',
    'unknown code + odd status → internal',
  )

  return t
}

function runRollup(): Tally {
  console.log('\n[smoke-architect] computeVerificationRollup (Commit 5 / Bug 33)…')
  const t: Tally = { passed: 0, failed: 0 }
  const v = (setAt?: string) => ({
    source: 'DESIGNER',
    quality: 'VERIFIED',
    ...(setAt ? { setAt } : {}),
  })
  const a = { source: 'LEGAL', quality: 'ASSUMED' }

  // Empty → total 0, NOT allVerified (vacuous-truth guard).
  const empty = computeVerificationRollup({})
  ok(t, empty.total === 0 && empty.verified === 0, 'empty state → total 0 / verified 0')
  ok(t, empty.allVerified === false, 'empty state → allVerified false (no vacuous clear)')

  // Partial → some verified, not all.
  const partial = computeVerificationRollup({
    facts: [
      { key: 'a', value: 1, qualifier: v('2026-05-24T10:00:00.000Z') },
      { key: 'b', value: 2, qualifier: a },
      { key: 'c', value: 3, qualifier: a },
    ],
  } as never)
  ok(t, partial.total === 3, 'partial → total 3')
  ok(t, partial.verified === 1, 'partial → verified 1')
  ok(t, partial.pending === 2, 'partial → pending 2')
  ok(t, partial.allVerified === false, 'partial → allVerified false')

  // All verified across categories → allVerified true; lastVerifiedAt = max setAt.
  const all = computeVerificationRollup({
    facts: [{ key: 'a', value: 1, qualifier: v('2026-05-24T10:00:00.000Z') }],
    recommendations: [{ id: 'r1', qualifier: v('2026-05-24T12:00:00.000Z') }],
    procedures: [{ id: 'p1', qualifier: v('2026-05-24T09:00:00.000Z') }],
  } as never)
  ok(t, all.total === 3 && all.verified === 3, 'all → total 3 / verified 3')
  ok(t, all.allVerified === true, 'all → allVerified true')
  ok(
    t,
    all.lastVerifiedAt === '2026-05-24T12:00:00.000Z',
    `all → lastVerifiedAt = latest setAt (got ${all.lastVerifiedAt})`,
  )

  // One pending item anywhere → NOT allVerified.
  const onePending = computeVerificationRollup({
    facts: [{ key: 'a', value: 1, qualifier: v() }],
    roles: [{ id: 'role1', qualifier: a }],
  } as never)
  ok(t, onePending.allVerified === false, 'one pending role → allVerified false')

  return t
}

function runErosion(): Tally {
  console.log('\n[smoke-architect] erodeVerificationOnEdit (Commit 7 / Bug 32 erosion)…')
  const t: Tally = { passed: 0, failed: 0 }
  const verified = {
    source: 'DESIGNER',
    quality: 'VERIFIED',
    setAt: '2026-05-20T00:00:00.000Z',
    setBy: 'user',
  }
  const fact = (value: unknown, qualifier: unknown) =>
    ({ key: 'plot.hoehe_m', value, qualifier }) as never

  // Verified + value CHANGED → downgrade to DESIGNER+ASSUMED + reason.
  const changed = erodeVerificationOnEdit(
    fact(6, verified),
    fact(9, { source: 'CLIENT', quality: 'DECIDED', setAt: 'x', setBy: 'assistant' }),
  )
  ok(t, changed.qualifier?.source === 'DESIGNER', 'changed value → source stays DESIGNER')
  ok(t, changed.qualifier?.quality === 'ASSUMED', 'changed value → quality downgraded to ASSUMED')
  ok(
    t,
    changed.qualifier?.reason === 'owner edited after verification, re-verification required',
    'changed value → re-verification reason set',
  )
  ok(t, changed.value === 9, 'changed value → new value kept')

  // Verified + SAME value → verification PRESERVED (not eroded by incoming).
  const same = erodeVerificationOnEdit(
    fact(6, verified),
    fact(6, { source: 'CLIENT', quality: 'DECIDED', setAt: 'x', setBy: 'assistant' }),
  )
  ok(t, same.qualifier?.quality === 'VERIFIED', 'same value → verification preserved')
  ok(t, same.qualifier?.source === 'DESIGNER', 'same value → source preserved DESIGNER')

  // Not verified (LEGAL+ASSUMED) + changed value → incoming passes through.
  const notVerified = erodeVerificationOnEdit(
    fact(6, { source: 'LEGAL', quality: 'ASSUMED', setAt: 'x', setBy: 'assistant' }),
    fact(9, { source: 'CLIENT', quality: 'DECIDED', setAt: 'x', setBy: 'assistant' }),
  )
  ok(
    t,
    notVerified.qualifier?.source === 'CLIENT' && notVerified.qualifier?.quality === 'DECIDED',
    'non-verified existing → incoming qualifier untouched',
  )

  return t
}

function runLegalDomains(): Tally {
  console.log('\n[smoke-architect] composeLegalDomains Domain B (Commit 3 / Bug 54)…')
  const t: Tally = { passed: 0, failed: 0 }
  const domB = (file: string, lang: 'de' | 'en') => {
    const { state, bundesland } = loadFixtureState(file)
    const domains = composeLegalDomains(state as never, lang, bundesland)
    return domains.find((d) => d.key === 'B')
  }

  // NRW T-05 (substantive, verfahrensfrei) → B populated with § 62.
  for (const lang of ['de', 'en'] as const) {
    const b = domB('test/fixtures/nrw-t05-bonn-verfahrensfrei.json', lang)
    ok(t, (b?.rows.length ?? 0) > 0, `NRW T-05 ${lang}: Domain B has rows (was empty pre-Bug-54)`)
    ok(
      t,
      b?.rows.some((r) => /§\s*62\s+BauO\s+NRW/.test(r.label)) ?? false,
      `NRW T-05 ${lang}: Domain B cites § 62 BauO NRW`,
    )
  }
  // Sachsen T-01 (stub) → B populated with honest "Landesbauordnung Sachsen".
  for (const lang of ['de', 'en'] as const) {
    const b = domB('test/fixtures/sachsen-t01-leipzig.json', lang)
    ok(t, (b?.rows.length ?? 0) > 0, `Sachsen T-01 ${lang}: Domain B has rows (stub, not empty)`)
    ok(
      t,
      b?.rows.some((r) => /Landesbauordnung Sachsen/.test(r.label)) ?? false,
      `Sachsen T-01 ${lang}: Domain B honest stub label`,
    )
  }
  // Bayern regression — BayBO matchers still drive Domain B (corpus has
  // "BayBO Art. 58" in the area-B reason).
  const bayB = domB('test/fixtures/bayern-t03-verified.json', 'de')
  ok(t, (bayB?.rows.length ?? 0) > 0, 'Bayern T-03: Domain B still populated (BayBO matchers)')
  ok(
    t,
    bayB?.rows.some((r) => /BayBO/.test(r.label)) ?? false,
    'Bayern T-03: Domain B still cites BayBO (no regression)',
  )
  // C4 / Bug 66 — Hamburg T-02 GK 4 MFH Domain B is substantive (§ 61 HBauO
  // procedure + GEG 2024 + Brandschutz + DIN 4109), not a single stub row.
  for (const lang of ['de', 'en'] as const) {
    const b = domB('test/fixtures/hamburg-t02-mfh.json', lang)
    const labels = (b?.rows ?? []).map((r) => r.label)
    ok(t, labels.some((l) => /§\s*61\s+HBauO/.test(l)), `Hamburg T-02 ${lang}: Domain B cites § 61 HBauO`)
    ok(t, labels.includes('GEG 2024'), `Hamburg T-02 ${lang}: Domain B has GEG 2024`)
    ok(t, labels.includes('Brandschutz'), `Hamburg T-02 ${lang}: Domain B has Brandschutz`)
    ok(t, labels.includes('DIN 4109'), `Hamburg T-02 ${lang}: Domain B has DIN 4109 (Bug 66 fill)`)
  }
  return t
}

function runRisks(): Tally {
  console.log('\n[smoke-architect] composeRisks template/fact filtering (Commit 6 / Bug 57)…')
  const t: Tally = { passed: 0, failed: 0 }
  const risksFor = (file: string) => {
    const fx = JSON.parse(readFileSync(join(REPO_ROOT, file), 'utf-8'))
    const all = composeRisks({ project: fx.project, state: fx.project.state, limit: 30 })
    return all.visible.map((r) => r.entry.id)
  }
  // T-05 demolition: demolition risks present; B-Plan/Heritage/Pre-decision/
  // Bauamt-backlog suppressed.
  const t05 = risksFor('test/fixtures/nrw-t05-bonn-verfahrensfrei.json')
  ok(t, t05.some((i) => i === 'risk-schadstoff-abbruch'), 'T-05: hazardous-materials risk present')
  ok(t, t05.some((i) => i === 'risk-entsorgung-abbruch'), 'T-05: disposal risk present')
  ok(t, !t05.includes('risk-bplan-late-discovery'), 'T-05: B-Plan risk excluded')
  ok(t, !t05.includes('risk-denkmal'), 'T-05: Heritage risk suppressed (denkmalschutz=false)')
  ok(t, !t05.includes('risk-vorbescheid-versaeumt'), 'T-05: Pre-decision risk excluded')
  ok(t, !t05.includes('risk-bauamt-auslastung'), 'T-05: Bauamt-backlog risk excluded')
  // T-01 neubau regression: universal risks still fire.
  const t01 = risksFor('test/fixtures/nrw-t01-duesseldorf-plain.json')
  ok(t, t01.includes('risk-bplan-late-discovery'), 'T-01 neubau: B-Plan risk still fires (no regression)')
  ok(t, !t01.includes('risk-schadstoff-abbruch'), 'T-01 neubau: demolition risk does NOT fire')
  return t
}

function runDoNext(): Tally {
  console.log('\n[smoke-architect] composeDoNext template-aware baseline (Commit 8 / Bug 56)…')
  const t: Tally = { passed: 0, failed: 0 }
  const titlesFor = (file: string, lang: 'de' | 'en') => {
    const fx = JSON.parse(readFileSync(join(REPO_ROOT, file), 'utf-8'))
    return composeDoNext({ project: fx.project, state: fx.project.state, lang, limit: 5 }).map(
      (d) => d.title,
    )
  }
  for (const lang of ['de', 'en'] as const) {
    const t05 = titlesFor('test/fixtures/nrw-t05-bonn-verfahrensfrei.json', lang)
    ok(
      t,
      t05.some((x) => /hazardous-materials survey|Schadstoffgutachten/i.test(x)),
      `T-05 ${lang}: Do-Next leads with Schadstoffgutachten`,
    )
    ok(
      t,
      t05.some((x) => /demolition contractor|Abbruchunternehmen/i.test(x)),
      `T-05 ${lang}: Do-Next includes demolition contractor`,
    )
    ok(
      t,
      !t05.some((x) => /scope the procedure|Verfahrenswahl binden/i.test(x)),
      `T-05 ${lang}: Do-Next does NOT show the generic "engage architect to scope"`,
    )
  }
  // T-01 neubau regression — baseline still leads with Bebauungsplan.
  const t01 = titlesFor('test/fixtures/nrw-t01-duesseldorf-plain.json', 'en')
  ok(
    t,
    t01.some((x) => /Bebauungsplan/i.test(x)),
    'T-01 neubau: Do-Next still surfaces the Bebauungsplan baseline (no regression)',
  )
  return t
}

function runBayernBleed(): Tally {
  console.log('\n[smoke-architect] Stadtstaat/non-Bayern Bayern-snippet bleed (C2 / Bug 65)…')
  const t: Tally = { passed: 0, failed: 0 }
  const BLEED = /BayBO|BayTBest|StPlS|M[üu]nch/

  // Hamburg T-02 — the Legal Landscape tab renders findRuleSnippet for every
  // composeLegalDomains row label. None may carry a Bayern/München token.
  const { state, bundesland } = loadFixtureState('test/fixtures/hamburg-t02-mfh.json')
  for (const lang of ['de', 'en'] as const) {
    const domains = composeLegalDomains(state as never, lang, bundesland)
    const labels = domains.flatMap((d) => d.rows.map((r) => r.label))
    // The fixture must actually exercise the historically-bleeding rows.
    ok(t, labels.includes('Brandschutz'), `Hamburg ${lang}: Brandschutz row present (exercises bleed path)`)
    ok(t, labels.includes('Stellplatzsatzung'), `Hamburg ${lang}: Stellplatzsatzung row present (exercises bleed path)`)
    for (const label of labels) {
      const snip = findRuleSnippet(label, bundesland)
      const text = snip ? (lang === 'en' ? snip.interpretationEn : snip.interpretationDe) : ''
      ok(t, !BLEED.test(text), `Hamburg ${lang}: "${label}" interpretation carries NO Bayern token`)
    }
  }

  // Direct generic-topic checks both languages.
  for (const lang of ['de', 'en'] as const) {
    for (const topic of ['Brandschutz', 'Stellplatzsatzung', 'Baulasten'] as const) {
      const s = findRuleSnippet(topic, 'hamburg')
      const txt = s ? (lang === 'en' ? s.interpretationEn : s.interpretationDe) : ''
      ok(t, !!s && !BLEED.test(txt), `Hamburg ${lang}: "${topic}" → federal-neutral (no Bayern token)`)
    }
  }

  // Bayern regression — the authored snippet MUST stay byte-identical.
  const bayBrand = findRuleSnippet('Brandschutz', 'bayern')
  ok(t, /BayBO/.test(bayBrand?.interpretationEn ?? '') && /BayTBest/.test(bayBrand?.interpretationEn ?? ''),
    'Bayern: Brandschutz still cites BayBO + BayTBest (byte-identical)')
  const bayStp = findRuleSnippet('Stellplatzsatzung', 'bayern')
  ok(t, /StPlS 926/.test(bayStp?.interpretationEn ?? ''),
    'Bayern: Stellplatzsatzung still cites StPlS 926 (byte-identical)')

  // humanizeFact second vector — the Verify-with-Architect card.
  const stpFact = { key: 'stellplatz_anzahl_geplant', value: 6 } as never
  ok(t, !BLEED.test(humanizeFact(stpFact, 'en', 'hamburg')),
    'Hamburg: humanizeFact(stellplatz) carries NO StPlS 926')
  ok(t, /StPlS 926/.test(humanizeFact(stpFact, 'en', 'bayern')),
    'Bayern: humanizeFact(stellplatz) still cites StPlS 926 (byte-identical)')
  return t
}

function runCostArea(): Tally {
  console.log('\n[smoke-architect] T-02 cost area-reader (C3 / Bug 64)…')
  const t: Tally = { passed: 0, failed: 0 }
  const { state } = loadFixtureState('test/fixtures/hamburg-t02-mfh.json')
  const facts = (state.facts ?? []) as Array<{ key: string; value: unknown }>
  // Direct: wohnflaeche_gesamt_m2 = 720 must resolve (was missing → 180).
  const direct = resolveAreaSqmByTemplate(facts, 'T-02')
  ok(t, direct === 720, `T-02: area resolves to 720 m² from wohnflaeche_gesamt_m2 (got ${direct})`)
  ok(t, direct !== 180, 'T-02: area is NOT the 180 m² default')
  // Derived fallback: with no total key, 8 units × 90 m² = 720.
  const noTotal = facts.filter(
    (f) => !['wohnflaeche', 'wohnflaeche_m2', 'wohnflaeche_gesamt_m2', 'wohnflaeche_gesamt'].includes(f.key),
  )
  const derived = resolveAreaSqmByTemplate(noTotal, 'T-02')
  ok(t, derived === 720, `T-02: area derives 720 m² from units × per-unit when total absent (got ${derived})`)
  return t
}

function runRoles(): Tally {
  console.log('\n[smoke-architect] T-02 roles union-floor + version scrub (C5 / Bug 67)…')
  const t: Tally = { passed: 0, failed: 0 }
  const VERSION = /\bv\d+\.\d+\.\d+\b/

  // stripVersionTokens unit checks.
  ok(t, stripVersionTokens('Detail-§ in v1.0.21 noch offen') === 'Detail-§ noch offen',
    'stripVersionTokens drops "in v1.0.21"')
  ok(t, !VERSION.test(stripVersionTokens('regional BKI factors not yet wired in v1.0.23 — see docs.')),
    'stripVersionTokens drops "in v1.0.23"')
  ok(t, stripVersionTokens('clean text') === 'clean text', 'stripVersionTokens idempotent on clean text')

  // Hamburg T-02 — persona emitted ONE role; the union floor must re-add the
  // MFH baseline so the GK 4 specialist set is complete.
  const fx = JSON.parse(readFileSync(join(REPO_ROOT, 'test/fixtures/hamburg-t02-mfh.json'), 'utf-8'))
  const { roles, isFromState } = resolveRoles(fx.project, fx.project.state)
  const titles = roles.map((r) => r.title_de)
  ok(t, isFromState, 'Hamburg T-02: isFromState true (persona role present)')
  ok(t, roles.length >= 5, `Hamburg T-02: ≥ 5 roles after union floor (got ${roles.length})`)
  for (const want of ['Architekt:in', 'Tragwerksplaner:in', 'Brandschutzplaner:in', 'Schallschutzgutachter:in']) {
    ok(t, titles.some((x) => x === want), `Hamburg T-02: union includes ${want}`)
  }
  ok(t, titles.some((x) => /Energieberater/.test(x)), 'Hamburg T-02: union includes a GEG-Energieberater:in')
  // No role copy carries an internal version token.
  const leak = roles.find(
    (r) => VERSION.test(r.rationale_de ?? '') || VERSION.test(r.rationale_en ?? '') || VERSION.test(r.qualifier?.reason ?? ''),
  )
  ok(t, !leak, `Hamburg T-02: no role copy leaks a version token${leak ? ` (leak in ${leak.id})` : ''}`)

  // EFH regression — neubau_einfamilienhaus keeps the EFH baseline (no
  // Brandschutz/Schallschutz specialists forced on a single-family home).
  const efh = JSON.parse(readFileSync(join(REPO_ROOT, 'test/fixtures/hamburg-t01-suburb-plain.json'), 'utf-8'))
  const efhRoles = resolveRoles(efh.project, efh.project.state).roles.map((r) => r.title_de)
  ok(t, !efhRoles.includes('Schallschutzgutachter:in'), 'EFH T-01: no MFH-only Schallschutzgutachter forced (no regression)')
  return t
}

function main(): void {
  const sections: Tally[] = [
    runInviteParse(),
    runRollup(),
    runErosion(),
    runLegalDomains(),
    runRisks(),
    runDoNext(),
    runBayernBleed(),
    runCostArea(),
    runRoles(),
  ]
  const passed = sections.reduce((n, s) => n + s.passed, 0)
  const failed = sections.reduce((n, s) => n + s.failed, 0)
  console.log(`\n[smoke-architect] ${passed} passed · ${failed} failed`)
  if (failed > 0) {
    console.log('[smoke-architect] FAIL — see violations above.')
    process.exit(1)
  }
  console.log('[smoke-architect] OK')
  process.exit(0)
}

main()
