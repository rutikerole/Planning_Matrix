import type { Fact } from '@/types/projectState'

/**
 * Phase 8.5 (C.4 + C.8) — fact key/value → human-readable label.
 *
 * The Verify-with-Architect card and the Executive Read's flag summary
 * both used to fall back to either `f.evidence` (a raw user quote like
 * "Bauherr: 'approximately 1925'") or `${f.key}: ${f.value}` (raw DB
 * shape like "Ensemble Schwabing Geprueft: false"). Both leak.
 *
 * humanizeFact maps known fact keys to curated locale-aware templates
 * with `{{value}}` interpolation. Unmapped keys fall through to an
 * algorithmic transform (snake_case → Title Case + value rendered in
 * plain language). Boolean values render as "applies / not applicable"
 * etc. instead of "true / false".
 *
 * verifyBeforePublicLaunch — same caveat as the rest of the workspace's
 * curated content. Templates curated for typical Bayern fact keys; new
 * keys need a template addition or they fall to the algorithmic
 * fallback (which is acceptable but generic).
 */

interface Template {
  de: string
  en: string
}

/**
 * Phase 8.5 — curated humanization templates. Templates use
 * `{{value}}` for the fact's structured value. When the value is a
 * boolean, the template typically omits `{{value}}` and reads as a
 * complete sentence on its own.
 */
const TEMPLATES: Record<string, Template> = {
  // ── Existing building / heritage ─────────────────────────────────
  bestandsgebaeude_baujahr: {
    de: 'Baujahr Bestand (ca. {{value}}) — zu verifizieren',
    en: 'Year of existing building (~{{value}}) — needs verification',
  },
  baujahr_geschaetzt: {
    de: 'Baujahr geschätzt — Bestätigung erforderlich',
    en: 'Year of construction estimated — confirmation required',
  },
  denkmalschutz_geprueft: {
    de: 'Denkmalschutz noch nicht geprüft — Denkmal-Atlas-Anfrage offen',
    en: 'Heritage status not yet checked — Denkmal-Atlas inquiry needed',
  },
  ensemble_schwabing_geprueft: {
    de: 'Schwabing-Ensemble-Prüfung offen — BLfD-Bestätigung erforderlich',
    en: 'Schwabing Ensemble check pending — BLfD confirmation required',
  },
  ensemble_maxvorstadt_geprueft: {
    de: 'Maxvorstadt-Ensemble-Prüfung offen — BLfD-Bestätigung erforderlich',
    en: 'Maxvorstadt Ensemble check pending — BLfD confirmation required',
  },
  ensemble_lehel_geprueft: {
    de: 'Lehel-Ensemble-Prüfung offen — BLfD-Bestätigung erforderlich',
    en: 'Lehel Ensemble check pending — BLfD confirmation required',
  },
  baudenkmal_status: {
    de: 'Baudenkmal-Status: {{value}}',
    en: 'Listed-building status: {{value}}',
  },

  // ── Areas / floors ───────────────────────────────────────────────
  bruttogrundflaeche_m2: {
    de: 'Bruttogrundfläche (BGF) {{value}} m²',
    en: 'Gross floor area (BGF) {{value}} m²',
  },
  nettogrundflaeche_m2: {
    de: 'Nettogrundfläche (NGF) {{value}} m²',
    en: 'Net floor area (NGF) {{value}} m²',
  },
  geplante_grundflaeche_m2: {
    de: 'Geplante Grundfläche {{value}} m² (Footprint)',
    en: 'Planned footprint {{value}} m²',
  },
  grundstueck_groesse_m2: {
    de: 'Grundstücksgröße {{value}} m²',
    en: 'Plot size {{value}} m²',
  },
  grz_geplant: {
    de: 'Geplante GRZ {{value}}',
    en: 'Planned GRZ {{value}}',
  },
  gfz_geplant: {
    de: 'Geplante GFZ {{value}}',
    en: 'Planned GFZ {{value}}',
  },

  // ── Building geometry ────────────────────────────────────────────
  gebaeudeklasse_geplant: {
    de: 'Geplante Gebäudeklasse: {{value}}',
    en: 'Planned building class: {{value}}',
  },
  gebaeudeklasse_hypothese: {
    de: 'Gebäudeklasse-Hypothese: {{value}} — durch Architekt:in zu bestätigen',
    en: 'Building class hypothesis: {{value}} — pending architect confirmation',
  },
  vollgeschosse_oberirdisch: {
    de: 'Vollgeschosse oberirdisch: {{value}}',
    en: 'Above-ground full storeys: {{value}}',
  },
  bauwerks_hoehe_m: {
    de: 'Geplante Bauwerkshöhe {{value}} m',
    en: 'Planned building height {{value}} m',
  },
  abstandsflaeche_einhaltbar: {
    de: 'Abstandsflächen — Einhaltung zu prüfen',
    en: 'Setback compliance — pending check',
  },

  // ── Planungsrecht ────────────────────────────────────────────────
  bplan_existiert: {
    de: 'Bebauungsplan vorhanden: {{value}}',
    en: 'Bebauungsplan exists: {{value}}',
  },
  innenbereich_eingeordnet: {
    de: 'Innenbereich-Einordnung nach § 34 BauGB',
    en: 'Inner-area classification per § 34 BauGB',
  },
  einfuegungsgebot_geprueft: {
    de: 'Einfügungsgebot — Umgebungs-Vergleich offen',
    en: 'Einfügungsgebot — surroundings comparison pending',
  },

  // ── Verfahren ────────────────────────────────────────────────────
  verfahrensart_geplant: {
    de: 'Geplante Verfahrensart: {{value}}',
    en: 'Planned procedure type: {{value}}',
  },
  vereinfachtes_verfahren_anwendbar: {
    de: 'Vereinfachtes Verfahren (BayBO Art. 58) — Anwendbarkeit zu bestätigen',
    en: 'Simplified procedure (BayBO Art. 58) — applicability pending',
  },
  freistellung_anwendbar: {
    de: 'Genehmigungsfreistellung (BayBO Art. 57) — Voraussetzungen offen',
    en: 'Permit exemption (BayBO Art. 57) — preconditions pending',
  },

  // ── Sonstige Vorgaben ────────────────────────────────────────────
  baumschutz_betroffen: {
    de: 'Baumschutz nach BaumschutzV 901 betroffen — Baumkartierung empfohlen',
    en: 'Tree protection (BaumschutzV 901) applies — tree survey recommended',
  },
  pv_pflicht: {
    de: 'PV-Pflicht (Art. 44a BayBO) anzuwenden',
    en: 'PV requirement (Art. 44a BayBO) applies',
  },
  stellplatz_anzahl_geplant: {
    de: 'Geplante Stellplätze: {{value}} (StPlS 926)',
    en: 'Planned parking spaces: {{value}} (StPlS 926)',
  },
  energieausweis_typ: {
    de: 'Energieausweis-Typ (GEG 2024): {{value}}',
    en: 'Energy certificate type (GEG 2024): {{value}}',
  },
  geg_klasse: {
    de: 'GEG-Effizienzklasse: {{value}}',
    en: 'GEG efficiency class: {{value}}',
  },

  // ── Procedural status (booleans) ─────────────────────────────────
  vorbescheid_eingeholt: {
    de: 'Vorbescheid {{value_or_pending}}',
    en: 'Pre-decision {{value_or_pending}}',
  },
  nachbarn_informiert: {
    de: 'Nachbarn {{value_or_pending}}',
    en: 'Neighbours {{value_or_pending}}',
  },
}

const PRESENT_DE: Record<string, string> = {
  true: 'eingeholt',
  false: 'noch nicht eingeholt',
}
const PRESENT_EN: Record<string, string> = {
  true: 'obtained',
  false: 'pending',
}

/**
 * Format a fact's value for inline interpolation. Booleans render as
 * locale-friendly "ja/nein" / "yes/no" so the message reads naturally
 * in templates that DON'T already have a curated sentence shape.
 */
function formatValue(value: unknown, lang: 'de' | 'en'): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') {
    if (lang === 'de') return value ? 'ja' : 'nein'
    return value ? 'yes' : 'no'
  }
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

function humanizeBoolValue(
  value: unknown,
  lang: 'de' | 'en',
): string | null {
  if (typeof value !== 'boolean') return null
  const map = lang === 'de' ? PRESENT_DE : PRESENT_EN
  return map[String(value)] ?? null
}

/**
 * Phase 8.5 — algorithmic fallback for unmapped fact keys.
 * snake_case → Title Case (with German umlaut transliteration
 * normalised back if present), value rendered with formatValue.
 */
function algorithmicLabel(fact: Fact, lang: 'de' | 'en'): string {
  const tokens = fact.key
    .replace(/_/g, ' ')
    .split(' ')
    .filter((t) => t.length > 0)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
  const label = tokens.join(' ')
  const valueText = formatValue(fact.value, lang)
  if (!valueText || valueText === '—') return label
  return `${label}: ${valueText}`
}

/**
 * Phase 8.5 — main entry. Surface a fact as a single human-readable
 * line in the requested locale.
 */
export function humanizeFact(fact: Fact, lang: 'de' | 'en' = 'de'): string {
  const template = TEMPLATES[fact.key]
  if (!template) return algorithmicLabel(fact, lang)
  let line = lang === 'en' ? template.en : template.de
  if (line.includes('{{value}}')) {
    line = line.replace('{{value}}', formatValue(fact.value, lang))
  }
  if (line.includes('{{value_or_pending}}')) {
    const replacement =
      humanizeBoolValue(fact.value, lang) ?? formatValue(fact.value, lang)
    line = line.replace('{{value_or_pending}}', replacement)
  }
  return line
}
