import { useEffect, useRef } from 'react'

interface Props {
  /** Increments to trigger one scan animation cycle. */
  trigger: number
}

/**
 * v3 hairline scan-line that sweeps left → right across the map
 * once when `trigger` changes. CSS keyframes (`scanSweep`) live in
 * the wrapping component's styles.
 */
export function ScanLine({ trigger }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const lastTrigger = useRef(trigger)

  useEffect(() => {
    if (trigger === lastTrigger.current) return
    lastTrigger.current = trigger
    const el = ref.current
    if (!el) return
    el.classList.remove('run')
    // force reflow so a re-trigger restarts the animation
    void el.offsetWidth
    el.classList.add('run')
  }, [trigger])

  return <div ref={ref} className="scan-line" aria-hidden="true" />
}
