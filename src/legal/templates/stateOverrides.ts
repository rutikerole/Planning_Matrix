// ───────────────────────────────────────────────────────────────────────
// Bucket B0 — per-(template, state) override registry.
//
// When `getTemplateBlock(templateId, bundesland)` finds a NON-NULL string
// override at TEMPLATE_STATE_OVERRIDES[templateId][bundesland], the
// resolver returns BLOCKS[templateId] + '\n\n' + override. When the
// cell is `null` or absent, the resolver returns BLOCKS[templateId]
// unchanged — preserving today's Bayern-shaped default behaviour for
// every state.
//
// Design: ADDITIVE addendum, not replacement (Bucket B0 design doc,
// /docs/B0_TEMPLATE_STATE_RAILS.md). Smallest blast radius; zero output
// change with no override registered; Bayern SHA invariant holds
// because Block 2 (this layer) is not in the Bayern SHA scope.
//
// ─── FABRICATION SAFETY (read before adding any non-null override) ───
//
// Overrides must contain only §§/Art. citations VERIFIED by legal review
// (architect with bauvorlageberechtigung, or licensed counsel) against
// primary sources. NEVER invent law for any state. The pre-Bucket-A
// audit (docs/COVERAGE_TRUTH_TABLE.md) exists precisely because silent-
// wrong content destroys trust faster than thin content. If unsure,
// leave `null`. The verify:template-tail-noop gate (scripts/verify-
// template-tail-noop.mts) requires every newly-authored cell to be
// explicitly listed in ACKNOWLEDGED_OVERRIDES — preventing accidental
// silent additions.
//
// ─── HOW TO ADD A VERIFIED CELL (Bucket B proper) ──────────────────
//
//   1. Replace the cell's `null` with the verified addendum string.
//   2. Add the (T, bundesland) key to ACKNOWLEDGED_OVERRIDES in the gate.
//   3. Re-run `npm run prebuild` (verify:template-tail-noop will pass).
//   4. Per-cell content should include verified §§ + procedure-typical
//      handling for that state × template. Use the corpus pack at
//      src/legal/stateCitations.ts as the source of truth, not the
//      Bayern-shaped base.
// ───────────────────────────────────────────────────────────────────────

import type { TemplateId } from '../../types/projectState.ts'
import type { BundeslandCode } from '../states/_types.ts'

export type StateOverride = string | null

export type TemplateStateOverrides = Partial<
  Record<TemplateId, Partial<Record<BundeslandCode, StateOverride>>>
>

/**
 * The (template × bundesland) → override-addendum registry.
 *
 * 28 SCAFFOLDED CELLS (BW/HE/NW/NI × T-02..T-08), all `null` = no-op.
 *
 * These cells are the Bucket B "deepen 5 substantive states" target
 * (SPRINT_PLAN.md §B). T-01 across the 4 substantive non-Bayern states
 * is NOT scaffolded because it is already smoke-pinned in
 * scripts/smoke-walk-matrix.mjs (those cells have asserted state-correct
 * output today; Bucket B will revisit them after the bigger gaps close).
 *
 * Bayern × T-01..T-08 is NOT scaffolded because BLOCKS[T] is the Bayern
 * default — no override needed for Bayern projects.
 *
 * The 11 stub-state cells (Stadtstaaten + Flächenländer ohne deep
 * systemBlock) are NOT scaffolded yet; they belong to Bucket C, which
 * is gated on real legal counsel.
 *
 * EACH null IS A TODO: replace with the verified §§ addendum string AND
 * add `'<T>:<bundesland>'` to ACKNOWLEDGED_OVERRIDES in
 * scripts/verify-template-tail-noop.mts. Until filled, the gate
 * confirms output stays byte-identical to BLOCKS[T].
 */
export const TEMPLATE_STATE_OVERRIDES: TemplateStateOverrides = {
  // ── T-02 Neubau MFH ──────────────────────────────────────────────
  'T-02': {
    // B2 batch 3 — BW × T-02 authored 2026-05-28. LBO §§ corpus-verified
    // (secondary-mirror tier; baunormenlexikon.de + dejure.org). § 51
    // Kenntnisgabeverfahren cited as BW-specific institute; § 65 + § 73a
    // intentionally omitted (enforcement / admin-meta).
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei Projekten in BADEN-WÜRTTEMBERG: die §§ der LBO (Landesbauordnung
Baden-Württemberg) ersetzen sämtliche oben genannten Bayern-Verweise.
Quelle: baunormenlexikon.de und dejure.org (mirror-tier; bei rechtlich
kritischen Fragen die amtliche Fassung beim Landesrecht-Portal
gegenprüfen).

VERFAHREN — LBO (BW hat eigenen Verfahrensraster mit Kenntnisgabeverfahren):
• Verfahrensfreie Vorhaben — § 50 LBO (Anhang 1 listet die Tatbestände).
• Kenntnisgabeverfahren — § 51 LBO (BW-spezifisches Verfahren ohne
  Baugenehmigung; Vorhaben wird der Gemeinde zur Kenntnis gegeben).
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO.
• Baugenehmigung (reguläres Verfahren) — § 58 LBO.

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 LBO. Bei Sonderbau-
Tatbestand (§ 38 LBO) ist die volle Baugenehmigung nach § 58 LBO
zwingend. Ohne Sonderbau-Eigenschaft: vereinfachtes Verfahren nach
§ 52 LBO. Das Kenntnisgabeverfahren nach § 51 LBO ist nur bei den dort
genannten Tatbeständen anwendbar — typische MFH erreichen es selten.

ANTRAG & VORLAGEN:
• Bauvorlagen und Bauantrag — § 53 LBO.
• Bauvorlageberechtigung — § 63 LBO. Entwurfsverfasser — § 43 LBO.
• Form und Inhalt der Bauvorlagen: separate LBOVVO BW (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen — § 5 LBO (Grundregel). Sonderfälle — § 6 LBO.
  Übernahme auf Nachbargrundstücke — § 7 LBO.
• Standsicherheit — § 13 LBO.
• Brandschutz allgemein — § 15 LBO. Baustoffe/Bauteile — § 26 LBO.
  Brandwände — § 27c LBO.
• Stellplätze für Kraftfahrzeuge und Fahrräder — § 37 LBO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

PV-PFLICHT in BW:
BW HAT eine PV-Pflicht über das KlimaG BW — NICHT in der LBO geregelt.
Konkrete §-Verweise NICHT im Korpus. Geltende Solar-Pflicht-Regelung
referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — DSchG BW als separate Landesvorschrift (konkrete §-Verweise
  nicht im Korpus). Zuständige Behörde: Landesamt für Denkmalpflege
  Baden-Württemberg (LAD).`,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // B2 batch 1 — NRW × T-02 authored 2026-05-28. Every § verified
    // against scripts/legal-corpus/states/nrw.json (primary-source tier)
    // or scripts/legal-corpus/federal.json.
    nrw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NRW × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei Projekten in NORDRHEIN-WESTFALEN: die §§ der NRW Bauordnung ersetzen
sämtliche oben genannten Bayern-Verweise. Quelle: recht.nrw.de, primär-
quellverifiziert (scripts/legal-corpus/states/nrw.json).

VERFAHREN — NRW Bauordnung:
• Verfahrensfrei — § 62 BauO NRW.
• Genehmigungsfreistellung — § 63 BauO NRW.
• Vereinfachtes Baugenehmigungsverfahren — § 64 BauO NRW.
• Reguläres Baugenehmigungsverfahren — § 65 BauO NRW.

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 BauO NRW. Bei
Sonderbau-Tatbestand (§ 50 BauO NRW) ist das reguläre Verfahren nach
§ 65 BauO NRW zwingend. Ohne Sonderbau: vereinfachtes Verfahren nach
§ 64 BauO NRW. Freistellung nach § 63 BauO NRW nur bei qualifiziertem
B-Plan und ohne Sonderbau.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 70 BauO NRW.
• Bauvorlageberechtigung — § 67 BauO NRW.
• Form und Inhalt der Bauvorlagen: separate BauVorlVO NRW (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen — § 6 BauO NRW.
• Standsicherheit — § 12 BauO NRW. Bautechnische Nachweise — § 68 BauO NRW.
• Brandschutz allgemein — § 14 BauO NRW. Baustoffe/Bauteile — § 26 BauO NRW.
  Brandwände — § 30 BauO NRW. Rettungswege — § 33 BauO NRW.
• Stellplätze und Fahrradabstellplätze — § 48 BauO NRW.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG (Niedrigstenergiegebäude). § 80 GEG (Energieausweis).

PV-PFLICHT in NRW:
NICHT in der BauO NRW geregelt, sondern in einer separaten NRW-Solar-/
Klimaschutz-Vorschrift. Konkrete §-Verweise sind NICHT im Korpus —
falls relevant, auf die jeweils geltende NRW-Solar-Pflicht-Verordnung
verweisen. Nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — DSchG NRW als separate Landesvorschrift (konkrete §-Verweise
  nicht im Korpus). Zuständige Behörde: LVR-Amt für Denkmalpflege im
  Rheinland bzw. LWL-Denkmalpflege Westfalen.`,
    // B2 batch 2 — NI × T-02 authored 2026-05-28. NBauO §§ corpus-verified
    // (secondary-mirror tier — baunormenlexikon.de + voris). § 62 cited as
    // "sonstige genehmigungsfreie" per heading; NOT called "Genehmigungsfreistellung".
    niedersachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NI × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei Projekten in NIEDERSACHSEN: die §§ der NBauO (Niedersächsische
Bauordnung) ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und voris (mirror-tier; bei rechtlich kritischen
Fragen voris.niedersachsen.de als Primärquelle gegenprüfen).

VERFAHREN — NBauO:
• Verfahrensfreie Baumaßnahmen — § 60 NBauO (Hauptkatalog inkl. Abbruchanzeige).
• Sonstige genehmigungsfreie Baumaßnahmen — § 62 NBauO.
• Vereinfachtes Baugenehmigungsverfahren — § 63 NBauO.
• Reguläres Baugenehmigungsverfahren — § 64 NBauO.

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 NBauO. Bei Sonderbau-
Tatbestand (§ 51 NBauO) ist das reguläre Verfahren nach § 64 NBauO
zwingend. Ohne Sonderbau-Eigenschaft: vereinfachtes Verfahren nach
§ 63 NBauO.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 67 NBauO.
• Entwurfsverfasser-Eignung (NI-Pendant zur Bauvorlageberechtigung) —
  § 53 NBauO.
• Form und Inhalt der Bauvorlagen: separate BauVorlVO Nds (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Grenzabstände (NI-Pendant zu Abstandsflächen) — § 5 NBauO. Abstände
  auf demselben Baugrundstück — § 7 NBauO.
• Standsicherheit — § 12 NBauO. Bautechnische Nachweise — § 65 NBauO.
• Brandschutz allgemein — § 14 NBauO. Baustoffe/Bauteile — § 26 NBauO.
  Brandwände — § 30 NBauO. Rettungswege — § 33 NBauO.
• Stellplätze (NI gliedert in drei §§): bauliche Anlagen für Kfz —
  § 46 NBauO. Notwendige Einstellplätze — § 47 NBauO. Fahrradabstell-
  anlagen — § 48 NBauO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG (Niedrigstenergiegebäude). § 80 GEG (Energieausweis).

PV-PFLICHT in NI:
NICHT in der NBauO geregelt, sondern im NKlimaG bzw. einer separaten
Solar-Verordnung. Konkrete §-Verweise NICHT im Korpus — falls relevant,
geltende NI-Solar-Pflicht-Vorschrift referenzieren. Nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — NDSchG als separate Landesvorschrift (konkrete §-Verweise nicht
  im Korpus). Zuständige Behörde: Niedersächsisches Landesamt für
  Denkmalpflege (NLD).`,
  },
  // ── T-03 Sanierung ───────────────────────────────────────────────
  'T-03': {
    // B2 batch 3 — BW × T-03 authored 2026-05-28. LBO §§ corpus-verified.
    // § 27f / § 28d cited as narrow substantive Anforderungen; § 65 + § 73a
    // omitted.
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in BADEN-WÜRTTEMBERG: die §§
der LBO ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und dejure.org (mirror-tier).

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Nutzung fällt häufig unter § 50 LBO (verfahrensfreie Vorhaben).
Sobald tragende Bauteile berührt werden oder DG-Ausbauten zu Wohnzwecken
erfolgen, ist § 27f LBO einschlägig. Bei Eingriffen in Rettungswege gilt
§ 28d LBO. Je nach Tiefe folgt das vereinfachte Verfahren nach § 52 LBO
oder die Baugenehmigung nach § 58 LBO.

VERFAHREN — LBO:
• Verfahrensfreie Vorhaben — § 50 LBO.
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO.
• Baugenehmigung — § 58 LBO.

SUBSTANTIVE ANFORDERUNGEN BEI EINGRIFF:
• Bei tragenden / aussteifenden / raumabschließenden Bauteilen sowie
  DG-Ausbauten oder Aufstockungen zu Wohnzwecken — § 27f LBO.
• Bei Eingriffen in Bauteile in Rettungswegen — § 28d LBO.
• Standsicherheit — § 13 LBO.
• Brandschutz allgemein — § 15 LBO. Baustoffe/Bauteile — § 26 LBO.
  Brandwände — § 27c LBO.

ANTRAG:
• Bauvorlagen und Bauantrag — § 53 LBO.
• Bauvorlageberechtigung — § 63 LBO. Entwurfsverfasser — § 43 LBO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

DENKMALSCHUTZ:
Bei eingetragenem Baudenkmal oder Ensemble — DSchG BW (separate
Landesvorschrift; konkrete §-Verweise nicht im Korpus). Vor Sanierung
ist das Landesamt für Denkmalpflege Baden-Württemberg (LAD) anzuhören.
Federal-Anker bei Erhaltungssatzung — § 172 BauGB.

NICHT IM Korpus (NICHT erfinden):
• Land-Denkmal-§§ — wie oben mit LAD abklären.
• PV-Pflicht bei Sanierung — KlimaG BW oder separate Solar-Verordnung;
  nicht in der LBO geregelt; geltende Vorschrift referenzieren.`,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // B2 batch 1 — NRW × T-03 authored 2026-05-28. §§ corpus-verified.
    nrw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NRW × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in NORDRHEIN-WESTFALEN: die §§
der NRW Bauordnung ersetzen sämtliche oben genannten Bayern-Verweise.
Quelle: recht.nrw.de, primärquellverifiziert.

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Hauptnutzung ist häufig verfahrensfrei nach § 62 BauO NRW. Sobald
tragende Bauteile, Brandschutz oder die Nutzung berührt sind, ist
regelmäßig das vereinfachte Verfahren nach § 64 BauO NRW anzunehmen.

VERFAHREN — NRW Bauordnung:
• Verfahrensfreie Maßnahmen — § 62 BauO NRW.
• Vereinfachtes Baugenehmigungsverfahren — § 64 BauO NRW.

TECHNISCHE NACHWEISE BEI EINGRIFF:
• Standsicherheit bei tragenden Eingriffen — § 12 BauO NRW.
• Bautechnische Nachweise — § 68 BauO NRW.
• Brandschutz allgemein — § 14 BauO NRW. Baustoffe/Bauteile — § 26 BauO NRW.
  Brandwände — § 30 BauO NRW. Rettungswege — § 33 BauO NRW.
• Bauantrag + Bauvorlagen — § 70 BauO NRW. Bauvorlageberechtigung —
  § 67 BauO NRW.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG (Anforderungen bei Änderung bestehender
  Gebäude). Niedrigstenergie-Grundsatz allgemein — § 10 GEG.

NUTZUNGSÄNDERUNG IN NRW:
NRW hat KEINEN dedizierten §-Anker für Nutzungsänderung in der BauO. Eine
Nutzungsänderung im Sanierungskontext ist über § 64 BauO NRW (vereinfacht)
bzw. § 65 BauO NRW (regulär bei Sonderbau) zu beantragen — kein eigener
Nutzungsänderungs-§ existiert auf Landesebene.

DENKMALSCHUTZ:
Bei eingetragenem Baudenkmal oder Ensemble — DSchG NRW (separate
Landesvorschrift; konkrete §-Verweise nicht im Korpus). Vor Sanierung ist
die zuständige Denkmalpflege-Behörde (LVR-Amt für Denkmalpflege im
Rheinland bzw. LWL-Denkmalpflege Westfalen) anzuhören. Federal-Anker bei
Erhaltungssatzung — § 172 BauGB.

NICHT IM Korpus (NICHT erfinden):
• Land-DSchG-§§ — wie oben; mit Denkmalpflege abklären.
• Solar-/PV-Pflicht bei Sanierung — separate NRW-Vorschrift; nicht in der
  BauO geregelt; geltende Verordnung referenzieren.`,
    // B2 batch 2 — NI × T-03 authored 2026-05-28. NBauO §§ corpus-verified.
    // § 85a NBauO = dedicated Umbau/Nutzungsänderungs-§ (NI HAS this, unlike NRW).
    niedersachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NI × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in NIEDERSACHSEN: die §§ der
NBauO ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und voris (mirror-tier).

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Nutzung fällt häufig unter § 60 NBauO (verfahrensfreie Baumaßnahmen).
Bei Umbau bzw. wesentlicher struktureller Änderung ist § 85a NBauO
einschlägig (Umbaumaßnahmen und Nutzungsänderungen); je nach Tiefe folgt
das vereinfachte Verfahren nach § 63 NBauO oder das reguläre Verfahren
nach § 64 NBauO.

VERFAHREN — NBauO:
• Verfahrensfreie Maßnahmen — § 60 NBauO.
• Umbaumaßnahmen und Nutzungsänderungen — § 85a NBauO.
• Vereinfachtes Baugenehmigungsverfahren — § 63 NBauO.

TECHNISCHE NACHWEISE BEI EINGRIFF:
• Standsicherheit bei tragenden Eingriffen — § 12 NBauO.
• Bautechnische Nachweise — § 65 NBauO.
• Brandschutz allgemein — § 14 NBauO. Baustoffe/Bauteile — § 26 NBauO.
  Brandwände — § 30 NBauO. Rettungswege — § 33 NBauO.

ANTRAG:
• Bauantrag + Bauvorlagen — § 67 NBauO. Entwurfsverfasser-Eignung —
  § 53 NBauO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG (Anforderungen bei Änderung bestehender
  Gebäude). Niedrigstenergie-Grundsatz allgemein — § 10 GEG.

DENKMALSCHUTZ:
Bei eingetragenem Baudenkmal oder Ensemble — NDSchG (separate
Landesvorschrift; konkrete §-Verweise nicht im Korpus). Vor Sanierung
ist das Niedersächsische Landesamt für Denkmalpflege (NLD) anzuhören.
Federal-Anker bei Erhaltungssatzung — § 172 BauGB.

NICHT IM Korpus (NICHT erfinden):
• Land-Denkmal-§§ — wie oben mit NLD abklären.
• Solar-/PV-Pflicht bei Sanierung — NKlimaG bzw. separate NI-Solar-
  Verordnung; nicht in der NBauO geregelt; geltende Vorschrift
  referenzieren.`,
  },
  // ── T-04 Umnutzung ───────────────────────────────────────────────
  'T-04': {
    // B2 batch 3 — BW × T-04 authored 2026-05-28. LBO §§ corpus-verified.
    // BW has NO general Nutzungsänderungs-§; § 27f + § 28d are narrow
    // substantive Anforderungen, NOT the procedure anchor. § 65 omitted.
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in BADEN-WÜRTTEMBERG: die §§ der LBO
ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und dejure.org (mirror-tier).

ROUTING:
Eine Nutzungsänderung ist in BW grundsätzlich genehmigungspflichtig,
sofern nicht ausdrücklich verfahrensfrei nach § 50 LBO. Die LBO hat
KEIN eigenständig benanntes "Nutzungsänderungs-Verfahren" — der
Verfahrensweg richtet sich nach den allgemeinen Verfahrens-§§. Substantive
Anforderungen sind in § 27f LBO (tragende Bauteile, DG-Ausbau zu
Wohnzwecken) und § 28d LBO (Rettungswege) geregelt.

VERFAHREN — LBO:
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO.
• Baugenehmigung (regulär) — § 58 LBO (bei Sonderbau-Tatbestand der
  neuen Nutzung, § 38 LBO).

SUBSTANTIVE ANKER BEI NUTZUNGSÄNDERUNG:
• Bei tragenden Bauteilen / DG-Ausbau zu Wohnzwecken — § 27f LBO.
• Bei Bauteilen in Rettungswegen — § 28d LBO.

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO.
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz nach neuer Nutzung — § 15 LBO, § 26 LBO, § 27c LBO.
• Stellplatzbedarf nach neuer Nutzung — § 37 LBO. Bundes-Maß ergänzend
  — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 13 LBO.

ANTRAG:
• Bauvorlagen und Bauantrag — § 53 LBO.
• Bauvorlageberechtigung — § 63 LBO. Entwurfsverfasser — § 43 LBO.

NICHT IM LBO-Korpus (NICHT erfinden):
• Land-Denkmal-§§ — DSchG BW mit LAD abklären.`,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // B2 batch 1 — NRW × T-04 authored 2026-05-28. §§ corpus-verified.
    nrw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NRW × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in NORDRHEIN-WESTFALEN: die §§ der NRW
Bauordnung ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
recht.nrw.de, primärquellverifiziert.

ROUTING:
Eine Nutzungsänderung ist grundsätzlich genehmigungspflichtig, sofern nicht
ausdrücklich verfahrensfrei nach § 62 BauO NRW. NRW hat KEINEN dedizierten
§-Anker für Nutzungsänderung in der BauO — der Verfahrensweg richtet sich
nach den allgemeinen Verfahrens-§§:

VERFAHREN — NRW Bauordnung:
• Vereinfachtes Baugenehmigungsverfahren — § 64 BauO NRW.
• Reguläres Baugenehmigungsverfahren — § 65 BauO NRW (bei Sonderbau-
  Tatbestand der neuen Nutzung, § 50 BauO NRW).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO
  (besondere Wohngebiete).
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz nach neuer Nutzung — § 14 BauO NRW, § 26 BauO NRW,
  § 30 BauO NRW, § 33 BauO NRW.
• Stellplatzbedarf nach neuer Nutzung — § 48 BauO NRW. Bundes-Maß
  ergänzend — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 12 BauO NRW.
  Bautechnische Nachweise — § 68 BauO NRW.

ANTRAG:
• Bauantrag + Bauvorlagen — § 70 BauO NRW. Bauvorlageberechtigung —
  § 67 BauO NRW.

NICHT IM BauO-NRW-Korpus (NICHT erfinden):
• Dedizierter Nutzungsänderungs-§ existiert nicht in NRW — das ist KEIN
  Korpus-Defekt, sondern die Rechtslage.
• Land-DSchG-§§ — separate Vorschrift, mit Denkmalpflege abzustimmen.`,
    // B2 batch 2 — NI × T-04 authored 2026-05-28. NBauO §§ corpus-verified.
    // § 85a NBauO is the dedicated Nutzungsänderungs-§ (NI has this, NRW doesn't).
    niedersachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NI × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in NIEDERSACHSEN: die §§ der NBauO
ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und voris (mirror-tier).

ROUTING:
NI hat einen dedizierten §-Anker für Nutzungsänderungen — § 85a NBauO
(Umbaumaßnahmen und Nutzungsänderungen). Der Verfahrensweg richtet sich
nach Größe und Sonderbau-Tatbestand:

VERFAHREN — NBauO:
• Nutzungsänderungs-Anker — § 85a NBauO.
• Vereinfachtes Baugenehmigungsverfahren — § 63 NBauO.
• Reguläres Baugenehmigungsverfahren — § 64 NBauO (bei Sonderbau-
  Tatbestand der neuen Nutzung, § 51 NBauO).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO
  (besondere Wohngebiete).
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz nach neuer Nutzung — § 14 NBauO, § 26 NBauO, § 30 NBauO,
  § 33 NBauO.
• Stellplatzbedarf nach neuer Nutzung: bauliche Anlagen für Kfz —
  § 46 NBauO. Notwendige Einstellplätze — § 47 NBauO. Fahrradabstell-
  anlagen — § 48 NBauO. Bundes-Maß ergänzend — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 12 NBauO.
  Bautechnische Nachweise — § 65 NBauO.

ANTRAG:
• Bauantrag + Bauvorlagen — § 67 NBauO. Entwurfsverfasser-Eignung —
  § 53 NBauO.

NICHT IM NBauO-Korpus (NICHT erfinden):
• Land-Denkmal-§§ — NDSchG mit NLD abklären.`,
  },
  // ── T-05 Abbruch ─────────────────────────────────────────────────
  'T-05': {
    // B2 batch 3 — BW × T-05 authored 2026-05-28. LBO §§ corpus-verified.
    // § 65 LBO INTENTIONALLY OMITTED — heading "Abbruchsanordnung und
    // Nutzungsuntersagung" is enforcement, not owner-initiated demolition
    // (same discipline as NI § 79).
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in BADEN-WÜRTTEMBERG: die §§ der LBO
ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und dejure.org (mirror-tier).

ROUTING:
Der Abbruch baulicher Anlagen ist in BW primär über § 50 LBO geregelt
(verfahrensfreie Vorhaben; Anhang 1 listet die Tatbestände). Innerhalb
der in Anhang 1 zu § 50 LBO genannten Tatbestände ist der Abbruch
verfahrensfrei; außerhalb dieser Tatbestände ist eine Genehmigung
erforderlich (vereinfachtes Verfahren nach § 52 LBO bzw. Baugenehmigung
nach § 58 LBO).

VERFAHREN — LBO:
• Verfahrensfreie Vorhaben (mit Anhang 1) — § 50 LBO.
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO.
• Baugenehmigung — § 58 LBO.

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — DSchG BW (separate Landesvorschrift; konkrete §-Verweise
  nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch nur mit
  denkmalrechtlicher Genehmigung; Landesamt für Denkmalpflege
  Baden-Württemberg (LAD) einbeziehen.

DOKUMENTE:
• Bauvorlageberechtigung — § 63 LBO. Entwurfsverfasser — § 43 LBO.
• Statik der Restanlage bei Teilabbruch — § 13 LBO.

NICHT IM LBO-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV, EU-Vorgaben; nicht in
  der LBO geregelt; geltende Bundes- bzw. EU-Regelung referenzieren.
• Land-Denkmal-§§ — wie oben mit LAD abklären.`,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // B2 batch 1 — NRW × T-05 authored 2026-05-28. §§ corpus-verified.
    nrw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NRW × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in NORDRHEIN-WESTFALEN: die §§ der NRW
Bauordnung ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
recht.nrw.de, primärquellverifiziert.

ROUTING:
Die Beseitigung von Anlagen ist in NRW über zwei §-Verweise geregelt:
• Verfahrensfreie Beseitigung — § 62 BauO NRW (unterhalb der Schwellen).
• Beseitigung von Anlagen / Nutzungsuntersagung — § 82 BauO NRW
  (Eingriffsbefugnis der Bauaufsicht).

Innerhalb der in § 62 BauO NRW genannten Tatbestände ist der Abbruch
verfahrensfrei (ggf. genügt eine Anzeige); außerhalb dieser Tatbestände ist
eine Beseitigungsgenehmigung erforderlich.

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — DSchG NRW (separate Landesvorschrift; konkrete
  §-Verweise nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch
  nur mit denkmalrechtlicher Genehmigung; LVR-Amt für Denkmalpflege im
  Rheinland bzw. LWL-Denkmalpflege Westfalen einbeziehen.

DOKUMENTE:
• Bauvorlageberechtigung — § 67 BauO NRW.
• Statik der Restanlage bei Teilabbruch — § 12 BauO NRW.

NICHT IM BauO-NRW-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV und EU-Vorgaben sind
  nicht in der BauO geregelt; auf die jeweils geltende Bundes- bzw.
  EU-Regelung verweisen.
• Land-DSchG-§§ — wie oben mit Denkmalpflege abklären.`,
    // B2 batch 2 — NI × T-05 authored 2026-05-28. NBauO §§ corpus-verified.
    // § 79 NBauO INTENTIONALLY OMITTED — its heading is enforcement against
    // illegal/decaying structures, not owner-initiated demolition procedure.
    niedersachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NI × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in NIEDERSACHSEN: die §§ der NBauO
ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und voris (mirror-tier).

ROUTING:
Die Beseitigung baulicher Anlagen ist in NI primär über § 60 NBauO
geregelt — er kombiniert die verfahrensfreien Baumaßnahmen mit dem
Institut der Abbruchanzeige.

VERFAHREN — NBauO:
• Verfahrensfreie Baumaßnahmen und Abbruchanzeige — § 60 NBauO.

Innerhalb der in § 60 NBauO genannten Tatbestände ist der Abbruch
verfahrensfrei bzw. genügt eine Abbruchanzeige; außerhalb dieser
Tatbestände ist eine Beseitigungsgenehmigung erforderlich (in der Regel
über das vereinfachte Verfahren nach § 63 NBauO bzw. das reguläre
Verfahren nach § 64 NBauO).

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — NDSchG (separate Landesvorschrift; konkrete §-Verweise
  nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch nur mit
  denkmalrechtlicher Genehmigung; Niedersächsisches Landesamt für
  Denkmalpflege (NLD) einbeziehen.

DOKUMENTE:
• Entwurfsverfasser-Eignung — § 53 NBauO.
• Statik der Restanlage bei Teilabbruch — § 12 NBauO.

NICHT IM NBauO-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV und EU-Vorgaben sind
  nicht in der NBauO geregelt; auf die jeweils geltende Bundes- bzw.
  EU-Regelung verweisen.
• Land-Denkmal-§§ — wie oben mit NLD abklären.`,
  },
  // ── T-06 Aufstockung ─────────────────────────────────────────────
  'T-06': {
    // B2 batch 3 — BW × T-06 authored 2026-05-28. LBO §§ corpus-verified.
    // § 27f LBO's heading explicitly names "Dachgeschossausbauten oder
    // Aufstockungen zu Wohnzwecken" — strong match for T-06.
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in BADEN-WÜRTTEMBERG: die §§ der
LBO ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und dejure.org (mirror-tier).

ROUTING:
Aufstockungen und DG-Ausbauten zu Wohnzwecken sind in BW substantiell
durch § 27f LBO geregelt (Nutzungsänderungen und bauliche Änderungen im
Bestand bei tragenden, aussteifenden und raumabschließenden Bauteilen
sowie Dachgeschossausbauten oder Aufstockungen zu Wohnzwecken). Bei
Eingriffen in Rettungswege gilt § 28d LBO. Verfahrensseitig regelmäßig
das vereinfachte Verfahren nach § 52 LBO.

VERFAHREN:
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO.

SUBSTANTIVE ANKER FÜR AUFSTOCKUNG / DG-AUSBAU:
• Tragende / aussteifende / raumabschließende Bauteile bei Umbau,
  DG-Ausbau oder Aufstockung zu Wohnzwecken — § 27f LBO.
• Eingriffe in Bauteile in Rettungswegen — § 28d LBO.

GEBÄUDEKLASSE & ABSTANDSFLÄCHEN (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 LBO. Höhen-/Stockwerksgrenzen entscheiden, ob die
  Aufstockung die GK anhebt. Ein GK-Sprung kann strengeren Brandschutz
  auslösen.
• Abstandsflächen — § 5 LBO. An der neuen, höheren Wand neu zu
  bemessen. Sonderfälle — § 6 LBO. Übernahme auf Nachbargrundstücke
  — § 7 LBO.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion und neuer Aufbauten —
  § 13 LBO.
• Brandschutz nach ggf. höherer GK — § 15 LBO, § 26 LBO, § 27c LBO.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Stellplätze für Kraftfahrzeuge und Fahrräder — § 37 LBO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauvorlagen und Bauantrag — § 53 LBO.
• Bauvorlageberechtigung — § 63 LBO. Entwurfsverfasser — § 43 LBO.`,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // B2 batch 1 — NRW × T-06 authored 2026-05-28. §§ corpus-verified.
    nrw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NRW × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in NORDRHEIN-WESTFALEN: die §§ der
NRW Bauordnung ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
recht.nrw.de, primärquellverifiziert.

ROUTING:
Aufstockung wird regelmäßig im vereinfachten Verfahren nach § 64 BauO NRW
behandelt. Bei Aufstockung können sich Gebäudeklasse, Abstandsflächen
und Brandschutz ändern; die Standsicherheit der Bestandskonstruktion ist
gesondert nachzuweisen.

VERFAHREN:
• Vereinfachtes Baugenehmigungsverfahren — § 64 BauO NRW.

GEBÄUDEKLASSE & ABSTANDSFLÄCHEN (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 BauO NRW. Höhen-/Stockwerksgrenzen entscheiden, ob
  die Aufstockung die GK anhebt. Ein GK-Sprung kann strengeren Brandschutz
  auslösen.
• Abstandsflächen — § 6 BauO NRW. An der neuen, höheren Wand neu zu
  bemessen; ggf. zustimmungspflichtig.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion + neuer Aufbauten —
  § 12 BauO NRW. Bautechnische Nachweise — § 68 BauO NRW.
• Brandschutz nach ggf. höherer GK — § 14 BauO NRW, § 26 BauO NRW,
  § 30 BauO NRW, § 33 BauO NRW.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Mehrbedarf bei neuen Wohneinheiten — § 48 BauO NRW.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauantrag + Bauvorlagen — § 70 BauO NRW. Bauvorlageberechtigung —
  § 67 BauO NRW.`,
    // B2 batch 2 — NI × T-06 authored 2026-05-28. NBauO §§ corpus-verified.
    niedersachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NI × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in NIEDERSACHSEN: die §§ der NBauO
ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und voris (mirror-tier).

ROUTING:
Aufstockung wird regelmäßig im vereinfachten Verfahren nach § 63 NBauO
behandelt. Bei Aufstockung können sich Gebäudeklasse, Grenzabstände und
Brandschutz ändern; die Standsicherheit der Bestandskonstruktion ist
gesondert nachzuweisen. Bei wesentlichem Umbauanteil ist § 85a NBauO
einschlägig.

VERFAHREN:
• Vereinfachtes Baugenehmigungsverfahren — § 63 NBauO.
• Umbaumaßnahmen und Nutzungsänderungen — § 85a NBauO (bei Umbau).

GEBÄUDEKLASSE & GRENZABSTÄNDE (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 NBauO. Höhen-/Stockwerksgrenzen entscheiden, ob
  die Aufstockung die GK anhebt. Ein GK-Sprung kann strengeren Brandschutz
  auslösen.
• Grenzabstände (NI-Pendant zu Abstandsflächen) — § 5 NBauO. An der
  neuen, höheren Wand neu zu bemessen. Abstände auf demselben Baugrund-
  stück — § 7 NBauO.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion und neuer Aufbauten —
  § 12 NBauO. Bautechnische Nachweise — § 65 NBauO.
• Brandschutz nach ggf. höherer GK — § 14 NBauO, § 26 NBauO, § 30 NBauO,
  § 33 NBauO.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Bauliche Anlagen für Kfz — § 46 NBauO. Notwendige Einstellplätze —
  § 47 NBauO. Fahrradabstellanlagen — § 48 NBauO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauantrag + Bauvorlagen — § 67 NBauO. Entwurfsverfasser-Eignung —
  § 53 NBauO.`,
  },
  // ── T-07 Anbau ───────────────────────────────────────────────────
  'T-07': {
    // B2 batch 3 — BW × T-07 authored 2026-05-28. LBO §§ corpus-verified.
    // § 51 Kenntnisgabe cited as BW-specific institute for qualifying Anbau cases.
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in BADEN-WÜRTTEMBERG: die §§ der LBO
ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und dejure.org (mirror-tier).

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach § 52 LBO
behandelt. Kleinere Anbau-Tatbestände können unter § 50 LBO
(verfahrensfreie Vorhaben) fallen. Bei qualifiziertem B-Plan kann das
Kenntnisgabeverfahren nach § 51 LBO in Betracht kommen — die genauen
Voraussetzungen ergeben sich aus § 51 LBO selbst.

VERFAHREN:
• Verfahrensfreie Vorhaben — § 50 LBO.
• Kenntnisgabeverfahren — § 51 LBO (BW-spezifisch).
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Abstandsflächen an der neuen Wand — § 5 LBO. Sonderfälle —
  § 6 LBO. Übernahme auf Nachbargrundstücke — § 7 LBO.
• Standsicherheit — § 13 LBO.
• Brandschutz an der Anschluss-/Trennwand — § 15 LBO. Brandwände —
  § 27c LBO.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Stellplätze für Kraftfahrzeuge und Fahrräder — § 37 LBO.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauvorlagen und Bauantrag — § 53 LBO.
• Bauvorlageberechtigung — § 63 LBO. Entwurfsverfasser — § 43 LBO.`,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // B2 batch 1 — NRW × T-07 authored 2026-05-28. §§ corpus-verified.
    nrw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NRW × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in NORDRHEIN-WESTFALEN: die §§ der NRW
Bauordnung ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
recht.nrw.de, primärquellverifiziert.

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach § 64 BauO NRW
behandelt. Bei qualifiziertem B-Plan und Einhaltung aller Festsetzungen
kommt die Genehmigungsfreistellung nach § 63 BauO NRW in Betracht.

VERFAHREN:
• Genehmigungsfreistellung — § 63 BauO NRW (bei qualifiziertem B-Plan,
  Einfügen, ohne Sonderbau).
• Vereinfachtes Baugenehmigungsverfahren — § 64 BauO NRW (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Abstandsflächen an der neuen Wand — § 6 BauO NRW.
• Standsicherheit — § 12 BauO NRW. Bautechnische Nachweise — § 68 BauO NRW.
• Brandschutz an der Anschluss-/Trennwand — § 14 BauO NRW. Brandwände —
  § 30 BauO NRW.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Mehrbedarf bei neuen Wohneinheiten — § 48 BauO NRW.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauantrag + Bauvorlagen — § 70 BauO NRW. Bauvorlageberechtigung —
  § 67 BauO NRW.`,
    // B2 batch 2 — NI × T-07 authored 2026-05-28. NBauO §§ corpus-verified.
    // § 62 NBauO cited as "sonstige genehmigungsfreie" per heading; NOT called Freistellung.
    niedersachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NI × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in NIEDERSACHSEN: die §§ der NBauO
ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und voris (mirror-tier).

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach § 63 NBauO
behandelt. Kleinere Anbau-Tatbestände können unter § 60 NBauO
(verfahrensfrei) oder § 62 NBauO (sonstige genehmigungsfreie Baumaßnahmen)
fallen.

VERFAHREN:
• Verfahrensfreie Baumaßnahmen — § 60 NBauO.
• Sonstige genehmigungsfreie Baumaßnahmen — § 62 NBauO.
• Vereinfachtes Baugenehmigungsverfahren — § 63 NBauO (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Grenzabstände an der neuen Wand — § 5 NBauO. Abstände auf demselben
  Baugrundstück — § 7 NBauO.
• Standsicherheit — § 12 NBauO. Bautechnische Nachweise — § 65 NBauO.
• Brandschutz an der Anschluss-/Trennwand — § 14 NBauO. Brandwände —
  § 30 NBauO.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Bauliche Anlagen für Kfz — § 46 NBauO. Notwendige Einstellplätze —
  § 47 NBauO. Fahrradabstellanlagen — § 48 NBauO.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauantrag + Bauvorlagen — § 67 NBauO. Entwurfsverfasser-Eignung —
  § 53 NBauO.`,
  },
  // ── T-08 Sonstiges ───────────────────────────────────────────────
  'T-08': {
    // B2 batch 3 — BW × T-08 authored 2026-05-28. LBO §§ corpus-verified.
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in BADEN-WÜRTTEMBERG: die §§ der LBO ersetzen
sämtliche oben genannten Bayern-Verweise. Quelle: baunormenlexikon.de
und dejure.org (mirror-tier).

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen BW-§§ richten
sich nach dem konkreten Vorhaben. Die folgenden Verweise decken den
vollständigen Verfahrensraster ab:

VERFAHREN — LBO (vollständiger Raster, BW-spezifisch):
• Verfahrensfreie Vorhaben — § 50 LBO (Anhang 1 listet Tatbestände).
• Kenntnisgabeverfahren — § 51 LBO (BW-spezifisches Verfahren ohne
  Baugenehmigung).
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO.
• Baugenehmigung — § 58 LBO.

ANTRAG & VORLAGEN:
• Bauvorlagen und Bauantrag — § 53 LBO.
• Bauvorlageberechtigung — § 63 LBO. Entwurfsverfasser — § 43 LBO.
• Form und Inhalt der Bauvorlagen: separate LBOVVO BW (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen — § 5 LBO. Sonderfälle — § 6 LBO. Übernahme auf
  Nachbargrundstücke — § 7 LBO.
• Standsicherheit — § 13 LBO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale. Die obigen BW-§§ sind die Mindest-
Verweise für Verfahren und Antrag.`,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // B2 batch 1 — NRW × T-08 authored 2026-05-28. §§ corpus-verified.
    nrw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NRW × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in NORDRHEIN-WESTFALEN: die §§ der NRW Bauordnung
ersetzen sämtliche oben genannten Bayern-Verweise. Quelle: recht.nrw.de,
primärquellverifiziert.

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen NRW-§§ richten
sich nach dem konkreten Vorhaben. Die folgenden Verweise decken den
vollständigen Verfahrensraster ab:

VERFAHREN — NRW Bauordnung (vollständiger Raster):
• Verfahrensfreie Bauvorhaben — § 62 BauO NRW.
• Genehmigungsfreistellung — § 63 BauO NRW.
• Vereinfachtes Baugenehmigungsverfahren — § 64 BauO NRW.
• Reguläres Baugenehmigungsverfahren — § 65 BauO NRW.

ANTRAG & VORLAGEN:
• Bauantrag + Bauvorlagen — § 70 BauO NRW.
• Bauvorlageberechtigung — § 67 BauO NRW.
• Form und Inhalt der Bauvorlagen: separate BauVorlVO NRW (kein
  §-Verweis im Korpus — Verordnung als Quelle referenzieren).

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen — § 6 BauO NRW.
• Standsicherheit — § 12 BauO NRW. Bautechnische Nachweise — § 68 BauO NRW.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale. Die obigen NRW-§§ sind die Mindest-
Verweise für Verfahren und Antrag.`,
    // B2 batch 2 — NI × T-08 authored 2026-05-28. NBauO §§ corpus-verified.
    niedersachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — NI × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in NIEDERSACHSEN: die §§ der NBauO ersetzen
sämtliche oben genannten Bayern-Verweise. Quelle: baunormenlexikon.de
und voris (mirror-tier).

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen NI-§§ richten
sich nach dem konkreten Vorhaben. Die folgenden Verweise decken den
vollständigen Verfahrensraster ab:

VERFAHREN — NBauO (vollständiger Raster):
• Verfahrensfreie Baumaßnahmen — § 60 NBauO.
• Sonstige genehmigungsfreie Baumaßnahmen — § 62 NBauO.
• Vereinfachtes Baugenehmigungsverfahren — § 63 NBauO.
• Reguläres Baugenehmigungsverfahren — § 64 NBauO.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 67 NBauO.
• Entwurfsverfasser-Eignung (NI-Pendant zur Bauvorlageberechtigung) —
  § 53 NBauO.
• Form und Inhalt der Bauvorlagen: separate BauVorlVO Nds (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Grenzabstände — § 5 NBauO. Abstände auf demselben Baugrundstück —
  § 7 NBauO.
• Standsicherheit — § 12 NBauO. Bautechnische Nachweise — § 65 NBauO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale. Die obigen NI-§§ sind die Mindest-
Verweise für Verfahren und Antrag.`,
  },
}
