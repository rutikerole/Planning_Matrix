#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// Phase 10.1 — Citation regression smoke walk
//
// Two modes:
//
//   STATIC (default, no env required):
//     • Asserts every per-template tail file (T-01..T-08) contains
//       both TYPISCHE KORREKTE ZITATE and VERBOTENE ZITATE blocks.
//     • Asserts bayern.ts has the BUNDESLAND-DISZIPLIN block and no
//       "Anlage 1 BayBO" outside the explicit ✗ marker line.
//     • Asserts personaBehaviour.ts has the ZITATE-DISZIPLIN rule.
//     • Validates the lint logic against curated good/bad sample texts
//       (positive: legitimate StPlS Anlage 1 reference; negative:
//       smoke-walk failure verbatim).
//     • Exits 0 (green) / 1 (red).
//
//   LIVE (--live flag, env vars required):
//     • Calls the deployed chat-turn Edge Function for each seed
//       case, captures the first-turn response, and checks
//       (a) no forbidden patterns appear, (b) every expected citation
//       appears.
//     • Required env: SMOKE_SUPABASE_URL, SMOKE_SUPABASE_ANON_KEY,
//       SMOKE_TEST_JWT, SMOKE_T07_PROJECT_ID, SMOKE_T03_PROJECT_ID
//       (set up by the operator one-time; the projects must already
//       exist with templateId T-07 / T-03 + the right addresses).
//     • Without env, --live exits 2 (skipped) so CI can run the
//       static gate everywhere and the live gate only in a workflow
//       that has the secrets.
//
// Run:
//   node scripts/smokeWalk.mjs              # static only
//   node scripts/smokeWalk.mjs --live       # static + live
// ───────────────────────────────────────────────────────────────────────

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { computeBayernSha, EXPECTED_BAYERN_SHA } from './lib/bayernSha.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')

// ── Forbidden patterns (mirror of citationLint.ts) ─────────────────────
// Keep this list in sync with supabase/functions/chat-turn/citationLint.ts
// FORBIDDEN_PATTERNS. Drift between the two is itself a bug — the
// static gate below counts entries.
//
// Layer A (5 rules, no homeBundesland) — always run.
// Layer B (16 rules, each with homeBundesland) — skip when active.
const FORBIDDEN_PATTERNS = [
  // Layer A — structural mistakes, Bundesland-independent
  { name: 'anlage_1_baybo', regex: /Anlage\s+1\s+BayBO/gi, severity: 'error' },
  { name: 'annex_1_baybo', regex: /Annex\s+1\s+BayBO/gi, severity: 'error' },
  {
    name: 'paragraph_baybo',
    regex: /§\s*\d+(?:\s*Abs\.\s*\d+)?(?:\s*Nr\.\s*\d+\w?)?\s*BayBO/g,
    severity: 'error',
  },
  { name: 'mbo_warning', regex: /Musterbauordnung|\bMBO\b/g, severity: 'warning' },
  {
    name: 'placeholder_warning',
    regex: /relevante\s+(Bauordnung|Vorschrift)|einschl[äa]gige\s+(Bauordnung|Vorschrift)/gi,
    severity: 'warning',
  },
  // Layer B — per-Bundesland firewall (16 entries)
  {
    name: 'baybo',
    regex: /\bBayBO\b|\bBayerische\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'bayern',
  },
  {
    name: 'lbo_bw',
    regex: /\bLBO[\s-]+BW\b|\bLandesbauordnung\s+Baden[\s-]?W[üu]rttemberg\b/gi,
    severity: 'error',
    homeBundesland: 'bw',
  },
  {
    name: 'bauo_nrw',
    regex: /\bBauO\s+NRW\b|\bBauordnung\s+Nordrhein[\s-]?Westfalen\b/gi,
    severity: 'error',
    homeBundesland: 'nrw',
  },
  {
    name: 'hbo',
    regex: /\bHBO\b|\bHessische\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'hessen',
  },
  {
    name: 'nbauo',
    regex: /\bNBauO\b|\bNieders[äa]chsische\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'niedersachsen',
  },
  {
    name: 'saechsbo',
    regex: /\bS[äa]chsBO\b|\bS[äa]chsische\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'sachsen',
  },
  {
    name: 'lbauo_rlp',
    regex: /\bLBauO\s+RLP\b|\bLandesbauordnung\s+Rheinland[\s-]?Pfalz\b/gi,
    severity: 'error',
    homeBundesland: 'rlp',
  },
  {
    name: 'lbo_sh',
    regex: /\bLBO\s+SH\b|\bLandesbauordnung\s+Schleswig[\s-]?Holstein\b/gi,
    severity: 'error',
    homeBundesland: 'sh',
  },
  {
    name: 'lbo_mv',
    regex: /\bLBO\s+MV\b|\bLandesbauordnung\s+Mecklenburg[\s-]?Vorpommern\b/gi,
    severity: 'error',
    homeBundesland: 'mv',
  },
  {
    name: 'bremlbo',
    regex: /\bBremLBO\b|\bBremische\s+Landesbauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'bremen',
  },
  {
    name: 'hbauo',
    regex: /\bHBauO\b|\bHamburgische\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'hamburg',
  },
  {
    name: 'lbo_saarland',
    regex: /\bLBO\s+Saarland\b|\bLandesbauordnung\s+(des\s+)?Saarland(es)?\b/gi,
    severity: 'error',
    homeBundesland: 'saarland',
  },
  {
    name: 'thuerbo',
    regex: /\bTh[üu]rBO\b|\bTh[üu]ringer\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'thueringen',
  },
  {
    name: 'bauo_lsa',
    regex: /\bBauO\s+LSA\b|\bBauordnung\s+Sachsen[\s-]?Anhalt\b/gi,
    severity: 'error',
    homeBundesland: 'sachsen-anhalt',
  },
  {
    name: 'bbgbo',
    regex: /\bBbgBO\b|\bBrandenburgische\s+Bauordnung\b|\bBauordnung\s+Brandenburg\b/gi,
    severity: 'error',
    homeBundesland: 'brandenburg',
  },
  {
    name: 'bauo_bln',
    regex: /\bBauO\s+Bln\b|\bBauordnung\s+(f[üu]r\s+)?Berlin\b|\bBerliner\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'berlin',
  },
]

// ── Seed test cases ─────────────────────────────────────────────────────
const SEED_CASES = [
  {
    name: 'T-07 Anbau wintergarten',
    template: 'T-07',
    address: 'Türkenstr. 52, 80799 München',
    userMessage: 'Ich möchte einen 4×4×3 m Wintergarten an der Südseite anbauen.',
    expectedCitations: [/BayBO\s+Art\.\s*57\s*Abs\.\s*1\s*Nr\.\s*1\s*a/i],
    expectedFreeMath: /48\s*m³|4\s*[×x]\s*4\s*[×x]\s*3/,
    forbidMatches: [/Anlage\s+1\s+BayBO/i, /Annex\s+1\s+BayBO/i],
    envProjectIdKey: 'SMOKE_T07_PROJECT_ID',
  },
  {
    name: 'T-03 Sanierung like-for-like',
    template: 'T-03',
    address: 'Schwabinger Tor 1, 80807 München',
    userMessage:
      'Like-for-like Sanierung — Fenster, Bad, Küche. Keine baulichen Eingriffe.',
    expectedCitations: [/BayBO\s+Art\.\s*57\s*Abs\.\s*3\s*Nr\.\s*3/i],
    forbidMatches: [/Anlage\s+1\s+BayBO/i, /Annex\s+1\s+BayBO/i],
    envProjectIdKey: 'SMOKE_T03_PROJECT_ID',
  },
]

// ── Curated lint-validation samples ─────────────────────────────────────
// Drives the second static-mode check: ensures the lint patterns
// catch the real smoke-walk failure verbatim AND ignore legitimate
// StPlS Anlage 1 references.
const LINT_SAMPLES = [
  {
    label: 'smoke-walk T-07 failure (must flag)',
    text:
      'is a project requiring planning permission in Bavaria — the threshold for permit-free works under Annex 1 BayBO is exceeded here',
    expectError: true,
  },
  {
    label: 'smoke-walk T-03 failure (must flag)',
    text: 'This sounds like a permit-free maintenance measure under Annex 1 BayBO',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland NRW (must flag)',
    text: 'Nach BauO NRW § 62 wäre das verfahrensfrei',
    expectError: true,
  },
  {
    label: 'BayBO with § instead of Art. (must flag)',
    text: 'Die Verfahrensfreiheit folgt aus § 57 BayBO',
    expectError: true,
  },
  {
    label: 'StPlS 926 Anlage 1 (legitimate — must NOT flag)',
    text:
      'Stellplatzbedarf nach StPlS 926 Anlage 1 Nr. 1.1: 1 Stellplatz je Wohnung',
    expectError: false,
  },
  {
    label: 'BauGB § 30 (legitimate — must NOT flag)',
    text:
      'Im Geltungsbereich eines qualifizierten Bebauungsplans nach BauGB § 30 Abs. 1',
    expectError: false,
  },
  {
    label: 'Correct Art. 57 Abs. 1 Nr. 1 a (must NOT flag)',
    text:
      'Wintergarten 48 m³ < 75 m³ → verfahrensfrei nach BayBO Art. 57 Abs. 1 Nr. 1 a',
    expectError: false,
  },
  // ── Bundesland firewall — one fixture per non-Bayern LBO/BO ─────────
  // The wrong-Bundesland NRW sample above already covers BauO NRW; the
  // entries below cover the remaining 14 Bundesländer.
  {
    label: 'wrong-Bundesland HBO Hessen (must flag)',
    text: 'Nach HBO § 63 wäre das verfahrensfrei',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland NBauO Niedersachsen (must flag)',
    text: 'Die NBauO behandelt das in einer anderen Logik',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland SächsBO (must flag)',
    text: 'Die SächsBO sieht in § 4 eine abweichende Regelung vor',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland LBauO RLP (must flag)',
    text: 'Nach LBauO RLP § 62 sind Anbauten unter 50 m³ verfahrensfrei',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland LBO SH (must flag)',
    text: 'Die LBO SH wendet hier andere Schwellen an',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland LBO MV (must flag)',
    text: 'In Mecklenburg-Vorpommern greift LBO MV § 60',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland BremLBO (must flag)',
    text: 'BremLBO regelt Stellplätze abweichend',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland HBauO Hamburg (must flag)',
    text: 'Die HBauO § 70 sieht eine Genehmigungsfreistellung vor',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland LBO Saarland (must flag)',
    text: 'LBO Saarland regelt Abstandsflächen mit anderer Formel',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland ThürBO (must flag)',
    text: 'Nach ThürBO § 60 wäre der Anbau verfahrensfrei',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland BauO LSA (must flag)',
    text: 'BauO LSA § 71 wendet eine andere Schwellenwerte-Logik an',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland BbgBO (must flag)',
    text: 'In Brandenburg greift BbgBO Anlage 1 Nr. 5',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland BauO Bln (must flag)',
    text: 'Die Bauordnung Berlin BauO Bln § 62 regelt das anders',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland Hessische Bauordnung long form (must flag)',
    text: 'Nach Hessische Bauordnung § 63 wäre das verfahrensfrei',
    expectError: true,
  },
]

// ── toolInput-shape fixtures ───────────────────────────────────────────
//
// Mirror of citationLint.ts collectModelTexts. Drift between this and
// the source-of-truth is a bug — adding a new model-emitted field in
// citationLint.ts means adding it here too. The tests below catch
// regressions of the §6 audit attack vector A2 (a wrong-Bundesland
// citation buried inside a non-message field).
function* collectModelTexts(input) {
  if (input.message_de) yield { field: 'message_de', text: input.message_de }
  if (input.message_en) yield { field: 'message_en', text: input.message_en }

  for (const r of input.recommendations_delta ?? []) {
    if (r.op !== 'upsert') continue
    if (r.title_de) yield { field: `recommendations_delta[${r.id}].title_de`, text: r.title_de }
    if (r.title_en) yield { field: `recommendations_delta[${r.id}].title_en`, text: r.title_en }
    if (r.detail_de) yield { field: `recommendations_delta[${r.id}].detail_de`, text: r.detail_de }
    if (r.detail_en) yield { field: `recommendations_delta[${r.id}].detail_en`, text: r.detail_en }
  }
  for (const p of input.procedures_delta ?? []) {
    if (p.op !== 'upsert') continue
    if (p.rationale_de) yield { field: `procedures_delta[${p.id}].rationale_de`, text: p.rationale_de }
    if (p.rationale_en) yield { field: `procedures_delta[${p.id}].rationale_en`, text: p.rationale_en }
  }
  for (const d of input.documents_delta ?? []) {
    if (d.op !== 'upsert') continue
    if (d.title_de) yield { field: `documents_delta[${d.id}].title_de`, text: d.title_de }
    if (d.title_en) yield { field: `documents_delta[${d.id}].title_en`, text: d.title_en }
  }
  for (const f of input.extracted_facts ?? []) {
    if (f.evidence) yield { field: `extracted_facts[${f.key}].evidence`, text: f.evidence }
  }
}

// Per-Bundesland switch fixtures — Phase 11 commit 2.
// For each top state (NRW / BW / Niedersachsen / Hessen) the lint must
// allow the state's own LBO citations (homeBundesland match filters the
// pattern out) and still reject citations to other states' LBOs. Bayern
// regression checks confirm the home state still doesn't self-flag.
const BUNDESLAND_SWITCH_FIXTURES = [
  // ── NRW
  {
    label: 'active=nrw, "§ 5 BauO NRW" — must NOT flag (own state)',
    activeBundesland: 'nrw',
    text: 'Die Abstandsflächen richten sich nach § 5 BauO NRW.',
    expectFlag: false,
  },
  {
    label: 'active=nrw, "BayBO Art. 57" — must flag (wrong Bundesland)',
    activeBundesland: 'nrw',
    text: 'Ein Vergleich mit BayBO Art. 57 wäre hier irreführend.',
    expectFlag: true,
  },
  {
    label: 'active=nrw, "Anlage 1 BayBO" — must flag (Layer-A always)',
    activeBundesland: 'nrw',
    text: 'Anlage 1 BayBO ist hier ohnehin nicht einschlägig.',
    expectFlag: true,
  },
  // ── BW
  {
    label: 'active=bw, "§ 5 LBO BW" — must NOT flag (own state)',
    activeBundesland: 'bw',
    text: 'Abstandsflächen nach § 5 LBO BW.',
    expectFlag: false,
  },
  {
    label: 'active=bw, "BauO NRW" — must flag (wrong Bundesland)',
    activeBundesland: 'bw',
    text: 'Die BauO NRW kennt eine andere Schwellenlogik.',
    expectFlag: true,
  },
  // ── Niedersachsen
  {
    label: 'active=niedersachsen, "§ 5 NBauO" — must NOT flag (own state)',
    activeBundesland: 'niedersachsen',
    text: 'Abstandsflächen nach § 5 NBauO.',
    expectFlag: false,
  },
  {
    label: 'active=niedersachsen, "BayBO Art. 6" — must flag',
    activeBundesland: 'niedersachsen',
    text: 'BayBO Art. 6 ist nicht anwendbar.',
    expectFlag: true,
  },
  // ── Hessen
  {
    label: 'active=hessen, "§ 6 HBO" — must NOT flag (own state)',
    activeBundesland: 'hessen',
    text: 'Abstandsflächen nach § 6 HBO.',
    expectFlag: false,
  },
  {
    label: 'active=hessen, "Hessische Bauordnung" — must NOT flag (own state long form)',
    activeBundesland: 'hessen',
    text: 'Die Hessische Bauordnung regelt das in § 6.',
    expectFlag: false,
  },
  {
    label: 'active=hessen, "LBO BW" — must flag (wrong Bundesland)',
    activeBundesland: 'hessen',
    text: 'Im Vergleich zu LBO BW gibt es Abweichungen.',
    expectFlag: true,
  },
  // Phase 12 commit 1 — Hessen content-grade fixtures
  {
    label: 'active=hessen, "§ 67 Abs. 3 HBO" Bauvorlageberechtigung — must NOT flag',
    activeBundesland: 'hessen',
    text: 'Bauvorlageberechtigung nach § 67 Abs. 3 HBO bei Wohngebäuden bis 200 m² Wohnfläche und 2 Wohneinheiten.',
    expectFlag: false,
  },
  {
    label: 'active=hessen, "§ 70 Abs. 4 HBO" 3-Monats-Frist — must NOT flag',
    activeBundesland: 'hessen',
    text: 'Die Bauaufsichtsbehörde entscheidet über den Bauantrag innerhalb von drei Monaten nach § 70 Abs. 4 HBO.',
    expectFlag: false,
  },
  {
    label: 'active=hessen, "§ 74 Abs. 7 HBO" Geltungsdauer — must NOT flag',
    activeBundesland: 'hessen',
    text: 'Die Baugenehmigung erlischt nach § 74 Abs. 7 HBO grundsätzlich nach drei Jahren.',
    expectFlag: false,
  },
  {
    label: 'active=hessen, Phase-11-stub "wrong" claim "§ 78 HBO Genehmigungsfreistellung" — must NOT flag (Layer-A doesnt fire); semantic correctness checked in review doc',
    activeBundesland: 'hessen',
    // Note: this would have been a wrong claim in the Phase 11 stub
    // (§ 78 is Fliegende Bauten, not Genehmigungsfreistellung). The
    // citation lint catches WRONG-BUNDESLAND citations, not WRONG-§-
    // CONTENT claims. Semantic correctness is a review-doc concern;
    // the lint is a Bundesland firewall, not a paragraph oracle.
    // This fixture confirms the lint does NOT over-fire on a
    // Hessen project's HBO §-citation regardless of whether the §-
    // body claim is right.
    text: '§ 78 HBO regelt Fliegende Bauten.',
    expectFlag: false,
  },
  // ── Bayern regressions
  {
    label: 'active=bayern, "Art. 57 BayBO" — must NOT flag (own state)',
    activeBundesland: 'bayern',
    text: 'Verfahrensfreiheit nach BayBO Art. 57 Abs. 1 Nr. 1 a.',
    expectFlag: false,
  },
  {
    label: 'active=bayern, "BauO NRW" — must STILL flag (wrong Bundesland)',
    activeBundesland: 'bayern',
    text: 'Im Gegensatz zu BauO NRW regelt das BayBO direkt.',
    expectFlag: true,
  },
  {
    label: 'active=bayern, "§ 57 BayBO" — must STILL flag (Layer-A § vs Art.)',
    activeBundesland: 'bayern',
    text: 'Die Verfahrensfreiheit folgt aus § 57 BayBO.',
    expectFlag: true,
  },
]

// Deep-fixture suite. The first entry is the audit's acceptance test
// — an LBO BW (Baden-Württemberg) citation buried inside a
// recommendations_delta.detail_de. Pre-firewall, this would have
// shipped to the result page silently.
const TOOL_INPUT_FIXTURES = [
  {
    label: 'LBO BW in recommendations_delta.detail_de (must flag, error)',
    input: {
      message_de: 'Wir prüfen den Vorgang.',
      message_en: 'We are reviewing the matter.',
      recommendations_delta: [
        {
          op: 'upsert',
          id: 'rec-bw',
          title_de: 'Verfahrensfreiheit klären',
          detail_de:
            'Im Zweifel orientieren Sie sich an § 5 LBO BW — die Schwelle ist dort 30 m³.',
        },
      ],
    },
    expectViolation: true,
    expectSeverity: 'error',
    expectField: 'recommendations_delta[rec-bw].detail_de',
  },
  {
    label: 'HBauO Hamburg in procedures_delta.rationale_de (must flag, error)',
    input: {
      message_de: 'Test.',
      message_en: 'Test.',
      procedures_delta: [
        {
          op: 'upsert',
          id: 'proc-hh',
          rationale_de: 'Vergleich mit HBauO § 70 zeigt eine andere Schwellenlogik.',
        },
      ],
    },
    expectViolation: true,
    expectSeverity: 'error',
  },
  {
    label: 'BauO Bln in documents_delta.title_de (must flag, error)',
    input: {
      message_de: 'Test.',
      message_en: 'Test.',
      documents_delta: [
        {
          op: 'upsert',
          id: 'doc-bln',
          title_de: 'Vergleichsdokument zur Bauordnung Berlin',
        },
      ],
    },
    expectViolation: true,
    expectSeverity: 'error',
  },
  {
    label: 'SächsBO in extracted_facts.evidence (must flag, error)',
    input: {
      message_de: 'Test.',
      message_en: 'Test.',
      extracted_facts: [
        {
          key: 'fact.foo',
          value: 'bar',
          source: 'LEGAL',
          quality: 'CALCULATED',
          evidence: 'Verweis auf SächsBO § 4',
        },
      ],
    },
    expectViolation: true,
    expectSeverity: 'error',
  },
  {
    label: 'remove-op recommendation_delta with bad text in id (must NOT flag)',
    input: {
      message_de: 'Wir entfernen die Empfehlung.',
      message_en: 'Removing the recommendation.',
      recommendations_delta: [{ op: 'remove', id: 'rec-old' }],
    },
    expectViolation: false,
  },
  {
    label: 'clean toolInput with Art. 57 BayBO across multiple fields (must NOT flag)',
    input: {
      message_de:
        'Verfahrensfrei nach BayBO Art. 57 Abs. 1 Nr. 1 a (Anbau ≤ 75 m³).',
      message_en:
        'Permit-free under BayBO Art. 57 Abs. 1 Nr. 1 a (extension ≤ 75 m³).',
      recommendations_delta: [
        {
          op: 'upsert',
          id: 'rec-clean',
          title_de: 'Lageplan beauftragen',
          detail_de: 'Beim ADBV München eine Vermessung beantragen.',
        },
      ],
    },
    expectViolation: false,
  },
]

// ── Static gate ────────────────────────────────────────────────────────

async function readFileText(relPath) {
  const abs = join(REPO_ROOT, relPath)
  return await readFile(abs, 'utf8')
}

function lintText(text, activeBundesland = null) {
  const violations = []
  for (const { name, regex, severity, homeBundesland } of FORBIDDEN_PATTERNS) {
    if (homeBundesland && homeBundesland === activeBundesland) continue
    regex.lastIndex = 0
    let m
    while ((m = regex.exec(text)) !== null) {
      violations.push({ name, match: m[0], severity, index: m.index })
      if (m.index === regex.lastIndex) regex.lastIndex += 1
    }
  }
  return violations
}

// ── Bayern byte-for-byte gate ──────────────────────────────────────────
// Single source of truth: scripts/lib/bayernSha.mjs. Same module backs
// the standalone `node scripts/verify-bayern-sha.mjs` debug CLI, so
// the two paths cannot drift.
async function runBayernShaGate() {
  const { sha, length } = await computeBayernSha()
  return [
    {
      ok: sha === EXPECTED_BAYERN_SHA,
      msg: `Bayern prefix SHA mismatch.\n` +
        `  expected: ${EXPECTED_BAYERN_SHA}\n` +
        `  actual:   ${sha}\n` +
        `  length:   ${length}\n` +
        `  → If Bayern content was edited intentionally, update EXPECTED_BAYERN_SHA in scripts/lib/bayernSha.mjs and call it out in the commit message.`,
    },
  ]
}

function lintToolInput(input, activeBundesland = null) {
  const violations = []
  for (const { field, text } of collectModelTexts(input)) {
    for (const v of lintText(text, activeBundesland)) {
      violations.push({ ...v, field })
    }
  }
  return violations
}

function failures(label, conditions) {
  // conditions: array of { ok: bool, msg: string }
  const fails = conditions.filter((c) => !c.ok).map((c) => c.msg)
  return { label, ok: fails.length === 0, fails }
}

async function runStaticGate() {
  const results = []

  // 1. Each template T-01..T-08 has both required blocks.
  const templates = ['t01-neubau-efh', 't02-neubau-mfh', 't03-sanierung',
    't04-umnutzung', 't05-abbruch', 't06-aufstockung', 't07-anbau',
    't08-sonstiges']
  for (const t of templates) {
    const path = `src/legal/templates/${t}.ts`
    const text = await readFileText(path)
    results.push(failures(`${t}: required blocks`, [
      {
        ok: /TYPISCHE KORREKTE ZITATE/.test(text),
        msg: 'missing "TYPISCHE KORREKTE ZITATE" block',
      },
      {
        ok: /VERBOTENE ZITATE/.test(text),
        msg: 'missing "VERBOTENE ZITATE" block',
      },
    ]))
  }

  // 2. bayern.ts has BUNDESLAND-DISZIPLIN and no rogue Anlage 1 BayBO.
  // Allow exactly two known mentions: one ✗ negative example, one
  // explicit "niemals 'Anlage 1 BayBO'" disziplin reminder.
  const bayernText = await readFileText(
    'src/legal/bayern.ts',
  )
  const bayernAnlageMatches = (bayernText.match(/Anlage\s+1\s+BayBO/gi) ?? [])
  results.push(failures('bayern.ts: structure', [
    {
      ok: /BUNDESLAND-DISZIPLIN: BAYERN/.test(bayernText),
      msg: 'missing BUNDESLAND-DISZIPLIN: BAYERN block',
    },
    {
      ok: bayernAnlageMatches.length <= 2,
      msg: `expected ≤ 2 "Anlage 1 BayBO" mentions (✗ marker + niemals reminder); found ${bayernAnlageMatches.length}`,
    },
    {
      ok: /Art\.\s*57\s*BayBO\s+—\s+Verfahrensfreie/.test(bayernText) ||
        /Art\.\s*57\s+BayBO\s*—\s*Verfahrensfreie/.test(bayernText),
      msg: 'expected "Art. 57 BayBO — Verfahrensfreie ..." section header',
    },
  ]))

  // 3. personaBehaviour.ts has ZITATE-DISZIPLIN.
  const personaText = await readFileText(
    'src/legal/personaBehaviour.ts',
  )
  results.push(failures('personaBehaviour.ts: ZITATE-DISZIPLIN', [
    {
      ok: /ZITATE-DISZIPLIN/.test(personaText),
      msg: 'missing ZITATE-DISZIPLIN rule',
    },
    {
      ok: /Lieber kein Zitat als ein falsches/i.test(personaText),
      msg: 'missing "lieber kein Zitat als ein falsches" hedge',
    },
  ]))

  // 4. citationLint.ts has at least 20 forbidden patterns (5 Layer-A
  //    Bayern structural rules + 15 Layer-B Bundesland firewall rules).
  //    Sanity guard against an accidental list-empty or a partial revert.
  const lintModuleSource = await readFileText(
    'supabase/functions/chat-turn/citationLint.ts',
  )
  const patternCount = (lintModuleSource.match(/regex:\s*\//g) ?? []).length
  results.push(failures('citationLint.ts: forbidden patterns present', [
    {
      ok: patternCount >= 21,
      msg: `expected ≥ 21 regex entries in FORBIDDEN_PATTERNS (5 Bayern structural + 16 per-Bundesland firewall); found ${patternCount}`,
    },
  ]))

  // 4b. legalRegistry has all 16 Bundesländer registered (Phase 11
  // commit 3 acceptance). The TypeScript Record<BundeslandCode,
  // StateDelta> type already enforces this at compile time; the
  // string-level check here is a defensive belt-and-braces against
  // the registry file being silently shortened during a refactor.
  const registrySource = await readFileText('src/legal/legalRegistry.ts')
  const ALL_16_STATE_CODES = [
    'bayern', 'nrw', 'bw', 'niedersachsen', 'hessen',
    'sachsen', 'sachsen-anhalt', 'thueringen', 'rlp', 'saarland',
    'sh', 'mv', 'brandenburg', 'berlin', 'hamburg', 'bremen',
  ]
  results.push(failures('legalRegistry: all 16 Bundesländer registered', [
    {
      ok: ALL_16_STATE_CODES.every((code) =>
        new RegExp(`['"]?${code}['"]?\\s*:\\s*\\w+_DELTA`).test(registrySource)
      ),
      msg: `Missing Bundesland registry entries: ${ALL_16_STATE_CODES.filter(
        (code) => !new RegExp(`['"]?${code}['"]?\\s*:\\s*\\w+_DELTA`).test(registrySource)
      ).join(', ')}`,
    },
  ]))

  // 4c. Each of the 11 minimum-stub states must surface a
  // "Vorbereitung" Hinweis in its systemBlock. The persona reads
  // this and gives the user honest "MBO-default, full state content
  // pending" framing instead of fabricating state-specific advice.
  const MINIMUM_STUBS = [
    'sachsen', 'sachsen-anhalt', 'thueringen', 'rlp', 'saarland',
    'sh', 'mv', 'brandenburg', 'berlin', 'hamburg', 'bremen',
  ]
  for (const code of MINIMUM_STUBS) {
    const stubSource = await readFileText(`src/legal/states/${code}.ts`)
    results.push(failures(`minimum stub ${code}: "Vorbereitung" Hinweis present`, [
      {
        ok: /werden in einer späteren\s*\n?\s*Bearbeitungsphase ergänzt|in Vorbereitung/i.test(stubSource),
        msg: `Stub src/legal/states/${code}.ts must surface a "werden in einer späteren Bearbeitungsphase ergänzt" or "in Vorbereitung" Hinweis so the persona doesn't hallucinate state-specific content.`,
      },
      {
        ok: /allowedCitations:\s*\[\s*\]/.test(stubSource),
        msg: `Stub src/legal/states/${code}.ts must keep allowedCitations as an empty array — Phase 14 widens it once content lands.`,
      },
    ]))
  }

  // 5. Lint logic validates against curated samples. The legacy
  // LINT_SAMPLES were authored in a Bayern-only world; Phase 11
  // makes the firewall per-Bundesland, so we explicitly pass
  // 'bayern' as the active state to preserve the original semantics.
  // Per-state samples live in BUNDESLAND_SWITCH_FIXTURES below.
  for (const s of LINT_SAMPLES) {
    const v = lintText(s.text, s.activeBundesland ?? 'bayern')
    const flagged = v.length > 0
    results.push(failures(`lint sample: ${s.label}`, [
      {
        ok: flagged === s.expectError,
        msg: s.expectError
          ? `expected violation but got none on text: "${s.text.slice(0, 80)}…"`
          : `expected no violation but got ${v.length}: ${JSON.stringify(v.map((x) => x.match))}`,
      },
    ]))
  }

  // 6.0 Bayern byte-for-byte gate — Phase 11 invariant.
  // The composed legal-context PREFIX for Bayern must produce the
  // exact same SHA-256 across phases. If this changes, the Anthropic
  // prompt cache is invalidated AND we may have unintended drift in
  // the Bayern persona. Re-baseline the expected hash deliberately
  // when Bayern content is intentionally edited (commit message must
  // call it out).
  results.push(failures('Bayern byte-for-byte SHA gate', await runBayernShaGate()))

  // 6a. Per-Bundesland switch suite — Phase 11 commit 2 acceptance.
  // For each of the four newly-registered top states (NRW, BW, NS, HE),
  // assert that:
  //   - The state's own LBO citations DO NOT flag (homeBundesland match
  //     filters out the pattern).
  //   - Citations to a different Bundesland's LBO STILL flag (firewall
  //     for non-active states stays active).
  //   - Layer-A structural patterns (Anlage 1 BayBO, § N BayBO, MBO)
  //     still fire regardless of active Bundesland.
  for (const sw of BUNDESLAND_SWITCH_FIXTURES) {
    const violations = lintText(sw.text, sw.activeBundesland)
    const flagged = violations.length > 0
    results.push(failures(`bundesland-switch: ${sw.label}`, [
      {
        ok: flagged === sw.expectFlag,
        msg: sw.expectFlag
          ? `expected to flag in active=${sw.activeBundesland} but got none on text: "${sw.text.slice(0, 70)}…"`
          : `expected NO flag in active=${sw.activeBundesland} but got ${violations.length}: ${JSON.stringify(violations.map((v) => v.match))}`,
      },
    ]))
  }

  // 6b. Deep-fixture suite: run the lint over the FULL respond-tool
  // input shape so the new scan surface (recommendations_delta /
  // procedures_delta / documents_delta / extracted_facts.evidence) is
  // exercised by the static gate. The acceptance test for the audit's
  // §6 attack vector A2 — an LBO BW citation buried inside a
  // recommendation detail — lives here. Legacy fixtures default to
  // 'bayern' as the active Bundesland; per-state cases set
  // activeBundesland explicitly.
  for (const f of TOOL_INPUT_FIXTURES) {
    const violations = lintToolInput(f.input, f.activeBundesland ?? 'bayern')
    const flagged = violations.length > 0
    const hasError = violations.some((v) => v.severity === 'error')
    const conditions = [
      {
        ok: flagged === f.expectViolation,
        msg: f.expectViolation
          ? `expected violation in toolInput but got none`
          : `expected no violation but got ${violations.length}: ${JSON.stringify(violations.map((v) => `${v.field}: ${v.match}`))}`,
      },
    ]
    if (f.expectViolation) {
      conditions.push({
        ok: hasError === (f.expectSeverity === 'error'),
        msg: `expected severity=${f.expectSeverity} but got ${hasError ? 'error' : 'warning'}`,
      })
      if (f.expectField) {
        const inField = violations.some((v) => v.field === f.expectField)
        conditions.push({
          ok: inField,
          msg: `expected violation in field=${f.expectField}; got fields=${JSON.stringify(violations.map((v) => v.field))}`,
        })
      }
    }
    results.push(failures(`toolInput fixture: ${f.label}`, conditions))
  }

  return results
}

// ── Live gate (skipped without env) ────────────────────────────────────

async function runLiveGate() {
  const url = process.env.SMOKE_SUPABASE_URL
  const anon = process.env.SMOKE_SUPABASE_ANON_KEY
  const jwt = process.env.SMOKE_TEST_JWT

  if (!url || !anon || !jwt) {
    console.log(
      '[smoke-walk] live mode requested but env not set; skipping. ' +
        'Required: SMOKE_SUPABASE_URL, SMOKE_SUPABASE_ANON_KEY, SMOKE_TEST_JWT, ' +
        'SMOKE_T07_PROJECT_ID, SMOKE_T03_PROJECT_ID',
    )
    return { skipped: true, results: [] }
  }

  const results = []
  for (const c of SEED_CASES) {
    const projectId = process.env[c.envProjectIdKey]
    if (!projectId) {
      results.push(failures(`live ${c.name}: env`, [
        { ok: false, msg: `missing env var ${c.envProjectIdKey}` },
      ]))
      continue
    }

    const body = {
      projectId,
      userMessage: c.userMessage,
      clientRequestId: crypto.randomUUID(),
      locale: 'de',
    }

    let res, data
    try {
      res = await fetch(`${url}/functions/v1/chat-turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anon,
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      })
      data = await res.json()
    } catch (err) {
      results.push(failures(`live ${c.name}: fetch`, [
        { ok: false, msg: `fetch threw: ${err.message ?? err}` },
      ]))
      continue
    }
    if (!res.ok || !data?.ok) {
      results.push(failures(`live ${c.name}: response`, [
        { ok: false, msg: `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}` },
      ]))
      continue
    }
    const messageDe = data.assistantMessage?.content_de ?? ''
    const violations = lintText(messageDe)
    const conditions = [
      {
        ok: violations.length === 0,
        msg: `linter flagged ${violations.length} violation(s): ${violations.map((v) => v.match).join(', ')}`,
      },
    ]
    for (const re of c.expectedCitations) {
      conditions.push({
        ok: re.test(messageDe),
        msg: `expected citation ${re.source} not found in response`,
      })
    }
    for (const re of c.forbidMatches) {
      conditions.push({
        ok: !re.test(messageDe),
        msg: `forbidden phrase ${re.source} appeared in response`,
      })
    }
    if (c.expectedFreeMath) {
      conditions.push({
        ok: c.expectedFreeMath.test(messageDe),
        msg: `expected math indicator ${c.expectedFreeMath.source} not found`,
      })
    }
    results.push(failures(`live ${c.name}`, conditions))
  }

  return { skipped: false, results }
}

// ── Reporter ───────────────────────────────────────────────────────────

function report(label, results) {
  const total = results.length
  const failed = results.filter((r) => !r.ok)
  console.log(`\n[smoke-walk] ${label}: ${total - failed.length}/${total} passed`)
  for (const r of results) {
    const tick = r.ok ? '✓' : '✗'
    console.log(`  ${tick} ${r.label}`)
    for (const f of r.fails) {
      console.log(`      → ${f}`)
    }
  }
  return failed.length === 0
}

// ── Main ───────────────────────────────────────────────────────────────

const liveFlag = process.argv.includes('--live')

const staticResults = await runStaticGate()
const staticOk = report('static gate', staticResults)

let liveOk = true
if (liveFlag) {
  const liveOutcome = await runLiveGate()
  if (!liveOutcome.skipped) {
    liveOk = report('live gate', liveOutcome.results)
  }
}

if (!staticOk || !liveOk) {
  console.log('\n[smoke-walk] FAIL — see violations above.')
  process.exit(1)
}
console.log('\n[smoke-walk] OK')
process.exit(0)
