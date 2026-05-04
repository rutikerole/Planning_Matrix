// Phase 7 Chamber — AttachmentChip.
//
// One row per pending attachment. Status reads as a small clay glyph
// + filename truncated to a max-width. Failed uploads surface a tiny
// retry hint via title.

import { Loader2, X, Check, AlertTriangle, FileText, Image as ImageIcon } from 'lucide-react'
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
  const status = attachment.status
  const isImage = attachment.file.type?.startsWith('image/')
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 bg-paper-card border border-[var(--hairline,rgba(26,22,18,0.10))] rounded-full text-[13px] text-ink/85',
        status === 'failed' && 'border-destructive/40',
      )}
      title={
        status === 'failed'
          ? attachment.errorMessage ?? t('chat.input.attachment.failed', { defaultValue: 'Hochladen fehlgeschlagen' })
          : undefined
      }
    >
      <span className="text-clay">
        {status === 'uploading' ? (
          <Loader2 aria-hidden="true" className="size-[14px] animate-spin" />
        ) : status === 'failed' ? (
          <AlertTriangle aria-hidden="true" className="size-[14px] text-destructive" />
        ) : isImage ? (
          <ImageIcon aria-hidden="true" className="size-[14px]" />
        ) : (
          <FileText aria-hidden="true" className="size-[14px]" />
        )}
      </span>
      <span className="truncate max-w-[200px]">{attachment.file.name}</span>
      {status === 'uploaded' && (
        <Check aria-hidden="true" className="size-[12px] text-clay-deep" />
      )}
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        disabled={disabled}
        aria-label={t('chat.input.attachment.remove', { defaultValue: 'Anhang entfernen' })}
        className="size-5 inline-grid place-items-center text-ink/55 hover:text-ink rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </div>
  )
}
