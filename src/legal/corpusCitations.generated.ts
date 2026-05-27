// ───────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit by hand.
//   source: scripts/legal-corpus/states/*.json
//   regen:  npm run gen:corpus-pack   ·   gate: npm run verify:corpus-pack
//
// Canonical per-state citation picks, heading-semantic-selected from the
// primary/secondary-verified corpus. Consumed by src/legal/stateCitations.ts
// (per-field fallback: corpus value wins where present, hand-coded otherwise).
// Absent fields (BW/Niedersachsen/RLP terminology outliers) stay hand-coded.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from './states/_types'

export interface CorpusCitationFields {
  abstandsFlaechenCitation?: string
  permitSubmissionCitation?: string
  structuralCertCitation?: string
  permitFormCitation?: string
}

export const STATE_CORPUS_CITATIONS: Partial<Record<BundeslandCode, CorpusCitationFields>> = {
  "bayern": {
    "abstandsFlaechenCitation": "BayBO Art. 6",
    "permitSubmissionCitation": "BayBO Art. 61",
    "structuralCertCitation": "BayBO Art. 62",
    "permitFormCitation": "BayBO Art. 64"
  },
  "berlin": {
    "abstandsFlaechenCitation": "§ 6 BauO Bln",
    "permitSubmissionCitation": "§ 65 BauO Bln",
    "structuralCertCitation": "§ 66 BauO Bln",
    "permitFormCitation": "§ 68 BauO Bln"
  },
  "brandenburg": {
    "abstandsFlaechenCitation": "§ 6 BbgBO",
    "permitSubmissionCitation": "§ 65 BbgBO",
    "structuralCertCitation": "§ 66 BbgBO",
    "permitFormCitation": "§ 68 BbgBO"
  },
  "bremen": {
    "abstandsFlaechenCitation": "§ 6 BremLBO",
    "permitSubmissionCitation": "§ 65 BremLBO",
    "structuralCertCitation": "§ 66 BremLBO",
    "permitFormCitation": "§ 68 BremLBO"
  },
  "hamburg": {
    "abstandsFlaechenCitation": "§ 6 HBauO",
    "permitSubmissionCitation": "§ 65 HBauO",
    "structuralCertCitation": "§ 66 HBauO",
    "permitFormCitation": "§ 68 HBauO"
  },
  "hessen": {
    "abstandsFlaechenCitation": "§ 6 HBO",
    "permitSubmissionCitation": "§ 67 HBO",
    "structuralCertCitation": "§ 68 HBO",
    "permitFormCitation": "§ 69 HBO"
  },
  "mv": {
    "abstandsFlaechenCitation": "§ 6 LBauO M-V",
    "permitSubmissionCitation": "§ 65 LBauO M-V",
    "structuralCertCitation": "§ 66 LBauO M-V",
    "permitFormCitation": "§ 68 LBauO M-V"
  },
  "nrw": {
    "abstandsFlaechenCitation": "§ 6 BauO NRW",
    "permitSubmissionCitation": "§ 67 BauO NRW",
    "structuralCertCitation": "§ 68 BauO NRW",
    "permitFormCitation": "§ 70 BauO NRW"
  },
  "rlp": {
    "abstandsFlaechenCitation": "§ 8 LBauO",
    "permitSubmissionCitation": "§ 64 LBauO",
    "permitFormCitation": "§ 63 LBauO"
  },
  "saarland": {
    "abstandsFlaechenCitation": "§ 7 LBO Saarland",
    "permitSubmissionCitation": "§ 66 LBO Saarland",
    "structuralCertCitation": "§ 67 LBO Saarland",
    "permitFormCitation": "§ 69 LBO Saarland"
  },
  "sachsen-anhalt": {
    "abstandsFlaechenCitation": "§ 6 BauO LSA",
    "permitSubmissionCitation": "§ 64 BauO LSA",
    "structuralCertCitation": "§ 65 BauO LSA",
    "permitFormCitation": "§ 67 BauO LSA"
  },
  "sachsen": {
    "abstandsFlaechenCitation": "§ 6 SächsBO",
    "permitSubmissionCitation": "§ 65 SächsBO",
    "structuralCertCitation": "§ 66 SächsBO",
    "permitFormCitation": "§ 68 SächsBO"
  },
  "sh": {
    "abstandsFlaechenCitation": "§ 6 LBO SH",
    "permitSubmissionCitation": "§ 65 LBO SH",
    "structuralCertCitation": "§ 66 LBO SH",
    "permitFormCitation": "§ 68 LBO SH"
  },
  "thueringen": {
    "abstandsFlaechenCitation": "§ 6 ThürBO",
    "permitSubmissionCitation": "§ 67 ThürBO",
    "structuralCertCitation": "§ 72 ThürBO",
    "permitFormCitation": "§ 74 ThürBO"
  }
} as const
