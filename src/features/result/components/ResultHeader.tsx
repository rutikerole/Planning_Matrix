import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { buildDocumentNumber } from '../lib/documentNumber'
import { computeConfidenceBreakdown } from '../lib/computeConfidence'
import { composeLastViewedDiff } from '../lib/composeLastViewedDiff'
import { useLastViewed } from '../hooks/useLastViewed'
import { SinceLastViewPill } from './Cards/SinceLastViewPill'
import type { ResultSource } from './ResultWorkspace'

interface ProjectEventRow {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

interface Props {
  project: ProjectRow
  source: ResultSource
  events: ProjectEventRow[]
}

/**
 * Phase 8 — sticky top header band of the Result Workspace.
 *
 * Composition: breadcrumb → row of [eyebrow + title + plot line] left,
 * [eyebrow + confidence% + sub-line] right. In shared mode the
 * Dashboard breadcrumb link is hidden (recipients aren't owners) and
 * a watermark line surfaces the expiry date.
 *
 * The header sits above the tab bar in the workspace stack; both are
 * sticky. Padding matches the brief: 22px top / 16px bottom.
 */
export function ResultHeader({ project, source, events }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const isShared = source.kind === 'shared'
  const state = (project.state ?? {}) as Partial<ProjectState>
  const { lastViewedAt } = useLastViewed(project.id)
  const diff = composeLastViewedDiff({
    state,
    events,
    lastViewedAt: isShared ? null : lastViewedAt,
    lang,
  })

  const docNo = buildDocumentNumber(project.id)
  const conf = computeConfidenceBreakdown(state)
  const plotLine = project.plot_address ?? ''
  const confTooltip = t('result.workspace.confidence.tooltip', {
    factWeight: conf.factWeight,
    factScore: conf.factScore,
    sectionWeight: conf.sectionWeight,
    sectionScore: conf.sectionScore,
    total: conf.total,
  })

  const expiresLong = isShared
    ? new Date(source.expiresAt).toLocaleDateString(
        lang === 'en' ? 'en-GB' : 'de-DE',
        { day: '2-digit', month: 'long', year: 'numeric' },
      )
    : null

  return (
    <header
      className="bg-paper/95 backdrop-blur-[8px] border-b border-ink/15 px-4 sm:px-6 lg:px-8 pt-5 pb-4"
      data-print-target="result-header"
    >
      {/* Breadcrumb + back-pill row */}
      <div className="flex items-center justify-between gap-3 mb-2 min-h-[20px]">
        {!isShared ? (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[11px] text-clay/85 leading-none"
          >
            <Link
              to="/dashboard"
              className="hover:text-ink transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-sm"
            >
              {t('result.workspace.header.breadcrumbDashboard')}
            </Link>
            <span aria-hidden="true" className="text-ink/35">›</span>
            <span className="text-ink/65 truncate max-w-[40ch]">{project.name}</span>
          </nav>
        ) : (
          <p className="text-[11px] italic text-clay/85 leading-none">
            {t('result.workspace.share.watermark', { date: expiresLong ?? '' })}
          </p>
        )}

        <div className="flex items-center gap-2">
          {!isShared && <SinceLastViewPill diff={diff} lang={lang} />}
          {!isShared && (
            <Link
              to={`/projects/${project.id}`}
              data-no-print="true"
              className="inline-flex items-center gap-1.5 h-8 px-3 bg-paper-card border border-ink/15 rounded-full text-[11.5px] text-ink/75 hover:text-ink hover:border-ink/30 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <ArrowLeft aria-hidden="true" className="size-3" />
              <span>{t('result.workspace.header.backToConsultation')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Title + confidence row */}
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none">
            {t('result.workspace.header.eyebrow', { shortId: docNo })}
          </p>
          <h1
            className="font-serif italic text-[26px] sm:text-[28px] text-ink leading-[1.1] -tracking-[0.01em] truncate"
            title={project.name}
          >
            {project.name}
          </h1>
          {plotLine && (
            <p className="font-serif italic text-[12px] text-clay leading-snug truncate">
              {plotLine}
            </p>
          )}
        </div>

        <div
          className="flex flex-col items-end gap-0.5 shrink-0"
          title={confTooltip}
          aria-label={confTooltip}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none">
            {t('result.workspace.header.confidence')}
          </p>
          <p className="font-serif italic text-[24px] text-ink leading-none tabular-nums cursor-help">
            {conf.total > 0 ? `${conf.total}%` : '—'}
          </p>
          <p className="font-serif italic text-[10px] text-clay leading-snug whitespace-nowrap">
            {t('result.workspace.header.preliminary')}
          </p>
        </div>
      </div>
    </header>
  )
}
