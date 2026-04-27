import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ChatWorkspaceLayout } from '../components/ChatWorkspaceLayout'
import { EmptyState } from '../components/EmptyState'
import { LeftRail } from '../components/LeftRail'
import { RightRail } from '../components/RightRail'
import { Thread } from '../components/Thread'
import { InputBar } from '../components/Input'
import { useProject } from '../hooks/useProject'
import { useMessages } from '../hooks/useMessages'

/**
 * /projects/:id workspace. ProjectGuard upstream has already verified
 * existence + ownership, so on entry the project is guaranteed available
 * via the shared TanStack Query cache.
 *
 * Center column logic for commit #13 is intentionally minimal: empty
 * state when there are no messages, a placeholder thread when there are.
 * Real Thread + MessageUser/MessageAssistant/MessageSystem land in
 * commit #15; rails populate in commit #14.
 */
export function ChatWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const projectId = id ?? ''
  const { data: project } = useProject(projectId)
  const { data: messages } = useMessages(projectId)

  useEffect(() => {
    if (project?.name) {
      document.title = `${project.name} · Planning Matrix`
    }
  }, [project?.name])

  const hasMessages = (messages?.length ?? 0) > 0
  const lastAssistant =
    [...(messages ?? [])]
      .reverse()
      .find((m) => m.role === 'assistant') ?? null

  if (!project) return null

  // Stub onSubmit for #16; real useChatTurn mutation lands in commit #19.
  const handleSubmit = (payload: unknown) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[chat] submit (stub — wired in commit #19)', payload)
    }
  }

  return (
    <ChatWorkspaceLayout
      leftRail={<LeftRail project={project} messages={messages ?? []} />}
      rightRail={<RightRail project={project} />}
      inputBar={
        hasMessages ? (
          <InputBar lastAssistant={lastAssistant} onSubmit={handleSubmit} />
        ) : null
      }
    >
      {hasMessages ? <Thread messages={messages ?? []} /> : <EmptyState />}
    </ChatWorkspaceLayout>
  )
}
