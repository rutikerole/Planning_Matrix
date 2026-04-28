import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { ChatWorkspaceLayout } from '../components/ChatWorkspaceLayout'
import { EmptyState } from '../components/EmptyState'
import { LeftRail } from '../components/LeftRail'
import { RightRail } from '../components/RightRail'
import { Thread } from '../components/Thread'
import { InputBar } from '../components/Input'
import { IdkPopover } from '../components/Input/IdkPopover'
import { OfflineBanner } from '../components/Banners'
import { MobileTopBar } from '../components/MobileTopBar'
import { MobileRailDrawer } from '../components/MobileRailDrawer'
import { MobileRightRailPeek } from '../components/MobileRightRailPeek'
import { buildUserMessageText } from '../lib/userAnswerHelpers'
import { useProject } from '../hooks/useProject'
import { useMessages } from '../hooks/useMessages'
import { useChatTurn } from '../hooks/useChatTurn'
import { useChatStore } from '@/stores/chatStore'
import type { UserAnswer } from '@/types/chatTurn'
import type { MessageRow } from '@/types/db'

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
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const projectId = id ?? ''
  const { data: project } = useProject(projectId)
  const { data: messages } = useMessages(projectId)

  useEffect(() => {
    if (project?.name) {
      document.title = `${project.name} · Planning Matrix`
    }
  }, [project?.name])

  // D12 — when intent is "sonstige", surface a calm in-thread SYSTEM
  // notice on the very first turn that the standard T-01 template is in
  // use. Client-side only — never persisted.
  const augmentedMessages = useMemo<MessageRow[]>(() => {
    if (!messages || !project) return messages ?? []
    if (project.intent !== 'sonstige') return messages
    if (messages.length === 0) return messages
    const synthetic: MessageRow = {
      id: 'system:sonstige-notice',
      project_id: projectId,
      role: 'system',
      specialist: null,
      content_de: t('chat.system.fallbackTemplateNotice'),
      content_en: t('chat.system.fallbackTemplateNotice', { lng: 'en' }),
      input_type: null,
      input_options: null,
      allow_idk: null,
      user_answer: null,
      client_request_id: null,
      model: null,
      input_tokens: null,
      output_tokens: null,
      cache_read_tokens: null,
      cache_write_tokens: null,
      latency_ms: null,
      created_at: messages[0].created_at,
    }
    return [synthetic, ...messages]
  }, [messages, project, projectId, t])

  const hasMessages = (messages?.length ?? 0) > 0
  const lastAssistant =
    [...(messages ?? [])]
      .reverse()
      .find((m) => m.role === 'assistant') ?? null

  const [idkOpen, setIdkOpen] = useState(false)
  const chatTurn = useChatTurn(projectId)
  const isThinking = useChatStore((s) => s.isAssistantThinking)
  const reduced = useReducedMotion()
  const { t: tT } = useTranslation()

  // Mobile drawer state.
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [peekVisible, setPeekVisible] = useState(false)
  const [rightBadge, setRightBadge] = useState(false)
  const lastRecCountRef = useRef<number>(
    (project?.state as { recommendations?: unknown[] })?.recommendations?.length ?? 0,
  )

  // When recommendations grow (or change rank order), trigger the peek
  // (or badge in reduced-motion). Only fires below lg viewport — the
  // peek itself is lg:hidden via CSS, but we also gate the trigger
  // logic via window.matchMedia so the badge state matches.
  useEffect(() => {
    const recs = (project?.state as { recommendations?: unknown[] })?.recommendations
    const count = recs?.length ?? 0
    if (count > lastRecCountRef.current) {
      const isMobile =
        typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
      const drawerClosed = !rightOpen
      if (isMobile && drawerClosed) {
        if (reduced) setRightBadge(true)
        else setPeekVisible(true)
      }
    }
    lastRecCountRef.current = count
  }, [project?.state, rightOpen, reduced])

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

  const openLeftDrawer = () => {
    setLeftOpen(true)
  }
  const openRightDrawer = () => {
    setRightOpen(true)
    setPeekVisible(false)
    setRightBadge(false)
  }

  return (
    <>
      <OfflineBanner />
      <MobileTopBar
        projectName={project.name}
        onLeftClick={openLeftDrawer}
        onRightClick={openRightDrawer}
        rightBadge={rightBadge}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
      />
      <ChatWorkspaceLayout
        leftRail={<LeftRail project={project} messages={messages ?? []} />}
        rightRail={<RightRail project={project} messages={messages ?? []} />}
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
        {hasMessages ? <Thread messages={augmentedMessages} /> : <EmptyState />}
      </ChatWorkspaceLayout>

      <IdkPopover
        open={idkOpen}
        onClose={() => setIdkOpen(false)}
        onChoose={handleIdkChoose}
      />

      <MobileRailDrawer
        open={leftOpen}
        onOpenChange={setLeftOpen}
        direction="left"
        ariaLabel={tT('chat.mobile.openLeftRail')}
      >
        <LeftRail project={project} messages={messages ?? []} />
      </MobileRailDrawer>
      <MobileRailDrawer
        open={rightOpen}
        onOpenChange={setRightOpen}
        direction="right"
        ariaLabel={tT('chat.mobile.openRightRail')}
      >
        <RightRail project={project} messages={messages ?? []} />
      </MobileRailDrawer>
      <MobileRightRailPeek
        visible={peekVisible}
        onTap={openRightDrawer}
        onDismiss={() => setPeekVisible(false)}
      />
    </>
  )
}
