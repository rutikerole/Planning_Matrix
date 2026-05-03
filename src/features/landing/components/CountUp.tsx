import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { useReducedMotionPref } from '../hooks/useReducedMotionPref'

type Props = {
  from?: number
  to: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  /**
   * Re-animate when this value changes. Useful when the same component
   * is re-keyed (e.g. address swap in the Analyzer).
   */
  triggerKey?: string | number
  locale?: string
}

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

export function CountUp({
  from = 0,
  to,
  duration = 2000,
  prefix = '',
  suffix = '',
  className,
  triggerKey,
  locale = 'de-DE',
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const inView = useInView(ref, { once: true, margin: '-100px 0px' })
  const reduce = useReducedMotionPref()
  const [val, setVal] = useState<number>(from)

  useEffect(() => {
    if (reduce) return
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const startVal = from
    const delta = to - from
    function tick(now: number) {
      const elapsed = now - start
      const t = Math.min(1, elapsed / duration)
      const eased = easeOutExpo(t)
      setVal(Math.round(startVal + delta * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, from, to, duration, reduce, triggerKey])

  // Derived at render time: under reduced motion always show the target.
  const display = reduce ? to : val

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString(locale)}
      {suffix}
    </span>
  )
}
