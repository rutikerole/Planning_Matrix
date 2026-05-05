import { useTranslation } from 'react-i18next'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { useTabState, type WorkspaceTabId } from '../hooks/useTabState'
import { ResultFooter } from './ResultFooter'
import { ResultHeader } from './ResultHeader'
import { ResultTabs } from './ResultTabs'
import { LegalLandscapeTab } from './tabs/LegalLandscapeTab'
import { OverviewTab } from './tabs/OverviewTab'
import { ProcedureDocumentsTab } from './tabs/ProcedureDocumentsTab'

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
  const { active, setActive, expert } = useTabState()
  const state = (project.state ?? {}) as Partial<ProjectState>

  return (
    <div
      className="min-h-dvh bg-paper relative isolate flex flex-col"
      data-print-target="result-workspace"
      data-document-no={project.id}
    >
      <BlueprintSubstrate lensRadius={260} breathing={false} driftPx={0} />

      <div className="sticky top-0 z-30">
        <ResultHeader project={project} source={source} />
        <ResultTabs active={active} onChange={setActive} expert={expert} />
      </div>

      <main className="flex-1 px-6 sm:px-8 lg:px-10 py-7 sm:py-9 max-w-[1200px] mx-auto w-full">
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
          {active !== 'overview' &&
            active !== 'legal' &&
            active !== 'procedure' && (
              <Placeholder
                id={active}
                project={project}
                state={state}
                messages={messages}
                events={events}
                source={source}
              />
            )}
        </TabPanel>
      </main>

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

/**
 * Phase 8 — placeholder body. Each tab's real content lands in its own
 * commit (5–10). Until then, render the eyebrow + a calm "this section
 * is being built" line so the workspace still feels intentional.
 */
function Placeholder({ id }: {
  id: WorkspaceTabId
  project: ProjectRow
  state: Partial<ProjectState>
  messages: MessageRow[]
  events: ProjectEventRow[]
  source: ResultSource
}) {
  const { t } = useTranslation()
  return (
    <section aria-labelledby={`result-tabpanel-${id}-title`} className="flex flex-col gap-4 max-w-2xl py-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-clay">
        {t(`result.workspace.tabs.${id}`, { defaultValue: id })}
      </p>
      <h2
        id={`result-tabpanel-${id}-title`}
        className="font-serif italic text-[28px] text-ink leading-[1.1] -tracking-[0.01em]"
      >
        {t('result.workspace.placeholder.title', {
          defaultValue: 'Dieser Bereich wird gerade gebaut.',
        })}
      </h2>
      <p className="font-serif italic text-[14px] text-clay leading-relaxed">
        {t('result.workspace.placeholder.body', {
          defaultValue:
            'In Kürze finden Sie hier den vollständigen Inhalt — strukturiert, zitiert, prüfbar.',
        })}
      </p>
    </section>
  )
}
