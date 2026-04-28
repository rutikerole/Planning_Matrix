// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #83 — MobileFrame
//
// Mounts once at the app root via Providers.tsx. Sets the
// `data-pm-viewport` attribute on `<html>` so the viewport-aware token
// block in globals.css activates on the right boundary. Listens to
// useViewport so flips between mobile/tablet/desktop happen live as
// the user resizes / rotates.
// ───────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useViewport } from '@/lib/useViewport'

export function MobileFrame({ children }: { children: React.ReactNode }) {
  const { cls } = useViewport()

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.pmViewport = cls
    return () => {
      // Don't remove on unmount — we're singleton-mounted at root.
      // Cleanup would race with the next mount.
    }
  }, [cls])

  return <>{children}</>
}
