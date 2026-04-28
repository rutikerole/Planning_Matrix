import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileText, Braces, Link2, Mail } from 'lucide-react'
import { useMessages } from '@/features/chat/hooks/useMessages'
import { useProjectEvents } from '@/features/chat/hooks/useProjectEvents'
import { buildExportFilename } from '@/features/chat/lib/exportFilename'
import { buildExportMarkdown } from '@/features/chat/lib/exportMarkdown'
import { buildExportJson } from '@/features/chat/lib/exportJson'
import type { ProjectRow } from '@/types/db'

interface Props {
  project: ProjectRow
}

/**
 * Phase 3.5 #64 — Section XII: Mitnehmen.
 *
 * Five paper cards: PDF / Markdown / JSON / Share-link / Email-stub.
 * The first three reuse the existing buildExportPdf + buildExportMarkdown
 * + buildExportJson library from Phase 3.4 #55. The Share-link card
 * is wired to the public share-token endpoint in #65 (placeholder
 * here). The email card is the Phase 4 stub.
 */
export function ExportHub({ project }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const { data: messages } = useMessages(project.id)
  const { data: events } = useProjectEvents(project.id)
  const [busy, setBusy] = useState<'pdf' | 'md' | 'json' | null>(null)

  const triggerExport = async (kind: 'pdf' | 'md' | 'json') => {
    setBusy(kind)
    try {
      if (kind === 'pdf') {
        const { buildExportPdf } = await import('@/features/chat/lib/exportPdf')
        const bytes = await buildExportPdf({
          project,
          messages: messages ?? [],
          events: events ?? [],
          lang,
        })
        download(
          new Blob([bytes as BlobPart], { type: 'application/pdf' }),
          buildExportFilename(project.name, 'pdf'),
        )
      } else if (kind === 'md') {
        const md = buildExportMarkdown({
          project,
          events: events ?? [],
          lang,
        })
        download(
          new Blob([md], { type: 'text/markdown;charset=utf-8' }),
          buildExportFilename(project.name, 'md'),
        )
      } else {
        const json = buildExportJson({
          project,
          messages: messages ?? [],
          events: events ?? [],
        })
        download(
          new Blob([JSON.stringify(json, null, 2)], {
            type: 'application/json;charset=utf-8',
          }),
          buildExportFilename(project.name, 'json'),
        )
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[result-export] failed', err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section
      id="sec-export"
      className="px-6 sm:px-12 lg:px-20 py-20 sm:py-24 max-w-3xl mx-auto w-full scroll-mt-16 flex flex-col gap-8"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          XII
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.export.eyebrow', { defaultValue: 'Mitnehmen' })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      <p className="font-serif italic text-[15px] text-ink/65 leading-relaxed max-w-xl">
        {t('result.export.intro', {
          defaultValue:
            'Dieses Briefing als Datei speichern oder mit einer/m Architekt:in teilen.',
        })}
      </p>

      <ul className="flex flex-col gap-3" data-no-print="true">
        <ExportCard
          icon={<FileText className="size-5" aria-hidden="true" />}
          title={t('result.export.pdf.title', {
            defaultValue: 'Vollständiges PDF',
          })}
          subtitle={t('result.export.pdf.body', {
            defaultValue: 'Atelier-Briefing-Format',
          })}
          ctaLabel={
            busy === 'pdf'
              ? t('result.export.busy', { defaultValue: '…' })
              : t('result.export.download', { defaultValue: 'Herunterladen' })
          }
          onClick={() => triggerExport('pdf')}
          disabled={busy !== null}
        />
        <ExportCard
          icon={<Download className="size-5" aria-hidden="true" />}
          title={t('result.export.md.title', {
            defaultValue: 'Markdown-Checkliste',
          })}
          subtitle={t('result.export.md.body', {
            defaultValue: 'Für Architekt:innen + Tools',
          })}
          ctaLabel={
            busy === 'md'
              ? t('result.export.busy', { defaultValue: '…' })
              : t('result.export.download', { defaultValue: 'Herunterladen' })
          }
          onClick={() => triggerExport('md')}
          disabled={busy !== null}
        />
        <ExportCard
          icon={<Braces className="size-5" aria-hidden="true" />}
          title={t('result.export.json.title', {
            defaultValue: 'JSON-Datenexport',
          })}
          subtitle={t('result.export.json.body', {
            defaultValue: 'Für Integrationen',
          })}
          ctaLabel={
            busy === 'json'
              ? t('result.export.busy', { defaultValue: '…' })
              : t('result.export.download', { defaultValue: 'Herunterladen' })
          }
          onClick={() => triggerExport('json')}
          disabled={busy !== null}
        />
        <ExportCard
          icon={<Link2 className="size-5" aria-hidden="true" />}
          title={t('result.export.share.title', {
            defaultValue: 'Link teilen',
          })}
          subtitle={t('result.export.share.body', {
            defaultValue: '30 Tage gültig · Nur lesender Zugriff',
          })}
          ctaLabel={t('result.export.share.cta', {
            defaultValue: 'Folgt im nächsten Commit',
          })}
          onClick={() => undefined}
          disabled
        />
        <ExportCard
          icon={<Mail className="size-5" aria-hidden="true" />}
          title={t('result.export.email.title', {
            defaultValue: 'An Architekt:in senden',
          })}
          subtitle={t('result.export.email.body', {
            defaultValue: 'E-Mail mit Briefing-Link',
          })}
          ctaLabel={t('result.export.email.cta', {
            defaultValue: 'Bald verfügbar',
          })}
          onClick={() => undefined}
          disabled
        />
      </ul>
    </section>
  )
}

function ExportCard({
  icon,
  title,
  subtitle,
  ctaLabel,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  ctaLabel: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <li
      className="border border-ink/12 rounded-[2px] bg-paper px-5 py-4 grid grid-cols-[32px_1fr_auto] gap-x-4 items-center transition-[transform,background-color] duration-soft motion-safe:hover:-translate-y-px motion-safe:hover:bg-clay/[0.03]"
      style={{ boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.55)' }}
    >
      <span className="text-drafting-blue/65 inline-flex items-center justify-center">
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-medium text-ink leading-snug">{title}</p>
        <p className="text-[12px] italic text-ink/65 leading-snug">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={
          'text-[13px] italic transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm whitespace-nowrap underline underline-offset-4 ' +
          (disabled
            ? 'text-ink/40 decoration-ink/20 cursor-not-allowed'
            : 'text-clay/85 hover:text-ink decoration-clay/55')
        }
      >
        {ctaLabel} →
      </button>
    </li>
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
