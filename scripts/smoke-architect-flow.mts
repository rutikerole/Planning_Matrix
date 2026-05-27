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
import { pickSmartSuggestions } from '../src/features/result/lib/smartSuggestionsMatcher.ts'
import { computeChamberProgress } from '../src/features/chat/lib/chamberProgress.ts'
import { factLabel } from '../src/lib/factLabel.ts'
import { resolveProcedure, procedureLabel, intentFromTemplate } from '../src/legal/resolveProcedure.ts'
import { composeExecutiveRead } from '../src/features/result/lib/composeExecutiveRead.ts'
import { computeConfidence } from '../src/features/result/lib/computeConfidence.ts'
import { deriveBaselineProcedure } from '../src/features/result/lib/deriveBaselineProcedure.ts'
import { resolveProcedures } from '../src/features/result/lib/resolveProcedures.ts'
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

  // v1.0.32 Bug 112 — rollup surfaces self-attested architect identity from
  // state.verification (denormalized by verify-fact); null when absent.
  const withId = computeVerificationRollup({
    facts: [{ key: 'a', value: 1, qualifier: v('2026-05-26T10:00:00.000Z') }],
    verification: {
      architectName: 'Dipl.-Ing. Anna Vogt',
      architectChamberNo: 'BY-2024-08817',
      architectChamberState: 'Bayerische Architektenkammer',
      firstVerifiedAt: '2026-05-26T10:00:00.000Z',
    },
  } as never)
  ok(t, withId.architectName === 'Dipl.-Ing. Anna Vogt', 'rollup surfaces architectName from state.verification')
  ok(t, withId.architectChamberNo === 'BY-2024-08817', 'rollup surfaces architectChamberNo')
  ok(t, withId.architectChamberState === 'Bayerische Architektenkammer', 'rollup surfaces architectChamberState')
  ok(t, empty.architectName === null, 'rollup architectName null when verification absent')

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
  // Sachsen T-01 — was a STUB ("Landesbauordnung Sachsen") pre-Phase-B; Phase B
  // flipped Sachsen substantive (corpus-backed SächsBO), so Domain B now cites a
  // real "§ NN SächsBO". The old stub-label assertion went silently red after
  // that flip (smoke:architect was not in CI — fixed in this sprint). Assert the
  // substantive behaviour instead.
  for (const lang of ['de', 'en'] as const) {
    const b = domB('test/fixtures/sachsen-t01-leipzig.json', lang)
    ok(t, (b?.rows.length ?? 0) > 0, `Sachsen T-01 ${lang}: Domain B has rows (substantive, not empty)`)
    ok(
      t,
      b?.rows.some((r) => /§\s*\d+[a-z]?\s+SächsBO/.test(r.label)) ?? false,
      `Sachsen T-01 ${lang}: Domain B cites a real SächsBO § (substantive, not the old stub)`,
    )
  }
  // Bayern regression — BayBO matchers still drive Domain B (corpus has
  // "BayBO Art. 59" in the area-B reason).
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

  // v1.0.30 Bug 96 — Heritage risk suppressed when denkmalschutz is ASSUMED +
  // "nicht bekannt" (the T-04 Leipzig case), not just explicit false/nein.
  const risksForState = (state: unknown) =>
    composeRisks({ project: { intent: 'umnutzung', bundesland: 'sachsen' } as never, state: state as never, limit: 30 })
      .visible.map((r) => r.entry.id)
  const assumedNeg = risksForState({
    facts: [{ key: 'denkmalschutz', value: 'nicht bekannt an der Einheit', qualifier: { source: 'CLIENT', quality: 'ASSUMED' } }],
  })
  ok(t, !assumedNeg.includes('risk-denkmal'), 'Bug 96: Heritage risk suppressed on denkmalschutz ASSUMED + "nicht bekannt"')
  // Regression — an affirmative heritage value STILL fires (must not over-suppress).
  const heritageTrue = risksForState({
    facts: [{ key: 'denkmalschutz', value: 'ja — Einzeldenkmal', qualifier: { source: 'CLIENT', quality: 'DECIDED' } }],
  })
  ok(t, heritageTrue.includes('risk-denkmal'), 'Bug 96: Heritage risk STILL fires when denkmalschutz is affirmatively true')
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

function runSuggestions(): Tally {
  console.log('\n[smoke-architect] T-02 suggestions baseline (C6 / Bug 68)…')
  const t: Tally = { passed: 0, failed: 0 }
  const BLEED = /BayBO|BayTBest|StPlS|M[üu]nch/

  const fx = JSON.parse(readFileSync(join(REPO_ROOT, 'test/fixtures/hamburg-t02-mfh.json'), 'utf-8'))
  const picks = pickSmartSuggestions({ project: fx.project, state: fx.project.state, limit: 8 })
  const ids = picks.map((s) => s.id)
  ok(t, ids.includes('bauvoranfrage-neubau'), 'Hamburg T-02: Bauvoranfrage suggestion present')
  ok(t, ids.includes('kernteam-mfh'), 'Hamburg T-02: MFH core-team suggestion present')
  // MFH-specific cards must out-rank the generic insurance filler.
  const topThree = ids.slice(0, 3)
  ok(t, topThree.includes('kernteam-mfh') || topThree.includes('bauvoranfrage-neubau'),
    'Hamburg T-02: an MFH-specific card ranks in the top 3 (not generic boilerplate only)')
  // No Bayern bleed + no fabricated KfW forced.
  for (const s of picks) {
    ok(t, !BLEED.test(`${s.titleEn} ${s.bodyEn}`), `Hamburg T-02: suggestion "${s.id}" carries NO Bayern token`)
  }

  // EFH T-01 regression — the MFH-only core-team card must NOT fire.
  const efh = JSON.parse(readFileSync(join(REPO_ROOT, 'test/fixtures/hamburg-t01-suburb-plain.json'), 'utf-8'))
  const efhIds = pickSmartSuggestions({ project: efh.project, state: efh.project.state, limit: 8 }).map((s) => s.id)
  ok(t, !efhIds.includes('kernteam-mfh'), 'EFH T-01: MFH-only core-team card does NOT fire (no regression)')

  // v1.0.30 Bug 94/95/103 — T-04 use-conversion deterministic suggestions.
  // Synthetic T-04 project with the use-change facts the Leipzig walk recorded.
  const t04Project = { intent: 'umnutzung', bundesland: 'sachsen', template_id: 'T-04' } as never
  const t04State = {
    recommendations: [],
    facts: [
      { key: 'schallschutz_massnahmen_erforderlich', value: 'Bestandsaufnahme durch Schallschutzgutachter:in erforderlich' },
      { key: 'brandschutz_massnahmen', value: 'Brandschutzplaner:in + Rettungswegplan erforderlich' },
      { key: 'rettungsweg_zweiter', value: 'Zweiter Rettungsweg fehlt' },
      { key: 'ta_laerm_gutachten_erforderlich', value: 'TA Lärm Außenlärm-Gutachten vor Bauantrag erforderlich' },
    ],
  } as never
  const t04Ids = pickSmartSuggestions({ project: t04Project, state: t04State, limit: 8 }).map((s) => s.id)
  ok(t, t04Ids.includes('bauvoranfrage-umnutzung'), 'T-04: Bauvoranfrage (always-on floor) fires → exec page non-empty (Bug 103)')
  ok(t, t04Ids.includes('schallschutz-umnutzung'), 'T-04: Schallschutz suggestion fires on facts (Bug 94/95)')
  ok(t, t04Ids.includes('brandschutz-rettungsweg-umnutzung'), 'T-04: Brandschutz/Rettungsweg suggestion fires')
  ok(t, t04Ids.includes('ta-laerm-umnutzung'), 'T-04: TA Lärm suggestion fires')
  for (const s of pickSmartSuggestions({ project: t04Project, state: t04State, limit: 8 })) {
    ok(t, !BLEED.test(`${s.titleEn} ${s.bodyEn}`), `T-04: suggestion "${s.id}" carries NO Bayern token`)
  }
  // T-01 regression — the T-04-only cards must NOT fire on a neubau project.
  const t01Ids = pickSmartSuggestions({ project: { intent: 'neubau', bundesland: 'sachsen', template_id: 'T-01' } as never, state: t04State, limit: 8 }).map((s) => s.id)
  ok(t, !t01Ids.includes('schallschutz-umnutzung'), 'T-01: T-04-only Schallschutz card does NOT fire (no regression)')
  return t
}

function runProgress(): Tally {
  console.log('\n[smoke-architect] chamber progress + synthesis handoff (C7 / Bug 69+70)…')
  const t: Tally = { passed: 0, failed: 0 }
  const turns = (specs: string[]) =>
    specs.map((s, i) => ({ id: `a${i}`, role: 'assistant', specialist: s })) as never

  const fx = JSON.parse(readFileSync(join(REPO_ROOT, 'test/fixtures/hamburg-t02-mfh.json'), 'utf-8'))
  const state = fx.project.state // areas A/B/C all ACTIVE, procedures=[], recs=[]

  // Synthesis reached: synthesizer has the floor + 3 areas settled. Round 12
  // of 22 (turnsFraction 0.545) used to show 55%; must now be ≥ 95 so
  // useCompletionGate fires hero/ready (the missing "Open briefing" handoff).
  const synthMsgs = turns([
    'moderator', 'moderator', 'planungsrecht', 'planungsrecht', 'bauordnungsrecht',
    'bauordnungsrecht', 'sonstige_vorgaben', 'verfahren', 'beteiligte', 'beteiligte',
    'synthesizer', 'synthesizer',
  ])
  const atSynthesis = computeChamberProgress(synthMsgs, state, null)
  ok(t, atSynthesis.percent >= 95, `synthesis reached → percent ≥ 95 (got ${atSynthesis.percent}, was 55)`)
  ok(t, atSynthesis.isReadyForReview, 'synthesis reached → isReadyForReview derived true (gate → hero/ready)')

  // Mid-consultation (no synthesizer yet) — the spine-stage floor lifts above
  // a raw turn fraction but must NOT falsely flip to ready.
  const midMsgs = turns(['moderator', 'planungsrecht', 'bauordnungsrecht', 'sonstige_vorgaben'])
  const mid = computeChamberProgress(midMsgs, state, null)
  ok(t, mid.percent >= 60 && mid.percent < 95, `mid-consultation stage-floored (got ${mid.percent}, in [60,95))`)
  ok(t, !mid.isReadyForReview, 'mid-consultation NOT ready (no synthesis signal)')

  // Early conversation — moderator only, areas pending. Must stay low.
  const earlyState = { areas: { A: { state: 'PENDING' }, B: { state: 'PENDING' }, C: { state: 'PENDING' } }, facts: [], procedures: [], recommendations: [], roles: [] }
  const early = computeChamberProgress(turns(['moderator']), earlyState as never, null)
  ok(t, early.percent < 60, `early conversation stays low (got ${early.percent})`)
  ok(t, !early.isReadyForReview, 'early conversation NOT ready')
  return t
}

function runLabels(): Tally {
  console.log('\n[smoke-architect] T-02 fact-key labels — no raw-key leak (C8 / Bug 71+81)…')
  const t: Tally = { passed: 0, failed: 0 }
  // Replicates factLabel.ts's humanizer so the gate asserts a REAL label
  // exists (resolved label must differ from the raw-key fallback).
  const titleCaseI = (w: string) =>
    w.length === 0 ? w : w === w.toUpperCase() && w.length <= 4 ? w : w.toLowerCase()[0].toUpperCase() + w.toLowerCase().slice(1)
  const humanizeI = (key: string) =>
    key.split('.').map((seg) => seg.split('_').map(titleCaseI).join(' ')).join(' · ')

  // The real T-02 walk's emitted keys (PDF p.10 Key Data — dotted namespace
  // + flat snake). Every one must resolve to a curated label, not humanizer.
  const T02_KEYS = [
    'bundesland', 'vorhaben.typ', 'vorhaben.nutzung', 'gebaeudeklasse', 'vollgeschosse',
    'wohneinheiten.anzahl', 'wohneinheit.flaeche_m2', 'wohnflaeche_gesamt_m2',
    'okff_oberstes_geschoss_m', 'sonderbau_tatbestand', 'planungsrecht.rechtsgrundlage',
    'planungsrecht.bebauungsplan_status', 'planungsrecht.erhaltungssatzung_moeglich',
    'verfahren.typ', 'architekt.beauftragt', 'architekt.kammer', 'kernteam.architekt_register',
    'kernteam.bestaetigt', 'stellplatz.anzahl_geplant', 'stellplatz.typ',
    'stellplatz.reduktion_moeglich', 'fahrradstellplatz.pflicht', 'geg.pflicht',
  ]
  for (const key of T02_KEYS) {
    const en = factLabel(key, 'en').label
    const de = factLabel(key, 'de').label
    // Neither locale may expose internal-namespace artifacts: the dotted-key
    // humanizer middot (" · ") or a snake_case underscore.
    ok(t, !en.includes(' · ') && !/_/.test(en), `en: "${key}" label has no raw-key artifact ("${en}")`)
    ok(t, !de.includes(' · ') && !/_/.test(de), `de: "${key}" label has no raw-key artifact ("${de}")`)
    // EN must be a real English label — never the German-key humanizer
    // fallback (catches single-segment leaks like "Okff Oberstes Geschoss M").
    ok(t, en !== humanizeI(key), `en: "${key}" → curated English label ("${en}")`)
  }
  // Spot-check the worst offender (internal variable name) + a dotted key.
  ok(t, factLabel('okff_oberstes_geschoss_m', 'en').label === 'Top-floor finished floor level',
    'okff_oberstes_geschoss_m → "Top-floor finished floor level" (was "Okff Oberstes Geschoss M")')
  ok(t, factLabel('geg.pflicht', 'en').label === 'GEG requirement',
    'geg.pflicht → "GEG requirement" (was "Geg · Pflicht")')
  return t
}

function runProcedure(): Tally {
  console.log('\n[smoke-architect] procedure qualifier + verfahren_typ (C9 / Bug 79+73+80)…')
  const t: Tally = { passed: 0, failed: 0 }
  const base = {
    intent: 'neubau', bundesland: 'hamburg',
    eingriff_tragende_teile: false, eingriff_aussenhuelle: false,
    denkmalschutz: false, ensembleschutz: false,
  } as never

  // Bug 79/73 — honor the persona's simplified conclusion (§ 61 HBauO) with
  // CALCULATED confidence (PDF was "regulär" + ASSUMED).
  const simp = resolveProcedure({ ...(base as object), verfahren_indikation: 'Vereinfachtes Baugenehmigungsverfahren § 61 HBauO' } as never)
  ok(t, simp.kind === 'vereinfachtes', `Hamburg T-02: procedure kind 'vereinfachtes' (got '${simp.kind}')`)
  ok(t, /§\s*61\s+HBauO/.test(simp.citation), `Hamburg T-02: cites § 61 HBauO (got '${simp.citation}')`)
  ok(t, simp.confidence === 'CALCULATED', `Hamburg T-02: confidence CALCULATED (got '${simp.confidence}')`)

  // Regression — no indikation → honest generic stub (standard + ASSUMED).
  // (base.intent === 'neubau' — proves the umnutzung branch below does NOT
  //  bleed into other intents.)
  const generic = resolveProcedure(base)
  ok(t, generic.kind === 'standard' && generic.confidence === 'ASSUMED',
    `stub w/o indikation → standard + ASSUMED (got '${generic.kind}'/'${generic.confidence}')`)

  // v1.0.30 Bug 90/91/92 — T-04 use-conversion (Sachsen stub) is a non-Sonderbau
  // permit case: CALCULATED simplified procedure (converges with the web
  // baseline deriveBaselineProcedure umnutzung → loc.procedure.simplified),
  // NOT the generic "standard + (regulär) + ASSUMED" the PDF previously emitted.
  const umnutz = resolveProcedure({ ...(base as object), bundesland: 'sachsen', intent: 'umnutzung' } as never)
  ok(t, umnutz.kind === 'vereinfachtes', `T-04 umnutzung: kind 'vereinfachtes' (Bug 91, got '${umnutz.kind}')`)
  ok(t, umnutz.confidence === 'CALCULATED', `T-04 umnutzung: confidence CALCULATED (Bug 90, got '${umnutz.confidence}')`)
  ok(t, !/regul[äa]r/.test(umnutz.citation + umnutz.reasoning_de + umnutz.reasoning_en),
    `T-04 umnutzung: no "(regulär)" new-build label (Bug 91)`)

  // Bug 52 regression — verfahrensfrei still honored (T-05 NRW).
  const free = resolveProcedure({ ...(base as object), bundesland: 'nrw', verfahren_indikation: 'verfahrensfrei nach § 62 BauO NRW' } as never)
  ok(t, free.kind === 'verfahrensfrei', `verfahrensfrei still honored (got '${free.kind}')`)

  // Bug 80 — the executive read no longer hardcodes "Gebäudeklasse 1–3" (it
  // contradicted the GK 4 MFH).
  const fx = JSON.parse(readFileSync(join(REPO_ROOT, 'test/fixtures/hamburg-t02-mfh.json'), 'utf-8'))
  for (const lang of ['de', 'en'] as const) {
    const exec = composeExecutiveRead({ project: fx.project, state: fx.project.state, lang })
    const text = exec.paragraphs.join(' ')
    ok(t, !/Geb[äa]udeklasse\s*1[–-]3/.test(text), `exec ${lang}: no "Gebäudeklasse 1–3" contradiction`)
  }
  return t
}

// v1.0.30 — end-to-end T-04 use-conversion fixture (Sachsen, Leipzig). Runs the
// real composers on the live-walk state to prove the sprint's fixes together.
function runSaxonyT04(): Tally {
  console.log('\n[smoke-architect] Sachsen × T-04 use-conversion fixture (v1.0.30)…')
  const t: Tally = { passed: 0, failed: 0 }
  const fx = JSON.parse(
    readFileSync(join(REPO_ROOT, 'test/fixtures/sachsen-t04-leipzig.json'), 'utf-8'),
  )
  const project = fx.project
  const state = fx.project.state

  // Bug 89 — Domain B picks up the substantive building-law topics.
  for (const lang of ['de', 'en'] as const) {
    const b = composeLegalDomains(state, lang, project.bundesland).find(
      (d) => d.key === 'B',
    )
    const labels = (b?.rows ?? []).map((r) => r.label)
    ok(t, labels.includes('TA Lärm'), `T-04 ${lang}: Domain B has TA Lärm (Bug 89)`)
    ok(t, labels.includes('Rettungsweg'), `T-04 ${lang}: Domain B has Rettungsweg (Bug 89)`)
    ok(t, labels.includes('DIN 4109'), `T-04 ${lang}: Domain B has DIN 4109 (Bug 89)`)
    ok(t, labels.includes('Brandschutz'), `T-04 ${lang}: Domain B has Brandschutz (Bug 89)`)
  }

  // Bug 96 — Heritage risk suppressed (denkmalschutz ASSUMED "nicht bekannt").
  const risks = composeRisks({ project, state, limit: 30 }).visible.map(
    (r) => r.entry.id,
  )
  ok(t, !risks.includes('risk-denkmal'), 'T-04: Heritage risk suppressed (Bug 96)')

  // Bug 94/95/103 — deterministic suggestions feed the tab + recs + exec page.
  const picks = pickSmartSuggestions({ project, state, limit: 8 }).map((s) => s.id)
  ok(t, picks.includes('bauvoranfrage-umnutzung'), 'T-04: Bauvoranfrage suggestion floor (Bug 94/95/103)')
  ok(t, picks.includes('schallschutz-umnutzung'), 'T-04: Schallschutz suggestion (Bug 94/95)')
  ok(t, picks.includes('brandschutz-rettungsweg-umnutzung'), 'T-04: Brandschutz/Rettungsweg suggestion')
  ok(t, picks.includes('ta-laerm-umnutzung'), 'T-04: TA Lärm suggestion')

  // Bug 90/91/92 — CALCULATED simplified procedure, converged web ↔ PDF label.
  const decision = resolveProcedure({
    intent: intentFromTemplate(state.templateId),
    bundesland: project.bundesland,
    eingriff_tragende_teile: false,
    eingriff_aussenhuelle: false,
    denkmalschutz: false,
    ensembleschutz: false,
    verfahren_indikation: 'Baugenehmigungsverfahren erforderlich (Nutzungsänderung)',
  } as never)
  ok(t, decision.kind === 'vereinfachtes', `T-04: procedure 'vereinfachtes' (Bug 91, got '${decision.kind}')`)
  ok(t, decision.confidence === 'CALCULATED', `T-04: procedure CALCULATED (Bug 90, got '${decision.confidence}')`)
  const pdfLabel = procedureLabel(decision.kind, 'en')
  const webLabel = deriveBaselineProcedure({ intent: 'umnutzung', bundesland: project.bundesland })[0]?.title_en ?? ''
  ok(
    t,
    /Simplified/.test(pdfLabel) && /Simplified/.test(webLabel),
    `T-04: web ↔ PDF procedure label converge on "Simplified" (Bug 92) — web='${webLabel}' pdf='${pdfLabel}'`,
  )
  ok(t, !/regul/i.test(pdfLabel), 'T-04: procedure label not "(regulär)" (Bug 91)')

  // Bug 102 — ≥2 PENDING domains (A + C) knock the confidence below a clean read.
  const conf = computeConfidence(state)
  ok(t, conf > 25 && conf < 80, `T-04: confidence penalized for 2 PENDING domains (Bug 102, got ${conf})`)

  // Bug 104 — T-04 fact keys resolve to mapped labels (no humanizer leak), incl.
  // the umlaut key the live persona emits.
  ok(t, factLabel('use_change_from', 'en').label === 'Current use', 'T-04: use_change_from → "Current use" (Bug 104)')
  ok(t, factLabel('use_change_to', 'de').label === 'Neue Nutzung', 'T-04: use_change_to → "Neue Nutzung" (Bug 104)')
  ok(t, factLabel('ta_laerm_gutachten_erforderlich', 'en').label === 'TA Lärm assessment required', 'T-04: ta_laerm_gutachten_erforderlich mapped (Bug 104)')
  ok(t, factLabel('nettogrundfläche_m2', 'de').label === 'Nettogrundfläche', 'T-04: nettogrundfläche_m2 (ä) → "Nettogrundfläche" (Bug 104)')
  ok(t, factLabel('rettungsweg_zweiter', 'en').label === 'Second escape route', 'T-04: rettungsweg_zweiter mapped (Bug 104)')
  return t
}

// v1.0.31 — PDF vertical-slice demo cells. Pure-logic gates for the 3
// hardened cells (T-01 Bayern München / T-05 NRW Köln / T-03 Hessen
// Frankfurt): the procedure resolves CALCULATED with the correct state §
// (Check 2), no Bayern-leak in non-Bayern procedure text (Check 6), and the
// fact keys carry curated bilingual labels (Check 10). PDF-render assertions
// (typography, sections, no-leak in rendered text) land in smoke-pdf-text.
function procedureCaseFromFixture(file: string): Parameters<typeof resolveProcedure>[0] {
  const { state, bundesland } = loadFixtureState(file)
  const facts = (state.facts ?? []) as Array<{ key: string; value: unknown }>
  const fb = (k: string) => facts.find((f) => f.key === k)?.value === true
  const fs = (k: string) => {
    const v = facts.find((f) => f.key === k)?.value
    return typeof v === 'string' ? v : undefined
  }
  return {
    intent: intentFromTemplate(state.templateId as never),
    bundesland: bundesland as never,
    eingriff_tragende_teile: fb('eingriff_tragende_teile'),
    eingriff_aussenhuelle: fb('eingriff_aussenhuelle'),
    denkmalschutz: fb('denkmalschutz'),
    ensembleschutz: fb('ensembleschutz'),
    aenderung_aeussere_erscheinung: fb('aenderung_aeussere_erscheinung'),
    verfahren_indikation:
      fs('verfahren_indikation') ?? fs('verfahren.typ') ?? fs('verfahren_typ'),
  }
}

function labelsOk(t: Tally, key: string): void {
  const en = factLabel(key, 'en').label
  const de = factLabel(key, 'de').label
  ok(t, !en.includes(' · ') && !/_/.test(en), `label '${key}' en has no raw-key artifact ("${en}")`)
  ok(t, !de.includes(' · ') && !/_/.test(de), `label '${key}' de has no raw-key artifact ("${de}")`)
}

function runBayernT01(): Tally {
  console.log('\n[smoke-architect] Bayern × T-01 EFH-Neubau demo cell (v1.0.31)…')
  const t: Tally = { passed: 0, failed: 0 }
  const d = resolveProcedure(procedureCaseFromFixture('test/fixtures/bayern-t01-muenchen.json'))
  ok(t, d.kind === 'vereinfachtes', `Bayern T-01: kind 'vereinfachtes' (got '${d.kind}')`)
  ok(t, d.confidence === 'CALCULATED', `Bayern T-01: procedure CALCULATED (Check 2, got '${d.confidence}')`)
  ok(t, /BayBO\s+Art\.\s*59/.test(d.citation), `Bayern T-01: cites BayBO Art. 59 (got '${d.citation}')`)
  for (const k of ['wohnflaeche_gesamt_m2', 'klasse', 'denkmalschutz', 'ensembleschutz']) labelsOk(t, k)
  // Check 8 — clean cell (all 3 domains ACTIVE, no PENDING, no hard blocker) is
  // not knocked down by the Bug-102 PENDING penalty.
  const conf = computeConfidence(loadFixtureState('test/fixtures/bayern-t01-muenchen.json').state as never)
  ok(t, conf >= 55 && conf <= 100, `Bayern T-01: confidence reflects clean active domains (Check 8, got ${conf})`)
  return t
}

function runNrwT05Koeln(): Tally {
  console.log('\n[smoke-architect] NRW × T-05 Abbruch (Köln) demo cell (v1.0.31)…')
  const t: Tally = { passed: 0, failed: 0 }
  const d = resolveProcedure(procedureCaseFromFixture('test/fixtures/nrw-t05-koeln.json'))
  ok(t, d.kind === 'verfahrensfrei', `NRW T-05 Köln: kind 'verfahrensfrei' (got '${d.kind}')`)
  ok(t, d.confidence === 'CALCULATED', `NRW T-05 Köln: procedure CALCULATED (Check 2, got '${d.confidence}')`)
  ok(t, /§\s*62\s+BauO\s+NRW/.test(d.citation), `NRW T-05 Köln: cites § 62 BauO NRW (got '${d.citation}')`)
  // C6 — demolition suggestions floor so the Executive page renders (Bug 103 for
  // abbruch: empty state.recommendations + no demolition pick -> 11 pp).
  const fx = JSON.parse(readFileSync(join(REPO_ROOT, 'test/fixtures/nrw-t05-koeln.json'), 'utf-8'))
  const picks = pickSmartSuggestions({ project: fx.project, state: fx.project.state, limit: 8 }).map((s) => s.id)
  ok(t, picks.includes('schadstoffgutachten-abbruch'), 'NRW T-05 Köln: demolition suggestions floor present (exec page, Bug 103)')
  const conf = computeConfidence(loadFixtureState('test/fixtures/nrw-t05-koeln.json').state as never)
  ok(t, conf >= 55 && conf <= 100, `NRW T-05 Köln: confidence reflects clean active domains (Check 8, got ${conf})`)
  return t
}

function runHessenT03(): Tally {
  console.log('\n[smoke-architect] Hessen × T-03 Sanierung demo cell (v1.0.31)…')
  const t: Tally = { passed: 0, failed: 0 }
  const d = resolveProcedure(procedureCaseFromFixture('test/fixtures/hessen-t03-frankfurt.json'))
  ok(t, d.kind === 'vereinfachtes', `Hessen T-03: kind 'vereinfachtes' (got '${d.kind}')`)
  ok(t, d.confidence === 'CALCULATED', `Hessen T-03: procedure CALCULATED (Check 2, got '${d.confidence}')`)
  ok(t, /§\s*65\s+HBO/.test(d.citation), `Hessen T-03: cites § 65 HBO (got '${d.citation}')`)
  ok(
    t,
    !/BayBO|München|Schwabing|BLfD/.test(`${d.citation}${d.reasoning_de}${d.reasoning_en}`),
    'Hessen T-03: no Bayern-leak in procedure text (Check 6)',
  )
  for (const k of [
    'fassadenflaeche_m2', 'klasse', 'energiestandard',
    'eingriff_tragende_teile', 'eingriff_aussenhuelle', 'denkmalschutz', 'ensembleschutz',
  ]) labelsOk(t, k)
  // T-03 risk rows — GEG-Sanierungspflicht fires (envelope intervention), heritage
  // risk suppressed (denkmalschutz=false). Mirrors the v1.0.30 T-04 risk gating.
  const fx = JSON.parse(readFileSync(join(REPO_ROOT, 'test/fixtures/hessen-t03-frankfurt.json'), 'utf-8'))
  const riskIds = composeRisks({ project: fx.project, state: fx.project.state, limit: 30 }).visible.map((r) => r.entry.id)
  ok(t, riskIds.includes('risk-geg'), 'Hessen T-03: GEG-Sanierungspflicht risk present (risk-geg)')
  ok(t, !riskIds.includes('risk-denkmal'), 'Hessen T-03: no heritage risk (denkmalschutz=false, Check)')
  // Check 8 — clean cell not knocked down by the PENDING penalty.
  const conf = computeConfidence(fx.project.state as never)
  ok(t, conf >= 55 && conf <= 100, `Hessen T-03: confidence reflects clean active domains (Check 8, got ${conf})`)
  return t
}

// v1.0.31 C7 — web ↔ PDF Section 05 convergence (Check 7). The web AT A GLANCE
// shows useResolvedProcedures(project,state) (= the pure resolveProcedures); the
// PDF Section 05 shows resolveProcedure(...).kind. Assert both surfaces reach the
// SAME procedure verdict for each demo cell (mirrors the v1.0.30 T-04 cross-
// surface assertion). Compares the verdict CLASS, not the exact label string
// (web shows the persona title / baseline pack, PDF shows the localized kind
// label — both must classify identically).
function verdictKey(label: string): string {
  const s = label.toLowerCase()
  if (/verfahrensfrei|permit-free|genehmigungsfrei/.test(s)) return 'permit-free'
  if (/vereinfacht|simplified/.test(s)) return 'simplified'
  if (/regul|standard/.test(s)) return 'regular'
  if (/voranfrage|pre-decision|deferred|zurückgestellt/.test(s)) return 'deferred'
  return `other(${s.slice(0, 24)})`
}

function runConvergence(): Tally {
  console.log('\n[smoke-architect] web ↔ PDF Section 05 convergence — demo cells (v1.0.31 C7)…')
  const t: Tally = { passed: 0, failed: 0 }
  for (const file of [
    'test/fixtures/bayern-t01-muenchen.json',
    'test/fixtures/nrw-t05-koeln.json',
    'test/fixtures/hessen-t03-frankfurt.json',
  ]) {
    const fx = JSON.parse(readFileSync(join(REPO_ROOT, file), 'utf-8'))
    const web = resolveProcedures(fx.project, fx.project.state)
    const primary =
      web.procedures.find((p) => p.status === 'erforderlich') ?? web.procedures[0]
    const pdf = resolveProcedure(procedureCaseFromFixture(file))
    const name = file.split('/').pop()
    for (const lang of ['de', 'en'] as const) {
      const webLabel = (lang === 'en' ? primary?.title_en : primary?.title_de) ?? ''
      const pdfLabel = procedureLabel(pdf.kind, lang)
      ok(
        t,
        verdictKey(webLabel) === verdictKey(pdfLabel),
        `${name} ${lang}: web↔PDF Section 05 verdict converge — web '${webLabel}'→${verdictKey(webLabel)} · pdf '${pdfLabel}'→${verdictKey(pdfLabel)}`,
      )
    }
  }
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
    runSuggestions(),
    runProgress(),
    runLabels(),
    runProcedure(),
    runSaxonyT04(),
    runBayernT01(),
    runNrwT05Koeln(),
    runHessenT03(),
    runConvergence(),
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
