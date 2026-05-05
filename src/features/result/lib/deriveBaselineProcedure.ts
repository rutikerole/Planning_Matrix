import type { Procedure } from '@/types/projectState'

/**
 * Phase 8.1 (A.3) — baseline `Procedure[]` inferred from intent +
 * Bundesland when persona hasn't yet emitted any procedures.
 *
 * Conservative defaults per Bayern practice. The procedure card in
 * the UI shows a "wahrscheinlich · pending architect confirmation"
 * pill on baseline rows; the architect's confirmation overrides at
 * the persona-emit moment.
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
  void bundesland // v1 only ships Bayern; future Phase 9 expands.

  switch (intent) {
    case 'neubau_einfamilienhaus':
    case 'neubau_mehrfamilienhaus':
    case 'aufstockung':
    case 'anbau':
      return [
        baselineProcedure(
          'P-Vereinfacht',
          'Vereinfachtes Baugenehmigungsverfahren · BayBO Art. 58',
          'Simplified building permit · BayBO Art. 58',
          'Standardpfad für Wohnvorhaben in Gebäudeklasse 1–3; entfällt nur bei Sonderbauten oder bei Genehmigungsfreistellung nach Art. 57.',
          'Standard path for residential projects in building class 1–3; replaced only by Sonderbau scope or permit-exemption under Art. 57.',
        ),
        baselineProcedure(
          'P-Freistellung',
          'Genehmigungsfreistellung · BayBO Art. 57',
          'Permit exemption · BayBO Art. 57',
          'Möglich, wenn ein qualifizierter Bebauungsplan vorliegt und das Vorhaben dessen Festsetzungen einhält.',
          'Available when a qualified Bebauungsplan exists and the project complies with its provisions.',
        ),
      ]
    case 'sanierung':
    case 'umnutzung':
      return [
        baselineProcedure(
          'P-Vereinfacht',
          'Vereinfachtes Baugenehmigungsverfahren · BayBO Art. 58',
          'Simplified building permit · BayBO Art. 58',
          'Bei strukturellen oder nutzungsändernden Eingriffen Pflicht. Geringfügige Maßnahmen können verfahrensfrei sein (Art. 57 Abs. 1 Nr. 6).',
          'Required for structural or use-change interventions. Minor measures may be permit-free (Art. 57(1)(6)).',
        ),
      ]
    case 'abbruch':
      return [
        baselineProcedure(
          'P-Abbruch',
          'Abbruchanzeige bzw. Genehmigung · BayBO Art. 57 / 60',
          'Demolition notification or permit · BayBO Art. 57 / 60',
          'Bis 300 m³ umbauter Raum genügt eine Anzeige; darüber Baugenehmigung erforderlich.',
          'Up to 300 m³ enclosed volume a notification suffices; above that a full permit is required.',
        ),
      ]
    default:
      return [
        baselineProcedure(
          'P-Vereinfacht',
          'Vereinfachtes Baugenehmigungsverfahren · BayBO Art. 58',
          'Simplified building permit · BayBO Art. 58',
          'Standardpfad für die meisten Bauvorhaben in Bayern.',
          'Standard path for most construction projects in Bayern.',
        ),
      ]
  }
}
