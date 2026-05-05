import { useTranslation } from 'react-i18next'
import type { ProjectRow } from '@/types/db'
import type { ProjectState, Role } from '@/types/projectState'
import { RoleGlyph } from '../RoleGlyphs'
import { inferRoleGlyphKey } from '../RoleGlyphs.helpers'
import { ROLE_EFFORT_LOOKUP, type RoleKey } from '../../lib/roleEffortLookup'
import { useResolvedRoles } from '../../hooks/useResolvedRoles'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

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

/**
 * Phase 8 — Tab 4 Team. Two sections: needed roles (one card per
 * `state.roles.filter(r.needed === true)`, with glyph + qualification +
 * rationale + effort estimate from ROLE_EFFORT_LOOKUP) and a canonical
 * Stakeholders section below (Bauherr / Architekt / Fachplaner /
 * Bauamt — the four-actor mental model).
 */
export function TeamTab({ project, state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const resolved = useResolvedRoles(project, state)
  const roles = resolved.roles.filter((r) => r.needed)

  return (
    <div className="flex flex-col gap-10 max-w-[1100px]">
      {/* Specialists needed */}
      <section aria-labelledby="team-eyebrow" className="flex flex-col gap-3">
        <header className="flex items-baseline justify-between gap-3 flex-wrap">
          <p
            id="team-eyebrow"
            className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none"
          >
            {t('result.workspace.team.eyebrow')}
          </p>
          <span className="font-serif italic text-[11px] text-clay/85">
            {t('result.workspace.team.count', { count: roles.length })}
          </span>
        </header>
        {!resolved.isFromState && roles.length > 0 && (
          <p className="text-[11px] italic text-clay/85 leading-snug">
            {t('result.workspace.team.baselineNote')}
          </p>
        )}
        {roles.length === 0 ? (
          <p className="text-[12.5px] italic text-clay/85 leading-relaxed">
            {t('result.workspace.empty.tab')}
          </p>
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                lang={lang}
                isBaseline={!resolved.isFromState}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Stakeholders */}
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
    </div>
  )
}

function RoleCard({
  role,
  lang,
  isBaseline,
}: {
  role: Role
  lang: 'de' | 'en'
  isBaseline: boolean
}) {
  const { t } = useTranslation()
  const glyphKey = inferRoleGlyphKey(role.title_de)
  const lookup = ROLE_EFFORT_LOOKUP[glyphKey as RoleKey]
  const title =
    lang === 'en'
      ? lookup?.titleEn ?? role.title_en
      : lookup?.titleDe ?? role.title_de
  const qualification =
    lang === 'en' ? lookup?.qualificationEn : lookup?.qualificationDe
  const description =
    lang === 'en'
      ? role.rationale_en || role.rationale_de
      : role.rationale_de
  const showEffort = lookup?.rangeHours && lookup.rangeHours !== '—'
  return (
    <li className="border border-ink/12 rounded-[10px] bg-paper-card p-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5 flex-wrap">
        <RoleGlyph role={glyphKey} />
        <span className="text-[11.5px] font-medium uppercase tracking-[0.18em] text-clay leading-none">
          {title}
        </span>
        {isBaseline && (
          <span className="text-[10px] italic font-serif text-clay/72 leading-none">
            · {t('result.workspace.team.likelyBadge')}
          </span>
        )}
      </div>
      {qualification && (
        <p className="font-serif italic text-[12.5px] text-clay/85 leading-snug">
          {qualification}
        </p>
      )}
      {description && (
        <p className="text-[13px] text-ink/85 leading-[1.55]">{description}</p>
      )}
      {showEffort && (
        <p className="text-[11px] text-ink/65 leading-none mt-0.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-clay mr-2">
            {t('result.workspace.team.effortLabel')}
          </span>
          <span className="font-serif italic text-clay-deep tabular-nums">
            {lookup.rangeHours}
          </span>
        </p>
      )}
    </li>
  )
}
