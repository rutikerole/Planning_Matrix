// ───────────────────────────────────────────────────────────────────────
// verify:forbidden-paragraphs — Phase-5 / audit-remediation m4/W10.
//
// The Bucket-C authors documented (in stateOverrides.ts comments + the
// ACKNOWLEDGED_OVERRIDES preamble) that certain enforcement / admin-meta
// §§ are INTENTIONALLY OMITTED from client-facing cell prose. Examples:
//
//   • § 79 BauO Bln / § 79 NBauO etc.  — Beseitigung / Nutzungsuntersagung
//   • § 80 BauO Bln / § 80 BbgBO etc.  — Beseitigung von Anlagen
//   • § 81 BbgBO                       — Anpassung bestehender Anlagen
//   • § 82 BbgBO / § 87 ThürBO         — Bauüberwachung
//   • § 73a LBO BW                     — admin meta on Technische Baubest.
//   • § 85a LBO SH / § 88a SächsBO …   — TBs / Technische Baubestimmungen
//   • § 58a LBO SH (self-flagged unverifiable in corpus)
//   • § 86 BauO LSA  (self-flagged Phase-B caution)
//   • § 98 ThürBO    (self-flagged Phase-B caution)
//
// The discipline was a COMMENT, not a structural guard. This gate
// encodes the discipline so a future author can't silently re-introduce
// an enforcement § into client-facing prose. FORBIDDEN_PARAGRAPHS is the
// authoritative list — keep it in sync with the ACKNOWLEDGED_OVERRIDES
// comment blocks.
//
// Strictness: the gate FAILS only when a forbidden §-number appears
// in the per-(template × state) override prose. Comments inside the
// gate or inside stateOverrides.ts that DOCUMENT the omission are
// allowed — they appear in JS-style `// …` lines, which we strip
// before scanning.
// ───────────────────────────────────────────────────────────────────────

import { TEMPLATE_STATE_OVERRIDES } from '../src/legal/templates/stateOverrides.ts'
import type { TemplateId } from '../src/types/projectState.ts'

type StateCode = string

// Per-state set of `${num}` (top-level §-numbers) that must NOT appear in
// the cell override prose. The map keys MUST match the BundeslandCode
// (lowercase ASCII; matches keys in TEMPLATE_STATE_OVERRIDES[T]).
const FORBIDDEN_PARAGRAPHS: Record<StateCode, ReadonlyArray<string>> = {
  // Berlin — § 80 (Beseitigung/Nutzungsuntersagung) enforcement omit.
  berlin:          ['80'],
  // Hamburg — § 80 (Beseitigung/Nutzungsuntersagung/Anpassung) omit.
  hamburg:         ['80'],
  // Bremen — § 79 (Beseitigung/Nutzungsuntersagung) enforcement omit;
  //          Bremen's § 80 = Bauüberwachung (admin) also omitted.
  bremen:          ['79', '80'],
  // Sachsen — § 79 Einstellung, § 80 Beseitigung/Nutzungsuntersagung,
  //           § 81 Bauüberwachung, § 88a TBs admin meta.
  sachsen:         ['79', '80', '81', '88a'],
  // SH — § 79/80/81/85a + § 58a self-flagged unverifiable.
  sh:              ['58a', '79', '80', '81', '85a'],
  // RLP — § 78 Bauüberwachung, § 80 Baueinstellung, § 81 Beseitigung,
  //       § 82 Abbruch verfallender Anlagen, § 87a TBs admin.
  rlp:             ['78', '80', '81', '82', '87a'],
  // MV — § 79 Einstellung, § 80 Beseitigung, § 80a Anpassung,
  //      § 81 Bauüberwachung, § 85a TBs admin.
  mv:              ['79', '80', '80a', '81', '85a'],
  // LSA — § 78/79/80/85a + § 86 self-flagged Phase-B caution.
  'sachsen-anhalt': ['78', '79', '80', '85a', '86'],
  // Thüringen — § 86/87/88/96 enforcement + admin; § 98 + § 99
  //             self-flagged Phase-B caution / out of scope.
  thueringen:      ['86', '87', '88', '96', '98', '99'],
  // Brandenburg — § 79 Einstellung, § 80 Beseitigung+Nutzungsuntersagung,
  //               § 81 Anpassung, § 82 Bauüberwachung (corrected from the
  //               original "§ 84/§ 85/§ 86" comment per audit Phase 1).
  brandenburg:     ['79', '80', '81', '82'],
  // Saarland — § 81 Einstellung, § 82 Beseitigung+Nutzungsuntersagung,
  //            § 78 Bauüberwachung.
  saarland:        ['78', '81', '82'],
  // Niedersachsen — § 79 NBauO is the heading "Beseitigung von Anlagen,
  //                 Nutzungsuntersagung" (enforcement) — already absent;
  //                 lock to prevent reintroduction.
  niedersachsen:   ['79'],
  // BW — § 65 (enforcement) + § 73a (admin meta on Technische Baubest.).
  bw:              ['65', '73a'],
  // Hessen — § 82 HBO Nutzungsverbot/Beseitigungsanordnung enforcement.
  hessen:          ['82'],
}

// Match `§ N LAW` OR `Art. N LAW` for the cited LAW. We require the
// LAW to be the state's own BauO short to avoid false-positives on
// federal § references that happen to share a number.
const LAW_SHORT_BY_STATE: Record<StateCode, string> = {
  berlin:          'BauO Bln',
  hamburg:         'HBauO',
  bremen:          'BremLBO',
  sachsen:         'SächsBO',
  sh:              'LBO SH',
  rlp:             'LBauO',
  mv:              'LBauO M-V',
  'sachsen-anhalt': 'BauO LSA',
  thueringen:      'ThürBO',
  brandenburg:     'BbgBO',
  saarland:        'LBO Saarland',
  niedersachsen:   'NBauO',
  bw:              'LBO BW',
  hessen:          'HBO',
}

// Strip JS `// ...` line comments AND `/* ... */` block comments before
// scanning. The stateOverrides.ts cell strings themselves are template
// literals — JS comments don't appear inside the template body, so this
// is sound.
function stripCommentsAndPreserveTemplateLiterals(text: string): string {
  // We work on the cell content only (already a string), so no JS
  // comments are present. This function is a no-op kept for clarity if
  // future refactor scans `stateOverrides.ts` directly.
  return text
}

interface Violation {
  templateId: TemplateId
  bundesland: StateCode
  num: string
  occurrenceContext: string
}

const violations: Violation[] = []
let cellsScanned = 0

for (const [templateId, perState] of Object.entries(TEMPLATE_STATE_OVERRIDES)) {
  if (!perState) continue
  for (const [bundesland, override] of Object.entries(perState)) {
    if (!override) continue
    cellsScanned++
    const forbidden = FORBIDDEN_PARAGRAPHS[bundesland]
    if (!forbidden || forbidden.length === 0) continue
    const lawShort = LAW_SHORT_BY_STATE[bundesland]
    if (!lawShort) continue
    const text = stripCommentsAndPreserveTemplateLiterals(override)

    for (const num of forbidden) {
      // Match either `§ NUM LAW` or `Art. NUM LAW`. Escape LAW for regex.
      const escaped = lawShort.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const rx = new RegExp(`(?:§|Art\\.)\\s*${num}\\b\\s+${escaped}\\b`, 'g')
      for (const m of text.matchAll(rx)) {
        const pos = m.index ?? 0
        const before = text.slice(Math.max(0, pos - 40), pos)
        const after = text.slice(pos, Math.min(text.length, pos + 60))
        violations.push({
          templateId: templateId as TemplateId,
          bundesland,
          num,
          occurrenceContext: (before + after).replace(/\n+/g, ' ').replace(/\s{2,}/g, ' '),
        })
      }
    }
  }
}

if (violations.length > 0) {
  console.error('[verify:forbidden-paragraphs] FAIL — enforcement / admin-meta §§ in cell prose:')
  console.error('')
  for (const v of violations) {
    console.error(`  ${v.templateId} × ${v.bundesland}`)
    console.error(`    forbidden: § ${v.num} ${LAW_SHORT_BY_STATE[v.bundesland]}`)
    console.error(`    context:   …${v.occurrenceContext}…`)
    console.error('')
  }
  console.error('Why this is a gate:')
  console.error('  Each entry in FORBIDDEN_PARAGRAPHS encodes a Bucket-C author decision to')
  console.error('  keep an enforcement / admin-meta § out of client-facing prose (Beseitigung,')
  console.error('  Nutzungsuntersagung, Bauüberwachung, Technische Baubestimmungen, etc.).')
  console.error('  Reintroducing one in a future authoring pass would re-trigger the silent-')
  console.error('  wrong failure mode Bucket A killed. If the omission is no longer correct,')
  console.error('  update FORBIDDEN_PARAGRAPHS in scripts/verify-forbidden-paragraphs.mts')
  console.error('  with a clear comment explaining the policy change.')
  process.exit(1)
}

console.log(
  `[verify:forbidden-paragraphs] OK — ${cellsScanned} cell(s) scanned across ` +
    `${Object.keys(FORBIDDEN_PARAGRAPHS).length} states; no enforcement / admin-meta § leaks.`,
)
