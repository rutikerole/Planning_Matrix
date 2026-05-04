// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #70 — German labels for the model's fact keys
//
// Maps `state.facts[].key` (DOMAIN.SUBKEY shape, snake_case) to natural
// German labels + an optional unit. Sites that consume keys raw show
// ugly all-caps strings like `STRUCTURAL.EXECUTION_DRAWINGS_REQUIRED`;
// after this table everything reads as German prose.
//
// Coverage philosophy: enumerate every key the model's known to emit
// in T-01 / T-02 / T-03 conversations. Unmapped keys fall back to a
// generic humanizer (factLabel.ts). DEV-only console.warn on unmapped
// keys gives us a feedback loop for new domains.
// ───────────────────────────────────────────────────────────────────────

export interface FactLabel {
  label: string
  unit?: string
}

export const factLabelsDe: Record<string, FactLabel> = {
  // ── Plot / Grundstück ─────────────────────────────────────────────
  'PLOT.HASPLOT': { label: 'Grundstück vorhanden' },
  'PLOT.HAS_PLOT': { label: 'Grundstück vorhanden' },
  'PLOT.ADDRESS': { label: 'Adresse' },
  'PLOT.ADDRESS.STREET': { label: 'Straße' },
  'PLOT.ADDRESS.HOUSENUMBER': { label: 'Hausnummer' },
  'PLOT.ADDRESS.HOUSE_NUMBER': { label: 'Hausnummer' },
  'PLOT.ADDRESS.POSTALCODE': { label: 'Postleitzahl' },
  'PLOT.ADDRESS.POSTAL_CODE': { label: 'Postleitzahl' },
  'PLOT.ADDRESS.CITY': { label: 'Ort' },
  'PLOT.ADDRESS.STATE': { label: 'Bundesland' },
  'PLOT.AREA_SQM': { label: 'Grundstücksfläche', unit: 'm²' },
  'PLOT.AREA': { label: 'Grundstücksfläche', unit: 'm²' },
  'PLOT.SHAPE': { label: 'Grundstücksform' },
  'PLOT.SLOPE': { label: 'Geländeneigung' },
  'PLOT.OWNERSHIP': { label: 'Eigentumsverhältnis' },
  'PLOT.BAULASTEN': { label: 'Eingetragene Baulasten' },
  'PLOT.B_PLAN_AVAILABLE': { label: 'Bebauungsplan vorhanden' },
  'PLOT.B_PLAN_DESIGNATION': { label: 'B-Plan Bezeichnung' },
  'PLOT.B_PLAN_ZONE': { label: 'Gebietsfestsetzung' },
  'PLOT.B_PLAN_NUMBER': { label: 'B-Plan Nummer' },
  'PLOT.IS_INNENBEREICH': { label: 'Im Innenbereich (§ 34 BauGB)' },
  'PLOT.IS_AUSSENBEREICH': { label: 'Im Außenbereich (§ 35 BauGB)' },
  'PLOT.IS_BEPLANT': { label: 'Im Geltungsbereich eines B-Plans (§ 30 BauGB)' },
  'PLOT.DENKMALSCHUTZ': { label: 'Denkmalschutz' },
  'PLOT.NEIGHBORS_BUILT': { label: 'Bebaute Nachbargrundstücke' },
  'PLOT.ACCESS_ROAD': { label: 'Erschließung' },

  // ── Building / Gebäude ────────────────────────────────────────────
  'BUILDING.TYPE': { label: 'Gebäudetyp' },
  'BUILDING.GEBAEUDEKLASSE': { label: 'Gebäudeklasse (Art. 2 BayBO)' },
  'BUILDING.GEBAUDEKLASSE': { label: 'Gebäudeklasse (Art. 2 BayBO)' },
  'BUILDING.HEIGHT_M': { label: 'Gebäudehöhe', unit: 'm' },
  'BUILDING.HEIGHT': { label: 'Gebäudehöhe', unit: 'm' },
  'BUILDING.STORIES': { label: 'Geschosse' },
  'BUILDING.NUMBER_OF_STORIES': { label: 'Anzahl Geschosse' },
  'BUILDING.UNITS': { label: 'Nutzungseinheiten' },
  'BUILDING.NUMBER_OF_UNITS': { label: 'Anzahl Nutzungseinheiten' },
  'BUILDING.LIVING_AREA_SQM': { label: 'Wohnfläche', unit: 'm²' },
  'BUILDING.LIVING_AREA': { label: 'Wohnfläche', unit: 'm²' },
  'BUILDING.GROSS_AREA_SQM': { label: 'Bruttogeschossfläche', unit: 'm²' },
  'BUILDING.GROSS_AREA': { label: 'Bruttogeschossfläche', unit: 'm²' },
  'BUILDING.FOOTPRINT_SQM': { label: 'Grundflächenzahl (GRZ)', unit: 'm²' },
  'BUILDING.FOOTPRINT': { label: 'Grundfläche', unit: 'm²' },
  'BUILDING.EXISTING': { label: 'Bestandsgebäude' },
  'BUILDING.YEAR_BUILT': { label: 'Baujahr' },
  'BUILDING.SONDERBAU': { label: 'Sonderbau-Tatbestand (Art. 2 Abs. 4 BayBO)' },
  'BUILDING.USE': { label: 'Nutzung' },
  'BUILDING.USAGE': { label: 'Nutzung' },
  'BUILDING.PRIMARY_USE': { label: 'Hauptnutzung' },
  'BUILDING.CONSTRUCTION_TYPE': { label: 'Bauweise' },
  'BUILDING.ROOF_TYPE': { label: 'Dachform' },
  'BUILDING.WALL_MATERIAL': { label: 'Wandbaustoff' },

  // ── Project scope / Vorhaben ──────────────────────────────────────
  'PROJECT.SCOPE': { label: 'Projektumfang' },
  'PROJECT.SCOPE.NEUBAU': { label: 'Neubau' },
  'PROJECT.SCOPE.SANIERUNG': { label: 'Sanierung' },
  'PROJECT.SCOPE.UMNUTZUNG': { label: 'Umnutzung' },
  'PROJECT.SCOPE.ABBRUCH': { label: 'Abbruch' },
  'PROJECT.SCOPE.ANBAU': { label: 'Anbau' },
  'PROJECT.SCOPE.ERWEITERUNG': { label: 'Erweiterung' },
  'PROJECT.SCOPE.AUFSTOCKUNG': { label: 'Aufstockung' },
  'PROJECT.SCOPE.INTERIOR_REFURBISHMENT': { label: 'Innensanierung' },
  'PROJECT.SCOPE.BUILDING_SERVICES_MODERNIZATION': {
    label: 'Modernisierung der Gebäudetechnik',
  },
  'PROJECT.SCOPE.ENERGY_EFFICIENCY_IMPROVEMENTS': {
    label: 'Energetische Sanierung',
  },
  'PROJECT.SCOPE.STRUCTURAL_CHANGES': { label: 'Tragwerksänderungen' },
  'PROJECT.SCOPE.FAÇADE': { label: 'Fassadenarbeiten' },
  'PROJECT.SCOPE.FACADE': { label: 'Fassadenarbeiten' },
  'PROJECT.INTENT': { label: 'Vorhaben' },
  'PROJECT.START_DATE': { label: 'Geplanter Baubeginn' },
  'PROJECT.BUDGET': { label: 'Budget', unit: 'EUR' },

  // ── Structural / Tragwerk ─────────────────────────────────────────
  'STRUCTURAL.EXECUTION_DRAWINGS_REQUIRED': {
    label: 'Ausführungszeichnungen erforderlich',
  },
  'STRUCTURAL.BEARING_DEPTH_MIN': { label: 'Mindestauflagentiefe', unit: 'mm' },
  'STRUCTURAL.CONNECTION_DETAILS_REQUIRED': {
    label: 'Verbindungsdetails erforderlich',
  },
  'STRUCTURAL.PROOF_COMPONENTS': { label: 'Nachweispflichtige Bauteile' },
  'STRUCTURAL.LOAD_TRANSFER_CALCULATION': { label: 'Lastabtragsberechnung' },
  'STRUCTURAL.STATIC_PROOF_REQUIRED': { label: 'Standsicherheitsnachweis' },
  'STRUCTURAL.SOIL_REPORT_REQUIRED': { label: 'Baugrundgutachten' },
  'STRUCTURAL.ROOF_LOAD': { label: 'Dachlast' },
  'STRUCTURAL.SNOW_LOAD_ZONE': { label: 'Schneelastzone (DIN EN 1991-1-3)' },
  'STRUCTURAL.WIND_LOAD_ZONE': { label: 'Windlastzone (DIN EN 1991-1-4)' },
  'STRUCTURAL.SEISMIC_ZONE': { label: 'Erdbebenzone (DIN EN 1998)' },

  // ── Energy / GEG ──────────────────────────────────────────────────
  'ENERGY.GEG_APPLICABLE': { label: 'GEG anwendbar' },
  'ENERGY.GEG_NACHWEIS_REQUIRED': { label: 'GEG-Nachweis erforderlich' },
  'ENERGY.PV_PFLICHT_BAYERN': { label: 'PV-Pflicht (Bayern)' },
  'ENERGY.PV_PFLICHT': { label: 'PV-Pflicht' },
  'ENERGY.HEATING_TYPE': { label: 'Heizungsart' },
  'ENERGY.PRIMARY_ENERGY_DEMAND': {
    label: 'Primärenergiebedarf',
    unit: 'kWh/(m²·a)',
  },
  'ENERGY.U_VALUE_REQUIREMENT_W_M2K': {
    label: 'U-Wert Anforderung',
    unit: 'W/(m²·K)',
  },
  'ENERGY.U_VALUE_REQUIREMENT': { label: 'U-Wert Anforderung', unit: 'W/(m²·K)' },
  'ENERGY.INSULATION_REQUIRED': { label: 'Dämmung erforderlich' },
  'ENERGY.RENEWABLES_SHARE_PCT': { label: 'Erneuerbare-Anteil', unit: '%' },

  // ── Procedure / Verfahren ─────────────────────────────────────────
  'PROCEDURE.TYPE': { label: 'Verfahrensart' },
  'PROCEDURE.GENEHMIGUNGSFREISTELLUNG': {
    label: 'Genehmigungsfreistellung (Art. 57 BayBO)',
  },
  'PROCEDURE.VEREINFACHT': { label: 'Vereinfachtes Verfahren (Art. 58 BayBO)' },
  'PROCEDURE.VEREINFACHTES_VERFAHREN': {
    label: 'Vereinfachtes Verfahren (Art. 58 BayBO)',
  },
  'PROCEDURE.REGULAR': {
    label: 'Reguläres Baugenehmigungsverfahren (Art. 59 BayBO)',
  },
  'PROCEDURE.STANDARD': {
    label: 'Reguläres Baugenehmigungsverfahren (Art. 59 BayBO)',
  },
  'PROCEDURE.VOLLPRÜFUNG': { label: 'Vollprüfung (Art. 59 BayBO)' },
  'PROCEDURE.VORBESCHEID': { label: 'Vorbescheidsverfahren' },

  // ── Parties / Beteiligte ──────────────────────────────────────────
  'PARTIES.BAUHERR.NAME': { label: 'Name (Bauherr)' },
  'PARTIES.BAUHERR.EMAIL': { label: 'E-Mail (Bauherr)' },
  'PARTIES.BAUHERR.PHONE': { label: 'Telefon (Bauherr)' },
  'PARTIES.ARCHITEKT.NAME': { label: 'Name (Architekt:in)' },
  'PARTIES.ARCHITEKT.BAUVORLAGEBERECHTIGT': { label: 'Bauvorlageberechtigt' },
  'PARTIES.ARCHITEKT.KAMMER': { label: 'Kammer' },
  'PARTIES.TRAGWERKSPLANER.NAME': { label: 'Name (Tragwerksplaner:in)' },
  'PARTIES.BRANDSCHUTZ.NAME': { label: 'Name (Brandschutz)' },
  'PARTIES.ENERGIEBERATER.NAME': { label: 'Name (Energieberatung)' },

  // ── Stellplatz / Parkplatz ────────────────────────────────────────
  'STELLPLATZ.REQUIRED_COUNT': { label: 'Erforderliche Stellplätze' },
  'STELLPLATZ.PROVIDED_COUNT': { label: 'Vorhandene Stellplätze' },
  'STELLPLATZ.SATZUNG_REFERENCE': { label: 'Stellplatzsatzung-Referenz' },
  'STELLPLATZ.GARAGE_REQUIRED': { label: 'Garage erforderlich' },
  'STELLPLATZ.FAHRRAD_COUNT': { label: 'Erforderliche Fahrradstellplätze' },

  // ── Brandschutz ───────────────────────────────────────────────────
  'BRANDSCHUTZ.NACHWEIS_REQUIRED': { label: 'Brandschutznachweis erforderlich' },
  'BRANDSCHUTZ.FEUERWEHRZUFAHRT': { label: 'Feuerwehrzufahrt' },
  'BRANDSCHUTZ.FLUCHTWEG': { label: 'Fluchtweg' },
  'BRANDSCHUTZ.RAUCHMELDER_REQUIRED': { label: 'Rauchmelder erforderlich' },
  'BRANDSCHUTZ.GEBÄUDEKLASSE_FOLLOW_UP': {
    label: 'Brandschutz-Folgepflichten',
  },

  // ── Abstandsflächen / setbacks ────────────────────────────────────
  'ABSTANDSFLAECHEN.REQUIRED': { label: 'Abstandsflächen (Art. 6 BayBO)' },
  'ABSTANDSFLAECHEN.MIN_DISTANCE_M': {
    label: 'Mindestabstand zur Grundstücksgrenze',
    unit: 'm',
  },
  'ABSTANDSFLAECHEN.0_4H': { label: '0,4 H Abstandsfläche' },

  // ── Naturschutz / environment ─────────────────────────────────────
  'NATURSCHUTZ.SCHUTZGEBIET': { label: 'Schutzgebiet betroffen' },
  'NATURSCHUTZ.BAUMBESTAND': { label: 'Geschützter Baumbestand' },
  'NATURSCHUTZ.ARTENSCHUTZ': { label: 'Artenschutz-Prüfung erforderlich' },

  // ── Phase 6 A.6 — keys the Phase 6 system prompt encourages
  //                  the model to emit for T-01 in München.
  // Heritage / Denkmal / Erhaltungssatzung
  'HERITAGE.DENKMAL_PROTECTION': { label: 'Denkmalschutz (BayDSchG Art. 6)' },
  'HERITAGE.DENKMAL_LISTED': { label: 'Eingetragenes Baudenkmal' },
  'HERITAGE.DENKMAL_ATLAS_CHECK_REQUIRED': {
    label: 'Bayerischer Denkmal-Atlas zu prüfen',
  },
  'HERITAGE.ERHALTUNGSSATZUNG_AREA': {
    label: 'Im Erhaltungssatzungs-Bereich (BauGB § 172)',
  },
  'HERITAGE.ERHALTUNGSSATZUNG_NAME': { label: 'Erhaltungssatzung (Name)' },
  'HERITAGE.BLfD_ENQUIRY_REQUIRED': {
    label: 'BLfD-Voranfrage erforderlich',
  },

  // Existing building / Bestandsgebäude
  'BUILDING.EXISTING_PRESENT': { label: 'Bestandsgebäude vorhanden' },
  'BUILDING.EXISTING_YEAR_BUILT': { label: 'Baujahr Bestandsgebäude' },
  'BUILDING.EXISTING_USE': { label: 'Bisherige Nutzung Bestandsgebäude' },
  'BUILDING.DEMOLITION_PLANNED': { label: 'Abbruch geplant' },
  'BUILDING.DEMOLITION_PERMIT_REQUIRED': {
    label: 'Abbruchgenehmigung erforderlich',
  },

  // Erschließung
  'PLOT.ERSCHLIESSUNG_STATUS': { label: 'Erschließungs-Status' },
  'PLOT.ERSCHLIESSUNG_GESICHERT': { label: 'Erschließung gesichert' },
  'PLOT.WATER_CONNECTION': { label: 'Wasseranschluss' },
  'PLOT.SEWAGE_CONNECTION': { label: 'Abwasseranschluss' },
  'PLOT.ELECTRIC_CONNECTION': { label: 'Stromanschluss' },
  'PLOT.GAS_CONNECTION': { label: 'Gasanschluss' },
  'PLOT.DISTRICT_HEATING_CONNECTION': { label: 'Fernwärmeanschluss' },

  // Geometry / Building class derivation
  'BUILDING.VOLLGESCHOSSE': { label: 'Anzahl Vollgeschosse' },
  'BUILDING.BASEMENT_PRESENT': { label: 'Untergeschoss vorhanden' },
  'BUILDING.BASEMENT_VOLLGESCHOSS': {
    label: 'Untergeschoss zählt als Vollgeschoss',
  },
  'BUILDING.ATTIC_PRESENT': { label: 'Dachgeschoss vorhanden' },
  'BUILDING.ATTIC_VOLLGESCHOSS': {
    label: 'Dachgeschoss zählt als Vollgeschoss',
  },
  'BUILDING.DETACHED': { label: 'Freistehend' },

  // Stadtbezirk routing (LBK Mitte/Ost/West)
  'PLOT.STADTBEZIRK_NUMBER': { label: 'Stadtbezirk (Nr.)' },
  'PLOT.STADTBEZIRK_NAME': { label: 'Stadtbezirk' },
  'PLOT.LBK_SUB_OFFICE': { label: 'Zuständiges Sub-Bauamt (LBK)' },

  // Trees / BaumschutzV München
  'TREES.SPECIES': { label: 'Baumart' },
  'TREES.TRUNK_CIRCUMFERENCE_CM': { label: 'Stammumfang (in 1 m Höhe)', unit: 'cm' },
  'TREES.PROTECTED_BY_BAUMSCHUTZV': {
    label: 'Geschützt nach BaumschutzV München',
  },
  'TREES.FELLING_PERMIT_REQUIRED': {
    label: 'Fällgenehmigung erforderlich',
  },

  // Architekt-Beziehung
  'PARTIES.ARCHITEKT.ASSIGNED': {
    label: 'Bauvorlageberechtigte/r Architekt:in zugeordnet',
  },
  'PARTIES.ARCHITEKT.SOURCE': { label: 'Architekten-Quelle (BAYAK / privat)' },
}
