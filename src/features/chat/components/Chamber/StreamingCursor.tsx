// Phase 7 Chamber — StreamingCursor.
// Blinking caret used inside the streaming bubble + during typewriter.

export function StreamingCursor() {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-[0.5em] -mb-0.5 ml-0.5 align-middle"
      style={{
        height: '0.95em',
        background: 'hsl(var(--ink))',
        opacity: 0.62,
        animation: 'blink-cursor 1.05s steps(1) infinite',
      }}
    />
  )
}
