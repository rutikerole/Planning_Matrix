// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 7 — IDK chips replace IdkPopover
//
// Three persistent chips above the input bar — Research it / Use a
// default / Park this question. Visible only when the latest
// assistant turn carries `allow_idk: true`. Click submits the same
// `{ kind: 'idk', mode }` payload the popover used (per Blocker 3
// of the audit response — schema unchanged).
//
// Chip styling per the chat-redesign prototype: pill border, mono
// 11.5 px label with a 9 × 9 inline SVG icon, hover lifts to clay.
// Each click is a one-step submit; no intermediate confirmation
// dialog.
// ───────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export type IdkMode = 'research' | 'assume' | 'skip'

interface Props {
  visible: boolean
  disabled?: boolean
  onChoose: (mode: IdkMode) => void
}

export function IdkChips({ visible, disabled, onChoose }: Props) {
  const { t } = useTranslation()
  if (!visible) return null

  const modes: IdkMode[] = ['research', 'assume', 'skip']

  return (
    <div
      role="group"
      aria-label={t('chat.input.idk.label')}
      className="flex flex-wrap items-center gap-2 text-[11.5px]"
    >
      <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-ink-mute mr-1 leading-none">
        {t('chat.input.idk.label')}
      </span>
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          disabled={disabled}
          onClick={() => onChoose(mode)}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-[5px] pb-1.5',
            'font-sans text-[11.5px] text-ink-soft',
            'bg-transparent border border-hairline rounded-full',
            'transition-[background-color,border-color,color] duration-[180ms] ease-ease',
            'hover:border-clay hover:text-clay hover:bg-clay-tint',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          )}
        >
          <IdkIcon mode={mode} />
          {t(`chat.input.idk.${mode}`)}
        </button>
      ))}
    </div>
  )
}

/**
 * 9×9 SVGs: research = circle + checkmark, assume = plus, skip =
 * square — matches the prototype's three glyphs verbatim.
 */
function IdkIcon({ mode }: { mode: IdkMode }) {
  if (mode === 'research') {
    return (
      <svg
        aria-hidden="true"
        width="9"
        height="9"
        viewBox="0 0 9 9"
        fill="none"
        className="shrink-0"
      >
        <circle
          cx="4.5"
          cy="4.5"
          r="3.5"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <path
          d="M3 4.5 L4 5.5 L6.2 3.3"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (mode === 'assume') {
    return (
      <svg
        aria-hidden="true"
        width="9"
        height="9"
        viewBox="0 0 9 9"
        fill="none"
        className="shrink-0"
      >
        <path
          d="M4.5 1 L4.5 8 M1 4.5 L8 4.5"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  // skip
  return (
    <svg
      aria-hidden="true"
      width="9"
      height="9"
      viewBox="0 0 9 9"
      fill="none"
      className="shrink-0"
    >
      <rect
        x="2"
        y="2"
        width="5"
        height="5"
        stroke="currentColor"
        strokeWidth="0.8"
        rx="0.5"
      />
    </svg>
  )
}
