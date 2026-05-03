import { useEffect, useRef } from 'react'
import { useReducedMotionPref } from '../hooks/useReducedMotionPref'

/**
 * Desktop-only radial-gradient bloom that follows the cursor with rAF.
 * Disables itself on coarse pointers (touch) and on reduced-motion.
 */
export function CursorBloom({ scope }: { scope?: 'hero' | 'comparison' }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const reduce = useReducedMotionPref()

  useEffect(() => {
    if (reduce) return
    const mq = window.matchMedia('(hover: none) or (pointer: coarse)')
    if (mq.matches) return

    const node = ref.current
    if (!node) return

    let x = 0
    let y = 0
    let visible = false
    let raf = 0

    function onMove(e: MouseEvent) {
      x = e.clientX
      y = e.clientY
      if (!visible) {
        node!.style.opacity = '0.35'
        visible = true
      }
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        node!.style.transform = `translate3d(${x - 150}px, ${y - 150}px, 0)`
      })
    }

    function onLeave() {
      node!.style.opacity = '0'
      visible = false
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseout', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseout', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [reduce])

  return (
    <div
      ref={ref}
      aria-hidden
      data-scope={scope ?? 'global'}
      className="pointer-events-none fixed left-0 top-0 z-[1] h-[300px] w-[300px] opacity-0 transition-opacity duration-300"
      style={{
        background:
          'radial-gradient(circle, var(--pm-clay-bloom) 0%, transparent 60%)',
        mixBlendMode: 'multiply',
        willChange: 'transform, opacity',
      }}
    />
  )
}
