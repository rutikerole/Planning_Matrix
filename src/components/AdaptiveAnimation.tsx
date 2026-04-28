// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #83 — AdaptiveAnimation
//
// Gates non-critical motion on three signals (Q9 locked):
//   • `prefers-reduced-motion` (OS-level preference)
//   • `navigator.connection.saveData` (Chrome data-saver)
//   • `navigator.connection.effectiveType === 'slow-2g' | '2g'`
//
// When any fires, the children render their static end state instead
// of running the choreography. Components opt in by wrapping their
// motion element:
//
//   <AdaptiveAnimation static={<StaticEndState />}>
//     <CoverHeroAnimation />
//   </AdaptiveAnimation>
//
// The wrapper is presentational — it doesn't enforce a particular
// motion library; callers handle their own framer-motion / CSS
// keyframes inside the active branch.
// ───────────────────────────────────────────────────────────────────────

import { type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'
import { shouldDeferMotion, useNetworkInfo } from '@/lib/useNetworkInfo'

interface Props {
  /** The motion-rich subtree. */
  children: ReactNode
  /** The static fallback. Defaults to `children` rendered without
   *  animation context (most components handle this internally via
   *  `useReducedMotion`). */
  static?: ReactNode
}

export function AdaptiveAnimation({ children, static: staticFallback }: Props) {
  const reduced = useReducedMotion()
  const network = useNetworkInfo()

  if (reduced || shouldDeferMotion(network)) {
    return <>{staticFallback ?? children}</>
  }

  return <>{children}</>
}
