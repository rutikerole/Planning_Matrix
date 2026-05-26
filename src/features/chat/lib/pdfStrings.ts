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
  // v1.0.32 Bug 129 — verified cover revision (replaces "v1 preliminary").
  'cover.revisionValueVerified': 'v1 verified',
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
  // v1.0.32 Bug 111 — editorial-page footer clears to this line when the
  // verification rollup reports every load-bearing item DESIGNER+VERIFIED.
  // The verification date is appended in code (exportPdf footerCenter).
  'footer.verified': 'VERIFIED — architect confirmation on file',
  'footer.generatedAt': 'Generated',

  // ─── v1.0.15 Renaissance Part 2A — Executive ───────────────────
  'exec.kicker': 'SECTION 01 · EXECUTIVE',
  'exec.title': 'Top 3 next steps',
  'exec.footer':
    'Recommendations derived from § 30 BauGB · {stateLegalRef} · § 48 GEG · pending architect verification.',
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
  // v1.0.22 Bug I — drop the "{state} regional BKI factor" framing.
  // The cost engine REGION_MULT table maps Bayern → 1.0 and silently
  // falls through to 1.0 for every other state; the label promised a
  // regional adjustment the formula does not apply. Honest baseline
  // framing replaces it. See docs/cost-formula.md.
  'costs.basisTemplate':
    'Computed from {n} m² façade · HOAI Zone III · German baseline (regional variance +/-10%)',
  // v1.0.23 Bug L — honest no-area fallback when fassadenflaeche_m2 is
  // unset or zero. Replaces the v1.0.20-era "Computed from 0 m² façade"
  // leak that read as a measurement rather than a missing-data marker.
  'costs.basisTemplate.noArea':
    'Computed from floor area only (façade area not captured) · HOAI Zone III · German baseline (regional variance +/-10%)',
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
  'costs.items.structural.basis': '{structuralRef} certification',
  'costs.items.surveying': 'Surveying (ÖbVI)',
  'costs.items.surveying.basis': 'Official site plan',
  'costs.items.energy': 'Energy consultation',
  'costs.items.energy.basis': 'GEG 2024 thermal certificate',
  'costs.items.authority': 'Authority fees',
  'costs.items.authority.basis': 'Bauamt + neighbour involvement',
  'costs.empty': 'No cost rows recorded yet.',
  'costs.demolition.subtitle':
    'Demolition cost ranges in preparation · request quotes from a licensed demolition contractor.',
  'costs.demolition.empty':
    'Demolition cost ranges in preparation. Request fixed quotes from a licensed demolition contractor — the spread depends on the hazardous-materials survey (asbestos/KMF/PCB) and the disposal volume (KrWG). No HOAI new-build fee schedule applies.',
  // v1.0.30 Bug 88 — T-04 use-conversion honest stub (mirrors demolition).
  // The HOAI new-build engine does not model a use change (no new-build
  // LP1-4, no envelope GEG trigger, no new official site plan), and no
  // sourced use-conversion BKI exists — so request Fachplaner quotes
  // instead of shipping new-build numbers.
  'costs.useConversion.subtitle':
    'Use-conversion cost ranges in preparation · request quotes from the relevant Fachplaner:innen.',
  'costs.useConversion.empty':
    'Use-conversion cost ranges in preparation. Request fixed quotes for the sound-insulation (Schallschutz), fire-protection / escape-route (Brandschutz / Rettungsweg) and noise (TA Lärm) assessments plus the existing-condition survey (Bestandsaufnahme) — the spread depends on the existing structure (e.g. Holzbalkendecke) and the required Fachgutachten. No HOAI new-build fee schedule applies.',
  // v1.0.31 C3 — T-03 renovation honest stub (mirrors demolition / use-conversion).
  // The HOAI new-build engine assumes full new-build LP1-4, a new official site
  // plan and a GEG-Neubau thermal cert — none fit a renovation, whose cost is
  // dominated by scope (cosmetic vs. load-bearing vs. energetic). No sourced
  // renovation BKI exists, so request Fachplaner quotes, not new-build numbers.
  'costs.renovation.subtitle':
    'Renovation cost ranges in preparation · request quotes from the relevant Fachplaner:innen.',
  'costs.renovation.empty':
    'Renovation cost ranges in preparation. Request fixed quotes for the architect, structural (Tragwerk) and energy (GEG) services the scope requires — the spread depends on the depth of the intervention (cosmetic vs. load-bearing vs. energetic refurbishment) and the existing structure. No HOAI new-build fee schedule applies.',

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
  // v1.0.28 Bug 58 — verfahrensfrei demolition timeline (no Bauamt cycle).
  'timeline.demo.sub':
    'Total duration ~ 5–10 weeks · verfahrensfrei (no Bauamt review cycle)',
  'timeline.demo.survey': 'Hazardous-materials survey',
  'timeline.demo.survey.duration': '2–4 weeks',
  'timeline.demo.procure': 'Contractor procurement',
  'timeline.demo.procure.duration': '2–4 weeks',
  'timeline.demo.demolish': 'Demolition + disposal',
  'timeline.demo.demolish.duration': '1–2 weeks',
  'timeline.demo.milestone': 'Completion milestone',
  'timeline.demo.milestone.detail':
    '— demolition complete around week ≈ 9 · no Baugenehmigung required (verfahrensfrei)',

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
  // v1.0.32 Bug 130 — verification-page intro on a fully-verified brief.
  'verif.sub.verified':
    'This brief has been confirmed by the verifying architect named below, against the authoritative § citations.',
  'verif.status.h': 'VERIFICATION STATUS',
  'verif.status.body':
    'Pending architect confirmation. All values derived from persona model computation against state.',
  // v1.0.32 Bug 130 — verification STATUS card on a fully-verified brief.
  'verif.status.body.verified':
    'Confirmed by the verifying architect named below. All values reviewed against the authoritative state record.',
  'verif.dq.h': 'DATA QUALITY',
  // v1.0.29 Bug 75 — first arc is DECIDED, not architect-verified. Label it
  // "decided" so a brief with 0 sign-offs no longer reads "54% verified".
  'verif.dq.legend.verified': 'decided',
  'verif.dq.legend.calculated': 'calculated',
  'verif.dq.legend.assumed': 'assumed',
  'sig.architect': 'Architect (Bauvorlageberechtigte/r)',
  'sig.chamber': 'Chamber stamp · registration no.',
  'sig.date': 'Date',
  'sig.bauherr': 'Bauherr · Owner',
  'sig.bauherr.note': 'Co-signature required for Bauantrag.',

  // ─── v1.0.17 — Procedures + Documents ─────────────────────────
  'proc.kicker': 'SECTION 05 · PROCEDURES',
  'proc.title': 'Permit path',
  'proc.empty': 'No procedure identified yet.',
  'proc.status.required': 'REQUIRED',
  'proc.status.optional': 'OPTIONAL',
  'proc.status.exempt': 'PERMIT-FREE',
  'docs.kicker': 'SECTION 06 · DOCUMENTS',
  'docs.title': 'Submission documents',
  'docs.empty': 'No documents recorded yet — continue the consultation.',
  // v1.0.30 Bug 98 — ONE honest footer instead of repeating the stub-state
  // deferral citation on every required-document row (Sachsen stub).
  'docs.stubFooter':
    'State-specific submission §§ are in preparation — confirm the exact document requirements with the local building authority.',

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

  // ─── v1.0.20 — Qualifier pill i18n ────────────────────────────
  'qualifier.source.CLIENT': 'CLIENT',
  'qualifier.source.LEGAL': 'LEGAL',
  'qualifier.source.DESIGNER': 'DESIGNER',
  'qualifier.source.AUTHORITY': 'AUTHORITY',
  'qualifier.quality.CALCULATED': 'CALCULATED',
  'qualifier.quality.ASSUMED': 'ASSUMED',
  'qualifier.quality.VERIFIED': 'VERIFIED',
  'qualifier.quality.DECIDED': 'DECIDED',
}

const DE: PdfStrings = {
  // ─── Cover ─────────────────────────────────────────────────────
  'cover.wordmark': 'PLANNING MATRIX',
  'cover.tagline': 'Vorplanungsbriefing · B2B',
  'cover.docnoLabel': 'DOK-NR',
  'cover.revisionLabel': 'REVISION',
  'cover.revisionValue': 'v1 vorläufig',
  // v1.0.32 Bug 129 — verified cover revision (replaces "v1 vorläufig").
  'cover.revisionValueVerified': 'v1 verifiziert',
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
  // v1.0.32 Bug 111 — verified-state editorial footer (date appended in code).
  'footer.verified': 'VERIFIZIERT — Architekt:in-Bestätigung liegt vor',
  'footer.generatedAt': 'Erstellt',

  // ─── v1.0.15 Renaissance Part 2A — Executive ───────────────────
  'exec.kicker': 'ABSCHNITT 01 · ZUSAMMENFASSUNG',
  'exec.title': 'Die 3 nächsten Schritte',
  'exec.footer':
    'Empfehlungen abgeleitet aus § 30 BauGB · {stateLegalRef} · § 48 GEG · Architekt:in-Verifizierung ausstehend.',
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
  // v1.0.22 Bug I — see EN counterpart above. Honest baseline framing.
  'costs.basisTemplate':
    'Berechnet aus {n} m² Fassade · HOAI Zone III · deutscher Basiswert (regionale Varianz +/-10%)',
  // v1.0.23 Bug L — see EN counterpart above.
  'costs.basisTemplate.noArea':
    'Berechnet ausschließlich aus Wohnfläche (Fassade noch nicht erfasst) · HOAI Zone III · deutscher Basiswert (regionale Varianz +/-10%)',
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
  'costs.items.structural.basis': '{structuralRef} Nachweis',
  'costs.items.surveying': 'Vermessung (ÖbVI)',
  'costs.items.surveying.basis': 'Amtlicher Lageplan',
  'costs.items.energy': 'Energieberatung',
  'costs.items.energy.basis': 'GEG 2024 Wärmeschutznachweis',
  'costs.items.authority': 'Behördengebühren',
  'costs.items.authority.basis': 'Bauamtsgebühr + Nachbarbeteiligung',
  'costs.empty': 'Noch keine Kostenzeilen erfasst.',
  'costs.demolition.subtitle':
    'Abbruchkosten in Vorbereitung · Angebote bei einem zugelassenen Abbruchunternehmen einholen.',
  'costs.demolition.empty':
    'Abbruchkosten in Vorbereitung. Festangebote bei einem zugelassenen Abbruchunternehmen einholen — die Spanne hängt vom Schadstoffgutachten (Asbest/KMF/PCB) und vom Entsorgungsvolumen (KrWG) ab. Keine HOAI-Neubau-Honorartafel anwendbar.',
  // v1.0.30 Bug 88 — siehe EN-Pendant. Umnutzung: ehrlicher Stub statt
  // Neubau-Zahlen.
  'costs.useConversion.subtitle':
    'Umnutzungskosten in Vorbereitung · Angebote bei den relevanten Fachplaner:innen einholen.',
  'costs.useConversion.empty':
    'Umnutzungskosten in Vorbereitung. Festangebote für Schallschutz-, Brandschutz-/Rettungsweg- und TA-Lärm-Gutachten sowie die Bestandsaufnahme einholen — die Spanne hängt vom Bestand (z. B. Holzbalkendecke) und den erforderlichen Fachgutachten ab. Keine HOAI-Neubau-Honorartafel anwendbar.',
  // v1.0.31 C3 — siehe EN-Pendant. Sanierung: ehrlicher Stub statt Neubau-Zahlen.
  'costs.renovation.subtitle':
    'Sanierungskosten in Vorbereitung · Angebote bei den relevanten Fachplaner:innen einholen.',
  'costs.renovation.empty':
    'Sanierungskosten in Vorbereitung. Festangebote für die nach Umfang erforderlichen Architekten-, Tragwerks- und GEG-Leistungen einholen — die Spanne hängt von der Eingriffstiefe (kosmetisch vs. tragend vs. energetisch) und vom Bestand ab. Keine HOAI-Neubau-Honorartafel anwendbar.',

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
  // v1.0.28 Bug 58 — verfahrensfreier Abbruch (kein Bauamt-Zyklus).
  'timeline.demo.sub':
    'Gesamtdauer ~ 5–10 Wochen · verfahrensfrei (keine Bauamt-Prüfung)',
  'timeline.demo.survey': 'Schadstoffgutachten',
  'timeline.demo.survey.duration': '2–4 Wochen',
  'timeline.demo.procure': 'Beauftragung Abbruchunternehmen',
  'timeline.demo.procure.duration': '2–4 Wochen',
  'timeline.demo.demolish': 'Abbruch + Entsorgung',
  'timeline.demo.demolish.duration': '1–2 Wochen',
  'timeline.demo.milestone': 'Abschluss-Meilenstein',
  'timeline.demo.milestone.detail':
    '— Abbruch abgeschlossen etwa in Woche ≈ 9 · keine Baugenehmigung erforderlich (verfahrensfrei)',

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
  // v1.0.32 Bug 130 — Verifizierungsseite-Intro bei vollständig verifiziertem Briefing.
  'verif.sub.verified':
    'Dieses Briefing wurde von der unten genannten bauvorlageberechtigten Architekt:in gegen die maßgeblichen § Anker bestätigt.',
  'verif.status.h': 'VERIFIZIERUNGSSTATUS',
  'verif.status.body':
    'Architekt:in-Bestätigung ausstehend. Alle Werte abgeleitet aus Persona-Modell-Berechnung gegen den Stand.',
  // v1.0.32 Bug 130 — Verifizierungsstatus-Karte bei vollständig verifiziertem Briefing.
  'verif.status.body.verified':
    'Bestätigt durch die unten genannte bauvorlageberechtigte Architekt:in. Alle Werte gegen den maßgeblichen Stand geprüft.',
  'verif.dq.h': 'DATENQUALITÄT',
  'verif.dq.legend.verified': 'entschieden',
  'verif.dq.legend.calculated': 'berechnet',
  'verif.dq.legend.assumed': 'angenommen',
  'sig.architect': 'Architekt:in (Bauvorlageberechtigte/r)',
  'sig.chamber': 'Kammerstempel · Eintragungs-Nr.',
  'sig.bauherr': 'Bauherr:in',
  'sig.bauherr.note': 'Mit-Unterschrift erforderlich für Bauantrag.',
  'sig.date': 'Datum',

  // ─── v1.0.17 — Procedures + Documents ─────────────────────────
  'proc.kicker': 'ABSCHNITT 05 · VERFAHREN',
  'proc.title': 'Genehmigungspfad',
  'proc.empty': 'Noch kein Verfahren identifiziert.',
  'proc.status.required': 'ERFORDERLICH',
  'proc.status.optional': 'OPTIONAL',
  'proc.status.exempt': 'VERFAHRENSFREI',
  'docs.kicker': 'ABSCHNITT 06 · DOKUMENTE',
  'docs.title': 'Einreichungs-Dokumente',
  'docs.empty':
    'Noch keine Dokumente erfasst — Konsultation fortsetzen.',
  // v1.0.30 Bug 98 — siehe EN-Pendant.
  'docs.stubFooter':
    'Landesspezifische Einreichungs-§§ in Vorbereitung — die genauen Dokumentanforderungen mit dem lokalen Bauamt abklären.',

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

  // ─── v1.0.20 — Qualifier pill i18n ────────────────────────────
  'qualifier.source.CLIENT': 'BAUHERR',
  'qualifier.source.LEGAL': 'RECHTLICH',
  'qualifier.source.DESIGNER': 'ARCHITEKT:IN',
  'qualifier.source.AUTHORITY': 'BEHÖRDE',
  'qualifier.quality.CALCULATED': 'BERECHNET',
  'qualifier.quality.ASSUMED': 'ANGENOMMEN',
  'qualifier.quality.VERIFIED': 'VERIFIZIERT',
  'qualifier.quality.DECIDED': 'ENTSCHIEDEN',
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
