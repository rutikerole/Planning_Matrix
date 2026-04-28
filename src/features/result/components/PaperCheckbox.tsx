interface Props {
  checked: boolean
  /** Called with the new checked state when the user toggles. */
  onToggle: (next: boolean) => void
  ariaLabel?: string
  size?: number
}

/**
 * Phase 3.5 #62 — paper-tab checkbox.
 *
 * Custom 16×16 SVG square with a hand-drawn feel: a paper-tab outline
 * + an optional clay checkmark when checked. Matches the brand
 * vocabulary; replaces the native `<input type="checkbox">`. Keyboard
 * accessible via `<button role="checkbox" aria-checked>`.
 */
export function PaperCheckbox({
  checked,
  onToggle,
  ariaLabel = 'toggle',
  size = 18,
}: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onToggle(!checked)}
      className="inline-flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-[2px]"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={'transition-colors duration-soft ' + (checked ? 'text-clay' : 'text-ink/45 hover:text-ink/75')}
      >
        {/* Paper-tab box — slight imperfection on the corners */}
        <path d="M 2.2 2.5 L 15.6 2.3 L 15.7 15.6 L 2.4 15.8 Z" />
        {/* Inset highlight */}
        <path d="M 3 3.2 L 14.7 3.05" strokeOpacity="0.45" />
        {/* Checkmark — hand-drawn, two strokes */}
        {checked && (
          <path
            d="M 4.6 9.4 L 7.6 12.6 L 13.8 5.6"
            strokeWidth="1.6"
            strokeOpacity="0.95"
          />
        )}
      </svg>
    </button>
  )
}
