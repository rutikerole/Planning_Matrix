import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'

interface ProjectEventRow {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
  events: ProjectEventRow[]
  messages: MessageRow[]
  /** The tab the user clicked from — drives the modal title. */
  tabId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Phase 8.3 (C.4) — modal version of the expert-tab content, scoped
 * per tab. The full ExpertTab still exists at ?expert=true; this is a
 * lighter-weight inline view triggered by the per-tab "How was this
 * computed?" link.
 *
 * Surfaces:
 *   - Project meta (4 stats)
 *   - Audit log (top 8 newest events; full list via the route tab)
 *   - Raw state JSON, collapsed by default
 */
export function InspectDataFlowModal({
  project,
  state,
  events,
  messages,
  tabId,
  open,
  onOpenChange,
}: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [showJson, setShowJson] = useState(false)

  const sortedEvents = useMemo(
    () =>
      events
        .slice()
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 8),
    [events],
  )
  const stateJson = useMemo(() => JSON.stringify(state, null, 2), [state])

  const tabLabel = t(`result.workspace.tabs.${tabId}`)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-paper border border-ink/15 rounded-[10px] p-6 max-w-[640px] flex flex-col gap-5 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-baseline justify-between gap-3">
          <DialogTitle className="font-serif italic text-[20px] text-ink leading-snug">
            {t('result.workspace.inspectDataFlow.modalTitle', { tab: tabLabel })}
          </DialogTitle>
          <DialogClose
            className="size-7 inline-flex items-center justify-center rounded-full text-ink/45 hover:text-ink hover:bg-ink/[0.06] transition-colors duration-soft"
            aria-label={t('result.workspace.inspectDataFlow.close', {
              defaultValue: 'Schließen',
            })}
          >
            <X aria-hidden="true" className="size-3.5" />
          </DialogClose>
        </div>

        <p className="text-[12px] italic text-clay leading-relaxed">
          {t('result.workspace.expert.intro')}
        </p>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
          <Stat
            label={t('result.workspace.expert.projectId')}
            value={project.id}
            mono
          />
          <Stat
            label={t('result.workspace.expert.template')}
            value={project.template_id}
          />
          <Stat
            label={t('result.workspace.expert.messages')}
            value={String(messages.length)}
          />
          <Stat
            label={t('result.workspace.expert.events')}
            value={String(events.length)}
          />
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none">
            {t('result.workspace.expert.auditEyebrow')}
          </p>
          {sortedEvents.length === 0 ? (
            <p className="text-[12px] italic text-clay/85 leading-relaxed">
              {t('result.workspace.expert.emptyEvents')}
            </p>
          ) : (
            <ul className="border border-ink/12 rounded-[8px] bg-paper-card overflow-hidden">
              {sortedEvents.map((evt, idx) => (
                <li
                  key={evt.id}
                  className={
                    'grid grid-cols-[120px_1fr_80px] gap-2 sm:gap-3 px-3 py-2 text-[11.5px] ' +
                    (idx > 0 ? 'border-t border-ink/10' : '')
                  }
                >
                  <span className="font-serif italic text-clay-deep tabular-nums whitespace-nowrap">
                    {formatTime(evt.created_at, lang)}
                  </span>
                  <span className="text-ink leading-snug">{evt.event_type}</span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-clay leading-snug">
                    {evt.triggered_by}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowJson((p) => !p)}
            aria-expanded={showJson}
            className="self-start inline-flex items-center gap-1.5 text-[11.5px] italic text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-sm"
          >
            <span>{t('result.workspace.expert.rawStateToggle')}</span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-3 transition-transform duration-soft',
                showJson && 'rotate-180',
              )}
            />
          </button>
          {showJson && (
            <pre
              className="border border-ink/12 rounded-[8px] bg-paper-card p-3 text-[11px] leading-snug text-ink/85 font-mono overflow-x-auto max-h-[280px] overflow-y-auto whitespace-pre"
              data-no-print="true"
            >
              {stateJson}
            </pre>
          )}
        </section>
      </DialogContent>
    </Dialog>
  )
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-clay leading-none">
        {label}
      </span>
      <span
        className={cn(
          'text-ink leading-snug',
          mono ? 'font-mono text-[10.5px] truncate' : 'font-serif italic text-[12.5px]',
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  )
}

function formatTime(iso: string, lang: 'de' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(lang === 'en' ? 'en-GB' : 'de-DE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
