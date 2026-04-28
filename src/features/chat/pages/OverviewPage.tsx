// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #71 — Overview cockpit (operating mode)
//
// Drops the editorial register Rutik called "newspaper or blog." Eight
// tabs, each a Linear-style table: Projekt / Daten / Bereiche /
// Verfahren / Dokumente / Team / Empfehlungen / Audit. Edit-in-place
// on every CLIENT-source fact (Q4 locked). Paper substrate stays;
// huge italic Serif headlines are gone; densities are honest.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { factLabel, factValueWithUnit } from '@/lib/factLabel'
import { useProject } from '../hooks/useProject'
import { useProjectEvents } from '../hooks/useProjectEvents'
import { useMessages } from '../hooks/useMessages'
import type {
  Fact,
  ProjectState,
  Recommendation,
  Role,
} from '@/types/projectState'
import { CockpitHeader } from '../../result/components/Cockpit/CockpitHeader'
import {
  CockpitTabs,
  type CockpitTab,
} from '../../result/components/Cockpit/CockpitTabs'
import {
  CockpitTable,
  type CockpitColumn,
} from '../../result/components/Cockpit/CockpitTable'
import {
  StatusPill,
  type CockpitStatusKind,
} from '../../result/components/Cockpit/StatusPill'
import { QualifierBadge } from '../../result/components/Cockpit/QualifierBadge'
import { EditableCell } from '../../result/components/Cockpit/EditableCell'
import { saveFactValue } from '../../result/components/Cockpit/saveFact'

type TabId =
  | 'project'
  | 'facts'
  | 'areas'
  | 'procedures'
  | 'documents'
  | 'roles'
  | 'recommendations'
  | 'audit'

export function OverviewPage() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const projectId = id ?? ''
  const { data: project } = useProject(projectId)
  const { data: events } = useProjectEvents(projectId)
  const { data: messages } = useMessages(projectId)

  const [active, setActive] = useState<TabId>('project')

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
  const recommendations = (state.recommendations ?? [])
    .slice()
    .sort((a, b) => a.rank - b.rank)
  const areas =
    state.areas ?? {
      A: { state: 'PENDING' as const },
      B: { state: 'PENDING' as const },
      C: { state: 'PENDING' as const },
    }

  const tabs: CockpitTab<TabId>[] = [
    { id: 'project', label: t('cockpit.tabs.project', { defaultValue: 'Projekt' }) },
    {
      id: 'facts',
      label: t('cockpit.tabs.facts', { defaultValue: 'Daten' }),
      count: facts.length,
    },
    {
      id: 'areas',
      label: t('cockpit.tabs.areas', { defaultValue: 'Bereiche' }),
    },
    {
      id: 'procedures',
      label: t('cockpit.tabs.procedures', { defaultValue: 'Verfahren' }),
      count: procedures.length,
    },
    {
      id: 'documents',
      label: t('cockpit.tabs.documents', { defaultValue: 'Dokumente' }),
      count: documents.length,
    },
    {
      id: 'roles',
      label: t('cockpit.tabs.roles', { defaultValue: 'Team' }),
      count: roles.length,
    },
    {
      id: 'recommendations',
      label: t('cockpit.tabs.recommendations', { defaultValue: 'Empfehlungen' }),
      count: recommendations.length,
    },
    {
      id: 'audit',
      label: t('cockpit.tabs.audit', { defaultValue: 'Audit' }),
      count: events?.length ?? 0,
    },
  ]

  return (
    <div className="min-h-dvh bg-paper" data-mode="operating">
      <CockpitHeader
        project={project}
        messages={messages ?? []}
        events={events ?? []}
        closeTo={`/projects/${projectId}`}
      />
      <CockpitTabs<TabId> tabs={tabs} active={active} onChange={setActive} />

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8">
        {active === 'project' && (
          <ProjectMetaTab project={project} />
        )}
        {active === 'facts' && (
          <FactsTab
            facts={facts}
            lang={lang}
            onSave={async (key, next) =>
              saveFactValue({
                queryClient,
                projectId,
                factKey: key,
                nextValue: next,
              })
            }
          />
        )}
        {active === 'areas' && <AreasTab areas={areas} />}
        {active === 'procedures' && (
          <ProceduresTab procedures={procedures} lang={lang} />
        )}
        {active === 'documents' && (
          <DocumentsTab documents={documents} lang={lang} />
        )}
        {active === 'roles' && <RolesTab roles={roles} lang={lang} />}
        {active === 'recommendations' && (
          <RecommendationsTab
            recommendations={recommendations}
            lang={lang}
          />
        )}
        {active === 'audit' && <AuditTab events={events ?? []} lang={lang} />}
      </main>

      <footer className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-10 mt-auto">
        <p className="text-[11px] italic text-clay/65 leading-relaxed">
          {t('chat.preliminaryFooter')}
        </p>
      </footer>
    </div>
  )
}

// ── Tab: Projekt (project meta) ────────────────────────────────────────

function ProjectMetaTab({ project }: { project: NonNullable<ReturnType<typeof useProject>['data']> }) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const rows = [
    {
      key: 'name',
      label: t('cockpit.project.name', { defaultValue: 'Projektname' }),
      value: project.name,
    },
    {
      key: 'intent',
      label: t('cockpit.project.intent', { defaultValue: 'Vorhaben' }),
      value: t(`wizard.q1.options.${project.intent}`, {
        defaultValue: project.intent,
      }),
    },
    {
      key: 'plot',
      label: t('cockpit.project.plot', { defaultValue: 'Grundstück' }),
      value: project.plot_address ?? '—',
    },
    {
      key: 'bundesland',
      label: t('cockpit.project.bundesland', { defaultValue: 'Bundesland' }),
      value: project.bundesland,
    },
    {
      key: 'template',
      label: t('cockpit.project.template', { defaultValue: 'Template' }),
      value: project.template_id,
    },
    {
      key: 'created',
      label: t('cockpit.project.created', { defaultValue: 'Erstellt' }),
      value: formatDate(project.created_at, lang),
    },
    {
      key: 'updated',
      label: t('cockpit.project.updated', { defaultValue: 'Zuletzt aktiv' }),
      value: formatDate(project.updated_at, lang),
    },
  ]

  return (
    <CockpitTable
      rows={rows}
      rowKey={(r) => r.key}
      emptyMessage="—"
      columns={[
        {
          id: 'label',
          header: t('cockpit.cols.attribute', { defaultValue: 'Attribut' }),
          render: (r) => <span className="text-ink/70">{r.label}</span>,
          className: 'w-1/3',
        },
        {
          id: 'value',
          header: t('cockpit.cols.value', { defaultValue: 'Wert' }),
          render: (r) => <span className="text-ink">{r.value}</span>,
        },
      ]}
    />
  )
}

// ── Tab: Daten (facts) ─────────────────────────────────────────────────

function FactsTab({
  facts,
  lang,
  onSave,
}: {
  facts: Fact[]
  lang: 'de' | 'en'
  onSave: (key: string, next: string) => Promise<void>
}) {
  const { t } = useTranslation()

  type Row = { fact: Fact; label: string; value: string; isClient: boolean }
  const rows: Row[] = useMemo(
    () =>
      facts.map((f) => ({
        fact: f,
        label: factLabel(f.key, lang).label,
        value: factValueWithUnit(f.key, f.value, lang),
        isClient: f.qualifier?.source === 'CLIENT',
      })),
    [facts, lang],
  )

  const columns: CockpitColumn<Row>[] = [
    {
      id: 'label',
      header: t('cockpit.cols.label', { defaultValue: 'Bezeichnung' }),
      sortValue: (r) => r.label.toLowerCase(),
      render: (r) => <span className="text-ink/70">{r.label}</span>,
      className: 'w-2/5',
    },
    {
      id: 'value',
      header: t('cockpit.cols.value', { defaultValue: 'Wert' }),
      render: (r) => (
        <EditableCell
          value={r.value}
          readOnly={!r.isClient}
          ariaLabel={`${r.label} bearbeiten`}
          onSave={(next) => onSave(r.fact.key, next)}
        />
      ),
    },
    {
      id: 'qualifier',
      header: t('cockpit.cols.qualifier', { defaultValue: 'Quelle' }),
      sortValue: (r) => `${r.fact.qualifier.source}-${r.fact.qualifier.quality}`,
      render: (r) => <QualifierBadge qualifier={r.fact.qualifier} />,
      className: 'w-32',
    },
    {
      id: 'evidence',
      header: t('cockpit.cols.evidence', { defaultValue: 'Beleg' }),
      render: (r) => (
        <span className="text-[12px] italic text-ink/55 line-clamp-2">
          {r.fact.evidence ?? r.fact.qualifier.reason ?? '—'}
        </span>
      ),
      className: 'w-1/4',
    },
  ]

  return (
    <CockpitTable
      rows={rows}
      rowKey={(r) => r.fact.key}
      columns={columns}
      searchable={(r) =>
        `${r.label} ${r.value} ${r.fact.evidence ?? ''} ${r.fact.qualifier.reason ?? ''}`
      }
      searchPlaceholder={t('cockpit.search', { defaultValue: 'Daten durchsuchen…' })}
      emptyMessage={t('chat.overview.factsEmpty')}
    />
  )
}

// ── Tab: Bereiche ──────────────────────────────────────────────────────

interface AreaRow {
  letter: 'A' | 'B' | 'C'
  state: 'ACTIVE' | 'PENDING' | 'VOID'
  reason?: string
}

function AreasTab({
  areas,
}: {
  areas: NonNullable<ProjectState['areas']>
}) {
  const { t } = useTranslation()
  const rows: AreaRow[] = (['A', 'B', 'C'] as const).map((key) => ({
    letter: key,
    state: areas[key]?.state ?? 'PENDING',
    reason: areas[key]?.reason,
  }))

  const stateKind = (s: AreaRow['state']): CockpitStatusKind =>
    s === 'ACTIVE' ? 'active' : s === 'VOID' ? 'void' : 'pending'

  return (
    <CockpitTable
      rows={rows}
      rowKey={(r) => r.letter}
      emptyMessage="—"
      columns={[
        {
          id: 'letter',
          header: '',
          render: (r) => (
            <span className="font-medium tracking-[0.18em] text-clay/85 text-[12px]">
              {r.letter}
            </span>
          ),
          className: 'w-12',
        },
        {
          id: 'name',
          header: t('chat.overview.areas', { defaultValue: 'Bereich' }),
          render: (r) => (
            <span className="text-ink">{t(`chat.areas.${r.letter}`)}</span>
          ),
        },
        {
          id: 'state',
          header: t('cockpit.cols.state', { defaultValue: 'Status' }),
          render: (r) => <StatusPill kind={stateKind(r.state)} />,
          className: 'w-32',
        },
        {
          id: 'reason',
          header: t('cockpit.cols.reason', { defaultValue: 'Begründung' }),
          render: (r) => (
            <span className="text-[12px] italic text-ink/65">
              {r.reason ?? '—'}
            </span>
          ),
          className: 'w-2/5',
        },
      ]}
    />
  )
}

// ── Tab: Verfahren ─────────────────────────────────────────────────────

function ProceduresTab({
  procedures,
  lang,
}: {
  procedures: NonNullable<ProjectState['procedures']>
  lang: 'de' | 'en'
}) {
  const { t } = useTranslation()
  type Row = { p: NonNullable<ProjectState['procedures']>[number]; title: string }
  const rows: Row[] = procedures.map((p) => ({
    p,
    title: lang === 'en' ? p.title_en : p.title_de,
  }))
  return (
    <CockpitTable
      rows={rows}
      rowKey={(r) => r.p.id}
      searchable={(r) =>
        `${r.title} ${lang === 'en' ? r.p.rationale_en : r.p.rationale_de}`
      }
      searchPlaceholder={t('cockpit.search', { defaultValue: 'Verfahren durchsuchen…' })}
      emptyMessage={t('chat.rail.proceduresEmpty')}
      columns={[
        {
          id: 'title',
          header: t('cockpit.cols.title', { defaultValue: 'Verfahren' }),
          sortValue: (r) => r.title.toLowerCase(),
          render: (r) => <span className="text-ink">{r.title}</span>,
        },
        {
          id: 'status',
          header: t('cockpit.cols.state', { defaultValue: 'Status' }),
          render: (r) => <StatusPill kind={statusKindFromItemStatus(r.p.status)} />,
          className: 'w-36',
        },
        {
          id: 'rationale',
          header: t('cockpit.cols.rationale', { defaultValue: 'Begründung' }),
          render: (r) => (
            <span className="text-[12px] italic text-ink/65">
              {(lang === 'en' ? r.p.rationale_en : r.p.rationale_de) || '—'}
            </span>
          ),
          className: 'w-2/5',
        },
        {
          id: 'qualifier',
          header: t('cockpit.cols.qualifier', { defaultValue: 'Quelle' }),
          render: (r) => <QualifierBadge qualifier={r.p.qualifier} />,
          className: 'w-28',
        },
      ]}
    />
  )
}

// ── Tab: Dokumente ─────────────────────────────────────────────────────

function DocumentsTab({
  documents,
  lang,
}: {
  documents: NonNullable<ProjectState['documents']>
  lang: 'de' | 'en'
}) {
  const { t } = useTranslation()
  type Row = { d: NonNullable<ProjectState['documents']>[number]; title: string }
  const rows: Row[] = documents.map((d) => ({
    d,
    title: lang === 'en' ? d.title_en : d.title_de,
  }))
  return (
    <CockpitTable
      rows={rows}
      rowKey={(r) => r.d.id}
      searchable={(r) => `${r.title} ${r.d.required_for.join(' ')}`}
      searchPlaceholder={t('cockpit.search', { defaultValue: 'Dokumente durchsuchen…' })}
      emptyMessage={t('chat.rail.documentsEmpty')}
      columns={[
        {
          id: 'title',
          header: t('cockpit.cols.title', { defaultValue: 'Dokument' }),
          sortValue: (r) => r.title.toLowerCase(),
          render: (r) => <span className="text-ink">{r.title}</span>,
        },
        {
          id: 'status',
          header: t('cockpit.cols.state', { defaultValue: 'Status' }),
          render: (r) => <StatusPill kind={statusKindFromItemStatus(r.d.status)} />,
          className: 'w-36',
        },
        {
          id: 'required_for',
          header: t('cockpit.cols.requiredFor', { defaultValue: 'Erforderlich für' }),
          render: (r) => (
            <span className="text-[12px] text-ink/65">
              {r.d.required_for.length > 0 ? r.d.required_for.join(', ') : '—'}
            </span>
          ),
          className: 'w-1/3',
        },
        {
          id: 'qualifier',
          header: t('cockpit.cols.qualifier', { defaultValue: 'Quelle' }),
          render: (r) => <QualifierBadge qualifier={r.d.qualifier} />,
          className: 'w-28',
        },
      ]}
    />
  )
}

// ── Tab: Team / Rollen ─────────────────────────────────────────────────

function RolesTab({
  roles,
  lang,
}: {
  roles: Role[]
  lang: 'de' | 'en'
}) {
  const { t } = useTranslation()
  type Row = { r: Role; title: string }
  const rows: Row[] = [...roles]
    .sort((a, b) => (a.needed === b.needed ? 0 : a.needed ? -1 : 1))
    .map((r) => ({ r, title: lang === 'en' ? r.title_en : r.title_de }))
  return (
    <CockpitTable
      rows={rows}
      rowKey={(r) => r.r.id}
      searchable={(r) => `${r.title} ${r.r.rationale_de ?? ''}`}
      searchPlaceholder={t('cockpit.search', { defaultValue: 'Team durchsuchen…' })}
      emptyMessage={t('chat.rail.rolesEmpty')}
      columns={[
        {
          id: 'title',
          header: t('cockpit.cols.title', { defaultValue: 'Rolle' }),
          sortValue: (r) => r.title.toLowerCase(),
          render: (r) => <span className="text-ink">{r.title}</span>,
        },
        {
          id: 'needed',
          header: t('cockpit.cols.state', { defaultValue: 'Status' }),
          render: (r) => (
            <StatusPill kind={r.r.needed ? 'needed' : 'not_needed'} />
          ),
          className: 'w-32',
        },
        {
          id: 'rationale',
          header: t('cockpit.cols.rationale', { defaultValue: 'Begründung' }),
          render: (r) => (
            <span className="text-[12px] italic text-ink/65">
              {r.r.rationale_de ?? '—'}
            </span>
          ),
          className: 'w-1/2',
        },
        {
          id: 'qualifier',
          header: t('cockpit.cols.qualifier', { defaultValue: 'Quelle' }),
          render: (r) => <QualifierBadge qualifier={r.r.qualifier} />,
          className: 'w-28',
        },
      ]}
    />
  )
}

// ── Tab: Empfehlungen ──────────────────────────────────────────────────

function RecommendationsTab({
  recommendations,
  lang,
}: {
  recommendations: Recommendation[]
  lang: 'de' | 'en'
}) {
  const { t } = useTranslation()
  return (
    <CockpitTable
      rows={recommendations}
      rowKey={(r) => r.id}
      emptyMessage={t('chat.rail.empty')}
      columns={[
        {
          id: 'rank',
          header: '#',
          sortValue: (r) => r.rank,
          render: (r) => (
            <span className="font-medium tabular-nums text-clay">{r.rank}</span>
          ),
          className: 'w-10',
        },
        {
          id: 'title',
          header: t('cockpit.cols.title', { defaultValue: 'Empfehlung' }),
          sortValue: (r) => (lang === 'en' ? r.title_en : r.title_de).toLowerCase(),
          render: (r) => (
            <span className="text-ink font-medium leading-snug">
              {lang === 'en' ? r.title_en : r.title_de}
            </span>
          ),
        },
        {
          id: 'detail',
          header: t('cockpit.cols.detail', { defaultValue: 'Details' }),
          render: (r) => (
            <span className="text-[12px] text-ink/70 leading-snug line-clamp-3">
              {lang === 'en' ? r.detail_en : r.detail_de}
            </span>
          ),
          className: 'w-2/5',
        },
        {
          id: 'effort',
          header: t('cockpit.cols.effort', { defaultValue: 'Aufwand' }),
          render: (r) =>
            r.estimated_effort ? (
              <span className="text-[11px] uppercase tracking-[0.14em] text-clay">
                {r.estimated_effort}
              </span>
            ) : (
              <span className="text-ink/30">—</span>
            ),
          className: 'w-24',
        },
        {
          id: 'owner',
          header: t('cockpit.cols.owner', { defaultValue: 'Verantwortlich' }),
          render: (r) =>
            r.responsible_party ? (
              <span className="text-[12px] capitalize text-ink/70">
                {r.responsible_party}
              </span>
            ) : (
              <span className="text-ink/30">—</span>
            ),
          className: 'w-32',
        },
      ]}
    />
  )
}

// ── Tab: Audit ─────────────────────────────────────────────────────────

interface ProjectEventLike {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

function AuditTab({
  events,
  lang,
}: {
  events: ProjectEventLike[]
  lang: 'de' | 'en'
}) {
  const { t } = useTranslation()
  return (
    <CockpitTable
      rows={events}
      rowKey={(e) => e.id}
      searchable={(e) => `${e.event_type} ${e.reason ?? ''} ${e.triggered_by}`}
      searchPlaceholder={t('cockpit.search', { defaultValue: 'Audit durchsuchen…' })}
      emptyMessage={t('chat.overview.auditEmpty')}
      columns={[
        {
          id: 'when',
          header: t('cockpit.cols.when', { defaultValue: 'Zeitpunkt' }),
          sortValue: (e) => e.created_at,
          render: (e) => (
            <span className="font-serif italic text-clay-deep tabular-nums whitespace-nowrap">
              {formatDateTime(e.created_at, lang)}
            </span>
          ),
          className: 'w-44',
        },
        {
          id: 'type',
          header: t('cockpit.cols.event', { defaultValue: 'Ereignis' }),
          sortValue: (e) => e.event_type,
          render: (e) => <span className="text-ink">{e.event_type}</span>,
          className: 'w-1/3',
        },
        {
          id: 'who',
          header: t('cockpit.cols.who', { defaultValue: 'Ausgelöst' }),
          render: (e) => (
            <span className="text-[12px] uppercase tracking-[0.14em] text-clay">
              {e.triggered_by}
            </span>
          ),
          className: 'w-32',
        },
        {
          id: 'reason',
          header: t('cockpit.cols.reason', { defaultValue: 'Grund' }),
          render: (e) => (
            <span className="text-[12px] italic text-ink/65">
              {e.reason ?? '—'}
            </span>
          ),
        },
      ]}
    />
  )
}

// ── Helpers ────────────────────────────────────────────────────────────

function statusKindFromItemStatus(s: string): CockpitStatusKind {
  switch (s) {
    case 'erforderlich':
      return 'erforderlich'
    case 'liegt_vor':
      return 'liegt_vor'
    case 'eingereicht':
      return 'eingereicht'
    case 'genehmigt':
      return 'genehmigt'
    case 'freigegeben':
      return 'freigegeben'
    case 'nicht_erforderlich':
      return 'nicht_erforderlich'
    default:
      return 'pending'
  }
}

function formatDate(iso: string, lang: 'de' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string, lang: 'de' | 'en'): string {
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
