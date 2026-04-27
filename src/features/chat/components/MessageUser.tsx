import type { MessageRow } from '@/types/db'

interface Props {
  message: MessageRow
}

/**
 * User message — right-aligned, paper-on-paper card with a hairline
 * border. No avatar, no timestamp. Inter 15.
 */
export function MessageUser({ message }: Props) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-card border border-border-strong/40 rounded-sm px-4 py-3 text-[15px] text-ink leading-relaxed whitespace-pre-wrap break-words">
        {message.content_de}
      </div>
    </div>
  )
}
