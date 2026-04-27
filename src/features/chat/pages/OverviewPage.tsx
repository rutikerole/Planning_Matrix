import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'
import { useProject } from '../hooks/useProject'
import { useProjectEvents } from '../hooks/useProjectEvents'
import { StatusPill } from '../components/StatusPill'
import type { ProjectState } from '@/types/projectState'

/**
 * Read-only architect's view of the full project state. Reads project
 * state plus the latest 30 project_events. CLIENT users see this read-
 * only (the brief notes Designer-side editing arrives in Phase 4).
 *
 * Implemented as a route page rather than an in-app modal — simpler
 * routing, deep-linkable, Esc handler is plain navigate-back.
 */
export function OverviewPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = id ?? ''
  const { data: project } = useProject(projectId)
  const { data: events } = useProjectEvents(projectId)
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

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-10 bg-paper/95 backdrop-blur-[2px] border-b border-border-strong/30">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-10 lg:px-14 flex h-16 md:h-[72px] items-center justify-between gap-4">
          <Wordmark size="sm" />
          <p className="hidden sm:block text-[12px] text-clay/85 truncate max-w-md">
            {t('chat.overview.eyebrow')} · {project.name}
          </p>
          <div className="flex items-center gap-3">
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
      </header>

      <main className="mx-auto max-w-[1100px] px-6 sm:px-10 lg:px-14 py-12 flex flex-col gap-12">
        <div>
          <p className="eyebrow text-foreground/60 text-[11px] tracking-[0.18em] mb-3">
            {t('chat.overview.eyebrow')}
          </p>
          <h1 className="font-display text-display-3 text-ink leading-[1.05] -tracking-[0.02em]">
            {project.name}
          </h1>
        </div>

        {/* Eckdaten */}
        <Section title={t('chat.overview.facts')}>
          {facts.length === 0 ? (
            <Empty copy={t('chat.overview.factsEmpty')} />
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {facts.map((f, i) => (
                <li key={`${f.key}-${i}`} className="flex flex-col gap-1">
                  <span className="text-[10px] text-clay/85 uppercase tracking-[0.18em]">
                    {f.key}
                  </span>
                  <span className="text-[14px] font-medium text-ink leading-snug break-words">
                    {typeof f.value === 'string' ? f.value : JSON.stringify(f.value)}
                  </span>
                  <span className="text-[9px] text-clay/60 italic uppercase tracking-[0.14em]">
                    {f.qualifier.source} · {f.qualifier.quality}
                  </span>
                  {f.evidence && (
                    <span className="text-[11px] text-ink/60 italic mt-0.5">{f.evidence}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Bereiche */}
        <Section title={t('chat.overview.areas')}>
          <ul className="flex flex-col gap-4">
            {(['A', 'B', 'C'] as const).map((key) => {
              const a = areas[key] ?? { state: 'PENDING' as const }
              return (
                <li key={key} className="flex flex-col gap-1">
                  <p className="text-[14px] font-medium text-ink">
                    <span className="font-mono text-[11px] text-ink/45 mr-3">{key}</span>
                    {t(`chat.areas.${key}`)}
                    <span className="ml-3 text-[10px] uppercase tracking-[0.16em] text-clay">
                      {t(`chat.areas.state.${a.state.toLowerCase()}`)}
                    </span>
                  </p>
                  {a.reason && <p className="text-[12px] text-ink/65 italic">{a.reason}</p>}
                </li>
              )
            })}
          </ul>
        </Section>

        {/* Verfahren */}
        <Section title={t('chat.overview.procedures')}>
          {procedures.length === 0 ? (
            <Empty copy={t('chat.rail.proceduresEmpty')} />
          ) : (
            <ul className="flex flex-col gap-4">
              {procedures.map((p) => (
                <li key={p.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[14px] font-medium text-ink">
                      {lang === 'en' ? p.title_en : p.title_de}
                    </p>
                    <StatusPill status={p.status} />
                  </div>
                  <p className="text-[12px] text-ink/70 leading-relaxed">
                    {lang === 'en' ? p.rationale_en : p.rationale_de}
                  </p>
                  <p className="text-[10px] text-clay/65 italic uppercase tracking-[0.14em]">
                    {p.qualifier.source} · {p.qualifier.quality}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Dokumente */}
        <Section title={t('chat.overview.documents')}>
          {documents.length === 0 ? (
            <Empty copy={t('chat.rail.documentsEmpty')} />
          ) : (
            <ul className="flex flex-col gap-4">
              {documents.map((d) => (
                <li key={d.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[14px] font-medium text-ink">
                      {lang === 'en' ? d.title_en : d.title_de}
                    </p>
                    <StatusPill status={d.status} />
                  </div>
                  {d.required_for.length > 0 && (
                    <p className="text-[11px] text-ink/65">
                      {t('chat.overview.requiredFor')}: {d.required_for.join(', ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Fachplaner */}
        <Section title={t('chat.overview.roles')}>
          {roles.length === 0 ? (
            <Empty copy={t('chat.rail.rolesEmpty')} />
          ) : (
            <ul className="flex flex-col gap-4">
              {roles
                .slice()
                .sort((a, b) => (a.needed === b.needed ? 0 : a.needed ? -1 : 1))
                .map((r) => (
                  <li key={r.id} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[14px] font-medium text-ink">
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
                      <p className="text-[12px] text-ink/70 leading-relaxed">{r.rationale_de}</p>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </Section>

        {/* Empfehlungen */}
        <Section title={t('chat.overview.recommendations')}>
          {recommendations.length === 0 ? (
            <Empty copy={t('chat.rail.empty')} />
          ) : (
            <ol className="flex flex-col gap-5">
              {recommendations.map((r) => (
                <li key={r.id} className="flex flex-col gap-1">
                  <p className="font-display text-title-lg text-ink leading-snug">
                    <span className="font-serif italic text-[16px] text-clay tabular-nums mr-2.5">
                      {r.rank}.
                    </span>
                    {lang === 'en' ? r.title_en : r.title_de}
                  </p>
                  <p className="text-[13px] text-ink/75 leading-relaxed">
                    {lang === 'en' ? r.detail_en : r.detail_de}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {/* Audit log */}
        <Section title={t('chat.overview.audit')}>
          {!events || events.length === 0 ? (
            <Empty copy={t('chat.overview.auditEmpty')} />
          ) : (
            <ol className="flex flex-col gap-2 font-mono text-[11px] tabular-nums">
              {events.map((ev) => (
                <li key={ev.id} className="flex items-baseline gap-3 text-ink/75">
                  <span className="text-clay/80">
                    {new Date(ev.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'de-DE')}
                  </span>
                  <span className="text-ink/50">{ev.triggered_by}</span>
                  <span>{ev.event_type}</span>
                  {ev.reason && <span className="text-ink/55 italic">{ev.reason}</span>}
                </li>
              ))}
            </ol>
          )}
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border-t border-border-strong/30 pt-8">
      <p className="eyebrow text-foreground/60 text-[10px] tracking-[0.18em]">{title}</p>
      {children}
    </section>
  )
}

function Empty({ copy }: { copy: string }) {
  return <p className="text-[12px] text-clay/70 italic leading-relaxed">{copy}</p>
}
