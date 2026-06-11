import type { AreaState, ProjectState } from '@/types/projectState'
import { getStateCitations } from '@/legal/stateCitations'
import { getStateLocalization } from '@/legal/stateLocalization'
import type { ProcedureDecision, ProcedureKind } from '@/legal/resolveProcedure'

export type LegalRelevance = 'HIGH' | 'PARTIAL' | 'NONE'

export interface LegalDomainRow {
  /** Citation pill text, e.g. `§ 34 BauGB`. */
  label: string
  /** Hatched-bar fill level. */
  relevance: LegalRelevance
  /** Right-side status text. */
  status: string
}

export interface LegalDomain {
  /** Jurisdictional level: N = national/Bundesrecht, R = regional/
   *  Landesrecht, M = municipal/Kommunalrecht. */
  key: 'N' | 'R' | 'M'
  /** Localised title. */
  title: string
  relevance: LegalRelevance
  rows: LegalDomainRow[]
}

/**
 * Meta-sweep item 1 — status text for the PROCEDURE ANCHOR row, derived from
 * the canonical ProcedureDecision kind (never from re-classifying the verdict
 * string: the old local `/verfahrensfrei|permit-free|genehmigungsfrei/i` regex
 * substring-matched "Genehmigungsfreistellung" and rendered a Freistellung
 * verdict as "verfahrensfrei" while the procedure card said notification-only).
 * ASSUMED decisions (intent baselines, hard blockers, verdict conflicts) carry
 * the "(Basis)" suffix so a downgrade is visible on this row too.
 */
export function procedureAnchorStatus(
  decision: Pick<ProcedureDecision, 'kind' | 'confidence'>,
  lang: 'de' | 'en',
): string {
  const byKind: Record<ProcedureKind, { de: string; en: string }> = {
    verfahrensfrei: { de: 'verfahrensfrei', en: 'permit-free' },
    genehmigungsfreigestellt: { de: 'Genehmigungsfreistellung', en: 'notification-only' },
    anzeige: { de: 'anzeigepflichtig', en: 'notification required' },
    vereinfachtes: { de: 'Genehmigungsverfahren', en: 'permit procedure' },
    standard: { de: 'Genehmigungsverfahren', en: 'permit procedure' },
    bauvoranfrage: { de: 'Bauvoranfrage erforderlich', en: 'pre-decision required' },
  }
  const base = byKind[decision.kind][lang]
  if (decision.confidence === 'ASSUMED') {
    return lang === 'en' ? `${base} (baseline)` : `${base} (Basis)`
  }
  return base
}

/**
 * Phase 8 — extract of the heuristic legal-domain composer that used
 * to live inside `LegalLandscape.tsx`. The new Legal Landscape Tab and
 * the (still-unused-as-of-commit-2) legacy section both consume this.
 *
 * Composition is regex-over-corpus for now. The model produces facts
 * + procedures + documents with citation evidence; we sniff for the
 * canonical statutes (§§ 30/34/35 BauGB, BayBO Art. 2/57/58/59/60/6,
 * GEG, Brandschutz, Stellplatz, Denkmal, Baulast) and emit one row
 * per hit with HIGH / PARTIAL / NONE relevance.
 *
 * Phase D (manager feedback) — the three bands are now JURISDICTIONAL
 * levels (National / Regional / Municipal) instead of topical
 * (Planning / Building / Other). Rows are bucketed by which level of
 * government actually owns the rule: BauGB / BauNVO / GEG / DIN 4109 /
 * TA Lärm are federal → National; the Landesbauordnung procedure,
 * Brandschutz, Rettungsweg and the Denkmalschutzgesetz (state law) →
 * Regional; Stellplatzsatzung and Baulasten → Municipal. The band
 * relevance badge is still informed by the persona's Areas state
 * machine, mapped N←A (planning), R←B (building order), M←C (other);
 * see deriveRelevance.
 */
export function composeLegalDomains(
  state: Partial<ProjectState>,
  lang: 'de' | 'en',
  bundesland: string | null | undefined,
  // Meta-sweep item 1 — the canonical ProcedureDecision is a REQUIRED input
  // (same source as the procedure card / Gantt / PDF: resolveProcedure over
  // buildProcedureCase). This composer previously re-derived the verdict with
  // its own resolveVerfahrensIndikation + substring regex — a partial second
  // composer that was blind to hard blockers, the Sonderbau gate, and
  // verdict-conflict downgrades, and misread Freistellung as verfahrensfrei.
  decision: ProcedureDecision,
): LegalDomain[] {
  // v1.0.21 Bug 23d — bundesland is now an explicit input. The
  // Denkmalschutz row in Domain C cites the state-specific
  // Denkmalschutzgesetz short name (BayDSchG / DSchG NRW / DSchG Bln /
  // HDSchG / NDSchG / DSchG BW / honest-deferral phrase for stub
  // states) instead of the generic "Denkmalschutz" label that v1.0.20
  // emitted on every project. Domain B's BayBO matchers are gated to
  // bayern projects so a Berlin / NRW project never surfaces a BayBO
  // row even if a stray BayBO Art. * fragment slipped into the
  // corpus.
  const citations = getStateCitations(bundesland)
  const isBayern = (bundesland ?? '').toLowerCase() === 'bayern'
  const facts = state.facts ?? []
  const procedures = state.procedures ?? []
  const documents = state.documents ?? []
  const areas = state.areas

  // Four-class campaign Phase 2 (CLASS 3) — a NON-string fact value was coerced
  // to '' and lost from the corpus, so a citation/keyword carried in a numeric or
  // boolean value was invisible to the has() regexes. Stringify scalar (number/
  // boolean) values too; objects/arrays stay '' (their stringification is noise
  // that can't match a law token anyway).
  const factValueStr = (v: unknown): string =>
    typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : ''
  const corpus = [
    ...facts.map(
      (f) =>
        `${f.key} ${factValueStr(f.value)} ${f.evidence ?? ''} ${f.qualifier?.reason ?? ''}`,
    ),
    ...procedures.map(
      (p) =>
        `${p.title_de} ${p.title_en} ${p.rationale_de ?? ''} ${p.rationale_en ?? ''} ${p.qualifier?.reason ?? ''}`,
    ),
    ...documents.map(
      (d) => `${d.title_de} ${d.title_en} ${d.qualifier?.reason ?? ''}`,
    ),
    // v1.0.28 Bug 54 — include the Areas A/B/C reasons so Domain A picks up
    // the § 30/34/35 BauGB planning context the persona records there (it
    // was previously invisible to the regex because the corpus was facts +
    // procedures + documents only).
    areas?.A?.reason ?? '',
    areas?.B?.reason ?? '',
    areas?.C?.reason ?? '',
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()

  const has = (re: RegExp) => re.test(corpus)

  // ── N · National — Bundesrecht ──────────────────────────────────
  // Federal statutes & standards: the urban-planning code (BauGB §§
  // 30/34/35 + BauNVO), the federal energy act (GEG 2024), the federal
  // sound-insulation standard (DIN 4109, Bug 66) and the federal noise
  // administrative regulation (TA Lärm, Bug 89). These bind every
  // project in Germany regardless of state or municipality.
  const nRows: LegalDomainRow[] = []
  if (has(/§\s*30\s*baugb|baugb\s*§?\s*30/)) {
    nRows.push({
      label: '§ 30 BauGB',
      relevance: 'HIGH',
      status: lang === 'en' ? 'qualified inner area' : 'qualifizierter Innenbereich',
    })
  }
  if (has(/§\s*34\s*baugb|baugb\s*§?\s*34/)) {
    nRows.push({
      label: '§ 34 BauGB',
      relevance: 'HIGH',
      status: lang === 'en' ? 'unplanned inner area' : 'unbeplanter Innenbereich',
    })
  }
  if (has(/§\s*35\s*baugb|baugb\s*§?\s*35/)) {
    nRows.push({
      label: '§ 35 BauGB',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'outer area' : 'Außenbereich',
    })
  }
  if (has(/baunvo/)) {
    nRows.push({
      label: 'BauNVO',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'land use' : 'Nutzungsart',
    })
  }
  if (has(/\bgeg\b/)) {
    nRows.push({
      label: 'GEG 2024',
      relevance: 'HIGH',
      status: lang === 'en' ? 'thermal protection' : 'Wärmeschutz · Energiebilanz',
    })
  }
  // v1.0.29 Bug 66 — DIN 4109 sound insulation is a federal (national)
  // standard, mandatory for MFH.
  if (has(/din\s*4109|schallschutz/)) {
    nRows.push({
      label: 'DIN 4109',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'sound insulation' : 'Schallschutz',
    })
  }
  // v1.0.30 Bug 89 — TA Lärm (Außenlärm/Immissionsschutz) is a federal
  // administrative regulation; it surfaces without a state citation.
  if (has(/ta[\s-]*l(ä|ae)rm/)) {
    nRows.push({
      label: 'TA Lärm',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'noise immission control' : 'Immissionsschutz · Lärm',
    })
  }

  // ── R · Regional — Landesrecht ──────────────────────────────────
  // State law: the Landesbauordnung (procedure + building classes +
  // setbacks), fire protection and the second escape route (governed by
  // every LBO), and the state Denkmalschutzgesetz (monument protection
  // is state, not municipal, law — Bug 23d keeps the citation
  // state-specific). The LBO/procedure row leads the band.
  const rRows: LegalDomainRow[] = []
  // ── The PROCEDURE ANCHOR row (every state, Bayern included) ────────
  // Meta-sweep item 1 — decision-first, identical to the procedure card /
  // timeline / PDF. Label = the decision's citation; status = the decision's
  // kind (see procedureAnchorStatus). The previous non-Bayern-only block
  // re-classified resolveVerfahrensIndikation() output with a local
  // substring regex, so a "Genehmigungsfreistellung …" verdict rendered
  // status "verfahrensfrei" here while the procedure card said
  // notification-only, and Sonderbau/hard-blocker/konflikt decisions were
  // invisible to this row. Bayern previously had NO anchor row at all —
  // the verdict was simply absent from the München-gated product's
  // legal-landscape tab.
  // T-03 thin-state sprint (cleanup, preserved): the citation fallback when
  // the decision carries no § is the localization's PROCEDURE § (simplified,
  // then regular), never the permit-FORM § (§ 68 "Bauantrag, Bauvorlagen").
  {
    const procLoc = getStateLocalization(bundesland).procedure
    const procCitation =
      procLoc.simplified.citation.trim() || procLoc.regular.citation.trim()
    const label =
      decision.citation.trim() ||
      procCitation ||
      (citations.isSubstantive
        ? citations.permitFormCitation
        : `Landesbauordnung ${citations.labelDe}`)
    rRows.push({
      label,
      relevance: 'HIGH',
      status: procedureAnchorStatus(decision, lang),
    })
  }
  if (isBayern) {
    // v1.0.21 Bug 23d — BayBO matchers gated to bayern. Non-Bayern
    // projects never surface a BayBO row even if a stray BayBO citation
    // slipped through the persona's anti-Bayern-leak shield.
    if (has(/baybo\s*art\.?\s*2\b/)) {
      rRows.push({
        label: 'BayBO Art. 2',
        relevance: 'HIGH',
        status: lang === 'en' ? 'building class' : 'Gebäudeklasse',
      })
    }
    if (has(/baybo\s*art\.?\s*57\b/)) {
      rRows.push({
        label: 'BayBO Art. 57',
        relevance: 'PARTIAL',
        status: lang === 'en' ? 'permit-free works' : 'verfahrensfreie Vorhaben',
      })
    }
    if (has(/baybo\s*art\.?\s*58\b/)) {
      rRows.push({
        label: 'BayBO Art. 58',
        relevance: 'PARTIAL',
        status: lang === 'en' ? 'permit exemption check' : 'Genehmigungsfreistellung',
      })
    }
    if (has(/baybo\s*art\.?\s*59\b/)) {
      rRows.push({
        label: 'BayBO Art. 59',
        relevance: 'HIGH',
        status: lang === 'en' ? 'simplified procedure' : 'vereinfachtes Verfahren',
      })
    }
    if (has(/baybo\s*art\.?\s*60\b/)) {
      rRows.push({
        label: 'BayBO Art. 60',
        relevance: 'HIGH',
        status: lang === 'en' ? 'full permit' : 'Baugenehmigungsverfahren',
      })
    }
    if (has(/baybo\s*art\.?\s*6\b/)) {
      rRows.push({
        label: 'BayBO Art. 6',
        relevance: 'PARTIAL',
        status: lang === 'en' ? 'setbacks' : 'Abstandsflächen',
      })
    }
  }
  if (has(/brandschutz/)) {
    rRows.push({
      label: 'Brandschutz',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'GK-dependent fire protection' : 'gebäudeklassenabhängig',
    })
  }
  if (has(/rettungsweg/)) {
    rRows.push({
      label: 'Rettungsweg',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'second escape route' : 'zweiter Rettungsweg',
    })
  }
  if (has(/denkmal|baydschg|dschg/)) {
    // v1.0.21 Bug 23d — row label is the state-specific
    // Denkmalschutzgesetz short name (BayDSchG / DSchG NRW / DSchG Bln /
    // HDSchG / NDSchG / DSchG BW). Denkmalschutz is STATE law, so it
    // belongs to the Regional band (was "Other" pre-Phase-D).
    rRows.push({
      label: citations.denkmalSchutzAct,
      relevance: 'HIGH',
      status: lang === 'en' ? 'listed building applicable' : 'denkmalrechtlich',
    })
  }

  // ── M · Municipal — Kommunalrecht ───────────────────────────────
  // Local rules administered by the municipality: the parking ordinance
  // (Stellplatzsatzung) and the land-charges register (Baulastenverzeichnis).
  const mRows: LegalDomainRow[] = []
  if (has(/baybo\s*art\.?\s*47\b|stellplatz/)) {
    mRows.push({
      label: 'Stellplatzsatzung',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'municipal' : 'kommunal',
    })
  }
  if (has(/baulast/)) {
    mRows.push({
      label: 'Baulasten',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'check land charges' : 'Baulastenverzeichnis',
    })
  }

  // Band relevance. HIGH iff the band carries a HIGH row, OR it carries
  // any rows and its feeding consultation area is ACTIVE. PARTIAL when it
  // has rows but no HIGH ones, or when its feeding area is PENDING/ACTIVE
  // but no rows surfaced for this band yet. NONE otherwise. The feeding
  // map keeps the badge tied to the persona's Areas state machine
  // (N←A planning, R←B building, M←C other), but a band is NEVER
  // promoted to HIGH on the strength of the area state alone — that
  // produced an incoherent "HIGHLY RELEVANT badge + empty body" once
  // the jurisdictional re-bucket moved e.g. Denkmalschutz out of the
  // band the area state covers (Hessen T-03 case caught in render check).
  const deriveRelevance = (
    rows: LegalDomainRow[],
    feedingArea: AreaState | undefined,
  ): LegalRelevance => {
    if (rows.some((r) => r.relevance === 'HIGH')) return 'HIGH'
    if (rows.length > 0) return feedingArea === 'ACTIVE' ? 'HIGH' : 'PARTIAL'
    if (feedingArea === 'ACTIVE' || feedingArea === 'PENDING') return 'PARTIAL'
    return 'NONE'
  }

  return [
    {
      key: 'N',
      title: lang === 'en' ? 'National law' : 'Bundesrecht',
      relevance: deriveRelevance(nRows, areas?.A?.state),
      rows: nRows,
    },
    {
      key: 'R',
      title: lang === 'en' ? 'Regional law' : 'Landesrecht',
      relevance: deriveRelevance(rRows, areas?.B?.state),
      rows: rRows,
    },
    {
      key: 'M',
      title: lang === 'en' ? 'Municipal law' : 'Kommunalrecht',
      relevance: deriveRelevance(mRows, areas?.C?.state),
      rows: mRows,
    },
  ]
}

export function relevanceLabel(r: LegalRelevance, lang: 'de' | 'en'): string {
  if (r === 'HIGH') return lang === 'en' ? 'Highly relevant' : 'Hoch relevant'
  if (r === 'PARTIAL') return lang === 'en' ? 'Partially relevant' : 'Teilrelevant'
  return lang === 'en' ? 'Not yet assessed' : 'Noch nicht beurteilt'
}
