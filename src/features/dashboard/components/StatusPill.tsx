import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export type ProjectDisplayStatus =
  | 'active'
  | 'awaiting'
  | 'designer'
  | 'paused'
  | 'archived'
  | 'completed'

interface Props {
  status: ProjectDisplayStatus
}

const GLYPH: Record<ProjectDisplayStatus, string> = {
  active: '●',
  awaiting: '○',
  designer: '◇',
  paused: '▢',
  archived: '·',
  completed: '·',
}

const TONE: Record<ProjectDisplayStatus, string> = {
  active: 'text-pm-clay',
  awaiting: 'text-pm-ink-muted',
  designer: 'text-pm-clay-deep',
  paused: 'text-pm-ink-mute2',
  archived: 'text-pm-ink-mute2',
  completed: 'text-pm-ink-mute2',
}

/**
 * Mono 11px tracking-[0.16em] uppercase status pill. Glyph + label,
 * five distinct tones per the brief's status vocabulary.
 */
export function StatusPill({ status }: Props) {
  const { t } = useTranslation()
  const label = t(`dashboard.status.${status}`)

  return (
    <span
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em]',
        TONE[status],
      )}
    >
      <span aria-hidden="true">{GLYPH[status]}</span>
      <span>{label}</span>
    </span>
  )
}
