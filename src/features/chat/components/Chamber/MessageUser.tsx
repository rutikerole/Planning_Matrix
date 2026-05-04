// Phase 7 Chamber — MessageUser placeholder. Real version in commit 10.

import type { MessageRow } from '@/types/db'

interface Props {
  message: MessageRow
}

export function MessageUser({ message }: Props) {
  return (
    <div className="flex justify-end">
      <article className="max-w-[min(70%,520px)] px-4 py-3 bg-[hsl(38_30%_94%)] border border-ink/8 rounded-2xl">
        <p className="text-[15px] text-ink leading-[1.55]">
          {message.content_de}
        </p>
      </article>
    </div>
  )
}
