import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/stores/chatStore'
import type { Role } from '@/types/projectState'
import { RailSectionHeader } from './RailSectionHeader'

interface Props {
  roles: Role[]
}

export function RolesPanel({ roles }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const active = useChatStore((s) => s.currentActivitySection) === 'roles'

  // needed: true first, then needed: false.
  const sorted = [...roles].sort(
    (a, b) => (a.needed === b.needed ? 0 : a.needed ? -1 : 1),
  )

  return (
    <RailSectionHeader
      title={t('chat.rail.roles')}
      count={sorted.length}
      active={active}
      emptyCopy={t('chat.rail.rolesEmpty')}
    >
      {sorted.length > 0
        ? sorted.map((r) => (
            <div key={r.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-medium text-ink leading-snug">
                  {lang === 'en' ? r.title_en : r.title_de}
                </p>
                <span
                  className={
                    r.needed
                      ? 'text-[10px] uppercase tracking-[0.16em] text-clay'
                      : 'text-[10px] uppercase tracking-[0.16em] text-ink/40'
                  }
                >
                  {r.needed ? t('chat.role.needed') : t('chat.role.notNeeded')}
                </span>
              </div>
              {r.rationale_de && (
                <p className="text-[11px] text-ink/65 leading-relaxed">{r.rationale_de}</p>
              )}
              <p className="text-[10px] text-clay/65 italic uppercase tracking-[0.14em]">
                {r.qualifier.source} · {r.qualifier.quality}
              </p>
            </div>
          ))
        : null}
    </RailSectionHeader>
  )
}
