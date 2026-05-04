// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #71 — Operating-mode status pill for the cockpit
//
// Compact, color-coded, rounded-full. Differs from the Phase 3.0
// StatusPill (chat workspace) which leans atelier — this one is dense
// and functional, made to live in a 32px-tall data row.
// ───────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  STATUS_PILL_STYLES,
  defaultStatusLabelDe,
  type CockpitStatusKind,
} from './StatusPill.helpers'

// Re-export the type so existing imports of `CockpitStatusKind` from
// './StatusPill' keep working. Type-only re-exports don't trigger
// react-refresh/only-export-components.
export type { CockpitStatusKind }

interface Props {
  kind: CockpitStatusKind
  /** Optional override label — falls back to the i18n default for the kind. */
  label?: string
}

export function StatusPill({ kind, label }: Props) {
  const { t } = useTranslation()
  const text =
    label ??
    t(`cockpit.status.${kind}`, { defaultValue: defaultStatusLabelDe(kind) })
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] whitespace-nowrap rounded-[var(--pm-radius-pill)]',
        STATUS_PILL_STYLES[kind],
      )}
      data-cockpit-status={kind}
    >
      {text}
    </span>
  )
}
