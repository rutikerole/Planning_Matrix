import { useEffect, useMemo, useState } from 'react'
import type { Step, Specialist } from '../lib/chatScript'

export type ChatMessage = {
  id: string
  specialist: Specialist
  role: 'assistant' | 'user'
  text: string
}

export type AreaState = 'PENDING' | 'ACTIVE' | 'VOID'

export type Recommendation = { id: string; title: string; detail: string }

export type ChatSnapshot = {
  messages: ChatMessage[]
  areas: { A: AreaState; B: AreaState; C: AreaState }
  recommendations: Recommendation[]
  typing: Specialist | null
}

const INITIAL: ChatSnapshot = {
  messages: [],
  areas: { A: 'PENDING', B: 'PENDING', C: 'PENDING' },
  recommendations: [],
  typing: null,
}

/**
 * Run the roundtable script. Auto-loops, pauses on tab blur, cleans up
 * on unmount, restarts cleanly on `steps` identity change (locale switch).
 *
 * If `reducedMotion` is true, jumps straight to the final populated state
 * once and stops — caller exposes a `replay` button.
 */
export function useChatSequence(steps: Step[], reducedMotion: boolean) {
  const [animSnap, setAnimSnap] = useState<ChatSnapshot>(INITIAL)
  const [replayKey, setReplayKey] = useState(0)

  // Reduced-motion final snapshot is derived at render time, not via setState
  // inside an effect (avoids react-hooks/set-state-in-effect cascade warning).
  const reducedSnap = useMemo<ChatSnapshot | null>(() => {
    if (!reducedMotion) return null
    const final: ChatSnapshot = {
      messages: [],
      areas: { A: 'ACTIVE', B: 'ACTIVE', C: 'ACTIVE' },
      recommendations: [],
      typing: null,
    }
    let counter = 0
    for (const step of steps) {
      if (step.kind === 'msg') {
        final.messages.push({
          id: `m${counter++}`,
          specialist: step.specialist,
          role: step.role,
          text: step.text,
        })
      } else if (step.kind === 'rec') {
        final.recommendations.push({
          id: step.id,
          title: step.title,
          detail: step.detail,
        })
      } else if (step.kind === 'restart') {
        break
      }
    }
    return final
  }, [reducedMotion, steps])

  useEffect(() => {
    if (reducedMotion) return
    let cancelled = false
    const cleanups: Array<() => void> = []

    function sleep(ms: number) {
      return new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, ms)
        cleanups.push(() => window.clearTimeout(t))
      })
    }

    async function pausableDelay(ms: number) {
      // Poll-based: split into 100 ms chunks; if document.hidden, wait
      // before consuming. Cheap and avoids visibilitychange race conditions.
      let remaining = ms
      while (remaining > 0 && !cancelled) {
        if (document.hidden) {
          await sleep(200)
          continue
        }
        const chunk = Math.min(remaining, 100)
        await sleep(chunk)
        remaining -= chunk
      }
    }

    let counter = 0

    async function runOnce() {
      // Reset to initial at every iteration.
      setAnimSnap(INITIAL)
      await pausableDelay(400)
      for (const step of steps) {
        if (cancelled) return
        if (step.kind === 'pause') {
          await pausableDelay(step.ms)
        } else if (step.kind === 'typing') {
          setAnimSnap((s) => ({ ...s, typing: step.specialist }))
          await pausableDelay(step.durationMs)
          setAnimSnap((s) => ({ ...s, typing: null }))
        } else if (step.kind === 'msg') {
          if (step.delayMs > 0) await pausableDelay(step.delayMs)
          const id = `m${counter++}`
          setAnimSnap((s) => ({
            ...s,
            messages: [
              ...s.messages,
              { id, specialist: step.specialist, role: step.role, text: step.text },
            ],
          }))
        } else if (step.kind === 'area') {
          setAnimSnap((s) => ({ ...s, areas: { ...s.areas, [step.area]: step.state } }))
        } else if (step.kind === 'rec') {
          setAnimSnap((s) => ({
            ...s,
            recommendations: [
              ...s.recommendations,
              { id: step.id, title: step.title, detail: step.detail },
            ],
          }))
        } else if (step.kind === 'restart') {
          return
        }
      }
    }

    async function loop() {
      while (!cancelled) {
        await runOnce()
        if (cancelled) return
        // small breather between iterations
        await pausableDelay(800)
      }
    }
    void loop()

    return () => {
      cancelled = true
      cleanups.forEach((fn) => fn())
    }
  }, [steps, reducedMotion, replayKey])

  const snap = reducedSnap ?? animSnap
  return { ...snap, replay: () => setReplayKey((k) => k + 1) }
}
