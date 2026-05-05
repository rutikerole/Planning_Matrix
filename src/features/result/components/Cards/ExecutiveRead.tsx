import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { composeExecutiveRead } from '../../lib/composeExecutiveRead'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

/**
 * Phase 8 — Overview tab's "Executive Read" column. Two to three
 * synthesised paragraphs from project state. Empty state surfaces a
 * calm "continue the consultation" CTA back to the chat.
 */
export function ExecutiveRead({ project, state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const exec = composeExecutiveRead({ project, state, lang })

  return (
    <section
      aria-labelledby="exec-read-eyebrow"
      className="flex flex-col gap-4"
    >
      <p
        id="exec-read-eyebrow"
        className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none"
      >
        {t('result.workspace.exec.eyebrow')}
      </p>
      {exec.isPopulated ? (
        <div className="flex flex-col gap-4 max-w-prose">
          {exec.paragraphs.map((p, idx) => (
            <p
              key={idx}
              className="text-[14.5px] text-ink/92 leading-[1.65]"
            >
              {p}
            </p>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-prose">
          <p className="font-serif italic text-[15px] text-clay leading-relaxed">
            {t('result.workspace.exec.empty')}
          </p>
          <Link
            to={`/projects/${project.id}`}
            className="inline-flex items-baseline text-[12.5px] italic text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft self-start"
          >
            {t('result.workspace.empty.continue')}
          </Link>
        </div>
      )}
    </section>
  )
}
