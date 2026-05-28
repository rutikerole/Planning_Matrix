import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GovResource,
  GovResourceCategory,
} from '@/data/governmentResources'

/**
 * Phase D (manager feedback) — "helpful government resources" on the
 * result Overview tab. Renders the shared federal sources first, then
 * the resources for the project's Bundesland (München projects also get
 * the city building authority). Links are real + official and open in a
 * new tab; see src/data/governmentResources.ts.
 *
 * The catalogue is loaded via a dynamic import so it chunk-splits out of
 * the main bundle (keeps us under the 300 KB gz ceiling). The type-only
 * import above is erased at build time and does not pull the data in. No
 * per-link prose is stored — each row shows a localised category label.
 */

const CATEGORY_LABEL_KEY: Record<GovResourceCategory, string> = {
  authority: 'result.workspace.overview.govResources.cat.authority',
  geoportal: 'result.workspace.overview.govResources.cat.geoportal',
  chamber: 'result.workspace.overview.govResources.cat.chamber',
  lawText: 'result.workspace.overview.govResources.cat.lawText',
  city: 'result.workspace.overview.govResources.cat.city',
  funding: 'result.workspace.overview.govResources.cat.funding',
  fees: 'result.workspace.overview.govResources.cat.fees',
}

export function GovernmentResources({
  bundesland,
}: {
  bundesland: string | null | undefined
}) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [resources, setResources] = useState<GovResource[] | null>(null)

  useEffect(() => {
    let alive = true
    void import('@/data/governmentResources').then((m) => {
      if (alive) {
        setResources([
          ...m.FEDERAL_RESOURCES,
          ...m.resourcesForBundesland(bundesland),
        ])
      }
    })
    return () => {
      alive = false
    }
  }, [bundesland])

  if (!resources || resources.length === 0) return null

  return (
    <section aria-labelledby="govres-eyebrow" className="flex flex-col gap-3">
      <p
        id="govres-eyebrow"
        className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none"
      >
        {t('result.workspace.overview.govResources.eyebrow')}
      </p>
      <p className="text-[11.5px] italic text-clay/85 leading-snug">
        {t('result.workspace.overview.govResources.intro')}
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {resources.map((r) => (
          <li
            key={r.url}
            className="border border-ink/12 rounded-[10px] bg-paper-card p-3.5 flex flex-col gap-1"
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-clay/85 leading-none">
              {t(CATEGORY_LABEL_KEY[r.category])}
            </span>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12.5px] text-drafting-blue hover:text-ink underline underline-offset-4 decoration-drafting-blue/45 transition-colors duration-soft leading-snug self-start"
            >
              {lang === 'en' ? r.titleEn : r.titleDe}{' '}
              <span aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-[11px] italic text-clay/72 leading-relaxed">
        {t('result.workspace.overview.govResources.disclaimer')}
      </p>
    </section>
  )
}
