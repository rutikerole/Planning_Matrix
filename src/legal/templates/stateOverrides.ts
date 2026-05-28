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
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
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
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
  // ── T-03 Sanierung ───────────────────────────────────────────────
  'T-03': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
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
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
  // ── T-04 Umnutzung ───────────────────────────────────────────────
  'T-04': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
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
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
  // ── T-05 Abbruch ─────────────────────────────────────────────────
  'T-05': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
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

Unter den Schwellen ist der Abbruch verfahrensfrei (ggf. Anzeige genügt);
oberhalb der Schwellen ist eine Genehmigung erforderlich.

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
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
  // ── T-06 Aufstockung ─────────────────────────────────────────────
  'T-06': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
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
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
  // ── T-07 Anbau ───────────────────────────────────────────────────
  'T-07': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
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
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
  // ── T-08 Sonstiges ───────────────────────────────────────────────
  'T-08': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
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
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
}
