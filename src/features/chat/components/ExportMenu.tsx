import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from 'vaul'
import { AlertTriangle, Copy, Download, X } from 'lucide-react'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectEventRow } from '../hooks/useProjectEvents'
import { buildExportFilename } from '../lib/exportFilename'
import { buildExportMarkdown } from '../lib/exportMarkdown'
import { buildExportJson } from '../lib/exportJson'
import { logExportEvent, type ExportEventType } from '@/lib/telemetry'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  /** Visual variant — 'ghost' fits the LeftRail footer, 'primary' is the
   *  Overview-modal header CTA, 'icon' is the mobile MobileTopBar tab. */
  variant?: 'ghost' | 'primary' | 'icon'
}

/**
 * Phase 3.4 #55 — Export menu. Three formats, Roman-numeral schedule
 * rows, dynamic-imports the PDF module so pdf-lib + fontkit + brand
 * TTFs only ship when the user clicks Export.
 *
 * Desktop: anchored popover from the trigger.
 * Mobile (≤ md): vaul drawer (bottom direction).
 */
interface ExportError {
  kind: 'pdf' | 'md' | 'json'
  message: string
  /** Full Error string — only surfaced in DEV (Q7 locked). */
  stack: string | null
}

export function ExportMenu({ project, messages, events, variant = 'ghost' }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'pdf' | 'md' | 'json' | null>(null)
  const [error, setError] = useState<ExportError | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Desktop click-outside: close popover on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const triggerExport = async (kind: 'pdf' | 'md' | 'json') => {
    setBusy(kind)
    setError(null)
    const attemptedEvent = `${kind}_export_attempted` as ExportEventType
    const succeededEvent = `${kind}_export_succeeded` as ExportEventType
    const failedEvent = `${kind}_export_failed` as ExportEventType
    logExportEvent({ projectId: project.id, eventType: attemptedEvent })
    let outputSize: number | null = null
    try {
      if (kind === 'pdf') {
        const { buildExportPdf } = await import('../lib/exportPdf')
        const bytes = await buildExportPdf({ project, messages, events, lang })
        outputSize = bytes.byteLength
        download(
          new Blob([bytes as BlobPart], { type: 'application/pdf' }),
          buildExportFilename(project.name, 'pdf'),
        )
      } else if (kind === 'md') {
        const md = buildExportMarkdown({ project, events, lang })
        outputSize = md.length
        download(
          new Blob([md], { type: 'text/markdown;charset=utf-8' }),
          buildExportFilename(project.name, 'md'),
        )
      } else {
        const json = buildExportJson({ project, messages, events })
        const serialized = JSON.stringify(json, null, 2)
        outputSize = serialized.length
        download(
          new Blob([serialized], {
            type: 'application/json;charset=utf-8',
          }),
          buildExportFilename(project.name, 'json'),
        )
      }
      logExportEvent({
        projectId: project.id,
        eventType: succeededEvent,
        reason: outputSize ? `bytes=${outputSize}` : null,
      })
      setOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack ?? null : null
      // eslint-disable-next-line no-console
      console.error('[export] failed', err)
      logExportEvent({
        projectId: project.id,
        eventType: failedEvent,
        reason: message,
      })
      setError({ kind, message, stack })
      // Keep the menu open so the user sees the error panel.
    } finally {
      setBusy(null)
    }
  }

  const copyError = async () => {
    if (!error) return
    const text = `[Planning Matrix] ${error.kind} export failed: ${error.message}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard may be blocked; ignore — DEV stack still shows */
    }
  }

  const tryMarkdownInstead = () => {
    setError(null)
    void triggerExport('md')
  }

  return (
    <>
      {/* Desktop trigger + popover */}
      <div className="hidden md:block relative" ref={containerRef}>
        <Trigger variant={variant} onClick={() => setOpen((v) => !v)} t={t} />
        {open && (
          <div
            role="menu"
            aria-label={t('chat.export.menuLabel', { defaultValue: 'Exportieren' })}
            className="absolute right-0 top-full mt-2 w-[320px] z-30 bg-paper border border-ink/15 rounded-[2px] shadow-[0_8px_32px_-12px_hsl(220_15%_11%/0.22)] p-5 flex flex-col gap-4"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-clay/85">
              {t('chat.export.eyebrow', { defaultValue: 'Exportieren' })}
            </p>
            <ExportRows lang={lang} busy={busy} onPick={triggerExport} t={t} />
            {error && (
              <ExportErrorPanel
                error={error}
                onCopy={copyError}
                onMd={tryMarkdownInstead}
                onDismiss={() => setError(null)}
                t={t}
              />
            )}
          </div>
        )}
      </div>

      {/* Mobile trigger + drawer */}
      <div className="md:hidden">
        <Trigger variant={variant} onClick={() => setOpen(true)} t={t} />
        <Drawer.Root open={open} onOpenChange={setOpen} direction="bottom">
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
            <Drawer.Content
              aria-label={t('chat.export.menuLabel', { defaultValue: 'Exportieren' })}
              className="fixed inset-x-0 bottom-0 z-50 bg-paper border-t border-ink/15 outline-none p-6 pb-10 rounded-t-[2px]"
            >
              <Drawer.Title className="sr-only">
                {t('chat.export.menuLabel', { defaultValue: 'Exportieren' })}
              </Drawer.Title>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-clay/85">
                  {t('chat.export.eyebrow', { defaultValue: 'Exportieren' })}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('chat.export.close', { defaultValue: 'Schließen' })}
                  className="size-8 inline-flex items-center justify-center text-ink/65 hover:text-ink"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <ExportRows lang={lang} busy={busy} onPick={triggerExport} t={t} />
              {error && (
                <div className="mt-4">
                  <ExportErrorPanel
                    error={error}
                    onCopy={copyError}
                    onMd={tryMarkdownInstead}
                    onDismiss={() => setError(null)}
                    t={t}
                  />
                </div>
              )}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </>
  )
}

interface TriggerProps {
  variant: 'ghost' | 'primary' | 'icon'
  onClick: () => void
  t: (key: string, opts?: { defaultValue?: string }) => string
}

function Trigger({ variant, onClick, t }: TriggerProps) {
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={t('chat.export.menuLabel', { defaultValue: 'Exportieren' })}
        className="size-11 inline-flex items-center justify-center rounded-sm text-drafting-blue/75 hover:text-drafting-blue hover:bg-paper-tinted transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Download className="size-[18px]" aria-hidden="true" />
      </button>
    )
  }
  if (variant === 'primary') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group inline-flex items-center gap-2 h-10 px-4 rounded-sm border border-ink/15 bg-paper text-[13px] font-medium text-ink hover:bg-drafting-blue/[0.05] hover:border-ink/30 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Download className="size-4" aria-hidden="true" />
        <span>{t('chat.export.menuLabel', { defaultValue: 'Exportieren' })}</span>
        <span aria-hidden="true" className="font-serif italic text-clay group-hover:translate-x-0.5 transition-transform duration-soft">→</span>
      </button>
    )
  }
  // ghost — fits LeftRail footer
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] italic text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm self-start inline-flex items-center gap-1.5"
    >
      <Download className="size-3.5" aria-hidden="true" />
      {t('chat.export.menuLabel', { defaultValue: 'Exportieren' })}
    </button>
  )
}

interface ExportRowsProps {
  lang: 'de' | 'en'
  busy: 'pdf' | 'md' | 'json' | null
  onPick: (kind: 'pdf' | 'md' | 'json') => void
  t: (key: string, opts?: { defaultValue?: string }) => string
}

function ExportRows({ busy, onPick, t }: ExportRowsProps) {
  const rows: Array<{
    kind: 'pdf' | 'md' | 'json'
    numeral: string
    titleKey: string
    titleDefault: string
    bodyKey: string
    bodyDefault: string
  }> = [
    {
      kind: 'pdf',
      numeral: 'I',
      titleKey: 'chat.export.pdf.title',
      titleDefault: 'PDF-Briefing',
      bodyKey: 'chat.export.pdf.body',
      bodyDefault: 'Vollständige Zusammenfassung als druckbares PDF.',
    },
    {
      kind: 'md',
      numeral: 'II',
      titleKey: 'chat.export.md.title',
      titleDefault: 'Markdown-Checkliste',
      bodyKey: 'chat.export.md.body',
      bodyDefault: 'Strukturierte Liste für Architekten / Tools.',
    },
    {
      kind: 'json',
      numeral: 'III',
      titleKey: 'chat.export.json.title',
      titleDefault: 'JSON-Datenexport',
      bodyKey: 'chat.export.json.body',
      bodyDefault: 'Vollständiger Projektzustand für Integrationen.',
    },
  ]

  return (
    <ul className="flex flex-col">
      {rows.map((r, idx) => (
        <li key={r.kind}>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onPick(r.kind)}
            className={
              'group block w-full text-left grid grid-cols-[28px_1fr] gap-x-3 py-3 transition-colors duration-soft motion-safe:hover:bg-clay/[0.05] focus-visible:outline-none focus-visible:bg-clay/[0.05] rounded-sm ' +
              (idx > 0 ? 'border-t border-ink/12' : '')
            }
          >
            <span className="font-serif italic text-[13px] text-clay-deep tabular-figures pt-1 leading-none text-center">
              {r.numeral}
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-[14px] font-medium text-ink leading-snug">
                {t(r.titleKey, { defaultValue: r.titleDefault })}
                {busy === r.kind && (
                  <span className="ml-2 font-serif italic text-[11px] text-clay">
                    …
                  </span>
                )}
              </p>
              <p className="text-[12px] italic text-ink/65 leading-relaxed">
                {t(r.bodyKey, { defaultValue: r.bodyDefault })}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
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

interface ExportErrorPanelProps {
  error: ExportError
  onCopy: () => void
  onMd: () => void
  onDismiss: () => void
  t: (key: string, opts?: { defaultValue?: string }) => string
}

/**
 * Phase 3.6 #73 — calm error UI surfaced when an export fails. Replaces
 * the previous silent-fail behaviour where the menu would just close.
 * Q7 locked: stack trace shown only in DEV.
 */
function ExportErrorPanel({
  error,
  onCopy,
  onMd,
  onDismiss,
  t,
}: ExportErrorPanelProps) {
  const showStack = import.meta.env.DEV && error.stack
  return (
    <div
      role="alert"
      className="mt-1 flex flex-col gap-3 border border-destructive/35 bg-destructive/[0.04] rounded-[var(--pm-radius-card)] p-4"
    >
      <div className="flex items-baseline gap-2">
        <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-destructive" />
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-destructive">
          {t('chat.export.error.eyebrow', {
            defaultValue: 'Export fehlgeschlagen',
          })}
        </p>
      </div>
      <p className="text-[13px] text-ink/85 leading-relaxed">
        {error.kind === 'pdf'
          ? t('chat.export.error.pdfBody', {
              defaultValue:
                'Der PDF-Export ist leider fehlgeschlagen. Versuchen Sie stattdessen die Markdown-Checkliste oder den JSON-Datenexport.',
            })
          : t('chat.export.error.mdBody', {
              defaultValue:
                'Der Export ist leider fehlgeschlagen. Bitte erneut versuchen.',
            })}
      </p>
      {showStack && (
        <pre className="text-[10.5px] leading-snug text-ink/65 bg-paper border border-ink/12 rounded-[2px] p-2 max-h-32 overflow-auto whitespace-pre-wrap break-words">
          {error.stack}
        </pre>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {error.kind === 'pdf' && (
          <button
            type="button"
            onClick={onMd}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-paper bg-ink hover:bg-ink/92 rounded-[var(--pm-radius-pill)] transition-colors duration-soft"
          >
            {t('chat.export.error.tryMd', {
              defaultValue: 'Markdown stattdessen',
            })}
          </button>
        )}
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 h-9 px-3 text-[12px] text-ink/70 hover:text-ink rounded-[var(--pm-radius-pill)] hover:bg-ink/[0.04] transition-colors duration-soft"
        >
          <Copy className="size-3.5" aria-hidden="true" />
          {t('chat.export.error.copy', {
            defaultValue: 'Fehler kopieren',
          })}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto inline-flex items-center h-9 px-3 text-[12px] text-ink/55 hover:text-ink rounded-[var(--pm-radius-pill)] transition-colors duration-soft"
        >
          {t('chat.export.error.dismiss', {
            defaultValue: 'Schließen',
          })}
        </button>
      </div>
    </div>
  )
}
