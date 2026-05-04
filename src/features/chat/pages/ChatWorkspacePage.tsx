// Phase 7 Chamber — ChatWorkspacePage.
//
// Mounts the entire Chamber. Wires the locked data layer (useProject
// / useMessages / useProjectEvents / useChatTurn / chatStore /
// useOfflineQueueDrain) to the Chamber components and Chamber hooks.
// No data-layer changes; only assembly.

import { useCallback, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SEO } from '@/components/SEO'
import { useChatStore, OFFLINE_QUEUE_CAP } from '@/stores/chatStore'
import { useViewport } from '@/lib/useViewport'
import { useAuth } from '@/hooks/useAuth'
import type { MessageRow } from '@/types/db'
import type { Specialist, ProjectState } from '@/types/projectState'
import type { UserAnswer } from '@/types/chatTurn'
import { useProject } from '../hooks/useProject'
import { useMessages } from '../hooks/useMessages'
import { useProjectEvents } from '../hooks/useProjectEvents'
import { useChatTurn } from '../hooks/useChatTurn'
import { useOfflineQueueDrain } from '../hooks/useOfflineQueueDrain'
import { useChamberProgress } from '../hooks/useChamberProgress'
import { useLedgerSummary } from '../hooks/useLedgerSummary'
import { useCompletionGate } from '../hooks/useCompletionGate'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { buildUserMessageText, buildUserMessageTextEn } from '../lib/userAnswerHelpers'
import { ChamberLayout } from '../components/Chamber/ChamberLayout'
import { Thread } from '../components/Chamber/Thread'
import { Astrolabe } from '../components/Chamber/Astrolabe'
import { AstrolabeStickyHeader } from '../components/Chamber/AstrolabeStickyHeader'
import { SpecialistTeam } from '../components/Chamber/SpecialistTeam'
import { InputBar } from '../components/Chamber/InputBar'
import { JumpToLatest } from '../components/Chamber/JumpToLatest'
import { LedgerTab } from '../components/Chamber/LedgerTab'
import { BriefingCTA } from '../components/Chamber/BriefingCTA'
import { CapturedToast } from '../components/Chamber/CapturedToast'
import { OfflineBanner } from '../components/Chamber/OfflineBanner'
import { RateLimitBanner } from '../components/Chamber/RateLimitBanner'
import { ErrorBanner } from '../components/Chamber/ErrorBanner'
import { EmptyState } from '../components/Chamber/EmptyState'
import { StandUp } from '../components/Chamber/StandUp'
import { MobileAstrolabeSheet } from '../components/Chamber/MobileAstrolabeSheet'

export function ChatWorkspacePage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const projectId = id ?? ''
  const { isMobile } = useViewport()

  const { data: project } = useProject(projectId)
  const { data: messages } = useMessages(projectId)
  // events feed audit consumers (StandUp, telemetry); fetched here
  // so the React-Query cache is hot for sub-component reads.
  useProjectEvents(projectId)

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
  if (ledger.factCount > lastFactCountRef.current) {
    lastFactCountRef.current = ledger.factCount
    queueMicrotask(() => setPulseKey((k) => k + 1))
  }

  // StandUp + mobile-astrolabe sheet state.
  const [standUpOpen, setStandUpOpen] = useState(false)
  const [mobileAstroOpen, setMobileAstroOpen] = useState(false)

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

  // Sigil click → scroll to most recent message from that specialist.
  const handleSigilClick = useCallback(
    (spec: Specialist) => {
      const list = messages ?? []
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].role === 'assistant' && list[i].specialist === spec) {
          const el = document.getElementById(`spec-tag-${list[i].id}`)
          if (el) {
            const rect = el.getBoundingClientRect()
            window.scrollTo({ top: window.scrollY + rect.top - 90, behavior: 'smooth' })
          }
          return
        }
      }
    },
    [messages],
  )

  // Astrolabe drag-to-scrub.
  const handleScrubTo = useCallback(
    (turnIdx: number) => {
      const list = messages ?? []
      const assistants = list.filter((m) => m.role === 'assistant')
      const target = assistants[turnIdx]
      if (!target) return
      const el = document.getElementById(`spec-tag-${target.id}`)
      if (el) {
        const rect = el.getBoundingClientRect()
        window.scrollTo({ top: window.scrollY + rect.top - 90, behavior: 'smooth' })
      }
    },
    [messages],
  )

  if (!project) return null

  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const factsForToast = (project.state as ProjectState | undefined)?.facts ?? []
  const hasMessages = (messages?.length ?? 0) > 0
  const onAstrolabeOpen = () =>
    isMobile ? setMobileAstroOpen(true) : setStandUpOpen(true)

  // Build the contributions map for SpecialistTeam tooltips.
  const contributions = useMemo(() => {
    const out = {
      moderator: { count: 0 },
      planungsrecht: { count: 0 },
      bauordnungsrecht: { count: 0 },
      sonstige_vorgaben: { count: 0 },
      verfahren: { count: 0 },
      beteiligte: { count: 0 },
      synthesizer: { count: 0 },
    } as Record<Specialist, { count: number }>
    for (const m of messages ?? []) {
      if (m.role === 'assistant' && m.specialist) {
        out[m.specialist as Specialist].count += 1
      }
    }
    return out
  }, [messages])

  const standUpLink = (
    <button
      type="button"
      onClick={() => setStandUpOpen(true)}
      className="inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-clay/82 hover:text-clay-deep transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 rounded-sm"
    >
      <span aria-hidden="true">↗</span>
      {t('chat.chamber.inputStandUpLink')}
    </button>
  )

  return (
    <>
      <SEO titleKey="seo.title.project" params={{ name: project.name }} />
      <ChamberLayout
        activeSpecialist={progress.recentSpecialist}
        banners={
          <>
            <OfflineBanner />
            <RateLimitBanner />
            <ErrorBanner />
          </>
        }
        stickyHeader={
          <AstrolabeStickyHeader
            projectName={project.name}
            plotAddress={project.plot_address}
            progress={progress}
            hasFullAbove={!isMobile && hasMessages}
            onAstrolabeClick={onAstrolabeOpen}
            onSigilClick={handleSigilClick}
            teamSlot={
              <SpecialistTeam
                active={progress.recentSpecialist}
                spoken={progress.spokenSpecialists}
                contributions={contributions}
                size="sm"
                onSigilClick={handleSigilClick}
              />
            }
            briefingSlot={
              gate.visible && (gate.prominence === 'hero' || gate.prominence === 'ready') ? (
                <Link
                  to={`/projects/${project.id}/result`}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-clay text-paper text-[12.5px] font-medium hover:bg-clay-deep transition-colors duration-150"
                >
                  {t('chat.chamber.briefingCtaFull')}
                  <span aria-hidden="true">→</span>
                </Link>
              ) : null
            }
            overflowSlot={
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setStandUpOpen(true)}
                  className="w-full text-left px-3 py-2 text-[13px] text-ink hover:bg-[hsl(var(--clay)/0.08)] rounded-md"
                >
                  {t('chat.chamber.inputStandUpLink')}
                </button>
                <div className="px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-clay/72">
                  {t('chat.chamber.stickyHeaderShortcuts')}
                </div>
                <ul className="px-3 pb-2 space-y-1 text-[12px] text-ink/72 font-mono">
                  <li>{t('chat.chamber.keyboardSearch')}</li>
                  <li>{t('chat.chamber.keyboardHelp')}</li>
                  <li>{t('chat.chamber.keyboardScrollUp')}</li>
                  <li>{t('chat.chamber.keyboardScrollDown')}</li>
                  <li>{t('chat.chamber.keyboardEscape')}</li>
                </ul>
                <div aria-hidden="true" className="border-t border-[var(--hairline)] my-1" />
                <Link
                  to="/dashboard"
                  className="block px-3 py-2 text-[13px] text-ink/85 hover:bg-[hsl(var(--clay)/0.08)] rounded-md"
                >
                  ← {t('chat.chamber.stickyHeaderLeave')}
                </Link>
                <SignOutMenuItem />
              </>
            }
          />
        }
        topRegion={
          hasMessages && !isMobile ? (
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-1.5 min-w-0">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.20em] text-clay">
                  {t('chat.titleBlock.eyebrow', { defaultValue: 'Projekt' })}
                </p>
                <h1 className="font-serif italic text-[26px] text-ink m-0 truncate" title={project.name}>
                  {project.name.split('·')[0]?.trim() ?? project.name}
                </h1>
                {project.plot_address && (
                  <p className="font-serif italic text-[14px] text-clay/82">
                    {project.plot_address}
                  </p>
                )}
                <div className="mt-3">
                  <SpecialistTeam
                    active={progress.recentSpecialist}
                    spoken={progress.spokenSpecialists}
                    contributions={contributions}
                    size="md"
                    onSigilClick={handleSigilClick}
                  />
                </div>
              </div>
              <Astrolabe
                percent={progress.percent}
                currentTurn={progress.currentTurn}
                totalEstimate={progress.totalEstimate}
                currentSpecialist={progress.recentSpecialist}
                spokenSpecialists={progress.spokenSpecialists}
                size="full"
                onClick={onAstrolabeOpen}
                onSigilClick={handleSigilClick}
                onScrubTo={handleScrubTo}
                ariaLabel={t('chat.chamber.astrolabeLabel', { percent: progress.percent })}
              />
            </div>
          ) : null
        }
        thread={
          hasMessages ? (
            <>
              <Thread messages={augmentedMessages} />
              <BriefingCTA projectId={project.id} gate={gate} signal={completionSignal} />
            </>
          ) : (
            <EmptyState />
          )
        }
        inputZone={
          hasMessages ? (
            <div className="relative">
              <JumpToLatest latestAssistantId={latestAssistantId} />
              <InputBar
                lastAssistant={lastAssistant}
                onSubmit={handleSubmit}
                onIdkChoose={handleIdkChoose}
                forceDisabled={isThinking || queueFull}
                textareaRef={inputRef as React.RefObject<HTMLTextAreaElement>}
              />
              <div className="flex items-center justify-end mt-1 px-1">
                {standUpLink}
              </div>
            </div>
          ) : null
        }
        ledger={
          hasMessages ? (
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
            <MobileAstrolabeSheet
              open={mobileAstroOpen}
              onOpenChange={setMobileAstroOpen}
              project={project}
              progress={progress}
              summary={ledger}
            />
          </>
        }
      />
    </>
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

function SignOutMenuItem() {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => void signOut()}
      className="w-full text-left px-3 py-2 text-[13px] text-ink/85 hover:bg-[hsl(var(--clay)/0.08)] rounded-md"
    >
      {t('chat.chamber.stickyHeaderSignOut')}
    </button>
  )
}

