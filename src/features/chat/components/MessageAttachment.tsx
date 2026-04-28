// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #68 — MessageAttachment
//
// Renders attachments inline below a user message bubble. One row per
// attached project_files entry: type-icon + filename (truncated middle)
// + size + click-through opens a freshly-minted signed URL in a new
// tab.
//
// Loaded via TanStack Query keyed on the message id so list ordering
// is stable and we get free deduping when MessageUser re-renders.
// ───────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchMessageAttachments, fetchSignedFileUrl } from '@/lib/uploadApi'
import type { ProjectFileRow } from '@/types/projectFile'

interface Props {
  messageId: string
}

function pickIcon(mime: string) {
  if (mime.startsWith('image/')) return ImageIcon
  return FileText
}

function formatBytes(bytes: number, lang: 'de' | 'en'): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  const mb = (bytes / (1024 * 1024)).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)
  return lang === 'en' ? `${mb} MB` : `${mb} MB`
}

function truncateMiddle(name: string, max = 40, tail = 12): string {
  if (name.length <= max) return name
  const head = name.slice(0, max - tail - 1)
  const end = name.slice(-tail)
  return `${head}…${end}`
}

export function MessageAttachment({ messageId }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const query = useQuery({
    queryKey: ['messageAttachments', messageId],
    queryFn: () => fetchMessageAttachments(messageId),
    // Attachments don't change after the user message lands, so we
    // can cache aggressively. Two-minute staleTime is plenty.
    staleTime: 120_000,
  })

  if (query.isLoading) {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] italic text-clay/72">
        <Loader2 aria-hidden="true" className="size-3 animate-spin" />
        {t('chat.input.attachment.uploading', {
          defaultValue: 'Wird hochgeladen…',
        })}
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-destructive italic">
        <AlertTriangle aria-hidden="true" className="size-3" />
        {t('chat.attachment.loadFailed', {
          defaultValue: 'Anhänge konnten nicht geladen werden.',
        })}
      </div>
    )
  }

  const attachments = query.data ?? []
  if (attachments.length === 0) return null

  return (
    <ul
      role="list"
      aria-label={t('chat.input.attachment.list', {
        defaultValue: 'Angehängte Dateien',
      })}
      className="mt-2 flex flex-wrap items-center gap-2"
    >
      {attachments.map((row) => (
        <li key={row.id}>
          <AttachmentLink row={row} lang={lang} />
        </li>
      ))}
    </ul>
  )
}

function AttachmentLink({ row, lang }: { row: ProjectFileRow; lang: 'de' | 'en' }) {
  const { t } = useTranslation()
  const Icon = pickIcon(row.file_type)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      const url = await fetchSignedFileUrl(row.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[MessageAttachment] signed URL failed', err)
      // Friendly fallback — the user sees the chip but the browser
      // doesn't open the file. Less surprising than a silent click.
      // We could surface a toast here in Phase 4.
    }
  }

  return (
    <a
      href="#"
      onClick={handleClick}
      title={row.file_name}
      className={cn(
        'group inline-flex items-center gap-2 max-w-full px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 border border-ink/15 bg-paper text-[12.5px] text-ink',
        'rounded-[var(--pm-radius-pill)] transition-colors duration-soft hover:border-ink/30 hover:bg-drafting-blue/[0.04]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
      aria-label={t('chat.attachment.openInNewTab', {
        defaultValue: '{{name}} öffnen',
        name: row.file_name,
      })}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0 text-clay/85 group-hover:text-drafting-blue" />
      <span className="truncate min-w-0">{truncateMiddle(row.file_name)}</span>
      <span className="text-clay/72 italic shrink-0 tabular-nums">
        {formatBytes(row.file_size, lang)}
      </span>
    </a>
  )
}
