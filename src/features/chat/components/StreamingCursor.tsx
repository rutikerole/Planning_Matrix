import { useReducedMotion } from 'framer-motion'

/**
 * Phase 3.4 #52 — drafting-blue streaming cursor.
 *
 * Tiny vertical bar that sits at the end of streaming text, blinking
 * to signal the model is still emitting. The blink ships off for
 * reduced-motion users (Q8): the cursor still renders so the eye knows
 * where the cursor is, just at a steady opacity. The cursor disappears
 * when streaming completes (StreamingAssistantBubble unmounts on the
 * persisted-message swap).
 */
export function StreamingCursor() {
  const reduced = useReducedMotion()
  return (
    <span
      aria-hidden="true"
      className="inline-block align-baseline ml-0.5 w-px bg-drafting-blue/65"
      style={{
        height: '1em',
        animation: reduced ? 'none' : 'pmStreamCursor 0.8s steps(2) infinite',
      }}
    >
      <style>{`
        @keyframes pmStreamCursor {
          0%, 49%   { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </span>
  )
}
