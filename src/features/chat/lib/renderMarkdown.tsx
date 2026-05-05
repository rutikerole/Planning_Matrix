import { Fragment, type ReactNode } from 'react'
import { highlightCitations } from './highlightCitations'

/**
 * Phase 8.5 (C.3) — minimal markdown renderer for assistant message
 * bodies. Avoids pulling in `react-markdown` (~15 KB gz) by handling
 * only the whitelist the brief asks for:
 *
 *   • **bold**      → <strong>
 *   • *italic*      → <em>
 *   • `inline code` → <code>
 *   • - bullet list → <ul><li>…</li></ul>
 *   • 1. numbered   → <ol><li>…</li></ol>
 *   • blank line    → paragraph break
 *
 * Links and images are intentionally NOT supported. Text inside the
 * markdown tree still flows through highlightCitations so legal cites
 * (§ 34 BauGB, Art. 58 BayBO) render with their clay-tint pill style.
 *
 * The renderer is whitespace-tolerant. It treats `*foo*` and `**foo**`
 * as separate tokens and won't double-emphasise nested markers (the
 * input rarely needs it; nested syntax adds parser complexity for no
 * user benefit). Unmatched markers render as literal characters so a
 * stray asterisk doesn't break the page.
 */
export function renderMarkdown(text: string): ReactNode {
  if (!text) return null

  const blocks = parseBlocks(text)
  return blocks.map((block, idx) => renderBlock(block, idx))
}

interface ParagraphBlock {
  kind: 'paragraph'
  text: string
}
interface ListBlock {
  kind: 'ul' | 'ol'
  items: string[]
}
type Block = ParagraphBlock | ListBlock

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []

  // Buffer for the current paragraph (joined by newlines into a single
  // <p> with <br/> between, since markdown treats single line breaks
  // as soft breaks).
  let paragraphBuffer: string[] = []
  let listBuffer: string[] | null = null
  let listKind: 'ul' | 'ol' = 'ul'

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    blocks.push({
      kind: 'paragraph',
      text: paragraphBuffer.join('\n'),
    })
    paragraphBuffer = []
  }
  const flushList = () => {
    if (!listBuffer) return
    blocks.push({ kind: listKind, items: listBuffer })
    listBuffer = null
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }
    const ulMatch = /^\s*[-•]\s+(.*)$/.exec(line)
    const olMatch = /^\s*\d+\.\s+(.*)$/.exec(line)
    if (ulMatch) {
      flushParagraph()
      if (listBuffer && listKind !== 'ul') flushList()
      listKind = 'ul'
      listBuffer ??= []
      listBuffer.push(ulMatch[1])
      continue
    }
    if (olMatch) {
      flushParagraph()
      if (listBuffer && listKind !== 'ol') flushList()
      listKind = 'ol'
      listBuffer ??= []
      listBuffer.push(olMatch[1])
      continue
    }
    flushList()
    paragraphBuffer.push(line)
  }
  flushParagraph()
  flushList()
  return blocks
}

function renderBlock(block: Block, idx: number): ReactNode {
  if (block.kind === 'paragraph') {
    const lines = block.text.split('\n')
    return (
      <p key={idx} className="my-3 first:mt-0 last:mb-0">
        {lines.map((line, lineIdx) => (
          <Fragment key={lineIdx}>
            {lineIdx > 0 && <br />}
            {renderInline(line)}
          </Fragment>
        ))}
      </p>
    )
  }
  const ListTag = block.kind
  return (
    <ListTag
      key={idx}
      className={
        'my-3 ml-5 ' +
        (block.kind === 'ol' ? 'list-decimal' : 'list-disc') +
        ' marker:text-clay/65'
      }
    >
      {block.items.map((item, itemIdx) => (
        <li key={itemIdx} className="my-1 leading-[1.6]">
          {renderInline(item)}
        </li>
      ))}
    </ListTag>
  )
}

/**
 * Inline-token rendering. Splits the line into a sequence of nodes
 * around **bold**, *italic*, `code` markers and runs highlightCitations
 * on the remaining plain-text segments. Unmatched markers render as
 * literal characters.
 */
function renderInline(line: string): ReactNode {
  const nodes: ReactNode[] = []
  let cursor = 0
  let key = 0

  const pushPlain = (text: string) => {
    if (!text) return
    nodes.push(<Fragment key={`p-${key++}`}>{highlightCitations(text)}</Fragment>)
  }

  // Walk left-to-right, matching the soonest of the three inline
  // markers. Greedy: **bold** beats *italic* when both could match.
  while (cursor < line.length) {
    const remaining = line.slice(cursor)

    const boldMatch = remaining.match(/^\*\*([^*\n]+?)\*\*/)
    if (boldMatch) {
      nodes.push(
        <strong key={`b-${key++}`} className="font-semibold">
          {highlightCitations(boldMatch[1])}
        </strong>,
      )
      cursor += boldMatch[0].length
      continue
    }
    const italicMatch = remaining.match(/^\*([^*\n]+?)\*/)
    if (italicMatch) {
      nodes.push(
        <em key={`i-${key++}`} className="italic">
          {highlightCitations(italicMatch[1])}
        </em>,
      )
      cursor += italicMatch[0].length
      continue
    }
    const codeMatch = remaining.match(/^`([^`\n]+?)`/)
    if (codeMatch) {
      nodes.push(
        <code
          key={`c-${key++}`}
          className="px-1 py-0.5 bg-ink/[0.06] rounded text-[0.92em] font-mono"
        >
          {codeMatch[1]}
        </code>,
      )
      cursor += codeMatch[0].length
      continue
    }

    // Find the index of the next plausible marker; render plain text
    // up to there.
    let nextMarker = remaining.length
    for (const ch of ['**', '*', '`']) {
      const idx = remaining.indexOf(ch, 1)
      if (idx > 0 && idx < nextMarker) nextMarker = idx
    }
    pushPlain(remaining.slice(0, nextMarker || 1))
    cursor += nextMarker || 1
  }

  return nodes
}
