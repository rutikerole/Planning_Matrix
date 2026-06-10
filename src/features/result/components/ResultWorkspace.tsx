import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useEventEmitter } from '@/hooks/useEventEmitter'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import { PreliminaryStateBanner } from '@/components/shared/PreliminaryStateBanner'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { useTabState, type WorkspaceTabId } from '../hooks/useTabState'
import { ResultFooter } from './ResultFooter'
import { ResultRail } from './ResultRail'
import { ResultTabs } from './ResultTabs'
import { InspectDataFlowModal } from './InspectDataFlowModal'
import { LegalLandscapeTab } from './tabs/LegalLandscapeTab'
import { OverviewTab } from './tabs/OverviewTab'
import { ProcedureDocumentsTab } from './tabs/ProcedureDocumentsTab'
import { CostTimelineTab } from './tabs/CostTimelineTab'
import { ExpertTab } from './tabs/ExpertTab'
import { SuggestionsTab } from './tabs/SuggestionsTab'
import { TeamTab } from './tabs/TeamTab'

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

interface Props {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  source: ResultSource
}

/**
 * Phase 8 — the Result Workspace. Top-level layout for
 * `/projects/:id/result` (owner) and `/result/share/:token` (shared).
 *
 * Composition: header (sticky) → tab bar (sticky) → tab body → footer
 * (sticky). Tab content is filled in commits 3–10; this commit
 * scaffolds the shell with placeholder bodies so the route loads
 * cleanly and the URL-sync round-trips through every tab.
 */
export function ResultWorkspace({ project, messages, events, source }: Props) {
  const ownerMode = source.kind === 'owned'
  const { active, setActive, expert } = useTabState({ ownerMode })
  const state = (project.state ?? {}) as Partial<ProjectState>
  const reduced = useReducedMotion()
  const { t } = useTranslation()
  const [inspectOpen, setInspectOpen] = useState(false)
  const resultEmit = useEventEmitter('result')

  // Phase 9.2 — result.opened on mount + tab dwell tracking. The
  // dwellRef tracks { tab, since } across renders so that on tab
  // change we can emit the prior dwell delta before recording the
  // new tab's start time.
  const openedFired = useRef(false)
  const dwellRef = useRef<{ tab: string; since: number }>({ tab: active, since: Date.now() })

  useEffect(() => {
    if (openedFired.current) return
    openedFired.current = true
    resultEmit('opened', {
      project_id: project.id,
      kind: source.kind,
      initial_tab: active,
    })
  }, [project.id, source.kind, active, resultEmit])

  useEffect(() => {
    const prev = dwellRef.current
    if (prev.tab !== active) {
      resultEmit('tab_dwell_time', {
        tab: prev.tab,
        dwell_ms: Date.now() - prev.since,
      })
      resultEmit('tab_opened', { tab: active, from: prev.tab })
      dwellRef.current = { tab: active, since: Date.now() }
    }
  }, [active, resultEmit])

  // Motion pass B — directional panel slide: moving right in the tab
  // order slides the incoming panel in from the right (and vice
  // versa). Previous tab tracked via ref.
  const TAB_ORDER: WorkspaceTabId[] = [
    'overview',
    'legal',
    'procedure',
    'team',
    'cost',
    'suggestions',
    'expert',
  ]
  const prevTabRef = useRef<WorkspaceTabId>(active)
  const slideDir =
    Math.sign(
      TAB_ORDER.indexOf(active) - TAB_ORDER.indexOf(prevTabRef.current),
    ) || 1
  useEffect(() => {
    prevTabRef.current = active
  }, [active])

  // Motion pass C — the sticky tab band gains a soft shadow only once
  // the page is scrolled: a 1px sentinel above it feeds an
  // IntersectionObserver (no scroll listener, no layout reads).
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) =>
      setScrolled(!entry.isIntersecting),
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Motion pass C — section reveal: the active tab's below-the-fold
  // top-level blocks rise 12px + fade on FIRST viewport entry
  // (IntersectionObserver, once, threshold 0.15). Never armed under
  // prefers-reduced-motion; in-viewport blocks are never touched, so
  // nothing flashes. Re-runs per tab (panels remount on switch).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const panel = document.getElementById(`result-tabpanel-${active}`)
    if (!panel) return
    const blocks = Array.from(panel.querySelectorAll(':scope > * > *'))
    const below = blocks.filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight * 0.95,
    )
    if (below.length === 0) return
    below.forEach((el) => el.classList.add('spine-reveal-pending'))
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.remove('spine-reveal-pending')
          entry.target.classList.add('spine-reveal-in')
          io.unobserve(entry.target)
        }
      },
      { threshold: 0.15 },
    )
    below.forEach((el) => io.observe(el))
    return () => {
      io.disconnect()
      below.forEach((el) =>
        el.classList.remove('spine-reveal-pending', 'spine-reveal-in'),
      )
    }
  }, [active])

  // feat/result-spine-layout (Option B — "Document spine").
  //
  // The old full-width hero (+ its D-01 sticky-shrink scroll listener,
  // which only ever lived in THIS file — f0f1b46) is gone: identity
  // moved into the fixed left rail (ResultRail), so nothing needs to
  // shrink. The AppHeader is hidden on this route (router.tsx passes
  // hideAppHeader) because the rail footer carries the same
  // LanguageSwitcher + UserMenu — hence no pt-12 reservation either.
  //
  // Layout primitive: ≥900px (`spine:`) a CSS grid [248px | 1fr];
  // below, normal block flow (identity band, then the main column).
  // The main column owns the sticky tab band (top), the in-flow
  // preliminary chip, the tab panels, and the sticky bottom action bar
  // — all scoped to the column, never under the rail.
  return (
    <div
      className="min-h-dvh bg-paper relative isolate spine:grid spine:grid-cols-[248px_minmax(0,1fr)]"
      data-print-target="result-workspace"
      data-document-no={project.id}
    >
      <BlueprintSubstrate lensRadius={260} breathing={false} driftPx={0} />

      <ResultRail project={project} source={source} events={events} />

      <div className="flex flex-col min-w-0 min-h-dvh">
        {/* Scroll sentinel for the tab-band shadow (motion pass C). */}
        <div ref={sentinelRef} aria-hidden="true" className="h-px -mb-px" />

        {/* Slim sticky tab band — chrome only (UI-sweep D-02/03/04: the
          * preliminary banner stays in <main>'s flow below). */}
        <div
          data-spine-tabs="true"
          data-scrolled={scrolled ? 'true' : 'false'}
          className="sticky top-0 z-[var(--z-sticky)]"
        >
          <ResultTabs active={active} onChange={setActive} expert={expert} />
        </div>

        {/* UI-sweep D-06 — pb breathing room above the sticky bottom action
          * bar. The bar reserves its own flow slot (sticky, not fixed), but
          * without this padding the tab's last line sits flush against the
          * bar edge at max scroll and reads as cut off behind it. */}
        <main data-spine-main="true" className="flex-1 px-6 sm:px-8 lg:px-10 pt-5 sm:pt-6 pb-16 sm:pb-20 max-w-[1200px] mx-auto w-full">
        {/* Outside the tab-keyed AnimatePresence so tab switches never
          * remount (and never replay) the banner. */}
        <PreliminaryStateBanner bundesland={project.bundesland} />
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={active}
            initial={reduced ? false : { opacity: 0, x: slideDir * 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <TabPanel id={active}>
              {active === 'overview' && (
                <OverviewTab project={project} state={state} />
              )}
              {active === 'legal' && (
                <LegalLandscapeTab project={project} state={state} />
              )}
              {active === 'procedure' && (
                <ProcedureDocumentsTab project={project} state={state} />
              )}
              {active === 'team' && <TeamTab project={project} state={state} />}
              {active === 'cost' && (
                <CostTimelineTab project={project} state={state} />
              )}
              {active === 'suggestions' && (
                <SuggestionsTab
                  project={project}
                  state={state}
                  ownerMode={ownerMode}
                />
              )}
              {active === 'expert' && expert && (
                <ExpertTab
                  project={project}
                  state={state}
                  events={events}
                  messages={messages}
                />
              )}

              {active !== 'expert' && (
                <div className="mt-10 pt-4 border-t border-ink/10">
                  <button
                    type="button"
                    onClick={() => {
                      resultEmit('inspect_data_flow_opened')
                      setInspectOpen(true)
                    }}
                    className="text-[11.5px] italic font-serif text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-sm"
                  >
                    ↗ {t('result.workspace.inspectDataFlow.linkLabel')}
                  </button>
                </div>
              )}
            </TabPanel>
          </m.div>
        </AnimatePresence>
        </main>

        <InspectDataFlowModal
          project={project}
          state={state}
          events={events}
          messages={messages}
          tabId={active}
          open={inspectOpen}
          onOpenChange={setInspectOpen}
        />

        {/* Sticky bottom action bar — lives inside the main column, so
          * it spans the content width, never the rail. */}
        <ResultFooter
          project={project}
          messages={messages}
          events={events}
          source={source}
        />
      </div>
    </div>
  )
}

interface TabPanelProps {
  id: WorkspaceTabId
  children: React.ReactNode
}

function TabPanel({ id, children }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={`result-tabpanel-${id}`}
      aria-labelledby={`result-tab-${id}`}
      tabIndex={0}
      className="focus-visible:outline-none"
    >
      {children}
    </div>
  )
}

