import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/stores/chatStore'
import type { DocumentItem } from '@/types/projectState'
import { RailSectionHeader } from './RailSectionHeader'
import { StatusPill } from './StatusPill'

interface Props {
  documents: DocumentItem[]
}

export function DocumentsPanel({ documents }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const active = useChatStore((s) => s.currentActivitySection) === 'documents'

  return (
    <RailSectionHeader
      title={t('chat.rail.documents')}
      count={documents.length}
      active={active}
      emptyCopy={t('chat.rail.documentsEmpty')}
    >
      {documents.length > 0
        ? documents.map((d) => (
            <div key={d.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-medium text-ink leading-snug">
                  {lang === 'en' ? d.title_en : d.title_de}
                </p>
                <StatusPill status={d.status} />
              </div>
              {d.required_for.length > 0 && (
                <p className="text-[10px] text-ink/55 leading-relaxed">
                  Erforderlich für: {d.required_for.join(', ')}
                </p>
              )}
              <p className="text-[10px] text-clay/65 italic uppercase tracking-[0.14em]">
                {d.qualifier.source} · {d.qualifier.quality}
              </p>
            </div>
          ))
        : null}
    </RailSectionHeader>
  )
}
