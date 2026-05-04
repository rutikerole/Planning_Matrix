// Phase 7 Chamber — MessageSystem placeholder.

import type { MessageRow } from '@/types/db'

interface Props { message: MessageRow }

export function MessageSystem({ message }: Props) {
  return (
    <aside className="border-y border-[var(--hairline-strong,rgba(26,22,18,0.18))] py-3">
      <p className="text-[11px] uppercase tracking-[0.20em] text-clay leading-none mb-2">SYSTEM</p>
      <p className="text-[13px] text-ink/80 leading-relaxed">{message.content_de}</p>
    </aside>
  )
}
