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
  // ── T-01 Neubau EFH ──────────────────────────────────────────────
  'T-01': {
    // C2 batch — Hamburg × T-01 authored 2026-05-28. HBauO §§ corpus-
    // verified (secondary-mirror tier; baunormenlexikon.de). Hamburg-
    // Fassung 06.01.2025 (gültig ab 01.01.2026). Stadtstaat: Bauaufsicht
    // beim Bezirksamt (7 Bezirke). Path 2'' — systemBlock untouched.
    hamburg: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hamburg × T-01 (Neubau Einfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei EFH-Projekten in HAMBURG: die §§ der HBauO (Hamburgische Bauordnung)
ersetzen sämtliche oben genannten Bayern-Verweise. Hamburg ist Stadtstaat
— die zuständige Bauaufsicht liegt beim Bezirksamt (Bauaufsicht des
jeweiligen Bezirks; Hamburg hat 7 Bezirke). Quelle: baunormenlexikon.de
(mirror-tier; Hamburg-Fassung vom 06.01.2025, gültig ab 01.01.2026; bei
rechtlich kritischen Fragen die amtliche Fassung beim Landesrecht Hamburg
gegenprüfen).

HINWEIS: Der Hamburger systemBlock ist bislang "Mindest-Eckdaten"; die
hier zitierten §§ sind korpus-verifiziert.

VERFAHREN — HBauO:
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 61 HBauO.
• Genehmigungsfreistellung — § 62 HBauO (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 HBauO.
• Baugenehmigungsverfahren (regulär) — § 64 HBauO.

ROUTING (EFH-typisch):
EFH erreicht häufig Gebäudeklasse 1 bis 3 nach § 2 HBauO. Bei
qualifiziertem B-Plan und ohne Sonderbau-Eigenschaft (§ 51 HBauO)
kommt die Genehmigungsfreistellung nach § 62 HBauO in Betracht;
sonst vereinfachtes Verfahren nach § 63 HBauO. Reguläres Verfahren
nach § 64 HBauO nur bei Sonderbau-Tatbestand.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 HBauO.
• Bauvorlageberechtigung — § 65 HBauO. Entwurfsverfasser-Pflichten —
  § 54 HBauO.
• Form/Inhalt der Bauvorlagen: separate BauVorlVO HH (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen — § 6 HBauO.
• Standsicherheit — § 12 HBauO. Bautechnische Nachweise —
  § 66 HBauO.
• Grundstücksbezogene Mobilität (Stellplätze, Fahrradabstellplätze) —
  § 49 HBauO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Maß + Baugebiete — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

PV-PFLICHT in Hamburg:
NICHT in der HBauO geregelt. Hamburg hat eine PV-Pflicht über das
HmbKlimaSchG bzw. Folgeverordnungen — konkrete §-Verweise NICHT im
Korpus. Falls relevant, geltende Solar-Pflicht-Vorschrift
referenzieren. Nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — DSchG HH (Denkmalschutzgesetz Hamburg) als separate
  Landesvorschrift (konkrete §-Verweise nicht im Korpus). Zuständige
  Behörde: Denkmalschutzamt Hamburg.`,
    // C1 batch — Berlin × T-01 authored 2026-05-28. BauO Bln §§ corpus-
    // verified (secondary-mirror tier; baunormenlexikon.de). Stadtstaat
    // framing: Bauaufsicht beim Bezirksamt. NB: state systemBlock remains
    // "preliminary" — Pass A only (Path 2'' per founder decision).
    berlin: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Berlin × T-01 (Neubau Einfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei EFH-Projekten in BERLIN: die §§ der BauO Bln (Bauordnung für Berlin)
ersetzen sämtliche oben genannten Bayern-Verweise. Berlin ist Stadtstaat
— die zuständige Bauaufsicht liegt beim Bezirksamt (Bauaufsicht des
Bezirks, in dem das Grundstück liegt). Quelle: baunormenlexikon.de
(mirror-tier; bei rechtlich kritischen Fragen die amtliche Fassung beim
Berliner Landesrecht-Portal gegenprüfen).

HINWEIS: Der Berliner systemBlock ist bislang "Mindest-Eckdaten"; die
hier zitierten §§ stammen aus dem Korpus (secondary-mirror, primary-URL
hinterlegt) und sind verwendbar, aber das vollständige Berliner Profil
wird erst mit anwaltlich verifizierter systemBlock-Tiefe abschließend
substantiell.

VERFAHREN — BauO Bln:
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 61 BauO Bln.
• Genehmigungsfreistellung — § 62 BauO Bln (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 BauO Bln.
• Baugenehmigungsverfahren (regulär) — § 64 BauO Bln.

ROUTING (EFH-typisch):
EFH erreicht häufig Gebäudeklasse 1 bis 3 nach § 2 BauO Bln. Bei
qualifiziertem B-Plan und ohne Sonderbau-Eigenschaft (§ 51 BauO Bln)
kommt die Genehmigungsfreistellung nach § 62 BauO Bln in Betracht;
sonst vereinfachtes Verfahren nach § 63 BauO Bln. Reguläres Verfahren
nach § 64 BauO Bln nur bei Sonderbau-Tatbestand.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 BauO Bln.
• Bauvorlageberechtigung — § 65 BauO Bln.
• Form/Inhalt der Bauvorlagen: separate BauVorlV Berlin (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 BauO Bln.
• Standsicherheit — § 12 BauO Bln. Bautechnische Nachweise —
  § 66 BauO Bln.
• Stellplätze, Abstellplätze für Fahrräder — § 49 BauO Bln.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Maß + Baugebiete — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

PV-PFLICHT in Berlin:
NICHT in der BauO Bln geregelt, sondern im Berliner Solargesetz. Konkrete
§-Verweise NICHT im Korpus — falls relevant, geltende Solar-Pflicht-
Vorschrift referenzieren. Nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — DSchG Bln (separate Landesvorschrift; konkrete §-Verweise nicht
  im Korpus). Zuständige Behörde: Landesdenkmalamt Berlin (LDA) plus
  Untere Denkmalschutzbehörde im jeweiligen Bezirksamt.`,
    // C3 batch — Bremen × T-01 authored 2026-05-28. BremLBO §§ corpus-
    // verified (secondary-mirror tier; baunormenlexikon.de; BremLBO Neufassung
    // 29.05.2024 / Brem.GBl. S. 380). Stadtstaat framing: 2 Stadtgemeinden
    // (Bremen + Bremerhaven) mit eigenen Bauaufsichtsbehörden, 1 Land.
    // Pass A only (Path 2'') — state systemBlock remains "preliminary".
    bremen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Bremen × T-01 (Neubau Einfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei EFH-Projekten in BREMEN: die §§ der BremLBO (Bremische Landesbauordnung)
ersetzen sämtliche oben genannten Bayern-Verweise. Bremen ist Stadtstaat
und umfasst zwei Stadtgemeinden: Bremen und Bremerhaven. Die zuständige
Bauaufsicht liegt beim Bauordnungsamt der jeweiligen Stadtgemeinde — in
Bremen das Bauordnungsamt der Stadtgemeinde Bremen, in Bremerhaven das
Bauordnungsamt der Stadt Bremerhaven (eigenständige untere Bauaufsichts-
behörde). Quelle: baunormenlexikon.de (mirror-tier; bei rechtlich
kritischen Fragen die amtliche Fassung beim transparenz.bremen.de
gegenprüfen). Stand: Neufassung vom 29.05.2024 (Brem.GBl. S. 380).

HINWEIS: Der Bremer systemBlock ist bislang "Mindest-Eckdaten"; die hier
zitierten §§ stammen aus dem Korpus (secondary-mirror, primary-URL
hinterlegt) und sind verwendbar, aber das vollständige Bremer Profil
wird erst mit anwaltlich verifizierter systemBlock-Tiefe abschließend
substantiell.

VERFAHREN — BremLBO:
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung von Anlagen) — § 61 BremLBO.
• Genehmigungsfreistellung — § 62 BremLBO (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 BremLBO.
• Baugenehmigungsverfahren (regulär) — § 64 BremLBO.

ROUTING (EFH-typisch):
EFH erreicht häufig Gebäudeklasse 1 bis 3 nach § 2 BremLBO. Bei
qualifiziertem B-Plan und ohne Sonderbau-Eigenschaft (§ 51 BremLBO)
kommt die Genehmigungsfreistellung nach § 62 BremLBO in Betracht;
sonst vereinfachtes Verfahren nach § 63 BremLBO. Reguläres Verfahren
nach § 64 BremLBO nur bei Sonderbau-Tatbestand.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 BremLBO.
• Bauvorlageberechtigung — § 65 BremLBO. Entwurfsverfasser — § 54 BremLBO.
• Form/Inhalt der Bauvorlagen: separate BauVorlV Bremen (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 BremLBO.
• Standsicherheit — § 12 BremLBO. Bautechnische Nachweise —
  § 66 BremLBO.
• Stellplätze, Garagen und Abstellplätze für Fahrräder — § 49 BremLBO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Maß + Baugebiete — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

PV-PFLICHT in Bremen:
Bremen HAT eine PV-Pflicht über das BremSolarG (Bremer Solargesetz) —
NICHT in der BremLBO geregelt. Konkrete §-Verweise NICHT im Korpus.
Geltende Solar-Pflicht-Regelung referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — BremDSchG (separate Landesvorschrift; konkrete §-Verweise nicht
  im Korpus). Zuständige Behörde: Landesamt für Denkmalpflege Bremen
  (LfD) plus zuständige untere Denkmalschutzbehörde der Stadtgemeinde
  (Bremen bzw. Bremerhaven).`,
    // C4 batch — Sachsen × T-01 authored 2026-05-28. SächsBO corpus-verified
    // (mirror-tier; baunormenlexikon.de + revosax.sachsen.de; SächsBO i.d.F.
    // Gesetz v. 01.03.2024 SächsGVBl. S. 169). First Flächenland. Path 2''
    // discipline: cells from corpus, banner STAYS ON. Authority framing:
    // 3 kreisfreie Städte (Leipzig/Dresden/Chemnitz) + 10 Landkreise.
    sachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen × T-01 (Neubau Einfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei EFH-Projekten in SACHSEN: die §§ der SächsBO (Sächsische Bauordnung)
ersetzen sämtliche oben genannten Bayern-Verweise. Sachsen ist Flächen-
land mit drei kreisfreien Städten (Leipzig, Dresden, Chemnitz) und zehn
Landkreisen. Die zuständige untere Bauaufsichtsbehörde liegt — bei
Projekten in den kreisfreien Städten — bei der Bauaufsichtsbehörde der
jeweiligen Stadt (Leipzig, Dresden oder Chemnitz); im übrigen Sachsen
beim Landratsamt des jeweiligen Landkreises. Quelle: baunormenlexikon.de
(mirror-tier; bei rechtlich kritischen Fragen die amtliche Fassung beim
revosax.sachsen.de gegenprüfen). Stand: SächsBO vom 11.05.2016 i.d.F.
Gesetz vom 01.03.2024 (SächsGVBl. S. 169).

HINWEIS: Der Sächsische systemBlock ist bislang "Mindest-Eckdaten"; die
hier zitierten §§ stammen aus dem Korpus (secondary-mirror, primary-URL
hinterlegt) und sind verwendbar, aber das vollständige Sachsen-Profil
wird erst mit anwaltlich verifizierter systemBlock-Tiefe abschließend
substantiell.

VERFAHREN — SächsBO:
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 61 SächsBO.
• Genehmigungsfreistellung — § 62 SächsBO (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 SächsBO.
• Baugenehmigungsverfahren (regulär) — § 64 SächsBO.

ROUTING (EFH-typisch):
EFH erreicht häufig Gebäudeklasse 1 bis 3 nach § 2 SächsBO. Bei
qualifiziertem B-Plan und ohne Sonderbau-Eigenschaft (§ 51 SächsBO)
kommt die Genehmigungsfreistellung nach § 62 SächsBO in Betracht;
sonst vereinfachtes Verfahren nach § 63 SächsBO. Reguläres Verfahren
nach § 64 SächsBO nur bei Sonderbau-Tatbestand.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 SächsBO.
• Bauvorlageberechtigung — § 65 SächsBO. Entwurfsverfasser —
  § 54 SächsBO.
• Form/Inhalt der Bauvorlagen: separate DVOSächsBO bzw. SächsBauVorlVO
  (kein §-Verweis im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 SächsBO.
• Standsicherheit — § 12 SächsBO. Bautechnische Nachweise —
  § 66 SächsBO.
• Stellplätze, Garagen, Abstellplätze für Fahrräder — § 49 SächsBO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Maß + Baugebiete — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

SOLAR-/KLIMASCHUTZ-VORGABEN in Sachsen:
Sachsen-spezifische Solar-/Klimaschutz-Pflichten sind außerhalb der
SächsBO geregelt (insbesondere SächsKlimaschutzG). Konkrete §-Verweise
NICHT im Korpus — geltende Vorschrift referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — SächsDSchG (separate Landesvorschrift; konkrete §-Verweise
  nicht im Korpus). Zuständige Behörde: Landesamt für Denkmalpflege
  Sachsen (LfD Sachsen) auf Landesebene; untere Denkmalschutzbehörde
  bei der Stadt (Leipzig/Dresden/Chemnitz) bzw. beim Landratsamt.`,
    // C5 batch — Schleswig-Holstein × T-01 authored 2026-05-28. LBO SH
    // corpus-verified (mirror-tier; baunormenlexikon.de; LBO SH i.d.F.
    // Gesetz v. 13.12.2024 GVOBl. S. 875, 928 — most recent of all C-states
    // authored so far). Second Flächenland. Path 2'' discipline: cells from
    // corpus, banner STAYS ON. Authority framing: 4 kreisfreie Städte
    // (Kiel/Lübeck/Flensburg/Neumünster) + 11 Kreise. NB: § 58a
    // ("Bestehende Anlagen") SKIPPED per corpus self-flag (Phase-B confirm
    // pending; corpus notes a coincidental Bayern fabrication echo).
    sh: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Schleswig-Holstein × T-01 (Neubau Einfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei EFH-Projekten in SCHLESWIG-HOLSTEIN: die §§ der LBO SH (Landesbau-
ordnung für das Land Schleswig-Holstein) ersetzen sämtliche oben
genannten Bayern-Verweise. Schleswig-Holstein ist Flächenland mit vier
kreisfreien Städten (Kiel, Lübeck, Flensburg, Neumünster) und elf Kreisen
(Dithmarschen, Herzogtum Lauenburg, Nordfriesland, Ostholstein,
Pinneberg, Plön, Rendsburg-Eckernförde, Schleswig-Flensburg, Segeberg,
Steinburg, Stormarn). Die zuständige untere Bauaufsichtsbehörde liegt —
bei Projekten in den kreisfreien Städten — bei der städtischen
Bauaufsichtsbehörde; im übrigen Schleswig-Holstein beim Landratsamt des
jeweiligen Kreises. Quelle: baunormenlexikon.de (mirror-tier; bei
rechtlich kritischen Fragen die amtliche Fassung beim
gesetze-rechtsprechung.sh.juris.de gegenprüfen). Stand: LBO SH
Neubekanntmachung vom 05.07.2024 i.d.F. Gesetz vom 13.12.2024 (GVOBl.
S. 875, 928).

HINWEIS: Der Schleswig-Holsteinische systemBlock ist bislang
"Mindest-Eckdaten"; die hier zitierten §§ stammen aus dem Korpus
(secondary-mirror, primary-URL hinterlegt) und sind verwendbar, aber das
vollständige SH-Profil wird erst mit anwaltlich verifizierter
systemBlock-Tiefe abschließend substantiell.

VERFAHREN — LBO SH:
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 61 LBO SH.
• Genehmigungsfreistellung — § 62 LBO SH (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBO SH.
• Baugenehmigungsverfahren (regulär) — § 64 LBO SH.

ROUTING (EFH-typisch):
EFH erreicht häufig Gebäudeklasse 1 bis 3 nach § 2 LBO SH. Bei
qualifiziertem B-Plan und ohne Sonderbau-Eigenschaft (§ 51 LBO SH)
kommt die Genehmigungsfreistellung nach § 62 LBO SH in Betracht;
sonst vereinfachtes Verfahren nach § 63 LBO SH. Reguläres Verfahren
nach § 64 LBO SH nur bei Sonderbau-Tatbestand.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 LBO SH.
• Bauvorlageberechtigung — § 65 LBO SH. Entwurfsverfasser —
  § 54 LBO SH.
• Form/Inhalt der Bauvorlagen: separate BauVorlVO SH (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 LBO SH.
• Standsicherheit — § 12 LBO SH. Bautechnische Nachweise —
  § 66 LBO SH.
• Stellplätze, Garagen, Abstellanlagen für Fahrräder — § 49 LBO SH.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Maß + Baugebiete — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

SOLAR-/KLIMASCHUTZ-VORGABEN in Schleswig-Holstein:
SH-spezifische Solar-/Klimaschutz-Pflichten sind außerhalb der LBO SH
geregelt. Konkrete §-Verweise NICHT im Korpus — geltende Vorschrift
referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — DSchG SH (separate Landesvorschrift; konkrete §-Verweise
  nicht im Korpus). Zuständige Behörde: Landesamt für Denkmalpflege
  Schleswig-Holstein (LfD SH) auf Landesebene; untere Denkmalschutz-
  behörde bei der kreisfreien Stadt (Kiel/Lübeck/Flensburg/Neumünster)
  bzw. beim Landratsamt des Kreises.`,
    // C6 batch — Rheinland-Pfalz × T-01 authored 2026-05-28. LBauO corpus-
    // verified (mirror-tier; baunormenlexikon.de; LBauO RP 1998-11-24
    // i.d.F. Gesetz v. 19.11.2025 — freshest C-state amendment). Third
    // Flächenland. UNIQUE §-NUMBERING: verfahrensfrei = § 62 (not § 61),
    // Freistellung = § 67, vereinfacht = § 66, regulär = § 61 + § 70.
    // Brandschutz 2-§ (§ 15 + § 30). Citation prefix bare "LBauO" per gate.
    rlp: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Rheinland-Pfalz × T-01 (Neubau Einfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei EFH-Projekten in RHEINLAND-PFALZ: die §§ der LBauO (Landesbauordnung
Rheinland-Pfalz) ersetzen sämtliche oben genannten Bayern-Verweise.
Rheinland-Pfalz ist Flächenland mit zwölf kreisfreien Städten (u. a.
Mainz, Ludwigshafen am Rhein, Koblenz, Trier, Kaiserslautern) und 24
Landkreisen. Die zuständige untere Bauaufsichtsbehörde liegt — bei
Projekten in den kreisfreien Städten — bei der städtischen Bauaufsichts-
behörde; im übrigen Rheinland-Pfalz bei der Kreisverwaltung des
jeweiligen Landkreises. Quelle: baunormenlexikon.de (mirror-tier; bei
rechtlich kritischen Fragen die amtliche Fassung beim landesrecht.rlp.de
gegenprüfen). Stand: LBauO Rheinland-Pfalz vom 24.11.1998 i.d.F. Gesetz
vom 19.11.2025 (GVBl. S. 672, 673).

HINWEIS: Der Rheinland-Pfälzische systemBlock ist bislang "Mindest-
Eckdaten"; die hier zitierten §§ stammen aus dem Korpus (secondary-mirror,
primary-URL hinterlegt) und sind verwendbar, aber das vollständige
RP-Profil wird erst mit anwaltlich verifizierter systemBlock-Tiefe
abschließend substantiell.

VERFAHREN — LBauO (RP-spezifische Nummerierung, abweichend vom MBO-Schema):
• Genehmigungsfreie Vorhaben — § 62 LBauO.
• Freistellungsverfahren — § 67 LBauO (bei qualifiziertem B-Plan).
• Vereinfachtes Genehmigungsverfahren — § 66 LBauO.
• Genehmigungsbedürftige Vorhaben — § 61 LBauO. Baugenehmigung —
  § 70 LBauO (reguläres Verfahren).

ROUTING (EFH-typisch):
EFH erreicht häufig Gebäudeklasse 1 bis 3 nach § 2 LBauO. Bei
qualifiziertem B-Plan und ohne Sonderbau-Eigenschaft (§ 50 LBauO) kommt
das Freistellungsverfahren nach § 67 LBauO in Betracht; sonst
vereinfachtes Verfahren nach § 66 LBauO. Reguläres Verfahren nach § 61 +
§ 70 LBauO nur bei Sonderbau-Tatbestand.

ANTRAG & VORLAGEN:
• Bauantrag — § 63 LBauO.
• Bauvorlageberechtigung — § 64 LBauO. Entwurfsverfasser — § 56 LBauO.
• Form/Inhalt der Bauvorlagen: separate BauuntPrüfVO und Landes-
  Verordnungen (kein §-Verweis im Korpus — Verordnung als Quelle
  referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen — § 8 LBauO.
• Standsicherheit — § 13 LBauO (in der LBauO RP kein eigener
  "Bautechnische Nachweise"-§; § 13 trägt den substanziellen
  Standsicherheits-Anker).
• Stellplätze und Garagen — § 47 LBauO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Maß + Baugebiete — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

SOLAR-/KLIMASCHUTZ-VORGABEN in Rheinland-Pfalz:
RP-spezifische Solar-/Klimaschutz-Pflichten sind außerhalb der LBauO
geregelt. Konkrete §-Verweise NICHT im Korpus — geltende Vorschrift
referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — DSchG RLP (separate Landesvorschrift; konkrete §-Verweise nicht
  im Korpus). Zuständige Behörde: Landesamt für Denkmalpflege Rheinland-
  Pfalz auf Landesebene; untere Denkmalschutzbehörde bei der Kreis-
  verwaltung bzw. kreisfreien Stadt.`,
    // C7 batch — Mecklenburg-Vorpommern × T-01 authored 2026-05-28.
    // LBauO M-V corpus-verified (mirror-tier; baunormenlexikon.de;
    // Bekanntmachung 15.10.2015 i.d.F. Gesetz v. 18.03.2025 GVOBl. M-V
    // S. 130). Fourth Flächenland. Standard § 61-§ 64 ladder. Authority:
    // 2 kreisfreie Städte (Rostock, Schwerin) + 6 Landkreise (post-2011
    // Kreisgebietsreform). Citation prefix "LBauO M-V".
    mv: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Mecklenburg-Vorpommern × T-01 (Neubau Einfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei EFH-Projekten in MECKLENBURG-VORPOMMERN: die §§ der LBauO M-V
(Landesbauordnung Mecklenburg-Vorpommern) ersetzen sämtliche oben
genannten Bayern-Verweise. Mecklenburg-Vorpommern ist Flächenland mit
zwei kreisfreien Städten (Rostock, Schwerin) und sechs Landkreisen
(Mecklenburgische Seenplatte, Rostock, Vorpommern-Rügen, Nordwest-
mecklenburg, Ludwigslust-Parchim, Vorpommern-Greifswald) nach der
Kreisgebietsreform 2011. Die zuständige untere Bauaufsichtsbehörde
liegt — bei Projekten in den kreisfreien Städten — bei der städtischen
Bauaufsichtsbehörde; im übrigen MV beim Landkreis. Quelle:
baunormenlexikon.de (mirror-tier; bei rechtlich kritischen Fragen die
amtliche Fassung beim landesrecht-mv.de gegenprüfen). Stand: LBauO M-V
Bekanntmachung vom 15.10.2015 (GVOBl. M-V S. 344) i.d.F. Gesetz vom
18.03.2025 (GVOBl. M-V S. 130).

HINWEIS: Der Mecklenburg-Vorpommersche systemBlock ist bislang
"Mindest-Eckdaten"; die hier zitierten §§ stammen aus dem Korpus
(secondary-mirror, primary-URL hinterlegt) und sind verwendbar, aber
das vollständige MV-Profil wird erst mit anwaltlich verifizierter
systemBlock-Tiefe abschließend substantiell.

VERFAHREN — LBauO M-V:
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 61 LBauO M-V.
• Genehmigungsfreistellung — § 62 LBauO M-V (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBauO M-V.
• Baugenehmigungsverfahren (regulär) — § 64 LBauO M-V.

ROUTING (EFH-typisch):
EFH erreicht häufig Gebäudeklasse 1 bis 3 nach § 2 LBauO M-V. Bei
qualifiziertem B-Plan und ohne Sonderbau-Eigenschaft (§ 51 LBauO M-V)
kommt die Genehmigungsfreistellung nach § 62 LBauO M-V in Betracht;
sonst vereinfachtes Verfahren nach § 63 LBauO M-V. Reguläres Verfahren
nach § 64 LBauO M-V nur bei Sonderbau-Tatbestand.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 LBauO M-V.
• Bauvorlageberechtigung — § 65 LBauO M-V. Entwurfsverfasser —
  § 54 LBauO M-V.
• Form/Inhalt der Bauvorlagen: separate BauVorlVO M-V (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 LBauO M-V.
• Standsicherheit — § 12 LBauO M-V. Bautechnische Nachweise —
  § 66 LBauO M-V.
• Stellplätze, Garagen, Abstellplätze für Fahrräder — § 49 LBauO M-V.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Maß + Baugebiete — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

SOLAR-/KLIMASCHUTZ-VORGABEN in Mecklenburg-Vorpommern:
MV-spezifische Solar-/Klimaschutz-Pflichten sind außerhalb der LBauO M-V
geregelt. Konkrete §-Verweise NICHT im Korpus — geltende Vorschrift
referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — DSchG M-V (separate Landesvorschrift; konkrete §-Verweise nicht
  im Korpus). Zuständige Behörde: Landesamt für Kultur und Denkmalpflege
  Mecklenburg-Vorpommern auf Landesebene; untere Denkmalschutzbehörde
  bei der kreisfreien Stadt (Rostock/Schwerin) bzw. beim Landkreis.`,
    // C8 batch — Sachsen-Anhalt × T-01 authored 2026-05-28. BauO LSA
    // corpus-verified (mirror-tier; baunormenlexikon.de; BauO LSA 2013-09-10
    // i.d.F. Gesetz v. 13.06.2024 GVBl. LSA S. 150). Fifth Flächenland.
    // SHIFTED §-NUMBERING: verfahrensfrei § 60, Freistellung § 61,
    // vereinfacht § 62, regulär § 63, Bauvorlage § 64, Nachweise § 65,
    // Bauantrag § 67. Stellplätze § 48 (not § 49). Sonderbau § 50 (not
    // § 51). Entwurfsverfasser § 53 (not § 54). 3-§ brandschutz: § 14
    // (umbrella + Baustoffe combined per heading) + § 29 (Brandwände) +
    // § 32 (Rettungsweg). § 86 ("Bestehende bauliche Anlagen") SKIPPED
    // (heading-evident relevance but no corpus self-flag clarity — defer
    // to Phase B, same caution as SH § 58a).
    'sachsen-anhalt': `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen-Anhalt × T-01 (Neubau Einfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei EFH-Projekten in SACHSEN-ANHALT: die §§ der BauO LSA (Bauordnung des
Landes Sachsen-Anhalt) ersetzen sämtliche oben genannten Bayern-Verweise.
Sachsen-Anhalt ist Flächenland mit drei kreisfreien Städten (Magdeburg,
Halle (Saale), Dessau-Roßlau) und elf Landkreisen. Die zuständige untere
Bauaufsichtsbehörde liegt — bei Projekten in den kreisfreien Städten —
bei der städtischen Bauaufsichtsbehörde; im übrigen Sachsen-Anhalt beim
Landkreis. Quelle: baunormenlexikon.de (mirror-tier; bei rechtlich
kritischen Fragen die amtliche Fassung beim landesrecht.sachsen-anhalt.de
gegenprüfen). Stand: BauO LSA Fassung vom 10.09.2013 i.d.F. Gesetz vom
13.06.2024 (GVBl. LSA S. 150).

HINWEIS: Der Sachsen-Anhaltinische systemBlock ist bislang "Mindest-
Eckdaten"; die hier zitierten §§ stammen aus dem Korpus (secondary-mirror,
primary-URL hinterlegt) und sind verwendbar, aber das vollständige
LSA-Profil wird erst mit anwaltlich verifizierter systemBlock-Tiefe
abschließend substantiell.

VERFAHREN — BauO LSA (LSA-spezifische Nummerierung, um 1 versetzt):
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 60 BauO LSA.
• Genehmigungsfreistellung — § 61 BauO LSA (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 62 BauO LSA.
• Baugenehmigungsverfahren (regulär) — § 63 BauO LSA.

ROUTING (EFH-typisch):
EFH erreicht häufig Gebäudeklasse 1 bis 3 nach § 2 BauO LSA. Bei
qualifiziertem B-Plan und ohne Sonderbau-Eigenschaft (§ 50 BauO LSA)
kommt die Genehmigungsfreistellung nach § 61 BauO LSA in Betracht;
sonst vereinfachtes Verfahren nach § 62 BauO LSA. Reguläres Verfahren
nach § 63 BauO LSA nur bei Sonderbau-Tatbestand.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 67 BauO LSA.
• Bauvorlageberechtigung — § 64 BauO LSA. Entwurfsverfasser —
  § 53 BauO LSA.
• Form/Inhalt der Bauvorlagen: separate BauVorlVO LSA (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 BauO LSA.
• Standsicherheit — § 12 BauO LSA. Bautechnische Nachweise —
  § 65 BauO LSA.
• Notwendige Stellplätze, Garagen, Abstellplätze für Fahrräder —
  § 48 BauO LSA.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Maß + Baugebiete — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

SOLAR-/KLIMASCHUTZ-VORGABEN in Sachsen-Anhalt:
LSA-spezifische Solar-/Klimaschutz-Pflichten sind außerhalb der BauO LSA
geregelt. Konkrete §-Verweise NICHT im Korpus — geltende Vorschrift
referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — DSchG LSA (separate Landesvorschrift; konkrete §-Verweise nicht
  im Korpus). Zuständige Behörde: Landesamt für Denkmalpflege und
  Archäologie Sachsen-Anhalt auf Landesebene; untere Denkmalschutz-
  behörde bei der kreisfreien Stadt bzw. beim Landkreis.`,
  },
  // ── T-02 Neubau MFH ──────────────────────────────────────────────
  'T-02': {
    // B2 batch 3 — BW × T-02 authored 2026-05-28. LBO BW §§ corpus-verified
    // (secondary-mirror tier; baunormenlexikon.de + dejure.org). § 51
    // Kenntnisgabeverfahren cited as BW-specific institute; § 65 + § 73a
    // intentionally omitted (enforcement / admin-meta).
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei Projekten in BADEN-WÜRTTEMBERG: die §§ der LBO BW (Landesbauordnung
Baden-Württemberg) ersetzen sämtliche oben genannten Bayern-Verweise.
Quelle: baunormenlexikon.de und dejure.org (mirror-tier; bei rechtlich
kritischen Fragen die amtliche Fassung beim Landesrecht-Portal
gegenprüfen).

VERFAHREN — LBO BW (BW hat eigenen Verfahrensraster mit Kenntnisgabeverfahren):
• Verfahrensfreie Vorhaben — § 50 LBO BW (Anhang 1 listet die Tatbestände).
• Kenntnisgabeverfahren — § 51 LBO BW (BW-spezifisches Verfahren ohne
  Baugenehmigung; Vorhaben wird der Gemeinde zur Kenntnis gegeben).
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO BW.
• Baugenehmigung (reguläres Verfahren) — § 58 LBO BW.

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 LBO BW. Bei Sonderbau-
Tatbestand (§ 38 LBO BW) ist die volle Baugenehmigung nach § 58 LBO BW
zwingend. Ohne Sonderbau-Eigenschaft: vereinfachtes Verfahren nach
§ 52 LBO BW. Das Kenntnisgabeverfahren nach § 51 LBO BW ist nur bei den dort
genannten Tatbeständen anwendbar — typische MFH erreichen es selten.

ANTRAG & VORLAGEN:
• Bauvorlagen und Bauantrag — § 53 LBO BW.
• Bauvorlageberechtigung — § 63 LBO BW. Entwurfsverfasser — § 43 LBO BW.
• Form und Inhalt der Bauvorlagen: separate LBOVVO BW (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen — § 5 LBO BW (Grundregel). Sonderfälle — § 6 LBO BW.
  Übernahme auf Nachbargrundstücke — § 7 LBO BW.
• Standsicherheit — § 13 LBO BW.
• Brandschutz allgemein — § 15 LBO BW. Baustoffe/Bauteile — § 26 LBO BW.
  Brandwände — § 27c LBO BW.
• Stellplätze für Kraftfahrzeuge und Fahrräder — § 37 LBO BW.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

PV-PFLICHT in BW:
BW HAT eine PV-Pflicht über das KlimaG BW — NICHT in der LBO BW geregelt.
Konkrete §-Verweise NICHT im Korpus. Geltende Solar-Pflicht-Regelung
referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — DSchG BW als separate Landesvorschrift (konkrete §-Verweise
  nicht im Korpus). Zuständige Behörde: Landesamt für Denkmalpflege
  Baden-Württemberg (LAD).`,
    // B2 batch 4 — HE × T-02 authored 2026-05-28. HBO §§ corpus-verified
    // (secondary-mirror tier; baunormenlexikon.de). § 64a Erweiterte
    // Genehmigungsfreistellung für Wohngebäude cited — strong match for MFH.
    hessen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hessen × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei Projekten in HESSEN: die §§ der HBO (Hessische Bauordnung) ersetzen
sämtliche oben genannten Bayern-Verweise. Quelle: baunormenlexikon.de
(mirror-tier; bei rechtlich kritischen Fragen die amtliche Fassung beim
Landesrecht-Portal gegenprüfen).

VERFAHREN — HBO (Hessen hat zwei Freistellungs-§§ + vereinfacht + regulär):
• Verfahrensfreie / baugenehmigungsfreie Bauvorhaben — § 63 HBO.
• Genehmigungsfreistellung — § 64 HBO (bei qualifiziertem B-Plan).
• Erweiterte Genehmigungsfreistellung für Wohngebäude — § 64a HBO.
• Vereinfachtes Baugenehmigungsverfahren — § 65 HBO.
• Baugenehmigungsverfahren (regulär) — § 66 HBO.

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 HBO. Bei Sonderbau-
Tatbestand (§ 53 HBO) ist das reguläre Baugenehmigungsverfahren nach
§ 66 HBO zwingend. Ohne Sonderbau: vereinfachtes Verfahren nach § 65 HBO.
Für MFH-Neubauten als Wohngebäude kann zusätzlich die erweiterte
Genehmigungsfreistellung nach § 64a HBO einschlägig sein, sofern deren
Voraussetzungen erfüllt sind.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 69 HBO.
• Bauvorlageberechtigung — § 67 HBO.
• Form und Inhalt der Bauvorlagen: separate BauVorlV Hessen (kein
  §-Verweis im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 HBO.
• Standsicherheit — § 12 HBO. Bautechnische Nachweise (Standsicherheit,
  Brandschutz, Typenprüfung) — § 68 HBO.
• Brandschutz — § 14 HBO.
• Stellplätze, Garagen, Fahrradabstellplätze — § 52 HBO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

PV-PFLICHT in Hessen:
NICHT in der HBO geregelt. Falls eine landesrechtliche Solar-/Klima-
Pflicht für Hessen besteht und einschlägig ist, separate Vorschrift
referenzieren — nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB (Erhaltungssatzungs-Gebiet).
• Land — HDSchG als separate Landesvorschrift (konkrete §-Verweise nicht
  im Korpus). Zuständige Behörde: Landesamt für Denkmalpflege Hessen
  (LfDH).`,
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
    // C1 batch — Berlin × T-02 authored 2026-05-28. BauO Bln corpus-verified.
    berlin: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Berlin × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei MFH-Projekten in BERLIN: die §§ der BauO Bln ersetzen sämtliche oben
genannten Bayern-Verweise. Berlin ist Stadtstaat — Bauaufsicht liegt
beim Bezirksamt. Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Berliner systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

VERFAHREN — BauO Bln:
• Verfahrensfreie Bauvorhaben — § 61 BauO Bln.
• Genehmigungsfreistellung — § 62 BauO Bln (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 BauO Bln.
• Baugenehmigungsverfahren (regulär) — § 64 BauO Bln.

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 BauO Bln. Bei
Sonderbau-Tatbestand (§ 51 BauO Bln) ist das reguläre Verfahren nach
§ 64 BauO Bln zwingend. Ohne Sonderbau: vereinfachtes Verfahren nach
§ 63 BauO Bln. Freistellung nach § 62 BauO Bln nur bei qualifiziertem
B-Plan und ohne Sonderbau.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 BauO Bln.
• Bauvorlageberechtigung — § 65 BauO Bln.
• Form/Inhalt der Bauvorlagen: separate BauVorlV Berlin (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 BauO Bln.
• Standsicherheit — § 12 BauO Bln. Bautechnische Nachweise —
  § 66 BauO Bln.
• Brandschutz allgemein — § 14 BauO Bln. Baustoffe/Bauteile
  (Brandverhalten) — § 26 BauO Bln.
• Stellplätze, Abstellplätze für Fahrräder — § 49 BauO Bln.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

PV-PFLICHT in Berlin:
NICHT in der BauO Bln geregelt, sondern im Berliner Solargesetz. Konkrete
§-Verweise NICHT im Korpus — geltende Vorschrift referenzieren, nicht
erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB.
• Land — DSchG Bln. Behörde: Landesdenkmalamt Berlin (LDA) plus Untere
  Denkmalschutzbehörde im jeweiligen Bezirksamt.`,
    // C2 batch — Hamburg × T-02 authored 2026-05-28. HBauO corpus-verified.
    hamburg: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hamburg × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei MFH-Projekten in HAMBURG: die §§ der HBauO ersetzen sämtliche oben
genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim Bezirksamt.
Quelle: baunormenlexikon.de (mirror-tier; HBauO-Fassung vom 06.01.2025).

HINWEIS: Hamburger systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

VERFAHREN — HBauO:
• Verfahrensfreie Bauvorhaben — § 61 HBauO.
• Genehmigungsfreistellung — § 62 HBauO (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 HBauO.
• Baugenehmigungsverfahren (regulär) — § 64 HBauO.

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 HBauO. Bei Sonderbau-
Tatbestand (§ 51 HBauO) ist das reguläre Verfahren nach § 64 HBauO
zwingend. Ohne Sonderbau: vereinfachtes Verfahren nach § 63 HBauO.
Freistellung nach § 62 HBauO nur bei qualifiziertem B-Plan und ohne
Sonderbau.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 HBauO.
• Bauvorlageberechtigung — § 65 HBauO. Entwurfsverfasser-Pflichten —
  § 54 HBauO.
• Form/Inhalt der Bauvorlagen: separate BauVorlVO HH (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen — § 6 HBauO.
• Standsicherheit — § 12 HBauO. Bautechnische Nachweise — § 66 HBauO.
• Brandschutz allgemein — § 14 HBauO. Baustoffe/Bauteile (Brandverhalten)
  — § 26 HBauO. Brandwände — § 30 HBauO. Erster und zweiter Rettungsweg
  — § 33 HBauO.
• Grundstücksbezogene Mobilität (Stellplätze, Fahrradabstellplätze) —
  § 49 HBauO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

PV-PFLICHT in Hamburg:
NICHT in der HBauO geregelt — HmbKlimaSchG bzw. Folgeverordnungen.
Geltende Solar-Pflicht-Vorschrift referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB.
• Land — DSchG HH. Behörde: Denkmalschutzamt Hamburg.`,
    // C3 batch — Bremen × T-02 authored 2026-05-28. BremLBO corpus-verified.
    // Brandschutz spread §§ 14/26/30/33 (all four tagged in BremLBO, same
    // depth as Hamburg). Stadtstaat: Bremen + Bremerhaven, je eigenes
    // Bauordnungsamt.
    bremen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Bremen × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei MFH-Projekten in BREMEN: die §§ der BremLBO ersetzen sämtliche oben
genannten Bayern-Verweise. Bremen ist Stadtstaat mit zwei Stadtgemeinden
(Bremen + Bremerhaven) — Bauaufsicht je nach Stadtgemeinde beim
Bauordnungsamt der Stadtgemeinde Bremen bzw. dem Bauordnungsamt der Stadt
Bremerhaven. Quelle: baunormenlexikon.de (mirror-tier). Stand: Neufassung
vom 29.05.2024.

HINWEIS: Bremer systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

VERFAHREN — BremLBO:
• Verfahrensfreie Bauvorhaben — § 61 BremLBO.
• Genehmigungsfreistellung — § 62 BremLBO (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 BremLBO.
• Baugenehmigungsverfahren (regulär) — § 64 BremLBO.

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 BremLBO. Bei
Sonderbau-Tatbestand (§ 51 BremLBO) ist das reguläre Verfahren nach
§ 64 BremLBO zwingend. Ohne Sonderbau: vereinfachtes Verfahren nach
§ 63 BremLBO. Freistellung nach § 62 BremLBO nur bei qualifiziertem
B-Plan und ohne Sonderbau.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 BremLBO.
• Bauvorlageberechtigung — § 65 BremLBO. Entwurfsverfasser — § 54 BremLBO.
• Form/Inhalt der Bauvorlagen: separate BauVorlV Bremen (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 BremLBO.
• Standsicherheit — § 12 BremLBO. Bautechnische Nachweise —
  § 66 BremLBO.
• Brandschutz allgemein — § 14 BremLBO. Baustoffe/Bauteile
  (Brandverhalten) — § 26 BremLBO. Brandwände — § 30 BremLBO. Erster und
  zweiter Rettungsweg — § 33 BremLBO.
• Stellplätze, Garagen, Abstellplätze für Fahrräder — § 49 BremLBO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

PV-PFLICHT in Bremen:
Bremen HAT eine PV-Pflicht über das BremSolarG — NICHT in der BremLBO
geregelt. Konkrete §-Verweise NICHT im Korpus. Geltende Solar-Pflicht-
Regelung referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB.
• Land — BremDSchG. Behörde: Landesamt für Denkmalpflege Bremen (LfD)
  plus zuständige untere Denkmalschutzbehörde der Stadtgemeinde.`,
    // C4 batch — Sachsen × T-02 authored 2026-05-28. SächsBO corpus-verified.
    // 4-§ brandschutz spread (§ 14/26/30/33) — heading-evident citation
    // discipline; corpus archetype-tagging only tags § 14 (recommended
    // future re-tag for § 26/30/33). HBO § 14-alone precedent does NOT apply
    // (different § numbering: HBO § 26 = Zertifizierung; SächsBO § 26 =
    // Brandverhalten). v1.0.30 Leipzig walk confirms § 33 SächsBO Rettungsweg.
    sachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei MFH-Projekten in SACHSEN: die §§ der SächsBO ersetzen sämtliche oben
genannten Bayern-Verweise. Flächenland — Bauaufsicht je nach Standort
bei der Bauaufsichtsbehörde der kreisfreien Stadt (Leipzig, Dresden,
Chemnitz) bzw. beim Landratsamt des jeweiligen Landkreises. Quelle:
baunormenlexikon.de (mirror-tier; bei rechtlich kritischen Fragen die
amtliche Fassung beim revosax.sachsen.de gegenprüfen). Stand: Gesetz vom
01.03.2024.

HINWEIS: Sächsischer systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

VERFAHREN — SächsBO:
• Verfahrensfreie Bauvorhaben — § 61 SächsBO.
• Genehmigungsfreistellung — § 62 SächsBO (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 SächsBO.
• Baugenehmigungsverfahren (regulär) — § 64 SächsBO.

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 SächsBO. Bei
Sonderbau-Tatbestand (§ 51 SächsBO) ist das reguläre Verfahren nach
§ 64 SächsBO zwingend. Ohne Sonderbau: vereinfachtes Verfahren nach
§ 63 SächsBO. Freistellung nach § 62 SächsBO nur bei qualifiziertem
B-Plan und ohne Sonderbau.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 SächsBO.
• Bauvorlageberechtigung — § 65 SächsBO. Entwurfsverfasser —
  § 54 SächsBO.
• Form/Inhalt der Bauvorlagen: separate DVOSächsBO bzw. SächsBauVorlVO
  (kein §-Verweis im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 SächsBO.
• Standsicherheit — § 12 SächsBO. Bautechnische Nachweise —
  § 66 SächsBO.
• Brandschutz allgemein — § 14 SächsBO. Baustoffe/Bauteile
  (Brandverhalten) — § 26 SächsBO. Brandwände — § 30 SächsBO. Erster und
  zweiter Rettungsweg — § 33 SächsBO.
• Stellplätze, Garagen, Abstellplätze für Fahrräder — § 49 SächsBO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

SOLAR-/KLIMASCHUTZ-VORGABEN in Sachsen:
Sachsen-spezifische Solar-/Klimaschutz-Pflichten sind außerhalb der
SächsBO geregelt (insbesondere SächsKlimaschutzG). Konkrete §-Verweise
NICHT im Korpus — geltende Vorschrift referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB.
• Land — SächsDSchG. Behörde: Landesamt für Denkmalpflege Sachsen (LfD
  Sachsen) plus zuständige untere Denkmalschutzbehörde (Stadt bzw.
  Landratsamt).`,
    // C5 batch — Schleswig-Holstein × T-02 authored 2026-05-28. LBO SH
    // corpus-verified. 4-§ brandschutz spread (§ 14/26/30/33) — all four
    // corpus-tagged (no under-tag like SächsBO; clean tag coverage).
    sh: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Schleswig-Holstein × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei MFH-Projekten in SCHLESWIG-HOLSTEIN: die §§ der LBO SH ersetzen
sämtliche oben genannten Bayern-Verweise. Flächenland — Bauaufsicht je
nach Standort bei der städtischen Bauaufsichtsbehörde der kreisfreien
Stadt (Kiel, Lübeck, Flensburg, Neumünster) bzw. beim Landratsamt des
jeweiligen Kreises. Quelle: baunormenlexikon.de (mirror-tier; bei
rechtlich kritischen Fragen die amtliche Fassung beim
gesetze-rechtsprechung.sh.juris.de gegenprüfen). Stand: LBO SH i.d.F.
Gesetz vom 13.12.2024.

HINWEIS: Schleswig-Holsteinischer systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

VERFAHREN — LBO SH:
• Verfahrensfreie Bauvorhaben — § 61 LBO SH.
• Genehmigungsfreistellung — § 62 LBO SH (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBO SH.
• Baugenehmigungsverfahren (regulär) — § 64 LBO SH.

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 LBO SH. Bei
Sonderbau-Tatbestand (§ 51 LBO SH) ist das reguläre Verfahren nach
§ 64 LBO SH zwingend. Ohne Sonderbau: vereinfachtes Verfahren nach
§ 63 LBO SH. Freistellung nach § 62 LBO SH nur bei qualifiziertem
B-Plan und ohne Sonderbau.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 LBO SH.
• Bauvorlageberechtigung — § 65 LBO SH. Entwurfsverfasser —
  § 54 LBO SH.
• Form/Inhalt der Bauvorlagen: separate BauVorlVO SH (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 LBO SH.
• Standsicherheit — § 12 LBO SH. Bautechnische Nachweise —
  § 66 LBO SH.
• Brandschutz allgemein — § 14 LBO SH. Baustoffe/Bauteile
  (Brandverhalten) — § 26 LBO SH. Brandwände — § 30 LBO SH. Erster und
  zweiter Rettungsweg — § 33 LBO SH.
• Stellplätze, Garagen, Abstellanlagen für Fahrräder — § 49 LBO SH.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

SOLAR-/KLIMASCHUTZ-VORGABEN in Schleswig-Holstein:
SH-spezifische Solar-/Klimaschutz-Pflichten sind außerhalb der LBO SH
geregelt. Konkrete §-Verweise NICHT im Korpus — geltende Vorschrift
referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB.
• Land — DSchG SH. Behörde: Landesamt für Denkmalpflege Schleswig-
  Holstein (LfD SH) plus zuständige untere Denkmalschutzbehörde
  (kreisfreie Stadt bzw. Landratsamt).`,
    // C6 batch — Rheinland-Pfalz × T-02 authored 2026-05-28. LBauO corpus-
    // verified. 2-§ brandschutz spread (§ 15 + § 30) — RLP's LBauO has no
    // standalone Baustoffe-Brandverhalten or Rettungsweg §§.
    rlp: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Rheinland-Pfalz × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei MFH-Projekten in RHEINLAND-PFALZ: die §§ der LBauO ersetzen sämtliche
oben genannten Bayern-Verweise. Flächenland — Bauaufsicht je nach
Standort bei der städtischen Bauaufsichtsbehörde der kreisfreien Stadt
(u. a. Mainz, Ludwigshafen, Koblenz, Trier, Kaiserslautern) bzw. bei der
Kreisverwaltung des jeweiligen Landkreises. Quelle: baunormenlexikon.de
(mirror-tier). Stand: LBauO RP i.d.F. Gesetz vom 19.11.2025.

HINWEIS: Rheinland-Pfälzischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

VERFAHREN — LBauO (RP-spezifische Nummerierung):
• Genehmigungsfreie Vorhaben — § 62 LBauO.
• Freistellungsverfahren — § 67 LBauO (bei qualifiziertem B-Plan).
• Vereinfachtes Genehmigungsverfahren — § 66 LBauO.
• Genehmigungsbedürftige Vorhaben — § 61 LBauO. Baugenehmigung —
  § 70 LBauO (reguläres Verfahren).

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 LBauO. Bei
Sonderbau-Tatbestand (§ 50 LBauO) ist das reguläre Verfahren nach
§ 61 + § 70 LBauO zwingend. Ohne Sonderbau: vereinfachtes Verfahren nach
§ 66 LBauO. Freistellung nach § 67 LBauO nur bei qualifiziertem B-Plan
und ohne Sonderbau.

ANTRAG & VORLAGEN:
• Bauantrag — § 63 LBauO.
• Bauvorlageberechtigung — § 64 LBauO. Entwurfsverfasser — § 56 LBauO.

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen — § 8 LBauO.
• Standsicherheit — § 13 LBauO.
• Brandschutz allgemein — § 15 LBauO. Brandwände — § 30 LBauO.
  (LBauO RP hat keine eigenen §§ für Baustoffe-Brandverhalten oder
  Erster/zweiter Rettungsweg — Brandschutz-Detailanforderungen ergeben
  sich aus den Technischen Baubestimmungen und einer Brandschutz-
  konzeption.)
• Stellplätze und Garagen — § 47 LBauO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

SOLAR-/KLIMASCHUTZ-VORGABEN in Rheinland-Pfalz:
RP-spezifische Solar-/Klimaschutz-Pflichten sind außerhalb der LBauO
geregelt. Konkrete §-Verweise NICHT im Korpus — geltende Vorschrift
referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB.
• Land — DSchG RLP. Behörde: Landesamt für Denkmalpflege Rheinland-Pfalz
  plus zuständige untere Denkmalschutzbehörde (Kreisverwaltung bzw.
  kreisfreie Stadt).`,
    // C7 batch — Mecklenburg-Vorpommern × T-02 authored 2026-05-28. LBauO
    // M-V corpus-verified. 4-§ brandschutz spread (§ 14/26/30/33);
    // heading-evident discipline — corpus archetype-tagging covers only
    // § 14 + § 26 for brandschutz; § 30/§ 33 are heading-evident
    // (Brandwände / Rettungsweg) but UNDER-TAGGED in MV corpus, mirroring
    // SächsBO's pattern. Future corpus re-tag noted.
    mv: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Mecklenburg-Vorpommern × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei MFH-Projekten in MECKLENBURG-VORPOMMERN: die §§ der LBauO M-V
ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht je nach Standort bei der städtischen Bauaufsichtsbehörde der
kreisfreien Stadt (Rostock, Schwerin) bzw. beim Landkreis. Quelle:
baunormenlexikon.de (mirror-tier; bei rechtlich kritischen Fragen die
amtliche Fassung beim landesrecht-mv.de gegenprüfen). Stand: LBauO M-V
i.d.F. Gesetz vom 18.03.2025.

HINWEIS: Mecklenburg-Vorpommerscher systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

VERFAHREN — LBauO M-V:
• Verfahrensfreie Bauvorhaben — § 61 LBauO M-V.
• Genehmigungsfreistellung — § 62 LBauO M-V (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBauO M-V.
• Baugenehmigungsverfahren (regulär) — § 64 LBauO M-V.

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 LBauO M-V. Bei
Sonderbau-Tatbestand (§ 51 LBauO M-V) ist das reguläre Verfahren nach
§ 64 LBauO M-V zwingend. Ohne Sonderbau: vereinfachtes Verfahren nach
§ 63 LBauO M-V. Freistellung nach § 62 LBauO M-V nur bei qualifiziertem
B-Plan und ohne Sonderbau.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 LBauO M-V.
• Bauvorlageberechtigung — § 65 LBauO M-V. Entwurfsverfasser —
  § 54 LBauO M-V.

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 LBauO M-V.
• Standsicherheit — § 12 LBauO M-V. Bautechnische Nachweise —
  § 66 LBauO M-V.
• Brandschutz allgemein — § 14 LBauO M-V. Baustoffe/Bauteile
  (Brandverhalten) — § 26 LBauO M-V. Brandwände — § 30 LBauO M-V. Erster
  und zweiter Rettungsweg — § 33 LBauO M-V.
• Stellplätze, Garagen, Abstellplätze für Fahrräder — § 49 LBauO M-V.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

SOLAR-/KLIMASCHUTZ-VORGABEN in Mecklenburg-Vorpommern:
MV-spezifische Solar-/Klimaschutz-Pflichten sind außerhalb der LBauO M-V
geregelt. Konkrete §-Verweise NICHT im Korpus — geltende Vorschrift
referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB.
• Land — DSchG M-V. Behörde: Landesamt für Kultur und Denkmalpflege
  Mecklenburg-Vorpommern plus zuständige untere Denkmalschutzbehörde
  (kreisfreie Stadt bzw. Landkreis).`,
    // C8 batch — Sachsen-Anhalt × T-02 authored 2026-05-28. BauO LSA
    // corpus-verified. 3-§ brandschutz (§ 14 absorbs Baustoffe per heading;
    // + § 29 Brandwände + § 32 Rettungsweg). § 26 LSA = Tragende Wände
    // (different topic — NOT brandschutz).
    'sachsen-anhalt': `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen-Anhalt × T-02 (Neubau Mehrfamilienhaus)
══════════════════════════════════════════════════════════════════════════

Bei MFH-Projekten in SACHSEN-ANHALT: die §§ der BauO LSA ersetzen
sämtliche oben genannten Bayern-Verweise. Flächenland — Bauaufsicht je
nach Standort bei der städtischen Bauaufsichtsbehörde der kreisfreien
Stadt (Magdeburg, Halle (Saale), Dessau-Roßlau) bzw. beim Landkreis.
Quelle: baunormenlexikon.de (mirror-tier; bei rechtlich kritischen Fragen
die amtliche Fassung beim landesrecht.sachsen-anhalt.de gegenprüfen).
Stand: BauO LSA i.d.F. Gesetz vom 13.06.2024.

HINWEIS: Sachsen-Anhaltinischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

VERFAHREN — BauO LSA (versetzte Nummerierung):
• Verfahrensfreie Bauvorhaben — § 60 BauO LSA.
• Genehmigungsfreistellung — § 61 BauO LSA (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 62 BauO LSA.
• Baugenehmigungsverfahren (regulär) — § 63 BauO LSA.

ROUTING (MFH-typisch):
MFH erreicht häufig Gebäudeklasse 3 bis 5 nach § 2 BauO LSA. Bei
Sonderbau-Tatbestand (§ 50 BauO LSA) ist das reguläre Verfahren nach
§ 63 BauO LSA zwingend. Ohne Sonderbau: vereinfachtes Verfahren nach
§ 62 BauO LSA. Freistellung nach § 61 BauO LSA nur bei qualifiziertem
B-Plan und ohne Sonderbau.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 67 BauO LSA.
• Bauvorlageberechtigung — § 64 BauO LSA. Entwurfsverfasser —
  § 53 BauO LSA.

TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 BauO LSA.
• Standsicherheit — § 12 BauO LSA. Bautechnische Nachweise —
  § 65 BauO LSA.
• Brandschutz allgemein und Brandverhalten Baustoffe/Bauteile —
  § 14 BauO LSA (Überschrift bündelt beide Aspekte). Brandwände —
  § 29 BauO LSA. Erster und zweiter Rettungsweg — § 32 BauO LSA.
• Notwendige Stellplätze, Garagen, Abstellplätze für Fahrräder —
  § 48 BauO LSA.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.
• Baugebiete + Maß — § 1 BauNVO, § 3 BauNVO, § 4 BauNVO, § 6 BauNVO,
  § 16 BauNVO, § 19 BauNVO, § 23 BauNVO. Stellplätze — § 12 BauNVO.
• Energie — § 10 GEG. § 80 GEG.

SOLAR-/KLIMASCHUTZ-VORGABEN in Sachsen-Anhalt:
LSA-spezifische Solar-/Klimaschutz-Pflichten sind außerhalb der BauO LSA
geregelt. Konkrete §-Verweise NICHT im Korpus — geltende Vorschrift
referenzieren, nicht erfinden.

DENKMAL & ERHALTUNGSSATZUNG:
• Bundesanker — § 172 BauGB.
• Land — DSchG LSA. Behörde: Landesamt für Denkmalpflege und
  Archäologie Sachsen-Anhalt plus zuständige untere Denkmalschutz-
  behörde (kreisfreie Stadt bzw. Landkreis).`,
  },
  // ── T-03 Sanierung ───────────────────────────────────────────────
  'T-03': {
    // B2 batch 3 — BW × T-03 authored 2026-05-28. LBO BW §§ corpus-verified.
    // § 27f / § 28d cited as narrow substantive Anforderungen; § 65 + § 73a
    // omitted.
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in BADEN-WÜRTTEMBERG: die §§
der LBO BW ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und dejure.org (mirror-tier).

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Nutzung fällt häufig unter § 50 LBO BW (verfahrensfreie Vorhaben).
Sobald tragende Bauteile berührt werden oder DG-Ausbauten zu Wohnzwecken
erfolgen, ist § 27f LBO BW einschlägig. Bei Eingriffen in Rettungswege gilt
§ 28d LBO BW. Je nach Tiefe folgt das vereinfachte Verfahren nach § 52 LBO BW
oder die Baugenehmigung nach § 58 LBO BW.

VERFAHREN — LBO BW:
• Verfahrensfreie Vorhaben — § 50 LBO BW.
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO BW.
• Baugenehmigung — § 58 LBO BW.

SUBSTANTIVE ANFORDERUNGEN BEI EINGRIFF:
• Bei tragenden / aussteifenden / raumabschließenden Bauteilen sowie
  DG-Ausbauten oder Aufstockungen zu Wohnzwecken — § 27f LBO BW.
• Bei Eingriffen in Bauteile in Rettungswegen — § 28d LBO BW.
• Standsicherheit — § 13 LBO BW.
• Brandschutz allgemein — § 15 LBO BW. Baustoffe/Bauteile — § 26 LBO BW.
  Brandwände — § 27c LBO BW.

ANTRAG:
• Bauvorlagen und Bauantrag — § 53 LBO BW.
• Bauvorlageberechtigung — § 63 LBO BW. Entwurfsverfasser — § 43 LBO BW.

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
  nicht in der LBO BW geregelt; geltende Vorschrift referenzieren.`,
    // B2 batch 4 — HE × T-03 authored 2026-05-28. HBO §§ corpus-verified.
    // § 92 HBO mentioned with explicit NARROW scope (ex-land-/forstwirtsch.).
    hessen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hessen × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in HESSEN: die §§ der HBO
ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de (mirror-tier).

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Nutzung fällt häufig unter § 63 HBO (baugenehmigungsfreie
Bauvorhaben). Sobald tragende Bauteile, Brandschutz oder die Nutzung
berührt sind, ist regelmäßig das vereinfachte Verfahren nach § 65 HBO
anzunehmen.

VERFAHREN — HBO:
• Baugenehmigungsfreie Bauvorhaben — § 63 HBO.
• Vereinfachtes Baugenehmigungsverfahren — § 65 HBO.

TECHNISCHE NACHWEISE BEI EINGRIFF:
• Standsicherheit bei tragenden Eingriffen — § 12 HBO.
• Bautechnische Nachweise (Standsicherheit, Brandschutz, Typenprüfung)
  — § 68 HBO.
• Brandschutz — § 14 HBO.

ANTRAG:
• Bauantrag und Bauvorlagen — § 69 HBO. Bauvorlageberechtigung —
  § 67 HBO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

NUTZUNGSÄNDERUNG IN HESSEN (sehr enger §-Anker):
Der einzige in der HBO im Korpus tagged-Nutzungsänderungs-§ ist § 92 HBO
— und dieser regelt NUR die Frist zur Umnutzung ehemaliger land- oder
forstwirtschaftlicher Gebäude (sehr enger Anwendungsbereich). Für
allgemeine Nutzungsänderungen ist KEIN dedizierter HBO-§ vorhanden;
der Verfahrensweg geht über § 65 HBO (vereinfacht) bzw. § 66 HBO (regulär).

DENKMALSCHUTZ:
Bei eingetragenem Baudenkmal oder Ensemble — HDSchG (separate
Landesvorschrift; konkrete §-Verweise nicht im Korpus). Vor Sanierung
ist das Landesamt für Denkmalpflege Hessen (LfDH) anzuhören. Federal-
Anker bei Erhaltungssatzung — § 172 BauGB.

NICHT IM Korpus (NICHT erfinden):
• Land-Denkmal-§§ — wie oben mit LfDH abklären.
• PV-Pflicht bei Sanierung — keine im HBO-Korpus; falls eine
  landesrechtliche Hessen-Solar-Pflicht einschlägig ist, separate
  Vorschrift referenzieren.`,
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
    // C1 batch — Berlin × T-03 authored 2026-05-28. BauO Bln corpus-verified.
    // Berlin BauO has no dedicated Nutzungsänderungs-§ (same as NRW); routing
    // via § 63/§ 64. Denkmal: DSchG Bln out of corpus.
    berlin: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Berlin × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in BERLIN: die §§ der BauO Bln
ersetzen sämtliche oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht
beim Bezirksamt. Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Berliner systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Nutzung fällt häufig unter § 61 BauO Bln (verfahrensfreie
Bauvorhaben). Sobald tragende Bauteile, Brandschutz oder die Nutzung
berührt sind, ist regelmäßig das vereinfachte Verfahren nach § 63 BauO Bln
anzunehmen.

VERFAHREN — BauO Bln:
• Verfahrensfreie Bauvorhaben — § 61 BauO Bln.
• Vereinfachtes Baugenehmigungsverfahren — § 63 BauO Bln.

TECHNISCHE NACHWEISE BEI EINGRIFF:
• Standsicherheit bei tragenden Eingriffen — § 12 BauO Bln.
• Bautechnische Nachweise — § 66 BauO Bln.
• Brandschutz allgemein — § 14 BauO Bln. Baustoffe/Bauteile
  (Brandverhalten) — § 26 BauO Bln.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 BauO Bln. Bauvorlageberechtigung —
  § 65 BauO Bln.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

NUTZUNGSÄNDERUNG IN Berlin:
Berlin hat KEINEN dedizierten Nutzungsänderungs-§ in der BauO Bln. Eine
Nutzungsänderung im Sanierungskontext ist über § 63 BauO Bln (vereinfacht)
bzw. § 64 BauO Bln (regulär bei Sonderbau, § 51 BauO Bln) zu beantragen.

DENKMALSCHUTZ:
Bei eingetragenem Baudenkmal oder Ensemble — DSchG Bln (separate
Landesvorschrift; konkrete §-Verweise nicht im Korpus). Vor Sanierung ist
das Landesamt für Denkmalpflege Berlin (LDA) plus Untere Denkmalschutz-
behörde des Bezirksamts anzuhören. Federal-Anker bei Erhaltungssatzung
— § 172 BauGB.

NICHT IM Korpus (NICHT erfinden):
• Land-Denkmal-§§ — wie oben mit LDA / Bezirksamt abklären.
• Solar-/PV-Pflicht bei Sanierung — Berliner Solargesetz; nicht in der
  BauO geregelt; geltende Vorschrift referenzieren.`,
    // C2 batch — Hamburg × T-03 authored 2026-05-28. HBauO corpus-verified.
    // No dedicated Nutzungsänderungs-§ (same as NRW/Berlin).
    hamburg: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hamburg × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in HAMBURG: die §§ der HBauO
ersetzen sämtliche oben genannten Bayern-Verweise. Stadtstaat —
Bauaufsicht beim Bezirksamt. Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Hamburger systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Nutzung fällt häufig unter § 61 HBauO (verfahrensfreie Bauvorhaben).
Sobald tragende Bauteile, Brandschutz oder die Nutzung berührt sind, ist
regelmäßig das vereinfachte Verfahren nach § 63 HBauO anzunehmen.

VERFAHREN — HBauO:
• Verfahrensfreie Bauvorhaben — § 61 HBauO.
• Vereinfachtes Baugenehmigungsverfahren — § 63 HBauO.

TECHNISCHE NACHWEISE BEI EINGRIFF:
• Standsicherheit bei tragenden Eingriffen — § 12 HBauO.
• Bautechnische Nachweise — § 66 HBauO.
• Brandschutz allgemein — § 14 HBauO. Baustoffe/Bauteile (Brandverhalten)
  — § 26 HBauO. Brandwände — § 30 HBauO. Rettungswege — § 33 HBauO.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 HBauO. Bauvorlageberechtigung —
  § 65 HBauO. Entwurfsverfasser-Pflichten — § 54 HBauO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

NUTZUNGSÄNDERUNG IN Hamburg:
Hamburg hat KEINEN dedizierten Nutzungsänderungs-§ in der HBauO. Eine
Nutzungsänderung im Sanierungskontext ist über § 63 HBauO (vereinfacht)
bzw. § 64 HBauO (regulär bei Sonderbau, § 51 HBauO) zu beantragen.

DENKMALSCHUTZ:
Bei eingetragenem Baudenkmal oder Ensemble — DSchG HH (separate
Landesvorschrift; konkrete §-Verweise nicht im Korpus). Vor Sanierung
ist das Denkmalschutzamt Hamburg anzuhören. Federal-Anker bei
Erhaltungssatzung — § 172 BauGB.

NICHT IM Korpus (NICHT erfinden):
• Land-Denkmal-§§ — wie oben mit Denkmalschutzamt Hamburg abklären.
• Solar-/PV-Pflicht — HmbKlimaSchG; nicht in der HBauO geregelt;
  geltende Vorschrift referenzieren.`,
    // C3 batch — Bremen × T-03 authored 2026-05-28. BremLBO corpus-verified.
    // Brandschutz spread §§ 14/26/30/33. No dedicated Nutzungsänderungs-§
    // (same deferral as Berlin/Hamburg/NRW).
    bremen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Bremen × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in BREMEN: die §§ der BremLBO
ersetzen sämtliche oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht
beim Bauordnungsamt der jeweiligen Stadtgemeinde (Bremen oder Bremerhaven).
Quelle: baunormenlexikon.de (mirror-tier). Stand: Neufassung vom 29.05.2024.

HINWEIS: Bremer systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Nutzung fällt häufig unter § 61 BremLBO (verfahrensfreie
Bauvorhaben). Sobald tragende Bauteile, Brandschutz oder die Nutzung
berührt sind, ist regelmäßig das vereinfachte Verfahren nach § 63 BremLBO
anzunehmen.

VERFAHREN — BremLBO:
• Verfahrensfreie Bauvorhaben — § 61 BremLBO.
• Vereinfachtes Baugenehmigungsverfahren — § 63 BremLBO.

TECHNISCHE NACHWEISE BEI EINGRIFF:
• Standsicherheit bei tragenden Eingriffen — § 12 BremLBO.
• Bautechnische Nachweise — § 66 BremLBO.
• Brandschutz allgemein — § 14 BremLBO. Baustoffe/Bauteile
  (Brandverhalten) — § 26 BremLBO. Brandwände — § 30 BremLBO. Erster und
  zweiter Rettungsweg — § 33 BremLBO.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 BremLBO. Bauvorlageberechtigung —
  § 65 BremLBO. Entwurfsverfasser — § 54 BremLBO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

NUTZUNGSÄNDERUNG IN Bremen:
Bremen hat KEINEN dedizierten Nutzungsänderungs-§ in der BremLBO. Eine
Nutzungsänderung im Sanierungskontext ist über § 63 BremLBO (vereinfacht)
bzw. § 64 BremLBO (regulär bei Sonderbau, § 51 BremLBO) zu beantragen.

DENKMALSCHUTZ:
Bei eingetragenem Baudenkmal oder Ensemble — BremDSchG (separate
Landesvorschrift; konkrete §-Verweise nicht im Korpus). Vor Sanierung ist
das Landesamt für Denkmalpflege Bremen (LfD) plus zuständige untere
Denkmalschutzbehörde der Stadtgemeinde anzuhören. Federal-Anker bei
Erhaltungssatzung — § 172 BauGB.

NICHT IM Korpus (NICHT erfinden):
• Land-Denkmal-§§ — wie oben mit LfD / Stadtgemeinde abklären.
• Solar-/PV-Pflicht bei Sanierung — BremSolarG; nicht in der BremLBO
  geregelt; geltende Vorschrift referenzieren.`,
    // C4 batch — Sachsen × T-03 authored 2026-05-28. SächsBO corpus-verified.
    // 4-§ brandschutz spread. No dedicated Nutzungsänderungs-§ in SächsBO
    // (same deferral pattern as Berlin/Hamburg/Bremen/NRW).
    sachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in SACHSEN: die §§ der SächsBO
ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht beim Landratsamt bzw. bei der Bauaufsichtsbehörde der
kreisfreien Stadt (Leipzig, Dresden, Chemnitz). Quelle: baunormenlexikon.de
(mirror-tier). Stand: Gesetz vom 01.03.2024.

HINWEIS: Sächsischer systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Nutzung fällt häufig unter § 61 SächsBO (verfahrensfreie
Bauvorhaben). Sobald tragende Bauteile, Brandschutz oder die Nutzung
berührt sind, ist regelmäßig das vereinfachte Verfahren nach § 63 SächsBO
anzunehmen.

VERFAHREN — SächsBO:
• Verfahrensfreie Bauvorhaben — § 61 SächsBO.
• Vereinfachtes Baugenehmigungsverfahren — § 63 SächsBO.

TECHNISCHE NACHWEISE BEI EINGRIFF:
• Standsicherheit bei tragenden Eingriffen — § 12 SächsBO.
• Bautechnische Nachweise — § 66 SächsBO.
• Brandschutz allgemein — § 14 SächsBO. Baustoffe/Bauteile
  (Brandverhalten) — § 26 SächsBO. Brandwände — § 30 SächsBO. Erster und
  zweiter Rettungsweg — § 33 SächsBO.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 SächsBO. Bauvorlageberechtigung —
  § 65 SächsBO. Entwurfsverfasser — § 54 SächsBO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

NUTZUNGSÄNDERUNG IN Sachsen:
Sachsen hat KEINEN dedizierten Nutzungsänderungs-§ in der SächsBO. Eine
Nutzungsänderung im Sanierungskontext ist über § 63 SächsBO (vereinfacht)
bzw. § 64 SächsBO (regulär bei Sonderbau, § 51 SächsBO) zu beantragen.

DENKMALSCHUTZ:
Bei eingetragenem Baudenkmal oder Ensemble — SächsDSchG (separate
Landesvorschrift; konkrete §-Verweise nicht im Korpus). Vor Sanierung ist
das Landesamt für Denkmalpflege Sachsen (LfD Sachsen) plus zuständige
untere Denkmalschutzbehörde (Stadt bzw. Landratsamt) anzuhören.
Federal-Anker bei Erhaltungssatzung — § 172 BauGB.

NICHT IM Korpus (NICHT erfinden):
• Land-Denkmal-§§ — wie oben mit LfD Sachsen / Stadt bzw. Landratsamt
  abklären.
• Solar-/PV-Pflicht bei Sanierung — SächsKlimaschutzG; nicht in der
  SächsBO geregelt; geltende Vorschrift referenzieren.`,
    // C5 batch — Schleswig-Holstein × T-03 authored 2026-05-28. LBO SH
    // corpus-verified. 4-§ brandschutz spread. No dedicated Nutzungsänd-§
    // in LBO SH; standard deferral pattern.
    sh: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Schleswig-Holstein × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in SCHLESWIG-HOLSTEIN: die §§
der LBO SH ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland
— Bauaufsicht beim Landratsamt bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt (Kiel, Lübeck, Flensburg, Neumünster).
Quelle: baunormenlexikon.de (mirror-tier). Stand: LBO SH i.d.F. Gesetz
vom 13.12.2024.

HINWEIS: Schleswig-Holsteinischer systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Nutzung fällt häufig unter § 61 LBO SH (verfahrensfreie
Bauvorhaben). Sobald tragende Bauteile, Brandschutz oder die Nutzung
berührt sind, ist regelmäßig das vereinfachte Verfahren nach § 63 LBO SH
anzunehmen.

VERFAHREN — LBO SH:
• Verfahrensfreie Bauvorhaben — § 61 LBO SH.
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBO SH.

TECHNISCHE NACHWEISE BEI EINGRIFF:
• Standsicherheit bei tragenden Eingriffen — § 12 LBO SH.
• Bautechnische Nachweise — § 66 LBO SH.
• Brandschutz allgemein — § 14 LBO SH. Baustoffe/Bauteile
  (Brandverhalten) — § 26 LBO SH. Brandwände — § 30 LBO SH. Erster und
  zweiter Rettungsweg — § 33 LBO SH.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 LBO SH. Bauvorlageberechtigung —
  § 65 LBO SH. Entwurfsverfasser — § 54 LBO SH.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

NUTZUNGSÄNDERUNG IN Schleswig-Holstein:
Schleswig-Holstein hat KEINEN dedizierten Nutzungsänderungs-§ in der
LBO SH. Eine Nutzungsänderung im Sanierungskontext ist über § 63 LBO SH
(vereinfacht) bzw. § 64 LBO SH (regulär bei Sonderbau, § 51 LBO SH) zu
beantragen.

DENKMALSCHUTZ:
Bei eingetragenem Baudenkmal oder Ensemble — DSchG SH (separate
Landesvorschrift; konkrete §-Verweise nicht im Korpus). Vor Sanierung
ist das Landesamt für Denkmalpflege Schleswig-Holstein (LfD SH) plus
zuständige untere Denkmalschutzbehörde (kreisfreie Stadt bzw.
Landratsamt) anzuhören. Federal-Anker bei Erhaltungssatzung —
§ 172 BauGB.

NICHT IM Korpus (NICHT erfinden):
• Land-Denkmal-§§ — wie oben mit LfD SH / Kreis bzw. kreisfreier Stadt
  abklären.
• Solar-/PV-Pflicht bei Sanierung — außerhalb der LBO SH geregelt;
  geltende Vorschrift referenzieren.`,
    // C6 batch — Rheinland-Pfalz × T-03 authored 2026-05-28. LBauO corpus-
    // verified. No dedicated Nutzungsänderungs-§ in LBauO RP; standard
    // deferral pattern.
    rlp: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Rheinland-Pfalz × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in RHEINLAND-PFALZ: die §§ der
LBauO ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht bei der Kreisverwaltung bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt. Quelle: baunormenlexikon.de (mirror-tier).
Stand: LBauO RP i.d.F. Gesetz vom 19.11.2025.

HINWEIS: Rheinland-Pfälzischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Nutzung fällt häufig unter § 62 LBauO (genehmigungsfreie Vorhaben).
Sobald tragende Bauteile, Brandschutz oder die Nutzung berührt sind, ist
regelmäßig das vereinfachte Verfahren nach § 66 LBauO anzunehmen.

VERFAHREN — LBauO:
• Genehmigungsfreie Vorhaben — § 62 LBauO.
• Vereinfachtes Genehmigungsverfahren — § 66 LBauO.

TECHNISCHE NACHWEISE BEI EINGRIFF:
• Standsicherheit bei tragenden Eingriffen — § 13 LBauO.
• Brandschutz allgemein — § 15 LBauO. Brandwände — § 30 LBauO.

ANTRAG:
• Bauantrag — § 63 LBauO. Bauvorlageberechtigung — § 64 LBauO.
  Entwurfsverfasser — § 56 LBauO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

NUTZUNGSÄNDERUNG IN Rheinland-Pfalz:
Rheinland-Pfalz hat KEINEN dedizierten Nutzungsänderungs-§ in der LBauO.
Eine Nutzungsänderung im Sanierungskontext ist über § 66 LBauO
(vereinfacht) bzw. § 61 + § 70 LBauO (regulär bei Sonderbau, § 50 LBauO)
zu beantragen.

DENKMALSCHUTZ:
Bei eingetragenem Baudenkmal oder Ensemble — DSchG RLP (separate
Landesvorschrift; konkrete §-Verweise nicht im Korpus). Vor Sanierung
ist das Landesamt für Denkmalpflege Rheinland-Pfalz plus zuständige
untere Denkmalschutzbehörde (Kreisverwaltung bzw. kreisfreie Stadt)
anzuhören. Federal-Anker bei Erhaltungssatzung — § 172 BauGB.

NICHT IM Korpus (NICHT erfinden):
• Land-Denkmal-§§ — wie oben mit Landesamt / Kreisverwaltung abklären.
• Solar-/PV-Pflicht bei Sanierung — außerhalb der LBauO geregelt;
  geltende Vorschrift referenzieren.`,
    // C7 batch — Mecklenburg-Vorpommern × T-03 authored 2026-05-28. LBauO
    // M-V corpus-verified. No dedicated Nutzungsänd-§; standard deferral.
    mv: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Mecklenburg-Vorpommern × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in MECKLENBURG-VORPOMMERN: die
§§ der LBauO M-V ersetzen sämtliche oben genannten Bayern-Verweise.
Flächenland — Bauaufsicht beim Landkreis bzw. bei der städtischen
Bauaufsichtsbehörde der kreisfreien Stadt (Rostock, Schwerin). Quelle:
baunormenlexikon.de (mirror-tier). Stand: LBauO M-V i.d.F. Gesetz vom
18.03.2025.

HINWEIS: Mecklenburg-Vorpommerscher systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Nutzung fällt häufig unter § 61 LBauO M-V (verfahrensfreie
Bauvorhaben). Sobald tragende Bauteile, Brandschutz oder die Nutzung
berührt sind, ist regelmäßig das vereinfachte Verfahren nach
§ 63 LBauO M-V anzunehmen.

VERFAHREN — LBauO M-V:
• Verfahrensfreie Bauvorhaben — § 61 LBauO M-V.
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBauO M-V.

TECHNISCHE NACHWEISE BEI EINGRIFF:
• Standsicherheit bei tragenden Eingriffen — § 12 LBauO M-V.
• Bautechnische Nachweise — § 66 LBauO M-V.
• Brandschutz allgemein — § 14 LBauO M-V. Baustoffe/Bauteile
  (Brandverhalten) — § 26 LBauO M-V. Brandwände — § 30 LBauO M-V. Erster
  und zweiter Rettungsweg — § 33 LBauO M-V.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 LBauO M-V. Bauvorlageberechtigung —
  § 65 LBauO M-V. Entwurfsverfasser — § 54 LBauO M-V.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

NUTZUNGSÄNDERUNG IN Mecklenburg-Vorpommern:
Mecklenburg-Vorpommern hat KEINEN dedizierten Nutzungsänderungs-§ in der
LBauO M-V. Eine Nutzungsänderung im Sanierungskontext ist über
§ 63 LBauO M-V (vereinfacht) bzw. § 64 LBauO M-V (regulär bei Sonderbau,
§ 51 LBauO M-V) zu beantragen.

DENKMALSCHUTZ:
Bei eingetragenem Baudenkmal oder Ensemble — DSchG M-V (separate
Landesvorschrift; konkrete §-Verweise nicht im Korpus). Vor Sanierung
ist das Landesamt für Kultur und Denkmalpflege Mecklenburg-Vorpommern
plus zuständige untere Denkmalschutzbehörde (kreisfreie Stadt bzw.
Landkreis) anzuhören. Federal-Anker bei Erhaltungssatzung — § 172 BauGB.

NICHT IM Korpus (NICHT erfinden):
• Land-Denkmal-§§ — wie oben mit Landesamt / Landkreis bzw. kreisfreier
  Stadt abklären.
• Solar-/PV-Pflicht bei Sanierung — außerhalb der LBauO M-V geregelt;
  geltende Vorschrift referenzieren.`,
    // C8 batch — Sachsen-Anhalt × T-03 authored 2026-05-28. BauO LSA
    // corpus-verified.
    'sachsen-anhalt': `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen-Anhalt × T-03 (Sanierung / Modernisierung)
══════════════════════════════════════════════════════════════════════════

Bei Sanierungs-/Modernisierungs-Projekten in SACHSEN-ANHALT: die §§ der
BauO LSA ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland
— Bauaufsicht beim Landkreis bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt (Magdeburg, Halle, Dessau-Roßlau). Quelle:
baunormenlexikon.de (mirror-tier). Stand: BauO LSA i.d.F. Gesetz vom
13.06.2024.

HINWEIS: Sachsen-Anhaltinischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Reine Instandhaltung/Modernisierung ohne Eingriff in Statik, Brandschutz
oder Nutzung fällt häufig unter § 60 BauO LSA (verfahrensfreie
Bauvorhaben). Sobald tragende Bauteile, Brandschutz oder die Nutzung
berührt sind, ist regelmäßig das vereinfachte Verfahren nach
§ 62 BauO LSA anzunehmen.

VERFAHREN — BauO LSA:
• Verfahrensfreie Bauvorhaben — § 60 BauO LSA.
• Vereinfachtes Baugenehmigungsverfahren — § 62 BauO LSA.

TECHNISCHE NACHWEISE BEI EINGRIFF:
• Standsicherheit bei tragenden Eingriffen — § 12 BauO LSA.
• Bautechnische Nachweise — § 65 BauO LSA.
• Brandschutz allgemein und Brandverhalten Baustoffe — § 14 BauO LSA.
  Brandwände — § 29 BauO LSA. Erster und zweiter Rettungsweg —
  § 32 BauO LSA.

ANTRAG:
• Bauantrag und Bauvorlagen — § 67 BauO LSA. Bauvorlageberechtigung —
  § 64 BauO LSA. Entwurfsverfasser — § 53 BauO LSA.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

NUTZUNGSÄNDERUNG IN Sachsen-Anhalt:
Sachsen-Anhalt hat KEINEN dedizierten Nutzungsänderungs-§ in der
BauO LSA. Eine Nutzungsänderung im Sanierungskontext ist über
§ 62 BauO LSA (vereinfacht) bzw. § 63 BauO LSA (regulär bei Sonderbau,
§ 50 BauO LSA) zu beantragen.

DENKMALSCHUTZ:
Bei eingetragenem Baudenkmal oder Ensemble — DSchG LSA (separate
Landesvorschrift; konkrete §-Verweise nicht im Korpus). Vor Sanierung
ist das Landesamt für Denkmalpflege und Archäologie Sachsen-Anhalt plus
zuständige untere Denkmalschutzbehörde (kreisfreie Stadt bzw. Landkreis)
anzuhören. Federal-Anker bei Erhaltungssatzung — § 172 BauGB.

NICHT IM Korpus (NICHT erfinden):
• Land-Denkmal-§§ — wie oben mit Landesamt / Landkreis bzw. kreisfreier
  Stadt abklären.
• Solar-/PV-Pflicht bei Sanierung — außerhalb der BauO LSA geregelt;
  geltende Vorschrift referenzieren.`,
  },
  // ── T-04 Umnutzung ───────────────────────────────────────────────
  'T-04': {
    // B2 batch 3 — BW × T-04 authored 2026-05-28. LBO BW §§ corpus-verified.
    // BW has NO general Nutzungsänderungs-§; § 27f + § 28d are narrow
    // substantive Anforderungen, NOT the procedure anchor. § 65 omitted.
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in BADEN-WÜRTTEMBERG: die §§ der LBO BW
ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und dejure.org (mirror-tier).

ROUTING:
Eine Nutzungsänderung ist in BW grundsätzlich genehmigungspflichtig,
sofern nicht ausdrücklich verfahrensfrei nach § 50 LBO BW. Die LBO BW hat
KEIN eigenständig benanntes "Nutzungsänderungs-Verfahren" — der
Verfahrensweg richtet sich nach den allgemeinen Verfahrens-§§. Substantive
Anforderungen sind in § 27f LBO BW (tragende Bauteile, DG-Ausbau zu
Wohnzwecken) und § 28d LBO BW (Rettungswege) geregelt.

VERFAHREN — LBO BW:
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO BW.
• Baugenehmigung (regulär) — § 58 LBO BW (bei Sonderbau-Tatbestand der
  neuen Nutzung, § 38 LBO BW).

SUBSTANTIVE ANKER BEI NUTZUNGSÄNDERUNG:
• Bei tragenden Bauteilen / DG-Ausbau zu Wohnzwecken — § 27f LBO BW.
• Bei Bauteilen in Rettungswegen — § 28d LBO BW.

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO.
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz nach neuer Nutzung — § 15 LBO BW, § 26 LBO BW, § 27c LBO BW.
• Stellplatzbedarf nach neuer Nutzung — § 37 LBO BW. Bundes-Maß ergänzend
  — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 13 LBO BW.

ANTRAG:
• Bauvorlagen und Bauantrag — § 53 LBO BW.
• Bauvorlageberechtigung — § 63 LBO BW. Entwurfsverfasser — § 43 LBO BW.

NICHT IM LBO BW-Korpus (NICHT erfinden):
• Land-Denkmal-§§ — DSchG BW mit LAD abklären.`,
    // B2 batch 4 — HE × T-04 authored 2026-05-28. HBO §§ corpus-verified.
    // § 92 HBO is the ONLY tagged Nutzungsänderungs-§ — narrow scope
    // (ex-land-/forstwirtschaftliche Gebäude only); flagged explicitly.
    // § 82 (enforcement) omitted from owner-side prose.
    hessen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hessen × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in HESSEN: die §§ der HBO ersetzen
sämtliche oben genannten Bayern-Verweise. Quelle: baunormenlexikon.de
(mirror-tier).

ROUTING:
Hessen hat KEINEN allgemeinen Nutzungsänderungs-§ in der HBO. Der einzige
Nutzungsänderungs-§ im Korpus ist § 92 HBO — und dieser regelt
ausschließlich die FRIST zur Umnutzung ehemaliger land- oder
forstwirtschaftlicher Gebäude (sehr enger Anwendungsbereich). Für
allgemeine Nutzungsänderungen läuft der Verfahrensweg über die
allgemeinen Verfahrens-§§:

VERFAHREN — HBO:
• Vereinfachtes Baugenehmigungsverfahren — § 65 HBO.
• Baugenehmigungsverfahren (regulär) — § 66 HBO (bei Sonderbau-
  Tatbestand der neuen Nutzung, § 53 HBO).

SPEZIALFALL (nur bei ex-Land-/Forstwirtschaft):
• Frist zur Umnutzung ehemaliger land- oder forstwirtschaftlicher
  Gebäude — § 92 HBO.

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO.
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz nach neuer Nutzung — § 14 HBO.
• Stellplatzbedarf nach neuer Nutzung — § 52 HBO. Bundes-Maß ergänzend
  — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 12 HBO. Bautechnische
  Nachweise — § 68 HBO.

ANTRAG:
• Bauantrag und Bauvorlagen — § 69 HBO. Bauvorlageberechtigung —
  § 67 HBO.

NICHT IM HBO-Korpus (NICHT erfinden):
• Land-Denkmal-§§ — HDSchG mit LfDH abklären.`,
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
    // C1 batch — Berlin × T-04 authored 2026-05-28. BauO Bln corpus-verified.
    // No dedicated Nutzungsänderungs-§ in BauO Bln (same as NRW); routing
    // via general procedure §§ 63/64.
    berlin: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Berlin × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in BERLIN: die §§ der BauO Bln ersetzen
sämtliche oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim
Bezirksamt. Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Berliner systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

ROUTING:
Eine Nutzungsänderung ist in Berlin grundsätzlich genehmigungspflichtig,
sofern nicht ausdrücklich verfahrensfrei nach § 61 BauO Bln. Die BauO Bln
hat KEINEN dedizierten Nutzungsänderungs-§ — der Verfahrensweg richtet
sich nach den allgemeinen Verfahrens-§§:

VERFAHREN — BauO Bln:
• Vereinfachtes Baugenehmigungsverfahren — § 63 BauO Bln.
• Baugenehmigungsverfahren (regulär) — § 64 BauO Bln (bei Sonderbau-
  Tatbestand der neuen Nutzung, § 51 BauO Bln).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO.
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz nach neuer Nutzung — § 14 BauO Bln. Baustoffe/Bauteile
  (Brandverhalten) — § 26 BauO Bln.
• Stellplatzbedarf nach neuer Nutzung — § 49 BauO Bln. Bundes-Maß
  ergänzend — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 12 BauO Bln.
  Bautechnische Nachweise — § 66 BauO Bln.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 BauO Bln. Bauvorlageberechtigung —
  § 65 BauO Bln.

NICHT IM BauO-Bln-Korpus (NICHT erfinden):
• Land-Denkmal-§§ — DSchG Bln mit LDA / Bezirksamt abklären.`,
    // C2 batch — Hamburg × T-04 authored 2026-05-28. No dedicated
    // Nutzungsänderungs-§ in HBauO; routing via general procedure §§.
    hamburg: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hamburg × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in HAMBURG: die §§ der HBauO ersetzen
sämtliche oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim
Bezirksamt. Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Hamburger systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

ROUTING:
Eine Nutzungsänderung ist in Hamburg grundsätzlich genehmigungspflichtig,
sofern nicht ausdrücklich verfahrensfrei nach § 61 HBauO. Die HBauO hat
KEINEN dedizierten Nutzungsänderungs-§ — der Verfahrensweg richtet sich
nach den allgemeinen Verfahrens-§§:

VERFAHREN — HBauO:
• Vereinfachtes Baugenehmigungsverfahren — § 63 HBauO.
• Baugenehmigungsverfahren (regulär) — § 64 HBauO (bei Sonderbau-
  Tatbestand der neuen Nutzung, § 51 HBauO).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO.
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz nach neuer Nutzung — § 14 HBauO, § 26 HBauO, § 30 HBauO,
  § 33 HBauO.
• Stellplatzbedarf nach neuer Nutzung (Grundstücksbezogene Mobilität)
  — § 49 HBauO. Bundes-Maß ergänzend — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 12 HBauO.
  Bautechnische Nachweise — § 66 HBauO.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 HBauO. Bauvorlageberechtigung —
  § 65 HBauO. Entwurfsverfasser — § 54 HBauO.

NICHT IM HBauO-Korpus (NICHT erfinden):
• Land-Denkmal-§§ — DSchG HH mit Denkmalschutzamt Hamburg abklären.`,
    // C3 batch — Bremen × T-04 authored 2026-05-28. BremLBO corpus-verified.
    // No dedicated Nutzungsänderungs-§ in BremLBO (same deferral as Berlin/
    // NRW); routing via general procedure §§ 63/64.
    bremen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Bremen × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in BREMEN: die §§ der BremLBO ersetzen
sämtliche oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim
Bauordnungsamt der jeweiligen Stadtgemeinde (Bremen oder Bremerhaven).
Quelle: baunormenlexikon.de (mirror-tier). Stand: Neufassung vom 29.05.2024.

HINWEIS: Bremer systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

ROUTING:
Eine Nutzungsänderung ist in Bremen grundsätzlich genehmigungspflichtig,
sofern nicht ausdrücklich verfahrensfrei nach § 61 BremLBO. Die BremLBO
hat KEINEN dedizierten Nutzungsänderungs-§ — der Verfahrensweg richtet
sich nach den allgemeinen Verfahrens-§§:

VERFAHREN — BremLBO:
• Vereinfachtes Baugenehmigungsverfahren — § 63 BremLBO.
• Baugenehmigungsverfahren (regulär) — § 64 BremLBO (bei Sonderbau-
  Tatbestand der neuen Nutzung, § 51 BremLBO).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO.
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz nach neuer Nutzung — § 14 BremLBO. Baustoffe/Bauteile
  (Brandverhalten) — § 26 BremLBO. Brandwände — § 30 BremLBO. Erster und
  zweiter Rettungsweg — § 33 BremLBO.
• Stellplatzbedarf nach neuer Nutzung — § 49 BremLBO. Bundes-Maß
  ergänzend — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 12 BremLBO.
  Bautechnische Nachweise — § 66 BremLBO.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 BremLBO. Bauvorlageberechtigung —
  § 65 BremLBO. Entwurfsverfasser — § 54 BremLBO.

NICHT IM BremLBO-Korpus (NICHT erfinden):
• Land-Denkmal-§§ — BremDSchG mit LfD / Stadtgemeinde abklären.`,
    // C4 batch — Sachsen × T-04 authored 2026-05-28. SächsBO corpus-verified.
    // No dedicated Nutzungsänderungs-§ in SächsBO; routing via § 63/64.
    // The v1.0.30 Leipzig walk pattern (non-Sonderbau Gaststätte → § 63
    // vereinfacht; § 33 Rettungsweg) referenced here as the canonical T-04
    // shape for Sachsen. NB: v1.0.30 deterministic-pipeline bugs are closed;
    // this cell supplements (not replaces) those fixes.
    sachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in SACHSEN: die §§ der SächsBO ersetzen
sämtliche oben genannten Bayern-Verweise. Flächenland — Bauaufsicht
beim Landratsamt bzw. bei der Bauaufsichtsbehörde der kreisfreien Stadt
(Leipzig, Dresden, Chemnitz). Quelle: baunormenlexikon.de (mirror-tier).
Stand: Gesetz vom 01.03.2024.

HINWEIS: Sächsischer systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

ROUTING:
Eine Nutzungsänderung ist in Sachsen grundsätzlich genehmigungspflichtig,
sofern nicht ausdrücklich verfahrensfrei nach § 61 SächsBO. Die SächsBO
hat KEINEN dedizierten Nutzungsänderungs-§ — der Verfahrensweg richtet
sich nach den allgemeinen Verfahrens-§§. Bei Nicht-Sonderbau-Umnutzung
(z. B. Einzelhandel → kleine Gaststätte unterhalb der Sonderbau-Schwelle
nach § 51 SächsBO) ist regelmäßig das vereinfachte Verfahren nach
§ 63 SächsBO einschlägig; sobald Sonderbau-Tatbestand vorliegt, gilt das
reguläre Verfahren nach § 64 SächsBO.

VERFAHREN — SächsBO:
• Vereinfachtes Baugenehmigungsverfahren — § 63 SächsBO.
• Baugenehmigungsverfahren (regulär) — § 64 SächsBO (bei Sonderbau-
  Tatbestand der neuen Nutzung, § 51 SächsBO).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO
  (besondere Wohngebiete).
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz nach neuer Nutzung — § 14 SächsBO. Baustoffe/Bauteile
  (Brandverhalten) — § 26 SächsBO. Brandwände — § 30 SächsBO. Erster und
  zweiter Rettungsweg — § 33 SächsBO. Der Rettungsweg-§ ist bei
  publikumsbezogenen Umnutzungen (Gaststätten, Versammlungsstätten,
  Verkauf) praxisrelevant.
• Stellplatzbedarf nach neuer Nutzung — § 49 SächsBO. Bundes-Maß
  ergänzend — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 12 SächsBO.
  Bautechnische Nachweise — § 66 SächsBO.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 SächsBO. Bauvorlageberechtigung —
  § 65 SächsBO. Entwurfsverfasser — § 54 SächsBO.

NICHT IM SächsBO-Korpus (NICHT erfinden):
• Land-Denkmal-§§ — SächsDSchG mit LfD Sachsen / Stadt bzw. Landratsamt
  abklären.
• Schallschutz/TA-Lärm bei lärmrelevanter Nutzungsänderung — DIN 4109
  bzw. TA Lärm als Bundes- bzw. technische Normen, nicht in der SächsBO
  geregelt.`,
    // C5 batch — Schleswig-Holstein × T-04 authored 2026-05-28. LBO SH
    // corpus-verified. No dedicated change-of-use § in LBO SH; route via
    // § 63/64. 4-§ brandschutz spread (all corpus-tagged).
    sh: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Schleswig-Holstein × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in SCHLESWIG-HOLSTEIN: die §§ der LBO SH
ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht beim Landratsamt bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt (Kiel, Lübeck, Flensburg, Neumünster).
Quelle: baunormenlexikon.de (mirror-tier). Stand: LBO SH i.d.F. Gesetz
vom 13.12.2024.

HINWEIS: Schleswig-Holsteinischer systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Eine Nutzungsänderung ist in Schleswig-Holstein grundsätzlich
genehmigungspflichtig, sofern nicht ausdrücklich verfahrensfrei nach
§ 61 LBO SH. Die LBO SH hat KEINEN dedizierten Nutzungsänderungs-§ —
der Verfahrensweg richtet sich nach den allgemeinen Verfahrens-§§. Bei
Nicht-Sonderbau-Umnutzung ist regelmäßig das vereinfachte Verfahren
nach § 63 LBO SH einschlägig; sobald Sonderbau-Tatbestand vorliegt
(§ 51 LBO SH), gilt das reguläre Verfahren nach § 64 LBO SH.

VERFAHREN — LBO SH:
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBO SH.
• Baugenehmigungsverfahren (regulär) — § 64 LBO SH (bei Sonderbau-
  Tatbestand der neuen Nutzung, § 51 LBO SH).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO
  (besondere Wohngebiete).
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz nach neuer Nutzung — § 14 LBO SH. Baustoffe/Bauteile
  (Brandverhalten) — § 26 LBO SH. Brandwände — § 30 LBO SH. Erster und
  zweiter Rettungsweg — § 33 LBO SH.
• Stellplatzbedarf nach neuer Nutzung — § 49 LBO SH. Bundes-Maß
  ergänzend — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 12 LBO SH.
  Bautechnische Nachweise — § 66 LBO SH.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 LBO SH. Bauvorlageberechtigung —
  § 65 LBO SH. Entwurfsverfasser — § 54 LBO SH.

NICHT IM LBO-SH-Korpus (NICHT erfinden):
• Land-Denkmal-§§ — DSchG SH mit LfD SH / kreisfreier Stadt bzw.
  Landratsamt abklären.
• Schallschutz/TA-Lärm bei lärmrelevanter Nutzungsänderung — DIN 4109
  bzw. TA Lärm als Bundes- bzw. technische Normen, nicht in der LBO SH
  geregelt.`,
    // C6 batch — Rheinland-Pfalz × T-04 authored 2026-05-28. LBauO corpus-
    // verified. No dedicated change-of-use § in LBauO RP; route via § 66/
    // § 61+§ 70.
    rlp: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Rheinland-Pfalz × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in RHEINLAND-PFALZ: die §§ der LBauO
ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht bei der Kreisverwaltung bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt. Quelle: baunormenlexikon.de (mirror-tier).
Stand: LBauO RP i.d.F. Gesetz vom 19.11.2025.

HINWEIS: Rheinland-Pfälzischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Eine Nutzungsänderung ist in Rheinland-Pfalz grundsätzlich genehmigungs-
pflichtig, sofern nicht ausdrücklich verfahrensfrei nach § 62 LBauO. Die
LBauO RP hat KEINEN dedizierten Nutzungsänderungs-§ — der Verfahrensweg
richtet sich nach den allgemeinen Verfahrens-§§. Bei Nicht-Sonderbau-
Umnutzung ist regelmäßig das vereinfachte Verfahren nach § 66 LBauO
einschlägig; sobald Sonderbau-Tatbestand vorliegt (§ 50 LBauO), gilt das
reguläre Verfahren nach § 61 + § 70 LBauO.

VERFAHREN — LBauO:
• Vereinfachtes Genehmigungsverfahren — § 66 LBauO.
• Genehmigungsbedürftige Vorhaben — § 61 LBauO. Baugenehmigung —
  § 70 LBauO.

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO.
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz nach neuer Nutzung — § 15 LBauO. Brandwände — § 30 LBauO.
• Stellplatzbedarf nach neuer Nutzung — § 47 LBauO. Bundes-Maß ergänzend
  — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 13 LBauO.

ANTRAG:
• Bauantrag — § 63 LBauO. Bauvorlageberechtigung — § 64 LBauO.
  Entwurfsverfasser — § 56 LBauO.

NICHT IM LBauO-RP-Korpus (NICHT erfinden):
• Land-Denkmal-§§ — DSchG RLP mit Landesamt für Denkmalpflege /
  Kreisverwaltung bzw. kreisfreier Stadt abklären.
• Schallschutz/TA-Lärm bei lärmrelevanter Nutzungsänderung — DIN 4109
  bzw. TA Lärm als Bundes- bzw. technische Normen, nicht in der LBauO
  geregelt.`,
    // C7 batch — Mecklenburg-Vorpommern × T-04 authored 2026-05-28. LBauO
    // M-V corpus-verified. No dedicated change-of-use § in LBauO M-V.
    mv: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Mecklenburg-Vorpommern × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in MECKLENBURG-VORPOMMERN: die §§ der
LBauO M-V ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland
— Bauaufsicht beim Landkreis bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt (Rostock, Schwerin). Quelle:
baunormenlexikon.de (mirror-tier). Stand: LBauO M-V i.d.F. Gesetz vom
18.03.2025.

HINWEIS: Mecklenburg-Vorpommerscher systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Eine Nutzungsänderung ist in Mecklenburg-Vorpommern grundsätzlich
genehmigungspflichtig, sofern nicht ausdrücklich verfahrensfrei nach
§ 61 LBauO M-V. Die LBauO M-V hat KEINEN dedizierten
Nutzungsänderungs-§ — der Verfahrensweg richtet sich nach den
allgemeinen Verfahrens-§§. Bei Nicht-Sonderbau-Umnutzung ist regelmäßig
das vereinfachte Verfahren nach § 63 LBauO M-V einschlägig; sobald
Sonderbau-Tatbestand vorliegt (§ 51 LBauO M-V), gilt das reguläre
Verfahren nach § 64 LBauO M-V.

VERFAHREN — LBauO M-V:
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBauO M-V.
• Baugenehmigungsverfahren (regulär) — § 64 LBauO M-V (bei Sonderbau-
  Tatbestand der neuen Nutzung, § 51 LBauO M-V).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO
  (besondere Wohngebiete).
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz nach neuer Nutzung — § 14 LBauO M-V. Baustoffe/Bauteile
  (Brandverhalten) — § 26 LBauO M-V. Brandwände — § 30 LBauO M-V. Erster
  und zweiter Rettungsweg — § 33 LBauO M-V.
• Stellplatzbedarf nach neuer Nutzung — § 49 LBauO M-V. Bundes-Maß
  ergänzend — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 12 LBauO M-V.
  Bautechnische Nachweise — § 66 LBauO M-V.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 LBauO M-V. Bauvorlageberechtigung —
  § 65 LBauO M-V. Entwurfsverfasser — § 54 LBauO M-V.

NICHT IM LBauO-M-V-Korpus (NICHT erfinden):
• Land-Denkmal-§§ — DSchG M-V mit Landesamt für Kultur und Denkmalpflege
  / Landkreis bzw. kreisfreier Stadt abklären.
• Schallschutz/TA-Lärm bei lärmrelevanter Nutzungsänderung — DIN 4109
  bzw. TA Lärm als Bundes- bzw. technische Normen, nicht in der LBauO
  M-V geregelt.`,
    // C8 batch — Sachsen-Anhalt × T-04 authored 2026-05-28. BauO LSA
    // corpus-verified.
    'sachsen-anhalt': `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen-Anhalt × T-04 (Nutzungsänderung / Umnutzung)
══════════════════════════════════════════════════════════════════════════

Bei Nutzungsänderungs-Projekten in SACHSEN-ANHALT: die §§ der BauO LSA
ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht beim Landkreis bzw. bei der städtischen Bauaufsichtsbehörde
der kreisfreien Stadt (Magdeburg, Halle, Dessau-Roßlau). Quelle:
baunormenlexikon.de (mirror-tier). Stand: BauO LSA i.d.F. Gesetz vom
13.06.2024.

HINWEIS: Sachsen-Anhaltinischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Eine Nutzungsänderung ist in Sachsen-Anhalt grundsätzlich genehmigungs-
pflichtig, sofern nicht ausdrücklich verfahrensfrei nach § 60 BauO LSA.
Die BauO LSA hat KEINEN dedizierten Nutzungsänderungs-§ — der
Verfahrensweg richtet sich nach den allgemeinen Verfahrens-§§. Bei
Nicht-Sonderbau-Umnutzung ist regelmäßig das vereinfachte Verfahren nach
§ 62 BauO LSA einschlägig; sobald Sonderbau-Tatbestand vorliegt
(§ 50 BauO LSA), gilt das reguläre Verfahren nach § 63 BauO LSA.

VERFAHREN — BauO LSA:
• Vereinfachtes Baugenehmigungsverfahren — § 62 BauO LSA.
• Baugenehmigungsverfahren (regulär) — § 63 BauO LSA (bei Sonderbau-
  Tatbestand der neuen Nutzung, § 50 BauO LSA).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Zulässigkeit der neuen Nutzung — § 30 BauGB, § 31 BauGB, § 34 BauGB,
  § 35 BauGB.
• Baugebiete und Nutzungsarten — § 1 BauNVO bis § 9 BauNVO, § 4a BauNVO.
• Erhaltungssatzung — § 172 BauGB.

TECHNISCHE FOLGEN DER NEUEN NUTZUNG:
• Brandschutz allgemein und Brandverhalten Baustoffe nach neuer Nutzung
  — § 14 BauO LSA. Brandwände — § 29 BauO LSA. Erster und zweiter
  Rettungsweg — § 32 BauO LSA.
• Stellplatzbedarf nach neuer Nutzung — § 48 BauO LSA. Bundes-Maß
  ergänzend — § 12 BauNVO.
• Standsicherheit bei strukturellen Anpassungen — § 12 BauO LSA.
  Bautechnische Nachweise — § 65 BauO LSA.

ANTRAG:
• Bauantrag und Bauvorlagen — § 67 BauO LSA. Bauvorlageberechtigung —
  § 64 BauO LSA. Entwurfsverfasser — § 53 BauO LSA.

NICHT IM BauO-LSA-Korpus (NICHT erfinden):
• Land-Denkmal-§§ — DSchG LSA mit Landesamt für Denkmalpflege und
  Archäologie / Landkreis bzw. kreisfreier Stadt abklären.
• Schallschutz/TA-Lärm bei lärmrelevanter Nutzungsänderung — DIN 4109
  bzw. TA Lärm als Bundes- bzw. technische Normen, nicht in der BauO LSA
  geregelt.`,
  },
  // ── T-05 Abbruch ─────────────────────────────────────────────────
  'T-05': {
    // B2 batch 3 — BW × T-05 authored 2026-05-28. LBO BW §§ corpus-verified.
    // § 65 LBO BW INTENTIONALLY OMITTED — heading "Abbruchsanordnung und
    // Nutzungsuntersagung" is enforcement, not owner-initiated demolition
    // (same discipline as NI § 79).
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in BADEN-WÜRTTEMBERG: die §§ der LBO BW
ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und dejure.org (mirror-tier).

ROUTING:
Der Abbruch baulicher Anlagen ist in BW primär über § 50 LBO BW geregelt
(verfahrensfreie Vorhaben; Anhang 1 listet die Tatbestände). Innerhalb
der in Anhang 1 zu § 50 LBO BW genannten Tatbestände ist der Abbruch
verfahrensfrei; außerhalb dieser Tatbestände ist eine Genehmigung
erforderlich (vereinfachtes Verfahren nach § 52 LBO BW bzw. Baugenehmigung
nach § 58 LBO BW).

VERFAHREN — LBO BW:
• Verfahrensfreie Vorhaben (mit Anhang 1) — § 50 LBO BW.
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO BW.
• Baugenehmigung — § 58 LBO BW.

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — DSchG BW (separate Landesvorschrift; konkrete §-Verweise
  nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch nur mit
  denkmalrechtlicher Genehmigung; Landesamt für Denkmalpflege
  Baden-Württemberg (LAD) einbeziehen.

DOKUMENTE:
• Bauvorlageberechtigung — § 63 LBO BW. Entwurfsverfasser — § 43 LBO BW.
• Statik der Restanlage bei Teilabbruch — § 13 LBO BW.

NICHT IM LBO BW-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV, EU-Vorgaben; nicht in
  der LBO BW geregelt; geltende Bundes- bzw. EU-Regelung referenzieren.
• Land-Denkmal-§§ — wie oben mit LAD abklären.`,
    // B2 batch 4 — HE × T-05 authored 2026-05-28. HBO §§ corpus-verified.
    // § 63a HBO ("Abbruch, Beseitigung") cited as owner-side Anker; § 82
    // intentionally omitted (heading is enforcement: Nutzungsverbot,
    // Beseitigungsanordnung).
    hessen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hessen × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in HESSEN: die §§ der HBO ersetzen
sämtliche oben genannten Bayern-Verweise. Quelle: baunormenlexikon.de
(mirror-tier).

ROUTING:
Hessen hat einen dedizierten Abbruch-§ — § 63a HBO (Abbruch, Beseitigung).
Innerhalb der dort genannten Tatbestände sind kleinere Abbrüche
baugenehmigungsfrei bzw. anzeigepflichtig; allgemein-baugenehmigungsfreie
Vorhaben listet § 63 HBO auf. Größere oder kritische Abbrüche laufen
über das vereinfachte Verfahren nach § 65 HBO bzw. das Baugenehmigungs-
verfahren nach § 66 HBO.

VERFAHREN — HBO:
• Abbruch, Beseitigung — § 63a HBO.
• Baugenehmigungsfreie Bauvorhaben — § 63 HBO.
• Vereinfachtes Baugenehmigungsverfahren — § 65 HBO.
• Baugenehmigungsverfahren — § 66 HBO.

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — HDSchG (separate Landesvorschrift; konkrete §-Verweise
  nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch nur mit
  denkmalrechtlicher Genehmigung; Landesamt für Denkmalpflege Hessen
  (LfDH) einbeziehen.

DOKUMENTE:
• Bauvorlageberechtigung — § 67 HBO.
• Statik der Restanlage bei Teilabbruch — § 12 HBO.

NICHT IM HBO-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV, EU-Vorgaben; nicht in
  der HBO geregelt; geltende Bundes- bzw. EU-Regelung referenzieren.
• Land-Denkmal-§§ — wie oben mit LfDH abklären.`,
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
    // C1 batch — Berlin × T-05 authored 2026-05-28. § 80 INTENTIONALLY
    // OMITTED — heading "Beseitigung von Anlagen, Nutzungsuntersagung"
    // is enforcement (same discipline as NI § 79, BW § 65, HBO § 82).
    berlin: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Berlin × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in BERLIN: die §§ der BauO Bln ersetzen
sämtliche oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim
Bezirksamt. Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Berliner systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

ROUTING:
Die Beseitigung baulicher Anlagen ist in Berlin primär über § 61 BauO Bln
geregelt — er kombiniert die verfahrensfreien Bauvorhaben mit der
Beseitigung von Anlagen unterhalb der Schwellen.

VERFAHREN — BauO Bln:
• Verfahrensfreie Bauvorhaben und Beseitigung von Anlagen — § 61 BauO Bln.

Innerhalb der in § 61 BauO Bln genannten Tatbestände ist der Abbruch
verfahrensfrei (ggf. genügt eine Anzeige); außerhalb dieser Tatbestände
ist eine Beseitigungsgenehmigung erforderlich (in der Regel über das
vereinfachte Verfahren nach § 63 BauO Bln bzw. das reguläre Verfahren
nach § 64 BauO Bln).

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — DSchG Bln (separate Landesvorschrift; konkrete §-Verweise
  nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch nur mit
  denkmalrechtlicher Genehmigung; Landesdenkmalamt Berlin (LDA) plus
  Untere Denkmalschutzbehörde des Bezirksamts einbeziehen.

DOKUMENTE:
• Bauvorlageberechtigung — § 65 BauO Bln.
• Statik der Restanlage bei Teilabbruch — § 12 BauO Bln.

NICHT IM BauO-Bln-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV, EU-Vorgaben; nicht in
  der BauO geregelt; geltende Bundes- bzw. EU-Regelung referenzieren.
• Land-Denkmal-§§ — wie oben mit LDA / Bezirksamt abklären.`,
    // C2 batch — Hamburg × T-05 authored 2026-05-28. § 80 INTENTIONALLY
    // OMITTED — heading "Beseitigung von Anlagen, Nutzungsuntersagung,
    // Anpassung bestehender baulicher Anlagen" is enforcement (same
    // discipline as NI § 79 / BW § 65 / HBO § 82 / Berlin § 80).
    hamburg: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hamburg × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in HAMBURG: die §§ der HBauO ersetzen
sämtliche oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim
Bezirksamt. Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Hamburger systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

ROUTING:
Die Beseitigung baulicher Anlagen ist in Hamburg primär über § 61 HBauO
geregelt — er kombiniert die verfahrensfreien Bauvorhaben mit der
Beseitigung von Anlagen unterhalb der Schwellen.

VERFAHREN — HBauO:
• Verfahrensfreie Bauvorhaben und Beseitigung von Anlagen — § 61 HBauO.

Innerhalb der in § 61 HBauO genannten Tatbestände ist der Abbruch
verfahrensfrei (ggf. genügt eine Anzeige); außerhalb dieser Tatbestände
ist eine Beseitigungsgenehmigung erforderlich (in der Regel über das
vereinfachte Verfahren nach § 63 HBauO bzw. das reguläre Verfahren nach
§ 64 HBauO).

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — DSchG HH (separate Landesvorschrift; konkrete §-Verweise
  nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch nur mit
  denkmalrechtlicher Genehmigung; Denkmalschutzamt Hamburg einbeziehen.

DOKUMENTE:
• Bauvorlageberechtigung — § 65 HBauO. Entwurfsverfasser — § 54 HBauO.
• Statik der Restanlage bei Teilabbruch — § 12 HBauO.

NICHT IM HBauO-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV, EU-Vorgaben; nicht in
  der HBauO geregelt; geltende Bundes- bzw. EU-Regelung referenzieren.
• Land-Denkmal-§§ — wie oben mit Denkmalschutzamt Hamburg abklären.`,
    // C3 batch — Bremen × T-05 authored 2026-05-28. § 79 BremLBO
    // INTENTIONALLY OMITTED — heading "Beseitigung von Anlagen, Nutzungs-
    // untersagung" is enforcement (consistent with NI § 79 / Berlin § 80 /
    // Hamburg § 80 / BW § 65 / HBO § 82). § 61 BremLBO carries the
    // owner-side Beseitigungs-Anker (heading lists "Beseitigung von Anlagen"
    // explicitly within the verfahrensfrei catalogue).
    bremen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Bremen × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in BREMEN: die §§ der BremLBO ersetzen
sämtliche oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim
Bauordnungsamt der jeweiligen Stadtgemeinde (Bremen oder Bremerhaven).
Quelle: baunormenlexikon.de (mirror-tier). Stand: Neufassung vom 29.05.2024.

HINWEIS: Bremer systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

ROUTING:
Die Beseitigung baulicher Anlagen ist in Bremen primär über § 61 BremLBO
geregelt — die Überschrift nennt "Beseitigung von Anlagen" ausdrücklich
neben den verfahrensfreien Bauvorhaben.

VERFAHREN — BremLBO:
• Verfahrensfreie Bauvorhaben und Beseitigung von Anlagen — § 61 BremLBO.

Innerhalb der in § 61 BremLBO genannten Tatbestände ist der Abbruch
verfahrensfrei (ggf. genügt eine Anzeige); außerhalb dieser Tatbestände
ist eine Beseitigungsgenehmigung erforderlich (in der Regel über das
vereinfachte Verfahren nach § 63 BremLBO bzw. das reguläre Verfahren
nach § 64 BremLBO).

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — BremDSchG (separate Landesvorschrift; konkrete §-Verweise
  nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch nur mit
  denkmalrechtlicher Genehmigung; Landesamt für Denkmalpflege Bremen
  (LfD) plus zuständige untere Denkmalschutzbehörde der Stadtgemeinde
  einbeziehen.

DOKUMENTE:
• Bauvorlageberechtigung — § 65 BremLBO. Entwurfsverfasser — § 54 BremLBO.
• Statik der Restanlage bei Teilabbruch — § 12 BremLBO.

NICHT IM BremLBO-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV, EU-Vorgaben; nicht in der
  BremLBO geregelt; geltende Bundes- bzw. EU-Regelung referenzieren.
• Land-Denkmal-§§ — wie oben mit LfD / Stadtgemeinde abklären.`,
    // C4 batch — Sachsen × T-05 authored 2026-05-28. SächsBO corpus-verified.
    // § 80 SächsBO (Beseitigung/Nutzungsuntersagung) INTENTIONALLY OMITTED
    // (classic enforcement, same discipline as Berlin/Hamburg § 80).
    // § 79 SächsBO (Einstellung von Arbeiten) ALSO OMITTED (work-stoppage
    // order, also enforcement). § 61 SächsBO carries the owner-side
    // Beseitigungs-Anker (heading lists "Beseitigung von Anlagen" explicitly).
    sachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in SACHSEN: die §§ der SächsBO ersetzen
sämtliche oben genannten Bayern-Verweise. Flächenland — Bauaufsicht beim
Landratsamt bzw. bei der Bauaufsichtsbehörde der kreisfreien Stadt
(Leipzig, Dresden, Chemnitz). Quelle: baunormenlexikon.de (mirror-tier).
Stand: Gesetz vom 01.03.2024.

HINWEIS: Sächsischer systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

ROUTING:
Die Beseitigung baulicher Anlagen ist in Sachsen primär über § 61 SächsBO
geregelt — die Überschrift nennt "Beseitigung von Anlagen" ausdrücklich
neben den verfahrensfreien Bauvorhaben.

VERFAHREN — SächsBO:
• Verfahrensfreie Bauvorhaben und Beseitigung von Anlagen — § 61 SächsBO.

Innerhalb der in § 61 SächsBO genannten Tatbestände ist der Abbruch
verfahrensfrei (ggf. genügt eine Anzeige); außerhalb dieser Tatbestände
ist eine Beseitigungsgenehmigung erforderlich (in der Regel über das
vereinfachte Verfahren nach § 63 SächsBO bzw. das reguläre Verfahren
nach § 64 SächsBO).

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — SächsDSchG (separate Landesvorschrift; konkrete
  §-Verweise nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch
  nur mit denkmalrechtlicher Genehmigung; Landesamt für Denkmalpflege
  Sachsen (LfD Sachsen) plus zuständige untere Denkmalschutzbehörde
  (Stadt bzw. Landratsamt) einbeziehen.

DOKUMENTE:
• Bauvorlageberechtigung — § 65 SächsBO. Entwurfsverfasser —
  § 54 SächsBO.
• Statik der Restanlage bei Teilabbruch — § 12 SächsBO.

NICHT IM SächsBO-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV, EU-Vorgaben; nicht in
  der SächsBO geregelt; geltende Bundes- bzw. EU-Regelung referenzieren.
• Land-Denkmal-§§ — wie oben mit LfD Sachsen / Stadt bzw. Landratsamt
  abklären.`,
    // C5 batch — Schleswig-Holstein × T-05 authored 2026-05-28. LBO SH
    // corpus-verified. § 80 LBO SH (Beseitigung/Nutzungsuntersagung)
    // INTENTIONALLY OMITTED (classic enforcement, same heading as
    // Sachsen/Berlin/Hamburg § 80). § 79 (Einstellung von Arbeiten) also
    // omitted (work-stoppage = enforcement). § 61 LBO SH carries owner-side
    // Beseitigungs-Anker.
    sh: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Schleswig-Holstein × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in SCHLESWIG-HOLSTEIN: die §§ der
LBO SH ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht beim Landratsamt bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt (Kiel, Lübeck, Flensburg, Neumünster).
Quelle: baunormenlexikon.de (mirror-tier). Stand: LBO SH i.d.F. Gesetz
vom 13.12.2024.

HINWEIS: Schleswig-Holsteinischer systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Die Beseitigung baulicher Anlagen ist in Schleswig-Holstein primär über
§ 61 LBO SH geregelt — die Überschrift nennt "Beseitigung von Anlagen"
ausdrücklich neben den verfahrensfreien Bauvorhaben.

VERFAHREN — LBO SH:
• Verfahrensfreie Bauvorhaben und Beseitigung von Anlagen — § 61 LBO SH.

Innerhalb der in § 61 LBO SH genannten Tatbestände ist der Abbruch
verfahrensfrei (ggf. genügt eine Anzeige); außerhalb dieser Tatbestände
ist eine Beseitigungsgenehmigung erforderlich (in der Regel über das
vereinfachte Verfahren nach § 63 LBO SH bzw. das reguläre Verfahren
nach § 64 LBO SH).

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — DSchG SH (separate Landesvorschrift; konkrete
  §-Verweise nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch
  nur mit denkmalrechtlicher Genehmigung; Landesamt für Denkmalpflege
  Schleswig-Holstein (LfD SH) plus zuständige untere Denkmalschutz-
  behörde (kreisfreie Stadt bzw. Landratsamt) einbeziehen.

DOKUMENTE:
• Bauvorlageberechtigung — § 65 LBO SH. Entwurfsverfasser —
  § 54 LBO SH.
• Statik der Restanlage bei Teilabbruch — § 12 LBO SH.

NICHT IM LBO-SH-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV, EU-Vorgaben; nicht in
  der LBO SH geregelt; geltende Bundes- bzw. EU-Regelung referenzieren.
• Land-Denkmal-§§ — wie oben mit LfD SH / Kreis bzw. kreisfreier Stadt
  abklären.`,
    // C6 batch — Rheinland-Pfalz × T-05 authored 2026-05-28. LBauO corpus-
    // verified. §§ 80 (Baueinstellung), 81 (Beseitigungsanordnung), 82
    // (Abbruch verfallender Anlagen) INTENTIONALLY OMITTED (enforcement
    // triple — RLP has 3 enforcement-class §§ vs single § 80 in most states).
    rlp: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Rheinland-Pfalz × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in RHEINLAND-PFALZ: die §§ der LBauO
ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht bei der Kreisverwaltung bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt. Quelle: baunormenlexikon.de (mirror-tier).
Stand: LBauO RP i.d.F. Gesetz vom 19.11.2025.

HINWEIS: Rheinland-Pfälzischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Die Beseitigung baulicher Anlagen in Rheinland-Pfalz richtet sich nach
dem Katalog der genehmigungsfreien Vorhaben (§ 62 LBauO) bzw. nach den
allgemeinen Verfahrens-§§ (§ 66 / § 61 + § 70 LBauO), wenn die Schwelle
zur Genehmigungspflicht überschritten ist.

VERFAHREN — LBauO:
• Genehmigungsfreie Vorhaben (Katalog) — § 62 LBauO.

Innerhalb des in § 62 LBauO geregelten Tatbestandskatalogs ist der
Abbruch genehmigungsfrei (ggf. genügt eine Anzeige); außerhalb dieser
Tatbestände ist eine Beseitigungsgenehmigung erforderlich (in der Regel
über das vereinfachte Verfahren nach § 66 LBauO bzw. das reguläre
Verfahren nach § 61 + § 70 LBauO).

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — DSchG RLP (separate Landesvorschrift; konkrete
  §-Verweise nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch nur
  mit denkmalrechtlicher Genehmigung; Landesamt für Denkmalpflege
  Rheinland-Pfalz plus zuständige untere Denkmalschutzbehörde
  (Kreisverwaltung bzw. kreisfreie Stadt) einbeziehen.

DOKUMENTE:
• Bauvorlageberechtigung — § 64 LBauO. Entwurfsverfasser — § 56 LBauO.
  Bauantrag-Vorlagen — § 63 LBauO.
• Statik der Restanlage bei Teilabbruch — § 13 LBauO.

NICHT IM LBauO-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV, EU-Vorgaben; nicht in
  der LBauO geregelt; geltende Bundes- bzw. EU-Regelung referenzieren.
• Land-Denkmal-§§ — wie oben mit Landesamt / Kreisverwaltung abklären.`,
    // C7 batch — Mecklenburg-Vorpommern × T-05 authored 2026-05-28. LBauO
    // M-V corpus-verified. § 80 (Beseitigung/Nutzungsuntersagung)
    // INTENTIONALLY OMITTED (classic enforcement). § 79 (Einstellung von
    // Arbeiten), § 80a (Anpassungsverlangen — enforcement-adjacent), § 81
    // (Bauüberwachung) also omitted.
    mv: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Mecklenburg-Vorpommern × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in MECKLENBURG-VORPOMMERN: die §§ der
LBauO M-V ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland
— Bauaufsicht beim Landkreis bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt (Rostock, Schwerin). Quelle:
baunormenlexikon.de (mirror-tier). Stand: LBauO M-V i.d.F. Gesetz vom
18.03.2025.

HINWEIS: Mecklenburg-Vorpommerscher systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Die Beseitigung baulicher Anlagen ist in Mecklenburg-Vorpommern primär
über § 61 LBauO M-V geregelt — die Überschrift nennt "Beseitigung von
Anlagen" ausdrücklich neben den verfahrensfreien Bauvorhaben.

VERFAHREN — LBauO M-V:
• Verfahrensfreie Bauvorhaben und Beseitigung von Anlagen —
  § 61 LBauO M-V.

Innerhalb der in § 61 LBauO M-V genannten Tatbestände ist der Abbruch
verfahrensfrei (ggf. genügt eine Anzeige); außerhalb dieser Tatbestände
ist eine Beseitigungsgenehmigung erforderlich (in der Regel über das
vereinfachte Verfahren nach § 63 LBauO M-V bzw. das reguläre Verfahren
nach § 64 LBauO M-V).

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — DSchG M-V (separate Landesvorschrift; konkrete
  §-Verweise nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch nur
  mit denkmalrechtlicher Genehmigung; Landesamt für Kultur und
  Denkmalpflege Mecklenburg-Vorpommern plus zuständige untere
  Denkmalschutzbehörde (kreisfreie Stadt bzw. Landkreis) einbeziehen.

DOKUMENTE:
• Bauvorlageberechtigung — § 65 LBauO M-V. Entwurfsverfasser —
  § 54 LBauO M-V.
• Statik der Restanlage bei Teilabbruch — § 12 LBauO M-V.

NICHT IM LBauO-M-V-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV, EU-Vorgaben; nicht in
  der LBauO M-V geregelt; geltende Bundes- bzw. EU-Regelung
  referenzieren.
• Land-Denkmal-§§ — wie oben mit Landesamt / Landkreis bzw. kreisfreier
  Stadt abklären.`,
    // C8 batch — Sachsen-Anhalt × T-05 authored 2026-05-28. BauO LSA
    // corpus-verified. § 79 (Beseitigung/Nutzungsuntersagung)
    // INTENTIONALLY OMITTED (classic enforcement). § 78 (Einstellung
    // Arbeiten), § 80 (Bauüberwachung), § 85a (TBs) admin omits.
    'sachsen-anhalt': `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen-Anhalt × T-05 (Abbruch / Beseitigung)
══════════════════════════════════════════════════════════════════════════

Bei Abbruch-/Beseitigungsvorhaben in SACHSEN-ANHALT: die §§ der BauO LSA
ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht beim Landkreis bzw. bei der städtischen Bauaufsichtsbehörde
der kreisfreien Stadt (Magdeburg, Halle, Dessau-Roßlau). Quelle:
baunormenlexikon.de (mirror-tier). Stand: BauO LSA i.d.F. Gesetz vom
13.06.2024.

HINWEIS: Sachsen-Anhaltinischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Die Beseitigung baulicher Anlagen ist in Sachsen-Anhalt primär über
§ 60 BauO LSA geregelt — die Überschrift nennt "Beseitigung von Anlagen"
ausdrücklich neben den verfahrensfreien Bauvorhaben.

VERFAHREN — BauO LSA:
• Verfahrensfreie Bauvorhaben und Beseitigung von Anlagen —
  § 60 BauO LSA.

Innerhalb der in § 60 BauO LSA genannten Tatbestände ist der Abbruch
verfahrensfrei (ggf. genügt eine Anzeige); außerhalb dieser Tatbestände
ist eine Beseitigungsgenehmigung erforderlich (in der Regel über das
vereinfachte Verfahren nach § 62 BauO LSA bzw. das reguläre Verfahren
nach § 63 BauO LSA).

DENKMAL & ERHALTUNGSSATZUNG (OVERRIDE der Verfahrensfreiheit):
• Federal-Anker — § 172 BauGB: innerhalb eines Erhaltungssatzungs-
  Bereichs ist der Abbruch genehmigungspflichtig, auch wenn er sonst
  verfahrensfrei wäre.
• Land-Denkmal — DSchG LSA (separate Landesvorschrift; konkrete
  §-Verweise nicht im Korpus). Bei eingetragenem Baudenkmal: Abbruch nur
  mit denkmalrechtlicher Genehmigung; Landesamt für Denkmalpflege und
  Archäologie Sachsen-Anhalt plus zuständige untere Denkmalschutz-
  behörde (kreisfreie Stadt bzw. Landkreis) einbeziehen.

DOKUMENTE:
• Bauvorlageberechtigung — § 64 BauO LSA. Entwurfsverfasser —
  § 53 BauO LSA.
• Statik der Restanlage bei Teilabbruch — § 12 BauO LSA.

NICHT IM BauO-LSA-Korpus (NICHT erfinden):
• Schadstoff-/Entsorgungs-§§ — KrWG, GefStoffV, EU-Vorgaben; nicht in
  der BauO LSA geregelt; geltende Bundes- bzw. EU-Regelung referenzieren.
• Land-Denkmal-§§ — wie oben mit Landesamt / Landkreis bzw. kreisfreier
  Stadt abklären.`,
  },
  // ── T-06 Aufstockung ─────────────────────────────────────────────
  'T-06': {
    // B2 batch 3 — BW × T-06 authored 2026-05-28. LBO BW §§ corpus-verified.
    // § 27f LBO BW's heading explicitly names "Dachgeschossausbauten oder
    // Aufstockungen zu Wohnzwecken" — strong match for T-06.
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in BADEN-WÜRTTEMBERG: die §§ der
LBO ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und dejure.org (mirror-tier).

ROUTING:
Aufstockungen und DG-Ausbauten zu Wohnzwecken sind in BW substantiell
durch § 27f LBO BW geregelt (Nutzungsänderungen und bauliche Änderungen im
Bestand bei tragenden, aussteifenden und raumabschließenden Bauteilen
sowie Dachgeschossausbauten oder Aufstockungen zu Wohnzwecken). Bei
Eingriffen in Rettungswege gilt § 28d LBO BW. Verfahrensseitig regelmäßig
das vereinfachte Verfahren nach § 52 LBO BW.

VERFAHREN:
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO BW.

SUBSTANTIVE ANKER FÜR AUFSTOCKUNG / DG-AUSBAU:
• Tragende / aussteifende / raumabschließende Bauteile bei Umbau,
  DG-Ausbau oder Aufstockung zu Wohnzwecken — § 27f LBO BW.
• Eingriffe in Bauteile in Rettungswegen — § 28d LBO BW.

GEBÄUDEKLASSE & ABSTANDSFLÄCHEN (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 LBO BW. Höhen-/Stockwerksgrenzen entscheiden, ob die
  Aufstockung die GK anhebt. Ein GK-Sprung kann strengeren Brandschutz
  auslösen.
• Abstandsflächen — § 5 LBO BW. An der neuen, höheren Wand neu zu
  bemessen. Sonderfälle — § 6 LBO BW. Übernahme auf Nachbargrundstücke
  — § 7 LBO BW.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion und neuer Aufbauten —
  § 13 LBO BW.
• Brandschutz nach ggf. höherer GK — § 15 LBO BW, § 26 LBO BW, § 27c LBO BW.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Stellplätze für Kraftfahrzeuge und Fahrräder — § 37 LBO BW.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauvorlagen und Bauantrag — § 53 LBO BW.
• Bauvorlageberechtigung — § 63 LBO BW. Entwurfsverfasser — § 43 LBO BW.`,
    // B2 batch 4 — HE × T-06 authored 2026-05-28. HBO §§ corpus-verified.
    hessen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hessen × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in HESSEN: die §§ der HBO ersetzen
sämtliche oben genannten Bayern-Verweise. Quelle: baunormenlexikon.de
(mirror-tier).

ROUTING:
Aufstockung wird regelmäßig im vereinfachten Verfahren nach § 65 HBO
behandelt. Bei Aufstockung können sich Gebäudeklasse, Abstandsflächen
und Brandschutz ändern; die Standsicherheit der Bestandskonstruktion ist
gesondert nachzuweisen.

VERFAHREN:
• Vereinfachtes Baugenehmigungsverfahren — § 65 HBO.

GEBÄUDEKLASSE & ABSTANDSFLÄCHEN (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 HBO. Höhen-/Stockwerksgrenzen entscheiden, ob die
  Aufstockung die GK anhebt. Ein GK-Sprung kann strengeren Brandschutz
  auslösen.
• Abstandsflächen, Abstände — § 6 HBO. An der neuen, höheren Wand neu
  zu bemessen.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion und neuer Aufbauten —
  § 12 HBO. Bautechnische Nachweise — § 68 HBO.
• Brandschutz nach ggf. höherer GK — § 14 HBO.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Stellplätze, Garagen, Fahrradabstellplätze — § 52 HBO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauantrag und Bauvorlagen — § 69 HBO. Bauvorlageberechtigung —
  § 67 HBO.`,
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
    // C1 batch — Berlin × T-06 authored 2026-05-28. BauO Bln corpus-verified.
    berlin: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Berlin × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in BERLIN: die §§ der BauO Bln
ersetzen sämtliche oben genannten Bayern-Verweise. Stadtstaat —
Bauaufsicht beim Bezirksamt. Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Berliner systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

ROUTING:
Aufstockung wird regelmäßig im vereinfachten Verfahren nach § 63 BauO Bln
behandelt. Bei Aufstockung können sich Gebäudeklasse, Abstandsflächen
und Brandschutz ändern; die Standsicherheit der Bestandskonstruktion ist
gesondert nachzuweisen.

VERFAHREN:
• Vereinfachtes Baugenehmigungsverfahren — § 63 BauO Bln.

GEBÄUDEKLASSE & ABSTANDSFLÄCHEN (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 BauO Bln. Höhen-/Stockwerksgrenzen entscheiden, ob
  die Aufstockung die GK anhebt. Ein GK-Sprung kann strengeren Brandschutz
  auslösen.
• Abstandsflächen, Abstände — § 6 BauO Bln. An der neuen, höheren Wand
  neu zu bemessen.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion und neuer Aufbauten —
  § 12 BauO Bln. Bautechnische Nachweise — § 66 BauO Bln.
• Brandschutz nach ggf. höherer GK — § 14 BauO Bln. Baustoffe/Bauteile
  (Brandverhalten) — § 26 BauO Bln.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Stellplätze, Abstellplätze für Fahrräder — § 49 BauO Bln.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 BauO Bln. Bauvorlageberechtigung —
  § 65 BauO Bln.`,
    // C2 batch — Hamburg × T-06 authored 2026-05-28. HBauO corpus-verified.
    hamburg: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hamburg × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in HAMBURG: die §§ der HBauO
ersetzen sämtliche oben genannten Bayern-Verweise. Stadtstaat —
Bauaufsicht beim Bezirksamt. Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Hamburger systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

ROUTING:
Aufstockung wird regelmäßig im vereinfachten Verfahren nach § 63 HBauO
behandelt. Bei Aufstockung können sich Gebäudeklasse, Abstandsflächen
und Brandschutz ändern; die Standsicherheit der Bestandskonstruktion ist
gesondert nachzuweisen.

VERFAHREN:
• Vereinfachtes Baugenehmigungsverfahren — § 63 HBauO.

GEBÄUDEKLASSE & ABSTANDSFLÄCHEN (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 HBauO. Höhen-/Stockwerksgrenzen entscheiden, ob
  die Aufstockung die GK anhebt. Ein GK-Sprung kann strengeren Brandschutz
  auslösen.
• Abstandsflächen — § 6 HBauO. An der neuen, höheren Wand neu zu
  bemessen.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion und neuer Aufbauten —
  § 12 HBauO. Bautechnische Nachweise — § 66 HBauO.
• Brandschutz nach ggf. höherer GK — § 14 HBauO, § 26 HBauO, § 30 HBauO,
  § 33 HBauO.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Grundstücksbezogene Mobilität (Stellplätze, Fahrradabstellplätze) —
  § 49 HBauO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 HBauO. Bauvorlageberechtigung —
  § 65 HBauO. Entwurfsverfasser — § 54 HBauO.`,
    // C3 batch — Bremen × T-06 authored 2026-05-28. BremLBO corpus-verified.
    // No dedicated DG/Aufstockungs-§ in BremLBO (unlike BW § 27f); routing
    // via general procedure §§ 63/64.
    bremen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Bremen × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in BREMEN: die §§ der BremLBO
ersetzen sämtliche oben genannten Bayern-Verweise. Stadtstaat —
Bauaufsicht beim Bauordnungsamt der jeweiligen Stadtgemeinde (Bremen oder
Bremerhaven). Quelle: baunormenlexikon.de (mirror-tier). Stand: Neufassung
vom 29.05.2024.

HINWEIS: Bremer systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

ROUTING:
Aufstockung wird regelmäßig im vereinfachten Verfahren nach § 63 BremLBO
behandelt. Bei Aufstockung können sich Gebäudeklasse, Abstandsflächen
und Brandschutz ändern; die Standsicherheit der Bestandskonstruktion ist
gesondert nachzuweisen.

VERFAHREN:
• Vereinfachtes Baugenehmigungsverfahren — § 63 BremLBO.

GEBÄUDEKLASSE & ABSTANDSFLÄCHEN (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 BremLBO. Höhen-/Stockwerksgrenzen entscheiden, ob
  die Aufstockung die GK anhebt. Ein GK-Sprung kann strengeren Brandschutz
  auslösen.
• Abstandsflächen, Abstände — § 6 BremLBO. An der neuen, höheren Wand
  neu zu bemessen.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion und neuer Aufbauten —
  § 12 BremLBO. Bautechnische Nachweise — § 66 BremLBO.
• Brandschutz nach ggf. höherer GK — § 14 BremLBO. Baustoffe/Bauteile
  (Brandverhalten) — § 26 BremLBO. Brandwände — § 30 BremLBO. Erster und
  zweiter Rettungsweg — § 33 BremLBO.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Stellplätze, Garagen, Abstellplätze für Fahrräder — § 49 BremLBO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 BremLBO. Bauvorlageberechtigung —
  § 65 BremLBO. Entwurfsverfasser — § 54 BremLBO.`,
    // C4 batch — Sachsen × T-06 authored 2026-05-28. SächsBO corpus-verified.
    // No dedicated DG/Aufstockungs-§ in SächsBO (unlike BW § 27f); routing
    // via general procedure § 63. 4-§ brandschutz spread when GK changes.
    sachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in SACHSEN: die §§ der SächsBO
ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht beim Landratsamt bzw. bei der Bauaufsichtsbehörde der
kreisfreien Stadt (Leipzig, Dresden, Chemnitz). Quelle: baunormenlexikon.de
(mirror-tier). Stand: Gesetz vom 01.03.2024.

HINWEIS: Sächsischer systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

ROUTING:
Aufstockung wird regelmäßig im vereinfachten Verfahren nach § 63 SächsBO
behandelt. Bei Aufstockung können sich Gebäudeklasse, Abstandsflächen
und Brandschutz ändern; die Standsicherheit der Bestandskonstruktion ist
gesondert nachzuweisen.

VERFAHREN:
• Vereinfachtes Baugenehmigungsverfahren — § 63 SächsBO.

GEBÄUDEKLASSE & ABSTANDSFLÄCHEN (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 SächsBO. Höhen-/Stockwerksgrenzen entscheiden, ob
  die Aufstockung die GK anhebt. Ein GK-Sprung kann strengeren Brandschutz
  auslösen.
• Abstandsflächen, Abstände — § 6 SächsBO. An der neuen, höheren Wand
  neu zu bemessen.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion und neuer Aufbauten —
  § 12 SächsBO. Bautechnische Nachweise — § 66 SächsBO.
• Brandschutz nach ggf. höherer GK — § 14 SächsBO. Baustoffe/Bauteile
  (Brandverhalten) — § 26 SächsBO. Brandwände — § 30 SächsBO. Erster und
  zweiter Rettungsweg — § 33 SächsBO.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Stellplätze, Garagen, Abstellplätze für Fahrräder — § 49 SächsBO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 SächsBO. Bauvorlageberechtigung —
  § 65 SächsBO. Entwurfsverfasser — § 54 SächsBO.`,
    // C5 batch — Schleswig-Holstein × T-06 authored 2026-05-28. LBO SH
    // corpus-verified. No dedicated Aufstockungs-§ in LBO SH (no BW § 27f-
    // equivalent); routing via § 63. 4-§ brandschutz spread when GK changes.
    sh: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Schleswig-Holstein × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in SCHLESWIG-HOLSTEIN: die §§ der
LBO SH ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht beim Landratsamt bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt (Kiel, Lübeck, Flensburg, Neumünster).
Quelle: baunormenlexikon.de (mirror-tier). Stand: LBO SH i.d.F. Gesetz
vom 13.12.2024.

HINWEIS: Schleswig-Holsteinischer systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Aufstockung wird regelmäßig im vereinfachten Verfahren nach § 63 LBO SH
behandelt. Bei Aufstockung können sich Gebäudeklasse, Abstandsflächen
und Brandschutz ändern; die Standsicherheit der Bestandskonstruktion ist
gesondert nachzuweisen.

VERFAHREN:
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBO SH.

GEBÄUDEKLASSE & ABSTANDSFLÄCHEN (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 LBO SH. Höhen-/Stockwerksgrenzen entscheiden, ob
  die Aufstockung die GK anhebt. Ein GK-Sprung kann strengeren Brandschutz
  auslösen.
• Abstandsflächen, Abstände — § 6 LBO SH. An der neuen, höheren Wand
  neu zu bemessen.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion und neuer Aufbauten —
  § 12 LBO SH. Bautechnische Nachweise — § 66 LBO SH.
• Brandschutz nach ggf. höherer GK — § 14 LBO SH. Baustoffe/Bauteile
  (Brandverhalten) — § 26 LBO SH. Brandwände — § 30 LBO SH. Erster und
  zweiter Rettungsweg — § 33 LBO SH.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Stellplätze, Garagen, Abstellanlagen für Fahrräder — § 49 LBO SH.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 LBO SH. Bauvorlageberechtigung —
  § 65 LBO SH. Entwurfsverfasser — § 54 LBO SH.`,
    // C6 batch — Rheinland-Pfalz × T-06 authored 2026-05-28. LBauO corpus-
    // verified. No dedicated Aufstockungs-§; routing via § 66 vereinfacht.
    rlp: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Rheinland-Pfalz × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in RHEINLAND-PFALZ: die §§ der
LBauO ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht bei der Kreisverwaltung bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt. Quelle: baunormenlexikon.de (mirror-tier).
Stand: LBauO RP i.d.F. Gesetz vom 19.11.2025.

HINWEIS: Rheinland-Pfälzischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Aufstockung wird regelmäßig im vereinfachten Verfahren nach § 66 LBauO
behandelt. Bei Aufstockung können sich Gebäudeklasse, Abstandsflächen
und Brandschutz ändern; die Standsicherheit der Bestandskonstruktion ist
gesondert nachzuweisen.

VERFAHREN:
• Vereinfachtes Genehmigungsverfahren — § 66 LBauO.

GEBÄUDEKLASSE & ABSTANDSFLÄCHEN (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 LBauO. Höhen-/Stockwerksgrenzen entscheiden, ob
  die Aufstockung die GK anhebt.
• Abstandsflächen — § 8 LBauO. An der neuen, höheren Wand neu zu bemessen.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion und neuer Aufbauten —
  § 13 LBauO.
• Brandschutz nach ggf. höherer GK — § 15 LBauO. Brandwände — § 30 LBauO.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Stellplätze und Garagen — § 47 LBauO.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauantrag — § 63 LBauO. Bauvorlageberechtigung — § 64 LBauO.
  Entwurfsverfasser — § 56 LBauO.`,
    // C7 batch — Mecklenburg-Vorpommern × T-06 authored 2026-05-28. LBauO
    // M-V corpus-verified.
    mv: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Mecklenburg-Vorpommern × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in MECKLENBURG-VORPOMMERN: die §§
der LBauO M-V ersetzen sämtliche oben genannten Bayern-Verweise.
Flächenland — Bauaufsicht beim Landkreis bzw. bei der städtischen
Bauaufsichtsbehörde der kreisfreien Stadt (Rostock, Schwerin). Quelle:
baunormenlexikon.de (mirror-tier). Stand: LBauO M-V i.d.F. Gesetz vom
18.03.2025.

HINWEIS: Mecklenburg-Vorpommerscher systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Aufstockung wird regelmäßig im vereinfachten Verfahren nach
§ 63 LBauO M-V behandelt. Bei Aufstockung können sich Gebäudeklasse,
Abstandsflächen und Brandschutz ändern; die Standsicherheit der
Bestandskonstruktion ist gesondert nachzuweisen.

VERFAHREN:
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBauO M-V.

GEBÄUDEKLASSE & ABSTANDSFLÄCHEN (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 LBauO M-V. Höhen-/Stockwerksgrenzen entscheiden,
  ob die Aufstockung die GK anhebt. Ein GK-Sprung kann strengeren
  Brandschutz auslösen.
• Abstandsflächen, Abstände — § 6 LBauO M-V. An der neuen, höheren Wand
  neu zu bemessen.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion und neuer Aufbauten —
  § 12 LBauO M-V. Bautechnische Nachweise — § 66 LBauO M-V.
• Brandschutz nach ggf. höherer GK — § 14 LBauO M-V. Baustoffe/Bauteile
  (Brandverhalten) — § 26 LBauO M-V. Brandwände — § 30 LBauO M-V. Erster
  und zweiter Rettungsweg — § 33 LBauO M-V.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Stellplätze, Garagen, Abstellplätze für Fahrräder — § 49 LBauO M-V.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 LBauO M-V. Bauvorlageberechtigung —
  § 65 LBauO M-V. Entwurfsverfasser — § 54 LBauO M-V.`,
    // C8 batch — Sachsen-Anhalt × T-06 authored 2026-05-28. BauO LSA
    // corpus-verified.
    'sachsen-anhalt': `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen-Anhalt × T-06 (Aufstockung / Dachgeschossausbau)
══════════════════════════════════════════════════════════════════════════

Bei Aufstockungs-/DG-Ausbau-Projekten in SACHSEN-ANHALT: die §§ der
BauO LSA ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland
— Bauaufsicht beim Landkreis bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt (Magdeburg, Halle, Dessau-Roßlau). Quelle:
baunormenlexikon.de (mirror-tier). Stand: BauO LSA i.d.F. Gesetz vom
13.06.2024.

HINWEIS: Sachsen-Anhaltinischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Aufstockung wird regelmäßig im vereinfachten Verfahren nach
§ 62 BauO LSA behandelt. Bei Aufstockung können sich Gebäudeklasse,
Abstandsflächen und Brandschutz ändern; die Standsicherheit der
Bestandskonstruktion ist gesondert nachzuweisen.

VERFAHREN:
• Vereinfachtes Baugenehmigungsverfahren — § 62 BauO LSA.

GEBÄUDEKLASSE & ABSTANDSFLÄCHEN (kritisch bei Aufstockung):
• Gebäudeklasse — § 2 BauO LSA. Höhen-/Stockwerksgrenzen entscheiden,
  ob die Aufstockung die GK anhebt.
• Abstandsflächen, Abstände — § 6 BauO LSA. An der neuen, höheren Wand
  neu zu bemessen.

TECHNISCHE NACHWEISE (BESTANDSSTATIK):
• Standsicherheit der Bestandskonstruktion und neuer Aufbauten —
  § 12 BauO LSA. Bautechnische Nachweise — § 65 BauO LSA.
• Brandschutz allgemein und Brandverhalten Baustoffe — § 14 BauO LSA.
  Brandwände — § 29 BauO LSA. Erster und zweiter Rettungsweg —
  § 32 BauO LSA.

STELLPLÄTZE (bei neuen Wohneinheiten):
• Notwendige Stellplätze, Garagen, Abstellplätze für Fahrräder —
  § 48 BauO LSA.

ENERGIE (Bundesrecht):
• Bestandsänderung — § 48 GEG. Niedrigstenergie-Grundsatz allgemein —
  § 10 GEG.

BAUPLANUNGSRECHT (Bundesrecht):
• Zulässigkeit — § 30 BauGB, § 34 BauGB. Maß — § 19 BauNVO (GRZ),
  § 20 BauNVO (Vollgeschosse/GFZ), § 23 BauNVO (überbaubare Fläche).

ANTRAG:
• Bauantrag und Bauvorlagen — § 67 BauO LSA. Bauvorlageberechtigung —
  § 64 BauO LSA. Entwurfsverfasser — § 53 BauO LSA.`,
  },
  // ── T-07 Anbau ───────────────────────────────────────────────────
  'T-07': {
    // B2 batch 3 — BW × T-07 authored 2026-05-28. LBO BW §§ corpus-verified.
    // § 51 Kenntnisgabe cited as BW-specific institute for qualifying Anbau cases.
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in BADEN-WÜRTTEMBERG: die §§ der LBO BW
ersetzen sämtliche oben genannten Bayern-Verweise. Quelle:
baunormenlexikon.de und dejure.org (mirror-tier).

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach § 52 LBO BW
behandelt. Kleinere Anbau-Tatbestände können unter § 50 LBO BW
(verfahrensfreie Vorhaben) fallen. Bei qualifiziertem B-Plan kann das
Kenntnisgabeverfahren nach § 51 LBO BW in Betracht kommen — die genauen
Voraussetzungen ergeben sich aus § 51 LBO BW selbst.

VERFAHREN:
• Verfahrensfreie Vorhaben — § 50 LBO BW.
• Kenntnisgabeverfahren — § 51 LBO BW (BW-spezifisch).
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO BW (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Abstandsflächen an der neuen Wand — § 5 LBO BW. Sonderfälle —
  § 6 LBO BW. Übernahme auf Nachbargrundstücke — § 7 LBO BW.
• Standsicherheit — § 13 LBO BW.
• Brandschutz an der Anschluss-/Trennwand — § 15 LBO BW. Brandwände —
  § 27c LBO BW.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Stellplätze für Kraftfahrzeuge und Fahrräder — § 37 LBO BW.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauvorlagen und Bauantrag — § 53 LBO BW.
• Bauvorlageberechtigung — § 63 LBO BW. Entwurfsverfasser — § 43 LBO BW.`,
    // B2 batch 4 — HE × T-07 authored 2026-05-28. HBO §§ corpus-verified.
    // § 64a Erweiterte Genehmigungsfreistellung relevant when Anbau is Wohngebäude.
    hessen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hessen × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in HESSEN: die §§ der HBO ersetzen
sämtliche oben genannten Bayern-Verweise. Quelle: baunormenlexikon.de
(mirror-tier).

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach § 65 HBO
behandelt. Bei qualifiziertem B-Plan kann die Genehmigungsfreistellung
nach § 64 HBO in Betracht kommen — bei Wohngebäuden ggf. erweitert
nach § 64a HBO.

VERFAHREN:
• Genehmigungsfreistellung — § 64 HBO (bei qualifiziertem B-Plan).
• Erweiterte Genehmigungsfreistellung für Wohngebäude — § 64a HBO.
• Vereinfachtes Baugenehmigungsverfahren — § 65 HBO (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Abstandsflächen an der neuen Wand — § 6 HBO.
• Standsicherheit — § 12 HBO. Bautechnische Nachweise — § 68 HBO.
• Brandschutz an der Anschluss-/Trennwand — § 14 HBO.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Stellplätze, Garagen, Fahrradabstellplätze — § 52 HBO.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauantrag und Bauvorlagen — § 69 HBO. Bauvorlageberechtigung —
  § 67 HBO.`,
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
    // C1 batch — Berlin × T-07 authored 2026-05-28. BauO Bln corpus-verified.
    berlin: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Berlin × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in BERLIN: die §§ der BauO Bln ersetzen
sämtliche oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim
Bezirksamt. Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Berliner systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach § 63 BauO Bln
behandelt. Bei qualifiziertem B-Plan und Einhaltung aller Festsetzungen
kommt die Genehmigungsfreistellung nach § 62 BauO Bln in Betracht.

VERFAHREN:
• Genehmigungsfreistellung — § 62 BauO Bln (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 BauO Bln (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Abstandsflächen, Abstände an der neuen Wand — § 6 BauO Bln.
• Standsicherheit — § 12 BauO Bln. Bautechnische Nachweise —
  § 66 BauO Bln.
• Brandschutz an der Anschluss-/Trennwand — § 14 BauO Bln. Baustoffe/
  Bauteile (Brandverhalten) — § 26 BauO Bln.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Stellplätze, Abstellplätze für Fahrräder — § 49 BauO Bln.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 BauO Bln. Bauvorlageberechtigung —
  § 65 BauO Bln.`,
    // C2 batch — Hamburg × T-07 authored 2026-05-28. HBauO corpus-verified.
    hamburg: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hamburg × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in HAMBURG: die §§ der HBauO ersetzen
sämtliche oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim
Bezirksamt. Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Hamburger systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach § 63 HBauO
behandelt. Bei qualifiziertem B-Plan und Einhaltung aller Festsetzungen
kommt die Genehmigungsfreistellung nach § 62 HBauO in Betracht.

VERFAHREN:
• Genehmigungsfreistellung — § 62 HBauO (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 HBauO (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Abstandsflächen an der neuen Wand — § 6 HBauO.
• Standsicherheit — § 12 HBauO. Bautechnische Nachweise — § 66 HBauO.
• Brandschutz an der Anschluss-/Trennwand — § 14 HBauO. Brandwände —
  § 30 HBauO.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Grundstücksbezogene Mobilität (Stellplätze, Fahrradabstellplätze) —
  § 49 HBauO.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 HBauO. Bauvorlageberechtigung —
  § 65 HBauO. Entwurfsverfasser — § 54 HBauO.`,
    // C3 batch — Bremen × T-07 authored 2026-05-28. BremLBO corpus-verified.
    bremen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Bremen × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in BREMEN: die §§ der BremLBO ersetzen
sämtliche oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim
Bauordnungsamt der jeweiligen Stadtgemeinde (Bremen oder Bremerhaven).
Quelle: baunormenlexikon.de (mirror-tier). Stand: Neufassung vom 29.05.2024.

HINWEIS: Bremer systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach § 63 BremLBO
behandelt. Bei qualifiziertem B-Plan und Einhaltung aller Festsetzungen
kommt die Genehmigungsfreistellung nach § 62 BremLBO in Betracht.

VERFAHREN:
• Genehmigungsfreistellung — § 62 BremLBO (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 BremLBO (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Abstandsflächen, Abstände an der neuen Wand — § 6 BremLBO.
• Standsicherheit — § 12 BremLBO. Bautechnische Nachweise —
  § 66 BremLBO.
• Brandschutz an der Anschluss-/Trennwand — § 14 BremLBO. Brandwände —
  § 30 BremLBO.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Stellplätze, Garagen, Abstellplätze für Fahrräder — § 49 BremLBO.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 BremLBO. Bauvorlageberechtigung —
  § 65 BremLBO. Entwurfsverfasser — § 54 BremLBO.`,
    // C4 batch — Sachsen × T-07 authored 2026-05-28. SächsBO corpus-verified.
    // Anbau brandschutz spread limited to § 14 + § 30 (Anschluss-/Trennwand);
    // wider 4-§ spread reserved for MFH/Sanierung/Umnutzung/Aufstockung.
    sachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in SACHSEN: die §§ der SächsBO ersetzen
sämtliche oben genannten Bayern-Verweise. Flächenland — Bauaufsicht beim
Landratsamt bzw. bei der Bauaufsichtsbehörde der kreisfreien Stadt
(Leipzig, Dresden, Chemnitz). Quelle: baunormenlexikon.de (mirror-tier).
Stand: Gesetz vom 01.03.2024.

HINWEIS: Sächsischer systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach § 63 SächsBO
behandelt. Bei qualifiziertem B-Plan und Einhaltung aller Festsetzungen
kommt die Genehmigungsfreistellung nach § 62 SächsBO in Betracht.

VERFAHREN:
• Genehmigungsfreistellung — § 62 SächsBO (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 SächsBO (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Abstandsflächen, Abstände an der neuen Wand — § 6 SächsBO.
• Standsicherheit — § 12 SächsBO. Bautechnische Nachweise —
  § 66 SächsBO.
• Brandschutz an der Anschluss-/Trennwand — § 14 SächsBO. Brandwände —
  § 30 SächsBO.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Stellplätze, Garagen, Abstellplätze für Fahrräder — § 49 SächsBO.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 SächsBO. Bauvorlageberechtigung —
  § 65 SächsBO. Entwurfsverfasser — § 54 SächsBO.`,
    // C5 batch — Schleswig-Holstein × T-07 authored 2026-05-28. LBO SH
    // corpus-verified. Anbau brandschutz spread limited to § 14 + § 30
    // (Anschluss-/Trennwand); wider 4-§ spread reserved for MFH/Sanierung/
    // Umnutzung/Aufstockung — same shape as Sachsen.
    sh: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Schleswig-Holstein × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in SCHLESWIG-HOLSTEIN: die §§ der LBO SH
ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht beim Landratsamt bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt (Kiel, Lübeck, Flensburg, Neumünster).
Quelle: baunormenlexikon.de (mirror-tier). Stand: LBO SH i.d.F. Gesetz
vom 13.12.2024.

HINWEIS: Schleswig-Holsteinischer systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach § 63 LBO SH
behandelt. Bei qualifiziertem B-Plan und Einhaltung aller Festsetzungen
kommt die Genehmigungsfreistellung nach § 62 LBO SH in Betracht.

VERFAHREN:
• Genehmigungsfreistellung — § 62 LBO SH (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBO SH (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Abstandsflächen, Abstände an der neuen Wand — § 6 LBO SH.
• Standsicherheit — § 12 LBO SH. Bautechnische Nachweise —
  § 66 LBO SH.
• Brandschutz an der Anschluss-/Trennwand — § 14 LBO SH. Brandwände —
  § 30 LBO SH.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Stellplätze, Garagen, Abstellanlagen für Fahrräder — § 49 LBO SH.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 LBO SH. Bauvorlageberechtigung —
  § 65 LBO SH. Entwurfsverfasser — § 54 LBO SH.`,
    // C6 batch — Rheinland-Pfalz × T-07 authored 2026-05-28. LBauO corpus-
    // verified. 2-§ brandschutz at Anschluss/Brandwand only (§ 15 + § 30).
    rlp: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Rheinland-Pfalz × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in RHEINLAND-PFALZ: die §§ der LBauO
ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht bei der Kreisverwaltung bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt. Quelle: baunormenlexikon.de (mirror-tier).
Stand: LBauO RP i.d.F. Gesetz vom 19.11.2025.

HINWEIS: Rheinland-Pfälzischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach § 66 LBauO
behandelt. Bei qualifiziertem B-Plan und Einhaltung aller Festsetzungen
kommt das Freistellungsverfahren nach § 67 LBauO in Betracht.

VERFAHREN:
• Freistellungsverfahren — § 67 LBauO (bei qualifiziertem B-Plan).
• Vereinfachtes Genehmigungsverfahren — § 66 LBauO (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Abstandsflächen an der neuen Wand — § 8 LBauO.
• Standsicherheit — § 13 LBauO.
• Brandschutz an der Anschluss-/Trennwand — § 15 LBauO. Brandwände —
  § 30 LBauO.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Stellplätze und Garagen — § 47 LBauO.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauantrag — § 63 LBauO. Bauvorlageberechtigung — § 64 LBauO.
  Entwurfsverfasser — § 56 LBauO.`,
    // C7 batch — Mecklenburg-Vorpommern × T-07 authored 2026-05-28. LBauO
    // M-V corpus-verified.
    mv: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Mecklenburg-Vorpommern × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in MECKLENBURG-VORPOMMERN: die §§ der
LBauO M-V ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland
— Bauaufsicht beim Landkreis bzw. bei der städtischen Bauaufsichts-
behörde der kreisfreien Stadt (Rostock, Schwerin). Quelle:
baunormenlexikon.de (mirror-tier). Stand: LBauO M-V i.d.F. Gesetz vom
18.03.2025.

HINWEIS: Mecklenburg-Vorpommerscher systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach
§ 63 LBauO M-V behandelt. Bei qualifiziertem B-Plan und Einhaltung aller
Festsetzungen kommt die Genehmigungsfreistellung nach § 62 LBauO M-V in
Betracht.

VERFAHREN:
• Genehmigungsfreistellung — § 62 LBauO M-V (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBauO M-V (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Abstandsflächen, Abstände an der neuen Wand — § 6 LBauO M-V.
• Standsicherheit — § 12 LBauO M-V. Bautechnische Nachweise —
  § 66 LBauO M-V.
• Brandschutz an der Anschluss-/Trennwand — § 14 LBauO M-V. Brandwände —
  § 30 LBauO M-V.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Stellplätze, Garagen, Abstellplätze für Fahrräder — § 49 LBauO M-V.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauantrag und Bauvorlagen — § 68 LBauO M-V. Bauvorlageberechtigung —
  § 65 LBauO M-V. Entwurfsverfasser — § 54 LBauO M-V.`,
    // C8 batch — Sachsen-Anhalt × T-07 authored 2026-05-28. BauO LSA
    // corpus-verified.
    'sachsen-anhalt': `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen-Anhalt × T-07 (Anbau / Erweiterung)
══════════════════════════════════════════════════════════════════════════

Bei Anbau-/Erweiterungsvorhaben in SACHSEN-ANHALT: die §§ der BauO LSA
ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht beim Landkreis bzw. bei der städtischen Bauaufsichtsbehörde
der kreisfreien Stadt (Magdeburg, Halle, Dessau-Roßlau). Quelle:
baunormenlexikon.de (mirror-tier). Stand: BauO LSA i.d.F. Gesetz vom
13.06.2024.

HINWEIS: Sachsen-Anhaltinischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

ROUTING:
Ein Anbau wird regelmäßig im vereinfachten Verfahren nach § 62 BauO LSA
behandelt. Bei qualifiziertem B-Plan und Einhaltung aller Festsetzungen
kommt die Genehmigungsfreistellung nach § 61 BauO LSA in Betracht.

VERFAHREN:
• Genehmigungsfreistellung — § 61 BauO LSA (bei qualifiziertem B-Plan).
• Vereinfachtes Baugenehmigungsverfahren — § 62 BauO LSA (Regelfall).

GEBIETSVERTRÄGLICHKEIT (Bundesrecht):
• Einfügen im Innenbereich — § 34 BauGB. Außenbereich — § 35 BauGB.
• Maß der baulichen Nutzung — § 19 BauNVO (GRZ), § 23 BauNVO
  (überbaubare Grundstücksfläche).

TECHNISCHE ANFORDERUNGEN AM ANBAU:
• Abstandsflächen, Abstände an der neuen Wand — § 6 BauO LSA.
• Standsicherheit — § 12 BauO LSA. Bautechnische Nachweise —
  § 65 BauO LSA.
• Brandschutz an der Anschluss-/Trennwand — § 14 BauO LSA. Brandwände —
  § 29 BauO LSA.

STELLPLÄTZE (bei neuen Wohneinheiten / Nutzungen):
• Notwendige Stellplätze, Garagen, Abstellplätze für Fahrräder —
  § 48 BauO LSA.

ENERGIE (Bundesrecht):
• Neubau-Teil des Anbaus — § 10 GEG. Anschluss an Bestand — § 48 GEG.

ANTRAG:
• Bauantrag und Bauvorlagen — § 67 BauO LSA. Bauvorlageberechtigung —
  § 64 BauO LSA. Entwurfsverfasser — § 53 BauO LSA.`,
  },
  // ── T-08 Sonstiges ───────────────────────────────────────────────
  'T-08': {
    // B2 batch 3 — BW × T-08 authored 2026-05-28. LBO BW §§ corpus-verified.
    bw: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — BW × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in BADEN-WÜRTTEMBERG: die §§ der LBO BW ersetzen
sämtliche oben genannten Bayern-Verweise. Quelle: baunormenlexikon.de
und dejure.org (mirror-tier).

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen BW-§§ richten
sich nach dem konkreten Vorhaben. Die folgenden Verweise decken den
vollständigen Verfahrensraster ab:

VERFAHREN — LBO BW (vollständiger Raster, BW-spezifisch):
• Verfahrensfreie Vorhaben — § 50 LBO BW (Anhang 1 listet Tatbestände).
• Kenntnisgabeverfahren — § 51 LBO BW (BW-spezifisches Verfahren ohne
  Baugenehmigung).
• Vereinfachtes Baugenehmigungsverfahren — § 52 LBO BW.
• Baugenehmigung — § 58 LBO BW.

ANTRAG & VORLAGEN:
• Bauvorlagen und Bauantrag — § 53 LBO BW.
• Bauvorlageberechtigung — § 63 LBO BW. Entwurfsverfasser — § 43 LBO BW.
• Form und Inhalt der Bauvorlagen: separate LBOVVO BW (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen — § 5 LBO BW. Sonderfälle — § 6 LBO BW. Übernahme auf
  Nachbargrundstücke — § 7 LBO BW.
• Standsicherheit — § 13 LBO BW.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale. Die obigen BW-§§ sind die Mindest-
Verweise für Verfahren und Antrag.`,
    // B2 batch 4 — HE × T-08 authored 2026-05-28. HBO §§ corpus-verified.
    hessen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hessen × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in HESSEN: die §§ der HBO ersetzen sämtliche
oben genannten Bayern-Verweise. Quelle: baunormenlexikon.de (mirror-tier).

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen HBO-§§ richten
sich nach dem konkreten Vorhaben. Die folgenden Verweise decken den
vollständigen Verfahrensraster ab:

VERFAHREN — HBO (vollständiger Raster):
• Baugenehmigungsfreie Bauvorhaben — § 63 HBO.
• Genehmigungsfreistellung — § 64 HBO.
• Erweiterte Genehmigungsfreistellung für Wohngebäude — § 64a HBO.
• Vereinfachtes Baugenehmigungsverfahren — § 65 HBO.
• Baugenehmigungsverfahren — § 66 HBO.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 69 HBO.
• Bauvorlageberechtigung — § 67 HBO.
• Form und Inhalt der Bauvorlagen: separate BauVorlV Hessen (kein
  §-Verweis im Korpus — Verordnung als Quelle referenzieren).

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 HBO.
• Standsicherheit — § 12 HBO. Bautechnische Nachweise — § 68 HBO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale. Die obigen HBO-§§ sind die Mindest-
Verweise für Verfahren und Antrag.`,
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
    // C1 batch — Berlin × T-08 authored 2026-05-28. BauO Bln corpus-verified.
    berlin: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Berlin × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in BERLIN: die §§ der BauO Bln ersetzen sämtliche
oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim Bezirksamt.
Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Berliner systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen BauO-Bln-§§
richten sich nach dem konkreten Vorhaben. Die folgenden Verweise decken
den vollständigen Verfahrensraster ab:

VERFAHREN — BauO Bln (vollständiger Raster):
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 61 BauO Bln.
• Genehmigungsfreistellung — § 62 BauO Bln.
• Vereinfachtes Baugenehmigungsverfahren — § 63 BauO Bln.
• Baugenehmigungsverfahren (regulär) — § 64 BauO Bln.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 BauO Bln.
• Bauvorlageberechtigung — § 65 BauO Bln.
• Form und Inhalt der Bauvorlagen: separate BauVorlV Berlin (kein
  §-Verweis im Korpus — Verordnung als Quelle referenzieren).

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 BauO Bln.
• Standsicherheit — § 12 BauO Bln. Bautechnische Nachweise —
  § 66 BauO Bln.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale. Die obigen BauO-Bln-§§ sind die
Mindest-Verweise für Verfahren und Antrag.`,
    // C2 batch — Hamburg × T-08 authored 2026-05-28. HBauO corpus-verified.
    hamburg: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Hamburg × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in HAMBURG: die §§ der HBauO ersetzen sämtliche
oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim Bezirksamt.
Quelle: baunormenlexikon.de (mirror-tier).

HINWEIS: Hamburger systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen HBauO-§§
richten sich nach dem konkreten Vorhaben. Die folgenden Verweise decken
den vollständigen Verfahrensraster ab:

VERFAHREN — HBauO (vollständiger Raster):
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 61 HBauO.
• Genehmigungsfreistellung — § 62 HBauO.
• Vereinfachtes Baugenehmigungsverfahren — § 63 HBauO.
• Baugenehmigungsverfahren (regulär) — § 64 HBauO.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 HBauO.
• Bauvorlageberechtigung — § 65 HBauO. Entwurfsverfasser — § 54 HBauO.
• Form und Inhalt der Bauvorlagen: separate BauVorlVO HH (kein
  §-Verweis im Korpus — Verordnung als Quelle referenzieren).

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen — § 6 HBauO.
• Standsicherheit — § 12 HBauO. Bautechnische Nachweise — § 66 HBauO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale. Die obigen HBauO-§§ sind die
Mindest-Verweise für Verfahren und Antrag.`,
    // C3 batch — Bremen × T-08 authored 2026-05-28. BremLBO corpus-verified.
    bremen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Bremen × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in BREMEN: die §§ der BremLBO ersetzen sämtliche
oben genannten Bayern-Verweise. Stadtstaat — Bauaufsicht beim
Bauordnungsamt der jeweiligen Stadtgemeinde (Bremen oder Bremerhaven).
Quelle: baunormenlexikon.de (mirror-tier). Stand: Neufassung vom 29.05.2024.

HINWEIS: Bremer systemBlock weiterhin "preliminary"; die hier zitierten
§§ sind korpus-verifiziert.

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen BremLBO-§§
richten sich nach dem konkreten Vorhaben. Die folgenden Verweise decken
den vollständigen Verfahrensraster ab:

VERFAHREN — BremLBO (vollständiger Raster):
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 61 BremLBO.
• Genehmigungsfreistellung — § 62 BremLBO.
• Vereinfachtes Baugenehmigungsverfahren — § 63 BremLBO.
• Baugenehmigungsverfahren (regulär) — § 64 BremLBO.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 BremLBO.
• Bauvorlageberechtigung — § 65 BremLBO. Entwurfsverfasser — § 54 BremLBO.
• Form und Inhalt der Bauvorlagen: separate BauVorlV Bremen (kein
  §-Verweis im Korpus — Verordnung als Quelle referenzieren).

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 BremLBO.
• Standsicherheit — § 12 BremLBO. Bautechnische Nachweise —
  § 66 BremLBO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale. Die obigen BremLBO-§§ sind die
Mindest-Verweise für Verfahren und Antrag.`,
    // C4 batch — Sachsen × T-08 authored 2026-05-28. SächsBO corpus-verified.
    sachsen: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in SACHSEN: die §§ der SächsBO ersetzen sämtliche
oben genannten Bayern-Verweise. Flächenland — Bauaufsicht beim
Landratsamt bzw. bei der Bauaufsichtsbehörde der kreisfreien Stadt
(Leipzig, Dresden, Chemnitz). Quelle: baunormenlexikon.de (mirror-tier).
Stand: Gesetz vom 01.03.2024.

HINWEIS: Sächsischer systemBlock weiterhin "preliminary"; die hier
zitierten §§ sind korpus-verifiziert.

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen SächsBO-§§
richten sich nach dem konkreten Vorhaben. Die folgenden Verweise decken
den vollständigen Verfahrensraster ab:

VERFAHREN — SächsBO (vollständiger Raster):
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 61 SächsBO.
• Genehmigungsfreistellung — § 62 SächsBO.
• Vereinfachtes Baugenehmigungsverfahren — § 63 SächsBO.
• Baugenehmigungsverfahren (regulär) — § 64 SächsBO.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 SächsBO.
• Bauvorlageberechtigung — § 65 SächsBO. Entwurfsverfasser —
  § 54 SächsBO.
• Form und Inhalt der Bauvorlagen: separate DVOSächsBO bzw. SächsBauVorlVO
  (kein §-Verweis im Korpus — Verordnung als Quelle referenzieren).

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 SächsBO.
• Standsicherheit — § 12 SächsBO. Bautechnische Nachweise —
  § 66 SächsBO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale. Die obigen SächsBO-§§ sind die
Mindest-Verweise für Verfahren und Antrag.`,
    // C5 batch — Schleswig-Holstein × T-08 authored 2026-05-28. LBO SH
    // corpus-verified.
    sh: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Schleswig-Holstein × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in SCHLESWIG-HOLSTEIN: die §§ der LBO SH ersetzen
sämtliche oben genannten Bayern-Verweise. Flächenland — Bauaufsicht beim
Landratsamt bzw. bei der städtischen Bauaufsichtsbehörde der kreisfreien
Stadt (Kiel, Lübeck, Flensburg, Neumünster). Quelle: baunormenlexikon.de
(mirror-tier). Stand: LBO SH i.d.F. Gesetz vom 13.12.2024.

HINWEIS: Schleswig-Holsteinischer systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen LBO-SH-§§
richten sich nach dem konkreten Vorhaben. Die folgenden Verweise decken
den vollständigen Verfahrensraster ab:

VERFAHREN — LBO SH (vollständiger Raster):
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 61 LBO SH.
• Genehmigungsfreistellung — § 62 LBO SH.
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBO SH.
• Baugenehmigungsverfahren (regulär) — § 64 LBO SH.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 LBO SH.
• Bauvorlageberechtigung — § 65 LBO SH. Entwurfsverfasser —
  § 54 LBO SH.
• Form und Inhalt der Bauvorlagen: separate BauVorlVO SH (kein §-Verweis
  im Korpus — Verordnung als Quelle referenzieren).

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 LBO SH.
• Standsicherheit — § 12 LBO SH. Bautechnische Nachweise —
  § 66 LBO SH.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale. Die obigen LBO-SH-§§ sind die
Mindest-Verweise für Verfahren und Antrag.`,
    // C6 batch — Rheinland-Pfalz × T-08 authored 2026-05-28. LBauO corpus-
    // verified.
    rlp: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Rheinland-Pfalz × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in RHEINLAND-PFALZ: die §§ der LBauO ersetzen
sämtliche oben genannten Bayern-Verweise. Flächenland — Bauaufsicht bei
der Kreisverwaltung bzw. bei der städtischen Bauaufsichtsbehörde der
kreisfreien Stadt. Quelle: baunormenlexikon.de (mirror-tier). Stand:
LBauO RP i.d.F. Gesetz vom 19.11.2025.

HINWEIS: Rheinland-Pfälzischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen LBauO-§§
richten sich nach dem konkreten Vorhaben. Die folgenden Verweise decken
den vollständigen Verfahrensraster ab:

VERFAHREN — LBauO (RP-spezifischer vollständiger Raster):
• Genehmigungsfreie Vorhaben — § 62 LBauO.
• Freistellungsverfahren — § 67 LBauO.
• Vereinfachtes Genehmigungsverfahren — § 66 LBauO.
• Genehmigungsbedürftige Vorhaben — § 61 LBauO. Baugenehmigung —
  § 70 LBauO (regulär).

ANTRAG & VORLAGEN:
• Bauantrag — § 63 LBauO.
• Bauvorlageberechtigung — § 64 LBauO. Entwurfsverfasser — § 56 LBauO.

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen — § 8 LBauO.
• Standsicherheit — § 13 LBauO.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale.`,
    // C7 batch — Mecklenburg-Vorpommern × T-08 authored 2026-05-28. LBauO
    // M-V corpus-verified.
    mv: `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Mecklenburg-Vorpommern × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in MECKLENBURG-VORPOMMERN: die §§ der LBauO M-V
ersetzen sämtliche oben genannten Bayern-Verweise. Flächenland —
Bauaufsicht beim Landkreis bzw. bei der städtischen Bauaufsichtsbehörde
der kreisfreien Stadt (Rostock, Schwerin). Quelle: baunormenlexikon.de
(mirror-tier). Stand: LBauO M-V i.d.F. Gesetz vom 18.03.2025.

HINWEIS: Mecklenburg-Vorpommerscher systemBlock weiterhin "preliminary";
die hier zitierten §§ sind korpus-verifiziert.

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen LBauO-M-V-§§
richten sich nach dem konkreten Vorhaben. Die folgenden Verweise decken
den vollständigen Verfahrensraster ab:

VERFAHREN — LBauO M-V (vollständiger Raster):
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 61 LBauO M-V.
• Genehmigungsfreistellung — § 62 LBauO M-V.
• Vereinfachtes Baugenehmigungsverfahren — § 63 LBauO M-V.
• Baugenehmigungsverfahren (regulär) — § 64 LBauO M-V.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 68 LBauO M-V.
• Bauvorlageberechtigung — § 65 LBauO M-V. Entwurfsverfasser —
  § 54 LBauO M-V.
• Form und Inhalt der Bauvorlagen: separate BauVorlVO M-V (kein
  §-Verweis im Korpus — Verordnung als Quelle referenzieren).

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 LBauO M-V.
• Standsicherheit — § 12 LBauO M-V. Bautechnische Nachweise —
  § 66 LBauO M-V.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale.`,
    // C8 batch — Sachsen-Anhalt × T-08 authored 2026-05-28. BauO LSA
    // corpus-verified.
    'sachsen-anhalt': `══════════════════════════════════════════════════════════════════════════
LANDESSPEZIFISCHER ZUSATZ — Sachsen-Anhalt × T-08 (Sonstiges Vorhaben)
══════════════════════════════════════════════════════════════════════════

Bei sonstigen Vorhaben in SACHSEN-ANHALT: die §§ der BauO LSA ersetzen
sämtliche oben genannten Bayern-Verweise. Flächenland — Bauaufsicht beim
Landkreis bzw. bei der städtischen Bauaufsichtsbehörde der kreisfreien
Stadt (Magdeburg, Halle, Dessau-Roßlau). Quelle: baunormenlexikon.de
(mirror-tier). Stand: BauO LSA i.d.F. Gesetz vom 13.06.2024.

HINWEIS: Sachsen-Anhaltinischer systemBlock weiterhin "preliminary"; die
hier zitierten §§ sind korpus-verifiziert.

T-08 ist keine feste Vorhabens-Klasse — die einschlägigen BauO-LSA-§§
richten sich nach dem konkreten Vorhaben. Die folgenden Verweise decken
den vollständigen Verfahrensraster ab:

VERFAHREN — BauO LSA (versetzte Nummerierung, vollständiger Raster):
• Verfahrensfreie Bauvorhaben (inkl. Beseitigung) — § 60 BauO LSA.
• Genehmigungsfreistellung — § 61 BauO LSA.
• Vereinfachtes Baugenehmigungsverfahren — § 62 BauO LSA.
• Baugenehmigungsverfahren (regulär) — § 63 BauO LSA.

ANTRAG & VORLAGEN:
• Bauantrag und Bauvorlagen — § 67 BauO LSA.
• Bauvorlageberechtigung — § 64 BauO LSA. Entwurfsverfasser —
  § 53 BauO LSA.

ALLGEMEINE TECHNISCHE ANFORDERUNGEN:
• Abstandsflächen, Abstände — § 6 BauO LSA.
• Standsicherheit — § 12 BauO LSA. Bautechnische Nachweise —
  § 65 BauO LSA.

BUNDESRECHT (gilt universal):
• Zulässigkeit — § 30 BauGB, § 31 BauGB, § 34 BauGB, § 35 BauGB.

HINWEIS:
T-08 sollte zuerst an einen passenderen Template-Archetyp (T-01 EFH bis
T-07 Anbau) zugeordnet werden; nur wenn keine Zuordnung möglich ist,
greift T-08 als Default-Schale.`,
  },
}
