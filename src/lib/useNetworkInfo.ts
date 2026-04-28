// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #83 — useNetworkInfo
//
// `navigator.connection` (Network Information API) lets us see the
// user's effective bandwidth class + Save-Data preference. Used by
// `<AdaptiveAnimation>` to skip non-critical motion on slow-2g/2g and
// when Save-Data is on, per Q9 locked.
//
// API support is uneven (Firefox doesn't expose it). Default to '4g'
// with saveData=false when unsupported — most users get full motion.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

export type EffectiveType = 'slow-2g' | '2g' | '3g' | '4g'

export interface NetworkInfo {
  /** ECT classification — defaults to '4g' when API is unsupported. */
  effectiveType: EffectiveType
  /** True when the user has opted into Save-Data (Chrome data-saver). */
  saveData: boolean
  /** True when API supported (means values are real, not defaults). */
  supported: boolean
}

const DEFAULT_INFO: NetworkInfo = {
  effectiveType: '4g',
  saveData: false,
  supported: false,
}

interface ExperimentalConnection {
  effectiveType?: string
  saveData?: boolean
  addEventListener?: (event: string, handler: () => void) => void
  removeEventListener?: (event: string, handler: () => void) => void
}

function read(): NetworkInfo {
  if (typeof navigator === 'undefined') return DEFAULT_INFO
  const c = (navigator as Navigator & { connection?: ExperimentalConnection }).connection
  if (!c) return DEFAULT_INFO
  const t = (c.effectiveType ?? '4g') as EffectiveType
  return {
    effectiveType: t === 'slow-2g' || t === '2g' || t === '3g' || t === '4g' ? t : '4g',
    saveData: !!c.saveData,
    supported: true,
  }
}

export function useNetworkInfo(): NetworkInfo {
  const [info, setInfo] = useState<NetworkInfo>(read)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const c = (navigator as Navigator & { connection?: ExperimentalConnection }).connection
    if (!c?.addEventListener) return
    const handler = () => setInfo(read())
    c.addEventListener('change', handler)
    return () => c.removeEventListener?.('change', handler)
  }, [])

  return info
}

/**
 * Convenience predicate: true when the user is on a sufficiently slow
 * connection that we should skip non-critical motion (per Q9).
 */
export function shouldDeferMotion(info: NetworkInfo): boolean {
  if (info.saveData) return true
  if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') return true
  return false
}
