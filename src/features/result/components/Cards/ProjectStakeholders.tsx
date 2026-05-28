import { useTranslation } from 'react-i18next'

/**
 * Phase D (manager feedback) — the project-stakeholders ("Projektbeteiligte")
 * block, moved here from the Team tab. The manager's note: these four
 * actors (owner / architect / engineers / building authority) are the
 * parties *involved* in the project, not the specialists you *hire*, so
 * they don't belong on the "Team needed" hire list. They now live on the
 * Overview tab as project context.
 *
 * Content is static (the canonical four-actor mental model); the eyebrow
 * is localised. DE/EN strings follow the locale-pair pattern used across
 * the result surface (passes verify:hardcoded-de).
 */

interface StakeholderRow {
  key: 'bauherr' | 'designer' | 'engineer' | 'authority'
  titleDe: string
  titleEn: string
  detailDe: string
  detailEn: string
}

const STAKEHOLDERS: StakeholderRow[] = [
  {
    key: 'bauherr',
    titleDe: 'Bauherr:in',
    titleEn: 'Owner',
    detailDe: 'Sie. Beauftragt das Vorhaben, trägt die Kosten, entscheidet.',
    detailEn: 'You. Commissions the project, carries the costs, decides.',
  },
  {
    key: 'designer',
    titleDe: 'Architekt:in',
    titleEn: 'Architect',
    detailDe: 'Bauvorlageberechtigt. Reicht im Namen der Bauherrschaft ein.',
    detailEn: 'Licensed for submissions. Files on the owner’s behalf.',
  },
  {
    key: 'engineer',
    titleDe: 'Fachplaner:innen',
    titleEn: 'Engineers',
    detailDe: 'Tragwerksplanung, Energieberatung, Brandschutz, Vermessung.',
    detailEn: 'Structural, energy, fire protection, surveying.',
  },
  {
    key: 'authority',
    titleDe: 'Bauamt',
    titleEn: 'Building authority',
    detailDe: 'Kommunale Genehmigungsbehörde. Prüft und entscheidet.',
    detailEn: 'Municipal permitting body. Reviews and decides.',
  },
]

export function ProjectStakeholders() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  return (
    <section aria-labelledby="stake-eyebrow" className="flex flex-col gap-3">
      <p
        id="stake-eyebrow"
        className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none"
      >
        {t('result.workspace.team.stakeholdersEyebrow')}
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STAKEHOLDERS.map((s) => (
          <li
            key={s.key}
            className="border border-ink/12 rounded-[10px] bg-paper-card p-4 flex flex-col gap-1.5"
          >
            <p className="text-[11.5px] font-medium uppercase tracking-[0.18em] text-clay leading-none">
              {lang === 'en' ? s.titleEn : s.titleDe}
            </p>
            <p className="text-[12.5px] text-ink/85 leading-snug">
              {lang === 'en' ? s.detailEn : s.detailDe}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
