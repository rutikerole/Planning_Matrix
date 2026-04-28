// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #83 — useViewport
//
// Centralised viewport detection. Replaces every ad-hoc
// `window.matchMedia('(max-width: 1023px)')` check with one source of
// truth. The breakpoints mirror Tailwind's defaults so component-level
// `lg:` classes and JS-level branching agree:
//
//   < 640 px  → mobile
//   640–1023  → tablet
//   ≥ 1024 px → desktop
//
// Listens to matchMedia change + resize so orientation flips and
// browser-chrome collapses are picked up. SSR-safe initial state via
// the `computeInitial` helper.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

export type ViewportClass = 'mobile' | 'tablet' | 'desktop'
export type Orientation = 'portrait' | 'landscape'

export interface ViewportState {
  /** True at width < 640 px. */
  isMobile: boolean
  /** True at 640 ≤ width < 1024 px. */
  isTablet: boolean
  /** True at width ≥ 1024 px. */
  isDesktop: boolean
  /** Single string for `data-pm-viewport` consumers. */
  cls: ViewportClass
  /** Live width in pixels. */
  width: number
  /** Live height in pixels. */
  height: number
  orientation: Orientation
}

function computeInitial(): ViewportState {
  if (typeof window === 'undefined') {
    // SSR / non-browser — assume desktop so server-rendered HTML doesn't
    // ship mobile-only chrome by accident. Hydration corrects this on
    // the client.
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      cls: 'desktop',
      width: 1280,
      height: 800,
      orientation: 'landscape',
    }
  }
  return computeFromWindow()
}

function computeFromWindow(): ViewportState {
  const w = window.innerWidth
  const h = window.innerHeight
  const isMobile = w < 640
  const isTablet = w >= 640 && w < 1024
  const isDesktop = w >= 1024
  return {
    isMobile,
    isTablet,
    isDesktop,
    cls: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    width: w,
    height: h,
    orientation: w >= h ? 'landscape' : 'portrait',
  }
}

/**
 * The hook. Returns a stable object that updates on resize /
 * orientation change. Components branching on `cls` should use the
 * sibling `<MobileFrame>` to set the `data-pm-viewport` attribute on
 * `<html>` so CSS-only consumers can match the same boundary.
 */
export function useViewport(): ViewportState {
  const [state, setState] = useState<ViewportState>(computeInitial)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = 0
    const handler = () => {
      // Coalesce multiple resize events (e.g. iOS Safari address-bar
      // collapse fires several events in quick succession) into a
      // single state update on the next animation frame.
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setState(computeFromWindow()))
    }
    window.addEventListener('resize', handler, { passive: true })
    window.addEventListener('orientationchange', handler, { passive: true })
    // Also listen on matchMedia so changes between breakpoints are
    // captured even if width otherwise doesn't change (rare but
    // happens on container-query polyfills).
    const mq640 = window.matchMedia('(min-width: 640px)')
    const mq1024 = window.matchMedia('(min-width: 1024px)')
    mq640.addEventListener?.('change', handler)
    mq1024.addEventListener?.('change', handler)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handler)
      window.removeEventListener('orientationchange', handler)
      mq640.removeEventListener?.('change', handler)
      mq1024.removeEventListener?.('change', handler)
    }
  }, [])

  return state
}
