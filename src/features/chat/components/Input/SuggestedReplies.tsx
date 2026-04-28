import { m, useReducedMotion } from 'framer-motion'

interface Props {
  /** 1–3 plausible short replies the model emitted for this question. */
  replies: string[]
  disabled?: boolean
  onSelect: (text: string) => void
}

/**
 * Phase 3.4 #54 — suggested-reply paper-tab chips above the input bar.
 *
 * Renders only when the model emits `likely_user_replies` on a free-
 * text question (input_type === 'text'). Visual: matches the wizard
 * chip vocabulary from #48 — paper-tab cards with a hairline border,
 * inset white-edge highlight, hover lift 1 px + drafting-blue 5 % tint.
 * On hover, a clay-italic ← prefix appears (suggests "use this").
 *
 * Stagger entrance: 60 ms per chip, opacity 0 → 1 + y 4 → 0.
 * Reduced-motion: instant.
 *
 * Click → submits the chip text as if the user typed it.
 */
export function SuggestedReplies({ replies, disabled, onSelect }: Props) {
  const reduced = useReducedMotion()
  if (replies.length === 0) return null

  return (
    <ul
      role="list"
      aria-label="Vorschläge"
      className="flex flex-wrap gap-2 mb-3"
    >
      {replies.slice(0, 3).map((reply, idx) => (
        <m.li
          key={`${idx}-${reply}`}
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduced ? 0 : 0.24,
            delay: reduced ? 0 : idx * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(reply)}
            className={
              'group relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[2px] border border-ink/15 bg-paper text-[13px] text-ink/85 leading-snug ' +
              'transition-[background-color,color,border-color,transform] duration-soft ease-soft ' +
              'hover:border-ink/30 hover:bg-drafting-blue/[0.05] hover:text-ink motion-safe:hover:-translate-y-px ' +
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
              (disabled ? 'opacity-60 pointer-events-none' : '')
            }
            style={{ boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.6)' }}
          >
            <span
              aria-hidden="true"
              className="font-serif italic text-[11px] text-clay/0 group-hover:text-clay/85 transition-colors duration-soft"
            >
              ←
            </span>
            <span>{reply}</span>
          </button>
        </m.li>
      ))}
    </ul>
  )
}
