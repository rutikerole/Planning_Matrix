import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChatWorkspaceLayout } from '../components/ChatWorkspaceLayout'
import { EmptyState } from '../components/EmptyState'
import { LeftRail } from '../components/LeftRail'
import { RightRail } from '../components/RightRail'
import { Thread } from '../components/Thread'
import { InputBar } from '../components/Input'
import { IdkPopover } from '../components/Input/IdkPopover'
import { OfflineBanner } from '../components/Banners'
import { buildUserMessageText } from '../lib/userAnswerHelpers'
import { useProject } from '../hooks/useProject'
import { useMessages } from '../hooks/useMessages'
import { useChatTurn } from '../hooks/useChatTurn'
import { useChatStore } from '@/stores/chatStore'
import type { UserAnswer } from '@/types/chatTurn'

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

  const [idkOpen, setIdkOpen] = useState(false)
  const chatTurn = useChatTurn(projectId)
  const isThinking = useChatStore((s) => s.isAssistantThinking)

  // Reset chat store when navigating away from a project.
  const resetChatStore = useChatStore((s) => s.reset)
  useEffect(() => () => resetChatStore(), [projectId, resetChatStore])

  if (!project) return null

  const handleSubmit = (payload: { userMessage: string; userAnswer: UserAnswer }) => {
    chatTurn.mutate(payload)
  }

  const handleIdkChoose = (mode: 'research' | 'assume' | 'skip') => {
    const answer: UserAnswer = { kind: 'idk', mode }
    handleSubmit({ userMessage: buildUserMessageText(answer), userAnswer: answer })
  }

  return (
    <>
      <OfflineBanner />
      <ChatWorkspaceLayout
        leftRail={<LeftRail project={project} messages={messages ?? []} />}
        rightRail={<RightRail project={project} />}
        inputBar={
          hasMessages ? (
            <InputBar
              lastAssistant={lastAssistant}
              onSubmit={handleSubmit}
              onIdkClick={() => setIdkOpen(true)}
              forceDisabled={isThinking}
            />
          ) : null
        }
      >
        {hasMessages ? <Thread messages={messages ?? []} /> : <EmptyState />}
      </ChatWorkspaceLayout>

      <IdkPopover
        open={idkOpen}
        onClose={() => setIdkOpen(false)}
        onChoose={handleIdkChoose}
      />
    </>
  )
}
