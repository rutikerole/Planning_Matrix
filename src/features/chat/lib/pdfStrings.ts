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
