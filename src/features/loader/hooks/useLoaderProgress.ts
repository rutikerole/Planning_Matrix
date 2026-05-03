import { useEffect, useRef, useState } from 'react'

export type LoaderPhase = 'running' | 'completing' | 'completed' | 'failed'

interface UseLoaderProgressArgs {
  /** True once the backend confirms the project is primed and ready. */
  primed: boolean
  /** True if the backend reported a fatal error. */
  failed: boolean
  /** Hard timeout in ms; if `primed` doesn't arrive in time, phase → 'failed'. */
  timeoutMs?: number
  /** Per-segment minimum durations in ms (length 3). Defaults to [800, 800, 6000]. */
  segmentMins?: [number, number, number]
  /** Number of cycling status messages. v3 uses 6. */
  messageCount?: number
  /** Per-message duration. Default 1100 ms (verbatim from prototype). */
  messagePeriodMs?: number
  /** Hold duration on the final message before phase becomes 'completed'. */
  finalHoldMs?: number
}

interface UseLoaderProgressReturn {
  fills: [number, number, number]
  activeStep: 0 | 1 | 2
  /** 0..(messageCount-1) — current status line to display. */
  messageIndex: number
  phase: LoaderPhase
}

const FRAME_MS = 50

/**
 * v3 loader progress:
 *   • 3-segment stepper (fills) drives 800 / 800 / up-to-6000 ms
 *   • messageIndex cycles every messagePeriodMs (default 1100 ms)
 *     through messageCount lines (default 6)
 *   • when `primed` arrives early, jump messageIndex to last,
 *     hold finalHoldMs, accelerate fill[2] to 100% in 200 ms,
 *     then phase = 'completed'
 *   • on timeout or `failed`, phase = 'failed'
 */
export function useLoaderProgress({
  primed,
  failed,
  timeoutMs = 8000,
  segmentMins = [800, 800, 6000],
  messageCount = 6,
  messagePeriodMs = 1100,
  finalHoldMs = 600,
}: UseLoaderProgressArgs): UseLoaderProgressReturn {
  const [fills, setFills] = useState<[number, number, number]>([0, 0, 0])
  const [messageIndex, setMessageIndex] = useState(0)
  const [phase, setPhase] = useState<LoaderPhase>('running')
  const startedAtRef = useRef<number | null>(null)
  const completingFromRef = useRef<{ at: number; from: number } | null>(null)
  const primedAtRef = useRef<number | null>(null)

  useEffect(() => {
    startedAtRef.current = Date.now()
    let timer: number

    const tick = () => {
      const now = Date.now()
      const start = startedAtRef.current ?? now
      const elapsed = now - start

      if (failed) {
        setPhase('failed')
        return
      }

      if (elapsed > timeoutMs && !primed) {
        setPhase('failed')
        return
      }

      if (primed && primedAtRef.current === null) {
        primedAtRef.current = now
        // Lock the message to the final line as soon as priming returns.
        setMessageIndex(messageCount - 1)
      }

      // Stepper fills.
      if (primed && completingFromRef.current === null) {
        completingFromRef.current = { at: now, from: 0 }
      }

      let f0 = Math.min(1, elapsed / segmentMins[0])
      let f1 = elapsed > segmentMins[0] ? Math.min(1, (elapsed - segmentMins[0]) / segmentMins[1]) : 0
      let f2 =
        elapsed > segmentMins[0] + segmentMins[1]
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

      // Status messageIndex — only advances pre-primed.
      if (!primed) {
        const next = Math.min(messageCount - 2, Math.floor(elapsed / messagePeriodMs))
        setMessageIndex(next)
      }

      // Completion: primed AND we've held the final line long enough.
      if (primed && primedAtRef.current !== null) {
        const sincePrimed = now - primedAtRef.current
        if (f2 >= 1 && sincePrimed >= finalHoldMs) {
          setPhase('completed')
          return
        }
      }

      timer = window.setTimeout(tick, FRAME_MS)
    }

    timer = window.setTimeout(tick, FRAME_MS)
    return () => {
      window.clearTimeout(timer)
      completingFromRef.current = null
      primedAtRef.current = null
      startedAtRef.current = null
    }
  }, [
    primed,
    failed,
    timeoutMs,
    segmentMins,
    messageCount,
    messagePeriodMs,
    finalHoldMs,
  ])

  const activeStep: 0 | 1 | 2 = fills[0] < 1 ? 0 : fills[1] < 1 ? 1 : 2

  return { fills, activeStep, messageIndex, phase }
}
