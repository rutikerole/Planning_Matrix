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
import { useEventEmitter } from '@/hooks/useEventEmitter'
import { useAuthStore } from '@/stores/authStore'

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

type Action = 'pdf-en' | 'pdf-de' | 'md' | 'json' | 'share'

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
  const resultEmit = useEventEmitter('result')
  // v1.0.14 Bug 29 — resolve owner display name from auth profile
  // for the PDF cover Bauherr footer. Fallback chain:
  //   profile.full_name  →  user.user_metadata.full_name  →
  //   email local-part (title-cased)  →  localized 'Bauherr'/'Owner'
  // The fallback case is the v1.0.13 behaviour (which surfaced as
  // the literal "Owner" string on Rutik's NRW × T-03 export).
  const authUser = useAuthStore((s) => s.user)
  const authProfile = useAuthStore((s) => s.profile)
  const resolvedBauherrName = (() => {
    const profileFullName = authProfile?.full_name?.trim()
    if (profileFullName) return profileFullName
    const metaFullName =
      (authUser?.user_metadata?.full_name as string | undefined)?.trim() ??
      (authUser?.user_metadata?.name as string | undefined)?.trim()
    if (metaFullName) return metaFullName
    const email = authUser?.email ?? ''
    const local = email.split('@')[0]
    if (local) {
      // Title-case the local part (e.g., "erolerutik9" → "Erolerutik9")
      return local.charAt(0).toUpperCase() + local.slice(1)
    }
    return lang === 'de' ? 'Bauherr' : 'Owner'
  })()

  const trigger = async (action: Action) => {
    if (busy) return
    // Phase 9.2 — emit click before the async work so the click is
    // captured even if the user navigates away while the export
    // computes (PDF can take a few seconds).
    resultEmit(`export_${action}_clicked`, { action })
    setBusy(action)
    const startedAt = Date.now()
    try {
      if (action === 'pdf-en' || action === 'pdf-de') {
        // v1.0.13 — DE/EN export-time locale picker. Action variant
        // forces the lang override regardless of UI locale.
        const exportLang: 'de' | 'en' = action === 'pdf-de' ? 'de' : 'en'
        const { buildExportPdf } = await import('@/features/chat/lib/exportPdf')
        const bytes = await buildExportPdf({
          project,
          messages,
          events,
          lang: exportLang,
          bauherrName: resolvedBauherrName,
        })
        download(
          new Blob([bytes as BlobPart], { type: 'application/pdf' }),
          buildExportFilename(project.name, 'pdf'),
        )
        resultEmit('export_pdf_succeeded', {
          latency_ms: Date.now() - startedAt,
          file_bytes:
            (bytes as Uint8Array | ArrayBuffer | undefined)?.byteLength ?? null,
          locale: exportLang,
        })
      } else if (action === 'md') {
        const md = buildExportMarkdown({ project, events, lang })
        download(
          new Blob([md], { type: 'text/markdown;charset=utf-8' }),
          buildExportFilename(project.name, 'md'),
        )
        resultEmit('export_md_succeeded', {
          latency_ms: Date.now() - startedAt,
          file_bytes: md.length,
        })
      } else if (action === 'json') {
        const json = buildExportJson({ project, messages, events })
        const serialized = JSON.stringify(json, null, 2)
        download(
          new Blob([serialized], {
            type: 'application/json;charset=utf-8',
          }),
          buildExportFilename(project.name, 'json'),
        )
        resultEmit('export_json_succeeded', {
          latency_ms: Date.now() - startedAt,
          file_bytes: serialized.length,
        })
      } else if (action === 'share') {
        const result = await createShareToken(project.id)
        try {
          await navigator.clipboard.writeText(result.url)
        } catch {
          // permission denied / not focused — recipient can copy manually
        }
        onShareCreated(result.url, result.expiresAt)
        resultEmit('share_link_created', { latency_ms: Date.now() - startedAt })
      }
    } catch (err) {
      resultEmit('export_failed', {
        action,
        error_message: err instanceof Error ? err.message : String(err),
      })
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
        {/* v1.0.13 — split the PDF action into EN / DE so the user
            chooses the export locale at click time. UI locale still
            drives the default visually (selected first item matches
            the user's current i18n locale), but both options are
            always available. */}
        <DropdownMenuItem
          onSelect={() => void trigger(lang === 'de' ? 'pdf-de' : 'pdf-en')}
          className="gap-3"
        >
          <FileText aria-hidden="true" className="size-4 text-clay/85" />
          <span className="flex-1">
            {t('result.export.pdf.title')}
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-clay/70">
              {lang === 'de' ? 'DE' : 'EN'}
            </span>
          </span>
          {(busy === 'pdf-en' || busy === 'pdf-de') && (
            <span className="text-[11px] italic text-clay/85">…</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            void trigger(lang === 'de' ? 'pdf-en' : 'pdf-de')
          }
          className="gap-3"
        >
          <FileText aria-hidden="true" className="size-4 text-clay/55" />
          <span className="flex-1 text-clay/85">
            {t('result.export.pdf.title')}
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-clay/70">
              {lang === 'de' ? 'EN' : 'DE'}
            </span>
          </span>
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
