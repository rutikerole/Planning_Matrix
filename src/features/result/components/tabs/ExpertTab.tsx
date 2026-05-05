import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
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
}

/**
 * Phase 8 — Tab 7 (expert mode). Hidden behind `?expert=true`. Surfaces
 * the audit log + raw project state JSON + message count for power
 * users (architect, auditor) who need to see provenance and the
 * underlying data structure.
 *
 * Discoverable via the footer overflow menu's "Inspect data flow /
 * Datenfluss prüfen" link, plus directly via the URL param. Not part
 * of the casual Bauherr surface.
 */
export function ExpertTab({ project, state, events, messages }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [showJson, setShowJson] = useState(false)

  const sortedEvents = useMemo(
    () =>
      events
        .slice()
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [events],
  )

  const stateJson = useMemo(
    () => JSON.stringify(state, null, 2),
    [state],
  )

  return (
    <div className="flex flex-col gap-8 max-w-[1100px]">
      <header className="flex flex-col gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none">
          {t('result.workspace.expert.eyebrow')}
        </p>
        <p className="font-serif italic text-[14px] text-clay leading-relaxed max-w-prose">
          {t('result.workspace.expert.intro')}
        </p>
      </header>

      {/* Project meta */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
        <Stat label={t('result.workspace.expert.projectId')} value={project.id} mono />
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

      {/* Audit log */}
      <section aria-labelledby="audit-eyebrow" className="flex flex-col gap-3">
        <p
          id="audit-eyebrow"
          className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none"
        >
          {t('result.workspace.expert.auditEyebrow')}
        </p>
        {sortedEvents.length === 0 ? (
          <p className="text-[12.5px] italic text-clay/85 leading-relaxed">
            {t('result.workspace.expert.emptyEvents')}
          </p>
        ) : (
          <div className="border border-ink/12 rounded-[10px] bg-paper-card overflow-hidden">
            <ul className="flex flex-col">
              {sortedEvents.map((evt, idx) => (
                <li
                  key={evt.id}
                  className={
                    'grid grid-cols-1 sm:grid-cols-[160px_180px_120px_1fr] gap-2 sm:gap-4 px-4 py-3 ' +
                    (idx > 0 ? 'border-t border-ink/12' : '')
                  }
                >
                  <span className="font-serif italic text-clay-deep tabular-nums text-[12px] whitespace-nowrap">
                    {formatTime(evt.created_at, lang)}
                  </span>
                  <span className="text-ink text-[12.5px]">{evt.event_type}</span>
                  <span className="text-[10.5px] uppercase tracking-[0.16em] text-clay leading-snug">
                    {evt.triggered_by}
                  </span>
                  <span className="text-[12px] italic text-ink/65 leading-snug">
                    {evt.reason ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Raw state JSON */}
      <section aria-labelledby="json-eyebrow" className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setShowJson((prev) => !prev)}
          aria-expanded={showJson}
          className="self-start inline-flex items-center gap-1.5 text-[11.5px] italic text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-sm"
        >
          <span id="json-eyebrow">
            {t('result.workspace.expert.rawStateToggle')}
          </span>
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
            className="border border-ink/12 rounded-[10px] bg-paper-card p-4 text-[11px] leading-snug text-ink/85 font-mono overflow-x-auto max-h-[480px] overflow-y-auto whitespace-pre"
            data-no-print="true"
          >
            {stateJson}
          </pre>
        )}
      </section>
    </div>
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
          mono ? 'font-mono text-[11px] truncate' : 'font-serif italic text-[13px]',
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
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
