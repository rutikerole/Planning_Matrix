import { useMemo, useState } from 'react'

interface Props {
  value: unknown
  /** Optional cap on how many bytes to render before truncating with a notice. */
  maxBytes?: number
  /** Compact mode hides the copy button — useful when used inside a larger card. */
  compact?: boolean
}

const DEFAULT_MAX_BYTES = 200_000  // ~200 KB of JSON before we truncate

/**
 * Phase 9 — minimal syntax-highlighted JSON viewer.
 *
 * Hand-rolled instead of pulling in highlight.js or prismjs to keep
 * the admin chunk small. Tokenises JSON via JSON.stringify + a
 * regex-driven span wrapper. Handles the four leaf types (string,
 * number, boolean, null) and the two structural types (object, array)
 * with distinct colour. ~80 lines, no dependencies.
 *
 * Truncates at maxBytes with a footer message — keeps the persona
 * snapshot's full prompt readable without melting the browser on a
 * 200 KB messages array.
 */
export function JsonViewer({ value, maxBytes = DEFAULT_MAX_BYTES, compact }: Props) {
  const [copied, setCopied] = useState(false)
  const { rendered, truncated, full } = useMemo(() => {
    let text: string
    try {
      text = JSON.stringify(value, null, 2)
    } catch {
      text = String(value)
    }
    const bytes = new TextEncoder().encode(text).length
    let display = text
    let trunc = false
    if (bytes > maxBytes) {
      display = text.slice(0, maxBytes) + `\n... [truncated; ${bytes} bytes total]`
      trunc = true
    }
    return { rendered: highlight(display), truncated: trunc, full: text }
  }, [value, maxBytes])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — silent fallback
    }
  }

  return (
    <div className="relative">
      {!compact && (
        <button
          type="button"
          onClick={copy}
          className="absolute right-2 top-2 z-10 rounded bg-[hsl(var(--ink))]/[0.07] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/65 hover:bg-[hsl(var(--ink))]/[0.12]"
        >
          {copied ? 'copied' : 'copy'}
        </button>
      )}
      <pre
        className="max-h-[480px] overflow-auto rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--ink))]/[0.03] p-3 font-mono text-[11px] leading-relaxed text-[hsl(var(--ink))]/90"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
      {truncated && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
          truncated · use export to inspect full payload
        </p>
      )}
    </div>
  )
}

// Hand-rolled JSON syntax highlighter. Wraps tokens in <span> with
// inline tailwind colour classes. Strings green, numbers amber,
// booleans+null pink, keys blue. Escapes HTML first.
function highlight(input: string): string {
  const escaped = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'text-amber-700'  // numbers default
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'text-sky-700' : 'text-emerald-700'
      } else if (/true|false/.test(match)) {
        cls = 'text-fuchsia-700'
      } else if (/null/.test(match)) {
        cls = 'text-[hsl(var(--ink))]/45'
      }
      return `<span class="${cls}">${match}</span>`
    },
  )
}
