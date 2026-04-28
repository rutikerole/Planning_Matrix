import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'
import { useProject } from '../hooks/useProject'
import { useProjectEvents } from '../hooks/useProjectEvents'
import { useMessages } from '../hooks/useMessages'
import { StatusPill } from '../components/StatusPill'
import { BinderTabStrip } from '../components/BinderTabStrip'
import { AuditTimeline } from '../components/AuditTimeline'
import { ExportMenu } from '../components/ExportMenu'
import type { ProjectState } from '@/types/projectState'
import { factLabel, factValueWithUnit } from '@/lib/factLabel'

/**
 * Phase 3.2 #44 — overview rebuilt as an architectural project binder.
 *
 *   • Sticky header carries a paper-tab strip across all 8 sections,
 *     each tab a Roman numeral above an uppercase tracked label;
 *     scroll-spy underlines the closest section in clay.
 *   • Each section is rendered in the schedule register established
 *     in #40: a 24px Roman-numeral column + uppercase eyebrow + count.
 *   • Audit log: vertical hairline timeline with tick marks and
 *     italic-Serif timestamps printed left of the rule.
 */
export function OverviewPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = id ?? ''
  const { data: project } = useProject(projectId)
  const { data: events } = useProjectEvents(projectId)
  const { data: messages } = useMessages(projectId)
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  useEffect(() => {
    if (project?.name) {
      document.title = `${t('chat.overview.titlePrefix')} — ${project.name} · Planning Matrix`
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(`/projects/${projectId}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [project?.name, projectId, t, navigate])

  if (!project) return null
  const state = (project.state ?? {}) as Partial<ProjectState>
  const facts = state.facts ?? []
  const procedures = state.procedures ?? []
  const documents = state.documents ?? []
  const roles = state.roles ?? []
  const recommendations = (state.recommendations ?? []).slice().sort((a, b) => a.rank - b.rank)
  const areas = state.areas ?? {
    A: { state: 'PENDING' as const },
    B: { state: 'PENDING' as const },
    C: { state: 'PENDING' as const },
  }

  const tabs = [
    { id: 'sec-vorhaben', numeral: 'I', label: t('chat.overview.tabs.intent') },
    { id: 'sec-eckdaten', numeral: 'II', label: t('chat.overview.facts') },
    { id: 'sec-bereiche', numeral: 'III', label: t('chat.overview.areas') },
    { id: 'sec-verfahren', numeral: 'IV', label: t('chat.overview.procedures') },
    { id: 'sec-dokumente', numeral: 'V', label: t('chat.overview.documents') },
    { id: 'sec-fachplaner', numeral: 'VI', label: t('chat.overview.roles') },
    { id: 'sec-empfehlungen', numeral: 'VII', label: t('chat.overview.recommendations') },
    { id: 'sec-audit', numeral: 'VIII', label: t('chat.overview.audit') },
  ]

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-10 bg-paper/95 backdrop-blur-[2px] border-b border-ink/12">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-10 lg:px-14 flex h-16 md:h-[64px] items-center justify-between gap-4">
          <Wordmark />
          <p className="hidden sm:block text-[12px] font-serif italic text-clay/85 truncate max-w-md">
            {t('chat.overview.eyebrow')} · {project.name}
          </p>
          <div className="flex items-center gap-3">
            {/* Phase 3.4 #55 — Exportieren primary CTA in the binder header */}
            <ExportMenu
              project={project}
              messages={messages ?? []}
              events={events ?? []}
              variant="primary"
            />
            <LanguageSwitcher />
            <Link
              to={`/projects/${projectId}`}
              aria-label={t('chat.overview.close')}
              className="size-9 inline-flex items-center justify-center rounded-sm text-ink/65 hover:text-ink hover:bg-muted/40 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <X aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
        {/* Paper-tab strip */}
        <div className="mx-auto max-w-[1100px] px-2 sm:px-6">
          <BinderTabStrip tabs={tabs} />
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 sm:px-10 lg:px-14 py-12 flex flex-col gap-12">
        {/* I · Vorhaben (project header) */}
        <BinderSection id="sec-vorhaben" numeral="I" title={t('chat.overview.tabs.intent')}>
          <div className="flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-clay/85">
              {t('chat.overview.eyebrow')}
            </p>
            <h1 className="font-display text-display-3 text-ink leading-[1.05] -tracking-[0.02em]">
              {project.name}
            </h1>
            {project.plot_address && (
              <p className="font-serif italic text-[14px] text-ink/65">
                {project.plot_address}
              </p>
            )}
          </div>
        </BinderSection>

        {/* II · Eckdaten */}
        <BinderSection
          id="sec-eckdaten"
          numeral="II"
          title={t('chat.overview.facts')}
          count={facts.length}
        >
          {facts.length === 0 ? (
            <Empty copy={t('chat.overview.factsEmpty')} />
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {facts.map((f, i) => (
                <li
                  key={`${f.key}-${i}`}
                  className="grid grid-cols-[28px_1fr] gap-x-3"
                >
                  <span className="font-serif italic text-[12px] text-clay-deep tabular-figures pt-1 leading-none border-r border-border/40 pr-2 text-center">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-clay/85 uppercase tracking-[0.18em]">
                      {factLabel(f.key, lang).label}
                    </span>
                    <span className="text-[14px] font-medium text-ink leading-snug break-words">
                      {factValueWithUnit(f.key, f.value, lang)}
                    </span>
                    <span className="text-[9px] text-clay/60 italic uppercase tracking-[0.14em]">
                      {f.qualifier.source} · {f.qualifier.quality}
                    </span>
                    {f.evidence && (
                      <span className="font-serif italic text-[11px] text-ink/55 mt-0.5">
                        {f.evidence}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </BinderSection>

        {/* III · Bereiche */}
        <BinderSection id="sec-bereiche" numeral="III" title={t('chat.overview.areas')}>
          <ul className="flex flex-col gap-4">
            {(['A', 'B', 'C'] as const).map((key) => {
              const a = areas[key] ?? { state: 'PENDING' as const }
              return (
                <li key={key} className="grid grid-cols-[28px_1fr] gap-x-3">
                  <span className="font-serif italic text-[18px] text-clay-deep tabular-figures leading-none pt-0.5 text-center">
                    {key}
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="text-[14px] font-medium text-ink leading-snug">
                      {t(`chat.areas.${key}`)}
                      <span
                        className={
                          a.state === 'VOID'
                            ? 'ml-3 text-[10px] uppercase tracking-[0.20em] text-ink/30 line-through'
                            : a.state === 'ACTIVE'
                              ? 'ml-3 text-[10px] uppercase tracking-[0.20em] text-clay'
                              : 'ml-3 text-[10px] uppercase tracking-[0.20em] text-clay/60'
                        }
                      >
                        {t(`chat.areas.state.${a.state.toLowerCase()}`)}
                      </span>
                    </p>
                    {a.reason && (
                      <p className="font-serif italic text-[12px] text-ink/65">{a.reason}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </BinderSection>

        {/* IV · Verfahren */}
        <BinderSection
          id="sec-verfahren"
          numeral="IV"
          title={t('chat.overview.procedures')}
          count={procedures.length}
        >
          {procedures.length === 0 ? (
            <Empty copy={t('chat.rail.proceduresEmpty')} />
          ) : (
            <ScheduleList>
              {procedures.map((p, idx) => (
                <ScheduleEntry
                  key={p.id}
                  index={idx + 1}
                  title={lang === 'en' ? p.title_en : p.title_de}
                  meta={<StatusPill status={p.status} />}
                  body={lang === 'en' ? p.rationale_en : p.rationale_de}
                  qualifier={`${p.qualifier.source} · ${p.qualifier.quality}`}
                />
              ))}
            </ScheduleList>
          )}
        </BinderSection>

        {/* V · Dokumente */}
        <BinderSection
          id="sec-dokumente"
          numeral="V"
          title={t('chat.overview.documents')}
          count={documents.length}
        >
          {documents.length === 0 ? (
            <Empty copy={t('chat.rail.documentsEmpty')} />
          ) : (
            <ScheduleList>
              {documents.map((d, idx) => (
                <ScheduleEntry
                  key={d.id}
                  index={idx + 1}
                  title={lang === 'en' ? d.title_en : d.title_de}
                  meta={<StatusPill status={d.status} />}
                  body={
                    d.required_for.length > 0
                      ? `${t('chat.overview.requiredFor')}: ${d.required_for.join(', ')}`
                      : undefined
                  }
                />
              ))}
            </ScheduleList>
          )}
        </BinderSection>

        {/* VI · Fachplaner */}
        <BinderSection
          id="sec-fachplaner"
          numeral="VI"
          title={t('chat.overview.roles')}
          count={roles.length}
        >
          {roles.length === 0 ? (
            <Empty copy={t('chat.rail.rolesEmpty')} />
          ) : (
            <ScheduleList>
              {roles
                .slice()
                .sort((a, b) => (a.needed === b.needed ? 0 : a.needed ? -1 : 1))
                .map((r, idx) => (
                  <ScheduleEntry
                    key={r.id}
                    index={idx + 1}
                    title={lang === 'en' ? r.title_en : r.title_de}
                    meta={
                      <span
                        className={
                          r.needed
                            ? 'text-[10px] uppercase tracking-[0.20em] text-clay'
                            : 'text-[10px] uppercase tracking-[0.20em] text-ink/40'
                        }
                      >
                        {r.needed ? t('chat.role.needed') : t('chat.role.notNeeded')}
                      </span>
                    }
                    body={r.rationale_de || undefined}
                    qualifier={`${r.qualifier.source} · ${r.qualifier.quality}`}
                  />
                ))}
            </ScheduleList>
          )}
        </BinderSection>

        {/* VII · Empfehlungen */}
        <BinderSection
          id="sec-empfehlungen"
          numeral="VII"
          title={t('chat.overview.recommendations')}
          count={recommendations.length}
        >
          {recommendations.length === 0 ? (
            <Empty copy={t('chat.rail.empty')} />
          ) : (
            <ol className="flex flex-col gap-6">
              {recommendations.map((r, idx) => (
                <li key={r.id} className="grid grid-cols-[40px_1fr] gap-x-4">
                  <span className="font-serif italic text-[28px] text-clay-deep tabular-figures leading-none">
                    {idx + 1}.
                  </span>
                  <div className="flex flex-col gap-2">
                    <p className="font-display text-title-lg text-ink leading-snug display-tight">
                      {lang === 'en' ? r.title_en : r.title_de}
                    </p>
                    <p className="text-[13px] text-ink/75 leading-[1.55]">
                      {lang === 'en' ? r.detail_en : r.detail_de}
                    </p>
                    <span aria-hidden="true" className="block h-px w-12 bg-border-strong/40 mt-1" />
                    <p className="font-serif italic text-[10px] text-ink/55 leading-relaxed">
                      {t('chat.preliminaryFooter')}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </BinderSection>

        {/* VIII · Audit log */}
        <BinderSection
          id="sec-audit"
          numeral="VIII"
          title={t('chat.overview.audit')}
          count={events?.length ?? 0}
        >
          {!events || events.length === 0 ? (
            <Empty copy={t('chat.overview.auditEmpty')} />
          ) : (
            <AuditTimeline events={events} />
          )}
        </BinderSection>
      </main>
    </div>
  )
}

function BinderSection({
  id,
  numeral,
  title,
  count,
  children,
}: {
  id: string
  numeral: string
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="flex flex-col gap-5 border-t border-ink/12 pt-8 scroll-mt-32"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          {numeral}
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {title}
        </span>
        {typeof count === 'number' && count > 0 && (
          <span className="font-serif italic text-[11px] text-clay/60 tabular-figures leading-none">
            {String(count).padStart(2, '0')}
          </span>
        )}
      </header>
      <div className="pl-14">{children}</div>
    </section>
  )
}

function ScheduleList({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col gap-5">{children}</ul>
}

function ScheduleEntry({
  index,
  title,
  meta,
  body,
  qualifier,
}: {
  index: number
  title: string
  meta?: React.ReactNode
  body?: string
  qualifier?: string
}) {
  return (
    <li className="grid grid-cols-[28px_1fr] gap-x-3">
      <span className="font-serif italic text-[12px] text-clay/55 tabular-figures pt-1 leading-none text-center">
        {String(index).padStart(2, '0')}
      </span>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[14px] font-medium text-ink leading-snug">{title}</p>
          {meta}
        </div>
        {body && (
          <p className="text-[12px] text-ink/70 leading-relaxed">{body}</p>
        )}
        {qualifier && (
          <p className="text-[10px] text-clay/65 italic uppercase tracking-[0.14em]">
            {qualifier}
          </p>
        )}
      </div>
    </li>
  )
}

function Empty({ copy }: { copy: string }) {
  return <p className="font-serif italic text-[12px] text-clay/70 leading-relaxed">{copy}</p>
}
