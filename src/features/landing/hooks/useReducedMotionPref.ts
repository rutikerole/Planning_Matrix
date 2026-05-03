import { useEffect, useState } from 'react'
import { useReducedMotion as fmReduced } from 'framer-motion'

const KEY = 'pm:reduce-motion'

/**
 * Wrap framer-motion's useReducedMotion + add a localStorage override
 * for testing. Set `pm:reduce-motion=true` to force-on, `=false` to
 * force-off, or remove the key to honor the OS preference.
 */
export function useReducedMotionPref(): boolean {
  const sys = fmReduced()
  const [override, setOverride] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null
    const v = window.localStorage.getItem(KEY)
    if (v === 'true') return true
    if (v === 'false') return false
    return null
  })

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== KEY) return
      if (e.newValue === 'true') setOverride(true)
      else if (e.newValue === 'false') setOverride(false)
      else setOverride(null)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (override !== null) return override
  return sys ?? false
}
