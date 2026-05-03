import { useTranslation } from 'react-i18next'
import { useRelativeTime } from '../hooks/useRelativeTime'
import type { IntelCounts } from '../lib/projectIntel'

interface Props {
  counts: IntelCounts
}

/**
 * Composes the welcome-band intelligence line:
 *   "{n_total} ongoing projects · {n_awaiting} await your input ·
 *    {n_designer} need designer · {n_paused} paused.
 *    Last activity: {relative time}."
 *
 * Skips a clause if its count is zero. Empty-state copy when total
 * is zero.
 */
export function IntelLine({ counts }: Props) {
  const { t } = useTranslation()
  const { format } = useRelativeTime()

  if (counts.total === 0) {
    return (
      <p className="font-sans text-[16px] italic leading-relaxed text-pm-ink-mid">
        {t('dashboard.intel.empty')}
      </p>
    )
  }

  const clauses: string[] = []
  if (counts.ongoing > 0) clauses.push(t('dashboard.intel.ongoing', { count: counts.ongoing }))
  if (counts.awaiting > 0) clauses.push(t('dashboard.intel.awaiting', { count: counts.awaiting }))
  if (counts.designer > 0) clauses.push(t('dashboard.intel.designer', { count: counts.designer }))
  if (counts.paused > 0) clauses.push(t('dashboard.intel.paused', { count: counts.paused }))

  return (
    <p className="font-sans text-[16px] italic leading-relaxed text-pm-ink-mid">
      {clauses.join(' · ')}.
      {counts.lastActivity ? (
        <>
          {' '}
          <span className="text-pm-clay tabular-nums">
            {t('dashboard.intel.lastActivity', { when: format(counts.lastActivity) })}
          </span>
        </>
      ) : null}
    </p>
  )
}
