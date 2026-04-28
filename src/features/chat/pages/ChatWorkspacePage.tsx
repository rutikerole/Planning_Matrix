import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { Drawer } from 'vaul'
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
import { PaperCard } from '../components/PaperCard'
import { ConversationCursor } from '../components/ConversationCursor'
import { ChatDropZone } from '../components/ChatDropZone'
import { ChatProgressBar } from '../components/Progress/ChatProgressBar'
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
  const { t, i18n } = useTranslation()
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
  // use. Phase 3.4 #59 — also surface a calm "Sie waren zuletzt am …
  // hier" recovery notice when the user returns to a project that's
  // been quiet for > 1 hour. Client-side only — never persisted.
  const augmentedMessages = useMemo<MessageRow[]>(() => {
    if (!messages || !project) return messages ?? []
    let result = messages

    // Recovery row: when last project activity is > 1 hour old at mount.
    if (messages.length > 0) {
      const lastTs = new Date(project.updated_at).getTime()
      const hoursSince = (Date.now() - lastTs) / (1000 * 60 * 60)
      if (hoursSince > 1 && Number.isFinite(hoursSince)) {
        const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
        const formattedDate = new Date(project.updated_at).toLocaleString(
          lang === 'en' ? 'en-GB' : 'de-DE',
          {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          },
        )
        const recovery: MessageRow = {
          id: 'system:recovery-notice',
          project_id: projectId,
          role: 'system',
          specialist: null,
          content_de: t('chat.system.recoveryNotice', {
            defaultValue:
              'Sie waren zuletzt am {{date}} hier. Wir setzen die Konsultation an derselben Stelle fort.',
            date: formattedDate,
          }),
          content_en: t('chat.system.recoveryNotice', {
            lng: 'en',
            defaultValue:
              "You were last here on {{date}}. We'll continue the consultation from where you left off.",
            date: formattedDate,
          }),
          input_type: null,
          input_options: null,
          allow_idk: null,
          thinking_label_de: null,
          likely_user_replies: null,
          user_answer: null,
          client_request_id: null,
          model: null,
          input_tokens: null,
          output_tokens: null,
          cache_read_tokens: null,
          cache_write_tokens: null,
          latency_ms: null,
          created_at: messages[messages.length - 1].created_at,
        }
        result = [...result, recovery]
      }
    }

    if (project.intent !== 'sonstige' || messages.length === 0) return result

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
      thinking_label_de: null,
      likely_user_replies: null,
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
    return [synthetic, ...result]
  }, [messages, project, projectId, t, i18n.resolvedLanguage])

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
  // Phase 3.4 #53 — progress overlay sheet on mobile.
  const [progressOpen, setProgressOpen] = useState(false)
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

  const handleSubmit = (payload: {
    userMessage: string
    userAnswer: UserAnswer
    attachmentIds?: string[]
  }) => {
    chatTurn.mutate({
      userMessage: payload.userMessage,
      userAnswer: payload.userAnswer,
      attachmentIds: payload.attachmentIds ?? [],
    })
  }

  const handleIdkChoose = (mode: 'research' | 'assume' | 'skip') => {
    const answer: UserAnswer = { kind: 'idk', mode }
    handleSubmit({
      userMessage: buildUserMessageText(answer),
      userAnswer: answer,
      attachmentIds: [],
    })
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
        onProgressClick={() => setProgressOpen(true)}
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
        {hasMessages ? (
          <ChatDropZone disabled={isThinking}>
            {/* Phase 3.6 #69 — loud progress indicator at the top of the
              * thread. Sticky to the message column; the left-rail
              * ProgressMeter stays mounted as a secondary indicator. */}
            <div className="hidden lg:block -mt-12 mb-6 lg:-mt-16">
              <ChatProgressBar />
            </div>
            <PaperCard project={project}>
              <Thread messages={augmentedMessages} />
            </PaperCard>
          </ChatDropZone>
        ) : (
          <EmptyState />
        )}
      </ChatWorkspaceLayout>
      <ConversationCursor />

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

      {/* Phase 3.4 #53 — progress overlay (mobile only via lg:hidden on
       * the trigger). Top-direction vaul drawer; tap the compact meter
       * in the top bar to open. */}
      <Drawer.Root open={progressOpen} onOpenChange={setProgressOpen} direction="top">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
          <Drawer.Content
            aria-label={t('chat.progress.eyebrow', { defaultValue: 'Fortschritt' })}
            className="fixed inset-x-0 top-0 z-50 bg-paper border-b border-ink/15 shadow-[0_8px_32px_-12px_hsl(220_15%_11%/0.22)] outline-none px-6 pt-10 pb-8"
          >
            <Drawer.Title className="sr-only">
              {t('chat.progress.eyebrow', { defaultValue: 'Fortschritt' })}
            </Drawer.Title>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-clay/40" />
            {/* Phase 3.6 #69 — full progress bar with labels in the
              * mobile top drawer. Tapping the condensed bar in the top
              * bar opens this drawer. */}
            <ChatProgressBar />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}
