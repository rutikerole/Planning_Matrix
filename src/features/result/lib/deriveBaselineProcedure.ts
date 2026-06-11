import type { Procedure } from '@/types/projectState'
import { getStateLocalization } from '@/legal/stateLocalization'
import { beseitigungCitationFor } from '@/legal/resolveProcedure'
import type { BundeslandCode } from '@/legal/states/_types'

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
          `Standardpfad für Wohnvorhaben ohne Sonderbau-Tatbestand in ${loc.labelDe}; bei Sonderbauten oder Freistellungs-Konstellationen abweichend.`,
          `Standard path for residential projects without a Sonderbau scope in ${loc.labelEn}; differs for Sonderbau scope or permit-exemption cases.`,
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
    case 'abbruch': {
      // T-05 sprint — the old pack showed the REGULAR BUILDING PERMIT
      // ("Abbruch typically follows the state's regular procedure path"),
      // which is legally backwards: the MBO-family demolition default is
      // verfahrensfrei (small freestanding) or Anzeige (larger/attached) —
      // a Baugenehmigung is the exception, not the baseline. Cite the
      // owner-side Beseitigung-§ (corpus pick, free-§ fallback). NOTE: with
      // resolveProcedures decision-first, abbruch always resolves via the
      // canonical resolver; this pack is the honest fallback for any other
      // caller.
      const beseitigungCit = beseitigungCitationFor(
        bundesland as BundeslandCode,
      )
      return [
        baselineProcedure(
          'P-Abbruch',
          beseitigungCit
            ? `Beseitigung (Abbruch) · ${beseitigungCit}`
            : 'Beseitigung (Abbruch)',
          beseitigungCit
            ? `Demolition (Beseitigung) · ${beseitigungCit}`
            : 'Demolition (Beseitigung)',
          `Je nach Gebäudegröße, -klasse und Lage verfahrensfrei oder anzeigepflichtig${beseitigungCit ? ` (${beseitigungCit})` : ''}; eine Baugenehmigung ist nur ausnahmsweise erforderlich. Schwelle und Anzeigefrist mit der unteren Bauaufsichtsbehörde klären.`,
          `Procedure-free or notification-required${beseitigungCit ? ` (${beseitigungCit})` : ''} depending on building size, class and situation; a building permit is required only exceptionally. Clarify the threshold and notification period with the lower building authority.`,
        ),
      ]
    }
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
