// Phase 6a — React hook wrapping bplanApi.lookupBplan.
//
// Pattern: simple useEffect-driven fetch (mirrors the wizard's
// existing minimalism — TanStack Query is overkill here since the
// hook fires once per coordinate change, the wizard tears down on
// submit, and we want zero stale state).
//
// Inputs: { lat, lng } or null (when address has not yet resolved)
// Outputs: { data, isLoading, error }
//
// Calls are debounced by the caller (PlotMap.tsx geocodes on a
// 250 ms debounce). Each new (lat, lng) cancels the previous in-
// flight request via AbortController so a fast typer doesn't queue
// up stale lookups.

import { useEffect, useRef, useState } from 'react'
import { lookupBplan, BplanLookupError } from '@/lib/bplanApi'
import type { BplanLookupResult } from '@/types/bplan'

interface UseBplanLookupArgs {
  lat: number | null
  lng: number | null
}

interface UseBplanLookupReturn {
  data: BplanLookupResult | null
  isLoading: boolean
  error: BplanLookupError | null
}

export function useBplanLookup({ lat, lng }: UseBplanLookupArgs): UseBplanLookupReturn {
  const [data, setData] = useState<BplanLookupResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<BplanLookupError | null>(null)
  const ctrlRef = useRef<AbortController | null>(null)

  // The lookup hook is the canonical "derive server data from a changing
  // input" pattern. eslint's set-state-in-effect rule discourages this in
  // favour of useSyncExternalStore, but the lookup requires fetch +
  // AbortController which doesn't fit a sync subscription.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Cancel any in-flight lookup before starting a new one (or
    // before clearing state when the caller passes null).
    ctrlRef.current?.abort()
    if (lat === null || lng === null) {
      setData(null)
      setIsLoading(false)
      setError(null)
      return
    }
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setIsLoading(true)
    setError(null)
    lookupBplan({ lat, lng, signal: ctrl.signal })
      .then((result) => {
        if (ctrl.signal.aborted) return
        setData(result)
        setIsLoading(false)
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return
        setError(
          err instanceof BplanLookupError
            ? err
            : new BplanLookupError('unknown', 0, err?.message ?? 'Unknown error', null),
        )
        setIsLoading(false)
      })

    return () => {
      ctrl.abort()
    }
  }, [lat, lng])
  /* eslint-enable react-hooks/set-state-in-effect */

  return { data, isLoading, error }
}
