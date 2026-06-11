// ───────────────────────────────────────────────────────────────────────
// v1.0.22 Bug F — unified document resolver.
//
// ProcedureDocumentsTab (UI) and exportPdf (PDF page 7) had drifted:
// the UI counted state.documents only (user-uploaded files) and showed
// "0 documents · Not enough information yet" while the PDF auto-
// populated requiredDocumentsForCase and showed 5 mandatory Anlagen.
// Same project, two contradictory user-facing claims.
//
// This helper is the single source. UI tab + PDF assembly both call
// resolveDocuments(project, state) and consume identical shapes. When
// hard blockers (v1.0.21 Bug E) are active, the resolver short-
// circuits to a blocked state so neither surface emits "5 documents
// required" on a project whose admissibility is still unresolved.
// ───────────────────────────────────────────────────────────────────────

import type { ProjectRow } from '@/types/db'
import type {
  DocumentItem,
  ProjectState,
} from '@/types/projectState'
import {
  baujahrPre1995FromFacts,
  requiredDocumentsForCase,
  schadstoffverdachtFromFacts,
  type RequiredDocument,
} from '@/legal/requiredDocuments'
import {
  buildProcedureCase,
  detectHardBlockers,
  resolveProcedure,
} from '@/legal/resolveProcedure'

export interface ResolvedDocuments {
  /** Resolver-derived required Anlagen for the project's procedure
   *  case. Empty when the project is blocked. */
  required: RequiredDocument[]
  /** User-uploaded documents from state.documents. */
  onFile: DocumentItem[]
  /** Count of required-or-conditional Anlagen (excluding recommended). */
  totalRequired: number
  /** Count of user-uploaded items. */
  totalOnFile: number
  /** Required minus those whose `key` matches an on-file id/title hit. */
  outstanding: number
  /** True when one or more hard blockers gate procedure determination,
   *  so document requirements cannot be enumerated yet. */
  blockedByVoranfrage: boolean
  /** Locale-bilingual label rendered when blockedByVoranfrage. */
  blockedLabelDe: string
  blockedLabelEn: string
}

const BLOCKED_LABEL_DE =
  'Dokumentenanforderungen ausstehend — Bauvoranfrage zur Klärung der Zulässigkeit erforderlich.'
const BLOCKED_LABEL_EN =
  'Document requirements pending Bauvoranfrage resolution.'

// Sprint 1 (RED-1) — the local ProcedureCase builder here was a third
// construction site (alongside exportPdf's inline one and the result tabs that
// built none). All three drifted. It's now the SHARED buildProcedureCase from
// @/legal/resolveProcedure, so documents are derived from the same Sonderbau /
// verdict-aware case as the procedure surfaces.

export function resolveDocuments(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ResolvedDocuments {
  const onFile = state.documents ?? []
  const procedureCase = buildProcedureCase(project, state)
  const blockers = detectHardBlockers(procedureCase)
  if (blockers.length > 0) {
    return {
      required: [],
      onFile,
      totalRequired: 0,
      totalOnFile: onFile.length,
      outstanding: 0,
      blockedByVoranfrage: true,
      blockedLabelDe: BLOCKED_LABEL_DE,
      blockedLabelEn: BLOCKED_LABEL_EN,
    }
  }
  const decision = resolveProcedure(procedureCase)
  const required = requiredDocumentsForCase({
    procedureKind: decision.kind,
    intent: procedureCase.intent,
    bundesland: procedureCase.bundesland,
    eingriff_tragende_teile: procedureCase.eingriff_tragende_teile,
    eingriff_aussenhuelle: procedureCase.eingriff_aussenhuelle,
    denkmalschutz: procedureCase.denkmalschutz,
    grenzstaendig: procedureCase.grenzstaendig,
    gebaeude_freistehend: procedureCase.gebaeude_freistehend,
    baujahr_pre_1995: baujahrPre1995FromFacts(state.facts),
    schadstoffverdacht: schadstoffverdachtFromFacts(state.facts),
    geg_trigger:
      procedureCase.eingriff_aussenhuelle &&
      (procedureCase.fassadenflaeche_m2 ?? 0) > 0,
    fassadenflaeche_m2: procedureCase.fassadenflaeche_m2,
  })
  // Outstanding = required-or-conditional minus user-uploaded matches
  // (matched by key/title — best-effort heuristic).
  const onFileTitles = new Set(
    onFile.flatMap((d) => [d.title_de.toLowerCase(), d.title_en.toLowerCase()]),
  )
  const requiredCore = required.filter(
    (r) => r.status === 'required' || r.status === 'conditional',
  )
  const outstanding = requiredCore.filter(
    (r) =>
      !onFileTitles.has(r.name_de.toLowerCase()) &&
      !onFileTitles.has(r.name_en.toLowerCase()),
  ).length
  return {
    required,
    onFile,
    totalRequired: requiredCore.length,
    totalOnFile: onFile.length,
    outstanding,
    blockedByVoranfrage: false,
    blockedLabelDe: BLOCKED_LABEL_DE,
    blockedLabelEn: BLOCKED_LABEL_EN,
  }
}
