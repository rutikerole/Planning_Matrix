import { useEffect, useState } from 'react'

/**
 * Auto-scroll the page (window) to bottom on each new message. Pauses
 * when the user manually scrolls up by more than 100 px from the
 * bottom; resumes when the user scrolls back near the bottom.
 *
 * `paused` drives a "Neue Nachricht" pill in Thread when a new message
 * arrives while the user has scrolled away.
 */
export function useAutoScroll(deps: ReadonlyArray<unknown>): {
  paused: boolean
  resume: () => void
} {
  const [paused, setPaused] = useState(false)

  // Detect manual scroll-up.
  useEffect(() => {
    const handler = () => {
      const distanceFromBottom =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight)
      setPaused(distanceFromBottom > 100)
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Auto-scroll on dep change unless paused.
  useEffect(() => {
    if (paused) return
    requestAnimationFrame(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const resume = () => {
    setPaused(false)
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    })
  }

  return { paused, resume }
}
