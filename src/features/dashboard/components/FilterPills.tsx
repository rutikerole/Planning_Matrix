import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { FILTER_VALUES, type DashboardFilter } from '../lib/filters'

interface Props {
  current: DashboardFilter
  onChange: (next: DashboardFilter) => void
  counts: Record<DashboardFilter, number>
}

/**
 * Hairline-bordered pill row. Current pill is filled clay-soft on
 * paper; idle pills carry a hairline border. Counts render in mono
 * subscript next to each label.
 */
export function FilterPills({ current, onChange, counts }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTER_VALUES.map((value) => {
        const isCurrent = current === value
        const count = counts[value] ?? 0
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={isCurrent}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-1.5 font-sans text-[13px] transition-colors duration-soft',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper',
              isCurrent
                ? 'border-0 bg-pm-clay-soft text-pm-paper'
                : 'border border-pm-hair text-pm-ink-mid hover:border-pm-hair-strong hover:text-pm-ink',
            )}
          >
            <span>{t(`dashboard.filters.${value}`)}</span>
            {count > 0 ? (
              <span
                className={cn(
                  'font-mono text-[10px] tabular-nums',
                  isCurrent ? 'text-pm-paper/80' : 'text-pm-ink-mute2',
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
