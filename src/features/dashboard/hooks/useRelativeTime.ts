import { useTranslation } from 'react-i18next'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY

/**
 * Locale-aware "X minutes ago" / "vor X Min." formatter. Uses the
 * existing dashboard.relativeTime.* key tree (commit 1). Pure helper
 * — components can call `format(iso)` to render any timestamp.
 */
export function useRelativeTime() {
  const { t } = useTranslation()

  function format(iso: string | Date | null | undefined): string {
    if (!iso) return ''
    const d = typeof iso === 'string' ? new Date(iso) : iso
    if (Number.isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()

    if (diff < 60_000) return t('dashboard.relativeTime.now')
    if (diff < HOUR) {
      const count = Math.max(1, Math.round(diff / MIN))
      return t('dashboard.relativeTime.minutes', { count })
    }
    if (diff < DAY) {
      const count = Math.max(1, Math.round(diff / HOUR))
      return t('dashboard.relativeTime.hours', { count })
    }
    if (diff < 2 * DAY) return t('dashboard.relativeTime.yesterday')
    if (diff < WEEK) {
      const count = Math.max(2, Math.round(diff / DAY))
      return t('dashboard.relativeTime.days', { count })
    }
    if (diff < MONTH) {
      const count = Math.max(1, Math.round(diff / WEEK))
      return t('dashboard.relativeTime.weeks', { count })
    }
    const count = Math.max(1, Math.round(diff / MONTH))
    return t('dashboard.relativeTime.months', { count })
  }

  return { format }
}
