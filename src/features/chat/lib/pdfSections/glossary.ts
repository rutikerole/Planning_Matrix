// ───────────────────────────────────────────────────────────────────────
// v1.0.17 — Glossary page (Section 11 · German legal terms).
//
// 12 hardcoded glossary entries arranged in a 2-column grid. Terms
// are German legal-domain identifiers (BauGB / BauO / GEG / LBO /
// HOAI / BKI / ÖbVI / LP / KfW / Verfahrensfreiheit / Bauamt /
// Bauvorlageberechtigte) and stay German across locales (v1.0.6
// anti-leak pattern — legal identifiers are not translatable
// prose). Only the definition text is localized.
//
// {state} substitution in definitions where the term references a
// state-specific authority (e.g. "§ 62/64 BauO {state}").
// ───────────────────────────────────────────────────────────────────────

import { type PDFPage } from 'pdf-lib'
import {
  CLAY,
  INK,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  drawEditorialTitle,
  drawFooter,
  drawKicker,
  drawPaperBackground,
  drawSafeText,
  drawWrappedText,
  ellipsizeToWidth,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'
import { getStateCitations } from '@/legal/stateCitations'

export interface GlossaryData {
  bundeslandCode: string
  /** v1.0.23 Bug O — lowercase BundeslandCode (e.g. "nrw", "bayern",
   *  "berlin") for resolving state-specific glossary entries via
   *  stateCitations.ts. Falls back to legacy bundeslandCode-driven
   *  {state} substitution when not provided. */
  bundeslandLower?: string
}

export interface GlossaryFooterData {
  /** v1.0.32 Bug 111 — verified|preliminary footer center, set by exportPdf. */
  footerCenter?: string
  docNo: string
  totalPages: number
  pageNumber: number
}

interface GlossaryEntry {
  term: string
  /** Definition in English. */
  en: string
  /** Definition in German. */
  de: string
}

// v1.0.23 Bug O — federal-baseline glossary entries that apply to
// every project regardless of bundesland.
const FEDERAL_ENTRIES: ReadonlyArray<GlossaryEntry> = [
  {
    term: 'BauGB · Baugesetzbuch',
    en: 'Federal building code (planning law, e.g. § 30 inner-area development).',
    de: 'Bundesgesetz für das Bauplanungsrecht (z.B. § 30 Innenbereich).',
  },
  {
    term: 'GEG · Gebäudeenergiegesetz',
    en: 'Federal building energy law; § 48 governs renovation energy obligations.',
    de: 'Bundesgesetz zur Gebäudeenergie; § 48 regelt Modernisierungspflichten.',
  },
  {
    term: 'HOAI · Honorarordnung',
    en: 'Federal architect/engineer fee schedule (Honorarordnung für Architekten und Ingenieure).',
    de: 'Bundesverordnung über Honorare für Architekten- und Ingenieurleistungen.',
  },
  {
    term: 'BKI · Baukosteninformationszentrum',
    en: 'German construction-cost benchmarking institute; regional cost factors are being finalized.',
    de: 'Baukosteninformationszentrum; regionale Kostenfaktoren werden derzeit erarbeitet.',
  },
  {
    term: 'ÖbVI · Vermessungsingenieur',
    en: 'Publicly licensed surveyor; required for official site plans.',
    de: 'Öffentlich bestellter Vermessungsingenieur; erforderlich für amtliche Lagepläne.',
  },
  {
    term: 'LP · Leistungsphase',
    en: 'HOAI service phase (1–9); LP 1–4 covers preliminary through permit application.',
    de: 'HOAI-Leistungsphase (1–9); LP 1–4 umfasst Vor- bis Genehmigungsplanung.',
  },
  {
    term: 'KfW · Kreditanstalt für Wiederaufbau',
    en: 'Federal development bank; BEG programs fund energy-efficient renovation.',
    de: 'Bundesförderbank; BEG-Programme finanzieren energieeffiziente Sanierung.',
  },
  {
    term: 'Verfahrensfreiheit',
    en: 'Permit-free status under state BauO; building work proceeds without formal Bauantrag.',
    de: 'Genehmigungsfreier Status nach Landesbauordnung; ohne Bauantrag möglich.',
  },
  {
    term: 'Bauamt',
    en: 'Municipal building authority; issues permits.',
    de: 'Kommunale Genehmigungsbehörde; erteilt Baugenehmigungen.',
  },
  {
    term: 'Bauvorlageberechtigte/r',
    en: 'Submission-authorized architect; only they can file a Bauantrag.',
    de: 'Architekt:in mit Bauvorlageberechtigung; nur sie/er reicht den Bauantrag ein.',
  },
]

// v1.0.23 Bug O — state-aware entries appended after the federal
// baseline. Substantive states get their canonical short names from
// stateCitations.ts; stub states get the honest-deferral phrasing.
function stateEntries(bundeslandLower: string | null | undefined): GlossaryEntry[] {
  const cit = getStateCitations(bundeslandLower)
  if (!cit.isSubstantive) {
    return [
      {
        term: `BauO ${cit.labelDe} · Bauordnung`,
        en: `${cit.labelEn} state building code — §§ not yet on file. Verify with the ${cit.labelEn} Architektenkammer.`,
        de: `Landesbauordnung ${cit.labelDe} — §§ noch nicht hinterlegt. Mit ${cit.labelDe}-Architektenkammer abklären.`,
      },
      {
        term: `${cit.denkmalSchutzAct.split(' (')[0]} · Denkmalschutz`,
        en: `${cit.labelEn} monument-protection act — verified citations pending. Confirm with state Landesdenkmalamt.`,
        de: `Denkmalschutzgesetz ${cit.labelDe} — verifizierte Zitate ausstehend. Mit Landesdenkmalamt abklären.`,
      },
    ]
  }
  // Substantive state — surface verified citations.
  if (bundeslandLower === 'bayern') {
    return [
      {
        term: 'BayBO · Bayerische Bauordnung',
        en: 'Bavarian state building code (BayBO Art. 57 verfahrensfrei + Art. 59 simplified procedure).',
        de: 'Bayerische Bauordnung (BayBO Art. 57 verfahrensfrei + Art. 59 vereinfachtes Verfahren).',
      },
      {
        term: 'BayDSchG · Bayerisches Denkmalschutzgesetz',
        en: 'Bavarian monument-protection act; Art. 6 governs permit requirements for listed buildings.',
        de: 'Bayerisches Denkmalschutzgesetz; Art. 6 regelt Erlaubnispflichten für Denkmäler.',
      },
      {
        term: 'BLfD · Landesamt für Denkmalpflege',
        en: 'Bavarian State Office for Monument Preservation; reviews ensemble + listed-building cases.',
        de: 'Bayerisches Landesamt für Denkmalpflege; prüft Ensembleschutz und Baudenkmäler.',
      },
    ]
  }
  // T-01 audit YEL-3 / RLP glossary fix: the term must name the state BUILDING
  // CODE (LBauO/BauO/…) — what the description actually glosses — not the
  // Bauvorlagen/inspection regulation (`bauVorlagenAct`). For RLP that mislabel
  // was glaring ("BauuntPrüfVO … state building code"); it was latently wrong
  // for all 15 non-Bayern substantive states. Derive the code short-name from
  // permitFormCitation (e.g. "§ 63 LBauO" → "LBauO", "§ 70 BauO NRW" →
  // "BauO NRW"); fall back to bauVorlagenAct only if there is no §/Art. citation
  // to strip. The structural § (which for RLP lives in BauuntPrüfVO) is now
  // framed as a separate "structural proof per …" clause, not as the code.
  const stripped = cit.permitFormCitation.replace(/^(§|Art\.)\s*\S+\s+/, '').trim()
  const codeLabel =
    stripped && stripped !== cit.permitFormCitation ? stripped : cit.bauVorlagenAct
  return [
    {
      term: `${codeLabel} · ${cit.labelDe}`,
      en: `${cit.labelEn} state building code (e.g. ${cit.permitFormCitation} permit form; structural proof per ${cit.structuralCertCitation}).`,
      de: `Landesbauordnung ${cit.labelDe} (z.B. ${cit.permitFormCitation} Bauantrag; Standsicherheitsnachweis nach ${cit.structuralCertCitation}).`,
    },
    {
      term: `${cit.denkmalSchutzAct} · Denkmalschutz`,
      en: `${cit.labelEn} monument-protection act; consult ${cit.denkmalAuthorityEn}.`,
      de: `${cit.denkmalAuthorityDe}; ${cit.denkmalSchutzAct} regelt Erlaubnispflichten.`,
    },
  ]
}

function getEntriesForBundesland(
  bundeslandLower: string | null | undefined,
): ReadonlyArray<GlossaryEntry> {
  return [...FEDERAL_ENTRIES, ...stateEntries(bundeslandLower)]
}

export function renderGlossaryBody(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: GlossaryData,
): void {
  drawPaperBackground(page)
  const headerY = PAGE_HEIGHT - MARGIN - 8
  drawKicker(page, MARGIN, headerY, pdfStr(strings, 'glossary.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    headerY - 32,
    pdfStr(strings, 'glossary.title'),
    fonts,
  )

  const cellW = (PAGE_WIDTH - 2 * MARGIN - 16) / 2
  const rowHeight = 70

  // Detect locale: check whether glossary.kicker resolved to the
  // German variant. If so, use de definitions; else en. Simpler
  // than threading a `lang` arg through.
  const isDe = pdfStr(strings, 'glossary.kicker').startsWith('ABSCHNITT')

  // v1.0.23 Bug O — state-aware entry list. Federal terms always
  // present; state-specific BauO + DSchG entries derived from
  // stateCitations.ts. Stub states render the honest-deferral
  // phrasing rather than fabricated §§.
  const entries = getEntriesForBundesland(data.bundeslandLower)
  entries.forEach((entry, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const cellX = MARGIN + col * (cellW + 16)
    const cellY = headerY - 76 - row * rowHeight
    // v1.0.30 Bug 108 — clamp the term to its half-width cell so a long term
    // ("Landes-Denkmalschutzgesetz Sachsen · Denkmalschutz") no longer runs off
    // the right page edge (PDF p.11). The definition below already wraps to
    // cellW; only the term line was unclamped. No-op when it fits.
    const term = ellipsizeToWidth(
      entry.term.replace(/\{state\}/g, data.bundeslandCode),
      fonts.sansMedium,
      11,
      cellW,
      fonts.safe,
    )
    const definitionRaw = isDe ? entry.de : entry.en
    const definition = definitionRaw.replace(
      /\{state\}/g,
      data.bundeslandCode,
    )
    drawSafeText(page, term, {
      x: cellX,
      y: cellY,
      size: 11,
      font: fonts.sansMedium,
      color: INK,
      safe: fonts.safe,
    })
    drawWrappedText(page, cellX, cellY - 14, definition, {
      maxWidth: cellW,
      lineHeight: 12,
      font: fonts.serifItalic,
      size: 10,
      color: CLAY,
      safe: fonts.safe,
    })
  })
}

export function renderGlossaryFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: GlossaryFooterData,
): void {
  drawFooter(page, {
    left: data.docNo,
    center: data.footerCenter ?? pdfStr(strings, 'footer.preliminary'),
    right: `${data.pageNumber} / ${data.totalPages}`,
    fonts,
  })
}
