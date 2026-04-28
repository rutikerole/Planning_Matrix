// ───────────────────────────────────────────────────────────────────────
// StatusPill — locale label helpers
//
// Extracted from StatusPill.tsx so the component file only exports the
// component itself (Fast-Refresh friendly).
// ───────────────────────────────────────────────────────────────────────

export type CockpitStatusKind =
  | 'ok'
  | 'pending'
  | 'attention'
  | 'verified'
  | 'assumption'
  | 'void'
  | 'active'
  | 'erforderlich'
  | 'liegt_vor'
  | 'in_bearbeitung'
  | 'nicht_erforderlich'
  | 'eingereicht'
  | 'genehmigt'
  | 'freigegeben'
  | 'needed'
  | 'not_needed'

export const STATUS_PILL_STYLES: Record<CockpitStatusKind, string> = {
  ok: 'bg-ink/10 text-ink',
  pending: 'bg-clay/15 text-clay',
  attention: 'bg-destructive/10 text-destructive',
  verified: 'bg-clay/15 text-clay',
  assumption: 'bg-drafting-blue/12 text-drafting-blue',
  void: 'bg-ink/[0.04] text-ink/45 line-through decoration-ink/30',
  active: 'bg-clay/15 text-clay',
  erforderlich: 'bg-clay/15 text-clay',
  liegt_vor: 'bg-ink/10 text-ink',
  in_bearbeitung: 'bg-drafting-blue/12 text-drafting-blue',
  nicht_erforderlich: 'bg-ink/[0.04] text-ink/55',
  eingereicht: 'bg-drafting-blue/12 text-drafting-blue',
  genehmigt: 'bg-ink/10 text-ink',
  freigegeben: 'bg-ink/10 text-ink',
  needed: 'bg-clay/15 text-clay',
  not_needed: 'bg-ink/[0.04] text-ink/55',
}

const DEFAULT_LABELS_DE: Record<CockpitStatusKind, string> = {
  ok: 'OK',
  pending: 'Ausstehend',
  attention: 'Achtung',
  verified: 'Verifiziert',
  assumption: 'Annahme',
  void: 'Nicht ermittelbar',
  active: 'Aktiv',
  erforderlich: 'Erforderlich',
  liegt_vor: 'Liegt vor',
  in_bearbeitung: 'In Arbeit',
  nicht_erforderlich: 'Nicht erforderlich',
  eingereicht: 'Eingereicht',
  genehmigt: 'Genehmigt',
  freigegeben: 'Freigegeben',
  needed: 'Erforderlich',
  not_needed: 'Nicht erforderlich',
}

const DEFAULT_LABELS_EN: Record<CockpitStatusKind, string> = {
  ok: 'OK',
  pending: 'Pending',
  attention: 'Attention',
  verified: 'Verified',
  assumption: 'Assumption',
  void: 'Not determinable',
  active: 'Active',
  erforderlich: 'Required',
  liegt_vor: 'On file',
  in_bearbeitung: 'In progress',
  nicht_erforderlich: 'Not required',
  eingereicht: 'Submitted',
  genehmigt: 'Approved',
  freigegeben: 'Released',
  needed: 'Needed',
  not_needed: 'Not needed',
}

/** Pick a label from the right locale table for callers that don't override. */
export function defaultStatusLabel(
  kind: CockpitStatusKind,
  lang: 'de' | 'en',
): string {
  return lang === 'en' ? DEFAULT_LABELS_EN[kind] : DEFAULT_LABELS_DE[kind]
}

export function defaultStatusLabelDe(kind: CockpitStatusKind): string {
  return DEFAULT_LABELS_DE[kind]
}
