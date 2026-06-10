import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { Wordmark } from '@/components/shared/Wordmark'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { UserMenu } from '@/components/shared/AppHeader'
import { buildDocumentNumber } from '../lib/documentNumber'
import { computeConfidenceBreakdown } from '../lib/computeConfidence'
import { composeLastViewedDiff } from '../lib/composeLastViewedDiff'
import { useLastViewed } from '../hooks/useLastViewed'
import { SinceLastViewPill } from './Cards/SinceLastViewPill'
import { VerificationProgress } from './VerificationProgress'
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
 * feat/result-spine-layout (Option B — "Document spine").
 *
 * The result page's identity, relocated from the old full-width hero
 * header (ResultHeader, deleted in this branch) into a fixed left rail:
 * ≥900px (`spine:` screen) a sticky 248px full-viewport-height column;
 * below that a wrapping horizontal identity band above the tab bar.
 *
 * DATA-IDENTICAL relocation — everything the hero rendered renders
 * here, same values, same locale keys: breadcrumb (or share watermark),
 * SinceLastViewPill, eyebrow + document number, title, plot address,
 * confidence block (+ the same composed tooltip), and — relocated from
 * OverviewTab — the architect-verification rollup (rail variant; the
 * original full-sentence key survives as its accessible name). The rail
 * footer absorbs the back-to-consultation pill plus the DE/EN
 * LanguageSwitcher + UserMenu that the (now hidden) AppHeader carried
 * on this route — same components, same handlers.
 *
 * Shared-link mode keeps today's exact surface: watermark instead of
 * breadcrumb, no back pill, no auth controls, no last-viewed pill.
 *
 * Kept as <header data-print-target="result-header"> so the @media
 * print rules in globals.css hide it unchanged.
 */
export function ResultRail({ project, source, events }: Props) {
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
      data-print-target="result-header"
      data-result-rail="true"
      className={cn(
        // < 900px — wrapping horizontal identity band above the tabs.
        'flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3',
        'bg-paper-card border-b border-ink/15',
        // ≥ 900px — sticky document-spine rail, full viewport height.
        'spine:sticky spine:top-0 spine:h-dvh spine:flex-col spine:flex-nowrap',
        'spine:items-stretch spine:gap-0 spine:overflow-y-auto',
        'spine:border-b-0 spine:border-r spine:px-5 spine:py-6',
      )}
    >
      {/* 1 — logo (links to dashboard, as in the old AppHeader). */}
      <Link
        to="/dashboard"
        className="inline-flex items-center self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card rounded-sm spine:mb-5"
      >
        <Wordmark size="sm" asLink={false} />
      </Link>

      {/* Breadcrumb (owner) / share watermark — same conditionals the
        * hero used; SinceLastViewPill rides along. */}
      <div className="flex items-center gap-2 min-w-0 spine:mb-4">
        {!isShared ? (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[11px] text-clay/85 leading-none min-w-0"
          >
            <Link
              to="/dashboard"
              className="hover:text-ink transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card rounded-sm"
            >
              {t('result.workspace.header.breadcrumbDashboard')}
            </Link>
            <span aria-hidden="true" className="text-ink/35">›</span>
            <span className="text-ink/65 truncate max-w-[18ch]">{project.name}</span>
          </nav>
        ) : (
          <p className="text-[11px] italic text-clay/85 leading-snug">
            {t('result.workspace.share.watermark', { date: expiresLong ?? '' })}
          </p>
        )}
        {!isShared && <SinceLastViewPill diff={diff} lang={lang} />}
      </div>

      {/* 2-4 — eyebrow + document number, title, address. */}
      <div className="min-w-0 spine:mb-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-[1.5]">
          {t('result.workspace.header.eyebrow', { shortId: docNo })}
        </p>
        <h1
          className="font-serif italic text-[20px] spine:text-[30px] text-ink leading-[1.12] -tracking-[0.01em] break-words spine:mt-1"
          title={project.name}
        >
          {project.name}
        </h1>
        {plotLine && (
          <p className="font-serif italic text-[12px] spine:text-[13.5px] text-clay leading-snug break-words spine:mt-1">
            {plotLine}
          </p>
        )}
      </div>

      {/* 5 — confidence. Mobile: compact chip. Rail: hairline-ruled block. */}
      <div
        className={cn(
          'flex items-baseline gap-2 rounded-full border border-clay/30 px-3 py-1',
          'spine:block spine:rounded-none spine:border-x-0 spine:border-y spine:border-clay/0',
          'spine:border-t-ink/10 spine:border-b-ink/10 spine:px-0 spine:py-4 spine:my-4',
        )}
        title={confTooltip}
        aria-label={confTooltip}
      >
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none">
          {t('result.workspace.header.confidence')}
        </p>
        <p className="font-serif italic text-[16px] spine:text-[34px] text-ink leading-none tabular-nums cursor-help spine:mt-2">
          {conf.total > 0 ? `${conf.total}%` : '—'}
        </p>
        <p className="hidden spine:block font-serif italic text-[10.5px] text-clay leading-snug spine:mt-1.5">
          {t('result.workspace.header.preliminary')}
        </p>
        {/* < 900px — the preliminary sub-line still renders (band has no
          * room inside the chip; it trails the chip instead). */}
      </div>
      <p className="font-serif italic text-[10px] text-clay leading-snug spine:hidden">
        {t('result.workspace.header.preliminary')}
      </p>

      {/* 6 — verification rollup, relocated from OverviewTab. */}
      <VerificationProgress state={state} variant="rail" />

      {/* 7 — rail footer (owner mode): back pill + DE/EN + avatar.
        * mt-auto pushes it to the rail bottom; in the <900px band it
        * simply wraps inline. Hidden entirely in shared mode (the old
        * layout had no back pill / auth chrome there either). */}
      {!isShared && (
        <div className="flex items-center gap-3 spine:mt-auto spine:flex-col spine:items-stretch spine:gap-2.5 spine:pt-5">
          <Link
            to={`/projects/${project.id}`}
            data-no-print="true"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 bg-paper border border-ink/15 rounded-full text-[12px] text-ink/75 hover:text-ink hover:border-ink/30 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card"
          >
            <ArrowLeft aria-hidden="true" className="size-3" />
            <span>{t('result.workspace.header.backToConsultation')}</span>
          </Link>
          <div className="flex items-center gap-3 spine:justify-between spine:px-0.5">
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>
      )}
    </header>
  )
}
