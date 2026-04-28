import { useTranslation } from 'react-i18next'
import type { ProjectState } from '@/types/projectState'
import { RoleGlyph, inferRoleGlyphKey } from './RoleGlyphs'
import { ROLE_EFFORT_LOOKUP, type RoleKey } from '../lib/roleEffortLookup'

interface Props {
  state: Partial<ProjectState>
}

/**
 * Phase 3.5 #62 — Section VI: Das Team.
 *
 * Renders one paper-card per specialist role from `state.roles` where
 * `needed === true`. Each card: hand-drawn 14×14 role glyph (Architekt
 * / Tragwerksplaner / Energieberater / Vermesser / Brandschutzplaner /
 * Bauamt — see RoleGlyphs.tsx) + Inter 14 0.20em uppercase title +
 * italic Serif clay qualification line + Inter 14 ink description +
 * effort estimate footer.
 *
 * The role glyph + qualification + effort all come from
 * `roleEffortLookup.ts` once the role's title is matched against the
 * 6-key registry. Falls back to a clay-dot glyph for unknown roles.
 */
export function SpecialistsRequired({ state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const roles = (state.roles ?? []).filter((r) => r.needed)
  if (roles.length === 0) return null

  return (
    <section
      id="sec-specialists"
      className="px-6 sm:px-12 lg:px-20 py-20 sm:py-24 max-w-3xl mx-auto w-full scroll-mt-16 flex flex-col gap-8"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          VI
        </span>
        <span className="text-[11px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.specialists.eyebrow', { defaultValue: 'Das Team' })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      <p className="font-serif italic text-[15px] text-ink/65 leading-relaxed max-w-xl">
        {t('result.specialists.intro', {
          defaultValue:
            '{{n}} Fachpersonen werden für Ihr Vorhaben benötigt.',
          n: roles.length,
        })}
      </p>

      <ul className="flex flex-col gap-4">
        {roles.map((role) => {
          const glyphKey = inferRoleGlyphKey(role.title_de)
          const lookup = ROLE_EFFORT_LOOKUP[glyphKey as RoleKey]
          const title = lang === 'en'
            ? lookup?.titleEn ?? role.title_en
            : lookup?.titleDe ?? role.title_de
          const qualification =
            lang === 'en'
              ? lookup?.qualificationEn
              : lookup?.qualificationDe
          const description = role.rationale_de
          return (
            <li
              key={role.id}
              className="border border-ink/12 rounded-[2px] bg-paper px-5 py-5 flex flex-col gap-3"
              style={{
                boxShadow:
                  'inset 0 1px 0 hsl(0 0% 100% / 0.55), 0 1px 0 rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center gap-3">
                <RoleGlyph role={glyphKey} />
                <span className="text-[12px] font-medium uppercase tracking-[0.20em] text-clay">
                  {title}
                </span>
              </div>
              {qualification && (
                <p className="font-serif italic text-[13px] text-clay/85 leading-snug">
                  {qualification}
                </p>
              )}
              {description && (
                <p className="text-[14px] text-ink/85 leading-[1.6]">
                  {description}
                </p>
              )}
              {lookup?.rangeHours && lookup.rangeHours !== '—' && (
                <p className="text-[12px] text-ink/65 leading-none mt-1">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-clay mr-2">
                    {t('result.specialists.effortLabel', {
                      defaultValue: 'Geschätzter Aufwand',
                    })}
                  </span>
                  <span className="font-serif italic text-clay-deep tabular-figures">
                    {lookup.rangeHours}
                  </span>
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
