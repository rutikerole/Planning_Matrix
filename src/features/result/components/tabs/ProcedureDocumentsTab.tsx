import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectRow } from '@/types/db'
import type {
  DocumentItem,
  ItemStatus,
  ProjectState,
} from '@/types/projectState'
import { PROCEDURE_PHASES, totalPhaseWeight } from '../../lib/composeTimeline'
import { useResolvedProcedures } from '../../hooks/useResolvedProcedures'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

type DocFilter = 'all' | 'erforderlich' | 'liegt_vor' | 'eingereicht' | 'genehmigt'

/**
 * Phase 8 — Tab 3 Procedure & documents.
 *
 * Three sub-sections: procedure pick (big card with the chosen
 * procedure + rationale + procedure-type tags), documents grid with
 * filter chips, and a horizontal procedure-phase timeline. The
 * documents grid replaces the legacy kanban; the kanban's
 * persistence interactions live in DocumentChecklist (orphaned in
 * commit 13).
 */
export function ProcedureDocumentsTab({ project, state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [filter, setFilter] = useState<DocFilter>('all')
  const [openDocId, setOpenDocId] = useState<string | null>(null)

  const resolved = useResolvedProcedures(project, state)
  const documents = useMemo(() => state.documents ?? [], [state.documents])
  const primary =
    resolved.procedures.find((p) => p.status === 'erforderlich') ??
    resolved.procedures[0]
  const fallback = resolved.procedures.find((p) => p.id !== primary?.id)

  const filtered = useMemo(() => {
    if (filter === 'all') return documents
    return documents.filter((d) => d.status === filter)
  }, [documents, filter])

  const totalWeight = totalPhaseWeight()

  return (
    <div className="flex flex-col gap-10 max-w-[1100px]">
      {/* Procedure pick */}
      <section aria-labelledby="procedure-pick-eyebrow" className="flex flex-col gap-3">
        <p
          id="procedure-pick-eyebrow"
          className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none"
        >
          {t('result.workspace.procedure.pickEyebrow')}
        </p>
        {primary ? (
          <article className="border border-ink/12 rounded-[10px] bg-paper-card p-5 sm:p-6 flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 className="font-serif italic text-[22px] sm:text-[26px] text-ink leading-[1.1] -tracking-[0.01em]">
                {lang === 'en' ? primary.title_en : primary.title_de}
              </h2>
              {!resolved.isFromState && (
                <span className="text-[10px] italic font-serif text-clay/85 leading-none whitespace-nowrap">
                  {t('result.workspace.team.likelyBadge')}
                </span>
              )}
            </div>
            <p className="text-[14px] text-ink/85 leading-[1.6] max-w-prose">
              {(lang === 'en' ? primary.rationale_en : primary.rationale_de) ||
                t('result.workspace.procedure.noRationale')}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <Tag>{statusToTag(primary.status, lang, t)}</Tag>
              <Tag tone="muted">
                {primary.qualifier?.source ?? '—'} ·{' '}
                {primary.qualifier?.quality ?? '—'}
              </Tag>
            </div>
            {fallback && (
              <p className="text-[12px] italic text-clay/85 leading-snug border-t border-ink/12 pt-3 mt-1">
                {t('result.workspace.procedure.fallback', {
                  title: lang === 'en' ? fallback.title_en : fallback.title_de,
                })}
              </p>
            )}
          </article>
        ) : (
          <article className="border border-dashed border-ink/15 rounded-[10px] bg-paper-card p-5 flex flex-col gap-2">
            <p className="font-serif italic text-[14px] text-clay leading-relaxed">
              {t('result.workspace.empty.tab')}
            </p>
          </article>
        )}
      </section>

      {/* Documents grid */}
      <section aria-labelledby="docs-eyebrow" className="flex flex-col gap-3">
        <header className="flex items-baseline justify-between gap-3 flex-wrap">
          <p
            id="docs-eyebrow"
            className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none"
          >
            {t('result.workspace.procedure.docsEyebrow')}
          </p>
          <span className="font-serif italic text-[11px] text-clay/85">
            {t('result.workspace.procedure.docsCount', { count: documents.length })}
          </span>
        </header>
        <div className="flex flex-wrap gap-2">
          {(['all', 'erforderlich', 'liegt_vor', 'eingereicht', 'genehmigt'] as const).map(
            (key) => (
              <FilterChip
                key={key}
                active={filter === key}
                onClick={() => setFilter(key)}
                label={t(`result.workspace.procedure.filter.${key}`)}
              />
            ),
          )}
        </div>
        {filtered.length === 0 ? (
          <p className="text-[12.5px] italic text-clay/85 leading-relaxed mt-2">
            {documents.length === 0
              ? t('result.workspace.empty.tab')
              : t('result.workspace.procedure.filterEmpty')}
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {filtered.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                lang={lang}
                open={openDocId === doc.id}
                onToggle={() =>
                  setOpenDocId((prev) => (prev === doc.id ? null : doc.id))
                }
              />
            ))}
          </ul>
        )}
      </section>

      {/* Procedure timeline */}
      <section aria-labelledby="phases-eyebrow" className="flex flex-col gap-3">
        <p
          id="phases-eyebrow"
          className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none"
        >
          {t('result.workspace.procedure.timelineEyebrow')}
        </p>
        <div className="border border-ink/12 rounded-[10px] bg-paper-card p-4 sm:p-5 flex flex-col gap-3">
          {PROCEDURE_PHASES.map((phase) => {
            const widthPct = Math.round((phase.weight / totalWeight) * 100)
            return (
              <div
                key={phase.key}
                className="flex flex-col gap-1.5 sm:grid sm:grid-cols-[140px_1fr_auto] sm:items-center sm:gap-3 text-[12.5px]"
              >
                <div className="flex items-baseline justify-between gap-3 sm:contents">
                  <span className="text-ink/85">
                    {lang === 'en' ? phase.labelEn : phase.labelDe}
                  </span>
                  <span className="sm:order-3 font-serif italic text-clay-deep tabular-nums whitespace-nowrap text-right">
                    {lang === 'en' ? phase.rangeEn : phase.rangeDe}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className="block h-2 bg-clay/45 rounded-[1px] sm:order-2"
                  style={{ width: `${widthPct}%`, minWidth: '8px' }}
                />
              </div>
            )
          })}
          <span aria-hidden="true" className="block h-px w-full bg-ink/12 mt-1" />
          <p className="text-[11px] italic text-clay leading-relaxed">
            {t('result.costTimeline.totalDuration')} ·{' '}
            {t('result.costTimeline.caveat')}
          </p>
        </div>
      </section>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center h-7 px-3 rounded-full text-[11.5px] font-medium border transition-colors duration-soft',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        active
          ? 'bg-ink text-paper border-ink'
          : 'bg-paper border-ink/15 text-ink/65 hover:border-ink/30 hover:text-ink',
      )}
    >
      {label}
    </button>
  )
}

function DocumentCard({
  doc,
  lang,
  open,
  onToggle,
}: {
  doc: DocumentItem
  lang: 'de' | 'en'
  open: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const title = lang === 'en' ? doc.title_en : doc.title_de
  const producer = doc.produced_by[0] ?? null
  return (
    <li className="border border-ink/12 rounded-[10px] bg-paper-card p-4 flex flex-col gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card rounded-sm"
      >
        <FileText aria-hidden="true" className="size-3.5 shrink-0 text-clay/85 mt-0.5" />
        <p className="text-[13px] font-medium text-ink leading-snug min-w-0 break-words">
          {title}
        </p>
      </button>
      <div className="flex items-center gap-2 flex-wrap">
        <Tag tone={statusTone(doc.status)}>
          {statusToTag(doc.status, lang, t)}
        </Tag>
        {producer && (
          <span className="text-[10.5px] italic text-clay/85 leading-snug">
            {producer}
          </span>
        )}
      </div>
      {open && (
        <div className="text-[12px] text-ink/75 leading-relaxed border-t border-ink/12 pt-2 mt-1 flex flex-col gap-1">
          {doc.required_for.length > 0 && (
            <p>
              <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-clay">
                {t('result.workspace.procedure.requiredFor')}
              </span>
              <br />
              {doc.required_for.join(', ')}
            </p>
          )}
          {doc.qualifier?.reason && (
            <p className="italic text-clay/85">{doc.qualifier.reason}</p>
          )}
        </div>
      )}
    </li>
  )
}

function Tag({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'muted' | 'success' | 'warning'
}) {
  const styles = {
    default: 'bg-clay/10 text-clay-deep border-clay/25',
    muted: 'bg-paper text-ink/65 border-ink/15',
    success: 'bg-drafting-blue/10 text-drafting-blue border-drafting-blue/25',
    warning: 'bg-clay/15 text-clay border-clay/40',
  }[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium uppercase tracking-[0.16em] border',
        styles,
      )}
    >
      {children}
    </span>
  )
}

function statusToTag(
  status: ItemStatus,
  lang: 'de' | 'en',
  t: (k: string) => string,
): string {
  void t
  const map: Record<ItemStatus, { de: string; en: string }> = {
    nicht_erforderlich: { de: 'nicht erforderlich', en: 'not required' },
    erforderlich: { de: 'erforderlich', en: 'required' },
    liegt_vor: { de: 'liegt vor', en: 'drafted' },
    freigegeben: { de: 'freigegeben', en: 'released' },
    eingereicht: { de: 'eingereicht', en: 'submitted' },
    genehmigt: { de: 'genehmigt', en: 'approved' },
  }
  return map[status][lang]
}

function statusTone(status: ItemStatus): 'default' | 'muted' | 'success' | 'warning' {
  if (status === 'genehmigt' || status === 'freigegeben') return 'success'
  if (status === 'eingereicht' || status === 'liegt_vor') return 'success'
  if (status === 'nicht_erforderlich') return 'muted'
  return 'warning'
}
