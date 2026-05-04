// Phase 7 Chamber — Typewriter with streaming-seed handoff.
//
// Audit K.14 fix. When a streaming bubble has been showing
// `streamingMessage.contentSoFar` and the persisted assistant row
// finally lands in the cache, the new MessageAssistant mounts and
// would normally re-type the entire body from scratch — visible
// flicker.
//
// We avoid that by reading the chatStore's last `lastSeed` snapshot:
// any text that was already shown via the streaming bubble is
// considered "already emitted" — the typewriter reveals only the
// delta. When the streaming bubble was non-existent (history rows or
// non-streaming JSON path), behavior is identical to the legacy
// typewriter.
//
// Reduced-motion + `instant` → render the full text immediately
// through highlightCitations.

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import { highlightCitations } from '../../lib/highlightCitations'

const MEAN_DELAY_MS = 18
const JITTER_MS = 10
const SENTENCE_PAUSE_MS = 100

interface Props {
  text: string
  instant?: boolean
  /** Persisted message id; used to look up the streaming seed. */
  messageId?: string
}

export function Typewriter({ text, instant = false, messageId }: Props) {
  const reduced = useReducedMotion()

  // Read the streaming seed exactly once on first mount. Any text
  // already shown in the streaming bubble counts as "emitted." We
  // intentionally do NOT subscribe — we want the value at the moment
  // the persisted row lands, not subsequent updates.
  const seedRef = useRef<string>(
    (() => {
      const stream = useChatStore.getState().streamingMessage
      if (!stream) return ''
      // Common-prefix length protects us when content_de differs from
      // the streamed text (e.g. trailing punctuation tweaks).
      const seed = stream.contentSoFar
      let i = 0
      const max = Math.min(seed.length, text.length)
      while (i < max && seed[i] === text[i]) i += 1
      return text.slice(0, i)
    })(),
  )

  const skipImmediate = instant || reduced
  const [shown, setShown] = useState<string>(skipImmediate ? text : seedRef.current)
  const [done, setDone] = useState<boolean>(skipImmediate || seedRef.current === text)

  // Drive the reveal from the seed forward.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false
    if (skipImmediate) {
      setShown(text)
      setDone(true)
      return
    }
    if (seedRef.current === text) {
      setShown(text)
      setDone(true)
      return
    }
    let i = seedRef.current.length
    setShown(text.slice(0, i))
    setDone(false)
    let timer: ReturnType<typeof setTimeout> | null = null
    const tick = () => {
      if (cancelled) return
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
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [text, skipImmediate, messageId])
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <span
      onClick={done ? undefined : () => setShown(text) /* skip-on-click */}
      className={done ? undefined : 'cursor-pointer'}
    >
      <span aria-hidden={done ? undefined : 'true'}>
        {done ? highlightCitations(text) : shown}
      </span>
      {!done && <span className="sr-only">{text}</span>}
    </span>
  )
}
