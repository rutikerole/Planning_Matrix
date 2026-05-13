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
  requiredDocumentsForCase,
  type RequiredDocument,
} from '@/legal/requiredDocuments'
import {
  detectHardBlockers,
  intentFromTemplate,
  resolveProcedure,
  type ProcedureCase,
} from '@/legal/resolveProcedure'
import type { BundeslandCode } from '@/legal/states/_types'

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

function buildProcedureCase(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ProcedureCase {
  const facts = state.facts ?? []
  const factBool = (key: string, fallback = false): boolean => {
    const f = facts.find((x) => x.key === key)
    if (!f) return fallback
    return (
      f.value === true ||
      f.value === 'true' ||
      f.value === 'JA' ||
      f.value === 'ja'
    )
  }
  const factNum = (key: string): number | undefined => {
    const f = facts.find((x) => x.key === key)
    if (!f) return undefined
    if (typeof f.value === 'number') return f.value
    const n = Number(f.value)
    return Number.isFinite(n) ? n : undefined
  }
  return {
    intent: intentFromTemplate(state.templateId ?? 'T-03'),
    bundesland: (project.bundesland ?? 'nrw') as BundeslandCode,
    eingriff_tragende_teile: factBool('eingriff_tragende_teile'),
    eingriff_aussenhuelle: factBool('eingriff_aussenhuelle', true),
    denkmalschutz: factBool('denkmalschutz'),
    ensembleschutz: factBool('ensembleschutz'),
    aenderung_aeussere_erscheinung: factBool('aenderung_aeussere_erscheinung'),
    grenzstaendig: factBool('grenzstaendig'),
    in_gestaltungssatzung: factBool('in_gestaltungssatzung'),
    fassadenflaeche_m2: factNum('fassadenflaeche_m2'),
    mk_gebietsart: factBool('mk_gebietsart'),
    bauvoranfrage_hard_blocker: factBool('bauvoranfrage_hard_blocker'),
    sonderbau_scope: factBool('sonderbau_scope'),
  }
}

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
