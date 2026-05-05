import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export type WorkspaceTabId =
  | 'overview'
  | 'legal'
  | 'procedure'
  | 'team'
  | 'cost'
  | 'suggestions'
  | 'expert'

const BASE_TAB_IDS: WorkspaceTabId[] = [
  'overview',
  'legal',
  'procedure',
  'team',
  'cost',
  'suggestions',
]

/**
 * Phase 8 — URL-synced tab state for `/projects/:id/result?tab=…`.
 *
 * Source of truth is the `tab` search param. The hook mirrors it as
 * React state via `useSearchParams`, which keeps the back/forward
 * buttons coherent (each tab change pushes a history entry by default;
 * we use `{ replace: true }` to avoid noisy history during fast tab
 * scrubbing).
 *
 * The 7th `expert` tab is only available when `?expert=true` is
 * present. An `?expert=true` URL with no `tab` param defaults to
 * `expert`; otherwise unknown tab ids fall back to `overview`.
 */
export function useTabState() {
  const [params, setParams] = useSearchParams()
  const expert = params.get('expert') === 'true'
  const requested = params.get('tab') as WorkspaceTabId | null

  const allowed: WorkspaceTabId[] = useMemo(
    () => (expert ? [...BASE_TAB_IDS, 'expert'] : BASE_TAB_IDS),
    [expert],
  )

  const active: WorkspaceTabId = useMemo(() => {
    if (requested && allowed.includes(requested)) return requested
    return 'overview'
  }, [requested, allowed])

  const setActive = useCallback(
    (next: WorkspaceTabId) => {
      const nextParams = new URLSearchParams(params)
      nextParams.set('tab', next)
      setParams(nextParams, { replace: true })
    },
    [params, setParams],
  )

  return { active, setActive, allowed, expert }
}
