// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #70 — English labels for the model's fact keys
//
// Mirror of factLabels.de.ts. The model writes in German first; this
// table provides the parallel English UI rendering. Keep keys in sync
// with the German file — the resolver picks the right table per locale.
// ───────────────────────────────────────────────────────────────────────

import type { FactLabel } from './factLabels.de'

export const factLabelsEn: Record<string, FactLabel> = {
  // ── Plot ──────────────────────────────────────────────────────────
  'PLOT.HASPLOT': { label: 'Plot identified' },
  'PLOT.HAS_PLOT': { label: 'Plot identified' },
  'PLOT.ADDRESS': { label: 'Address' },
  'PLOT.ADDRESS.STREET': { label: 'Street' },
  'PLOT.ADDRESS.HOUSENUMBER': { label: 'House number' },
  'PLOT.ADDRESS.HOUSE_NUMBER': { label: 'House number' },
  'PLOT.ADDRESS.POSTALCODE': { label: 'Postal code' },
  'PLOT.ADDRESS.POSTAL_CODE': { label: 'Postal code' },
  'PLOT.ADDRESS.CITY': { label: 'City' },
  'PLOT.ADDRESS.STATE': { label: 'Federal state' },
  'PLOT.AREA_SQM': { label: 'Plot area', unit: 'm²' },
  'PLOT.AREA': { label: 'Plot area', unit: 'm²' },
  'PLOT.SHAPE': { label: 'Plot shape' },
  'PLOT.SLOPE': { label: 'Terrain slope' },
  'PLOT.OWNERSHIP': { label: 'Ownership' },
  'PLOT.BAULASTEN': { label: 'Registered building easements' },
  'PLOT.B_PLAN_AVAILABLE': { label: 'Development plan available' },
  'PLOT.B_PLAN_DESIGNATION': { label: 'B-Plan designation' },
  'PLOT.B_PLAN_ZONE': { label: 'B-Plan zone' },
  'PLOT.B_PLAN_NUMBER': { label: 'B-Plan number' },
  'PLOT.IS_INNENBEREICH': { label: 'Within built-up area (§ 34 BauGB)' },
  'PLOT.IS_AUSSENBEREICH': { label: 'In open countryside (§ 35 BauGB)' },
  'PLOT.IS_BEPLANT': { label: 'Within an active development plan (§ 30 BauGB)' },
  'PLOT.DENKMALSCHUTZ': { label: 'Heritage protection' },
  'PLOT.NEIGHBORS_BUILT': { label: 'Built neighbouring plots' },
  'PLOT.ACCESS_ROAD': { label: 'Site access' },

  // ── Building ──────────────────────────────────────────────────────
  'BUILDING.TYPE': { label: 'Building type' },
  'BUILDING.GEBAEUDEKLASSE': { label: 'Building class (Art. 2 BayBO)' },
  'BUILDING.GEBAUDEKLASSE': { label: 'Building class (Art. 2 BayBO)' },
  'BUILDING.HEIGHT_M': { label: 'Building height', unit: 'm' },
  'BUILDING.HEIGHT': { label: 'Building height', unit: 'm' },
  'BUILDING.STORIES': { label: 'Stories' },
  'BUILDING.NUMBER_OF_STORIES': { label: 'Number of stories' },
  'BUILDING.UNITS': { label: 'Use units' },
  'BUILDING.NUMBER_OF_UNITS': { label: 'Number of use units' },
  'BUILDING.LIVING_AREA_SQM': { label: 'Living area', unit: 'm²' },
  'BUILDING.LIVING_AREA': { label: 'Living area', unit: 'm²' },
  'BUILDING.GROSS_AREA_SQM': { label: 'Gross floor area', unit: 'm²' },
  'BUILDING.GROSS_AREA': { label: 'Gross floor area', unit: 'm²' },
  'BUILDING.FOOTPRINT_SQM': { label: 'Site coverage (GRZ)', unit: 'm²' },
  'BUILDING.FOOTPRINT': { label: 'Footprint', unit: 'm²' },
  'BUILDING.EXISTING': { label: 'Existing building' },
  'BUILDING.YEAR_BUILT': { label: 'Year built' },
  'BUILDING.SONDERBAU': { label: 'Special-occupancy classification (Art. 2(4) BayBO)' },
  'BUILDING.USE': { label: 'Use' },
  'BUILDING.USAGE': { label: 'Use' },
  'BUILDING.PRIMARY_USE': { label: 'Primary use' },
  'BUILDING.CONSTRUCTION_TYPE': { label: 'Construction type' },
  'BUILDING.ROOF_TYPE': { label: 'Roof type' },
  'BUILDING.WALL_MATERIAL': { label: 'Wall material' },

  // ── Project scope ─────────────────────────────────────────────────
  'PROJECT.SCOPE': { label: 'Project scope' },
  'PROJECT.SCOPE.NEUBAU': { label: 'New build' },
  'PROJECT.SCOPE.SANIERUNG': { label: 'Refurbishment' },
  'PROJECT.SCOPE.UMNUTZUNG': { label: 'Change of use' },
  'PROJECT.SCOPE.ABBRUCH': { label: 'Demolition' },
  'PROJECT.SCOPE.ANBAU': { label: 'Annex / addition' },
  'PROJECT.SCOPE.ERWEITERUNG': { label: 'Extension' },
  'PROJECT.SCOPE.AUFSTOCKUNG': { label: 'Roof addition' },
  'PROJECT.SCOPE.INTERIOR_REFURBISHMENT': { label: 'Interior refurbishment' },
  'PROJECT.SCOPE.BUILDING_SERVICES_MODERNIZATION': {
    label: 'Building services modernisation',
  },
  'PROJECT.SCOPE.ENERGY_EFFICIENCY_IMPROVEMENTS': {
    label: 'Energy-efficiency upgrades',
  },
  'PROJECT.SCOPE.STRUCTURAL_CHANGES': { label: 'Structural changes' },
  'PROJECT.SCOPE.FAÇADE': { label: 'Façade work' },
  'PROJECT.SCOPE.FACADE': { label: 'Façade work' },
  'PROJECT.INTENT': { label: 'Project intent' },
  'PROJECT.START_DATE': { label: 'Planned start' },
  'PROJECT.BUDGET': { label: 'Budget', unit: 'EUR' },

  // ── Structural ────────────────────────────────────────────────────
  'STRUCTURAL.EXECUTION_DRAWINGS_REQUIRED': { label: 'Execution drawings required' },
  'STRUCTURAL.BEARING_DEPTH_MIN': { label: 'Minimum bearing depth', unit: 'mm' },
  'STRUCTURAL.CONNECTION_DETAILS_REQUIRED': {
    label: 'Connection details required',
  },
  'STRUCTURAL.PROOF_COMPONENTS': { label: 'Components requiring proof' },
  'STRUCTURAL.LOAD_TRANSFER_CALCULATION': { label: 'Load-transfer calculation' },
  'STRUCTURAL.STATIC_PROOF_REQUIRED': { label: 'Structural-stability proof' },
  'STRUCTURAL.SOIL_REPORT_REQUIRED': { label: 'Geotechnical report' },
  'STRUCTURAL.ROOF_LOAD': { label: 'Roof load' },
  'STRUCTURAL.SNOW_LOAD_ZONE': { label: 'Snow-load zone (DIN EN 1991-1-3)' },
  'STRUCTURAL.WIND_LOAD_ZONE': { label: 'Wind-load zone (DIN EN 1991-1-4)' },
  'STRUCTURAL.SEISMIC_ZONE': { label: 'Seismic zone (DIN EN 1998)' },

  // ── Energy ────────────────────────────────────────────────────────
  'ENERGY.GEG_APPLICABLE': { label: 'GEG applicable' },
  'ENERGY.GEG_NACHWEIS_REQUIRED': { label: 'GEG proof required' },
  'ENERGY.PV_PFLICHT_BAYERN': { label: 'PV obligation (Bavaria)' },
  'ENERGY.PV_PFLICHT': { label: 'PV obligation' },
  'ENERGY.HEATING_TYPE': { label: 'Heating type' },
  'ENERGY.PRIMARY_ENERGY_DEMAND': {
    label: 'Primary-energy demand',
    unit: 'kWh/(m²·a)',
  },
  'ENERGY.U_VALUE_REQUIREMENT_W_M2K': {
    label: 'U-value requirement',
    unit: 'W/(m²·K)',
  },
  'ENERGY.U_VALUE_REQUIREMENT': { label: 'U-value requirement', unit: 'W/(m²·K)' },
  'ENERGY.INSULATION_REQUIRED': { label: 'Insulation required' },
  'ENERGY.RENEWABLES_SHARE_PCT': { label: 'Renewables share', unit: '%' },

  // ── Procedure ─────────────────────────────────────────────────────
  'PROCEDURE.TYPE': { label: 'Procedure type' },
  'PROCEDURE.GENEHMIGUNGSFREISTELLUNG': {
    label: 'Permit-exempt procedure (Art. 57 BayBO)',
  },
  'PROCEDURE.VEREINFACHT': { label: 'Simplified permit (Art. 58 BayBO)' },
  'PROCEDURE.VEREINFACHTES_VERFAHREN': {
    label: 'Simplified permit (Art. 58 BayBO)',
  },
  'PROCEDURE.REGULAR': { label: 'Standard permit (Art. 59 BayBO)' },
  'PROCEDURE.STANDARD': { label: 'Standard permit (Art. 59 BayBO)' },
  'PROCEDURE.VOLLPRÜFUNG': { label: 'Full review (Art. 59 BayBO)' },
  'PROCEDURE.VORBESCHEID': { label: 'Preliminary ruling (Vorbescheid)' },

  // ── Parties ───────────────────────────────────────────────────────
  'PARTIES.BAUHERR.NAME': { label: 'Name (client)' },
  'PARTIES.BAUHERR.EMAIL': { label: 'Email (client)' },
  'PARTIES.BAUHERR.PHONE': { label: 'Phone (client)' },
  'PARTIES.ARCHITEKT.NAME': { label: 'Name (architect)' },
  'PARTIES.ARCHITEKT.BAUVORLAGEBERECHTIGT': { label: 'Submission-licensed' },
  'PARTIES.ARCHITEKT.KAMMER': { label: 'Chamber' },
  'PARTIES.TRAGWERKSPLANER.NAME': { label: 'Name (structural engineer)' },
  'PARTIES.BRANDSCHUTZ.NAME': { label: 'Name (fire safety)' },
  'PARTIES.ENERGIEBERATER.NAME': { label: 'Name (energy consultant)' },

  // ── Stellplatz ────────────────────────────────────────────────────
  'STELLPLATZ.REQUIRED_COUNT': { label: 'Required parking spaces' },
  'STELLPLATZ.PROVIDED_COUNT': { label: 'Provided parking spaces' },
  'STELLPLATZ.SATZUNG_REFERENCE': { label: 'Parking statute reference' },
  'STELLPLATZ.GARAGE_REQUIRED': { label: 'Garage required' },
  'STELLPLATZ.FAHRRAD_COUNT': { label: 'Required bicycle spaces' },

  // ── Brandschutz ───────────────────────────────────────────────────
  'BRANDSCHUTZ.NACHWEIS_REQUIRED': { label: 'Fire-safety proof required' },
  'BRANDSCHUTZ.FEUERWEHRZUFAHRT': { label: 'Fire-brigade access' },
  'BRANDSCHUTZ.FLUCHTWEG': { label: 'Escape route' },
  'BRANDSCHUTZ.RAUCHMELDER_REQUIRED': { label: 'Smoke detectors required' },
  'BRANDSCHUTZ.GEBÄUDEKLASSE_FOLLOW_UP': { label: 'Fire-safety follow-ups' },

  // ── Setbacks ──────────────────────────────────────────────────────
  'ABSTANDSFLAECHEN.REQUIRED': { label: 'Setback areas (Art. 6 BayBO)' },
  'ABSTANDSFLAECHEN.MIN_DISTANCE_M': {
    label: 'Minimum distance to plot edge',
    unit: 'm',
  },
  'ABSTANDSFLAECHEN.0_4H': { label: '0.4 H setback' },

  // ── Environment ───────────────────────────────────────────────────
  'NATURSCHUTZ.SCHUTZGEBIET': { label: 'Protected area affected' },
  'NATURSCHUTZ.BAUMBESTAND': { label: 'Protected tree stand' },
  'NATURSCHUTZ.ARTENSCHUTZ': { label: 'Species-protection assessment' },

  // ── Phase 6 A.6 — keys the Phase 6 system prompt encourages
  //                  the model to emit for T-01 in München.
  // Heritage / Denkmal / Erhaltungssatzung
  'HERITAGE.DENKMAL_PROTECTION': {
    label: 'Heritage protection (BayDSchG Art. 6)',
  },
  'HERITAGE.DENKMAL_LISTED': { label: 'Listed monument' },
  'HERITAGE.DENKMAL_ATLAS_CHECK_REQUIRED': {
    label: 'Bavarian heritage atlas check required',
  },
  'HERITAGE.ERHALTUNGSSATZUNG_AREA': {
    label: 'Within preservation ordinance area (BauGB § 172)',
  },
  'HERITAGE.ERHALTUNGSSATZUNG_NAME': {
    label: 'Preservation ordinance (name)',
  },
  'HERITAGE.BLfD_ENQUIRY_REQUIRED': {
    label: 'BLfD enquiry required',
  },

  // Existing building / Bestandsgebäude
  'BUILDING.EXISTING_PRESENT': { label: 'Existing building present' },
  'BUILDING.EXISTING_YEAR_BUILT': { label: 'Year built (existing building)' },
  'BUILDING.EXISTING_USE': { label: 'Prior use (existing building)' },
  'BUILDING.DEMOLITION_PLANNED': { label: 'Demolition planned' },
  'BUILDING.DEMOLITION_PERMIT_REQUIRED': {
    label: 'Demolition permit required',
  },

  // Erschließung
  'PLOT.ERSCHLIESSUNG_STATUS': { label: 'Site connection status' },
  'PLOT.ERSCHLIESSUNG_GESICHERT': { label: 'Site connection secured' },
  'PLOT.WATER_CONNECTION': { label: 'Water connection' },
  'PLOT.SEWAGE_CONNECTION': { label: 'Sewage connection' },
  'PLOT.ELECTRIC_CONNECTION': { label: 'Electric connection' },
  'PLOT.GAS_CONNECTION': { label: 'Gas connection' },
  'PLOT.DISTRICT_HEATING_CONNECTION': { label: 'District heating connection' },

  // Geometry / Building class derivation
  'BUILDING.VOLLGESCHOSSE': { label: 'Number of full storeys' },
  'BUILDING.BASEMENT_PRESENT': { label: 'Basement present' },
  'BUILDING.BASEMENT_VOLLGESCHOSS': {
    label: 'Basement counts as full storey',
  },
  'BUILDING.ATTIC_PRESENT': { label: 'Attic present' },
  'BUILDING.ATTIC_VOLLGESCHOSS': {
    label: 'Attic counts as full storey',
  },
  'BUILDING.DETACHED': { label: 'Detached' },

  // Stadtbezirk routing (LBK Mitte/Ost/West)
  'PLOT.STADTBEZIRK_NUMBER': { label: 'District (no.)' },
  'PLOT.STADTBEZIRK_NAME': { label: 'District' },
  'PLOT.LBK_SUB_OFFICE': { label: 'Responsible sub-office (LBK)' },

  // Trees / BaumschutzV München
  'TREES.SPECIES': { label: 'Tree species' },
  'TREES.TRUNK_CIRCUMFERENCE_CM': {
    label: 'Trunk circumference (at 1 m height)',
    unit: 'cm',
  },
  'TREES.PROTECTED_BY_BAUMSCHUTZV': {
    label: 'Protected by München tree-protection ordinance',
  },
  'TREES.FELLING_PERMIT_REQUIRED': {
    label: 'Felling permit required',
  },

  // Architekt-Beziehung
  'PARTIES.ARCHITEKT.ASSIGNED': {
    label: 'Certified architect assigned',
  },
  'PARTIES.ARCHITEKT.SOURCE': { label: 'Architect source (BAYAK / private)' },

  // ── v1.0.23 Bug S — snake_case fact keys emitted by current
  //    fixtures and chat-turn persona output. Both `key` and `KEY`
  //    are registered (the upperKey fallback in factLabel.ts hits
  //    the latter when the persona ships keys in either casing).
  'fassadenflaeche_m2': { label: 'Façade area', unit: 'm²' },
  'wohnflaeche': { label: 'Living area', unit: 'm²' },
  'wohnflaeche_m2': { label: 'Living area', unit: 'm²' },
  'nutzflaeche_m2': { label: 'Net floor area', unit: 'm²' },
  'klasse': { label: 'Building class' },
  'energiestandard': { label: 'Energy standard' },
  'denkmalschutz': { label: 'Heritage protection' },
  'ensembleschutz': { label: 'Ensemble heritage protection' },
  'eingriff_tragende_teile': { label: 'Intervention in load-bearing elements' },
  'eingriff_aussenhuelle': { label: 'Intervention in external envelope' },
  'aenderung_aeussere_erscheinung': { label: 'Change to external appearance' },
  'mk_gebietsart': { label: 'MK use-type (§ 7 BauNVO)' },
  'bauvoranfrage_hard_blocker': { label: 'Pre-decision required (hard blocker)' },
  'sonderbau_scope': { label: 'Sonderbau scope' },
  'grenzstaendig': { label: 'Parcel-edge construction' },
  'in_gestaltungssatzung': { label: 'In Gestaltungssatzung' },
  'traufhoehe_m': { label: 'Eaves height', unit: 'm' },
  'geschosse': { label: 'Storeys' },
  'vollgeschosse_oberirdisch': { label: 'Full storeys (above grade)' },
  'freistehend': { label: 'Freestanding' },
  'nutzungseinheiten_anzahl': { label: 'Number of units' },
  'nutzungseinheiten_groesse_max_m2': { label: 'Max unit size', unit: 'm²' },
  'bebauungsplan_id': { label: 'Bebauungsplan ID' },
}
