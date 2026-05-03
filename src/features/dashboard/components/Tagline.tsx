import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { pickTagline } from '../lib/taglines'

/**
 * v3 dashboard tagline — italic Instrument Serif clay-deep, picked
 * deterministically per day so the dashboard's mood shifts without
 * flickering mid-session.
 */
export function Tagline() {
  const { t } = useTranslation()
  const userId = useAuthStore((s) => s.user?.id)
  const key = pickTagline(userId)

  return (
    <p className="font-serif text-[17px] italic text-pm-clay-deep">
      {t(`dashboard.taglines.${key}`)}
    </p>
  )
}
