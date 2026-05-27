// ───────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit by hand.
//   source: scripts/legal-corpus/states/*.json
//   regen:  npm run gen:corpus-pack   ·   gate: npm run verify:corpus-pack
//
// Heading-semantic canonical picks from the primary/secondary-verified corpus.
//   STATE_CORPUS_CITATIONS → src/legal/stateCitations.ts (per-field overlay)
//   STATE_CORPUS_PROCEDURE → src/legal/stateLocalization.ts (stub overlay)
// Per-field fallback: corpus value wins where present, hand-coded otherwise.
// Absent fields/states (BW/Niedersachsen; RLP regular+structural) stay
// hand-coded — never a fabricated §.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from './states/_types'

export interface CorpusCitationFields {
  abstandsFlaechenCitation?: string
  permitSubmissionCitation?: string
  structuralCertCitation?: string
  permitFormCitation?: string
}

export interface CorpusProcedureFields {
  free?: string
  freistellung?: string
  simplified?: string
  regular?: string
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

export const STATE_CORPUS_PROCEDURE: Partial<Record<BundeslandCode, CorpusProcedureFields>> = {
  "bayern": {
    "free": "BayBO Art. 57",
    "freistellung": "BayBO Art. 58",
    "simplified": "BayBO Art. 59",
    "regular": "BayBO Art. 60"
  },
  "berlin": {
    "free": "§ 61 BauO Bln",
    "freistellung": "§ 62 BauO Bln",
    "simplified": "§ 63 BauO Bln",
    "regular": "§ 64 BauO Bln"
  },
  "brandenburg": {
    "free": "§ 61 BbgBO",
    "simplified": "§ 63 BbgBO",
    "regular": "§ 64 BbgBO"
  },
  "bremen": {
    "free": "§ 61 BremLBO",
    "freistellung": "§ 62 BremLBO",
    "simplified": "§ 63 BremLBO",
    "regular": "§ 64 BremLBO"
  },
  "hamburg": {
    "free": "§ 61 HBauO",
    "freistellung": "§ 62 HBauO",
    "simplified": "§ 63 HBauO",
    "regular": "§ 64 HBauO"
  },
  "hessen": {
    "free": "§ 63 HBO",
    "freistellung": "§ 64 HBO",
    "simplified": "§ 65 HBO",
    "regular": "§ 66 HBO"
  },
  "mv": {
    "free": "§ 61 LBauO M-V",
    "freistellung": "§ 62 LBauO M-V",
    "simplified": "§ 63 LBauO M-V",
    "regular": "§ 64 LBauO M-V"
  },
  "nrw": {
    "free": "§ 62 BauO NRW",
    "freistellung": "§ 63 BauO NRW",
    "simplified": "§ 64 BauO NRW",
    "regular": "§ 65 BauO NRW"
  },
  "rlp": {
    "free": "§ 62 LBauO",
    "simplified": "§ 66 LBauO"
  },
  "saarland": {
    "free": "§ 61 LBO Saarland",
    "freistellung": "§ 63 LBO Saarland",
    "simplified": "§ 64 LBO Saarland",
    "regular": "§ 65 LBO Saarland"
  },
  "sachsen-anhalt": {
    "free": "§ 60 BauO LSA",
    "freistellung": "§ 61 BauO LSA",
    "simplified": "§ 62 BauO LSA",
    "regular": "§ 63 BauO LSA"
  },
  "sachsen": {
    "free": "§ 61 SächsBO",
    "freistellung": "§ 62 SächsBO",
    "simplified": "§ 63 SächsBO",
    "regular": "§ 64 SächsBO"
  },
  "sh": {
    "free": "§ 61 LBO SH",
    "freistellung": "§ 62 LBO SH",
    "simplified": "§ 63 LBO SH",
    "regular": "§ 64 LBO SH"
  },
  "thueringen": {
    "free": "§ 63 ThürBO",
    "freistellung": "§ 64 ThürBO",
    "simplified": "§ 65 ThürBO",
    "regular": "§ 66 ThürBO"
  }
} as const
