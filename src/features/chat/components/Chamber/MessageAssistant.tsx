// Phase 7 Chamber — MessageAssistant placeholder.
// Real implementation lands in commit 10.

import type { MessageRow } from '@/types/db'

interface Props {
  message: MessageRow
  isHistory: boolean
  previousSpecialist?: string | null
}

export function MessageAssistant({ message }: Props) {
  return (
    <article className="flex flex-col gap-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-clay">
        {message.specialist ?? 'assistant'}
      </p>
      <p className="text-[18px] text-ink leading-[1.7]">
        {message.content_de}
      </p>
    </article>
  )
}
