import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from 'vaul'
import { Download, X } from 'lucide-react'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectEventRow } from '../hooks/useProjectEvents'
import { buildExportFilename } from '../lib/exportFilename'
import { buildExportMarkdown } from '../lib/exportMarkdown'
import { buildExportJson } from '../lib/exportJson'

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
export function ExportMenu({ project, messages, events, variant = 'ghost' }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'pdf' | 'md' | 'json' | null>(null)
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
    try {
      if (kind === 'pdf') {
        const { buildExportPdf } = await import('../lib/exportPdf')
        const bytes = await buildExportPdf({ project, messages, events, lang })
        download(
          new Blob([bytes as BlobPart], { type: 'application/pdf' }),
          buildExportFilename(project.name, 'pdf'),
        )
      } else if (kind === 'md') {
        const md = buildExportMarkdown({ project, events, lang })
        download(
          new Blob([md], { type: 'text/markdown;charset=utf-8' }),
          buildExportFilename(project.name, 'md'),
        )
      } else {
        const json = buildExportJson({ project, messages, events })
        download(
          new Blob([JSON.stringify(json, null, 2)], {
            type: 'application/json;charset=utf-8',
          }),
          buildExportFilename(project.name, 'json'),
        )
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[export] failed', err)
    } finally {
      setBusy(null)
      setOpen(false)
    }
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
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay/85">
              {t('chat.export.eyebrow', { defaultValue: 'Exportieren' })}
            </p>
            <ExportRows lang={lang} busy={busy} onPick={triggerExport} t={t} />
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
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay/85">
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
