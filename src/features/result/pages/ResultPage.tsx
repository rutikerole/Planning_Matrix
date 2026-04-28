import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import { useProject } from '@/features/chat/hooks/useProject'
import { useMessages } from '@/features/chat/hooks/useMessages'
import { useProjectEvents } from '@/features/chat/hooks/useProjectEvents'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { CoverHero } from '../components/CoverHero'
import { VerdictSection } from '../components/VerdictSection'
import { TopThreeHero } from '../components/TopThreeHero'
import { LegalLandscape } from '../components/LegalLandscape'
import { DocumentChecklist } from '../components/DocumentChecklist'
import { SpecialistsRequired } from '../components/SpecialistsRequired'
import { CostTimelinePanel } from '../components/CostTimelinePanel'
import { RiskFlags } from '../components/RiskFlags'
import { ConfidenceDashboard } from '../components/ConfidenceDashboard'
import { ConversationAppendix } from '../components/ConversationAppendix'
import { SmartSuggestions } from '../components/SmartSuggestions'
import { ExportHub } from '../components/ExportHub'

interface ProjectEventRow {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

export type ResultSource =
  | { kind: 'owned' }
  | { kind: 'shared'; expiresAt: string }

interface BodyProps {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  source: ResultSource
}

/**
 * Phase 3.5 — Result Page (`/projects/:id/result`).
 *
 * Owned mode: fetches data from the authenticated session.
 * Shared mode (`/result/share/:token`): SharedResultPage prefetches
 * via Edge Function and renders the same `<ResultPageBody>` with
 * `source.kind === 'shared'` so mutation affordances hide.
 */
export function ResultPage() {
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const projectId = params.id ?? ''
  const { data: project } = useProject(projectId)
  const { data: messages } = useMessages(projectId)
  const { data: events } = useProjectEvents(projectId)

  useEffect(() => {
    if (project?.name) {
      document.title = `${t('result.titlePrefix', { defaultValue: 'Briefing' })} · ${project.name} · Planning Matrix`
    }
  }, [project?.name, t])

  if (!project) return null

  return (
    <ResultPageBody
      project={project}
      messages={messages ?? []}
      events={(events ?? []) as ProjectEventRow[]}
      source={{ kind: 'owned' }}
    />
  )
}

/**
 * Shared body — same composition in owned + shared modes. Each
 * section receives `source` so it can hide owner-only affordances.
 */
export function ResultPageBody({ project, messages, events, source }: BodyProps) {
  const { t } = useTranslation()
  const isShared = source.kind === 'shared'
  return (
    <div
      className="min-h-dvh bg-paper relative isolate"
      data-print-target="result-page"
      data-document-no={project.id}
    >
      <BlueprintSubstrate lensRadius={260} breathing={false} driftPx={0} />

      {/* Phase 3.7 #77 — Zurück-zum-Gespräch link in the top-left of
        * the result page, owner-mode only. Hidden in shared view (the
        * recipient never had a conversation to return to). Sized small
        * so it doesn't compete with the cover hero's typography but
        * gives the architect / Bauherr a clear way back. */}
      {!isShared && (
        <Link
          to={`/projects/${project.id}`}
          data-no-print="true"
          className="fixed top-5 left-5 z-30 inline-flex items-center gap-1.5 h-9 px-3 bg-paper/85 backdrop-blur-[2px] border border-ink/15 rounded-full text-[12.5px] text-ink/75 hover:text-ink hover:border-ink/30 hover:bg-paper transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          {t('result.backToChat', { defaultValue: 'Zurück zum Gespräch' })}
        </Link>
      )}

      <CoverHero project={project} messages={messages} source={source} />

      {/* Phase 3.6 #72 — sections II–XII run in operating mode. Cover
        * hero (Section I) stays atelier above this wrapper. */}
      <div data-mode="operating">
        <VerdictSection project={project} source={source} />
        <TopThreeHero state={(project.state ?? {}) as Partial<ProjectState>} />
        <LegalLandscape state={(project.state ?? {}) as Partial<ProjectState>} />
        <DocumentChecklist
          project={project}
          state={(project.state ?? {}) as Partial<ProjectState>}
        />
        <SpecialistsRequired state={(project.state ?? {}) as Partial<ProjectState>} />
        <CostTimelinePanel state={(project.state ?? {}) as Partial<ProjectState>} />
        <RiskFlags state={(project.state ?? {}) as Partial<ProjectState>} />
        <ConfidenceDashboard state={(project.state ?? {}) as Partial<ProjectState>} />
        <ConversationAppendix messages={messages} />
        {!isShared && (
          <SmartSuggestions
            project={project}
            state={(project.state ?? {}) as Partial<ProjectState>}
          />
        )}
        <ExportHub
          project={project}
          messages={messages}
          events={events}
          source={source}
        />
      </div>
    </div>
  )
}
