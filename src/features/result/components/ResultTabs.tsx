import { useTranslation } from 'react-i18next'
import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import type { WorkspaceTabId } from '../hooks/useTabState'
import { TabIcon } from './TabIcon'

interface TabDef {
  id: WorkspaceTabId
  labelKey: string
  badgeCount?: number
}

interface Props {
  active: WorkspaceTabId
  onChange: (next: WorkspaceTabId) => void
  expert: boolean
  /** Suggestion / verification badges. */
  badges?: Partial<Record<WorkspaceTabId, number>>
}

/**
 * Phase 8 — sticky tab bar for the Result Workspace. 6 base tabs +
 * the `expert` tab when `?expert=true`. Roving tabindex + arrow-key
 * navigation; URL sync lives in `useTabState`. Mobile drops icons
 * (label-only strip) when there isn't room for the full row.
 */
export function ResultTabs({ active, onChange, expert, badges = {} }: Props) {
  const { t } = useTranslation()
  const refs = useRef<Map<WorkspaceTabId, HTMLButtonElement | null>>(new Map())

  const tabs: TabDef[] = [
    { id: 'overview', labelKey: 'result.workspace.tabs.overview' },
    { id: 'legal', labelKey: 'result.workspace.tabs.legal' },
    { id: 'procedure', labelKey: 'result.workspace.tabs.procedure' },
    { id: 'team', labelKey: 'result.workspace.tabs.team' },
    { id: 'cost', labelKey: 'result.workspace.tabs.cost' },
    {
      id: 'suggestions',
      labelKey: 'result.workspace.tabs.suggestions',
      badgeCount: badges.suggestions,
    },
  ]
  if (expert) {
    tabs.push({ id: 'expert', labelKey: 'result.workspace.tabs.expert' })
  }

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') {
      return
    }
    e.preventDefault()
    const idx = tabs.findIndex((tab) => tab.id === active)
    let nextIdx = idx
    if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length
    if (e.key === 'Home') nextIdx = 0
    if (e.key === 'End') nextIdx = tabs.length - 1
    const nextId = tabs[nextIdx]?.id
    if (!nextId) return
    onChange(nextId)
    refs.current.get(nextId)?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={t('result.workspace.tabs.aria', { defaultValue: 'Briefing-Bereiche' })}
      className="sticky top-0 z-20 bg-paper-card/95 backdrop-blur-[6px] border-b border-ink/15 px-4 sm:px-6 lg:px-8 overflow-x-auto"
      data-no-print="true"
    >
      <div className="flex items-stretch gap-0 min-w-max">
        {tabs.map((tab) => {
          const isActive = tab.id === active
          const label = t(tab.labelKey)
          return (
            <button
              key={tab.id}
              ref={(node) => {
                refs.current.set(tab.id, node)
              }}
              type="button"
              role="tab"
              id={`result-tab-${tab.id}`}
              aria-controls={`result-tabpanel-${tab.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={onKey}
              className={cn(
                'group relative inline-flex items-center gap-2 px-4 sm:px-[18px] py-3.5',
                'text-[13px] leading-none transition-colors duration-soft whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card rounded-sm',
                isActive
                  ? 'text-ink font-medium'
                  : 'text-clay/85 hover:text-ink',
              )}
            >
              <span aria-hidden="true" className="hidden sm:inline-flex shrink-0">
                <TabIcon id={tab.id} active={isActive} />
              </span>
              <span>{label}</span>
              {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                <span
                  aria-label={`${tab.badgeCount}`}
                  className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1.5 text-[9.5px] font-medium leading-none bg-clay text-paper rounded-full"
                >
                  {tab.badgeCount}
                </span>
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-2 right-2 -bottom-px h-[1.5px] transition-opacity duration-soft',
                  isActive ? 'bg-ink opacity-100' : 'bg-ink/0 opacity-0',
                )}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
