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

interface Options {
  /** Whether the caller is in owner-mode (gates the `expert` flag —
   *  shared-link viewers cannot see raw state JSON via ?expert=true). */
  ownerMode: boolean
}

/**
 * Phase 8 — URL-synced tab state for `/projects/:id/result?tab=…`.
 *
 * Source of truth is the `tab` search param. The hook mirrors it as
 * React state via `useSearchParams`. Tab clicks push a new history
 * entry (replace: false) so browser back/forward navigates between
 * tabs as the brief specifies (§10.6).
 *
 * The 7th `expert` tab is only available when `?expert=true` is
 * present AND the caller is in owner-mode. Shared-link viewers
 * cannot escalate to the audit log + raw state by tampering with
 * the URL. Unknown tab ids fall back to `overview`.
 */
export function useTabState({ ownerMode }: Options = { ownerMode: true }) {
  const [params, setParams] = useSearchParams()
  const expert = ownerMode && params.get('expert') === 'true'
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
      setParams(nextParams, { replace: false })
    },
    [params, setParams],
  )

  return { active, setActive, allowed, expert }
}
