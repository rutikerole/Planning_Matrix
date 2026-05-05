import { useEffect, useRef, useState } from 'react'

// Phase 8.7.2 — atelier opening sequence hook.
//
// Drives the 7-seat cascade timing, caption rotation, and the final
// hand-off gate to the chat workspace. Reduced-motion path collapses
// the cascade to "all seats lit at mount + 1.5s hold."
//
// Outputs are intentionally render-only state (no DOM access) so the
// AtelierOpening component remains presentational.

export type SeatId =
  | 'moderator'
  | 'planungsrecht'
  | 'bauordnungsrecht'
  | 'sonstige'
  | 'verfahren'
  | 'beteiligte'
  | 'synthese'

export const SEAT_ORDER: ReadonlyArray<SeatId> = [
  'moderator',
  'planungsrecht',
  'bauordnungsrecht',
  'sonstige',
  'verfahren',
  'beteiligte',
  'synthese',
]

// Master 5.00s waterfall. MODERATOR is lit at t=0 (mount); the remaining
// six light at the offsets below. The hand-off floor sits at 5000 ms;
// `oneMoreTouch` caption activates if priming is still pending past
// 5500 ms.
const SEAT_TIMINGS_MS: Record<SeatId, number> = {
  moderator: 0,
  planungsrecht: 400,
  bauordnungsrecht: 1100,
  sonstige: 1800,
  verfahren: 2500,
  beteiligte: 3200,
  synthese: 3900,
}

const HANDOFF_FLOOR_MS = 5000
const ONE_MORE_TOUCH_MS = 5500
const REDUCED_MOTION_HOLD_MS = 1500

/** Display-state caption keys, in order of activation. The hook
 *  surfaces the current key; the component formats it via i18n. */
export type CaptionKey =
  | '1of7'
  | '2of7'
  | '3of7'
  | '4of7'
  | '5of7'
  | '6of7'
  | 'allSeated'
  | 'oneMoreTouch'

const CAPTION_BY_SEAT_INDEX: ReadonlyArray<CaptionKey> = [
  '1of7',
  '2of7',
  '3of7',
  '4of7',
  '5of7',
  '6of7',
  'allSeated',
]

interface Args {
  /** From useCreateProject. True once postChatTurn priming returns. */
  primed: boolean
  /** From useCreateProject. True when INSERT or priming fatally errored. */
  failed: boolean
  /** Whether the user prefers reduced motion. */
  reduced: boolean
  /** Fires when the sequence has met both gates (≥ floor AND primed). */
  onReady: () => void
}

interface Return {
  /** Set of seat ids currently lit. */
  litSeats: ReadonlySet<SeatId>
  /** Current caption key. */
  caption: CaptionKey
  /** 0..1 progress for the hairline bar. */
  progress: number
  /** True if all 7 seats have rendered lit (drives the cross-fade). */
  allSeated: boolean
}

export function useAtelierSequence({
  primed,
  failed,
  reduced,
  onReady,
}: Args): Return {
  const [litSeats, setLitSeats] = useState<ReadonlySet<SeatId>>(
    () => new Set<SeatId>(reduced ? SEAT_ORDER : ['moderator']),
  )
  const [caption, setCaption] = useState<CaptionKey>(() =>
    reduced ? 'allSeated' : '1of7',
  )
  const [progress, setProgress] = useState<number>(reduced ? 1 : 0)
  const [allSeated, setAllSeated] = useState<boolean>(reduced)

  const startedAtRef = useRef<number | null>(null)
  const handedOffRef = useRef<boolean>(false)
  // Latest onReady is mirrored into a ref so the cascade timer never
  // captures a stale closure across re-renders. Updating the ref in
  // useEffect (rather than during render) appeases react-hooks/refs.
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  // Reduced motion: render terminal state, hold 1.5s, fire ready.
  useEffect(() => {
    if (!reduced) return
    if (failed) return
    if (handedOffRef.current) return
    const started = Date.now()
    startedAtRef.current = started
    const tick = () => {
      const elapsed = Date.now() - started
      if (elapsed >= REDUCED_MOTION_HOLD_MS && primed) {
        handedOffRef.current = true
        onReadyRef.current()
        return
      }
      timer = window.setTimeout(tick, 80)
    }
    let timer = window.setTimeout(tick, 80)
    return () => window.clearTimeout(timer)
  }, [reduced, primed, failed])

  // Default-motion 5s waterfall.
  useEffect(() => {
    if (reduced) return
    if (failed) return
    if (handedOffRef.current) return

    const started = Date.now()
    startedAtRef.current = started

    const tick = () => {
      const elapsed = Date.now() - started

      // Seat cascade — light each seat once its threshold elapses.
      const litCount = SEAT_ORDER.filter(
        (id) => elapsed >= SEAT_TIMINGS_MS[id],
      ).length
      const next: Set<SeatId> = new Set(SEAT_ORDER.slice(0, litCount))
      setLitSeats(next)
      if (litCount === SEAT_ORDER.length) setAllSeated(true)

      // Caption follows the seat that just lit (1-indexed). After all
      // 7 seats are lit, hold "allSeated" until t=5.5 then rotate to
      // "oneMoreTouch" if priming is still pending.
      if (litCount === 0) {
        setCaption('1of7')
      } else if (litCount <= CAPTION_BY_SEAT_INDEX.length) {
        const key = CAPTION_BY_SEAT_INDEX[litCount - 1]
        if (key) setCaption(key)
      }
      if (
        litCount === SEAT_ORDER.length &&
        elapsed >= ONE_MORE_TOUCH_MS &&
        !primed
      ) {
        setCaption('oneMoreTouch')
      }

      // Progress hairline tracks the floor (5s) so it lands at 100%
      // exactly when the cross-fade fires under happy-path priming.
      setProgress(Math.min(1, elapsed / HANDOFF_FLOOR_MS))

      // Hand-off gate: only when both the visual floor AND primed.
      if (elapsed >= HANDOFF_FLOOR_MS && primed && !handedOffRef.current) {
        handedOffRef.current = true
        onReadyRef.current()
        return
      }

      timer = window.setTimeout(tick, 60)
    }
    let timer = window.setTimeout(tick, 60)
    return () => window.clearTimeout(timer)
  }, [reduced, primed, failed])

  return { litSeats, caption, progress, allSeated }
}
