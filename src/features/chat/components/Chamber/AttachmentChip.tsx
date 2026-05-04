// Phase 7 Chamber — AttachmentChip placeholder. Real polish in commit 14.

import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { PendingAttachment } from '@/types/chatInput'

interface Props {
  attachment: PendingAttachment
  onRemove: (id: string) => void
  disabled?: boolean
}

export function AttachmentChip({ attachment, onRemove, disabled }: Props) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 bg-paper-card border border-[var(--hairline,rgba(26,22,18,0.10))] rounded-full',
        'text-[12.5px] text-ink/85',
      )}
    >
      <span className="font-mono uppercase tracking-[0.10em] text-clay text-[10px]">
        {attachment.status === 'uploading' ? '…' : '✓'}
      </span>
      <span className="truncate max-w-[200px]">{attachment.file.name}</span>
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        disabled={disabled}
        aria-label={t('chat.input.attachment.remove', { defaultValue: 'Anhang entfernen' })}
        className="size-5 inline-grid place-items-center text-ink/55 hover:text-ink rounded-full"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </div>
  )
}
