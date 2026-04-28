import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const isShared = source.kind === 'shared'
  return (
    <div
      className="min-h-dvh bg-paper relative isolate"
      data-print-target="result-page"
      data-document-no={project.id}
    >
      <BlueprintSubstrate lensRadius={260} breathing={false} driftPx={0} />

      <CoverHero project={project} messages={messages} source={source} />
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
  )
}
