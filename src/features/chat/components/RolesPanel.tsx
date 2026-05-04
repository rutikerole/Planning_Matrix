import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/stores/chatStore'
import type { Role } from '@/types/projectState'
import { ScheduleRow, ScheduleSection } from './ScheduleSection'

interface Props {
  roles: Role[]
}

/** Phase 3.2 #40 — Fachplaner as schedule, numeral III. */
export function RolesPanel({ roles }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const active = useChatStore((s) => s.currentActivitySection) === 'roles'

  // needed: true first, then needed: false.
  const sorted = [...roles].sort(
    (a, b) => (a.needed === b.needed ? 0 : a.needed ? -1 : 1),
  )

  return (
    <ScheduleSection
      numeral="III"
      title={t('chat.rail.roles')}
      count={sorted.length}
      active={active}
      emptyCopy={t('chat.rail.rolesEmpty')}
    >
      {sorted.length > 0
        ? sorted.map((r, idx) => (
            <ScheduleRow
              key={r.id}
              index={idx + 1}
              title={lang === 'en' ? r.title_en : r.title_de}
              meta={
                <span
                  className={
                    r.needed
                      ? 'text-[11px] uppercase tracking-[0.20em] text-clay'
                      : 'text-[11px] uppercase tracking-[0.20em] text-ink/40'
                  }
                >
                  {r.needed ? t('chat.role.needed') : t('chat.role.notNeeded')}
                </span>
              }
              sub={
                (lang === 'en' ? r.rationale_en || r.rationale_de : r.rationale_de) ||
                undefined
              }
              qualifier={`${r.qualifier.source} · ${r.qualifier.quality}`}
            />
          ))
        : null}
    </ScheduleSection>
  )
}
