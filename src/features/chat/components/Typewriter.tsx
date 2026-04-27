import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { highlightCitations } from '../lib/highlightCitations'

interface Props {
  text: string
  /** When true, render the full text immediately (history rows). */
  instant?: boolean
}

const MEAN_DELAY_MS = 18
const JITTER_MS = 10
const SENTENCE_PAUSE_MS = 100

/**
 * Variable-rhythm character reveal for assistant messages. Plain text
 * during the animation; on completion (or when the user clicks the
 * message body to skip), the text re-renders with citation highlighting.
 *
 * Accessibility: the full text is always present in a visually-hidden
 * span so screen readers announce it once, completely, instead of
 * narrating the typewriter mid-state.
 *
 * Reduced-motion: instant render. instant prop also forces instant
 * (used for history rows so a returning user doesn't see a typewriter
 * replay of yesterday's conversation).
 */
export function Typewriter({ text, instant = false }: Props) {
  const reduced = useReducedMotion()
  const skipImmediate = instant || reduced
  const [done, setDone] = useState(skipImmediate)
  const [shown, setShown] = useState(skipImmediate ? text : '')
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    if (skipImmediate) {
      setShown(text)
      setDone(true)
      return
    }

    setShown('')
    setDone(false)
    let i = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const tick = () => {
      if (cancelledRef.current) return
      i += 1
      const next = text.slice(0, i)
      setShown(next)
      if (i >= text.length) {
        setDone(true)
        return
      }
      const ch = text[i - 1]
      const isSentenceEnd = ch === '.' || ch === '!' || ch === '?'
      const delay = isSentenceEnd
        ? SENTENCE_PAUSE_MS
        : MEAN_DELAY_MS + (Math.random() * 2 - 1) * JITTER_MS
      timer = setTimeout(tick, delay)
    }
    timer = setTimeout(tick, MEAN_DELAY_MS)

    return () => {
      cancelledRef.current = true
      if (timer) clearTimeout(timer)
    }
  }, [text, skipImmediate])

  const skip = () => {
    cancelledRef.current = true
    setShown(text)
    setDone(true)
  }

  return (
    <span onClick={done ? undefined : skip} className={done ? undefined : 'cursor-pointer'}>
      {/* Visual content */}
      <span aria-hidden={done ? undefined : 'true'}>
        {done ? highlightCitations(text) : shown}
      </span>
      {/* Always-present accessible mirror */}
      {!done && <span className="sr-only">{text}</span>}
    </span>
  )
}
