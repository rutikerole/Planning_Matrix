// Phase 7 Chamber — Typewriter placeholder. Real implementation
// (with streamingMessage seed handoff) lands in commit 12.

import { highlightCitations } from '../../lib/highlightCitations'

interface Props {
  text: string
  instant?: boolean
  /** Used by the seed-handoff fix in commit 12. */
  messageId?: string
}

export function Typewriter({ text }: Props) {
  return <>{highlightCitations(text)}</>
}
