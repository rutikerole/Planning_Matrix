// Phase 8 — cookie consent state hook.
//
// State shape persisted to localStorage as JSON under
// `pm.cookieConsent`. Versioned so that when we add a new category
// in the future, the banner can re-prompt users whose stored version
// is older than the current one (without nagging existing users).

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'pm.cookieConsent'
const CURRENT_VERSION = 1

export interface ConsentState {
  /** Always true — essential storage cannot be opted out of. */
  essential: true
  /** PostHog analytics (cookieless, but still consent-gated per
   *  TDDDG § 25 conservative reading). */
  analytics: boolean
  /** Cookie consent state itself + future functional features. */
  functional: boolean
  /** Schema version (CURRENT_VERSION at save time). */
  version: number
  /** ISO instant of save. */
  timestamp: string
}

const DEFAULT_PENDING: ConsentState = {
  essential: true,
  analytics: false,
  functional: false,
  version: CURRENT_VERSION,
  timestamp: '1970-01-01T00:00:00.000Z',
}

function readFromStorage(): ConsentState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConsentState
    if (parsed.version !== CURRENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

function writeToStorage(state: ConsentState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private mode / storage full — silently degrade. The banner will
    // re-show next visit but the app continues to work.
  }
}

export function useCookieConsent() {
  const [state, setState] = useState<ConsentState | null>(() => readFromStorage())

  // Cross-tab sync: if the user changes consent in another tab,
  // mirror the new state here.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return
      setState(readFromStorage())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const acceptAll = useCallback(() => {
    const next: ConsentState = {
      essential: true,
      analytics: true,
      functional: true,
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
    }
    writeToStorage(next)
    setState(next)
  }, [])

  const rejectAll = useCallback(() => {
    const next: ConsentState = {
      ...DEFAULT_PENDING,
      timestamp: new Date().toISOString(),
    }
    writeToStorage(next)
    setState(next)
  }, [])

  const saveCustom = useCallback((analytics: boolean, functional: boolean) => {
    const next: ConsentState = {
      essential: true,
      analytics,
      functional,
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
    }
    writeToStorage(next)
    setState(next)
  }, [])

  /** True when the user has not yet made a choice — banner shows. */
  const isPending = state === null

  return { state, isPending, acceptAll, rejectAll, saveCustom }
}
