import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { findCitation } from '../../lib/legalCitations'
import {
  composeLegalDomains,
  relevanceLabel,
  type LegalDomain,
  type LegalRelevance,
} from '../../lib/composeLegalDomains'
import { findRuleSnippet } from '@/data/legalRuleSnippets'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

/**
 * Phase 8 — Tab 2 Legal landscape. Three vertically-stacked domain
 * bands (A · Planungsrecht / B · Bauordnungsrecht / C · Sonstige
 * Vorgaben) with rule rows. Click a row → expand to show full citation
 * source. Empty domain → calm "not yet assessed" line + CTA back to
 * chat.
 */
export function LegalLandscapeTab({ project, state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [openCitation, setOpenCitation] = useState<string | null>(null)
  const domains = composeLegalDomains(state, lang)

  return (
    <div className="flex flex-col gap-5 max-w-[1100px]">
      {domains.map((domain) => (
        <DomainBand
          key={domain.key}
          domain={domain}
          lang={lang}
          projectId={project.id}
          openCitation={openCitation}
          onOpenCitation={setOpenCitation}
        />
      ))}
      <p className="font-serif italic text-[11.5px] text-clay/72 leading-relaxed">
        {t('result.legal.clickHint')}
      </p>
    </div>
  )
}

function DomainBand({
  domain,
  lang,
  projectId,
  openCitation,
  onOpenCitation,
}: {
  domain: LegalDomain
  lang: 'de' | 'en'
  projectId: string
  openCitation: string | null
  onOpenCitation: (next: string | null) => void
}) {
  const { t } = useTranslation()
  const relevance = relevanceLabel(domain.relevance, lang)

  return (
    <article className="border border-ink/12 rounded-[10px] bg-paper-card overflow-hidden">
      <header className="flex items-baseline justify-between gap-3 px-5 py-3.5 border-b border-ink/12">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="font-serif italic text-[18px] text-clay-deep leading-none tabular-nums">
            {domain.key}
          </span>
          <span className="font-serif italic text-[15px] text-ink leading-snug truncate">
            {domain.title}
          </span>
        </div>
        <span
          className={
            'text-[10px] font-medium uppercase tracking-[0.20em] tabular-nums whitespace-nowrap ' +
            relevanceTone(domain.relevance)
          }
        >
          {relevance}
        </span>
      </header>
      {domain.rows.length === 0 ? (
        <div className="px-5 py-5 flex flex-col gap-2">
          <p className="font-serif italic text-[13px] text-clay/85">
            {t('result.workspace.empty.tab')}
          </p>
          <Link
            to={`/projects/${projectId}`}
            className="self-start text-[11.5px] italic text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft"
          >
            {t('result.workspace.empty.continue')}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col">
          {domain.rows.map((row, idx) => {
            const cite = findCitation(row.label)
            const snippet = findRuleSnippet(row.label)
            const rowKey = `${domain.key}-${idx}`
            const open = openCitation === rowKey
            const interpretation = snippet
              ? lang === 'en'
                ? snippet.interpretationEn
                : snippet.interpretationDe
              : null
            return (
              <li
                key={rowKey}
                className={
                  'px-5 py-3 grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] sm:gap-4 sm:items-start ' +
                  (idx > 0 ? 'border-t border-ink/12' : '')
                }
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[12.5px] leading-snug font-medium text-ink">
                    {row.label}
                  </span>
                  {snippet && (
                    <button
                      type="button"
                      onClick={() => onOpenCitation(open ? null : rowKey)}
                      aria-expanded={open}
                      aria-label={t('result.workspace.legal.toggleSource')}
                      className="inline-flex items-center justify-center size-4 rounded-full text-clay/65 hover:text-ink hover:bg-ink/[0.06] transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card"
                    >
                      <Info aria-hidden="true" className="size-3" />
                    </button>
                  )}
                </div>
                <p className="text-[12px] text-ink/85 leading-[1.55] max-w-prose">
                  {interpretation ?? (
                    <span className="italic text-clay/65">
                      {t('result.workspace.legal.noInterpretation')}
                    </span>
                  )}
                </p>
                <span className="text-[11px] italic text-clay leading-snug whitespace-nowrap text-right">
                  {row.status}
                </span>
                {open && (
                  <div
                    role="region"
                    aria-label={cite?.label ?? row.label}
                    className="sm:col-span-3 mt-2 px-3 py-3 bg-drafting-blue/[0.04] border border-drafting-blue/15 rounded-[6px] flex flex-col gap-1.5"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-[0.20em] text-clay/85 leading-none">
                      {t('result.legal.sourceEyebrow')}
                    </p>
                    <p className="font-serif italic text-[13px] text-ink leading-snug">
                      {cite?.label ?? row.label}
                    </p>
                    <p className="text-[12px] text-ink/75 leading-relaxed">
                      {t('result.legal.whyHint')}
                    </p>
                    <a
                      href={snippet?.externalUrl ?? cite?.href ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11.5px] text-drafting-blue hover:text-ink underline underline-offset-4 decoration-drafting-blue/55 transition-colors duration-soft self-start"
                    >
                      {t('result.workspace.legal.readOfficial')} →
                    </a>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}

function relevanceTone(r: LegalRelevance): string {
  if (r === 'HIGH') return 'text-clay'
  if (r === 'PARTIAL') return 'text-clay/65'
  return 'text-ink/35'
}
