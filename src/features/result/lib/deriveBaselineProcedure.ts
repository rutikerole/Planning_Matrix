import type { Procedure } from '@/types/projectState'
import { getStateLocalization } from '@/legal/stateLocalization'

/**
 * Phase 8.1 (A.3) — baseline `Procedure[]` inferred from intent +
 * Bundesland when persona hasn't yet emitted any procedures.
 *
 * v1.0.10 — was Bayern-hardcoded ("BayBO Art. 58") regardless of
 * project bundesland through v1.0.9. The Düsseldorf NRW smoke walk
 * surfaced "Simplified building permit · BayBO Art. 58" on an NRW
 * project. Fix: read state-localization pack (procedure pack +
 * structural-cert citation) and parameterize the baseline accordingly.
 * Bayern projects render unchanged (BayBO Art. 58 / 57 / 59); NRW
 * gets § 64 BauO NRW, Hessen § 65 HBO, etc.
 *
 * The procedure card in the UI shows a "wahrscheinlich · pending
 * architect confirmation" pill on baseline rows; the architect's
 * confirmation overrides at the persona-emit moment.
 *
 * verifyBeforePublicLaunch — orientation only.
 */

interface Args {
  intent: string
  bundesland: string
}

const NOW = (): string => new Date().toISOString()

const baselineProcedure = (
  id: string,
  title_de: string,
  title_en: string,
  rationale_de: string,
  rationale_en: string,
): Procedure => ({
  id,
  title_de,
  title_en,
  status: 'erforderlich',
  rationale_de,
  rationale_en,
  qualifier: {
    source: 'LEGAL',
    quality: 'CALCULATED',
    setAt: NOW(),
    setBy: 'system',
    reason:
      'Wahrscheinliches Verfahren basierend auf Vorhaben + Bundesland — bestätigt durch die Architekt:in.',
  },
})

export function deriveBaselineProcedure({
  intent,
  bundesland,
}: Args): Procedure[] {
  const loc = getStateLocalization(bundesland)
  const simp = loc.procedure.simplified
  const free = loc.procedure.free
  const reg = loc.procedure.regular
  // Compose "title · citation" string when a citation is available
  // (substantive states); fall back to bare procedure name for stubs.
  const compose = (
    p: { nameDe: string; nameEn: string; citation: string } | null,
  ) => ({
    de: p ? (p.citation ? `${p.nameDe} · ${p.citation}` : p.nameDe) : '',
    en: p ? (p.citation ? `${p.nameEn} · ${p.citation}` : p.nameEn) : '',
  })
  const tSimp = compose(simp)
  const tFree = compose(free)

  switch (intent) {
    case 'neubau_einfamilienhaus':
    case 'neubau_mehrfamilienhaus':
    case 'aufstockung':
    case 'anbau':
      return [
        baselineProcedure(
          'P-Vereinfacht',
          tSimp.de,
          tSimp.en,
          `Standardpfad für Wohnvorhaben in Gebäudeklasse 1–3 in ${loc.labelDe}; entfällt bei Sonderbauten oder Freistellungs-Konstellationen.`,
          `Standard path for residential projects in building class 1–3 in ${loc.labelEn}; replaced by Sonderbau scope or permit-exemption cases.`,
        ),
        ...(free
          ? [
              baselineProcedure(
                'P-Freistellung',
                tFree.de,
                tFree.en,
                `Möglich, wenn die Voraussetzungen der ${loc.labelDe}-LBO erfüllt sind (qualifizierter Bebauungsplan etc.).`,
                `Available when the ${loc.labelEn} LBO preconditions are met (qualified Bebauungsplan etc.).`,
              ),
            ]
          : []),
      ]
    case 'sanierung':
    case 'umnutzung':
      return [
        baselineProcedure(
          'P-Vereinfacht',
          tSimp.de,
          tSimp.en,
          `Bei strukturellen oder nutzungsändernden Eingriffen Pflicht. Geringfügige Maßnahmen können nach ${loc.labelDe}-LBO verfahrensfrei sein.`,
          `Required for structural or use-change interventions. Minor measures may be permit-free under the ${loc.labelEn} LBO.`,
        ),
      ]
    case 'abbruch':
      return [
        baselineProcedure(
          'P-Abbruch',
          // Abbruch typically follows the state's regular procedure
          // path; show the regular permit pack here.
          reg.citation ? `${reg.nameDe} · ${reg.citation}` : reg.nameDe,
          reg.citation ? `${reg.nameEn} · ${reg.citation}` : reg.nameEn,
          `Abbruch-Anzeige bzw. Baugenehmigung nach ${loc.labelDe}-LBO; Schwelle und Form variieren je Land.`,
          `Demolition notification or building permit per the ${loc.labelEn} LBO; threshold and form vary by state.`,
        ),
      ]
    default:
      return [
        baselineProcedure(
          'P-Vereinfacht',
          tSimp.de,
          tSimp.en,
          `Standardpfad für die meisten Bauvorhaben in ${loc.labelDe}.`,
          `Standard path for most construction projects in ${loc.labelEn}.`,
        ),
      ]
  }
}
