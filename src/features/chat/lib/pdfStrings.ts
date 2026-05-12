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
    'Orientation values · not binding quotes. Ranges reflect HOAI minima/maxima and typical regional market rates. Final figures depend on the actual fee agreement and the selected Leistungsphasen.',
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
    'Orientierungswerte · keine verbindlichen Angebote. Spannen spiegeln HOAI-Mindest-/Höchstsätze und typische regionale Marktpreise wider. Endgültige Beträge hängen von der Honorarvereinbarung und den gewählten Leistungsphasen ab.',
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
