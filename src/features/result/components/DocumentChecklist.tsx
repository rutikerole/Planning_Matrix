import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import type { DocumentItem, ProjectState } from '@/types/projectState'
import type { ProjectRow } from '@/types/db'
import { groupByPhase, HOAI_LABELS_DE, HOAI_LABELS_EN, type HoaiPhase } from '../lib/hoaiPhases'
import { isChecked, setChecked } from '../lib/checklistStorage'
import { buildExportFilename } from '@/features/chat/lib/exportFilename'
import { PaperCheckbox } from './PaperCheckbox'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

const STATUS_LABELS_DE: Record<string, string> = {
  nicht_erforderlich: 'nicht erforderlich',
  erforderlich: 'erforderlich',
  liegt_vor: 'liegt vor',
  freigegeben: 'freigegeben',
  eingereicht: 'eingereicht',
  genehmigt: 'genehmigt',
}

const STATUS_LABELS_EN: Record<string, string> = {
  nicht_erforderlich: 'not required',
  erforderlich: 'required',
  liegt_vor: 'on hand',
  freigegeben: 'approved',
  eingereicht: 'submitted',
  genehmigt: 'permitted',
}

const PARTY_LABELS_DE: Record<string, string> = {
  bauherr: 'Bauherr',
  architekt: 'Architekt:in',
  fachplaner: 'Fachplaner:in',
  vermesser: 'Vermesser:in',
  tragwerksplaner: 'Tragwerksplaner:in',
  energieberater: 'Energieberater:in',
  brandschutzplaner: 'Brandschutzplaner:in',
  bauamt: 'Bauamt',
}

/**
 * Phase 3.5 #62 — Section V: Erforderliche Unterlagen.
 *
 * Documents grouped by HOAI Leistungsphase (LP 1 ... LP 9), each with
 * a custom paper-tab checkbox + title + producer hint + status pill.
 * Toggling a checkbox persists per (project, doc) to localStorage so
 * the user can track progress across sessions.
 *
 * "Checkliste als PDF herunterladen" link triggers the focused
 * checklist export (one A4 page) — pdf-lib + brand fonts loaded
 * dynamically so the bundle stays small.
 */
export function DocumentChecklist({ project, state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const documents = state.documents ?? []
  const grouped = groupByPhase(documents)
  const totalCount = documents.length

  if (totalCount === 0) return null

  return (
    <section
      id="sec-documents"
      className="px-6 sm:px-12 lg:px-20 py-20 sm:py-24 max-w-3xl mx-auto w-full scroll-mt-16 flex flex-col gap-8"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          V
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.checklist.eyebrow', { defaultValue: 'Erforderliche Unterlagen' })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      <p className="font-serif italic text-[15px] text-ink/65 leading-relaxed max-w-xl">
        {t('result.checklist.intro', {
          defaultValue:
            '{{n}} Dokumente sind für die Antragstellung vorzubereiten.',
          n: totalCount,
        })}
      </p>

      <div className="flex flex-col gap-10">
        {Array.from(grouped.entries()).map(([phase, docs]) => (
          <PhaseGroup
            key={phase}
            phase={phase}
            docs={docs}
            project={project}
            lang={lang}
          />
        ))}
      </div>

      <div className="pt-2">
        <ChecklistPdfLink project={project} state={state} t={t} />
      </div>
    </section>
  )
}

function PhaseGroup({
  phase,
  docs,
  project,
  lang,
}: {
  phase: HoaiPhase
  docs: DocumentItem[]
  project: ProjectRow
  lang: 'de' | 'en'
}) {
  const labels = lang === 'en' ? HOAI_LABELS_EN : HOAI_LABELS_DE
  return (
    <div className="grid grid-cols-[60px_1fr] gap-x-5">
      <div className="flex flex-col gap-1">
        <span className="font-serif italic text-[14px] text-clay-deep tabular-figures leading-none">
          {phase}
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-clay/60 leading-snug">
          {labels[phase]}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {docs.map((doc) => (
          <DocumentRow key={doc.id} project={project} doc={doc} lang={lang} />
        ))}
      </ul>
    </div>
  )
}

function DocumentRow({
  project,
  doc,
  lang,
}: {
  project: ProjectRow
  doc: DocumentItem
  lang: 'de' | 'en'
}) {
  const { t } = useTranslation()
  const [checked, setLocalChecked] = useState(false)
  // Hydrate from localStorage on mount.
  useEffect(() => {
    setLocalChecked(isChecked(project.id, doc.id))
  }, [project.id, doc.id])

  const title = lang === 'en' ? doc.title_en : doc.title_de
  const statusLabel =
    (lang === 'en' ? STATUS_LABELS_EN : STATUS_LABELS_DE)[doc.status] ?? doc.status
  const producer =
    doc.produced_by[0] ?? null
  const producerLabel = producer
    ? PARTY_LABELS_DE[producer] ?? producer
    : null

  return (
    <li
      className="grid grid-cols-[24px_1fr] gap-x-3 px-3 py-3 border border-ink/12 rounded-[2px] bg-paper"
      style={{
        boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.55)',
      }}
    >
      <PaperCheckbox
        checked={checked}
        onToggle={(next) => {
          setLocalChecked(next)
          setChecked(project.id, doc.id, next)
        }}
        ariaLabel={title}
      />
      <div className="flex flex-col gap-0.5">
        <p
          className={
            'text-[15px] font-medium leading-snug ' +
            (checked ? 'text-ink/55 line-through decoration-clay/55 decoration-1' : 'text-ink')
          }
        >
          {title}
        </p>
        {producerLabel && (
          <p className="text-[12px] italic text-clay/85 leading-snug">
            {t('result.checklist.producerLabel', {
              defaultValue: 'Wer erstellt?',
            })}{' '}
            {producerLabel}
          </p>
        )}
        <p className="text-[11px] italic text-ink/55 leading-snug">
          {t('result.checklist.statusLabel', { defaultValue: 'Status' })}:{' '}
          <span className="text-clay/85 not-italic">{statusLabel}</span>
        </p>
      </div>
    </li>
  )
}

function ChecklistPdfLink({
  project,
  state,
  t,
}: {
  project: ProjectRow
  state: Partial<ProjectState>
  t: (k: string, opts?: { defaultValue?: string }) => string
}) {
  const { i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [busy, setBusy] = useState(false)

  const handleDownload = async () => {
    setBusy(true)
    try {
      const { buildChecklistPdf } = await import('../lib/exportChecklistPdf')
      const bytes = await buildChecklistPdf({ project, state, lang })
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = buildExportFilename(`${project.name}-checkliste`, 'pdf')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[checklist-pdf] failed', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={busy}
      className="inline-flex items-center gap-2 text-[13px] italic text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm disabled:opacity-60"
    >
      <Download className="size-3.5" aria-hidden="true" />
      {busy
        ? t('result.checklist.pdfBusy', { defaultValue: 'PDF wird erstellt …' })
        : t('result.checklist.pdfCta', {
            defaultValue: 'Checkliste als PDF herunterladen',
          })}{' '}
      →
    </button>
  )
}
