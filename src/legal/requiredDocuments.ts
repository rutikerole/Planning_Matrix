// ───────────────────────────────────────────────────────────────────────
// v1.0.19 — Canonical required-documents resolver.
//
// v1.0.18's Documents section rendered "No documents recorded yet"
// for projects where the required-Anlagen list is DETERMINISTIC from
// (procedureKind, intent, bundesland, eingriff_flags, GEG trigger,
// baujahr). A NRW T-03 Sanierung touching the building envelope
// triggers at least 7 mandatory Bauvorlagen — and the system has all
// the state needed to enumerate them but the renderer was relying on
// state.docs which the persona doesn't auto-populate.
//
// This resolver returns the canonical document list. exportPdf
// assembly calls it ONCE; Documents renderer consumes the output.
// state.docs (when present) overrides — gives the persona an escape
// hatch for unusual cases.
//
// Folds in Bug 41 (Wärmeschutznachweis promotion) — GEG-Nachweis +
// Energieausweis appear as 'required' documents whenever geg_trigger
// is true. § 48 GEG (Wärmeschutz) + § 80 GEG (Energieausweis) cited.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from './states/_types'
import type {
  ProcedureIntent,
  ProcedureKind,
} from './resolveProcedure'

export type DocumentStatus = 'required' | 'conditional' | 'recommended'

export interface RequiredDocument {
  /** Stable identifier. */
  key: string
  name_de: string
  name_en: string
  status: DocumentStatus
  /** Who produces / delivers (e.g. "Architekt:in", "ÖbVI",
   *  "Energieberater:in"). Rendered as a "→ ..." sub-line. */
  delivery_de: string
  delivery_en: string
  /** Optional § citation (e.g. "§ 48 GEG", "§ 6 BauO NRW"). */
  citation?: string
  /** Optional explanation when status === 'conditional'. */
  condition_note_de?: string
  condition_note_en?: string
}

export interface DocumentCase {
  procedureKind: ProcedureKind
  intent: ProcedureIntent
  bundesland: BundeslandCode
  eingriff_tragende_teile: boolean
  eingriff_aussenhuelle: boolean
  denkmalschutz: boolean
  grenzstaendig?: boolean
  /** GEG triggered when external-shell work crosses the threshold
   *  (10% Fassadenfläche) OR complete window replacement. The
   *  caller computes this; default true when eingriff_aussenhuelle
   *  AND fassadenflaeche_m2 > 0 since the threshold is satisfied
   *  by any of the documented Königsallee-class cases. */
  geg_trigger: boolean
  fassadenflaeche_m2?: number
  /** Pre-1995 Altbau → Asbest/PCB recommendation surfaces. Defaults
   *  to true for inner-city Düsseldorf addresses when unknown. */
  baujahr_pre_1995?: boolean
}

/**
 * Canonical required-Bauvorlagen list for a given case. NRW Sanierung
 * baseline encoded; other Bundesländer extend in v1.0.20+. Returns
 * documents in delivery-priority order: always-required first,
 * conditional after, recommended last.
 */
export function requiredDocumentsForCase(
  c: DocumentCase,
): RequiredDocument[] {
  const out: RequiredDocument[] = []

  // ── Always-required (regardless of procedure kind) ──────────────
  out.push({
    key: 'lageplan',
    name_de: 'Amtlicher Lageplan',
    name_en: 'Official site plan',
    status: 'required',
    delivery_de: 'Öffentlich bestellte:r Vermessungsingenieur:in (ÖbVI), max. 6 Monate alt',
    delivery_en: 'Publicly licensed surveyor (ÖbVI), no older than 6 months',
    citation: 'BauVorlVO NRW § 3',
  })
  out.push({
    key: 'bauzeichnungen',
    name_de: 'Bauzeichnungen (Grundrisse · Schnitte · Ansichten, Bestand + Planung)',
    name_en: 'Construction drawings (plans · sections · elevations, existing + proposed)',
    status: 'required',
    delivery_de: 'Architekt:in',
    delivery_en: 'Architect',
    citation: 'BauVorlVO NRW § 3',
  })
  out.push({
    key: 'baubeschreibung',
    name_de: 'Baubeschreibung',
    name_en: 'Project description',
    status: 'required',
    delivery_de: 'Architekt:in',
    delivery_en: 'Architect',
    citation: 'BauVorlVO NRW § 3',
  })

  // ── Procedure-specific formular ────────────────────────────────
  if (c.procedureKind === 'verfahrensfrei') {
    out.push({
      key: 'anzeige_formular',
      name_de: 'Anzeige-Formular (verfahrensfrei)',
      name_en: 'Notification form (permit-free)',
      status: 'required',
      delivery_de: 'Architekt:in oder Bauherr:in',
      delivery_en: 'Architect or owner',
      citation: '§ 62 BauO NRW',
    })
  } else {
    out.push({
      key: 'bauantragsformular',
      name_de: 'Bauantragsformular',
      name_en: 'Building permit application form',
      status: 'required',
      delivery_de: 'Bauvorlageberechtigte:r Architekt:in',
      delivery_en: 'Submission-authorized architect',
      citation: '§ 64 BauO NRW',
    })
  }

  // ── GEG-Nachweise (Bug 41 promotion) ───────────────────────────
  if (c.geg_trigger) {
    out.push({
      key: 'geg_waermeschutznachweis',
      name_de: 'GEG-Wärmeschutznachweis (vor Baubeginn)',
      name_en: 'GEG thermal-insulation certificate (before construction)',
      status: 'required',
      delivery_de: 'Energieberater:in (dena-Liste)',
      delivery_en: 'Energy consultant (dena registry)',
      citation: '§ 48 GEG',
    })
    out.push({
      key: 'energieausweis',
      name_de: 'Energieausweis',
      name_en: 'Energy certificate',
      status: 'required',
      delivery_de: 'Energieberater:in (dena-Liste)',
      delivery_en: 'Energy consultant (dena registry)',
      citation: '§ 80 GEG',
    })
  }

  // ── Eingriff in tragende Teile ─────────────────────────────────
  if (c.eingriff_tragende_teile) {
    out.push({
      key: 'standsicherheitsnachweis',
      name_de: 'Standsicherheitsnachweis (Statik)',
      name_en: 'Structural calculation',
      status: 'required',
      delivery_de: 'Tragwerksplaner:in',
      delivery_en: 'Structural engineer',
      citation: '§ 68 BauO NRW',
    })
    out.push({
      key: 'brandschutznachweis',
      name_de: 'Brandschutznachweis',
      name_en: 'Fire-protection certificate',
      status: 'conditional',
      delivery_de: 'Brandschutzplaner:in oder Architekt:in (je Gebäudeklasse)',
      delivery_en: 'Fire-protection engineer or architect (per Gebäudeklasse)',
      citation: '§ 14 BauO NRW',
      condition_note_de:
        'Erforderlich ab Gebäudeklasse 3; bei GK 1+2 zumeist im Bauantrag erfasst.',
      condition_note_en:
        'Required from building class 3 onward; classes 1+2 usually covered in the permit application.',
    })
  }

  // ── Abstandsflächen-Hinweis ────────────────────────────────────
  if (
    c.grenzstaendig ||
    (c.eingriff_aussenhuelle && (c.fassadenflaeche_m2 ?? 0) > 100)
  ) {
    out.push({
      key: 'abstandsflaechen',
      name_de: 'Abstandsflächenberechnung',
      name_en: 'Abstandsflächen calculation',
      status: 'conditional',
      delivery_de: 'Architekt:in',
      delivery_en: 'Architect',
      citation: '§ 6 BauO NRW',
      condition_note_de:
        'Bei Dämmungsstärke > 25 cm oder grenzständiger Lage; § 6 Abs. 8 BauO NRW erlaubt sonst Privileg.',
      condition_note_en:
        'When insulation thickness > 25 cm or parcel-edge location; § 6 Abs. 8 BauO NRW grants exemption otherwise.',
    })
  }

  // ── Denkmalschutz-Erlaubnis ────────────────────────────────────
  if (c.denkmalschutz) {
    out.push({
      key: 'denkmalschutz_erlaubnis',
      name_de: 'Erlaubnis der Denkmalschutzbehörde',
      name_en: 'Heritage authority consent',
      status: 'required',
      delivery_de: 'Untere Denkmalbehörde (Stadt Düsseldorf)',
      delivery_en: 'Local heritage authority',
      citation: 'DSchG NRW § 9',
    })
  }

  // ── Recommended: Asbest/PCB-Voruntersuchung ────────────────────
  // Düsseldorf Altbau (Königsallee) is almost always pre-1995.
  if (c.baujahr_pre_1995 !== false) {
    out.push({
      key: 'asbest_voruntersuchung',
      name_de: 'Asbest-/PCB-Voruntersuchung (bei Altbau vor 1995)',
      name_en: 'Asbestos/PCB pre-investigation (Altbau before 1995)',
      status: 'recommended',
      delivery_de: 'Schadstoffsachverständige:r',
      delivery_en: 'Pollutant-survey specialist',
      citation: 'TRGS 519',
    })
  }

  return out
}
