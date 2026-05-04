import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/stores/chatStore'
import type { DocumentItem } from '@/types/projectState'
import { ScheduleRow, ScheduleSection } from './ScheduleSection'
import { StatusPill } from './StatusPill'

interface Props {
  documents: DocumentItem[]
}

/** Phase 3.2 #40 — Dokumente as schedule, numeral II. */
export function DocumentsPanel({ documents }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const active = useChatStore((s) => s.currentActivitySection) === 'documents'

  return (
    <ScheduleSection
      numeral="II"
      title={t('chat.rail.documents')}
      count={documents.length}
      active={active}
      emptyCopy={t('chat.rail.documentsEmpty')}
    >
      {documents.length > 0
        ? documents.map((d, idx) => (
            <ScheduleRow
              key={d.id}
              index={idx + 1}
              title={lang === 'en' ? d.title_en : d.title_de}
              meta={<StatusPill status={d.status} />}
              sub={
                d.required_for.length > 0
                  ? t('cockpit.cols.requiredFor', {
                      defaultValue: 'Erforderlich für',
                    }) + `: ${d.required_for.join(', ')}`
                  : undefined
              }
              qualifier={`${d.qualifier.source} · ${d.qualifier.quality}`}
            />
          ))
        : null}
    </ScheduleSection>
  )
}
