import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { useTabState, type WorkspaceTabId } from '../hooks/useTabState'
import { ResultFooter } from './ResultFooter'
import { ResultHeader } from './ResultHeader'
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

  return (
    <div
      className="min-h-dvh bg-paper relative isolate flex flex-col"
      data-print-target="result-workspace"
      data-document-no={project.id}
    >
      <BlueprintSubstrate lensRadius={260} breathing={false} driftPx={0} />

      <div className="sticky top-0 z-30">
        <ResultHeader project={project} source={source} events={events} />
        <ResultTabs active={active} onChange={setActive} expert={expert} />
      </div>

      <main className="flex-1 px-6 sm:px-8 lg:px-10 py-7 sm:py-9 max-w-[1200px] mx-auto w-full">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={active}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
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
                    onClick={() => setInspectOpen(true)}
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

      <ResultFooter
        project={project}
        messages={messages}
        events={events}
        source={source}
      />
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

