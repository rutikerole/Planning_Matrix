import { useEffect, useRef, useState } from 'react'

export type LoaderPhase =
  | 'running'
  | 'completing'
  | 'completed'
  | 'failed'

interface UseLoaderProgressArgs {
  /** True once the backend confirms the project is primed and ready. */
  primed: boolean
  /** True if the backend reported a fatal error. */
  failed: boolean
  /** Hard timeout in ms; if `primed` doesn't arrive in time, phase → 'failed'. */
  timeoutMs?: number
  /** Per-segment minimum durations in ms (length 3). Defaults to [800, 800, 6000]. */
  segmentMins?: [number, number, number]
}

interface UseLoaderProgressReturn {
  /** 3-element fill array, each 0..1. */
  fills: [number, number, number]
  /** 0-based index of the active step. */
  activeStep: 0 | 1 | 2
  phase: LoaderPhase
}

const FRAME_MS = 50

/**
 * Drives the 3-segment stepper for the loader. Segment 1 fills over
 * 800 ms, segment 2 over 800 ms, segment 3 over up to 6 s while we
 * wait on the backend. If `primed` arrives early, segment 3
 * accelerates to full in 200 ms, then `phase` becomes 'completed'
 * (the parent navigates). If the timeout elapses without primed,
 * `phase` becomes 'failed'.
 */
export function useLoaderProgress({
  primed,
  failed,
  timeoutMs = 8000,
  segmentMins = [800, 800, 6000],
}: UseLoaderProgressArgs): UseLoaderProgressReturn {
  const [fills, setFills] = useState<[number, number, number]>([0, 0, 0])
  const [phase, setPhase] = useState<LoaderPhase>('running')
  const startedAtRef = useRef<number | null>(null)
  const completingFromRef = useRef<{ at: number; from: number } | null>(null)

  useEffect(() => {
    startedAtRef.current = Date.now()

    const tick = () => {
      const now = Date.now()
      const start = startedAtRef.current ?? now
      const elapsed = now - start

      // Failure path takes precedence.
      if (failed) {
        setPhase('failed')
        return
      }

      if (elapsed > timeoutMs && !primed) {
        setPhase('failed')
        return
      }

      // Acceleration: primed arrived; sprint segment 3 to 100% in 200 ms.
      if (primed && completingFromRef.current === null) {
        completingFromRef.current = {
          at: now,
          from: 0, // overwritten next frame using the just-computed fills
        }
      }

      let f0 = Math.min(1, elapsed / segmentMins[0])
      let f1 = elapsed > segmentMins[0]
        ? Math.min(1, (elapsed - segmentMins[0]) / segmentMins[1])
        : 0
      let f2 = elapsed > segmentMins[0] + segmentMins[1]
        ? Math.min(1, (elapsed - segmentMins[0] - segmentMins[1]) / segmentMins[2])
        : 0

      if (primed && completingFromRef.current) {
        if (completingFromRef.current.from === 0) {
          completingFromRef.current.from = f2
        }
        const sprintElapsed = now - completingFromRef.current.at
        const sprintProgress = Math.min(1, sprintElapsed / 200)
        f2 = completingFromRef.current.from + (1 - completingFromRef.current.from) * sprintProgress
        f0 = 1
        f1 = 1
      }

      setFills([f0, f1, f2])

      if (primed && f2 >= 1) {
        setPhase('completed')
        return
      }

      // Schedule next tick.
      timer = window.setTimeout(tick, FRAME_MS)
    }

    let timer = window.setTimeout(tick, FRAME_MS)
    return () => {
      window.clearTimeout(timer)
      completingFromRef.current = null
      startedAtRef.current = null
    }
  }, [primed, failed, timeoutMs, segmentMins])

  const activeStep: 0 | 1 | 2 =
    fills[0] < 1 ? 0 : fills[1] < 1 ? 1 : 2

  return { fills, activeStep, phase }
}
