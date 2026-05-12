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
  // Phase 12 commit 3 — NRW content-grade fixtures
  {
    label: 'active=nrw, "§ 6 BauO NRW" Abstandsflächen — must NOT flag',
    activeBundesland: 'nrw',
    text: 'Die Abstandsflächen richten sich nach § 6 BauO NRW.',
    expectFlag: false,
  },
  {
    label: 'active=nrw, "§ 63 BauO NRW" Genehmigungsfreistellung — must NOT flag',
    activeBundesland: 'nrw',
    text: 'Im qualifizierten B-Plan greift § 63 BauO NRW Genehmigungsfreistellung.',
    expectFlag: false,
  },
  {
    label: 'active=nrw, "§ 64 BauO NRW" vereinfachtes Verfahren — must NOT flag',
    activeBundesland: 'nrw',
    text: 'Das vereinfachte Verfahren nach § 64 BauO NRW ist Regel für Wohngebäude.',
    expectFlag: false,
  },
  {
    label: 'active=nrw, "§ 67 BauO NRW" Bauvorlageberechtigung — must NOT flag',
    activeBundesland: 'nrw',
    text: 'Bauvorlageberechtigung nach § 67 BauO NRW ist zwingend.',
    expectFlag: false,
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
  // Phase 12 commit 4 — BW content-grade fixtures
  {
    label: 'active=bw, "§ 51 LBO Kenntnisgabeverfahren" — must NOT flag (BW-Spezifikum)',
    activeBundesland: 'bw',
    text: 'Das Kenntnisgabeverfahren nach § 51 LBO ist eine BW-spezifische Verfahrensart.',
    expectFlag: false,
  },
  {
    label: 'active=bw, "§ 52 LBO vereinfachtes Verfahren" — must NOT flag',
    activeBundesland: 'bw',
    text: 'Im vereinfachten Verfahren nach § 52 LBO ist der Prüfumfang reduziert.',
    expectFlag: false,
  },
  {
    label: 'active=bw, "§ 58 Abs. 1a LBO Genehmigungsfiktion" — must NOT flag (Novelle 2025)',
    activeBundesland: 'bw',
    text: 'Nach § 58 Abs. 1a LBO greift die Genehmigungsfiktion 3 Monate.',
    expectFlag: false,
  },
  {
    label: 'active=bw, "ANHANG 1 zu § 50 Abs. 1 LBO" — must NOT flag',
    activeBundesland: 'bw',
    text: 'Verfahrensfreie Vorhaben sind im ANHANG 1 zu § 50 Abs. 1 LBO katalogisiert.',
    expectFlag: false,
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
  // Phase 12 commit 2 — Niedersachsen content-grade fixtures
  {
    label: 'active=niedersachsen, "§ 60 NBauO" Verfahrensfreie + Anhang — must NOT flag',
    activeBundesland: 'niedersachsen',
    text: 'Die im Anhang genannten baulichen Anlagen nach § 60 NBauO sind verfahrensfrei.',
    expectFlag: false,
  },
  {
    label: 'active=niedersachsen, "§ 63 NBauO" vereinfachtes Verfahren — must NOT flag',
    activeBundesland: 'niedersachsen',
    text: 'Sofern keine Sonderbauten vorliegen, läuft das Vorhaben über § 63 NBauO.',
    expectFlag: false,
  },
  {
    label: 'active=niedersachsen, "§ 64 NBauO" reguläres Verfahren — must NOT flag',
    activeBundesland: 'niedersachsen',
    text: 'Sonderbauten werden nach § 64 NBauO geprüft.',
    expectFlag: false,
  },
  {
    label: 'active=niedersachsen, "Anhang NBauO" — must NOT flag',
    activeBundesland: 'niedersachsen',
    text: 'Der konkrete Maßnahmenkatalog steht im Anhang NBauO.',
    expectFlag: false,
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

// ── Phase 13 — qualifier-write-gate fixtures ────────────────────────────
//
// Mirror of src/lib/projectStateHelpers.ts gateQualifiersByRole. Drift
// between this JS port and the TS source is a bug — the structural
// drift-check below (drift_qualifierGate) reads the .ts and asserts
// the function still exists and QUALIFIER_GATE_REJECTS is still false.
//
// The gate enforces v1.5 §6.B.01: only role='designer' callers can emit
// DESIGNER+VERIFIED qualifiers. Phase 13 Week 1 = observability mode
// (downgrade-and-log, no rejection). Week 2 will flip to gating mode.
//
// Fixtures cover the four mutation surfaces (extracted_facts, the three
// _delta upserts) plus the pass-through callers (designer, system).

function gateQualifiersByRoleJS(toolInput, callerRole) {
  const events = []
  if (callerRole === 'designer' || callerRole === 'system') return events
  const REASON =
    'DESIGNER+VERIFIED requires role=designer; downgraded to DESIGNER+ASSUMED per v1.5 §6.B.01.'
  for (const f of toolInput.extracted_facts ?? []) {
    if (f.source === 'DESIGNER' && f.quality === 'VERIFIED') {
      events.push({ field: 'extracted_fact', item_id: f.key })
      f.quality = 'ASSUMED'
    }
  }
  for (const r of toolInput.recommendations_delta ?? []) {
    if (r.op !== 'upsert') continue
    if (r.qualifier?.source === 'DESIGNER' && r.qualifier?.quality === 'VERIFIED') {
      events.push({ field: 'recommendation', item_id: r.id })
      r.qualifier.quality = 'ASSUMED'
    }
  }
  for (const p of toolInput.procedures_delta ?? []) {
    if (p.op !== 'upsert') continue
    if (p.source === 'DESIGNER' && p.quality === 'VERIFIED') {
      events.push({ field: 'procedure', item_id: p.id })
      p.quality = 'ASSUMED'
    }
  }
  for (const d of toolInput.documents_delta ?? []) {
    if (d.op !== 'upsert') continue
    if (d.source === 'DESIGNER' && d.quality === 'VERIFIED') {
      events.push({ field: 'document', item_id: d.id })
      d.quality = 'ASSUMED'
    }
  }
  for (const r of toolInput.roles_delta ?? []) {
    if (r.op !== 'upsert') continue
    if (r.source === 'DESIGNER' && r.quality === 'VERIFIED') {
      events.push({ field: 'role', item_id: r.id })
      r.quality = 'ASSUMED'
    }
  }
  return events
}

const QUALIFIER_GATE_FIXTURES = [
  {
    label: 'client + DESIGNER+VERIFIED extracted_fact → 1 downgrade event',
    role: 'client',
    input: {
      extracted_facts: [
        { key: 'site.height', value: 6.8, source: 'DESIGNER', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 1,
    expectFinalQuality: { kind: 'extracted_fact', key: 'site.height', quality: 'ASSUMED' },
  },
  {
    label: 'client + DESIGNER+VERIFIED recommendation upsert → 1 downgrade',
    role: 'client',
    input: {
      recommendations_delta: [
        {
          op: 'upsert',
          id: 'rec-1',
          qualifier: { source: 'DESIGNER', quality: 'VERIFIED' },
        },
      ],
    },
    expectEventCount: 1,
    expectFinalQuality: { kind: 'recommendation', id: 'rec-1', quality: 'ASSUMED' },
  },
  {
    label: 'client + 3-way procedure/document/role upserts → 3 downgrades',
    role: 'client',
    input: {
      procedures_delta: [
        { op: 'upsert', id: 'p-1', source: 'DESIGNER', quality: 'VERIFIED' },
      ],
      documents_delta: [
        { op: 'upsert', id: 'd-1', source: 'DESIGNER', quality: 'VERIFIED' },
      ],
      roles_delta: [
        { op: 'upsert', id: 'r-1', source: 'DESIGNER', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 3,
  },
  {
    label: 'designer caller passes DESIGNER+VERIFIED unchanged',
    role: 'designer',
    input: {
      extracted_facts: [
        { key: 'k', value: 1, source: 'DESIGNER', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 0,
    expectFinalQuality: { kind: 'extracted_fact', key: 'k', quality: 'VERIFIED' },
  },
  {
    label: 'system caller passes DESIGNER+VERIFIED unchanged',
    role: 'system',
    input: {
      extracted_facts: [
        { key: 'k', value: 1, source: 'DESIGNER', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 0,
    expectFinalQuality: { kind: 'extracted_fact', key: 'k', quality: 'VERIFIED' },
  },
  {
    label: 'client + non-DESIGNER source untouched',
    role: 'client',
    input: {
      extracted_facts: [
        { key: 'a', value: 1, source: 'CLIENT', quality: 'VERIFIED' },
        { key: 'b', value: 1, source: 'LEGAL', quality: 'VERIFIED' },
        { key: 'c', value: 1, source: 'AUTHORITY', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 0,
  },
  {
    label: 'client + DESIGNER + non-VERIFIED quality untouched',
    role: 'client',
    input: {
      extracted_facts: [
        { key: 'a', value: 1, source: 'DESIGNER', quality: 'ASSUMED' },
        { key: 'b', value: 1, source: 'DESIGNER', quality: 'CALCULATED' },
        { key: 'c', value: 1, source: 'DESIGNER', quality: 'DECIDED' },
      ],
    },
    expectEventCount: 0,
  },
  {
    label: 'remove ops never inspected',
    role: 'client',
    input: {
      recommendations_delta: [{ op: 'remove', id: 'rec-old' }],
      procedures_delta: [{ op: 'remove', id: 'p-old' }],
      documents_delta: [{ op: 'remove', id: 'd-old' }],
      roles_delta: [{ op: 'remove', id: 'r-old' }],
    },
    expectEventCount: 0,
  },
  {
    label: 'engineer caller behaves like client (downgrade)',
    role: 'engineer',
    input: {
      extracted_facts: [
        { key: 'k', value: 1, source: 'DESIGNER', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 1,
    expectFinalQuality: { kind: 'extracted_fact', key: 'k', quality: 'ASSUMED' },
  },
  {
    label: 'authority caller behaves like client (downgrade)',
    role: 'authority',
    input: {
      extracted_facts: [
        { key: 'k', value: 1, source: 'DESIGNER', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 1,
  },
  {
    label: 'mixed payload: only DESIGNER+VERIFIED entries are gated',
    role: 'client',
    input: {
      extracted_facts: [
        { key: 'gated', value: 1, source: 'DESIGNER', quality: 'VERIFIED' },
        { key: 'free-1', value: 1, source: 'CLIENT', quality: 'VERIFIED' },
        { key: 'free-2', value: 1, source: 'DESIGNER', quality: 'ASSUMED' },
      ],
    },
    expectEventCount: 1,
    expectFinalQuality: { kind: 'extracted_fact', key: 'gated', quality: 'ASSUMED' },
  },
]

function readQualifierFromFixture(input, expect) {
  if (!expect) return null
  if (expect.kind === 'extracted_fact') {
    const f = (input.extracted_facts ?? []).find((x) => x.key === expect.key)
    return f ? f.quality : null
  }
  if (expect.kind === 'recommendation') {
    const r = (input.recommendations_delta ?? []).find(
      (x) => x.op === 'upsert' && x.id === expect.id,
    )
    return r ? r.qualifier?.quality ?? null : null
  }
  return null
}

// ── Layer-C citation allow-list (v1.0.5 / audit B3) ────────────────────
// JS port of citationLint.ts enforceCitationAllowList. Drift between
// this and the source-of-truth would be a bug — the smokeWalk static
// gate runs the JS port, the live chat-turn function runs the TS
// version. Both must agree on which citations are fabricated.
//
// Per-state minimal allow-lists for fixture purposes — keep small +
// representative; the full lists live in src/legal/states/*.ts and
// the JS port doesn't import them (keeps smokeWalk stand-alone). The
// drift gate below grep-asserts the TS version still references the
// allow-list data.
const ALLOW_KEY_SETS = {
  bayern: new Set([
    'baybo|2', 'baybo|6', 'baybo|12', 'baybo|44a', 'baybo|46',
    'baybo|47', 'baybo|57', 'baybo|58', 'baybo|58a', 'baybo|59',
    'baybo|60', 'baybo|61', 'baybo|62', 'baybo|64', 'baybo|65',
    'baybo|66', 'baybo|69', 'baybo|76', 'baybo|81', 'baybo|82c',
    'baydschg|6',
    'stpls 926|1', 'stpls 926|3', 'stpls 926|4',
    'baugb|30', 'baugb|31', 'baugb|34', 'baugb|35', 'baugb|172',
    'baugb|246e', 'baunvo|19', 'geg|8',
  ]),
  hessen: new Set([
    'hbo|2', 'hbo|6', 'hbo|8', 'hbo|52', 'hbo|53', 'hbo|56',
    'hbo|57', 'hbo|63', 'hbo|64', 'hbo|65', 'hbo|66', 'hbo|67',
    'hbo|68', 'hbo|69', 'hbo|70', 'hbo|71', 'hbo|73', 'hbo|74',
    'baugb|30', 'baugb|34', 'baugb|35', 'baunvo|19', 'geg|8',
  ]),
}

const KNOWN_LAW_TOKEN_RE_JS =
  /\b(BayBO|BauGB|BauNVO|BayDSchG|GEG|StPlS\s*\d+|HBO|HBauO|NBauO|BauO\s*NRW|LBO(?:\s+BW|\s+SH|\s+MV|\s+Saarland)?|S[äa]chsBO|LBauO\s+RLP|BremLBO|BauO\s+LSA|BbgBO|BauO\s+Bln|Th[üu]rBO)\b/i
const ANCHOR_NUMBER_RE_JS = /(?:Art\.|§|Anlage)\s*(\d+[a-z]?)/gi

function* extractCitationsJS(text) {
  ANCHOR_NUMBER_RE_JS.lastIndex = 0
  let m
  while ((m = ANCHOR_NUMBER_RE_JS.exec(text)) !== null) {
    const start = Math.max(0, m.index - 40)
    const end = Math.min(text.length, m.index + m[0].length + 40)
    const ctx = text.slice(start, end)
    const lawMatch = ctx.match(KNOWN_LAW_TOKEN_RE_JS)
    if (!lawMatch) continue
    yield {
      law: lawMatch[1].toLowerCase().replace(/\s+/g, ' ').trim(),
      number: m[1].toLowerCase(),
      match: m[0],
    }
    if (m.index === ANCHOR_NUMBER_RE_JS.lastIndex) ANCHOR_NUMBER_RE_JS.lastIndex += 1
  }
}

function fabricatedForTextsJS(texts, allowSet) {
  const seen = new Set()
  const fab = []
  for (const t of texts) {
    if (!t) continue
    for (const cite of extractCitationsJS(t)) {
      const key = `${cite.law}|${cite.number}`
      if (allowSet.has(key)) continue
      if (seen.has(key)) continue
      seen.add(key)
      fab.push(cite)
    }
  }
  return fab
}

function enforceAllowListJS(toolInput, activeBundesland) {
  const allowSet = ALLOW_KEY_SETS[activeBundesland]
  if (!allowSet || allowSet.size === 0) return { events: [], mutated: toolInput }
  const events = []
  for (const r of toolInput.recommendations_delta ?? []) {
    if (r.op !== 'upsert') continue
    const fab = fabricatedForTextsJS([r.title_de, r.title_en, r.detail_de, r.detail_en], allowSet)
    if (fab.length === 0) continue
    events.push({ field: 'recommendation', item_id: r.id, fabricated: fab })
    r.qualifier = { source: 'DESIGNER', quality: 'ASSUMED' }
  }
  for (const p of toolInput.procedures_delta ?? []) {
    if (p.op !== 'upsert') continue
    const fab = fabricatedForTextsJS([p.title_de, p.title_en, p.rationale_de, p.rationale_en], allowSet)
    if (fab.length === 0) continue
    events.push({ field: 'procedure', item_id: p.id, fabricated: fab })
    p.source = 'DESIGNER'
    p.quality = 'ASSUMED'
  }
  for (const f of toolInput.extracted_facts ?? []) {
    const fab = fabricatedForTextsJS([f.evidence], allowSet)
    if (fab.length === 0) continue
    events.push({ field: 'extracted_fact', item_id: f.key, fabricated: fab })
    f.source = 'DESIGNER'
    f.quality = 'ASSUMED'
  }
  return { events, mutated: toolInput }
}

const ALLOW_LIST_FIXTURES = [
  {
    label: "B3 Bayern: 'BayBO Art. 99' (fabricated) → recommendation downgraded",
    activeBundesland: 'bayern',
    input: {
      recommendations_delta: [{
        op: 'upsert', id: 'rec-fab',
        title_de: 'Verfahrensfreiheit prüfen',
        detail_de: 'Verfahrensfreiheit folgt aus BayBO Art. 99 Abs. 3.',
        qualifier: { source: 'LEGAL', quality: 'CALCULATED' },
      }],
    },
    expectEvents: 1,
    expectQualifier: { itemId: 'rec-fab', source: 'DESIGNER', quality: 'ASSUMED' },
  },
  {
    label: "B3 Bayern: 'BayBO Art. 57 Abs. 1 Nr. 1 a' (real) → passes through",
    activeBundesland: 'bayern',
    input: {
      recommendations_delta: [{
        op: 'upsert', id: 'rec-real',
        title_de: 'Anbau-Verfahrensfreiheit',
        detail_de: 'Verfahrensfreiheit nach BayBO Art. 57 Abs. 1 Nr. 1 a.',
        qualifier: { source: 'LEGAL', quality: 'CALCULATED' },
      }],
    },
    expectEvents: 0,
    expectQualifier: { itemId: 'rec-real', source: 'LEGAL', quality: 'CALCULATED' },
  },
  {
    label: "B3 Hessen: '§ 6 HBO' (real) + active=hessen → passes",
    activeBundesland: 'hessen',
    input: {
      procedures_delta: [{
        op: 'upsert', id: 'proc-hbo',
        rationale_de: 'Abstandsflächen nach § 6 HBO einhalten.',
        source: 'LEGAL', quality: 'CALCULATED',
      }],
    },
    expectEvents: 0,
    expectQualifierTopLevel: { itemId: 'proc-hbo', source: 'LEGAL', quality: 'CALCULATED' },
  },
  {
    label: "B3 Cross-state: '§ 6 HBO' + active=bayern → procedure downgraded",
    activeBundesland: 'bayern',
    input: {
      procedures_delta: [{
        op: 'upsert', id: 'proc-cross',
        rationale_de: 'Abstandsflächen nach § 6 HBO.',
        source: 'LEGAL', quality: 'CALCULATED',
      }],
    },
    expectEvents: 1,
    expectQualifierTopLevel: { itemId: 'proc-cross', source: 'DESIGNER', quality: 'ASSUMED' },
  },
  {
    label: 'B3 No-cite path: empty text → no spurious downgrade',
    activeBundesland: 'bayern',
    input: {
      recommendations_delta: [{
        op: 'upsert', id: 'rec-no-cite',
        title_de: 'Lageplan einholen',
        detail_de: 'Den Lageplan beim ÖbVI beauftragen.',
        qualifier: { source: 'LEGAL', quality: 'CALCULATED' },
      }],
    },
    expectEvents: 0,
    expectQualifier: { itemId: 'rec-no-cite', source: 'LEGAL', quality: 'CALCULATED' },
  },
  {
    label: 'B3 Mixed: one real + one fabricated → only the fabricated downgrades',
    activeBundesland: 'bayern',
    input: {
      recommendations_delta: [
        {
          op: 'upsert', id: 'rec-good',
          detail_de: 'Verfahrensfreiheit nach BayBO Art. 57 Abs. 1 Nr. 1 a.',
          qualifier: { source: 'LEGAL', quality: 'CALCULATED' },
        },
        {
          op: 'upsert', id: 'rec-bad',
          detail_de: 'Genehmigungsfreistellung nach BayBO Art. 200.',
          qualifier: { source: 'LEGAL', quality: 'CALCULATED' },
        },
      ],
    },
    expectEvents: 1,
    expectQualifier: { itemId: 'rec-bad', source: 'DESIGNER', quality: 'ASSUMED' },
  },
  {
    label: 'B3 Stub state: active=sachsen → no enforcement (empty allow-list)',
    activeBundesland: 'sachsen',
    input: {
      recommendations_delta: [{
        op: 'upsert', id: 'rec-stub',
        detail_de: 'Anything BayBO Art. 99 stub-state-fine.',
        qualifier: { source: 'LEGAL', quality: 'CALCULATED' },
      }],
    },
    expectEvents: 0,
    expectQualifier: { itemId: 'rec-stub', source: 'LEGAL', quality: 'CALCULATED' },
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

  // 7. Phase 13 — qualifier-write-gate fixtures.
  // Drift check: read projectStateHelpers.ts and assert the gate
  // function exists and the Week 1 observability flag is still false.
  // Then run the JS-port gate over each fixture and assert the event
  // count + post-mutation qualifier matches the expectation.
  const helpersSource = await readFileText('src/lib/projectStateHelpers.ts')
  results.push(failures('phase-13: gate function + rejection flag', [
    {
      ok: /export function gateQualifiersByRole\b/.test(helpersSource),
      msg: 'projectStateHelpers.ts missing gateQualifiersByRole export',
    },
    {
      ok: /export const QUALIFIER_GATE_REJECTS\s*=\s*true\b/.test(helpersSource),
      msg: 'Week 2 invariant: QUALIFIER_GATE_REJECTS must be `true` (rejection mode)',
    },
    {
      ok: /export class QualifierRoleViolationError\b/.test(helpersSource),
      msg: 'Week 2 invariant: QualifierRoleViolationError class must be exported',
    },
    {
      ok: /export type CallerRole\s*=\s*'client' \| 'designer' \| 'engineer' \| 'authority' \| 'system'/.test(helpersSource),
      msg: 'CallerRole type drifted from expected union',
    },
  ]))

  // Phase 13 Week 2 — Edge Function wiring drift checks. The chat-turn
  // entrypoint MUST short-circuit with the qualifier_role_violation
  // envelope before applyToolInputToState runs; the streaming path
  // must close the SSE stream with an error frame in the same case.
  // Without these, the "rejection mode" flip is purely cosmetic.
  const indexSource = await readFileText('supabase/functions/chat-turn/index.ts')
  const streamingSource = await readFileText('supabase/functions/chat-turn/streaming.ts')
  results.push(failures('phase-13 week 2: chat-turn JSON path rejects', [
    {
      ok: /QUALIFIER_GATE_REJECTS/.test(indexSource),
      msg: 'index.ts must reference QUALIFIER_GATE_REJECTS to flip behaviour',
    },
    {
      ok: /code:\s*'qualifier_role_violation'/.test(indexSource),
      msg: 'index.ts must return the qualifier_role_violation error code on rejection',
    },
    {
      ok: /Diese Festlegung erfordert die Freigabe durch eine\/n bauvorlageberechtigte\/n Architekt\/in/.test(indexSource),
      msg: 'index.ts must surface the locked CTA copy verbatim',
    },
  ]))
  results.push(failures('phase-13 week 2: streaming path closes with error frame', [
    {
      ok: /QUALIFIER_GATE_REJECTS/.test(streamingSource),
      msg: 'streaming.ts must reference QUALIFIER_GATE_REJECTS',
    },
    {
      ok: /type:\s*'error'[\s\S]{0,400}qualifier_role_violation/.test(streamingSource),
      msg: 'streaming.ts must emit a type=error SSE frame with code=qualifier_role_violation',
    },
  ]))

  // Phase 13 Week 2 — error-code union drift check. Adding the new
  // code to ChatTurnErrorCode is what allows the SPA's exhaustiveness
  // checks (switch-case error UI rendering) to handle the new case.
  const chatTurnTypesSource = await readFileText('src/types/chatTurn.ts')
  results.push(failures('phase-13 week 2: ChatTurnErrorCode includes qualifier_role_violation', [
    {
      ok: /\|\s*'qualifier_role_violation'/.test(chatTurnTypesSource),
      msg: 'src/types/chatTurn.ts ChatTurnErrorCode must include qualifier_role_violation',
    },
  ]))

  // Phase 13 Week 3 — Edge Functions + RLS drift checks. The
  // share-project + verify-fact functions both depend on env vars
  // (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)
  // and on the 0028_projects_architect_read.sql migration being
  // applied. Pre-build asserts the modules exist, expose the right
  // route handler, and reference the env vars by name.
  const shareProjectSrc = await readFileText('supabase/functions/share-project/index.ts')
  const verifyFactSrc = await readFileText('supabase/functions/verify-fact/index.ts')
  results.push(failures('phase-13 week 3: share-project edge function shape', [
    {
      ok: /Deno\.serve\(/.test(shareProjectSrc),
      msg: 'share-project must expose Deno.serve handler',
    },
    {
      ok: /SUPABASE_SERVICE_ROLE_KEY/.test(shareProjectSrc),
      msg: 'share-project must read SUPABASE_SERVICE_ROLE_KEY (claim path uses service-role bypass)',
    },
    {
      ok: /role\s*!==\s*'designer'|profile\?\.role\s*!==\s*'designer'/.test(shareProjectSrc),
      msg: 'share-project must reject callers whose profiles.role is not designer',
    },
    {
      ok: /'project_member\.accepted'/.test(shareProjectSrc),
      msg: 'share-project must log project_member.accepted to event_log',
    },
  ]))

  // ── v1.0.1 hot-fix drift checks (POST_V1_AUDIT CRIT-1/2/3) ──────────
  // Three CRITICAL findings closed in v1.0.1; the static-source asserts
  // below pin the fix and fail the gate if any of the three is reverted.
  results.push(failures('v1.0.1 CRIT-1: non-owner-cannot-share', [
    {
      ok: /action:\s*'create'/.test(shareProjectSrc),
      msg: 'share-project must support {action:"create"} mode for owner-side invite generation',
    },
    {
      ok: /handleCreate\b[\s\S]{0,2000}owner_id\s*!==\s*userId/.test(shareProjectSrc),
      msg: 'CRIT-1 fix: handleCreate must explicitly compare projects.owner_id against the caller before INSERT',
    },
    {
      ok: /Only the project owner can create architect invites/.test(shareProjectSrc),
      msg: 'CRIT-1 fix: 403 message must surface "Only the project owner can create architect invites"',
    },
  ]))
  results.push(failures('v1.0.1 CRIT-2: accept-rejects-non-designer', [
    {
      ok: /handleAccept\b[\s\S]{0,2000}profile\?\.role\s*!==\s*'designer'/.test(shareProjectSrc),
      msg: 'CRIT-2 pin: handleAccept must check profile.role !== designer before any state mutation',
    },
    {
      ok: /Only profiles with role=designer can claim architect invites/.test(shareProjectSrc),
      msg: 'CRIT-2 pin: 403 message must surface the locked designer-only copy',
    },
  ]))
  results.push(failures('v1.0.1 CRIT-3: accept-rejects-expired-token', [
    {
      ok: /expires_at/.test(shareProjectSrc),
      msg: 'CRIT-3 fix: share-project must read expires_at from the project_members row',
    },
    {
      ok: /new Date\(row\.expires_at\)\.getTime\(\)\s*<\s*Date\.now\(\)/.test(shareProjectSrc),
      msg: 'CRIT-3 fix: handleAccept must reject if the invite has expired (expires_at < now)',
    },
    {
      ok: /Diese Einladung ist abgelaufen/.test(shareProjectSrc),
      msg: 'CRIT-3 fix: expired-invite copy must surface the locked German message',
    },
  ]))
  // ── v1.0.2 hot-fix drift checks (RLS recursion) ────────────────────
  // Pin the SECURITY DEFINER helper functions + replaced policies so any
  // future revert of 0031 fires the daily gate immediately.
  const recursionMig = await readFileText('supabase/migrations/0031_fix_projects_rls_recursion.sql')
  results.push(failures('v1.0.2 CRIT: rls-recursion-fix — helper functions', [
    {
      ok: /create or replace function public\.is_project_owner\(p_project_id uuid\)[\s\S]{0,400}security definer[\s\S]{0,200}set search_path = ''/.test(recursionMig),
      msg: '0031 must declare is_project_owner with security definer + set search_path = \'\'',
    },
    {
      ok: /create or replace function public\.is_accepted_architect\(p_project_id uuid\)[\s\S]{0,400}security definer[\s\S]{0,200}set search_path = ''/.test(recursionMig),
      msg: '0031 must declare is_accepted_architect with security definer + set search_path = \'\'',
    },
    {
      ok: /\bstable\b/.test(recursionMig),
      msg: '0031 helper functions must be marked stable for query-plan optimization',
    },
  ]))
  results.push(failures('v1.0.2 CRIT: rls-recursion-fix — grants', [
    {
      ok: /revoke all on function public\.is_project_owner\(uuid\)\s+from public/.test(recursionMig),
      msg: '0031 must revoke default PUBLIC execute on is_project_owner',
    },
    {
      ok: /revoke all on function public\.is_accepted_architect\(uuid\)\s+from public/.test(recursionMig),
      msg: '0031 must revoke default PUBLIC execute on is_accepted_architect',
    },
    {
      ok: /grant\s+execute on function public\.is_project_owner\(uuid\)\s+to authenticated, anon/.test(recursionMig),
      msg: '0031 must grant execute on is_project_owner to authenticated + anon',
    },
    {
      ok: /grant\s+execute on function public\.is_accepted_architect\(uuid\)\s+to authenticated, anon/.test(recursionMig),
      msg: '0031 must grant execute on is_accepted_architect to authenticated + anon',
    },
  ]))
  results.push(failures('v1.0.2 CRIT: rls-recursion-fix — replaced policies', [
    {
      ok: /drop policy if exists "architect-member can select projects" on public\.projects/.test(recursionMig),
      msg: '0031 must drop the recursive architect-member policy first',
    },
    {
      ok: /using \(\s*public\.is_accepted_architect\(id\)\s*\)/.test(recursionMig),
      msg: '0031 must replace the architect-member USING clause with public.is_accepted_architect(id)',
    },
    {
      ok: /drop policy if exists "members read own membership" on public\.project_members/.test(recursionMig),
      msg: '0031 must drop the recursive project_members policy first',
    },
    {
      ok: /public\.is_project_owner\(project_id\)/.test(recursionMig),
      msg: '0031 must replace the project_members owner subquery with public.is_project_owner(project_id)',
    },
    {
      // Defense-in-depth: the recursive EXISTS subquery patterns from
      // 0026 + 0028 must NOT survive in 0031. If a future refactor
      // re-introduces them, this fixture catches it before deploy.
      ok: !/exists\s*\(\s*select 1\s+from public\.project_members pm\s+where pm\.project_id = projects\.id/.test(recursionMig),
      msg: '0031 must NOT contain the recursive EXISTS subquery from 0028',
    },
  ]))

  // ── v1.0.5 / audit B3: Layer-C citation allow-list runtime ────────
  const citationLintSrc = await readFileText('supabase/functions/chat-turn/citationLint.ts')
  const indexSrcB3 = await readFileText('supabase/functions/chat-turn/index.ts')
  const streamingSrcB3 = await readFileText('supabase/functions/chat-turn/streaming.ts')
  results.push(failures('v1.0.5 B3: enforceCitationAllowList wired into citationLint.ts', [
    {
      ok: /export function enforceCitationAllowList\(/.test(citationLintSrc),
      msg: 'citationLint.ts must export enforceCitationAllowList',
    },
    {
      ok: /resolveStateDelta(?:ForLayerC)?/.test(citationLintSrc),
      msg: 'citationLint.ts must call resolveStateDelta to read allowedCitations per state',
    },
    {
      ok: /ALLOW_KEY_CACHE\s*=\s*new Map/.test(citationLintSrc),
      msg: 'citationLint.ts must memoise the parsed allow-list set per state',
    },
    {
      ok: /citation not in allow-list/.test(citationLintSrc),
      msg: 'reason string must surface "citation not in allow-list"',
    },
  ]))
  results.push(failures('v1.0.5 B3: chat-turn pipeline calls Layer-C', [
    {
      ok: /enforceCitationAllowList\(toolInput,\s*project\.bundesland\)/.test(indexSrcB3),
      msg: 'chat-turn/index.ts must call enforceCitationAllowList after lintCitations',
    },
    {
      ok: /enforceCitationAllowList\(toolInput,\s*args\.bundesland\)/.test(streamingSrcB3),
      msg: 'chat-turn/streaming.ts must call enforceCitationAllowList in the SSE path',
    },
    {
      ok: /'citation\.fabrication'/.test(indexSrcB3) &&
          /'citation\.fabrication'/.test(streamingSrcB3),
      msg: 'both paths must emit citation.fabrication event_log rows',
    },
  ]))
  // Run the JS port against the 7 fixture cases. Verifies the
  // ALGORITHM the production code uses, not just regex shape.
  for (const f of ALLOW_LIST_FIXTURES) {
    const cloned = JSON.parse(JSON.stringify(f.input))
    const { events } = enforceAllowListJS(cloned, f.activeBundesland)
    const conds = [
      {
        ok: events.length === f.expectEvents,
        msg: `expected ${f.expectEvents} event(s); got ${events.length}: ${JSON.stringify(events.map((e) => `${e.field}/${e.item_id}/${e.fabricated.map((x) => x.law + ' ' + x.number).join(',')}`))}`,
      },
    ]
    if (f.expectQualifier) {
      const rec = (cloned.recommendations_delta ?? []).find(
        (r) => r.op === 'upsert' && r.id === f.expectQualifier.itemId,
      )
      conds.push({
        ok: rec?.qualifier?.source === f.expectQualifier.source &&
            rec?.qualifier?.quality === f.expectQualifier.quality,
        msg: `expected rec ${f.expectQualifier.itemId} qualifier=${f.expectQualifier.source}+${f.expectQualifier.quality}; got ${rec?.qualifier?.source}+${rec?.qualifier?.quality}`,
      })
    }
    if (f.expectQualifierTopLevel) {
      const proc = (cloned.procedures_delta ?? []).find(
        (p) => p.op === 'upsert' && p.id === f.expectQualifierTopLevel.itemId,
      )
      conds.push({
        ok: proc?.source === f.expectQualifierTopLevel.source &&
            proc?.quality === f.expectQualifierTopLevel.quality,
        msg: `expected proc ${f.expectQualifierTopLevel.itemId} top-level=${f.expectQualifierTopLevel.source}+${f.expectQualifierTopLevel.quality}; got ${proc?.source}+${proc?.quality}`,
      })
    }
    results.push(failures(`v1.0.5 B3 fixture: ${f.label}`, conds))
  }

  // ── v1.0.4 D2+D3+D6 drift checks (compliance docs + dependabot) ──
  const compliance = await readFileText('docs/COMPLIANCE.md')
  const legalReview = await readFileText('docs/LEGAL_COPY_REVIEW.md')
  const dependabot = await readFileText('.github/dependabot.yml')
  results.push(failures('v1.0.4 D2: docs/COMPLIANCE.md present + sub-processor table', [
    {
      ok: /Anthropic, PBC/.test(compliance) &&
          /Supabase Inc\./.test(compliance) &&
          /Vercel Inc\./.test(compliance) &&
          /Functional Software \(Sentry\)/.test(compliance) &&
          /PostHog Inc\./.test(compliance),
      msg: 'COMPLIANCE.md must enumerate all 5 sub-processors',
    },
    {
      ok: /Sub-processors|Data flows across vendor/.test(compliance),
      msg: 'COMPLIANCE.md must surface sub-processor + data-flow sections',
    },
  ]))
  results.push(failures('v1.0.4 D3: docs/LEGAL_COPY_REVIEW.md present + sign-off ledger', [
    {
      ok: /Sign-off ledger/.test(legalReview),
      msg: 'LEGAL_COPY_REVIEW.md must include a counsel sign-off ledger',
    },
    {
      ok: /Vorl[äa]ufig.*bauvorlageberechtigte/.test(legalReview),
      msg: 'LEGAL_COPY_REVIEW.md must catalogue the §6.B.01 Vorläufig clause verbatim',
    },
  ]))
  results.push(failures('v1.0.4 D6: dependabot.yml present', [
    {
      ok: /package-ecosystem:\s*npm/.test(dependabot),
      msg: '.github/dependabot.yml must register npm ecosystem',
    },
    {
      ok: /package-ecosystem:\s*github-actions/.test(dependabot),
      msg: '.github/dependabot.yml must register github-actions ecosystem',
    },
  ]))

  // ── v1.0.4 C3+C4 drift checks (streaming await + i18n + comment) ──
  const streamingC3 = await readFileText('supabase/functions/chat-turn/streaming.ts')
  const indexC4 = await readFileText('supabase/functions/chat-turn/index.ts')
  const guardSrc = await readFileText('src/features/architect/ArchitectGuard.tsx')
  results.push(failures('v1.0.4 C3: streaming event_log insert wrapped in try/catch', [
    {
      ok: /try \{\s*const \{ error: gateEvtErr \}/.test(streamingC3),
      msg: 'streaming.ts qualifier-gate event_log insert must be wrapped in try/catch (closes POST_V1_AUDIT SERIOUS bare-await)',
    },
  ]))
  results.push(failures('v1.0.4 C4: stale chat-turn comment corrected', [
    {
      ok: !/never rejects/.test(indexC4),
      msg: 'chat-turn/index.ts must not retain the pre-flip "never rejects" comment',
    },
    {
      ok: /REJECTION mode|QUALIFIER_GATE_REJECTS = true/.test(indexC4),
      msg: 'chat-turn/index.ts must reflect the post-flip REJECTION mode',
    },
  ]))
  results.push(failures('v1.0.4 C4: ArchitectGuard German consistency', [
    {
      ok: !/Verifying architect|Back to dashboard|console is for/.test(guardSrc),
      msg: 'ArchitectGuard must not retain English fallback strings',
    },
    {
      ok: /Architekt-Berechtigung wird geprüft/.test(guardSrc),
      msg: 'ArchitectGuard GateLoading must use German "Architekt-Berechtigung wird geprüft"',
    },
    {
      ok: /Zur[üu]ck zum Dashboard/.test(guardSrc),
      msg: 'ArchitectGuard NotAuthorized must use German "Zurück zum Dashboard"',
    },
  ]))

  // ── v1.0.4 A3 drift checks (qualifier_role_violation propagation) ─
  const errorBannerSrc = await readFileText('src/features/chat/components/Chamber/ErrorBanner.tsx')
  const deLocale = JSON.parse(await readFileText('src/locales/de.json'))
  const enLocale = JSON.parse(await readFileText('src/locales/en.json'))
  results.push(failures('v1.0.4 A3: qualifier_role_violation reaches user', [
    {
      ok: /'qualifier_role_violation'/.test(errorBannerSrc),
      msg: 'ErrorBanner KNOWN_ERROR_CODES must include qualifier_role_violation',
    },
    {
      ok: /'forbidden'/.test(errorBannerSrc),
      msg: 'ErrorBanner KNOWN_ERROR_CODES must include forbidden (defense-in-depth)',
    },
    {
      ok: !!deLocale?.chat?.errors?.qualifier_role_violation?.title &&
          !!deLocale?.chat?.errors?.qualifier_role_violation?.body,
      msg: 'de.json must define chat.errors.qualifier_role_violation.{title,body}',
    },
    {
      ok: !!enLocale?.chat?.errors?.qualifier_role_violation?.title &&
          !!enLocale?.chat?.errors?.qualifier_role_violation?.body,
      msg: 'en.json must define chat.errors.qualifier_role_violation.{title,body}',
    },
    {
      // Locked CTA copy must surface verbatim in the DE locale body.
      ok: /bauvorlageberechtigte\/n Architekt\/in/.test(
        deLocale?.chat?.errors?.qualifier_role_violation?.body ?? '',
      ),
      msg: 'de.json qualifier_role_violation.body must surface the locked architect-invite copy',
    },
    {
      ok: !!deLocale?.chat?.errors?.forbidden?.title &&
          !!enLocale?.chat?.errors?.forbidden?.title,
      msg: 'forbidden locale keys must exist in both DE + EN',
    },
  ]))

  // ── v1.0.4 A2 drift checks (13b denominator alarm rewire) ─────────
  const denomMig = await readFileText('supabase/migrations/0032_qualifier_metrics_denominator_fix.sql')
  // Strip SQL line-comments before regex so the explanatory block at
  // the top of the migration (which quotes the old broken predicate)
  // doesn't false-positive on the "must not retain" assertion.
  const denomMigCode = denomMig
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('--'))
    .join('\n')
  const indexEmits = await readFileText('supabase/functions/chat-turn/index.ts')
  const streamingEmits = await readFileText('supabase/functions/chat-turn/streaming.ts')
  results.push(failures('v1.0.4 A2: 13b denominator predicate aligned to event_log CHECK', [
    {
      ok: /source\s*=\s*'chat'\s+and\s+name\s*=\s*'chat\.turn_completed'/i.test(denomMigCode),
      msg: '0032 view must use (source=\'chat\' AND name=\'chat.turn_completed\') for turns_count',
    },
    {
      ok: !/source\s*=\s*'chat-turn'/.test(denomMigCode),
      msg: '0032 must not retain the broken source=\'chat-turn\' predicate from 0029 (in code, not comments)',
    },
  ]))
  results.push(failures('v1.0.4 A2: chat-turn emits chat.turn_completed', [
    {
      ok: /name:\s*'chat\.turn_completed'/.test(indexEmits) &&
          /source:\s*'chat'/.test(indexEmits),
      msg: 'chat-turn/index.ts must emit chat.turn_completed event with source=chat',
    },
    {
      ok: /name:\s*'chat\.turn_completed'/.test(streamingEmits) &&
          /source:\s*'chat'/.test(streamingEmits),
      msg: 'chat-turn/streaming.ts must emit chat.turn_completed event with source=chat',
    },
    {
      ok: /!commitResult\.replayed/.test(indexEmits),
      msg: 'index.ts must skip emit on idempotent replay (don\'t double-count turns)',
    },
  ]))

  // Migration drift — 0030 must declare the column + backfill + index.
  const expiryMig = await readFileText('supabase/migrations/0030_project_members_expiry.sql')
  results.push(failures('v1.0.1 CRIT-3: 0030_project_members_expiry.sql shape', [
    {
      ok: /add column if not exists expires_at\s+timestamptz/i.test(expiryMig),
      msg: '0030 must ADD COLUMN IF NOT EXISTS expires_at timestamptz',
    },
    {
      ok: /default now\(\)\s*\+\s*interval\s+'7 days'/i.test(expiryMig),
      msg: '0030 must use 7-day default for new rows',
    },
    {
      ok: /update public\.project_members[\s\S]{0,400}set expires_at\s*=\s*invited_at\s*\+\s*interval\s+'7 days'/i.test(expiryMig),
      msg: '0030 must backfill pre-existing rows from invited_at + 7 days',
    },
    {
      ok: /create index if not exists project_members_expires_at_idx/i.test(expiryMig),
      msg: '0030 must create the partial index for stale-invite cleanup',
    },
  ]))
  results.push(failures('phase-13 week 3: verify-fact edge function shape', [
    {
      ok: /Deno\.serve\(/.test(verifyFactSrc),
      msg: 'verify-fact must expose Deno.serve handler',
    },
    {
      ok: /SUPABASE_SERVICE_ROLE_KEY/.test(verifyFactSrc),
      msg: 'verify-fact must read SUPABASE_SERVICE_ROLE_KEY (state mutation bypasses RLS after role checks)',
    },
    {
      ok: /role\s*!==\s*'designer'|profile\?\.role\s*!==\s*'designer'/.test(verifyFactSrc),
      msg: 'verify-fact must reject callers whose profiles.role is not designer',
    },
    {
      ok: /accepted_at/.test(verifyFactSrc),
      msg: 'verify-fact must require an accepted project_members row',
    },
    {
      ok: /'qualifier\.verified'/.test(verifyFactSrc),
      msg: 'verify-fact must log qualifier.verified to event_log',
    },
  ]))

  // Phase 13 Week 3 — projects RLS extension migration must exist,
  // and the policy must reference project_members + accepted_at.
  const archReadMig = await readFileText('supabase/migrations/0028_projects_architect_read.sql')
  results.push(failures('phase-13 week 3: 0028_projects_architect_read.sql shape', [
    {
      ok: /project_members\s+pm/.test(archReadMig),
      msg: '0028 must subquery project_members for the architect-read policy',
    },
    {
      ok: /pm\.accepted_at\s+is\s+not\s+null/i.test(archReadMig),
      msg: '0028 must require accepted_at IS NOT NULL (pending invitees should not read)',
    },
  ]))

  // Phase 13 Week 3 — surface-locked CTA copy must appear in the
  // VorlaeufigFooter component verbatim.
  const vorlaeufigSrc = await readFileText('src/features/architect/components/VorlaeufigFooter.tsx')
  // v1.0.10 — the locked copy moved out of the component into the DE
  // locale (result.workspace.preliminaryFooter.body) so EN locale
  // users see the English equivalent. Drift gate now asserts BOTH
  // (a) the component reads from i18n and (b) the DE locale still
  // carries the verbatim locked wording.
  const deLocaleForVorl = await readFileText('src/locales/de.json')
  const enLocaleForVorl = await readFileText('src/locales/en.json')
  results.push(failures('phase-13 week 3: VorlaeufigFooter copy locked', [
    {
      ok: /result\.workspace\.preliminaryFooter\.heading/.test(vorlaeufigSrc),
      msg: 'VorlaeufigFooter must resolve heading via i18n (preliminaryFooter.heading key)',
    },
    {
      ok: /result\.workspace\.preliminaryFooter\.body/.test(vorlaeufigSrc),
      msg: 'VorlaeufigFooter must resolve body via i18n (preliminaryFooter.body key)',
    },
    {
      ok: /bauvorlageberechtigte\/n Architekt\/in noch ausstehend/.test(deLocaleForVorl),
      msg: 'de.json must keep the locked Phase-13 architect copy verbatim',
    },
    {
      ok: /Preliminary\s+—?\s*pending confirmation by a certified architect/.test(enLocaleForVorl) ||
          /Preliminary - pending confirmation by a certified architect/.test(enLocaleForVorl),
      msg: 'en.json must define the analogous English Preliminary footer',
    },
  ]))

  // ── v1.0.4 hot-fix drift check (PROD_READINESS_AUDIT A1 — Impressum DDG) ──
  // Zero literal {{...}} placeholders may remain anywhere under
  // src/features/legal/. The build-time validator
  // (scripts/verify-legal-config.mjs) catches the same regression in
  // the prebuild step; the smokeWalk fixture is the citation-suite
  // mirror so a single smoke:citations command surfaces both the
  // citation-firewall and the legal-config posture.
  const { readdir: smokeReaddir } = await import('node:fs/promises')
  async function* walkLegalSources(dir) {
    const entries = await smokeReaddir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        yield* walkLegalSources(full)
      } else if (e.isFile() && /\.(tsx?|jsx?)$/.test(e.name)) {
        yield full
      }
    }
  }
  const legalLeaks = []
  for await (const file of walkLegalSources(join(REPO_ROOT, 'src/features/legal'))) {
    const text = await readFile(file, 'utf-8')
    // Strip comment-only lines so the audit-blocker documentation in
    // LegalConfigUnavailable.tsx (which names the pattern verbatim
    // for explanation) doesn't false-positive. Render-time leaks
    // would always be in JSX-expression positions, never in comments.
    const stripped = text
      .split('\n')
      .filter((l) => {
        const t = l.trimStart()
        return !(
          t.startsWith('//') ||
          t.startsWith('*') ||
          t.startsWith('/*') ||
          t.startsWith('{/*')
        )
      })
      .join('\n')
    if (/\{\{[A-Z_]+\}\}/.test(stripped)) {
      legalLeaks.push(file.replace(REPO_ROOT + '/', ''))
    }
  }
  results.push(failures('v1.0.4 A1: zero {{PLACEHOLDER}} leaks under src/features/legal/', [
    {
      ok: legalLeaks.length === 0,
      msg: legalLeaks.length === 0
        ? '(no leaks — § 5 DDG posture preserved)'
        : `Literal placeholder leak in ${legalLeaks.length} file(s): ${legalLeaks.join(', ')}`,
    },
  ]))
  // Validator script must exist + be wired into prebuild.
  const verifyLegalCfg = await readFileText('scripts/verify-legal-config.mjs')
  const pkgJson = await readFileText('package.json')
  results.push(failures('v1.0.4 A1: legal-config validator wired into prebuild', [
    {
      ok: /REQUIRED_KEYS\s*=\s*\[/.test(verifyLegalCfg),
      msg: 'verify-legal-config.mjs must declare REQUIRED_KEYS',
    },
    {
      ok: /verify:legal-config/.test(pkgJson),
      msg: 'package.json prebuild must call verify:legal-config',
    },
    {
      ok: /VITE_LEGAL_ANBIETER_NAME/.test(verifyLegalCfg),
      msg: 'validator must require VITE_LEGAL_ANBIETER_NAME',
    },
  ]))
  // v1.0.4 hot-patch — Vercel preview soft-mode. PRs / Dependabot
  // can deploy without the env (runtime banner kicks in); Production
  // stays strict. Without this, every PR preview build fails in ~5s.
  results.push(failures('v1.0.4 A1 hot-patch: Vercel preview soft-mode', [
    {
      ok: /isVercelPreview\s*=\s*process\.env\.VERCEL_ENV\s*===\s*'preview'/.test(verifyLegalCfg),
      msg: 'validator must branch on VERCEL_ENV === \'preview\' for soft-mode',
    },
    {
      ok: /WARN \(Vercel preview soft-mode\)/.test(verifyLegalCfg),
      msg: 'validator must surface a WARN message under preview soft-mode',
    },
    {
      ok: /isVercelPreview && onlyKeyMisses/.test(verifyLegalCfg),
      msg: 'soft-mode must apply ONLY to env-key misses (source leaks always hard-fail)',
    },
    {
      ok: /process\.env\.VERCEL_ENV/.test(verifyLegalCfg) &&
          /\.env\.local/.test(verifyLegalCfg) &&
          /skip the file load when running on Vercel/.test(verifyLegalCfg),
      msg: 'validator must skip .env.local file-load on Vercel (platform env is source of truth)',
    },
  ]))

  // ── v1.0.3 hot-fix drift checks (POST_SMOKE_TEST_INVESTIGATION — wire VorlaeufigFooter into result tabs) ──
  // Per the locked spec: every result tab + SuggestionCard imports
  // VorlaeufigFooter; per-card render uses the locked broadened
  // isPending predicate (source !== 'DESIGNER' || quality !== 'VERIFIED').
  results.push(failures('v1.0.3 UX: isPending broadened to !DESIGNER+VERIFIED', [
    {
      ok: /return\s+!\(source\s*===\s*'DESIGNER'\s*&&\s*quality\s*===\s*'VERIFIED'\)/.test(vorlaeufigSrc),
      msg: 'isPending must use the v1.0.3 broadened predicate (anything not DESIGNER+VERIFIED is pending)',
    },
  ]))
  const overviewTab = await readFileText('src/features/result/components/tabs/OverviewTab.tsx')
  const procDocsTab = await readFileText('src/features/result/components/tabs/ProcedureDocumentsTab.tsx')
  const teamTab = await readFileText('src/features/result/components/tabs/TeamTab.tsx')
  const costTab = await readFileText('src/features/result/components/tabs/CostTimelineTab.tsx')
  const suggestionsTab = await readFileText('src/features/result/components/tabs/SuggestionsTab.tsx')
  const suggestionCard = await readFileText('src/features/result/components/Cards/SuggestionCard.tsx')
  const VORL_IMPORT_RE = /from\s+['"]@\/features\/architect\/components\/VorlaeufigFooter['"]/
  const FOOTER_RENDER_RE = /<VorlaeufigFooter\b/
  results.push(failures('v1.0.3 UX: every result tab imports VorlaeufigFooter', [
    {
      ok: VORL_IMPORT_RE.test(overviewTab),
      msg: 'OverviewTab must import VorlaeufigFooter',
    },
    {
      ok: VORL_IMPORT_RE.test(procDocsTab),
      msg: 'ProcedureDocumentsTab must import VorlaeufigFooter',
    },
    {
      ok: VORL_IMPORT_RE.test(teamTab),
      msg: 'TeamTab must import VorlaeufigFooter',
    },
    {
      ok: VORL_IMPORT_RE.test(costTab),
      msg: 'CostTimelineTab must import VorlaeufigFooter',
    },
    {
      ok: VORL_IMPORT_RE.test(suggestionsTab),
      msg: 'SuggestionsTab must import VorlaeufigFooter',
    },
    {
      ok: VORL_IMPORT_RE.test(suggestionCard),
      msg: 'SuggestionCard must import VorlaeufigFooter',
    },
  ]))
  results.push(failures('v1.0.3 UX: every result tab renders VorlaeufigFooter', [
    {
      ok: FOOTER_RENDER_RE.test(overviewTab),
      msg: 'OverviewTab must render <VorlaeufigFooter ... />',
    },
    {
      ok: FOOTER_RENDER_RE.test(procDocsTab),
      msg: 'ProcedureDocumentsTab must render <VorlaeufigFooter ... />',
    },
    {
      ok: FOOTER_RENDER_RE.test(teamTab),
      msg: 'TeamTab must render <VorlaeufigFooter ... />',
    },
    {
      ok: FOOTER_RENDER_RE.test(costTab),
      msg: 'CostTimelineTab must render <VorlaeufigFooter ... />',
    },
    {
      ok: FOOTER_RENDER_RE.test(suggestionsTab),
      msg: 'SuggestionsTab must render <VorlaeufigFooter ... />',
    },
    {
      ok: FOOTER_RENDER_RE.test(suggestionCard),
      msg: 'SuggestionCard must render <VorlaeufigFooter ... />',
    },
  ]))
  results.push(failures('v1.0.3 UX: per-card render reads THIS card qualifier', [
    {
      ok: /<VorlaeufigFooter[\s\S]{0,160}source=\{primary\.qualifier\?\.source\}/.test(procDocsTab),
      msg: 'ProcedureDocumentsTab primary procedure must read primary.qualifier.source',
    },
    {
      ok: /<VorlaeufigFooter[\s\S]{0,160}source=\{doc\.qualifier\?\.source\}/.test(procDocsTab),
      msg: 'DocumentCard must read doc.qualifier.source per-card (inline)',
    },
    {
      ok: /<VorlaeufigFooter[\s\S]{0,160}source=\{role\.qualifier\?\.source\}/.test(teamTab),
      msg: 'RoleCard must read role.qualifier.source per-card (inline)',
    },
  ]))
  results.push(failures('v1.0.3 UX: tab-level aggregate uses isPending().some(...)', [
    {
      ok: /isPending\([\s\S]{0,400}\.some\(/.test(overviewTab) || /\.some\([\s\S]{0,200}isPending\(/.test(overviewTab),
      msg: 'OverviewTab aggregate must use isPending() across recommendations/procedures/documents/roles',
    },
    {
      ok: /\.some\([\s\S]{0,200}isPending\(/.test(procDocsTab),
      msg: 'ProcedureDocumentsTab aggregate must use isPending() across procedures+documents',
    },
    {
      ok: /\.some\([\s\S]{0,200}isPending\(/.test(teamTab),
      msg: 'TeamTab aggregate must use isPending() across roles',
    },
    {
      ok: /\.some\([\s\S]{0,200}isPending\(/.test(costTab),
      msg: 'CostTimelineTab aggregate must use isPending() across procedures+documents',
    },
  ]))

  // Phase 13 Week 4 — metrics view + CLI + audit doc.
  // The view + CLI together implement the 13b conditional-trigger
  // surface (kept deferred per locked decisions, but the data path
  // must exist so an operator can spot a regression).
  const metricsView = await readFileText('supabase/migrations/0029_qualifier_metrics_view.sql')
  results.push(failures('phase-13 week 4: 0029_qualifier_metrics_view.sql shape', [
    {
      ok: /create or replace view public\.qualifier_rates_7d_global/.test(metricsView),
      msg: '0029 must define qualifier_rates_7d_global view',
    },
    {
      ok: /create or replace view public\.qualifier_rates_7d_per_project/.test(metricsView),
      msg: '0029 must define qualifier_rates_7d_per_project view',
    },
    {
      ok: /create or replace view public\.qualifier_field_breakdown_7d/.test(metricsView),
      msg: '0029 must define qualifier_field_breakdown_7d view',
    },
    {
      ok: /interval\s+'7\s+days'/.test(metricsView),
      msg: '0029 views must use the 7-day rolling window from the spec',
    },
  ]))
  const cliSrc = await readFileText('scripts/qualifier-downgrade-rate.mjs')
  results.push(failures('phase-13 week 4: qualifier-downgrade-rate.mjs shape', [
    {
      ok: /SMOKE_SUPABASE_URL/.test(cliSrc) && /SMOKE_SUPABASE_SERVICE_KEY/.test(cliSrc),
      msg: 'CLI must read SMOKE_SUPABASE_URL + SMOKE_SUPABASE_SERVICE_KEY',
    },
    {
      ok: /qualifier_rates_7d_global/.test(cliSrc),
      msg: 'CLI must query qualifier_rates_7d_global',
    },
    {
      ok: /numerator\s*>\s*5/.test(cliSrc) && /turns\s*>=?\s*100/.test(cliSrc),
      msg: 'CLI must encode the 13b threshold (>5 events AND ≥100 turns)',
    },
  ]))
  const reviewDoc = await readFileText('docs/PHASE_13_REVIEW.md')
  results.push(failures('phase-13 week 4: PHASE_13_REVIEW.md audit trail', [
    {
      ok: /Manual deploy checklist/.test(reviewDoc),
      msg: 'PHASE_13_REVIEW.md must include the manual deploy checklist',
    },
    {
      ok: /Rollback playbook/.test(reviewDoc),
      msg: 'PHASE_13_REVIEW.md must include the rollback playbook',
    },
    {
      ok: /Migration ordering/.test(reviewDoc),
      msg: 'PHASE_13_REVIEW.md must record the 0028→0029 migration renumber',
    },
  ]))

  for (const f of QUALIFIER_GATE_FIXTURES) {
    // Deep-clone so cross-fixture mutation can't bleed through.
    const cloned = JSON.parse(JSON.stringify(f.input))
    const events = gateQualifiersByRoleJS(cloned, f.role)
    const conditions = [
      {
        ok: events.length === f.expectEventCount,
        msg: `expected ${f.expectEventCount} downgrade event(s) for role=${f.role}; got ${events.length}: ${JSON.stringify(events)}`,
      },
    ]
    if (f.expectFinalQuality) {
      const actual = readQualifierFromFixture(cloned, f.expectFinalQuality)
      conditions.push({
        ok: actual === f.expectFinalQuality.quality,
        msg: `expected post-gate qualifier=${f.expectFinalQuality.quality} on ${f.expectFinalQuality.kind}; got ${actual}`,
      })
    }
    results.push(failures(`phase-13 fixture: ${f.label}`, conditions))
  }

  // ── v1.0.6 Bug 0 — B04 surgical mitigation drift checks ────────────
  // The legacy wizard hardcoded `bundesland: 'bayern'` on every
  // projects INSERT, defeating the 16-state framework downstream. The
  // v1.0.6 fix: the wizard exposes an explicit Bundesland dropdown and
  // useCreateProject writes the user's selection through to the DB.
  // Drift gates assert (a) the hardcode is gone from the INSERT call,
  // (b) the wizard store carries a bundesland field, and (c) the
  // QuestionPlot component renders the locale-keyed selector.
  const createProjectSrc = await readFileText('src/features/wizard/hooks/useCreateProject.ts')
  results.push(failures("v1.0.6 Bug 0: useCreateProject no longer hardcodes bundesland='bayern' on INSERT", [
    {
      ok: !/bundesland:\s*'bayern'/.test(createProjectSrc),
      msg: "INSERT call must not contain literal `bundesland: 'bayern'` — read from input.bundesland instead",
    },
    {
      ok: /bundesland:\s*input\.bundesland/.test(createProjectSrc),
      msg: 'INSERT call must reference input.bundesland (typed BundeslandCode)',
    },
    {
      ok: /BundeslandCode/.test(createProjectSrc),
      msg: 'useCreateProject must import BundeslandCode for the typed input',
    },
  ]))
  const wizardStoreSrc = await readFileText('src/features/wizard/hooks/useWizardState.ts')
  results.push(failures('v1.0.6 Bug 0: wizard store carries bundesland field', [
    {
      ok: /bundesland:\s*BundeslandCode/.test(wizardStoreSrc),
      msg: 'WizardState interface must declare bundesland: BundeslandCode',
    },
    {
      ok: /setBundesland:/.test(wizardStoreSrc),
      msg: 'WizardState must expose setBundesland setter',
    },
    {
      ok: /bundesland:\s*'bayern'\s+as\s+BundeslandCode/.test(wizardStoreSrc),
      msg: 'initial bundesland must default to bayern (preserves existing München flow)',
    },
  ]))
  const questionPlotSrc = await readFileText('src/features/wizard/components/QuestionPlot.tsx')
  results.push(failures('v1.0.6 Bug 0: QuestionPlot renders the Bundesland selector + emits in onSubmit', [
    {
      ok: /BUNDESLAND_OPTIONS/.test(questionPlotSrc),
      msg: 'QuestionPlot must declare BUNDESLAND_OPTIONS list',
    },
    {
      ok: /wizard\.q2\.bundesland\.label/.test(questionPlotSrc),
      msg: 'QuestionPlot must render the bundesland.label locale key',
    },
    {
      ok: /wizard\.q2\.bundesland\.hint/.test(questionPlotSrc),
      msg: 'QuestionPlot must render the bundesland.hint locale key',
    },
    {
      ok: /bundesland,\s*$/m.test(questionPlotSrc) || /bundesland,\n/.test(questionPlotSrc),
      msg: 'QuestionPlot onSubmit payload must include bundesland',
    },
    {
      ok: /BUNDESLAND_OPTIONS[\s\S]{0,2000}'bayern'[\s\S]{0,2000}'hessen'[\s\S]{0,2000}'nrw'/.test(questionPlotSrc),
      msg: 'BUNDESLAND_OPTIONS must include bayern, hessen, nrw at minimum (sanity sample)',
    },
  ]))
  const deLocaleSrc = await readFileText('src/locales/de.json')
  const enLocaleSrc = await readFileText('src/locales/en.json')
  results.push(failures('v1.0.6 Bug 0: locale keys for wizard.q2.bundesland present in DE + EN', [
    {
      ok: /"bundesland":\s*\{\s*"label":\s*"Bundesland"/.test(deLocaleSrc),
      msg: 'de.json must define wizard.q2.bundesland.label = "Bundesland"',
    },
    {
      ok: /"bundesland":\s*\{\s*"label":\s*"Federal state"/.test(enLocaleSrc),
      msg: 'en.json must define wizard.q2.bundesland.label = "Federal state"',
    },
  ]))

  // ── v1.0.13 — PDF Renaissance Part 1: DE/EN export picker ─────────
  const exportMenuSrc = await readFileText('src/features/result/components/ExportMenu.tsx')
  results.push(failures('v1.0.13: ExportMenu offers EN + DE PDF variants', [
    {
      ok: /'pdf-en'\s*\|\s*'pdf-de'/.test(exportMenuSrc),
      msg: 'Action type union must include both pdf-en and pdf-de variants',
    },
    {
      ok: /pdf-de.*'de'.*'en'/s.test(exportMenuSrc) || /exportLang.*=.*action\s*===\s*'pdf-de'\s*\?\s*'de'\s*:\s*'en'/s.test(exportMenuSrc),
      msg: 'exportLang must resolve pdf-de → "de" and pdf-en → "en"',
    },
    {
      ok: /buildExportPdf\(\{[^}]*lang:\s*exportLang/.test(exportMenuSrc),
      msg: 'buildExportPdf must receive the picker-derived lang, not the UI lang',
    },
    {
      ok: /locale:\s*exportLang/.test(exportMenuSrc),
      msg: 'telemetry event must include locale field',
    },
    {
      ok: (exportMenuSrc.match(/<DropdownMenuItem[\s\S]*?onSelect=\{[^}]*trigger\([^)]*pdf-/g) ?? []).length >= 2,
      msg: 'two DropdownMenuItems wire the pdf-en + pdf-de triggers',
    },
  ]))

  // ── v1.0.15 — Renaissance Part 2A strings (executive + areas) ────
  const stringsV15 = await readFileText('src/features/chat/lib/pdfStrings.ts')
  results.push(failures('v1.0.15: pdfStrings extends EN + DE with executive + areas keys', [
    {
      ok: /'exec\.kicker':\s*'SECTION 01 · EXECUTIVE'/.test(stringsV15) &&
          /'exec\.kicker':\s*'ABSCHNITT 01 · ZUSAMMENFASSUNG'/.test(stringsV15),
      msg: 'exec.kicker present in both EN and DE',
    },
    {
      ok: /'exec\.title':\s*'Top 3 next steps'/.test(stringsV15) &&
          /'exec\.title':\s*'Die 3 nächsten Schritte'/.test(stringsV15),
      msg: 'exec.title bilingual',
    },
    {
      ok: /'prio\.high':\s*'HIGH PRIORITY'/.test(stringsV15) &&
          /'prio\.high':\s*'HOHE PRIORITÄT'/.test(stringsV15),
      msg: 'prio.high bilingual',
    },
    {
      ok: /'prio\.beforeAward':\s*'BEFORE AWARD'/.test(stringsV15) &&
          /'prio\.beforeAward':\s*'VOR VERGABE'/.test(stringsV15),
      msg: 'prio.beforeAward bilingual',
    },
    {
      ok: /'prio\.confirm':\s*'CONFIRM'/.test(stringsV15) &&
          /'prio\.confirm':\s*'BESTÄTIGEN'/.test(stringsV15),
      msg: 'prio.confirm bilingual',
    },
    {
      ok: /'areas\.kicker':\s*'SECTION 02 · LEGAL AREAS'/.test(stringsV15) &&
          /'areas\.kicker':\s*'ABSCHNITT 02 · RECHTSBEREICHE'/.test(stringsV15),
      msg: 'areas.kicker bilingual',
    },
    {
      ok: /'areas\.title':\s*'A · B · C status'/.test(stringsV15) &&
          /'areas\.title':\s*'A · B · C Status'/.test(stringsV15),
      msg: 'areas.title bilingual',
    },
    {
      ok: /'areas\.legend\.active':/.test(stringsV15) &&
          /'areas\.status\.active':/.test(stringsV15) &&
          /'areas\.a\.title':/.test(stringsV15) &&
          /'areas\.b\.title':/.test(stringsV15) &&
          /'areas\.c\.title':/.test(stringsV15),
      msg: 'areas.legend / areas.status / areas.{a,b,c}.title all declared',
    },
  ]))

  // ── v1.0.15 — Renaissance Part 2A primitives (cards/pills/badges) ─
  const primV15 = await readFileText('src/features/chat/lib/pdfPrimitives.ts')
  results.push(failures('v1.0.15: pdfPrimitives exports new section-renderer primitives', [
    {
      ok: /export function drawCard\(/.test(primV15) &&
          /borderSide:\s*'left'\s*\|\s*'full'\s*\|\s*'none'/.test(primV15),
      msg: 'drawCard exported with left|full|none borderSide opts',
    },
    {
      ok: /export function drawPriorityPill\(/.test(primV15) &&
          /return\s+w/.test(primV15),
      msg: 'drawPriorityPill exported, returns consumed width for chaining',
    },
    {
      ok: /export function drawCircularBadge\(/.test(primV15),
      msg: 'drawCircularBadge exported (filled circle + centered letter)',
    },
    {
      ok: /export function drawWrappedText\(/.test(primV15) &&
          /widthOfTextAtSize/.test(primV15),
      msg: 'drawWrappedText exported with word-wrap word-break logic',
    },
    {
      ok: /export function drawStatusLegend\(/.test(primV15) &&
          /rightX/.test(primV15),
      msg: 'drawStatusLegend exported with right-anchored layout',
    },
  ]))

  // ── v1.0.16 — Costs page strings (EN + DE) ──────────────────────
  const stringsV16Costs = await readFileText('src/features/chat/lib/pdfStrings.ts')
  results.push(failures('v1.0.16: pdfStrings extends EN + DE with costs.* keys', [
    {
      ok: /'costs\.kicker':\s*'SECTION 03 · COSTS'/.test(stringsV16Costs) &&
          /'costs\.kicker':\s*'ABSCHNITT 03 · KOSTEN'/.test(stringsV16Costs),
      msg: 'costs.kicker bilingual',
    },
    {
      ok: /'costs\.title':\s*'Estimated cost range'/.test(stringsV16Costs) &&
          /'costs\.title':\s*'Geschätzte Kostenspanne'/.test(stringsV16Costs),
      msg: 'costs.title bilingual',
    },
    {
      ok: /'costs\.basisTemplate':[\s\S]{0,100}\{n\} m² façade[\s\S]{0,80}\{state\}/.test(stringsV16Costs) &&
          /'costs\.basisTemplate':[\s\S]{0,100}\{n\} m² Fassade[\s\S]{0,80}\{state\}/.test(stringsV16Costs),
      msg: 'costs.basisTemplate carries {n} m²/Fassade and {state} substitution tokens in both locales',
    },
    {
      ok: /'costs\.th\.item':/.test(stringsV16Costs) &&
          /'costs\.th\.basis':/.test(stringsV16Costs) &&
          /'costs\.th\.range':/.test(stringsV16Costs),
      msg: 'costs.th.{item,basis,range} column headers declared',
    },
    {
      ok: /'costs\.items\.architect':/.test(stringsV16Costs) &&
          /'costs\.items\.structural':/.test(stringsV16Costs) &&
          /'costs\.items\.surveying':/.test(stringsV16Costs) &&
          /'costs\.items\.energy':/.test(stringsV16Costs) &&
          /'costs\.items\.authority':/.test(stringsV16Costs),
      msg: 'costs.items.{architect,structural,surveying,energy,authority} all declared',
    },
    {
      ok: /'costs\.notes\.h':/.test(stringsV16Costs) &&
          /'costs\.notes\.b':/.test(stringsV16Costs),
      msg: 'costs.notes.h + costs.notes.b declared',
    },
  ]))

  // ── v1.0.16 — Timeline page strings (EN + DE) ────────────────────
  results.push(failures('v1.0.16: pdfStrings extends EN + DE with timeline.* keys', [
    {
      ok: /'timeline\.kicker':\s*'SECTION 04 · TIMELINE'/.test(stringsV16Costs) &&
          /'timeline\.kicker':\s*'ABSCHNITT 04 · ZEITPLAN'/.test(stringsV16Costs),
      msg: 'timeline.kicker bilingual',
    },
    {
      ok: /'timeline\.title':\s*'Estimated timeline'/.test(stringsV16Costs) &&
          /'timeline\.title':\s*'Geschätzter Zeitplan'/.test(stringsV16Costs),
      msg: 'timeline.title bilingual',
    },
    {
      ok: /'timeline\.weekLabel':\s*'WEEK'/.test(stringsV16Costs) &&
          /'timeline\.weekLabel':\s*'WOCHE'/.test(stringsV16Costs),
      msg: 'timeline.weekLabel localized for the Gantt ruler',
    },
    {
      ok: /'timeline\.phase\.prep':/.test(stringsV16Costs) &&
          /'timeline\.phase\.submit':/.test(stringsV16Costs) &&
          /'timeline\.phase\.review':/.test(stringsV16Costs) &&
          /'timeline\.phase\.fixes':/.test(stringsV16Costs),
      msg: 'timeline.phase.{prep,submit,review,fixes} all declared',
    },
    {
      ok: /'timeline\.milestone':/.test(stringsV16Costs) &&
          /'timeline\.milestone\.detail':/.test(stringsV16Costs),
      msg: 'timeline.milestone + milestone.detail declared',
    },
  ]))

  // ── v1.0.16 — New primitives (table / notes / Gantt) ─────────────
  const primV16 = await readFileText('src/features/chat/lib/pdfPrimitives.ts')
  results.push(failures('v1.0.16: pdfPrimitives exports table + Gantt primitives', [
    {
      ok: /export function drawTable\(/.test(primV16) &&
          /TableRow|TableColumn/.test(primV16),
      msg: 'drawTable exported with TableColumn/TableRow shape',
    },
    {
      ok: /export function drawNotesBlock\(/.test(primV16) &&
          /borderColor|CLAY[\s\S]{0,200}width:\s*2/.test(primV16),
      msg: 'drawNotesBlock exported with 2pt CLAY left accent',
    },
    {
      ok: /export function drawWeekRuler\(/.test(primV16) &&
          /weekLabel/.test(primV16),
      msg: 'drawWeekRuler exported with localized weekLabel prefix',
    },
    {
      ok: /export function drawGanttRow\(/.test(primV16) &&
          /kind:\s*'work'\s*\|\s*'wait'/.test(primV16),
      msg: 'drawGanttRow exported with work/wait kind discriminator',
    },
    {
      ok: /export function drawMilestoneCallout\(/.test(primV16) &&
          /drawSvgPath/.test(primV16),
      msg: 'drawMilestoneCallout exported with svgPath diamond glyph',
    },
    {
      ok: /export const AMBER\b/.test(primV16),
      msg: 'AMBER accent constant exported (shared with executive high-priority accent)',
    },
  ]))

  // ── v1.0.16 — Costs + Timeline renderers ─────────────────────────
  const costsV16 = await readFileText('src/features/chat/lib/pdfSections/costs.ts')
  const timelineV16 = await readFileText('src/features/chat/lib/pdfSections/timeline.ts')
  results.push(failures('v1.0.16: pdfSections/costs.ts renders Section 03 (Costs)', [
    {
      ok: /export function renderCostsBody\(/.test(costsV16),
      msg: 'renderCostsBody exported',
    },
    {
      ok: /export function renderCostsFooter\(/.test(costsV16),
      msg: 'renderCostsFooter exported (Path A 2-pass split)',
    },
    {
      ok: /drawTable\(\{/.test(costsV16) && /widthFraction:\s*0\.4/.test(costsV16),
      msg: 'costs renderer uses drawTable with 3-column layout (40/35/25 widths)',
    },
    {
      ok: /drawNotesBlock\(/.test(costsV16),
      msg: 'costs renderer ends with drawNotesBlock for the NOTES caption',
    },
    {
      ok: /\{n\}/.test(costsV16) && /\{state\}/.test(costsV16),
      msg: 'costs renderer substitutes {n} and {state} in the basisTemplate string',
    },
  ]))
  results.push(failures('v1.0.16: pdfSections/timeline.ts renders Section 04 (Timeline)', [
    {
      ok: /export function renderTimelineBody\(/.test(timelineV16),
      msg: 'renderTimelineBody exported',
    },
    {
      ok: /export function renderTimelineFooter\(/.test(timelineV16),
      msg: 'renderTimelineFooter exported (Path A 2-pass split)',
    },
    {
      ok: /drawWeekRuler\(/.test(timelineV16) &&
          /drawGanttRow\(/.test(timelineV16) &&
          /drawMilestoneCallout\(/.test(timelineV16),
      msg: 'timeline renderer uses all three v1.0.16 Gantt primitives',
    },
    {
      ok: /DEFAULT_TIMELINE_PHASES/.test(timelineV16) &&
          /startWeek:\s*0,\s*endWeek:\s*12/.test(timelineV16),
      msg: 'DEFAULT_TIMELINE_PHASES set for T-03 default schedule (prep 0-12)',
    },
  ]))

  // ── v1.0.16 — Assembly wire-up for costs + timeline ──────────────
  const assemblyV16 = await readFileText('src/features/chat/lib/exportPdf.ts')
  results.push(failures('v1.0.16: exportPdf wires renderCostsBody + renderTimelineBody', [
    {
      ok: /import \{[^}]*renderCostsBody[^}]*\}\s+from\s+['"]\.\/pdfSections\/costs['"]/s.test(assemblyV16),
      msg: 'exportPdf imports renderCostsBody from ./pdfSections/costs',
    },
    {
      ok: /import \{[^}]*renderTimelineBody[^}]*\}\s+from\s+['"]\.\/pdfSections\/timeline['"]/s.test(assemblyV16),
      msg: 'exportPdf imports renderTimelineBody from ./pdfSections/timeline',
    },
    {
      ok: /renderCostsBody\(costsPage/.test(assemblyV16) &&
          /renderCostsFooter\(costsPage/.test(assemblyV16),
      msg: 'exportPdf calls renderCostsBody + renderCostsFooter (2-pass)',
    },
    {
      ok: /renderTimelineBody\(timelinePage/.test(assemblyV16) &&
          /renderTimelineFooter\(timelinePage/.test(assemblyV16),
      msg: 'exportPdf calls renderTimelineBody + renderTimelineFooter (2-pass)',
    },
    {
      ok: !/function drawCostsPage\(/.test(assemblyV16) &&
          !/function drawTimelinePage\(/.test(assemblyV16),
      msg: 'v1.0.6 drawCostsPage + drawTimelinePage retired (replaced by editorial renderers)',
    },
    {
      ok: /editorialPages\.add\(costsPage\)/.test(assemblyV16) &&
          /editorialPages\.add\(timelinePage\)/.test(assemblyV16),
      msg: 'footer-loop skips costs + timeline editorial pages',
    },
  ]))

  // ── v1.0.20 cosmetic polish drift bundle ────────────────────────
  const primForV20 = await readFileText('src/features/chat/lib/pdfPrimitives.ts')
  const stringsForV20 = await readFileText('src/features/chat/lib/pdfStrings.ts')
  const verifForV20 = await readFileText('src/features/chat/lib/pdfSections/verification.ts')
  results.push(failures('v1.0.20 Polish 1: drawWrappedText paragraphGap support', [
    {
      ok: /paragraphGap\?:\s*number/.test(primForV20),
      msg: 'WrappedTextOpts gains optional paragraphGap field',
    },
    {
      ok: /split\(\/\\n\\n\+\/\)/.test(primForV20),
      msg: 'drawWrappedText splits input on /\\n\\n+/',
    },
  ]))
  results.push(failures('v1.0.20 Polish 2: qualifier i18n + getQualifierLabel', [
    {
      ok: /'qualifier\.source\.CLIENT':\s*'CLIENT'/.test(stringsForV20) &&
          /'qualifier\.source\.CLIENT':\s*'BAUHERR'/.test(stringsForV20),
      msg: 'qualifier.source.CLIENT bilingual (EN CLIENT / DE BAUHERR)',
    },
    {
      ok: /'qualifier\.source\.LEGAL':\s*'RECHTLICH'/.test(stringsForV20),
      msg: 'qualifier.source.LEGAL DE = RECHTLICH',
    },
    {
      ok: /'qualifier\.quality\.CALCULATED':\s*'BERECHNET'/.test(stringsForV20) &&
          /'qualifier\.quality\.ASSUMED':\s*'ANGENOMMEN'/.test(stringsForV20) &&
          /'qualifier\.quality\.VERIFIED':\s*'VERIFIZIERT'/.test(stringsForV20) &&
          /'qualifier\.quality\.DECIDED':\s*'ENTSCHIEDEN'/.test(stringsForV20),
      msg: 'all 4 quality DE translations declared (BERECHNET/ANGENOMMEN/VERIFIZIERT/ENTSCHIEDEN)',
    },
    {
      ok: /export function getQualifierLabel\(/.test(primForV20),
      msg: 'getQualifierLabel helper exported',
    },
    {
      ok: /export function formatQualifier\([\s\S]{0,200}strings\?:\s*Record/.test(primForV20),
      msg: 'formatQualifier accepts optional strings parameter (locale-aware overload)',
    },
  ]))
  results.push(failures('v1.0.20 Polish 3: Bauherr signature row on Verification page', [
    {
      ok: /'sig\.bauherr':\s*'Bauherr · Owner'/.test(stringsForV20) &&
          /'sig\.bauherr':\s*'Bauherr:in'/.test(stringsForV20),
      msg: 'sig.bauherr bilingual',
    },
    {
      ok: /'sig\.bauherr\.note':\s*'Co-signature required/.test(stringsForV20) &&
          /'sig\.bauherr\.note':\s*'Mit-Unterschrift erforderlich/.test(stringsForV20),
      msg: 'sig.bauherr.note bilingual',
    },
    {
      ok: /bauherrName\?:\s*string/.test(verifForV20),
      msg: 'VerificationData.bauherrName field declared',
    },
    {
      ok: /pdfStr\(strings,\s*'sig\.bauherr'\)/.test(verifForV20) &&
          /pdfStr\(strings,\s*'sig\.bauherr\.note'\)/.test(verifForV20),
      msg: 'verification renderer references sig.bauherr + sig.bauherr.note',
    },
  ]))

  // ── v1.0.19 canonical procedure resolver ────────────────────────
  const resolveProcSrc = await readFileText('src/legal/resolveProcedure.ts')
  results.push(failures('v1.0.19 Bug 40: resolveProcedure canonical resolver', [
    {
      ok: /export function resolveProcedure\(c: ProcedureCase\)/.test(resolveProcSrc),
      msg: 'resolveProcedure(c: ProcedureCase): ProcedureDecision exported',
    },
    {
      ok: /export interface ProcedureDecision[\s\S]{0,400}kind:\s*ProcedureKind[\s\S]{0,200}citation:\s*string[\s\S]{0,200}reasoning_de:\s*string[\s\S]{0,200}reasoning_en:\s*string/.test(resolveProcSrc),
      msg: 'ProcedureDecision shape has kind / citation / reasoning_de / reasoning_en',
    },
    {
      ok: /'verfahrensfrei'/.test(resolveProcSrc) &&
          /'vereinfachtes'/.test(resolveProcSrc) &&
          /'standard'/.test(resolveProcSrc) &&
          /'bauvoranfrage'/.test(resolveProcSrc),
      msg: 'ProcedureKind union covers 4 outcomes (verfahrensfrei / vereinfachtes / standard / bauvoranfrage)',
    },
    {
      ok: /'§ 62 BauO NRW'/.test(resolveProcSrc),
      msg: 'NRW Sanierung outer-shell-only path cites § 62 BauO NRW (verfahrensfrei)',
    },
    {
      ok: /denkmalschutz\s*\|\|\s*c\.ensembleschutz/.test(resolveProcSrc),
      msg: 'Denkmalschutz / Ensembleschutz triggers standard permit',
    },
    {
      ok: /export function intentFromTemplate/.test(resolveProcSrc),
      msg: 'intentFromTemplate(templateId) maps TemplateId → ProcedureIntent',
    },
    {
      ok: /export function procedureLabel/.test(resolveProcSrc) &&
          /export function procedureStatusLabel/.test(resolveProcSrc),
      msg: 'procedureLabel + procedureStatusLabel localization helpers exported',
    },
  ]))

  // ── v1.0.19 requiredDocumentsForCase resolver ────────────────────
  const reqDocsSrc = await readFileText('src/legal/requiredDocuments.ts')
  results.push(failures('v1.0.19 Bug 41+42: requiredDocumentsForCase resolver', [
    {
      ok: /export function requiredDocumentsForCase\s*\(\s*c:\s*DocumentCase/.test(reqDocsSrc),
      msg: 'requiredDocumentsForCase exported',
    },
    {
      ok: /'§ 48 GEG'/.test(reqDocsSrc) && /'§ 80 GEG'/.test(reqDocsSrc),
      msg: 'GEG-Wärmeschutznachweis (§ 48 GEG) + Energieausweis (§ 80 GEG) cited (Bug 41 promotion)',
    },
    {
      ok: /'BauVorlVO NRW § 3'/.test(reqDocsSrc),
      msg: 'NRW Bauvorlagenverordnung § 3 cited for Lageplan / Bauzeichnungen / Baubeschreibung',
    },
    {
      ok: /key: 'lageplan'/.test(reqDocsSrc) &&
          /key: 'bauzeichnungen'/.test(reqDocsSrc) &&
          /key: 'baubeschreibung'/.test(reqDocsSrc) &&
          /key: 'geg_waermeschutznachweis'/.test(reqDocsSrc) &&
          /key: 'energieausweis'/.test(reqDocsSrc),
      msg: 'core document keys present (lageplan / bauzeichnungen / baubeschreibung / geg_waermeschutznachweis / energieausweis)',
    },
    {
      ok: /procedureKind === 'verfahrensfrei'[\s\S]{0,500}anzeige_formular/.test(reqDocsSrc),
      msg: 'verfahrensfrei branch emits Anzeige-Formular (not Bauantragsformular)',
    },
  ]))

  // ── v1.0.17 runtime smoke harness exists ──────────────────────────
  const fs2 = await import('node:fs')
  const smokePdfTextExists = fs2.existsSync(`${REPO_ROOT}/scripts/smoke-pdf-text.mts`)
  const fixtureExists = fs2.existsSync(`${REPO_ROOT}/test/fixtures/nrw-t03-koenigsallee.json`)
  const pkgJsonV17 = await readFileText('package.json')
  results.push(failures('v1.0.17: smoke:pdf-text runtime gate (5th daily gate)', [
    {
      ok: smokePdfTextExists,
      msg: 'scripts/smoke-pdf-text.mts present',
    },
    {
      ok: fixtureExists,
      msg: 'test/fixtures/nrw-t03-koenigsallee.json fixture present',
    },
    {
      ok: /"smoke:pdf-text":\s*"npx tsx scripts\/smoke-pdf-text\.mts"/.test(pkgJsonV17),
      msg: 'package.json declares smoke:pdf-text npm script',
    },
    {
      ok: /"pdf-parse":/.test(pkgJsonV17),
      msg: 'pdf-parse devDep declared',
    },
  ]))

  // ── v1.0.17 permanent ligature kill — embedFont features.liga=false ──
  const fontLoaderSrc = await readFileText('src/lib/fontLoader.ts')
  results.push(failures('v1.0.17: embedFont passes features.liga=false to disable GSUB at fontkit layer', [
    {
      ok: /liga:\s*false/.test(fontLoaderSrc),
      msg: 'liga: false must appear in fontLoader (kills GSUB ligature substitution)',
    },
    {
      ok: /dlig:\s*false/.test(fontLoaderSrc) && /clig:\s*false/.test(fontLoaderSrc),
      msg: 'discretionary + contextual ligatures also disabled (dlig + clig)',
    },
    {
      ok: /embedFont\(buffers\[0\],\s*\{\s*features:/.test(fontLoaderSrc),
      msg: 'inter (buffer 0) embeds with features option',
    },
    {
      ok: (fontLoaderSrc.match(/features:\s*noLigatures/g) ?? []).length >= 4,
      msg: 'all four brand fonts (inter / interMedium / serifItalic / serif) embed with noLigatures features',
    },
  ]))

  // ── v1.0.16 architectural invariant — zero raw page.drawText in
  //    section renderers. ENDS the ligature regression cycle by
  //    making the bypass structurally impossible at the file level. ─
  const fs = await import('node:fs')
  const path = await import('node:path')
  const sectionsDir = `${REPO_ROOT}/src/features/chat/lib/pdfSections`
  const sectionFiles = fs.readdirSync(sectionsDir).filter((f) => f.endsWith('.ts'))
  const sectionViolations = []
  for (const fname of sectionFiles) {
    const src = fs.readFileSync(path.join(sectionsDir, fname), 'utf-8')
    const matches = src.match(/page\.drawText\s*\(/g)
    if (matches && matches.length > 0) {
      sectionViolations.push(`${fname}: ${matches.length} raw page.drawText call(s)`)
    }
  }
  results.push(failures('v1.0.16: zero raw page.drawText in pdfSections/*.ts (architectural invariant)', [
    {
      ok: sectionViolations.length === 0,
      msg: sectionViolations.length === 0
        ? `${sectionFiles.length} section renderer(s) scanned — none bypass safe()`
        : `architectural fix broken — ${sectionViolations.join(' · ')}. Use drawSafeText or a typed primitive.`,
    },
  ]))

  // Architectural fixture: drawSafeText primitive exported + the
  // EditorialFonts.safe field is required, so callers cannot
  // accidentally drop sanitization.
  const primForArch = await readFileText('src/features/chat/lib/pdfPrimitives.ts')
  results.push(failures('v1.0.16: drawSafeText + EditorialFonts.safe enforce sanitization at compile time', [
    {
      ok: /export\s+function\s+drawSafeText\s*\(/.test(primForArch),
      msg: 'drawSafeText primitive exported from pdfPrimitives',
    },
    {
      ok: /export\s+interface\s+DrawSafeTextOpts[\s\S]{0,500}safe:\s*SafeTextFn/.test(primForArch),
      msg: 'DrawSafeTextOpts requires safe: SafeTextFn (compile-time enforcement)',
    },
    {
      ok: /export\s+interface\s+EditorialFonts[\s\S]{0,800}safe:\s*SafeTextFn/.test(primForArch),
      msg: 'EditorialFonts carries safe: SafeTextFn so renderers always have access',
    },
    {
      ok: /resolveEditorialFonts[\s\S]{0,400}safe:\s*resolveSafeTextFn/.test(primForArch),
      msg: 'resolveEditorialFonts populates fonts.safe from resolveSafeTextFn',
    },
  ]))

  // Section renderers MUST consume drawSafeText for one-off draws.
  // Asserts each renderer imports drawSafeText (proof they're not
  // tempted to fall back to raw page.drawText).
  const renderersExpectingSafeImport = ['cover.ts', 'executive.ts', 'areas.ts']
  const safeImportViolations = []
  for (const fname of renderersExpectingSafeImport) {
    const src = fs.readFileSync(path.join(sectionsDir, fname), 'utf-8')
    if (!/drawSafeText/.test(src)) {
      safeImportViolations.push(`${fname} does not import drawSafeText`)
    }
  }
  results.push(failures('v1.0.16: cover/executive/areas renderers consume drawSafeText', [
    {
      ok: safeImportViolations.length === 0,
      msg: safeImportViolations.length === 0
        ? 'all 3 renderers reference drawSafeText'
        : safeImportViolations.join(' · '),
    },
  ]))

  // ── v1.0.16 Bug 32 — formatQualifier unified in pdfPrimitives ────
  const primForBug32 = await readFileText('src/features/chat/lib/pdfPrimitives.ts')
  const exportPdfForBug32 = await readFileText('src/features/chat/lib/exportPdf.ts')
  results.push(failures('v1.0.16 Bug 32: formatQualifier unified in pdfPrimitives', [
    {
      ok: /export\s+function\s+formatQualifier\s*\(/.test(primForBug32),
      msg: 'formatQualifier exported from pdfPrimitives',
    },
    {
      ok: /DESIGNER[\s\S]{0,40}ASSUMED[\s\S]{0,80}LEGAL.{0,5}CALCULATED/.test(primForBug32),
      msg: 'formatQualifier normalizes DESIGNER+ASSUMED → LEGAL · CALCULATED',
    },
    {
      ok: !/function\s+formatRecommendationQualifier\s*\(/.test(exportPdfForBug32),
      msg: 'exportPdf no longer defines its own formatRecommendationQualifier (moved to pdfPrimitives)',
    },
    {
      ok: /import\s+\{[^}]*formatQualifier[^}]*\}\s+from\s+['"]\.\/pdfPrimitives['"]/s.test(exportPdfForBug32),
      msg: 'exportPdf imports formatQualifier from ./pdfPrimitives',
    },
    {
      // v1.0.20 Polish 2 — formatQualifier signature gained
      // optional strings param; accept both call forms.
      ok: /formatQualifier\(src\.rec\.qualifier(,\s*pdfStrings)?\)/.test(exportPdfForBug32),
      msg: 'executive build path applies formatQualifier to persisted recommendation qualifiers',
    },
  ]))

  // ── v1.0.16 Bug 31 — Executive merges recs + smartPicks (top 3) ──
  const exportPdfForBug31 = await readFileText('src/features/chat/lib/exportPdf.ts')
  results.push(failures('v1.0.16 Bug 31: executive topThree merges recommendations + smartPicks', [
    {
      ok: /pickSmartSuggestions\(\{[\s\S]{0,200}project,[\s\S]{0,200}state:/.test(exportPdfForBug31),
      msg: 'executive build path must call pickSmartSuggestions (same source as Section VIII)',
    },
    {
      ok: /mergedSources\s*:\s*ExecSource\[\]|mergedSources\.slice\(0,\s*3\)/.test(exportPdfForBug31),
      msg: 'executive build merges recs + smartPicks then slices to 3',
    },
    {
      ok: /kind:\s*'rec'/.test(exportPdfForBug31) && /kind:\s*'smart'/.test(exportPdfForBug31),
      msg: 'ExecSource discriminates rec vs smart so the renderer gets unified ExecutiveRec shape',
    },
  ]))

  // ── v1.0.15 — Renaissance Part 2A executive renderer ─────────────
  const executiveV15 = await readFileText('src/features/chat/lib/pdfSections/executive.ts')
  results.push(failures('v1.0.15: pdfSections/executive.ts renders Section 01 (Top 3)', [
    {
      ok: /export function renderExecutiveBody\(/.test(executiveV15),
      msg: 'renderExecutiveBody exported',
    },
    {
      ok: /export function renderExecutiveFooter\(/.test(executiveV15),
      msg: 'renderExecutiveFooter exported (Path A split: footer drawn after total page count is resolved)',
    },
    {
      ok: /export function inferPriority\(/.test(executiveV15) &&
          /'high'|'beforeAward'|'confirm'/.test(executiveV15),
      msg: 'inferPriority heuristic exported with high/beforeAward/confirm buckets',
    },
    {
      ok: /drawCard\(\s*page,\s*\{[^}]*borderSide:\s*'left'/s.test(executiveV15),
      msg: 'each priority card uses drawCard with left accent border',
    },
    {
      ok: /drawPriorityPill\(/.test(executiveV15) && /drawWrappedText\(/.test(executiveV15),
      msg: 'card draws priority pill + wrapped body via v1.0.15 primitives',
    },
  ]))

  // ── v1.0.15 — Renaissance Part 2A areas renderer ─────────────────
  const areasV15 = await readFileText('src/features/chat/lib/pdfSections/areas.ts')
  results.push(failures('v1.0.15: pdfSections/areas.ts renders Section 02 (A·B·C status)', [
    {
      ok: /export function renderAreasBody\(/.test(areasV15),
      msg: 'renderAreasBody exported',
    },
    {
      ok: /export function renderAreasFooter\(/.test(areasV15),
      msg: 'renderAreasFooter exported (Path A split)',
    },
    {
      ok: /drawCircularBadge\(/.test(areasV15),
      msg: 'areas renderer uses drawCircularBadge for A/B/C badge',
    },
    {
      ok: /drawStatusLegend\(/.test(areasV15),
      msg: 'areas renderer draws status legend (ACTIVE/PENDING/VOID dot key)',
    },
    {
      ok: /BADGE_COLOR_BY_STATE|PILL_BG_BY_STATE/.test(areasV15),
      msg: 'state → color mapping table declared (no inline magic colors)',
    },
  ]))

  // ── v1.0.15 — Renaissance Part 2A assembly wire-up ───────────────
  const assemblyV15 = await readFileText('src/features/chat/lib/exportPdf.ts')
  results.push(failures('v1.0.15: exportPdf wires renderExecutiveBody + renderAreasBody', [
    {
      ok: /import \{[^}]*renderExecutiveBody[^}]*\}\s*from\s*['"]\.\/pdfSections\/executive['"]/s.test(assemblyV15),
      msg: 'exportPdf imports renderExecutiveBody from ./pdfSections/executive',
    },
    {
      ok: /import \{[^}]*renderAreasBody[^}]*\}\s*from\s*['"]\.\/pdfSections\/areas['"]/s.test(assemblyV15),
      msg: 'exportPdf imports renderAreasBody from ./pdfSections/areas',
    },
    {
      ok: /renderExecutiveBody\(executivePage/.test(assemblyV15) &&
          /renderExecutiveFooter\(executivePage/.test(assemblyV15),
      msg: 'exportPdf calls renderExecutiveBody + renderExecutiveFooter (2-pass)',
    },
    {
      ok: /renderAreasBody\(areasPage/.test(assemblyV15) &&
          /renderAreasFooter\(areasPage/.test(assemblyV15),
      msg: 'exportPdf calls renderAreasBody + renderAreasFooter (2-pass)',
    },
    {
      ok: !/function drawTop3Page\(/.test(assemblyV15) &&
          !/function drawBereichePage\(/.test(assemblyV15),
      msg: 'v1.0.12 drawTop3Page + drawBereichePage retired (replaced by editorial renderers)',
    },
    {
      ok: /editorialPages\.add\(executivePage\)|editorialPages\.has\(p\)/.test(assemblyV15),
      msg: 'footer-loop skips editorial pages so legacy y=28/y=44 footer does not stamp over them',
    },
  ]))

  // ── v1.0.14 Bug 30 — font instance consolidation ─────────────────
  const primitivesV14 = await readFileText('src/features/chat/lib/pdfPrimitives.ts')
  const exportPdfV14Bug30 = await readFileText('src/features/chat/lib/exportPdf.ts')
  results.push(failures('v1.0.14 Bug 30: resolveEditorialFonts accepts pre-loaded BrandFonts', [
    {
      ok: /export async function resolveEditorialFonts\(\s*doc:\s*PDFDocument,\s*pre\?:/.test(primitivesV14),
      msg: 'resolveEditorialFonts must accept optional pre-loaded brand fonts',
    },
    {
      ok: /const brand = pre \?\? \(await loadBrandFonts\(doc\)\)/.test(primitivesV14),
      msg: 'helper must reuse pre-loaded fonts when supplied; only load anew when missing',
    },
    {
      ok: /resolveEditorialFonts\(doc, fonts\)/.test(exportPdfV14Bug30),
      msg: 'exportPdf assembly must thread the existing fonts (loadBrandFonts result) into resolveEditorialFonts',
    },
  ]))

  // ── v1.0.14 Bug 29 — Bauherr name resolution via auth profile ────
  const exportMenuV14 = await readFileText('src/features/result/components/ExportMenu.tsx')
  const exportPdfV14Bug29 = await readFileText('src/features/chat/lib/exportPdf.ts')
  results.push(failures('v1.0.14 Bug 29: ExportMenu resolves Bauherr name + threads to buildExportPdf', [
    {
      ok: /useAuthStore/.test(exportMenuV14),
      msg: 'ExportMenu must read from useAuthStore for profile/user data',
    },
    {
      ok: /profile\.full_name|authProfile\?\.full_name/.test(exportMenuV14),
      msg: 'ExportMenu must check profile.full_name first',
    },
    {
      ok: /user_metadata\?\.full_name|user_metadata\.full_name/.test(exportMenuV14),
      msg: 'ExportMenu must fall back to user.user_metadata.full_name',
    },
    {
      ok: /bauherrName:\s*resolvedBauherrName/.test(exportMenuV14),
      msg: 'ExportMenu must pass resolvedBauherrName to buildExportPdf',
    },
    {
      ok: /bauherrName\?:\s*string/.test(exportPdfV14Bug29),
      msg: 'BuildArgs must declare optional bauherrName',
    },
    {
      ok: /bauherrNameArg\s*\?\?\s*\(lang\s*===\s*'de'\s*\?\s*'Bauherr'\s*:\s*'Owner'\)/.test(exportPdfV14Bug29),
      msg: 'buildExportPdf must use bauherrNameArg with localized fallback',
    },
  ]))

  // ── v1.0.14 Bug 28 — cover/TOC footer split (Path A) ─────────────
  const coverSrcV14 = await readFileText('src/features/chat/lib/pdfSections/cover.ts')
  const tocSrcV14 = await readFileText('src/features/chat/lib/pdfSections/toc.ts')
  results.push(failures('v1.0.14 Bug 28: cover + TOC export footer renderers separately', [
    {
      ok: /export function renderCoverFooter/.test(coverSrcV14),
      msg: 'cover.ts must export renderCoverFooter (Path A split)',
    },
    {
      ok: /export function renderTocFooter/.test(tocSrcV14),
      msg: 'toc.ts must export renderTocFooter (Path A split)',
    },
    {
      ok: !/1\s*\/\s*\?/.test(coverSrcV14),
      msg: 'cover.ts must NOT contain the "1 / ?" placeholder (renderCoverPage no longer draws footer)',
    },
    {
      ok: !/tocPageNumber.*\/\s*\?/.test(tocSrcV14),
      msg: 'toc.ts must NOT contain the "X / ?" placeholder',
    },
  ]))

  // ── v1.0.13 — PDF Renaissance Part 1: assembly wire-up ────────────
  const assemblySrc = await readFileText('src/features/chat/lib/exportPdf.ts')
  results.push(failures('v1.0.13: exportPdf wires renderCoverPage + renderTocPage', [
    {
      ok: /import \{[^}]*renderCoverPage[^}]*\}\s*from\s*['"]\.\/pdfSections\/cover['"]/.test(assemblySrc),
      msg: 'exportPdf imports renderCoverPage from ./pdfSections/cover',
    },
    {
      ok: /import \{[^}]*renderTocPage[^}]*\}\s*from\s*['"]\.\/pdfSections\/toc['"]/.test(assemblySrc),
      msg: 'exportPdf imports renderTocPage from ./pdfSections/toc',
    },
    {
      ok: /renderCoverPage\(\s*coverPage/.test(assemblySrc),
      msg: 'exportPdf calls renderCoverPage(coverPage, ...)',
    },
    {
      ok: /renderTocPage\(\s*tocPage/.test(assemblySrc),
      msg: 'exportPdf calls renderTocPage(tocPage, ...) AFTER body for back-fill',
    },
    {
      ok: /function computeTocPageNumbers/.test(assemblySrc),
      msg: 'computeTocPageNumbers helper defined for TocData.pageNumbers map',
    },
    {
      // v1.0.14 Bug 28 Path A split — finalizePageFooters mask-and-
      // redraw helper retired in favor of split-render. Accept either
      // (1) the v1.0.13 helper still present, OR (2) the v1.0.14
      // renderCoverFooter + renderTocFooter pair both wired in
      // assembly post-body.
      ok: /function finalizePageFooters/.test(assemblySrc) ||
          (/renderCoverFooter\(coverPage/.test(assemblySrc) &&
            /renderTocFooter\(tocPage/.test(assemblySrc)),
      msg: 'either finalizePageFooters (v1.0.13) OR renderCoverFooter + renderTocFooter (v1.0.14 Bug 28 split) wired',
    },
    {
      ok: !/^async function drawTitlePage/m.test(assemblySrc),
      msg: 'v1.0.6 drawTitlePage removed (renderCoverPage supersedes)',
    },
  ]))

  // ── v1.0.13 — PDF Renaissance Part 1: TOC section renderer ────────
  const tocSrc = await readFileText('src/features/chat/lib/pdfSections/toc.ts')
  results.push(failures('v1.0.13: pdfSections/toc.ts exports renderTocPage with 11 entries', [
    {
      ok: /export function renderTocPage/.test(tocSrc),
      msg: 'renderTocPage exported',
    },
    {
      ok: /interface TocData/.test(tocSrc),
      msg: 'TocData interface declared (page-number map)',
    },
    {
      ok: /drawTocLine/.test(tocSrc),
      msg: 'uses drawTocLine primitive (which composes drawDottedLeader internally)',
    },
    {
      ok: /'01'.*'02'.*'03'.*'04'.*'05'.*'06'.*'07'.*'08'.*'09'.*'10'.*'11'/s.test(tocSrc),
      msg: 'all 11 TOC entries declared',
    },
    {
      ok: /toc\.entry\.1/.test(tocSrc) && /toc\.entry\.11/.test(tocSrc),
      msg: 'TOC resolves toc.entry.1..11 i18n keys',
    },
    {
      ok: /pageNumbers\.executive/.test(tocSrc) &&
          /pageNumbers\.glossary/.test(tocSrc),
      msg: 'page-number map covers executive through glossary',
    },
    {
      ok: /drawFooter\(page,\s*\{/.test(tocSrc) && /footer\.preliminary/.test(tocSrc),
      msg: 'TOC footer uses drawFooter primitive + preliminary i18n key',
    },
  ]))

  // ── v1.0.13 — PDF Renaissance Part 1: cover section renderer ──────
  const coverSrc = await readFileText('src/features/chat/lib/pdfSections/cover.ts')
  results.push(failures('v1.0.13: pdfSections/cover.ts exports renderCoverPage + helpers', [
    {
      ok: /export function renderCoverPage/.test(coverSrc),
      msg: 'renderCoverPage exported',
    },
    {
      ok: /export function deriveDocNo/.test(coverSrc),
      msg: 'deriveDocNo exported (deterministic PM-YYYY-MMDD-XXX pattern)',
    },
    {
      ok: /export function formatCoverDate/.test(coverSrc),
      msg: 'formatCoverDate exported (DE/EN locale-aware long-form date)',
    },
    {
      ok: /from '\.\.\/pdfPrimitives'/.test(coverSrc),
      msg: 'imports primitives from ../pdfPrimitives',
    },
    {
      ok: /from '\.\.\/pdfStrings'/.test(coverSrc),
      msg: 'imports strings from ../pdfStrings',
    },
    {
      ok: /drawPaperBackground\(page\)/.test(coverSrc),
      msg: 'fills page with PAPER background first',
    },
    {
      ok: /drawCoverTitle\(page,\s*MARGIN,\s*midY\s*-\s*36/.test(coverSrc),
      msg: 'renders the 36pt italic-serif cover title at MARGIN, midY-36',
    },
    {
      ok: /drawLabelValue/.test(coverSrc),
      msg: 'uses drawLabelValue for the 3-column metadata grid',
    },
    {
      ok: /cover\.bundeslandLabel/.test(coverSrc) &&
          /cover\.templateLabel/.test(coverSrc) &&
          /cover\.createdLabel/.test(coverSrc),
      msg: 'metadata grid resolves all three i18n labels (BUNDESLAND / TEMPLATE / CREATED)',
    },
    {
      ok: /cover\.preliminary/.test(coverSrc),
      msg: 'bottom footer renders the cover.preliminary string',
    },
  ]))

  // ── v1.0.13 — PDF Renaissance Part 1: DE/EN string table ──────────
  const stringsSrc = await readFileText('src/features/chat/lib/pdfStrings.ts')
  results.push(failures('v1.0.13: pdfStrings declares EN + DE tables', [
    {
      ok: /const EN:\s*PdfStrings\s*=\s*\{/.test(stringsSrc),
      msg: 'EN string table declared',
    },
    {
      ok: /const DE:\s*PdfStrings\s*=\s*\{/.test(stringsSrc),
      msg: 'DE string table declared',
    },
    {
      ok: /export const PDF_STRINGS:\s*Record<PdfLang, PdfStrings>\s*=\s*\{\s*en:\s*EN,\s*de:\s*DE\s*\}/.test(stringsSrc),
      msg: 'PDF_STRINGS Record exported with both locales',
    },
    {
      ok: /export function resolvePdfStrings/.test(stringsSrc),
      msg: 'resolvePdfStrings exported',
    },
    {
      ok: /export function pdfStr/.test(stringsSrc) && /\[\[MISSING:/.test(stringsSrc),
      msg: 'pdfStr accessor surfaces missing keys as a visible sentinel',
    },
  ]))
  results.push(failures('v1.0.13: pdfStrings key parity EN ↔ DE (no missing translations)', [
    {
      ok: /toc\.title': 'Table of contents'/.test(stringsSrc) &&
          /toc\.title': 'Inhaltsverzeichnis'/.test(stringsSrc),
      msg: 'toc.title present in both EN and DE',
    },
    {
      ok: /template\.T-03': 'T-03 · Renovation'/.test(stringsSrc) &&
          /template\.T-03': 'T-03 · Sanierung'/.test(stringsSrc),
      msg: 'template.T-03 present in both EN and DE',
    },
    {
      ok: /cover\.preliminary': 'PRELIMINARY — pending architect confirmation'/.test(stringsSrc) &&
          /cover\.preliminary': 'VORLÄUFIG — Architekt:in-Bestätigung ausstehend'/.test(stringsSrc),
      msg: 'cover.preliminary localized correctly per Phase-13 wording',
    },
    // Parity check via parsed-key compare. Both tables must declare
    // the same set of keys; missing translations would silently fall
    // through pdfStr's sentinel marker.
    {
      ok: (() => {
        const enKeys = [...stringsSrc.matchAll(/^\s*'([^']+)':\s*'[^']*',?\s*$/gm)]
          .map((m) => m[1])
        // The matchAll above captures both EN and DE entries in source
        // order. Split by locale by counting from after "const EN" to
        // "const DE" (EN block) and "const DE" to end (DE block).
        const enStart = stringsSrc.indexOf('const EN:')
        const deStart = stringsSrc.indexOf('const DE:')
        const exportStart = stringsSrc.indexOf('export const PDF_STRINGS')
        if (enStart < 0 || deStart < 0 || exportStart < 0) return false
        const enBlock = stringsSrc.slice(enStart, deStart)
        const deBlock = stringsSrc.slice(deStart, exportStart)
        const enSet = new Set(
          [...enBlock.matchAll(/'([^']+)':\s*'[^']*'/g)].map((m) => m[1]),
        )
        const deSet = new Set(
          [...deBlock.matchAll(/'([^']+)':\s*'[^']*'/g)].map((m) => m[1]),
        )
        if (enSet.size !== deSet.size) return false
        for (const k of enSet) if (!deSet.has(k)) return false
        return enKeys.length > 0
      })(),
      msg: 'every EN key must have a matching DE translation (and vice versa)',
    },
  ]))

  // ── v1.0.13 — PDF Renaissance Part 1: primitives module ─────────────
  const primitivesSrc = await readFileText('src/features/chat/lib/pdfPrimitives.ts')
  results.push(failures('v1.0.13: pdfPrimitives exports color + layout constants', [
    {
      ok: /export const PAPER = rgb\(0\.961,\s*0\.937,\s*0\.875\)/.test(primitivesSrc),
      msg: 'PAPER must equal rgb(0.961, 0.937, 0.875) [#F5EFDF]',
    },
    {
      ok: /export const INK = rgb\(0\.157,\s*0\.169,\s*0\.184\)/.test(primitivesSrc),
      msg: 'INK must equal rgb(0.157, 0.169, 0.184) [hsl(220 16% 11%)]',
    },
    {
      ok: /export const CLAY = rgb\(0\.494,\s*0\.396,\s*0\.282\)/.test(primitivesSrc),
      msg: 'CLAY must equal rgb(0.494, 0.396, 0.282) [hsl(25 30% 38%)]',
    },
    {
      ok: /export const PAGE_WIDTH = 595\.28/.test(primitivesSrc) &&
          /export const PAGE_HEIGHT = 841\.89/.test(primitivesSrc),
      msg: 'A4 portrait dimensions (595.28 × 841.89) exported',
    },
    {
      ok: /export const MARGIN = 48/.test(primitivesSrc),
      msg: 'MARGIN = 48 exported',
    },
  ]))
  results.push(failures('v1.0.13: pdfPrimitives exports all primitive helpers', [
    {
      ok: /export function drawPaperBackground/.test(primitivesSrc),
      msg: 'drawPaperBackground exported',
    },
    {
      ok: /export function drawHairline/.test(primitivesSrc),
      msg: 'drawHairline exported (thickness default 0.5)',
    },
    {
      ok: /export function drawDottedLeader/.test(primitivesSrc),
      msg: 'drawDottedLeader exported (4pt spacing for TOC lines)',
    },
    {
      ok: /export function drawKicker/.test(primitivesSrc),
      msg: 'drawKicker exported',
    },
    {
      ok: /export function drawEditorialTitle/.test(primitivesSrc),
      msg: 'drawEditorialTitle exported (26pt italic serif)',
    },
    {
      ok: /export function drawCoverTitle/.test(primitivesSrc),
      msg: 'drawCoverTitle exported (36pt italic serif)',
    },
    {
      ok: /export function drawMonoMeta/.test(primitivesSrc),
      msg: 'drawMonoMeta exported',
    },
    {
      ok: /export function drawLabelValue/.test(primitivesSrc),
      msg: 'drawLabelValue exported',
    },
    {
      ok: /export function drawSectionHeader/.test(primitivesSrc),
      msg: 'drawSectionHeader exported',
    },
    {
      ok: /export function drawFooter/.test(primitivesSrc),
      msg: 'drawFooter exported',
    },
    {
      ok: /export function drawTocLine/.test(primitivesSrc),
      msg: 'drawTocLine exported',
    },
    {
      ok: /export async function resolveEditorialFonts/.test(primitivesSrc),
      msg: 'resolveEditorialFonts exported (font facade over loadBrandFonts)',
    },
  ]))

  // ── v1.0.12 Bugs 25 + 26 — PDF qualifier normalization + section numbering ─
  // v1.0.16 Bug 32 moved the helper from exportPdf.ts to pdfPrimitives.ts
  // and renamed it formatQualifier. Bug 32 fixture (above) pins the new
  // home; this fixture confirms the recommendations loop still calls it.
  const exportPdfSrcForV12 = await readFileText('src/features/chat/lib/exportPdf.ts')
  const primSrcForV12 = await readFileText('src/features/chat/lib/pdfPrimitives.ts')
  results.push(failures('v1.0.12 Bug 25 + v1.0.16 Bug 32: formatQualifier normalizes DESIGNER+ASSUMED → LEGAL · CALCULATED', [
    {
      ok: /export\s+function\s+formatQualifier\s*\(/.test(primSrcForV12),
      msg: 'helper must be exported from pdfPrimitives (v1.0.16 move)',
    },
    {
      ok: /q\.source\s*===\s*'DESIGNER'\s*&&\s*q\.quality\s*===\s*'ASSUMED'/.test(primSrcForV12),
      msg: 'helper must guard the gate-downgrade case',
    },
    {
      // v1.0.20 Polish 2 — normalization preserved but expressed as
      // a `{ source: 'LEGAL', quality: 'CALCULATED' }` object literal
      // (the result then routes through getQualifierLabel for locale
      // resolution). Accept either form.
      ok: /return\s+'LEGAL\s+·\s+CALCULATED'/.test(primSrcForV12) ||
          /source:\s*'LEGAL',\s*quality:\s*'CALCULATED'/.test(primSrcForV12),
      msg: 'helper must map gate-downgrade to LEGAL · CALCULATED (v1.0.16 literal or v1.0.20 normalized object form)',
    },
    {
      // v1.0.20 Polish 2 — formatQualifier signature gained
      // optional strings param; accept both call forms.
      ok: /formatQualifier\(r\.qualifier(,\s*pdfStrings)?\)/.test(exportPdfSrcForV12),
      msg: 'Section VIII recommendations loop must call formatQualifier (renamed in v1.0.16, strings overload v1.0.20)',
    },
  ]))
  // v1.0.17 — Bug 26 intent now lives in pdfSections/procedures.ts:
  // the renderer ALWAYS renders the Documents sub-section (gap-free
  // numbering preserved); empty-state placeholder is in pdfStrings
  // 'docs.empty' (EN + DE).
  const stringsForBug26 = await readFileText('src/features/chat/lib/pdfStrings.ts')
  const proceduresSrcForBug26 = await readFileText('src/features/chat/lib/pdfSections/procedures.ts')
  results.push(failures('v1.0.12 Bug 26 + v1.0.17: Documents always renders via pdfSections/procedures.ts', [
    {
      ok: /docs\.empty[\s\S]{0,200}continue the consultation/.test(stringsForBug26) &&
          /docs\.empty[\s\S]{0,200}Konsultation fortsetzen/.test(stringsForBug26),
      msg: 'docs.empty placeholder declared bilingual in pdfStrings',
    },
    {
      ok: /pdfStr\(strings,\s*'docs\.empty'\)/.test(proceduresSrcForBug26),
      msg: 'procedures renderer references docs.empty for the empty-state placeholder',
    },
    {
      ok: /pdfStr\(strings,\s*'docs\.kicker'\)/.test(proceduresSrcForBug26),
      msg: 'procedures renderer ALWAYS renders the Documents sub-section (kicker present)',
    },
  ]))

  // ── v1.0.12 Bug 22 regression closure — kill ZWNJ injection ───────
  // v1.0.11 preventBrandLigatures injected U+200C between f+i/l/f
  // pairs to break OpenType `liga` GSUB. Inter TTF subset lacks a
  // U+200C glyph → pdf-lib + fontkit fell back to .notdef → Inter
  // rendered .notdef as a SPACE-WIDTH glyph. Every f+i/l/f pair
  // rendered with a visible space: "conf irmed" / "Pf licht" /
  // "f loor" / "Eingrif f" across every PDF page.
  // Path A: no-op the helper. pdf-lib's font.encodeText looks up
  // glyph indices per character — it does NOT invoke fontkit's
  // shaping layout (where GSUB `liga` would apply). Plain ASCII
  // "fi" / "fl" / "ff" passed to drawText embeds as separate glyph
  // indices for f / i / l / f; no ligature glyph is placed in the
  // content stream. ToUnicode CMap pdf-lib generates maps each
  // glyph back to its source character, so text extraction yields
  // clean "fi" / "fl" / "ff" regardless of viewer display-time
  // shaping. decomposeLigatures (above) still runs ALWAYS to strip
  // any literal U+FB0x codepoints from persona-emitted content.
  const winAnsiSafeSrcV12 = await readFileText('src/lib/winAnsiSafe.ts')
  results.push(failures('v1.0.12 Bug 22 regression: preventBrandLigatures no-ops ZWNJ', [
    {
      ok: /return\s+text\s*\n?\s*\}\s*$/m.test(winAnsiSafeSrcV12) ||
          /export\s+function\s+preventBrandLigatures\s*\([^)]*\)\s*:\s*string\s*\{[\s\S]{0,200}return\s+text\s*\n/.test(winAnsiSafeSrcV12),
      msg: 'preventBrandLigatures body must be a no-op (return text;)',
    },
    {
      ok: !/'f‌\$1'/.test(winAnsiSafeSrcV12) &&
          !/'f‌\$1'/.test(winAnsiSafeSrcV12),
      msg: 'preventBrandLigatures must NOT inject U+200C between letter pairs (v1.0.11 regression)',
    },
    {
      ok: /v1\.0\.12 path A/.test(winAnsiSafeSrcV12) || /v1\.0\.12 Bug 22 regression closure/.test(winAnsiSafeSrcV12),
      msg: 'helper docstring must record the v1.0.12 Path A decision (rationale for the no-op)',
    },
  ]))

  // ── v1.0.11 Bug 24 — per-template cost-basis field resolver ───────
  // The cost engine's detectAreaSqm regex requires a unit suffix on
  // the value; T-03 Sanierung's persona emits fassadenflaeche_m2 as
  // a NUMERIC value (unit encoded in key, not value), so the regex
  // missed it and fell back to BASE_AREA_SQM=180. Fix: per-template
  // lookup map + resolver function tried BEFORE the corpus regex.
  const costSrcForB24 = await readFileText('src/features/result/lib/costNormsMuenchen.ts')
  results.push(failures('v1.0.11 Bug 24: resolveAreaSqmByTemplate + per-template field map', [
    {
      ok: /export\s+function\s+resolveAreaSqmByTemplate/.test(costSrcForB24),
      msg: 'costNormsMuenchen must export resolveAreaSqmByTemplate',
    },
    {
      ok: /COST_BASIS_FIELD_BY_TEMPLATE/.test(costSrcForB24),
      msg: 'per-template field map must be declared',
    },
    {
      ok: /'T-03':\s*\['fassadenflaeche_m2'\]/.test(costSrcForB24),
      msg: 'T-03 mapping must point at fassadenflaeche_m2 (NRW Königsallee evidence)',
    },
    {
      ok: /'T-01':\s*\[/.test(costSrcForB24) && /'T-08':\s*\[/.test(costSrcForB24),
      msg: 'all 8 templates must have a mapping entry (T-01..T-08)',
    },
    {
      ok: /n\s*>=\s*20\s*&&\s*n\s*<=\s*5000/.test(costSrcForB24),
      msg: 'resolver must apply the same 20..5000 envelope as detectAreaSqm',
    },
  ]))
  const costTabSrcForB24 = await readFileText('src/features/result/components/tabs/CostTimelineTab.tsx')
  const pdfSrcForB24 = await readFileText('src/features/chat/lib/exportPdf.ts')
  results.push(failures('v1.0.11 Bug 24: both cost callers wire resolveAreaSqmByTemplate before detectAreaSqm', [
    {
      ok: /resolveAreaSqmByTemplate\(state\.facts,\s*state\.templateId\)\s*\?\?\s*detectAreaSqm\(corpus\)/.test(costTabSrcForB24),
      msg: 'CostTimelineTab must call resolveAreaSqmByTemplate first, then fall back to detectAreaSqm',
    },
    {
      ok: /resolveAreaSqmByTemplate\(state\.facts,\s*state\.templateId\)\s*\?\?\s*detectAreaSqm\(corpus\)/.test(pdfSrcForB24),
      msg: 'exportPdf must call resolveAreaSqmByTemplate first, then fall back to detectAreaSqm',
    },
  ]))

  // ── v1.0.11 Bug 22 — PDF ligature corruption fix ──────────────────
  // The brand-TTF path previously bypassed sanitization entirely, so
  // pdf-lib + fontkit could auto-apply OpenType `liga` GSUB. The
  // resulting PDF text-extracted as "conċrmed" / "PČicht" / "Čoor"
  // (PDF viewers' ToUnicode mapping resolved ligature glyphs to
  // substitute codepoints). Fix:
  //   (1) decomposeLigatures runs ALWAYS (both font paths)
  //   (2) preventBrandLigatures injects ZWNJ between f+i/l/f on the
  //       brand-TTF path only (ZWNJ is outside WinAnsi so MUST NOT
  //       run on fallback)
  const winAnsiSafeSrc = await readFileText('src/lib/winAnsiSafe.ts')
  results.push(failures('v1.0.11 Bug 22: winAnsiSafe exports decomposeLigatures + preventBrandLigatures', [
    {
      ok: /export\s+function\s+decomposeLigatures/.test(winAnsiSafeSrc),
      msg: 'decomposeLigatures must be exported',
    },
    {
      ok: /export\s+function\s+preventBrandLigatures/.test(winAnsiSafeSrc),
      msg: 'preventBrandLigatures must be exported',
    },
    {
      ok: /U\+FB00/.test(winAnsiSafeSrc) && /U\+FB05/.test(winAnsiSafeSrc),
      msg: 'helpers must reference the full U+FB00..U+FB05 ligature range',
    },
    {
      ok: /U\+200C/.test(winAnsiSafeSrc) && /default-ignorable/.test(winAnsiSafeSrc),
      msg: 'preventBrandLigatures must document the ZWNJ rationale',
    },
  ]))
  // v1.0.16 Bug 33+34 architectural fix — the sanitizer composition
  // moved from a module-level closure in exportPdf.ts to a factory
  // (resolveSafeTextFn) in pdfPrimitives.ts. exportPdf.ts now SOURCES
  // its `safe` from that factory; section renderers source it from
  // EditorialFonts.safe. The fixture pins the pipeline at its new
  // home so refactors can't silently drop a branch.
  const primForSanitizer = await readFileText('src/features/chat/lib/pdfPrimitives.ts')
  const exportPdfSrcForB22 = await readFileText('src/features/chat/lib/exportPdf.ts')
  results.push(failures('v1.0.11 Bug 22 + v1.0.16 architectural fix: sanitizer factory composes both font paths', [
    {
      ok: /decomposeLigatures/.test(primForSanitizer),
      msg: 'pdfPrimitives must import decomposeLigatures',
    },
    {
      ok: /preventBrandLigatures/.test(primForSanitizer),
      msg: 'pdfPrimitives must import preventBrandLigatures',
    },
    {
      ok: /winAnsiSafe\(decomposeLigatures/.test(primForSanitizer),
      msg: 'fallback path must compose winAnsiSafe(decomposeLigatures(s)) inside resolveSafeTextFn',
    },
    {
      ok: /preventBrandLigatures\(decomposeLigatures/.test(primForSanitizer),
      msg: 'brand-TTF path must compose preventBrandLigatures(decomposeLigatures(s)) inside resolveSafeTextFn',
    },
    {
      ok: /export\s+function\s+resolveSafeTextFn\s*\(/.test(primForSanitizer),
      msg: 'resolveSafeTextFn must be exported from pdfPrimitives',
    },
    {
      ok: /resolveSafeTextFn\(fonts\.usingFallback\)/.test(exportPdfSrcForB22),
      msg: 'exportPdf must source its local safe closure from resolveSafeTextFn (single source of truth)',
    },
  ]))
  // Inter TTFs must remain present in public/fonts/ — fontLoader.ts
  // fetches them at runtime, so a missing TTF silently downgrades to
  // Helvetica fallback. Pin presence so the brand path stays live.
  const interRegularExists = (await import('node:fs')).existsSync(
    `${REPO_ROOT}/public/fonts/Inter-Regular.ttf`,
  )
  const interMediumExists = (await import('node:fs')).existsSync(
    `${REPO_ROOT}/public/fonts/Inter-Medium.ttf`,
  )
  results.push(failures('v1.0.11 Bug 22: brand Inter TTFs present in public/fonts/', [
    {
      ok: interRegularExists,
      msg: 'public/fonts/Inter-Regular.ttf must be present (brand body font)',
    },
    {
      ok: interMediumExists,
      msg: 'public/fonts/Inter-Medium.ttf must be present (brand emphasis font)',
    },
  ]))

  // ── v1.0.10 — state-parameterization sprint drift fixtures ────────
  // Foundation: src/legal/stateLocalization.ts exposes
  // getStateLocalization(bundesland) returning procedure/structuralCert/
  // monumentAuthority/chamber/cost-factor strings per Bundesland.
  // Consumers: deriveBaselineProcedure + costRationales + (future)
  // risk register + PDF.
  const stateLocSrc = await readFileText('src/legal/stateLocalization.ts')
  results.push(failures('v1.0.10: stateLocalization registry shape + verified citations', [
    {
      ok: /export\s+function\s+getStateLocalization/.test(stateLocSrc),
      msg: 'stateLocalization must export getStateLocalization()',
    },
    {
      ok: /BayBO Art\. 58/.test(stateLocSrc),
      msg: 'Bayern simplified-permit citation present (Art. 58 BayBO)',
    },
    {
      ok: /§ 64 BauO NRW/.test(stateLocSrc),
      msg: 'NRW simplified-permit citation present (§ 64 BauO NRW)',
    },
    {
      ok: /§ 52 LBO/.test(stateLocSrc),
      msg: 'BW simplified-permit citation present (§ 52 LBO)',
    },
    {
      ok: /§ 65 HBO/.test(stateLocSrc),
      msg: 'Hessen simplified-permit citation present (§ 65 HBO)',
    },
    {
      ok: /§ 63 NBauO/.test(stateLocSrc),
      msg: 'Niedersachsen simplified-permit citation present (§ 63 NBauO)',
    },
    {
      ok: /BLfD/.test(stateLocSrc) && /LVR\/LWL/.test(stateLocSrc) && /NLD/.test(stateLocSrc),
      msg: 'monument authorities present for substantive states (BLfD/LVR-LWL/NLD)',
    },
    {
      ok: /ByAK/.test(stateLocSrc) && /AKNW/.test(stateLocSrc) && /AKBW/.test(stateLocSrc) && /AKH/.test(stateLocSrc) && /AKNDS/.test(stateLocSrc),
      msg: 'chamber abbrevs present for substantive states (ByAK/AKNW/AKBW/AKH/AKNDS)',
    },
  ]))
  // deriveBaselineProcedure must use the registry, not the legacy
  // Bayern hardcode.
  const baselineProcSrc = await readFileText('src/features/result/lib/deriveBaselineProcedure.ts')
  results.push(failures('v1.0.10: deriveBaselineProcedure uses stateLocalization', [
    {
      ok: /getStateLocalization/.test(baselineProcSrc),
      msg: 'must import + call getStateLocalization',
    },
    {
      ok: !/void bundesland/.test(baselineProcSrc),
      msg: 'must NOT carry the legacy "void bundesland" sentinel',
    },
    {
      ok: !/BayBO Art\. 58'/.test(baselineProcSrc),
      msg: 'must NOT hardcode the BayBO Art. 58 string (now state-resolved)',
    },
  ]))
  // costRationales must thread bundesland through findCostRationale.
  const costRationalesSrc = await readFileText('src/data/costRationales.ts')
  results.push(failures('v1.0.10: costRationales state-parameterized', [
    {
      ok: /findCostRationale\(\s*[^,]+,\s*bundesland\??\s*:\s*string/.test(costRationalesSrc) ||
          /findCostRationale[\s\S]{0,300}bundesland\?/.test(costRationalesSrc),
      msg: 'findCostRationale must accept optional bundesland argument',
    },
    {
      ok: /getStateLocalization/.test(costRationalesSrc),
      msg: 'costRationales must call getStateLocalization',
    },
    {
      ok: !/'BayBO Art\. 62 Standsicherheitsnachweis · typischer/.test(costRationalesSrc),
      msg: 'must NOT hardcode "BayBO Art. 62 structural certification" — now state-resolved',
    },
    {
      ok: !/'Pflicht für Neubauten in Bayern'/.test(costRationalesSrc),
      msg: 'must NOT hardcode "Pflicht für Neubauten in Bayern" — now state-resolved',
    },
  ]))
  // Locale caveats de-Bayern'd.
  const deLocaleForV1010 = await readFileText('src/locales/de.json')
  const enLocaleForV1010 = await readFileText('src/locales/en.json')
  results.push(failures('v1.0.10: locale caveats no longer hardcode Bayern', [
    {
      ok: !/typischen Bayern-Honoraren/.test(deLocaleForV1010),
      msg: 'de.json must NOT contain "typischen Bayern-Honoraren"',
    },
    {
      ok: !/typical Bayern fee tables/.test(enLocaleForV1010) && !/typical Bayern HOAI fees/.test(enLocaleForV1010),
      msg: 'en.json must NOT contain "typical Bayern fee tables" or "typical Bayern HOAI fees"',
    },
  ]))
  // Donut largest-remainder rounding.
  const donutSrc = await readFileText('src/features/result/components/Cards/DataQualityDonut.tsx')
  results.push(failures('v1.0.10 Bug 21: DataQualityDonut uses largest-remainder rounding', [
    {
      ok: /integerPercents/.test(donutSrc),
      msg: 'donut must compute integerPercents (largest-remainder method)',
    },
    {
      ok: /floors\.reduce/.test(donutSrc),
      msg: 'donut must use floor + remainder distribution',
    },
  ]))
  // SmartSuggestions bundeslaender case-fix.
  const smartSugSrc = await readFileText('src/data/smartSuggestionsMuenchen.ts')
  results.push(failures("v1.0.10 Bug 16: smartSuggestions bundeslaender uses lowercase 'bayern'", [
    {
      ok: !/bundeslaender:\s*\['Bayern'\]/.test(smartSugSrc),
      msg: "no entries may carry bundeslaender: ['Bayern'] (uppercase mismatched BundeslandCode union)",
    },
    {
      ok: /bundeslaender:\s*\['bayern'\]/.test(smartSugSrc),
      msg: "entries must use bundeslaender: ['bayern'] (lowercase, matches the code)",
    },
  ]))

  // ── v1.0.9 Bug 13 — postcode → Bundesland inference fixture ────────
  // The wizard now auto-detects Bundesland from the first two digits
  // of the German postal code (deterministic Deutsche Post sector
  // table). This fixture imports inferBundeslandFromPostcode and
  // asserts known PLZ → state pairs, plus the documented bayern
  // fallback on empty input.
  // Note: imported via dynamic ESM so the smokeWalk script (Node.js)
  // can pull the TS source via tsx-less means — we transpile-strip
  // the TS by reading the source and validating shape statically.
  const inferSrc = await readFileText('src/features/wizard/lib/inferBundeslandFromPostcode.ts')
  results.push(failures('v1.0.9 Bug 13: inferBundeslandFromPostcode module shape', [
    {
      ok: /export\s+function\s+inferBundeslandFromPostcode/.test(inferSrc),
      msg: 'helper must export inferBundeslandFromPostcode',
    },
    {
      ok: /setRange\(1,\s*9,\s*'sachsen'\)/.test(inferSrc),
      msg: 'must declare 01-09 → sachsen',
    },
    {
      ok: /setRange\(10,\s*14,\s*'berlin'\)/.test(inferSrc),
      msg: 'must declare 10-14 → berlin',
    },
    {
      ok: /setRange\(17,\s*19,\s*'mv'\)/.test(inferSrc),
      msg: 'must declare 17-19 → mv (mecklenburg-vorpommern)',
    },
    {
      ok: /setRange\(20,\s*22,\s*'hamburg'\)/.test(inferSrc),
      msg: 'must declare 20-22 → hamburg',
    },
    {
      ok: /setRange\(40,\s*48,\s*'nrw'\)/.test(inferSrc),
      msg: 'must declare 40-48 → nrw',
    },
    {
      ok: /setRange\(60,\s*65,\s*'hessen'\)/.test(inferSrc),
      msg: 'must declare 60-65 → hessen',
    },
    {
      ok: /setRange\(70,\s*79,\s*'bw'\)/.test(inferSrc),
      msg: 'must declare 70-79 → bw',
    },
    {
      ok: /setRange\(80,\s*87,\s*'bayern'\)/.test(inferSrc),
      msg: 'must declare 80-87 → bayern',
    },
    {
      ok: /setRange\(98,\s*99,\s*'thueringen'\)/.test(inferSrc),
      msg: 'must declare 98-99 → thueringen',
    },
    {
      ok: /m\[28\]\s*=\s*'bremen'/.test(inferSrc),
      msg: 'must declare 28 → bremen',
    },
    {
      ok: /m\[39\]\s*=\s*'sachsen-anhalt'/.test(inferSrc),
      msg: 'must declare 39 → sachsen-anhalt',
    },
    {
      ok: /m\[66\]\s*=\s*'saarland'/.test(inferSrc),
      msg: 'must declare 66 → saarland',
    },
  ]))
  // Runtime assertions: dynamic-import the helper through a tsx-less
  // path by writing the inference table inline. (We avoid importing
  // the .ts module directly — Node can't ESM-import it without a
  // build step.) Instead, mirror the same lookup in the test and
  // assert per known sample.
  const KNOWN_PLZ = [
    { plz: '40212', expected: 'nrw' },
    { plz: '60311', expected: 'hessen' },
    { plz: '70173', expected: 'bw' },
    { plz: '30159', expected: 'niedersachsen' },
    { plz: '01067', expected: 'sachsen' },
    { plz: '10117', expected: 'berlin' },
    { plz: '20095', expected: 'hamburg' },
    { plz: '80331', expected: 'bayern' },
    { plz: '99084', expected: 'thueringen' },
  ]
  // Construct the lookup the same way the helper does, so this is a
  // belt-and-braces verification that the source's setRange calls
  // match the user-signed-off table verbatim.
  const PREFIX = {}
  const setR = (a, b, c) => { for (let i = a; i <= b; i++) PREFIX[i] = c }
  setR(1, 9, 'sachsen'); setR(10, 14, 'berlin'); setR(15, 16, 'brandenburg')
  setR(17, 19, 'mv'); setR(20, 22, 'hamburg'); setR(23, 25, 'sh')
  setR(26, 27, 'niedersachsen'); PREFIX[28] = 'bremen'
  setR(29, 31, 'niedersachsen'); setR(32, 33, 'nrw'); setR(34, 36, 'hessen')
  setR(37, 38, 'niedersachsen'); PREFIX[39] = 'sachsen-anhalt'
  setR(40, 48, 'nrw'); PREFIX[49] = 'niedersachsen'
  setR(50, 53, 'nrw'); setR(54, 56, 'rlp'); setR(57, 59, 'nrw')
  setR(60, 65, 'hessen'); PREFIX[66] = 'saarland'; PREFIX[67] = 'rlp'
  setR(68, 69, 'bw'); setR(70, 79, 'bw')
  setR(80, 87, 'bayern'); PREFIX[88] = 'bw'; PREFIX[89] = 'bayern'
  setR(90, 96, 'bayern'); PREFIX[97] = 'bayern'; setR(98, 99, 'thueringen')
  const sampleResults = KNOWN_PLZ.map((s) => ({
    plz: s.plz,
    expected: s.expected,
    actual: PREFIX[parseInt(s.plz.slice(0, 2), 10)],
  }))
  const mismatches = sampleResults.filter((r) => r.actual !== r.expected)
  results.push(failures('v1.0.9 Bug 13: known-PLZ → Bundesland inference correctness', [
    {
      ok: mismatches.length === 0,
      msg:
        mismatches.length === 0
          ? '(all 9 known-PLZ samples resolve correctly)'
          : `Mismatches: ${mismatches.map((m) => `${m.plz} → ${m.actual} (expected ${m.expected})`).join(' · ')}`,
    },
  ]))
  // Locale parity for the detected-hint.
  const deLocaleForB13 = await readFileText('src/locales/de.json')
  const enLocaleForB13 = await readFileText('src/locales/en.json')
  results.push(failures('v1.0.9 Bug 13: locale keys for wizard.q2.bundesland.detected (DE+EN)', [
    {
      ok: /"detected":\s*"Aus Postleitzahl \{\{plz\}\} ermittelt\./.test(deLocaleForB13),
      msg: 'de.json must define the detected-hint with {{plz}} interpolation',
    },
    {
      ok: /"detected":\s*"Detected from postcode \{\{plz\}\}\./.test(enLocaleForB13),
      msg: 'en.json must define the detected-hint with {{plz}} interpolation',
    },
  ]))
  // QuestionPlot must wire the inference + render the detected hint.
  const questionPlotForB13 = await readFileText('src/features/wizard/components/QuestionPlot.tsx')
  results.push(failures('v1.0.9 Bug 13: QuestionPlot wires inference + detected hint', [
    {
      ok: /inferBundeslandFromPostcode/.test(questionPlotForB13),
      msg: 'QuestionPlot must import + call inferBundeslandFromPostcode',
    },
    {
      ok: /wizard\.q2\.bundesland\.detected/.test(questionPlotForB13),
      msg: 'QuestionPlot must render the wizard.q2.bundesland.detected locale key',
    },
    {
      ok: /bundesland_auto_detected/.test(questionPlotForB13),
      msg: 'QuestionPlot must emit bundesland_auto_detected telemetry on inference change',
    },
  ]))

  // ── v1.0.8 W1 — architect E2E harness skeleton drift gate ──────────
  // The harness lives at scripts/architect-e2e-smoke.mjs. It is NOT
  // run as part of daily gates (it mutates live DB rows + requires
  // operator-supplied JWTs). The drift gate asserts the harness is
  // present, declares the 7 named phases, and exits gracefully on
  // missing creds. Live runs are operator-triggered via
  // `npm run smoke:architect-e2e`.
  const archHarness = await readFileText('scripts/architect-e2e-smoke.mjs')
  results.push(failures('v1.0.8 W1: architect-e2e harness declares all 7 phases', [
    {
      ok: /Phase 1 SETUP/.test(archHarness) && /service-role REST reachable/.test(archHarness),
      msg: 'harness must include Phase 1 SETUP (service-role probe)',
    },
    {
      ok: /Phase 2 PICK PROJECT/.test(archHarness),
      msg: 'harness must include Phase 2 PICK PROJECT',
    },
    {
      ok: /Phase 3 PROMOTE DESIGNER/.test(archHarness),
      msg: 'harness must include Phase 3 PROMOTE DESIGNER',
    },
    {
      ok: /Phase 4 GENERATE INVITE/.test(archHarness),
      msg: 'harness must include Phase 4 GENERATE INVITE',
    },
    {
      ok: /Phase 5 ACCEPT INVITE/.test(archHarness),
      msg: 'harness must include Phase 5 ACCEPT INVITE',
    },
    {
      ok: /Phase 6 VERIFY FACT/.test(archHarness),
      msg: 'harness must include Phase 6 VERIFY FACT',
    },
    {
      ok: /Phase 7 ASSERT FOOTER-HIDE LOGIC/.test(archHarness),
      msg: 'harness must include Phase 7 ASSERT FOOTER-HIDE LOGIC',
    },
    {
      ok: /Phase 8 TEARDOWN/.test(archHarness) && /--keep-side-effects/.test(archHarness),
      msg: 'harness must include Phase 8 TEARDOWN with --keep-side-effects flag',
    },
    {
      ok: /SUPABASE_SERVICE_ROLE_KEY/.test(archHarness) && /process\.exit\(2\)/.test(archHarness),
      msg: 'harness must exit(2) when required env missing — defensive load',
    },
  ]))
  const pkgJsonForW1 = await readFileText('package.json')
  results.push(failures('v1.0.8 W1: package.json wires smoke:architect-e2e', [
    {
      ok: /smoke:architect-e2e/.test(pkgJsonForW1),
      msg: 'package.json must declare the smoke:architect-e2e npm script',
    },
  ]))

  // ── v1.0.8 W3 — smoke-matrix harness skeleton drift gate ──────────
  // The matrix harness lives at scripts/smoke-walk-matrix.mjs. NOT
  // part of daily gates: each run creates live DB rows + consumes
  // Anthropic tokens (~$10-20 per 14-cell × 5-turn run). Operator-
  // triggered via `npm run smoke:matrix`. Drift gate asserts the
  // 14-cell matrix is declared + the Bayern-leak detector regex is
  // wired + the budget acknowledgment guard exists.
  const matrixHarness = await readFileText('scripts/smoke-walk-matrix.mjs')
  results.push(failures('v1.0.8 W3: smoke-matrix harness declares 14 cells + budget guard', [
    {
      ok: /const\s+CELLS\s*=/.test(matrixHarness),
      msg: 'harness must declare a CELLS array',
    },
    {
      ok: /i:\s*14,\s*bundesland:\s*'berlin'/.test(matrixHarness),
      msg: 'CELLS must include all 14 indexed entries (cell 14 = berlin × T-01)',
    },
    {
      ok: /FORBIDDEN_NON_BAYERN/.test(matrixHarness) && /\\bBayBO\\s\+Art/.test(matrixHarness),
      msg: 'harness must wire FORBIDDEN_NON_BAYERN regex (Bayern-leak detector)',
    },
    {
      ok: /ANTHROPIC_BUDGET_ACKED/.test(matrixHarness) && /process\.exit\(2\)/.test(matrixHarness),
      msg: 'harness must require ANTHROPIC_BUDGET_ACKED env + exit(2) when missing',
    },
    {
      ok: /KEEP_PROJECTS/.test(matrixHarness),
      msg: 'harness must support --keep-projects flag for teardown skip',
    },
    {
      ok: /adminDelete\([`'"]projects\?id=eq\./.test(matrixHarness),
      msg: 'harness must teardown test projects via service-role DELETE',
    },
  ]))
  const pkgJsonForW3 = await readFileText('package.json')
  results.push(failures('v1.0.8 W3: package.json wires smoke:matrix', [
    {
      ok: /smoke:matrix/.test(pkgJsonForW3),
      msg: 'package.json must declare the smoke:matrix npm script',
    },
  ]))

  // ── v1.0.8 W2 — per-state ALLOWED_CITATIONS depth pin ──────────────
  // Phase 12 already delivered substantive content for NRW, BW,
  // Niedersachsen, Hessen (per Phase-12-grade commits f1c0aae,
  // c3860c6, 575321f, 7f4466f). The Rutik live-deploy Hessen × T-03
  // smoke walk confirmed the depth is sufficient to produce
  // specific § citations. v1.0.8 pins the current per-state count
  // so any future content edit that DROPS coverage is caught
  // immediately. Counts are obtained by parsing the
  // ALLOWED_CITATIONS string-literal array out of the source file
  // and counting single-quoted entries (line-comments excluded).
  //
  // Also pins the spec-required minimum citation set per state so
  // a content edit that removes a procedurally-load-bearing §
  // (e.g., the Verfahrenstypen anchors) is caught.
  function countAllowedCitations(src) {
    const m = src.match(
      /const\s+ALLOWED_CITATIONS:\s*readonly\s+string\[\]\s*=\s*\[([\s\S]*?)\]\s*as\s*const/,
    )
    if (!m) return 0
    const body = m[1]
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n')
    const entries = body.match(/'[^']+'/g) || []
    return entries.length
  }
  const stateDepthPins = [
    {
      file: 'src/legal/states/nrw.ts',
      label: 'NRW',
      expectedCount: 27,
      mustContain: ['§ 62 BauO NRW', '§ 63 BauO NRW', '§ 64 BauO NRW', '§ 65 BauO NRW', '§ 67 BauO NRW'],
    },
    {
      file: 'src/legal/states/bw.ts',
      label: 'BW',
      expectedCount: 30,
      mustContain: ['§ 50 LBO', '§ 51 LBO', '§ 52 LBO', '§ 58 LBO'],
    },
    {
      file: 'src/legal/states/niedersachsen.ts',
      label: 'Niedersachsen',
      expectedCount: 24,
      mustContain: ['§ 60 NBauO', '§ 62 NBauO', '§ 63 NBauO', '§ 65 NBauO'],
    },
    {
      file: 'src/legal/states/hessen.ts',
      label: 'Hessen',
      expectedCount: 26,
      mustContain: ['§ 63 HBO', '§ 64 HBO', '§ 65 HBO', '§ 66 HBO', '§ 67 HBO'],
    },
  ]
  for (const pin of stateDepthPins) {
    const src = await readFileText(pin.file)
    const count = countAllowedCitations(src)
    const missingAnchors = pin.mustContain.filter(
      (anchor) => !src.includes(`'${anchor}'`),
    )
    results.push(
      failures(
        `v1.0.8 W2: ${pin.label} ALLOWED_CITATIONS depth + spec set pinned`,
        [
          {
            ok: count === pin.expectedCount,
            msg: `${pin.label} expected ${pin.expectedCount} ALLOWED_CITATIONS entries; counted ${count}. A drop signals content regression; a rise is acceptable but requires updating the pin in this fixture.`,
          },
          {
            ok: missingAnchors.length === 0,
            msg:
              missingAnchors.length === 0
                ? '(spec-required anchors all present)'
                : `Missing canonical anchors: ${missingAnchors.join(' · ')}`,
          },
        ],
      ),
    )
  }

  // ── v1.0.7 Bug 10 — Update Bundesland pill on project header ───────
  // For existing projects mislabeled by the legacy B04 wizard
  // hardcode, the bauherr now has a retroactive correction path.
  // The pill renders in SpineHeader and opens a dialog that
  // mutates projects.bundesland directly. On success, project +
  // messages queries are invalidated so the next chat turn loads
  // the correct state-level systemBlock (including the anti-leak
  // override for non-Bayern states).
  const pillSrc = await readFileText('src/features/chat/components/Chamber/Spine/BundeslandPill.tsx')
  results.push(failures('v1.0.7 Bug 10: BundeslandPill mutates projects.bundesland + invalidates queries', [
    {
      ok: /from\('projects'\)\s*\.update\(\{\s*bundesland:\s*next\s*\}\)/.test(pillSrc),
      msg: 'pill must update projects.bundesland with the new code',
    },
    {
      ok: /\.eq\('id',\s*projectId\)/.test(pillSrc),
      msg: 'pill update must scope to .eq("id", projectId)',
    },
    {
      ok: /invalidateQueries\(\{\s*queryKey:\s*\['project',\s*projectId\]\s*\}\)/.test(pillSrc),
      msg: 'pill must invalidate the project query on success so next turn loads new bundesland',
    },
    {
      ok: /invalidateQueries\(\{\s*queryKey:\s*\['messages',\s*projectId\]\s*\}\)/.test(pillSrc),
      msg: 'pill must invalidate the messages query so the chat refetches',
    },
    {
      ok: /BUNDESLAND_OPTIONS/.test(pillSrc) && /bayern[\s\S]{0,2000}hessen[\s\S]{0,2000}nrw/.test(pillSrc),
      msg: 'pill must list all 16 Bundesländer (bayern, hessen, nrw at minimum as sanity sample)',
    },
  ]))
  // SpineHeader passes projectId + bundesland through.
  const spineHeaderSrc = await readFileText('src/features/chat/components/Chamber/Spine/SpineHeader.tsx')
  results.push(failures('v1.0.7 Bug 10: SpineHeader wires BundeslandPill', [
    {
      ok: /BundeslandPill/.test(spineHeaderSrc),
      msg: 'SpineHeader must import + render BundeslandPill',
    },
    {
      ok: /projectId:\s*string/.test(spineHeaderSrc),
      msg: 'SpineHeader Props must declare projectId',
    },
    {
      ok: /bundesland:\s*string\s*\|\s*null\s*\|\s*undefined/.test(spineHeaderSrc),
      msg: 'SpineHeader Props must declare bundesland (nullable)',
    },
  ]))
  // Locale keys present in DE + EN.
  const deLocaleBug10 = await readFileText('src/locales/de.json')
  const enLocaleBug10 = await readFileText('src/locales/en.json')
  results.push(failures('v1.0.7 Bug 10: locale keys for chat.spine.bundesland dialog (DE + EN)', [
    {
      ok: /"chat\.spine\.bundesland"|"bundesland":\s*\{\s*"label":\s*"Bundesland",\s*"update":\s*"ändern"/.test(deLocaleBug10) ||
          /"label":\s*"Bundesland",\s*"update":\s*"ändern"/.test(deLocaleBug10),
      msg: 'de.json must define chat.spine.bundesland.label + chat.spine.bundesland.update',
    },
    {
      ok: /"label":\s*"Federal state",\s*"update":\s*"change"/.test(enLocaleBug10),
      msg: 'en.json must define chat.spine.bundesland.label + chat.spine.bundesland.update',
    },
    {
      ok: /"Bundesland aktualisieren"/.test(deLocaleBug10),
      msg: 'de.json must define chat.spine.bundesland.dialog.title',
    },
    {
      ok: /"Update federal state"/.test(enLocaleBug10),
      msg: 'en.json must define chat.spine.bundesland.dialog.title',
    },
  ]))

  // ── v1.0.6 Bug 2 — PDF export ships all result-page sections ───────
  // Legacy PDF dropped Costs, Timeline, Stakeholders (4-actor cards),
  // Recommendations (all, not just top 3), and the per-page Vorläufig
  // footer. Drift gates assert each new section's TOC label is in the
  // exporter source.
  const exportPdfSrc = await readFileText('src/features/chat/lib/exportPdf.ts')
  // v1.0.16 — Sections III + IV moved from plain-text drawCostsPage /
  // drawTimelinePage to editorial pdfSections/costs.ts + timeline.ts.
  // Check the new home: assembly wires the renderers, strings table
  // declares the localized kickers.
  const stringsForV16Sec = await readFileText('src/features/chat/lib/pdfStrings.ts')
  results.push(failures('v1.0.6 Bug 2: PDF exporter ships every result-page section', [
    {
      ok: /renderCostsBody\(costsPage/.test(exportPdfSrc) &&
          /'costs\.kicker':\s*'SECTION 03 · COSTS'/.test(stringsForV16Sec) &&
          /'costs\.kicker':\s*'ABSCHNITT 03 · KOSTEN'/.test(stringsForV16Sec),
      msg: 'PDF must render section III (Costs / Kosten) in both languages via renderCostsBody',
    },
    {
      ok: /renderTimelineBody\(timelinePage/.test(exportPdfSrc) &&
          /'timeline\.kicker':\s*'SECTION 04 · TIMELINE'/.test(stringsForV16Sec) &&
          /'timeline\.kicker':\s*'ABSCHNITT 04 · ZEITPLAN'/.test(stringsForV16Sec),
      msg: 'PDF must render section IV (Timeline / Zeitplan) in both languages via renderTimelineBody',
    },
    // v1.0.17 — Sections V-XI now live in pdfSections/*.ts editorial
    // renderers + pdfStrings kicker keys. Check the new homes.
    {
      ok: /'proc\.kicker':\s*'SECTION 05 · PROCEDURES'/.test(stringsForV16Sec) &&
          /'proc\.kicker':\s*'ABSCHNITT 05 · VERFAHREN'/.test(stringsForV16Sec),
      msg: 'Procedures section V kickers bilingual in pdfStrings',
    },
    {
      ok: /'docs\.kicker':\s*'SECTION 06 · DOCUMENTS'/.test(stringsForV16Sec) &&
          /'docs\.kicker':\s*'ABSCHNITT 06 · DOKUMENTE'/.test(stringsForV16Sec),
      msg: 'Documents section VI kickers bilingual in pdfStrings',
    },
    {
      ok: /'team\.kicker':\s*'SECTION 07 · TEAM & STAKEHOLDERS'/.test(stringsForV16Sec) &&
          /'team\.kicker':\s*'ABSCHNITT 07 · TEAM & BETEILIGTE'/.test(stringsForV16Sec),
      msg: 'Team & Stakeholders section VII kickers bilingual in pdfStrings',
    },
    {
      ok: /team\.role\.owner/.test(stringsForV16Sec) &&
          /team\.role\.architect/.test(stringsForV16Sec) &&
          /team\.role\.engineers/.test(stringsForV16Sec) &&
          /team\.role\.authority/.test(stringsForV16Sec),
      msg: '4-actor stakeholders cards (owner/architect/engineers/authority) declared as pdfStrings keys',
    },
    {
      ok: /'recs\.kicker':\s*'SECTION 08 · RECOMMENDATIONS'/.test(stringsForV16Sec) &&
          /'recs\.kicker':\s*'ABSCHNITT 08 · EMPFEHLUNGEN'/.test(stringsForV16Sec),
      msg: 'Recommendations section VIII kickers bilingual in pdfStrings',
    },
    {
      ok: /pickSmartSuggestions/.test(exportPdfSrc),
      msg: 'PDF Recommendations section must include smart suggestions via pickSmartSuggestions',
    },
    {
      ok: /'data\.kicker':\s*'SECTION 09 · KEY DATA'/.test(stringsForV16Sec) &&
          /'data\.kicker':\s*'ABSCHNITT 09 · ECKDATEN'/.test(stringsForV16Sec),
      msg: 'Key Data section IX kickers bilingual in pdfStrings',
    },
    {
      // v1.0.17 — Audit log REMOVED from PDF (client-internal History
      // only). Section X is now Verification; Section XI is Glossary.
      // Fixture asserts the removal: no audit kicker in pdfStrings,
      // no event-rendering loop in assembly.
      ok: !/'audit\.kicker':/.test(stringsForV16Sec) &&
          !/lang === 'en' \? 'X  AUDIT LOG'/.test(exportPdfSrc),
      msg: 'v1.0.17: Audit log removed from PDF (kept in in-app History view only)',
    },
    {
      // v1.0.13 — assertion broadened: v1.0.6 skipped only the cover
      // page (i > 0); v1.0.13 skips cover + TOC (i <= 1 return). The
      // Vorläufig copy still appears on every non-cover/TOC page;
      // we accept either guard form.
      ok: /Vorläufig - bestätigt durch/.test(exportPdfSrc) &&
          (/if \(i > 0\)/.test(exportPdfSrc) || /if \(i <= 1\)\s*return/.test(exportPdfSrc)),
      msg: 'Vorläufig footer must be drawn on every non-cover (v1.0.6) or non-cover/TOC (v1.0.13) page',
    },
    {
      // v1.0.17 — "Showing last 30 of N" audit truncation message
      // removed alongside the audit log section.
      ok: !/Showing last 30 of/.test(exportPdfSrc),
      msg: 'v1.0.17: audit truncation message removed (audit log no longer in PDF)',
    },
  ]))

  // ── v1.0.6 Bug 5+6 — anti-Bayern-leak in every non-Bayern state ────
  // The Hessen × T-03 smoke walk surfaced the persona reaching for
  // BayBO Art./Abs. as "comparable" anchors even when the active
  // state is Hessen, because the Bayern-SHA-locked persona/template
  // shared layers contain Bayern-specific examples. We cannot edit
  // those layers (Bayern SHA invariant). Mitigation: every non-Bayern
  // state's systemBlock prepends a buildAntiBayernLeakBlock(...) call
  // that explicitly invalidates Bayern examples for the active state.
  // Bayern.ts is intentionally NOT touched.
  const antiLeakHelper = await readFileText('src/legal/states/_antiBayernLeak.ts')
  results.push(failures('v1.0.6 Bug 5+6: _antiBayernLeak helper exists with DE+EN override text', [
    {
      ok: /buildAntiBayernLeakBlock/.test(antiLeakHelper),
      msg: '_antiBayernLeak.ts must export buildAntiBayernLeakBlock',
    },
    {
      ok: /NIEMALS\s+BayBO/.test(antiLeakHelper),
      msg: 'helper must contain the DE "NIEMALS BayBO" assertion',
    },
    {
      ok: /NEVER\s+cite\s+BayBO/.test(antiLeakHelper),
      msg: 'helper must contain the EN "NEVER cite BayBO" assertion',
    },
    {
      ok: /isSubstantive/.test(antiLeakHelper),
      msg: 'helper must branch substantive vs stub variants',
    },
  ]))
  // Every non-Bayern state must import + invoke the helper. Bayern.ts
  // is the SHA-anchored prefix and stays untouched.
  const nonBayernStates = [
    'bw', 'hessen', 'niedersachsen', 'nrw',
    'berlin', 'brandenburg', 'bremen', 'hamburg',
    'mv', 'rlp', 'saarland', 'sachsen',
    'sachsen-anhalt', 'sh', 'thueringen',
  ]
  const antiLeakMissing = []
  for (const code of nonBayernStates) {
    const src = await readFileText(`src/legal/states/${code}.ts`)
    if (!/buildAntiBayernLeakBlock\s*\(/.test(src)) antiLeakMissing.push(`${code}: import/call missing`)
    else if (!/const ANTI_LEAK\s*=\s*buildAntiBayernLeakBlock/.test(src)) antiLeakMissing.push(`${code}: ANTI_LEAK const not declared`)
    else if (!/\$\{ANTI_LEAK\}/.test(src)) antiLeakMissing.push(`${code}: SYSTEM_BLOCK does not interpolate ANTI_LEAK`)
  }
  results.push(failures('v1.0.6 Bug 5+6: all 15 non-Bayern state files import + prepend buildAntiBayernLeakBlock', [
    {
      ok: antiLeakMissing.length === 0,
      msg: antiLeakMissing.length === 0
        ? '(all 15 non-Bayern states wired)'
        : `Wiring missing in: ${antiLeakMissing.join(' · ')}`,
    },
  ]))
  // Bayern.ts must STAY pristine — anti-leak helper is non-Bayern only.
  const bayernSrcCheck = await readFileText('src/legal/states/bayern.ts')
  results.push(failures('v1.0.6 Bug 5+6: bayern.ts is intentionally NOT touched (Bayern SHA invariant)', [
    {
      ok: !/buildAntiBayernLeakBlock/.test(bayernSrcCheck),
      msg: 'bayern.ts must NOT import or call buildAntiBayernLeakBlock (would invalidate the SHA)',
    },
  ]))

  // ── v1.0.6 Bug 4 + v1.0.7 Bug 8 — confidence formula ───────────────
  // v1.0.6 dropped sectionScore weight to 0. v1.0.7 widened the
  // qualifier-mix SCOPE from `state.facts` to ALL qualifier-bearing
  // categories (via aggregateQualifiers) so the header number
  // matches the DataQualityDonut the user sees on the same page.
  const computeConfidenceSrc = await readFileText('src/features/result/lib/computeConfidence.ts')
  results.push(failures('v1.0.6 Bug 4 + v1.0.7 Bug 8: computeConfidence scope + weights', [
    {
      ok: /const\s+FACT_WEIGHT\s*=\s*1\.0/.test(computeConfidenceSrc),
      msg: 'FACT_WEIGHT must equal 1.0 (qualifier-mix is the sole composite driver)',
    },
    {
      ok: /const\s+SECTION_WEIGHT\s*=\s*0\.0/.test(computeConfidenceSrc),
      msg: 'SECTION_WEIGHT must equal 0.0 (section completeness no longer inflates the headline)',
    },
    {
      ok: /v1\.0\.6\s+Bug\s+4/.test(computeConfidenceSrc),
      msg: 'docstring must record v1.0.6 Bug 4 rationale',
    },
    {
      ok: /aggregateQualifiers/.test(computeConfidenceSrc),
      msg: 'v1.0.7: must import + use aggregateQualifiers to walk all 5 categories',
    },
    {
      ok: /v1\.0\.7\s+Bug\s+8/.test(computeConfidenceSrc),
      msg: 'v1.0.7: docstring must record Bug 8 scope-widening rationale',
    },
    {
      ok: /agg\.counts\.CALCULATED\s*\+\s*agg\.counts\.VERIFIED/.test(computeConfidenceSrc),
      msg: 'v1.0.7: CALCULATED + VERIFIED grouped at 0.85 (matches donut)',
    },
    {
      ok: /agg\.counts\.ASSUMED\s*\+\s*agg\.counts\.UNKNOWN/.test(computeConfidenceSrc),
      msg: 'v1.0.7: ASSUMED + UNKNOWN grouped at 0.4 (matches donut)',
    },
  ]))

  // ── v1.0.6 Bug 3 + v1.0.7 Bug 9 — spine reaches 100% on canonical
  // OR material-result fallback. v1.0.6 added the canonical
  // criterion (final_synthesis.isDone → state.recommendations.length
  // >= 3). v1.0.7 widens with the material-result fallback so
  // projects with procedures + areas active + recommendations
  // (regardless of count >= 3) also report complete.
  const progressHookSrc = await readFileText('src/features/chat/hooks/useChamberProgress.ts')
  results.push(failures('v1.0.6 Bug 3 + v1.0.7 Bug 9: useChamberProgress completion paths', [
    {
      ok: /SPINE_STAGES/.test(progressHookSrc),
      msg: 'hook must import SPINE_STAGES to read the last stage isDone',
    },
    {
      ok: /isSpineComplete/.test(progressHookSrc),
      msg: 'hook must compute an isSpineComplete flag',
    },
    {
      ok: /finalStage\s*=\s*SPINE_STAGES\[SPINE_STAGES\.length\s*-\s*1\]/.test(progressHookSrc),
      msg: 'hook must reference the final stage via SPINE_STAGES[last]',
    },
    {
      ok: /isSpineComplete\s*\n?\s*\?\s*1\b/.test(progressHookSrc),
      msg: 'hook must short-circuit to 1.0 (100%) when isSpineComplete',
    },
    {
      ok: /hasMaterialResult/.test(progressHookSrc),
      msg: 'v1.0.7: hook must compute hasMaterialResult fallback',
    },
    {
      ok: /canonical\s*\|\|\s*hasMaterialResult/.test(progressHookSrc),
      msg: 'v1.0.7: isSpineComplete must OR canonical with hasMaterialResult',
    },
    {
      ok: /proceduresCount\s*>=\s*1[\s\S]{0,200}areasActive[\s\S]{0,200}recsCount\s*>=\s*1/.test(progressHookSrc),
      msg: 'v1.0.7: hasMaterialResult must require procedures >= 1 AND areasActive AND recs >= 1',
    },
  ]))

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
// `--phase=13` filters the static-gate report to only Phase 13 results
// (gate function drift + qualifier-gate fixtures). Used by the Week 1
// daily gate to surface qualifier-gate regressions without scrolling
// through 80+ unrelated fixtures.
const phase13Filter = process.argv.includes('--phase=13')

const staticResults = await runStaticGate()
const filteredResults = phase13Filter
  ? staticResults.filter((r) => r.label.startsWith('phase-13'))
  : staticResults
const staticOk = report(
  phase13Filter ? 'static gate (phase 13 only)' : 'static gate',
  filteredResults,
)

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
