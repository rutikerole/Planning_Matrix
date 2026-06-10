import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { Wordmark } from '@/components/shared/Wordmark'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { UserMenu } from '@/components/shared/AppHeader'
import { ResultActions } from './ResultActions'
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
  messages: MessageRow[]
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
export function ResultRail({ project, source, events, messages }: Props) {
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

  // Motion pass A.3 — the confidence value counts up 0→total over
  // ~600ms (ease-out cubic, rAF) once per mount; it never re-runs on
  // tab switches because the rail never remounts. Reduced motion (or
  // no value): the final number renders instantly.
  const reduced = useReducedMotion()
  const [shownConf, setShownConf] = useState(() => (reduced ? conf.total : 0))
  useEffect(() => {
    const target = conf.total
    if (reduced || target <= 0) {
      setShownConf(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const DURATION = 600
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION)
      const eased = 1 - Math.pow(1 - p, 3)
      setShownConf(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // Once per mount by design — the value is stable for the page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      {/* 2-4 — eyebrow + document number, title, address. Cascade order
        * (motion pass A.2): eyebrow → title → address → confidence →
        * verify, 45ms stagger via the data-rail-seq CSS delays. */}
      <div className="min-w-0 spine:mb-2">
        <p
          data-rail-seq="1"
          className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-[1.5]"
        >
          {t('result.workspace.header.eyebrow', { shortId: docNo })}
        </p>
        <h1
          data-rail-seq="2"
          className="font-serif italic text-[20px] spine:text-[30px] text-ink leading-[1.12] -tracking-[0.01em] break-words spine:mt-1"
          title={project.name}
        >
          {project.name}
        </h1>
        {plotLine && (
          <p
            data-rail-seq="3"
            className="font-serif italic text-[12px] spine:text-[13.5px] text-clay leading-snug break-words spine:mt-1"
          >
            {plotLine}
          </p>
        )}
      </div>

      {/* 5 — confidence. Mobile: compact chip. Rail: hairline-ruled
        * block. The % counts up on load (A.3); the breakdown tooltip is
        * a custom 150ms fade+rise (E.1) — aria-label keeps the full
        * sentence for screen readers. */}
      <div
        data-rail-seq="4"
        className={cn(
          'group relative flex items-baseline gap-2 rounded-full border border-clay/30 px-3 py-1',
          'spine:block spine:rounded-none spine:border-x-0 spine:border-y spine:border-clay/0',
          'spine:border-t-ink/10 spine:border-b-ink/10 spine:px-0 spine:py-4 spine:my-4',
        )}
        aria-label={confTooltip}
      >
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none">
          {t('result.workspace.header.confidence')}
        </p>
        <p
          data-conf-final={conf.total}
          className="font-serif italic text-[16px] spine:text-[34px] text-ink leading-none tabular-nums cursor-help spine:mt-2"
        >
          {conf.total > 0 ? `${shownConf}%` : '—'}
        </p>
        <p className="hidden spine:block font-serif italic text-[10.5px] text-clay leading-snug spine:mt-1.5">
          {t('result.workspace.header.preliminary')}
        </p>
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-0 top-full z-[var(--z-raised)] mt-1 w-max max-w-[220px]',
            'rounded-sm bg-ink px-2.5 py-1.5 text-[10.5px] leading-snug text-paper not-italic font-sans',
            'opacity-0 translate-y-1',
            'transition-[opacity,transform] duration-[var(--motion-fast)] ease-[var(--ease-exit)]',
            'motion-safe:group-hover:opacity-100 motion-safe:group-hover:translate-y-0',
          )}
        >
          {confTooltip}
        </span>
      </div>
      <p className="font-serif italic text-[10px] text-clay leading-snug spine:hidden">
        {t('result.workspace.header.preliminary')}
      </p>

      {/* 6 — verification rollup, relocated from OverviewTab. */}
      <div data-rail-seq="5">
        <VerificationProgress state={state} variant="rail" />
      </div>

      {/* 7 — rail footer (owner mode): desktop action stack (Export / Invite
        * / Send / Logs / Back, via ResultActions) + DE/EN + avatar. mt-auto
        * pins it to the rail bottom. On mobile the action stack self-hides
        * (the sticky bottom bar carries those actions); only DE/EN + avatar
        * wrap inline in the <900px identity band. Hidden in shared mode. */}
      {!isShared && (
        <div className="flex items-center gap-3 spine:mt-auto spine:flex-col spine:items-stretch spine:gap-2.5 spine:pt-5">
          <ResultActions
            project={project}
            messages={messages}
            events={events}
            variant="rail"
          />
          <div className="flex items-center gap-3 spine:justify-between spine:px-0.5">
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>
      )}
    </header>
  )
}
