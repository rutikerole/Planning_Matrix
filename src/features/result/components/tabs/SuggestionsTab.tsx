import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { pickSmartSuggestions } from '../../lib/smartSuggestionsMatcher'
import { SuggestionCard } from '../Cards/SuggestionCard'
import { useEventEmitter } from '@/hooks/useEventEmitter'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
  ownerMode: boolean
}

const DISMISS_KEY = (projectId: string) => `pm:dismissed-suggestions:${projectId}`

/**
 * Phase 8 — Tab 6 Suggestions. Reuses the existing
 * `pickSmartSuggestions` matcher (no schema bump on ProjectState, no
 * persona-prompt extension) and renders each as a paper card. Dismiss
 * persists in localStorage scoped to the project id; Add wires through
 * the same path SmartSuggestions used in the legacy section.
 */
export function SuggestionsTab({ project, state, ownerMode }: Props) {
  const { t } = useTranslation()
  const resultEmit = useEventEmitter('result')
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY(project.id))
      if (!raw) return new Set()
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? new Set<string>(arr) : new Set()
    } catch {
      return new Set()
    }
  })
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DISMISS_KEY(project.id),
        JSON.stringify(Array.from(dismissed)),
      )
    } catch {
      // incognito etc — fine
    }
  }, [dismissed, project.id])

  const suggestions = useMemo(
    () => pickSmartSuggestions({ project, state, limit: 8 }),
    [project, state],
  )

  const visible = suggestions.filter(
    (s) => !dismissed.has(s.id) && !addedIds.has(s.id),
  )

  const handleAdded = (id: string) => {
    resultEmit('suggestion_added', { suggestion_id: id })
    setAddedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }
  const handleDismissed = (id: string) => {
    resultEmit('suggestion_dismissed', { suggestion_id: id })
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1100px]">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none">
        {t('result.workspace.suggestions.eyebrow')}
      </p>
      <p className="font-serif italic text-[14px] text-clay leading-relaxed max-w-prose">
        {t('result.workspace.suggestions.intro')}
      </p>
      {visible.length === 0 ? (
        <p className="text-[12.5px] italic text-clay/85 leading-relaxed">
          {t('result.workspace.suggestions.empty')}
        </p>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visible.map((s) => (
            <li key={s.id}>
              <SuggestionCard
                project={project}
                state={state}
                suggestion={s}
                ownerMode={ownerMode}
                onAdded={handleAdded}
                onDismissed={handleDismissed}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
