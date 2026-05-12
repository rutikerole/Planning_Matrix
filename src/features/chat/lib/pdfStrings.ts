// ───────────────────────────────────────────────────────────────────────
// v1.0.13 — PDF locale string table.
//
// Centralized DE / EN strings for the PDF Renaissance. v1.0.13 covers
// cover + TOC + footer + template-intent labels (the in-scope pages
// for this sprint). v1.0.14+ extends with executive / areas / costs /
// timeline / procedures / team / recommendations / key-data /
// verification / glossary string sets.
//
// LOCALE-STRICT RESOLVER. Unlike i18next, this resolver does NOT
// silently fall back from DE → EN on missing keys. If a key is
// requested for a locale where it isn't defined, the resolver throws
// (or returns a visible sentinel marker) so missing translations
// surface at the smoke-test layer instead of silently shipping
// English strings to German clients.
//
// GERMAN § CITATION RULE. § citations are LEGAL-SYSTEM IDENTIFIERS,
// not translatable prose. "§ 30 BauGB" reads identically in DE and
// EN PDFs. Only descriptive labels around the citations translate.
// This mirrors the v1.0.6 anti-Bayern-leak helper's pattern.
// ───────────────────────────────────────────────────────────────────────

export type PdfLang = 'en' | 'de'

export type PdfStrings = Record<string, string>

const EN: PdfStrings = {
  // ─── Cover page ────────────────────────────────────────────────
  'cover.wordmark': 'PLANNING MATRIX',
  'cover.tagline': 'Pre-planning brief · B2B',
  'cover.docnoLabel': 'DOC NO',
  'cover.revisionLabel': 'REVISION',
  'cover.revisionValue': 'v1 preliminary',
  'cover.kicker': 'PROJECT BRIEF · BAUVORHABEN',
  'cover.bundeslandLabel': 'BUNDESLAND',
  'cover.templateLabel': 'TEMPLATE',
  'cover.createdLabel': 'CREATED',
  'cover.bauherrLabel': 'BAUHERR',
  'cover.preliminary': 'PRELIMINARY — pending architect confirmation',
  'cover.validity.template': 'VALID FOR 30 DAYS · expires {date}',
  'cover.confidenceLabel': 'CONFIDENCE',
  'cover.qrLabel': 'SCAN TO OPEN PROJECT',

  // ─── Template intent labels ────────────────────────────────────
  'template.T-01': 'T-01 · New build (EFH)',
  'template.T-02': 'T-02 · New build (MFH)',
  'template.T-03': 'T-03 · Renovation',
  'template.T-04': 'T-04 · Use conversion',
  'template.T-05': 'T-05 · Demolition',
  'template.T-06': 'T-06 · Storey addition',
  'template.T-07': 'T-07 · Extension',
  'template.T-08': 'T-08 · Other',

  // ─── Table of contents ─────────────────────────────────────────
  'toc.kicker': 'CONTENTS · INHALT',
  'toc.title': 'Table of contents',
  'toc.entry.1': 'Executive summary · top 3 next steps',
  'toc.entry.2': 'Legal areas A·B·C status',
  'toc.entry.3': 'Costs · estimated range',
  'toc.entry.4': 'Timeline · Gantt overview',
  'toc.entry.5': 'Procedures · permit path',
  'toc.entry.6': 'Documents',
  'toc.entry.7': 'Team & stakeholders',
  'toc.entry.8': 'Recommendations · prioritised',
  'toc.entry.9': 'Key project data · qualifier table',
  'toc.entry.10': 'Verification status & signature',
  'toc.entry.11': 'Glossary · German legal terms',

  // ─── Footer (every page) ───────────────────────────────────────
  'footer.preliminary': 'PRELIMINARY — pending architect confirmation',
  'footer.generatedAt': 'Generated',

  // ─── v1.0.15 Renaissance Part 2A — Executive ───────────────────
  'exec.kicker': 'SECTION 01 · EXECUTIVE',
  'exec.title': 'Top 3 next steps',
  'exec.footer':
    'Recommendations derived from § 30 BauGB · § 62/64 BauO {state} · § 48 GEG · pending architect verification.',
  'exec.empty': 'No recommendations recorded yet.',
  'prio.high': 'HIGH PRIORITY',
  'prio.beforeAward': 'BEFORE AWARD',
  'prio.confirm': 'CONFIRM',

  // ─── v1.0.15 Renaissance Part 2A — Areas ──────────────────────
  'areas.kicker': 'SECTION 02 · LEGAL AREAS',
  'areas.title': 'A · B · C status',
  'areas.legend.active': 'active',
  'areas.legend.pending': 'pending',
  'areas.legend.void': 'void',
  'areas.status.active': 'ACTIVE',
  'areas.status.pending': 'PENDING',
  'areas.status.void': 'VOID',
  'areas.a.title': 'Planning law · Planungsrecht',
  'areas.b.title': 'Building law · Bauordnungsrecht',
  'areas.c.title': 'Other requirements · Sonstige Vorgaben',
  'areas.empty': 'No content recorded yet — continue the consultation.',

  // ─── v1.0.16 Renaissance Part 2B — Costs ──────────────────────
  'costs.kicker': 'SECTION 03 · COSTS',
  'costs.title': 'Estimated cost range',
  'costs.basisTemplate':
    'Computed from {n} m² façade · HOAI Zone III · {state} regional BKI factor',
  'costs.th.item': 'ITEM',
  'costs.th.basis': 'BASIS',
  'costs.th.range': 'EUR RANGE',
  'costs.total': 'Total (estimated)',
  'costs.notes.h': 'NOTES',
  'costs.notes.b':
    'Orientation values · not binding quotes. Ranges reflect HOAI minima/maxima and typical regional market rates. Final figures depend on the architect-specific fee agreement and the selected Leistungsphasen.',
  'costs.items.architect': 'Architect (LP 1–4)',
  'costs.items.architect.basis': 'HOAI Zone III · phases 1–4',
  'costs.items.structural': 'Structural engineering',
  'costs.items.structural.basis': '§ 68 BauO {state} certification',
  'costs.items.surveying': 'Surveying (ÖbVI)',
  'costs.items.surveying.basis': 'Official site plan',
  'costs.items.energy': 'Energy consultation',
  'costs.items.energy.basis': 'GEG 2024 thermal certificate',
  'costs.items.authority': 'Authority fees',
  'costs.items.authority.basis': 'Bauamt + neighbour involvement',
  'costs.empty': 'No cost rows recorded yet.',

  // ─── v1.0.16 Renaissance Part 2B — Timeline ───────────────────
  'timeline.kicker': 'SECTION 04 · TIMELINE',
  'timeline.title': 'Estimated timeline',
  'timeline.sub':
    'Total duration ~ 4–6 months · subject to authority workload',
  'timeline.weekLabel': 'WEEK',
  'timeline.phase.prep': 'Preparation · LP 1–4',
  'timeline.phase.prep.duration': '8–14 weeks',
  'timeline.phase.submit': 'Submission',
  'timeline.phase.submit.duration': '1 week',
  'timeline.phase.review': 'Review · Bauamt',
  'timeline.phase.review.duration': '6–10 weeks',
  'timeline.phase.fixes': 'Corrections',
  'timeline.phase.fixes.duration': '2 weeks',
  'timeline.milestone': 'Approval milestone',
  'timeline.milestone.detail':
    '— Baugenehmigung issued at end of week ≈ 22',

  // ─── v1.0.17 Renaissance Part 3 — Recommendations ─────────────
  'recs.kicker': 'SECTION 08 · RECOMMENDATIONS',
  'recs.title': 'Recommendations · prioritised',
  'recs.empty': 'No recommendations recorded yet.',

  // ─── v1.0.17 — Key Data ───────────────────────────────────────
  'data.kicker': 'SECTION 09 · KEY DATA',
  'data.title': 'Project data · qualifier table',
  'data.th.field': 'FIELD',
  'data.th.value': 'VALUE',
  'data.th.qualifier': 'QUALIFIER',
  'data.empty': 'No facts recorded yet.',

  // ─── v1.0.17 — Verification ───────────────────────────────────
  'verif.kicker': 'SECTION 10 · VERIFICATION',
  'verif.title': 'Verification status & signature',
  'verif.sub':
    'This brief is preliminary. Final figures require architect (Bauvorlageberechtigte/r) confirmation against the authoritative § citations.',
  'verif.status.h': 'VERIFICATION STATUS',
  'verif.status.body':
    'Pending architect confirmation. All values derived from persona model computation against state.',
  'verif.dq.h': 'DATA QUALITY',
  'verif.dq.legend.verified': 'verified',
  'verif.dq.legend.calculated': 'calculated',
  'verif.dq.legend.assumed': 'assumed',
  'sig.architect': 'Architect (Bauvorlageberechtigte/r)',
  'sig.chamber': 'Chamber stamp · registration no.',
  'sig.date': 'Date',

  // ─── v1.0.17 — Procedures + Documents ─────────────────────────
  'proc.kicker': 'SECTION 05 · PROCEDURES',
  'proc.title': 'Permit path',
  'proc.empty': 'No procedure identified yet.',
  'proc.status.required': 'REQUIRED',
  'proc.status.optional': 'OPTIONAL',
  'proc.status.exempt': 'EXEMPT',
  'docs.kicker': 'SECTION 06 · DOCUMENTS',
  'docs.title': 'Submission documents',
  'docs.empty': 'No documents recorded yet — continue the consultation.',

  // ─── v1.0.17 — Team & Stakeholders ────────────────────────────
  'team.kicker': 'SECTION 07 · TEAM & STAKEHOLDERS',
  'team.title': 'Team & stakeholders',
  'team.specialists.h': 'SPECIALISTS',
  'team.specialists.empty': 'No specialists identified yet.',
  'team.stakeholders.h': 'STAKEHOLDERS',
  'team.role.owner': 'Owner (Bauherr:in)',
  'team.role.owner.body':
    'Commissions the project, carries the costs, makes decisions.',
  'team.role.architect': 'Architect',
  'team.role.architect.body':
    'Submission-authorized. Files the Bauantrag on the owner’s behalf.',
  'team.role.engineers': 'Engineers',
  'team.role.engineers.body':
    'Structural · energy · fire-protection · surveying specialists.',
  'team.role.authority': 'Building authority',
  'team.role.authority.body':
    'Municipal Bauamt. Reviews submission and decides.',

  // ─── v1.0.17 — Glossary ───────────────────────────────────────
  'glossary.kicker': 'SECTION 11 · GLOSSARY',
  'glossary.title': 'German legal terms',
}

const DE: PdfStrings = {
  // ─── Cover ─────────────────────────────────────────────────────
  'cover.wordmark': 'PLANNING MATRIX',
  'cover.tagline': 'Vorplanungsbriefing · B2B',
  'cover.docnoLabel': 'DOK-NR',
  'cover.revisionLabel': 'REVISION',
  'cover.revisionValue': 'v1 vorläufig',
  'cover.kicker': 'BAUVORHABEN · PROJEKTBRIEFING',
  'cover.bundeslandLabel': 'BUNDESLAND',
  'cover.templateLabel': 'VORLAGE',
  'cover.createdLabel': 'ERSTELLT',
  'cover.bauherrLabel': 'BAUHERR',
  'cover.preliminary': 'VORLÄUFIG — Architekt:in-Bestätigung ausstehend',
  'cover.validity.template': 'GÜLTIG 30 TAGE · läuft ab {date}',
  'cover.confidenceLabel': 'VERTRAUEN',
  'cover.qrLabel': 'PROJEKT ÖFFNEN',

  // ─── Template intent labels ────────────────────────────────────
  'template.T-01': 'T-01 · Neubau (EFH)',
  'template.T-02': 'T-02 · Neubau (MFH)',
  'template.T-03': 'T-03 · Sanierung',
  'template.T-04': 'T-04 · Umnutzung',
  'template.T-05': 'T-05 · Abbruch',
  'template.T-06': 'T-06 · Aufstockung',
  'template.T-07': 'T-07 · Anbau',
  'template.T-08': 'T-08 · Sonstiges',

  // ─── Table of contents ─────────────────────────────────────────
  'toc.kicker': 'INHALT · CONTENTS',
  'toc.title': 'Inhaltsverzeichnis',
  'toc.entry.1': 'Zusammenfassung · die 3 nächsten Schritte',
  'toc.entry.2': 'Rechtsbereiche A·B·C Status',
  'toc.entry.3': 'Kosten · geschätzte Spanne',
  'toc.entry.4': 'Zeitplan · Gantt-Übersicht',
  'toc.entry.5': 'Verfahren · Genehmigungspfad',
  'toc.entry.6': 'Dokumente',
  'toc.entry.7': 'Team & Beteiligte',
  'toc.entry.8': 'Empfehlungen · priorisiert',
  'toc.entry.9': 'Projektdaten · Qualifikatorentabelle',
  'toc.entry.10': 'Verifizierungsstatus & Unterschrift',
  'toc.entry.11': 'Glossar · deutsche Rechtsbegriffe',

  // ─── Footer ────────────────────────────────────────────────────
  'footer.preliminary': 'VORLÄUFIG — Architekt:in-Bestätigung ausstehend',
  'footer.generatedAt': 'Erstellt',

  // ─── v1.0.15 Renaissance Part 2A — Executive ───────────────────
  'exec.kicker': 'ABSCHNITT 01 · ZUSAMMENFASSUNG',
  'exec.title': 'Die 3 nächsten Schritte',
  'exec.footer':
    'Empfehlungen abgeleitet aus § 30 BauGB · § 62/64 BauO {state} · § 48 GEG · Architekt:in-Verifizierung ausstehend.',
  'exec.empty': 'Noch keine Empfehlungen erfasst.',
  'prio.high': 'HOHE PRIORITÄT',
  'prio.beforeAward': 'VOR VERGABE',
  'prio.confirm': 'BESTÄTIGEN',

  // ─── v1.0.15 Renaissance Part 2A — Areas ──────────────────────
  'areas.kicker': 'ABSCHNITT 02 · RECHTSBEREICHE',
  'areas.title': 'A · B · C Status',
  'areas.legend.active': 'aktiv',
  'areas.legend.pending': 'offen',
  'areas.legend.void': 'nichtig',
  'areas.status.active': 'AKTIV',
  'areas.status.pending': 'OFFEN',
  'areas.status.void': 'NICHTIG',
  'areas.a.title': 'Planungsrecht',
  'areas.b.title': 'Bauordnungsrecht',
  'areas.c.title': 'Sonstige Vorgaben',
  'areas.empty': 'Noch kein Inhalt erfasst — Konsultation fortsetzen.',

  // ─── v1.0.16 Renaissance Part 2B — Costs ──────────────────────
  'costs.kicker': 'ABSCHNITT 03 · KOSTEN',
  'costs.title': 'Geschätzte Kostenspanne',
  'costs.basisTemplate':
    'Berechnet aus {n} m² Fassade · HOAI Zone III · {state} BKI-Faktor',
  'costs.th.item': 'POSITION',
  'costs.th.basis': 'GRUNDLAGE',
  'costs.th.range': 'EUR-SPANNE',
  'costs.total': 'Gesamt (geschätzt)',
  'costs.notes.h': 'HINWEISE',
  'costs.notes.b':
    'Orientierungswerte · keine verbindlichen Angebote. Spannen spiegeln HOAI-Mindest-/Höchstsätze und typische regionale Marktpreise wider. Endgültige Beträge hängen von der konkreten Architekt:in-Honorarvereinbarung und den gewählten Leistungsphasen ab.',
  'costs.items.architect': 'Architekt:in (LP 1–4)',
  'costs.items.architect.basis': 'HOAI Zone III · LP 1–4',
  'costs.items.structural': 'Tragwerksplanung',
  'costs.items.structural.basis': '§ 68 BauO {state} Nachweis',
  'costs.items.surveying': 'Vermessung (ÖbVI)',
  'costs.items.surveying.basis': 'Amtlicher Lageplan',
  'costs.items.energy': 'Energieberatung',
  'costs.items.energy.basis': 'GEG 2024 Wärmeschutznachweis',
  'costs.items.authority': 'Behördengebühren',
  'costs.items.authority.basis': 'Bauamtsgebühr + Nachbarbeteiligung',
  'costs.empty': 'Noch keine Kostenzeilen erfasst.',

  // ─── v1.0.16 Renaissance Part 2B — Timeline ───────────────────
  'timeline.kicker': 'ABSCHNITT 04 · ZEITPLAN',
  'timeline.title': 'Geschätzter Zeitplan',
  'timeline.sub':
    'Gesamtdauer ca. 4–6 Monate · abhängig von Behördenauslastung',
  'timeline.weekLabel': 'WOCHE',
  'timeline.phase.prep': 'Vorbereitung · LP 1–4',
  'timeline.phase.prep.duration': '8–14 Wochen',
  'timeline.phase.submit': 'Einreichung',
  'timeline.phase.submit.duration': '1 Woche',
  'timeline.phase.review': 'Prüfung · Bauamt',
  'timeline.phase.review.duration': '6–10 Wochen',
  'timeline.phase.fixes': 'Korrekturen',
  'timeline.phase.fixes.duration': '2 Wochen',
  'timeline.milestone': 'Genehmigungs-Meilenstein',
  'timeline.milestone.detail':
    '— Baugenehmigung erteilt zum Ende von Woche ≈ 22',

  // ─── v1.0.17 Renaissance Part 3 — Recommendations ─────────────
  'recs.kicker': 'ABSCHNITT 08 · EMPFEHLUNGEN',
  'recs.title': 'Empfehlungen · priorisiert',
  'recs.empty': 'Noch keine Empfehlungen erfasst.',

  // ─── v1.0.17 — Key Data ───────────────────────────────────────
  'data.kicker': 'ABSCHNITT 09 · ECKDATEN',
  'data.title': 'Projektdaten · Qualifikatorentabelle',
  'data.th.field': 'FELD',
  'data.th.value': 'WERT',
  'data.th.qualifier': 'QUALIFIKATOR',
  'data.empty': 'Noch keine Fakten erfasst.',

  // ─── v1.0.17 — Verification ───────────────────────────────────
  'verif.kicker': 'ABSCHNITT 10 · VERIFIZIERUNG',
  'verif.title': 'Verifizierungsstatus & Unterschrift',
  'verif.sub':
    'Dieses Briefing ist vorläufig. Endgültige Werte erfordern die Bestätigung einer/eines bauvorlageberechtigten Architekt:in gegen die maßgeblichen § Anker.',
  'verif.status.h': 'VERIFIZIERUNGSSTATUS',
  'verif.status.body':
    'Architekt:in-Bestätigung ausstehend. Alle Werte abgeleitet aus Persona-Modell-Berechnung gegen den Stand.',
  'verif.dq.h': 'DATENQUALITÄT',
  'verif.dq.legend.verified': 'verifiziert',
  'verif.dq.legend.calculated': 'berechnet',
  'verif.dq.legend.assumed': 'angenommen',
  'sig.architect': 'Architekt:in (Bauvorlageberechtigte/r)',
  'sig.chamber': 'Kammerstempel · Eintragungs-Nr.',
  'sig.date': 'Datum',

  // ─── v1.0.17 — Procedures + Documents ─────────────────────────
  'proc.kicker': 'ABSCHNITT 05 · VERFAHREN',
  'proc.title': 'Genehmigungspfad',
  'proc.empty': 'Noch kein Verfahren identifiziert.',
  'proc.status.required': 'ERFORDERLICH',
  'proc.status.optional': 'OPTIONAL',
  'proc.status.exempt': 'BEFREIT',
  'docs.kicker': 'ABSCHNITT 06 · DOKUMENTE',
  'docs.title': 'Einreichungs-Dokumente',
  'docs.empty':
    'Noch keine Dokumente erfasst — Konsultation fortsetzen.',

  // ─── v1.0.17 — Team & Stakeholders ────────────────────────────
  'team.kicker': 'ABSCHNITT 07 · TEAM & BETEILIGTE',
  'team.title': 'Team & Beteiligte',
  'team.specialists.h': 'FACHPLANER:INNEN',
  'team.specialists.empty':
    'Noch keine Fachplaner:innen identifiziert.',
  'team.stakeholders.h': 'BETEILIGTE',
  'team.role.owner': 'Bauherr:in',
  'team.role.owner.body':
    'Beauftragt das Vorhaben, trägt die Kosten, entscheidet.',
  'team.role.architect': 'Architekt:in',
  'team.role.architect.body':
    'Bauvorlageberechtigt. Reicht den Bauantrag im Namen der Bauherrschaft ein.',
  'team.role.engineers': 'Fachplaner:innen',
  'team.role.engineers.body':
    'Tragwerksplanung · Energieberatung · Brandschutz · Vermessung.',
  'team.role.authority': 'Bauamt',
  'team.role.authority.body':
    'Kommunale Genehmigungsbehörde. Prüft und entscheidet.',

  // ─── v1.0.17 — Glossary ───────────────────────────────────────
  'glossary.kicker': 'ABSCHNITT 11 · GLOSSAR',
  'glossary.title': 'Deutsche Rechtsbegriffe',
}

export const PDF_STRINGS: Record<PdfLang, PdfStrings> = { en: EN, de: DE }

/**
 * Locale-strict resolver. Returns the string table for the requested
 * locale. Callers index into the table with bracket access; the v1.0.13
 * drift fixture asserts every key present in EN is also present in DE
 * (catch missing translations at gate-time, not at user-export time).
 */
export function resolvePdfStrings(lang: PdfLang): PdfStrings {
  return PDF_STRINGS[lang]
}

/**
 * Render-time accessor that fails loudly on missing keys instead of
 * returning `undefined` (which pdf-lib's drawText would emit as empty
 * string, leaving a silent visual gap in the PDF).
 */
export function pdfStr(strings: PdfStrings, key: string): string {
  const v = strings[key]
  if (v == null) {
    // Visible sentinel: any future smoke-walk drift fixture (or human
    // QA on the PDF) catches the missing key immediately.
    return `[[MISSING: ${key}]]`
  }
  return v
}
