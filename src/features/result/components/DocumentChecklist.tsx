// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #72 — Section V: Document checklist as a 3-column kanban
//
// Replaces the HOAI-grouped paper-tab checklist with a working surface:
// Erforderlich → In Arbeit → Liegt vor. Click-to-move (Q6 locked: not
// drag-and-drop). Status persists via projects.update; the "In Arbeit"
// middle column is a localStorage flag (no canonical ItemStatus matches
// "in progress").
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, Download, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { DocumentItem, ProjectState } from '@/types/projectState'
import type { ProjectRow } from '@/types/db'
import { buildExportFilename } from '@/features/chat/lib/exportFilename'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

type Column = 'erforderlich' | 'in_arbeit' | 'liegt_vor'

const COMPLETE_STATUSES = new Set([
  'liegt_vor',
  'eingereicht',
  'genehmigt',
  'freigegeben',
])

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

export function DocumentChecklist({ project, state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const queryClient = useQueryClient()
  const documents = state.documents ?? []
  const totalCount = documents.length

  // localStorage-backed `in_arbeit` flags. The kanban reads them at
  // mount and forwards toggles to the cards.
  const [inProgress, setInProgress] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(`pm:docs-progress:${project.id}`)
      if (!raw) return
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) setInProgress(new Set(arr))
    } catch {
      /* corrupt blob — start fresh */
    }
  }, [project.id])

  const persistProgress = (next: Set<string>) => {
    try {
      window.localStorage.setItem(
        `pm:docs-progress:${project.id}`,
        JSON.stringify(Array.from(next)),
      )
    } catch {
      /* incognito etc — skip */
    }
  }

  const setDocStatus = async (docId: string, status: DocumentItem['status']) => {
    const cached = queryClient.getQueryData<ProjectRow>(['project', project.id])
    const stateNow = (cached?.state ?? {}) as Partial<ProjectState>
    const docs = (stateNow.documents ?? []).map((d) =>
      d.id === docId ? { ...d, status } : d,
    )
    const nextState = { ...stateNow, documents: docs }
    const { error } = await supabase
      .from('projects')
      .update({ state: nextState })
      .eq('id', project.id)
    if (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[DocumentChecklist] persist failed:', error.message)
      }
      return
    }
    queryClient.setQueryData<ProjectRow>(['project', project.id], (old) =>
      old ? { ...old, state: nextState as ProjectRow['state'] } : old,
    )
  }

  const columnize = useMemo(() => {
    const cols: Record<Column, DocumentItem[]> = {
      erforderlich: [],
      in_arbeit: [],
      liegt_vor: [],
    }
    documents.forEach((d) => {
      if (COMPLETE_STATUSES.has(d.status)) {
        cols.liegt_vor.push(d)
      } else if (inProgress.has(d.id)) {
        cols.in_arbeit.push(d)
      } else {
        cols.erforderlich.push(d)
      }
    })
    return cols
  }, [documents, inProgress])

  if (totalCount === 0) return null

  const moveStart = (doc: DocumentItem) => {
    const next = new Set(inProgress)
    next.add(doc.id)
    setInProgress(next)
    persistProgress(next)
  }
  const moveDone = async (doc: DocumentItem) => {
    const next = new Set(inProgress)
    next.delete(doc.id)
    setInProgress(next)
    persistProgress(next)
    await setDocStatus(doc.id, 'liegt_vor')
  }
  const moveBack = async (doc: DocumentItem) => {
    const next = new Set(inProgress)
    next.delete(doc.id)
    setInProgress(next)
    persistProgress(next)
    if (COMPLETE_STATUSES.has(doc.status)) {
      await setDocStatus(doc.id, 'erforderlich')
    }
  }

  return (
    <section
      id="sec-documents"
      className="px-4 sm:px-12 lg:px-20 py-14 sm:py-24 max-w-5xl mx-auto w-full scroll-mt-16 flex flex-col gap-8"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          V
        </span>
        <span className="text-[11px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.checklist.eyebrow', {
            defaultValue: 'Erforderliche Unterlagen',
          })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      <p className="text-[14px] text-ink/75 leading-relaxed max-w-xl">
        {t('result.checklist.kanbanIntro', {
          defaultValue:
            '{{n}} Dokumente sind für die Antragstellung vorzubereiten. Verschieben Sie Karten zwischen den Spalten, sobald Sie ein Dokument anfordern oder erhalten haben.',
          n: totalCount,
        })}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KanbanColumn
          title={t('result.checklist.colRequired', {
            defaultValue: 'Erforderlich',
          })}
          count={columnize.erforderlich.length}
          tone="clay"
        >
          {columnize.erforderlich.map((doc) => (
            <KanbanCard
              key={doc.id}
              doc={doc}
              lang={lang}
              actionLabel={t('result.checklist.startWork', {
                defaultValue: 'Anfordern',
              })}
              actionIcon="forward"
              onAction={() => moveStart(doc)}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn
          title={t('result.checklist.colInProgress', {
            defaultValue: 'In Arbeit',
          })}
          count={columnize.in_arbeit.length}
          tone="drafting-blue"
        >
          {columnize.in_arbeit.map((doc) => (
            <KanbanCard
              key={doc.id}
              doc={doc}
              lang={lang}
              actionLabel={t('result.checklist.markDone', {
                defaultValue: 'Liegt vor',
              })}
              actionIcon="check"
              onAction={() => void moveDone(doc)}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn
          title={t('result.checklist.colDone', {
            defaultValue: 'Liegt vor',
          })}
          count={columnize.liegt_vor.length}
          tone="ink"
        >
          {columnize.liegt_vor.map((doc) => (
            <KanbanCard
              key={doc.id}
              doc={doc}
              lang={lang}
              actionLabel={t('result.checklist.moveBack', {
                defaultValue: 'Zurück',
              })}
              actionIcon="back"
              onAction={() => void moveBack(doc)}
              done
            />
          ))}
        </KanbanColumn>
      </div>

      <div className="pt-2">
        <ChecklistPdfLink project={project} state={state} t={t} />
      </div>
    </section>
  )
}

interface KanbanColumnProps {
  title: string
  count: number
  tone: 'clay' | 'drafting-blue' | 'ink'
  children: React.ReactNode
}

function KanbanColumn({ title, count, tone, children }: KanbanColumnProps) {
  // Phase 3.9 #95 — mobile collapsibility. Column body is wrapped in
  // <details>/<summary> on small viewports so a 3-column stack of long
  // checklists doesn't bury later sections. The summary is a 44 px hit
  // target; chevron flips on open via the [&[open]] descendant variant.
  // Desktop (md:) renders the same shape but `details` opens by default
  // and the summary's chevron + cursor are suppressed (md:[&_summary]:cursor-default).
  const accent =
    tone === 'clay'
      ? 'border-clay/35 bg-clay/[0.04]'
      : tone === 'drafting-blue'
        ? 'border-drafting-blue/30 bg-drafting-blue/[0.03]'
        : 'border-ink/20 bg-ink/[0.02]'
  const headerColor =
    tone === 'clay'
      ? 'text-clay'
      : tone === 'drafting-blue'
        ? 'text-drafting-blue'
        : 'text-ink'
  return (
    <details
      open
      className={cn(
        'group rounded-[var(--pm-radius-card)] border p-4 [&_summary::-webkit-details-marker]:hidden',
        accent,
      )}
    >
      <summary className="flex items-baseline justify-between min-h-[44px] cursor-pointer md:cursor-default list-none select-none">
        <span className={cn('text-[11px] font-medium uppercase tracking-[0.18em]', headerColor)}>
          {title}
        </span>
        <span className="flex items-baseline gap-3">
          <span className="font-serif italic text-clay tabular-nums">{count}</span>
          <span
            aria-hidden="true"
            className="md:hidden text-ink/45 text-[14px] leading-none transition-transform duration-soft group-open:rotate-90"
          >
            ›
          </span>
        </span>
      </summary>
      <ul role="list" className="flex flex-col gap-2 min-h-[60px] mt-3">
        {children}
      </ul>
    </details>
  )
}

interface KanbanCardProps {
  doc: DocumentItem
  lang: 'de' | 'en'
  actionLabel: string
  actionIcon: 'forward' | 'back' | 'check'
  onAction: () => void
  done?: boolean
}

function KanbanCard({ doc, lang, actionLabel, actionIcon, onAction, done }: KanbanCardProps) {
  const { t } = useTranslation()
  const title = lang === 'en' ? doc.title_en : doc.title_de
  const producer = doc.produced_by[0] ?? null
  const producerLabel = producer ? PARTY_LABELS_DE[producer] ?? producer : null

  const Icon =
    actionIcon === 'forward' ? ArrowRight : actionIcon === 'back' ? ArrowLeft : Check

  return (
    <li
      className={cn(
        'flex flex-col gap-1.5 px-3 py-2.5 bg-paper border border-ink/15 rounded-[var(--pm-radius-card)]',
        'transition-colors duration-soft hover:border-ink/30',
      )}
      style={{ boxShadow: 'var(--pm-shadow-card)' }}
    >
      <div className="flex items-baseline gap-2">
        <FileText aria-hidden="true" className="size-3.5 shrink-0 text-clay/85" />
        <p
          className={cn(
            'text-[13px] font-medium leading-snug min-w-0 break-words',
            done ? 'text-ink/70' : 'text-ink',
          )}
        >
          {title}
        </p>
      </div>
      {producerLabel && (
        <p className="text-[11px] italic text-clay/85 leading-snug pl-5">
          {t('result.checklist.producerLabel', { defaultValue: 'Wer erstellt?' })}{' '}
          {producerLabel}
        </p>
      )}
      <button
        type="button"
        onClick={onAction}
        className={cn(
          'inline-flex items-center gap-1.5 self-stretch sm:self-end justify-center h-9 sm:h-7 px-3 text-[12px] sm:text-[11.5px] font-medium border transition-colors duration-soft',
          'rounded-[var(--pm-radius-pill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          done
            ? 'border-ink/15 text-ink/65 hover:border-ink/30 hover:text-ink bg-paper'
            : 'border-ink bg-ink text-paper hover:bg-ink/92',
        )}
      >
        <Icon aria-hidden="true" className="size-3" />
        {actionLabel}
      </button>
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
