import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { aggregateQualifiers } from '../../lib/qualifierAggregate'
import { computeOpenItems } from '../../lib/computeOpenItems'
import { composeDoNext, type DoNextItem } from '../../lib/composeDoNext'
import { DataQualityDonut } from './DataQualityDonut'
import { RiskRegisterCard } from './RiskRegisterCard'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

/**
 * Phase 8 — Overview tab "Action cards" row. Three paper-cards in a
 * 3-column grid: Do next (top recommendations), Verify with architect
 * (open assumptions / risks), Data quality (donut + legend). Stacks
 * to single column on small viewports.
 */
export function ActionCards({ project, state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const doNext = composeDoNext({ project, state, lang, limit: 3 })

  const open = computeOpenItems(state, lang, 4)
  const aggregate = aggregateQualifiers(state)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ActionCard
        eyebrow={t('result.workspace.actions.doNextEyebrow')}
        countLabel={t('result.workspace.actions.doNextCount', { count: doNext.length })}
      >
        {doNext.length === 0 ? (
          <EmptyHint projectId={project.id} />
        ) : (
          <ol className="flex flex-col gap-2.5">
            {doNext.map((item, idx) => (
              <DoNextRow key={item.id} item={item} idx={idx + 1} />
            ))}
          </ol>
        )}
      </ActionCard>

      <ActionCard
        eyebrow={t('result.workspace.actions.verifyEyebrow')}
        countLabel={
          open.count > open.topPriority.length
            ? t('result.workspace.actions.verifyTopOf', {
                top: open.topPriority.length,
                of: open.count,
              })
            : t('result.workspace.actions.verifyCount', {
                count: open.topPriority.length,
              })
        }
      >
        {open.topPriority.length === 0 ? (
          <EmptyHint projectId={project.id} />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {open.topPriority.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 text-[11.5px] leading-snug"
              >
                <TriangleSigil />
                <Link
                  to={`/projects/${project.id}?focus=${encodeURIComponent(item.id)}`}
                  className="text-ink/85 hover:text-ink transition-colors duration-soft truncate"
                  title={item.label}
                >
                  {truncate(item.label, 56)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ActionCard>

      <ActionCard
        eyebrow={t('result.workspace.actions.dataQualityEyebrow')}
        countLabel={t('result.workspace.actions.dataQualityCount', {
          count: aggregate.total,
        })}
      >
        <DataQualityDonut state={state} />
      </ActionCard>

      <RiskRegisterCard project={project} state={state} />
    </div>
  )
}

function ActionCard({
  eyebrow,
  countLabel,
  children,
}: {
  eyebrow: string
  countLabel: string
  children: React.ReactNode
}) {
  return (
    <article className="flex flex-col gap-3 p-4 sm:p-[18px] bg-paper-card border border-ink/12 rounded-[10px]">
      <header className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none">
          {eyebrow}
        </span>
        <span className="text-[10.5px] italic font-serif text-clay/85 leading-none">
          {countLabel}
        </span>
      </header>
      <div>{children}</div>
    </article>
  )
}

function DoNextRow({ item, idx }: { item: DoNextItem; idx: number }) {
  const { t } = useTranslation()
  const numerals = ['i.', 'ii.', 'iii.']
  const sourceLabelKey =
    item.source === 'recommendation'
      ? 'result.workspace.doNext.fromRecommendations'
      : item.source === 'openItem'
        ? 'result.workspace.doNext.fromOpenItems'
        : 'result.workspace.doNext.fromBaseline'
  return (
    <li className="grid grid-cols-[18px_1fr] gap-x-2 items-baseline">
      <span className="font-serif italic text-[11px] text-clay/85 tabular-nums">
        {numerals[idx - 1] ?? `${idx}.`}
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-[12.5px] font-medium text-ink leading-snug">
          {item.title}
        </p>
        <p className="text-[10.5px] text-clay leading-snug" title={item.detail}>
          {truncate(item.detail, 80)}
        </p>
        <p className="text-[9.5px] italic font-serif text-clay/65 leading-none mt-0.5">
          {t(sourceLabelKey)}
        </p>
      </div>
    </li>
  )
}

function EmptyHint({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11.5px] italic text-clay/85 leading-snug">
        {t('result.workspace.empty.tab')}
      </p>
      <Link
        to={`/projects/${projectId}`}
        className="self-start text-[11px] italic text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft"
      >
        {t('result.workspace.empty.continue')}
      </Link>
    </div>
  )
}

function TriangleSigil() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-clay mt-0.5"
    >
      <path d="M 5.5 1.5 L 9.7 9 L 1.3 9 Z" />
      <circle cx="5.5" cy="7" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function truncate(input: string, max: number): string {
  if (!input) return ''
  if (input.length <= max) return input
  return `${input.slice(0, max - 1).trimEnd()}…`
}
