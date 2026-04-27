import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ChatWorkspaceLayout } from '../components/ChatWorkspaceLayout'
import { EmptyState } from '../components/EmptyState'
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

  return (
    <ChatWorkspaceLayout leftRail={null} rightRail={null}>
      {hasMessages ? <ThreadPlaceholder count={messages?.length ?? 0} /> : <EmptyState />}
    </ChatWorkspaceLayout>
  )
}

/**
 * Stand-in for commit #15. Confirms the page is reading the cache
 * correctly without yet rendering the typewriter or specialist tags.
 * Replaced wholesale in #15.
 */
function ThreadPlaceholder({ count }: { count: number }) {
  return (
    <div className="text-sm text-ink/55 italic">
      [{count} message{count === 1 ? '' : 's'} loaded — Thread renders in commit #15]
    </div>
  )
}
