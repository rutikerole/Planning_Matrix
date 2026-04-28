import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { ItemStatus } from '@/types/projectState'

interface Props {
  status: ItemStatus
  className?: string
}

const STATUS_STYLES: Record<ItemStatus, string> = {
  nicht_erforderlich: 'text-ink/40',
  erforderlich: 'text-clay',
  liegt_vor: 'text-ink/70',
  freigegeben: 'text-ink',
  eingereicht: 'text-ink italic',
  genehmigt: 'text-ink italic underline underline-offset-2 decoration-clay/55',
}

const STATUS_LABEL_KEYS: Record<ItemStatus, string> = {
  nicht_erforderlich: 'chat.status.nicht_erforderlich',
  erforderlich: 'chat.status.erforderlich',
  liegt_vor: 'chat.status.liegt_vor',
  freigegeben: 'chat.status.freigegeben',
  eingereicht: 'chat.status.eingereicht',
  genehmigt: 'chat.status.genehmigt',
}

/**
 * Tiny status indicator for procedures / documents items. Inter 10
 * uppercase tracked, color-coded by lifecycle stage (nicht_erforderlich
 * = ink/40 → genehmigt = ink italic underlined). No fill, no border —
 * a printed-stamp register, not a chip.
 */
export function StatusPill({ status, className }: Props) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-block text-[10px] uppercase tracking-[0.20em] tabular-nums',
        STATUS_STYLES[status],
        className,
      )}
    >
      {t(STATUS_LABEL_KEYS[status])}
    </span>
  )
}
