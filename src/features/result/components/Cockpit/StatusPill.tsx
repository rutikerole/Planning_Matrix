// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #71 — Operating-mode status pill for the cockpit
//
// Compact, color-coded, rounded-full. Differs from the Phase 3.0
// StatusPill (chat workspace) which leans atelier — this one is dense
// and functional, made to live in a 32px-tall data row.
// ───────────────────────────────────────────────────────────────────────

import { cn } from '@/lib/utils'

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

interface Props {
  kind: CockpitStatusKind
  /** Optional override label — falls back to the i18n default for the kind. */
  label?: string
}

const STYLES: Record<CockpitStatusKind, string> = {
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

export function StatusPill({ kind, label }: Props) {
  const text = label ?? DEFAULT_LABELS_DE[kind]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] whitespace-nowrap rounded-[var(--pm-radius-pill)]',
        STYLES[kind],
      )}
      data-cockpit-status={kind}
    >
      {text}
    </span>
  )
}

/** Pick a label from the right locale table for callers that don't override. */
export function defaultStatusLabel(
  kind: CockpitStatusKind,
  lang: 'de' | 'en',
): string {
  return lang === 'en' ? DEFAULT_LABELS_EN[kind] : DEFAULT_LABELS_DE[kind]
}
