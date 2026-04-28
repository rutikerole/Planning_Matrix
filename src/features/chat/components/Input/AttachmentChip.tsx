// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #67 — AttachmentChip
//
// One staged file in the input bar. Compact card: type-icon + filename
// (truncated middle if long) + size + status indicator + remove-X.
// In #67 the chip's only state path is the user-staged-and-removed
// pattern; #68 adds upload progress (percent ring) and click-through
// to a signed URL once the row lands in `project_files`.
// ───────────────────────────────────────────────────────────────────────

import {
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Loader2,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { PendingAttachment } from '@/types/chatInput'

interface Props {
  attachment: PendingAttachment
  onRemove: (id: string) => void
  /** While the assistant is responding, removal is still allowed but the
   * chip dims so it reads as paused. */
  disabled?: boolean
}

const FILE_ICON_MIME: Array<{ test: (mime: string) => boolean; icon: typeof FileText }> = [
  { test: (m) => m.startsWith('image/'), icon: ImageIcon },
  { test: () => true, icon: FileText },
]

function pickIcon(mime: string) {
  return FILE_ICON_MIME.find((row) => row.test(mime))!.icon
}

function formatBytes(bytes: number, lang: 'de' | 'en'): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  const mb = (bytes / (1024 * 1024)).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)
  return lang === 'en' ? `${mb} MB` : `${mb} MB`
}

/**
 * Truncate a long filename in the middle so the extension stays visible:
 *   "my-very-long-document-name-2026-final.pdf" → "my-very-l…l.pdf"
 * Keep the last `tail` chars + first 8 chars + ellipsis between.
 */
function truncateMiddle(name: string, max = 28, tail = 8): string {
  if (name.length <= max) return name
  const head = name.slice(0, max - tail - 1)
  const end = name.slice(-tail)
  return `${head}…${end}`
}

export function AttachmentChip({ attachment, onRemove, disabled }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const Icon = pickIcon(attachment.file.type)
  const { status, errorMessage } = attachment

  const isFailed = status === 'failed'
  const isInFlight = status === 'queued' || status === 'uploading'

  return (
    <div
      data-attachment-id={attachment.id}
      className={cn(
        'group inline-flex items-center gap-2 max-w-full px-3 py-1.5 border bg-paper text-[12.5px] text-ink',
        'rounded-[var(--pm-radius-pill)] transition-colors duration-soft',
        isFailed
          ? 'border-destructive/55 bg-destructive/[0.04]'
          : 'border-ink/15',
        disabled && 'opacity-70',
      )}
      title={errorMessage ?? attachment.file.name}
    >
      {attachment.previewUrl ? (
        <img
          src={attachment.previewUrl}
          alt=""
          className="size-6 rounded-sm object-cover border border-ink/10 shrink-0"
        />
      ) : (
        <Icon
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0',
            isFailed ? 'text-destructive' : 'text-clay/85',
          )}
        />
      )}

      <span className="truncate min-w-0">
        {truncateMiddle(attachment.file.name)}
      </span>

      <span className="text-clay/65 italic shrink-0 tabular-nums">
        {formatBytes(attachment.file.size, lang)}
      </span>

      {isInFlight && (
        <span
          aria-label={t('chat.input.attachment.uploading', {
            defaultValue: 'Wird hochgeladen…',
          })}
          className="inline-flex items-center text-drafting-blue shrink-0"
        >
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
        </span>
      )}

      {isFailed && (
        <span
          aria-label={t('chat.input.attachment.failed', {
            defaultValue: 'Hochladen fehlgeschlagen',
          })}
          className="inline-flex items-center text-destructive shrink-0"
        >
          <AlertTriangle aria-hidden="true" className="size-3.5" />
        </span>
      )}

      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        aria-label={t('chat.input.attachment.remove', {
          defaultValue: 'Anhang entfernen',
        })}
        className={cn(
          'shrink-0 inline-flex items-center justify-center size-5 -mr-1 rounded-full text-ink/55 hover:text-ink hover:bg-ink/[0.06] transition-colors duration-soft',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        )}
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </div>
  )
}
