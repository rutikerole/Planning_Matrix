import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronUp, FileText, Download, Braces, Link2, Mail } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { buildExportFilename } from '@/lib/export/exportFilename'
import { buildExportMarkdown } from '@/lib/export/exportMarkdown'
import { buildExportJson } from '@/lib/export/exportJson'
import type { MessageRow, ProjectRow } from '@/types/db'
import { createShareToken } from '../lib/shareTokenApi'

interface ProjectEventRow {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

interface Props {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  onShareCreated: (url: string, expiresAt: string) => void
  onInspectDataFlow: () => void
}

type Action = 'pdf' | 'md' | 'json' | 'share'

/**
 * Phase 8 — "Take it home" overflow menu in the workspace footer. Reuses
 * the Phase 3.4 / 3.5 export engine wholesale: `buildExportPdf` (full
 * briefing PDF), `buildExportMarkdown`, `buildExportJson`,
 * `createShareToken`. Each item dynamic-imports its renderer so pdf-lib
 * + brand fonts only ship when triggered.
 *
 * The menu also exposes the "Inspect data flow" link (expert mode) per
 * the brief — discoverable without being an Easter egg.
 */
export function ExportMenu({
  project,
  messages,
  events,
  onShareCreated,
  onInspectDataFlow,
}: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [busy, setBusy] = useState<Action | null>(null)

  const trigger = async (action: Action) => {
    if (busy) return
    setBusy(action)
    try {
      if (action === 'pdf') {
        const { buildExportPdf } = await import('@/features/chat/lib/exportPdf')
        const bytes = await buildExportPdf({ project, messages, events, lang })
        download(
          new Blob([bytes as BlobPart], { type: 'application/pdf' }),
          buildExportFilename(project.name, 'pdf'),
        )
      } else if (action === 'md') {
        const md = buildExportMarkdown({ project, events, lang })
        download(
          new Blob([md], { type: 'text/markdown;charset=utf-8' }),
          buildExportFilename(project.name, 'md'),
        )
      } else if (action === 'json') {
        const json = buildExportJson({ project, messages, events })
        download(
          new Blob([JSON.stringify(json, null, 2)], {
            type: 'application/json;charset=utf-8',
          }),
          buildExportFilename(project.name, 'json'),
        )
      } else if (action === 'share') {
        const result = await createShareToken(project.id)
        try {
          await navigator.clipboard.writeText(result.url)
        } catch {
          // permission denied / not focused — recipient can copy manually
        }
        onShareCreated(result.url, result.expiresAt)
      }
    } catch (err) {
      console.error('[result-export] failed', err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-2 h-9 px-4 rounded-full',
          'bg-ink text-paper text-[12.5px] font-medium',
          'transition-colors duration-soft hover:bg-ink/92 disabled:opacity-60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        )}
        disabled={busy !== null}
      >
        <span>{t('result.workspace.footer.takeItHome')}</span>
        <ChevronUp aria-hidden="true" className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={10}
        className="min-w-[260px] rounded-[var(--pm-radius-card)]"
      >
        <DropdownMenuItem
          onSelect={() => void trigger('pdf')}
          className="gap-3"
        >
          <FileText aria-hidden="true" className="size-4 text-clay/85" />
          <span className="flex-1">{t('result.export.pdf.title')}</span>
          {busy === 'pdf' && <span className="text-[11px] italic text-clay/85">…</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void trigger('md')}
          className="gap-3"
        >
          <Download aria-hidden="true" className="size-4 text-clay/85" />
          <span className="flex-1">{t('result.export.md.title')}</span>
          {busy === 'md' && <span className="text-[11px] italic text-clay/85">…</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void trigger('json')}
          className="gap-3"
        >
          <Braces aria-hidden="true" className="size-4 text-clay/85" />
          <span className="flex-1">{t('result.export.json.title')}</span>
          {busy === 'json' && <span className="text-[11px] italic text-clay/85">…</span>}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 h-px bg-pm-hair" />
        <DropdownMenuItem
          onSelect={() => void trigger('share')}
          className="gap-3"
        >
          <Link2 aria-hidden="true" className="size-4 text-clay/85" />
          <span className="flex-1">{t('result.workspace.footer.shareLink')}</span>
          {busy === 'share' && <span className="text-[11px] italic text-clay/85">…</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled
          className="gap-3 cursor-not-allowed opacity-60"
        >
          <Mail aria-hidden="true" className="size-4 text-clay/85" />
          <span className="flex-1">{t('result.workspace.footer.sendToArchitect')}</span>
          <span className="text-[10px] italic text-clay/65">
            {t('result.export.email.cta')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 h-px bg-pm-hair" />
        <DropdownMenuItem
          onSelect={onInspectDataFlow}
          className="gap-3"
        >
          <span aria-hidden="true" className="size-4 inline-flex items-center justify-center text-clay/85 text-[12px]">⌘</span>
          <span className="flex-1 italic font-serif">
            {t('result.workspace.footer.inspectDataFlow')}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
