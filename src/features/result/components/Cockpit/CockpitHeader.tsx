// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #71 — Compact cockpit header
//
// Replaces the editorial Sanierung · Projekt vom 28.04.2026 hero with
// a Linear-style title bar: small wordmark, project name + plot in
// Inter (no Instrument Serif), status pill, export menu, language
// switcher, close-X. Sticky to the top so the tab strip below stays
// in reading view.
// ───────────────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'
import { ExportMenu } from '../../../chat/components/ExportMenu'
import type { ProjectRow, MessageRow } from '@/types/db'
import type { ProjectEventRow } from '../../../chat/hooks/useProjectEvents'
import { StatusPill, type CockpitStatusKind } from './StatusPill'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  /** Where the [×] icon routes to. */
  closeTo: string
}

const STATUS_KIND: Record<ProjectRow['status'], CockpitStatusKind> = {
  in_progress: 'in_bearbeitung',
  paused: 'pending',
  archived: 'void',
  completed: 'genehmigt',
}

const STATUS_LABEL_DE: Record<ProjectRow['status'], string> = {
  in_progress: 'In Bearbeitung',
  paused: 'Pausiert',
  archived: 'Archiviert',
  completed: 'Abgeschlossen',
}

const STATUS_LABEL_EN: Record<ProjectRow['status'], string> = {
  in_progress: 'In progress',
  paused: 'Paused',
  archived: 'Archived',
  completed: 'Completed',
}

export function CockpitHeader({ project, messages, events, closeTo }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const statusKind = STATUS_KIND[project.status]
  const statusLabel =
    lang === 'en'
      ? STATUS_LABEL_EN[project.status]
      : STATUS_LABEL_DE[project.status]

  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-[2px] border-b border-ink/12">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 flex h-14 items-center gap-3">
        <Wordmark />

        <div className="hidden md:flex items-baseline gap-2 min-w-0">
          <p className="text-[13px] font-medium text-ink truncate">{project.name}</p>
          {project.plot_address && (
            <p className="text-[12px] text-ink/55 truncate">
              · {project.plot_address}
            </p>
          )}
        </div>

        <div className="flex-1" />

        <StatusPill kind={statusKind} label={statusLabel} />

        <div className="hidden sm:block">
          <ExportMenu
            project={project}
            messages={messages}
            events={events}
            variant="primary"
          />
        </div>

        <LanguageSwitcher />

        <Link
          to={closeTo}
          aria-label={t('chat.overview.close', {
            defaultValue: 'Schließen',
          })}
          className="size-9 inline-flex items-center justify-center rounded-full text-ink/55 hover:text-ink hover:bg-ink/[0.06] transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <X aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </header>
  )
}
