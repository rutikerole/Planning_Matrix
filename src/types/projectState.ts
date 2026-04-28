// ───────────────────────────────────────────────────────────────────────
// Planning Matrix — Project State (v1)
//
// The shape of the JSONB blob stored in `projects.state`. Every read or
// write to that column flows through src/lib/projectStateHelpers.ts;
// this file is the source of truth for what's allowed inside.
//
// Two governing concepts:
//
//   • Qualifiers — every fact, procedure, document, and role carries
//     a Source × Quality qualifier so the architect (and the audit
//     trail) can tell what's grounded in law versus what's a working
//     assumption. The conversation model is instructed to be honest
//     about this; helpers preserve it on every mutation.
//
//   • Areas A/B/C — the three legal regimes (Planungsrecht /
//     Bauordnungsrecht / Sonstige Vorgaben). Each can be ACTIVE,
//     PENDING (waiting on input), or VOID (impossible to assess —
//     typically when no plot is known).
//
// Schema versioning: the `schemaVersion` literal lets future migrations
// detect old states and run helper-side upgrades without a SQL migration.
// ───────────────────────────────────────────────────────────────────────


export type Source = 'LEGAL' | 'CLIENT' | 'DESIGNER' | 'AUTHORITY'
export type Quality = 'CALCULATED' | 'VERIFIED' | 'ASSUMED' | 'DECIDED'
export type AreaState = 'ACTIVE' | 'PENDING' | 'VOID'

export type TemplateId = 'T-01' | 'T-02' | 'T-03' | 'T-04' | 'T-05'

export type Specialist =
  | 'moderator'
  | 'planungsrecht'
  | 'bauordnungsrecht'
  | 'sonstige_vorgaben'
  | 'verfahren'
  | 'beteiligte'
  | 'synthesizer'

/**
 * Source × Quality qualifier attached to every fact/procedure/document/role.
 * Lower the quality honestly: a client-stated assumption is CLIENT/ASSUMED,
 * not CLIENT/DECIDED. The `reason` is the plain-language *why* — used in
 * tooltips and in the audit log.
 */
export interface Qualifier {
  source: Source
  quality: Quality
  /** ISO-8601 instant the qualifier was set or last updated. */
  setAt: string
  setBy: 'user' | 'assistant' | 'system'
  reason?: string
}

/**
 * A single grounded fact about the project. `value` is `unknown` here
 * because keys have heterogeneous types (string addresses, numeric areas,
 * boolean flags). Helpers narrow by `key` at the call site.
 */
export interface Fact {
  key: string
  value: unknown
  qualifier: Qualifier
  /** Cited source — e.g. "BayBO Art. 57 Abs. 1" or "B-Plan Wohngebiet Süd Nr. 12". */
  evidence?: string
}

/** Lifecycle status shared by procedures and documents. */
export type ItemStatus =
  | 'nicht_erforderlich'
  | 'erforderlich'
  | 'liegt_vor'
  | 'freigegeben'
  | 'eingereicht'
  | 'genehmigt'

export interface Procedure {
  /** Stable id, e.g. "P-01-Genehmigungsfreistellung". */
  id: string
  title_de: string
  title_en: string
  status: ItemStatus
  rationale_de: string
  rationale_en: string
  qualifier: Qualifier
}

export interface DocumentItem {
  /** Stable id, e.g. "D-Lageplan". */
  id: string
  title_de: string
  title_en: string
  status: ItemStatus
  /** Procedure ids that need this document. */
  required_for: string[]
  /** Role ids that typically produce this document. */
  produced_by: string[]
  qualifier: Qualifier
}

export interface Role {
  /** Stable id, e.g. "R-Tragwerksplaner". */
  id: string
  title_de: string
  title_en: string
  needed: boolean
  rationale_de: string
  qualifier: Qualifier
}

/**
 * Top-3 next steps shown in the right rail. The model keeps `rank` 1..n
 * up to date; the UI reorders with `layout` animations on rank change.
 */
/** Phase 3.5 #61 — coarse effort estimate enum for recommendations. */
export type EstimatedEffort = '1d' | '1-3d' | '1w' | '2-4w' | 'months'

/** Phase 3.5 #61 — who owns a recommendation. */
export type ResponsibleParty = 'bauherr' | 'architekt' | 'fachplaner' | 'bauamt'

export interface Recommendation {
  id: string
  /** 1..n; the right rail surfaces ranks 1, 2, 3. */
  rank: number
  title_de: string
  title_en: string
  detail_de: string
  detail_en: string
  ctaLabel_de?: string
  ctaLabel_en?: string
  /** Phase 3.5 #61 — coarse "how long does this take" estimate. */
  estimated_effort?: EstimatedEffort
  /** Phase 3.5 #61 — who's accountable for actioning this step. */
  responsible_party?: ResponsibleParty
  /** Phase 3.5 #61 — qualifier feeds the confidence radial in Section IX. */
  qualifier?: { source: Source; quality: Quality }
  /** ISO-8601 instant the recommendation was created. */
  createdAt: string
}

export interface Areas {
  /** A — Planungsrecht (BauGB §§ 30 / 34 / 35, BauNVO). */
  A: { state: AreaState; reason?: string }
  /** B — Bauordnungsrecht (BayBO). */
  B: { state: AreaState; reason?: string }
  /** C — Sonstige Vorgaben (Baulasten, Denkmal, kommunal, Naturschutz). */
  C: { state: AreaState; reason?: string }
}

/**
 * Question fingerprint kept so the model never re-asks the same thing.
 * Storing askedAt lets us audit conversation timing without mutating the
 * messages table. `fingerprint` is a normalised key (lower-cased, stripped
 * of punctuation/diacritics) computed by appendQuestionAsked() — last
 * write wins on the timestamp.
 */
export interface AskedQuestion {
  fingerprint: string
  askedAt: string
}

export interface ProjectState {
  schemaVersion: 1
  templateId: TemplateId
  facts: Fact[]
  procedures: Procedure[]
  documents: DocumentItem[]
  roles: Role[]
  /** Sorted by rank ascending; render top 3 in the right rail. */
  recommendations: Recommendation[]
  areas: Areas
  questionsAsked: AskedQuestion[]
  /** ISO-8601 instant of the most recent assistant turn persisted. */
  lastTurnAt: string
}
