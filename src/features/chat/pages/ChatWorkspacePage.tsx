// Phase 7 Chamber — ChatWorkspacePage.
//
// Mounts the entire Chamber. Wires the locked data layer (useProject
// / useMessages / useProjectEvents / useChatTurn / chatStore /
// useOfflineQueueDrain) to the Chamber components and Chamber hooks.
// No data-layer changes; only assembly.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SEO } from '@/components/SEO'
import { useChatStore, OFFLINE_QUEUE_CAP } from '@/stores/chatStore'
import type { MessageRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import type { UserAnswer } from '@/types/chatTurn'
import { useProject } from '../hooks/useProject'
import { useMessages } from '../hooks/useMessages'
import { useProjectEvents } from '../hooks/useProjectEvents'
import { useChatTurn } from '../hooks/useChatTurn'
import { RecoveryBanner } from '../components/Chamber/RecoveryBanner'
import { useOfflineQueueDrain } from '../hooks/useOfflineQueueDrain'
import { useChamberProgress } from '../hooks/useChamberProgress'
import { useLedgerSummary } from '../hooks/useLedgerSummary'
import { useCompletionGate } from '../hooks/useCompletionGate'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { useSpineStages } from '../hooks/useSpineStages'
import { buildUserMessageText, buildUserMessageTextEn } from '../lib/userAnswerHelpers'
import { ChamberLayout } from '../components/Chamber/ChamberLayout'
import { ThreadContextProvider } from '../components/Chamber/ThreadContext'
import { defaultScrollToMessage } from '../components/Chamber/threadScrollHelpers'
import { Thread } from '../components/Chamber/Thread'
import { Spine } from '../components/Chamber/Spine/Spine'
import { SpineHeader } from '../components/Chamber/Spine/SpineHeader'
import { SpineStageList } from '../components/Chamber/Spine/SpineStageList'
import { SpineFooter } from '../components/Chamber/Spine/SpineFooter'
import { SpineMobileTrigger } from '../components/Chamber/Spine/SpineMobileTrigger'
import { ConversationStrip } from '../components/Chamber/ConversationStrip'
import { InputBar } from '../components/Chamber/InputBar'
import { JumpToLatest } from '../components/Chamber/JumpToLatest'
import { LedgerTab } from '../components/Chamber/LedgerTab'
import { BriefingCTA } from '../components/Chamber/BriefingCTA'
import { CapturedToast } from '../components/Chamber/CapturedToast'
import { OfflineBanner } from '../components/Chamber/OfflineBanner'
import { RateLimitBanner } from '../components/Chamber/RateLimitBanner'
import { ErrorBanner } from '../components/Chamber/ErrorBanner'
import { EmptyState } from '../components/Chamber/EmptyState'
import { useEventEmitter } from '@/hooks/useEventEmitter'
import { StandUp } from '../components/Chamber/StandUp'
import { SpineDebugPanel } from '../components/Chamber/Spine/SpineDebugPanel'

export function ChatWorkspacePage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const projectId = id ?? ''
  const chatEmit = useEventEmitter('chat')

  const { data: project } = useProject(projectId)
  const { data: messages } = useMessages(projectId)
  // events feed audit consumers (StandUp, telemetry); fetched here
  // so the React-Query cache is hot for sub-component reads.
  useProjectEvents(projectId)

  // Phase 9.2 — chat.opened fires once per project mount. Per-tab
  // visibility flushes are handled at module scope inside eventBus,
  // not here.
  const openedFired = useRef(false)
  useEffect(() => {
    if (openedFired.current) return
    if (!projectId) return
    openedFired.current = true
    chatEmit('opened', { project_id: projectId })
  }, [projectId, chatEmit])

  const chatTurn = useChatTurn(projectId)
  const isThinking = useChatStore((s) => s.isAssistantThinking)
  const offlineQueueDepth = useChatStore((s) => s.offlineQueue.length)
  const queueFull = offlineQueueDepth >= OFFLINE_QUEUE_CAP
  useOfflineQueueDrain(projectId, chatTurn)

  // Synthetic system rows (recovery + sonstige) added client-side.
  const [mountTime] = useState(() => Date.now())
  const augmentedMessages = useAugmentedMessages(messages, project, mountTime)

  // Latest assistant id drives auto-scroll and JumpToLatest.
  const latestAssistantId = useMemo(() => {
    const list = messages ?? []
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].role === 'assistant') return list[i].id
    }
    return null
  }, [messages])
  const lastAssistant = useMemo<MessageRow | null>(() => {
    const list = messages ?? []
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].role === 'assistant') return list[i]
    }
    return null
  }, [messages])

  useAutoScroll({ latestAssistantId, topOffset: 90 })

  // Chamber progress + ledger.
  const completionSignal = useChatStore((s) => s.lastCompletionSignal)
  const progress = useChamberProgress(messages, project?.state, completionSignal)
  const ledger = useLedgerSummary(project?.state)
  const gate = useCompletionGate({
    hasMessages: (messages?.length ?? 0) > 0,
    percent: progress.percent,
    completionSignal,
    recommendationsCount: ledger.recCount,
  })

  // Captured-toast pulse key — bumped whenever ledger.factCount grows.
  const lastFactCountRef = useRef(ledger.factCount)
  const [pulseKey, setPulseKey] = useState(0)
  useEffect(() => {
    if (ledger.factCount > lastFactCountRef.current) {
      lastFactCountRef.current = ledger.factCount
      setPulseKey((k) => k + 1)
    }
  }, [ledger.factCount])

  // StandUp + mobile-astrolabe sheet state.
  const [standUpOpen, setStandUpOpen] = useState(false)

  // Keyboard shortcuts.
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  useKeyboardShortcuts({
    onSlash: () => inputRef.current?.focus(),
    onQuestionMark: () => setStandUpOpen(true),
    onGotoLatest: () => {
      if (latestAssistantId) {
        const el = document.getElementById(`spec-tag-${latestAssistantId}`)
        if (el) {
          const rect = el.getBoundingClientRect()
          window.scrollTo({ top: window.scrollY + rect.top - 90, behavior: 'smooth' })
        }
      }
    },
  })

  // Submit handlers wired to useChatTurn.
  const handleSubmit = useCallback(
    (payload: {
      userMessage: string
      userMessageEn?: string
      userAnswer: UserAnswer
      attachmentIds: string[]
    }) => {
      chatTurn.mutate({
        userMessage: payload.userMessage,
        userMessageEn:
          payload.userMessageEn ?? buildUserMessageTextEn(payload.userAnswer),
        userAnswer: payload.userAnswer,
        attachmentIds: payload.attachmentIds,
      })
    },
    [chatTurn],
  )
  const handleIdkChoose = useCallback(
    (mode: 'research' | 'assume' | 'skip') => {
      const answer: UserAnswer = { kind: 'idk', mode }
      handleSubmit({
        userMessage: buildUserMessageText(answer),
        userMessageEn: buildUserMessageTextEn(answer),
        userAnswer: answer,
        attachmentIds: [],
      })
    },
    [handleSubmit],
  )

  // Phase 7.5 — useSpineStages must be called unconditionally; hook
  // tolerates project=null and returns 8 future-status rows in that
  // case, so it's safe above the early-return.
  const spineStages = useSpineStages(project, messages)

  if (!project) return null

  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const factsForToast = (project.state as ProjectState | undefined)?.facts ?? []
  const hasMessages = (messages?.length ?? 0) > 0

  // Phase 7.10g — workspace render gate. The populated layout
  // (Thread + Spine + ledger consumers) depends on a fully-hydrated
  // ProjectState. The wizard's cache seed and Supabase's first
  // refetch can arrive without `state.areas` populated (e.g., the
  // priming turn finished but the response shape didn't include
  // areas yet). When that happens, hold the populated workspace and
  // show the "Das Team versammelt sich" EmptyState until all three
  // — project, messages, and state.areas — are present. Combined
  // with the defensive `?.` in extractLedgerSummary, this prevents
  // the navigate-from-wizard blank-screen race documented in 7.10g.
  const isStateHydrated =
    !!(project.state as ProjectState | undefined)?.areas
  const isWorkspaceReady = hasMessages && isStateHydrated

  // Phase 7.10 (revised) — Stand-up link reverted to a quiet
  // text affordance. Wrapping it in a paper-card pill made it
  // visually equal in weight to JumpToLatest (a primary pill
  // above the input) and to the input pill itself — three pills
  // stacked at the bottom is too much chrome for what is a
  // meta-secondary action ("step out of the conversation"). The
  // dotted underline is gone (it read as a hyperlink); the pill
  // chrome is gone (it competed with Jump-to-live). What's left
  // is the bare italic Georgia label with a subtle clay arrow
  // and a hover lift to clay-deep.
  const standUpLink = (
    <button
      type="button"
      onClick={() => setStandUpOpen(true)}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-clay/72 hover:text-clay-deep transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-sm"
      style={{
        fontFamily: "Georgia, 'Instrument Serif', serif",
        fontStyle: 'italic',
        fontSize: 12,
        letterSpacing: '0.005em',
      }}
    >
      <span aria-hidden="true" className="text-clay/80">↗</span>
      <span>{t('chat.chamber.inputStandUpLink')}</span>
    </button>
  )

  // Phase 7.5 — Spine + mobile trigger slots. Both consume the same
  // useSpineStages output (hoisted above the early-return) so the
  // desktop sidebar and the mobile trigger label can never disagree.
  const handleStageClick = (stageId: string) => {
    const stage = spineStages.find((s) => s.id === stageId)
    if (!stage || stage.firstMessageIndex == null) return
    defaultScrollToMessage(stage.firstMessageIndex, {
      behavior: 'smooth',
      topOffset: 90,
    })
  }

  const spineHeaderNode = (
    <SpineHeader
      projectName={project.name}
      plotAddress={project.plot_address}
      percent={progress.percent}
      round={progress.currentTurn}
      totalEstimate={progress.totalEstimate}
    />
  )
  const spineFooterNode = (
    <SpineFooter
      projectId={project.id}
      projectName={project.name}
      gate={gate}
      signal={completionSignal}
    />
  )
  const spineNode = (
    <Spine
      header={spineHeaderNode}
      stageList={
        <SpineStageList stages={spineStages} onStageClick={handleStageClick} />
      }
      footer={spineFooterNode}
    />
  )
  const spineMobileTriggerNode = (
    <SpineMobileTrigger
      stages={spineStages}
      percent={progress.percent}
      drawerContent={
        <>
          {spineHeaderNode}
          <SpineStageList stages={spineStages} onStageClick={handleStageClick} />
          {spineFooterNode}
        </>
      }
    />
  )

  return (
    <ThreadContextProvider>
      <SEO titleKey="seo.title.project" params={{ name: project.name }} />
      <ChamberLayout
        spine={spineNode}
        spineMobileTrigger={spineMobileTriggerNode}
        banners={
          <>
            <OfflineBanner />
            <RateLimitBanner />
            <ErrorBanner />
          </>
        }
        stickyHeader={
          // Phase 7.8 §2.2 — ConversationStrip replaces
          // AstrolabeStickyHeader on the chat surface. The full
          // 132 px Astrolabe + SpecialistTeam strip + overflow menu
          // are dropped; mobile project context lives in the
          // SpineMobileTrigger (tap to open drawer); the StandUp
          // launcher migrates to the input zone footer (•••).
          isWorkspaceReady ? (
            <ConversationStrip
              percent={progress.percent}
              currentSpecialist={progress.recentSpecialist}
              onDialClick={() => setStandUpOpen(true)}
            />
          ) : null
        }
        thread={
          isWorkspaceReady ? (
            <>
              <Thread messages={augmentedMessages} />
              <RecoveryBanner
                messages={messages}
                isStreaming={isThinking}
                onRetry={(payload) =>
                  chatTurn.mutate({
                    userMessage: payload.userMessage,
                    userMessageEn: payload.userMessageEn,
                    userAnswer: payload.userAnswer,
                    clientRequestId: payload.clientRequestId,
                  })
                }
              />
              <BriefingCTA projectId={project.id} gate={gate} signal={completionSignal} />
            </>
          ) : (
            <EmptyState />
          )
        }
        inputZone={
          isWorkspaceReady ? (
            // Phase 7.10 — Stand-up link is no longer inside the
            // input zone. It moves to ChamberLayout's bottomRightSlot
            // (rendered OUTSIDE the centered column wrapper) so it
            // sits in the right gutter of the chat surface,
            // independent of the input pill.
            <div className="relative">
              <JumpToLatest latestAssistantId={latestAssistantId} />
              <InputBar
                lastAssistant={lastAssistant}
                onSubmit={handleSubmit}
                onIdkChoose={handleIdkChoose}
                forceDisabled={isThinking || queueFull}
                textareaRef={inputRef as React.RefObject<HTMLTextAreaElement>}
              />
            </div>
          ) : null
        }
        bottomRightSlot={isWorkspaceReady ? standUpLink : null}
        ledger={
          isWorkspaceReady ? (
            <LedgerTab
              projectId={project.id}
              projectName={project.name}
              summary={ledger}
              pulseKey={pulseKey}
            />
          ) : null
        }
        overlays={
          <>
            <CapturedToast facts={factsForToast} lang={lang} />
            <StandUp
              open={standUpOpen}
              onOpenChange={setStandUpOpen}
              project={project}
              messages={messages ?? []}
              progress={progress}
            />
            <SpineDebugPanel
              project={project}
              messages={messages ?? []}
              stages={spineStages}
              progress={progress}
            />
          </>
        }
      />
    </ThreadContextProvider>
  )
}

// ── Synthetic system rows (recovery + sonstige) ─────────────────────

function useAugmentedMessages(
  messages: MessageRow[] | undefined,
  project: ReturnType<typeof useProject>['data'],
  mountTime: number,
): MessageRow[] {
  const { t, i18n } = useTranslation()
  return useMemo<MessageRow[]>(() => {
    if (!messages || !project) return messages ?? []
    let result = messages
    if (messages.length > 0) {
      const lastTs = new Date(project.updated_at).getTime()
      const hoursSince = (mountTime - lastTs) / (1000 * 60 * 60)
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
          project_id: project.id,
          role: 'system',
          specialist: null,
          content_de: t('chat.system.recoveryNotice', { date: formattedDate }),
          content_en: t('chat.system.recoveryNotice', { lng: 'en', date: formattedDate }),
          input_type: null,
          input_options: null,
          allow_idk: null,
          thinking_label_de: null,
          likely_user_replies: null,
          tool_input: null,
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
      project_id: project.id,
      role: 'system',
      specialist: null,
      content_de: t('chat.system.fallbackTemplateNotice'),
      content_en: t('chat.system.fallbackTemplateNotice', { lng: 'en' }),
      input_type: null,
      input_options: null,
      allow_idk: null,
      thinking_label_de: null,
      likely_user_replies: null,
      tool_input: null,
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
  }, [messages, project, t, i18n.resolvedLanguage, mountTime])
}


