import { useParams } from 'react-router-dom'
import { SEO } from '@/components/SEO'
import { useProject } from '@/features/chat/hooks/useProject'
import { useMessages } from '@/features/chat/hooks/useMessages'
import { useProjectEvents } from '@/features/chat/hooks/useProjectEvents'
import type { MessageRow, ProjectRow } from '@/types/db'
import { ResultWorkspace, type ResultSource } from '../components/ResultWorkspace'

interface ProjectEventRow {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

export type { ResultSource }

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
  const params = useParams<{ id: string }>()
  const projectId = params.id ?? ''
  const { data: project } = useProject(projectId)
  const { data: messages } = useMessages(projectId)
  const { data: events } = useProjectEvents(projectId)

  if (!project) return null

  return (
    <>
      <SEO titleKey="seo.title.result" params={{ name: project.name }} />
      <ResultPageBody
        project={project}
        messages={messages ?? []}
        events={(events ?? []) as ProjectEventRow[]}
        source={{ kind: 'owned' }}
      />
    </>
  )
}

/**
 * Phase 8 — `ResultPageBody` is now a thin wrapper around
 * `<ResultWorkspace>`. Owned and shared modes both render the same
 * tabbed surface; affordances (footer share link, write actions) are
 * gated on `source.kind` inside the workspace.
 */
export function ResultPageBody({ project, messages, events, source }: BodyProps) {
  return (
    <ResultWorkspace
      project={project}
      messages={messages}
      events={events}
      source={source}
    />
  )
}
