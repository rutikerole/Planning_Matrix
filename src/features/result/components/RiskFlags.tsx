import { useTranslation } from 'react-i18next'
import type { ProjectState } from '@/types/projectState'
import { factLabel, factValueWithUnit } from '@/lib/factLabel'

interface Props {
  state: Partial<ProjectState>
}

interface RiskItem {
  id: string
  tag: 'ANNAHME' | 'HINWEIS' | 'PRÜFEN'
  body: string
}

/**
 * Phase 3.5 #63 — Section VIII: Was noch zu prüfen ist.
 *
 * Aggregates "things to verify" from project state:
 *   • Facts where qualifier.quality === 'ASSUMED' → ANNAHME tag
 *   • Procedures/documents/roles where the rationale text contains
 *     trigger words ("sollte", "frühzeitig", "abklären") → HINWEIS
 *   • Recommendations where qualifier.quality === 'ASSUMED' → PRÜFEN
 *
 * Each item renders as a paper card with hand-drawn `△` glyph
 * (drafting-blue/65), Inter 11 0.20em uppercase clay tag, and an
 * Inter 14 ink/85 body.
 */
export function RiskFlags({ state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const items = collectRisks(state, lang)
  if (items.length === 0) return null

  return (
    <section
      id="sec-risks"
      className="px-6 sm:px-12 lg:px-20 py-20 sm:py-24 max-w-3xl mx-auto w-full scroll-mt-16 flex flex-col gap-8"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          VIII
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.risks.eyebrow', {
            defaultValue: 'Was noch zu prüfen ist',
          })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      <p className="font-serif italic text-[15px] text-ink/65 leading-relaxed max-w-xl">
        {items.length === 1
          ? t('result.risks.intro_one', {
              defaultValue:
                'Ein Punkt sollten Sie mit Ihrer Architekt:in besprechen.',
            })
          : t('result.risks.intro_other', {
              defaultValue:
                '{{n}} Punkte sollten Sie mit Ihrer Architekt:in besprechen.',
              n: items.length,
            })}
      </p>

      <ul className="flex flex-col gap-3">
        {items.map((it) => (
          <li
            key={it.id}
            className="border border-ink/12 rounded-[2px] bg-paper px-5 py-4 grid grid-cols-[24px_1fr] gap-x-3"
            style={{
              boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.55)',
            }}
          >
            <TriangleGlyph />
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-[0.20em] text-clay leading-none">
                {tagLabel(it.tag, lang)}
              </span>
              <p className="text-[14px] text-ink/85 leading-[1.6]">{it.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TriangleGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-drafting-blue/65 shrink-0 mt-0.5"
    >
      {/* Hand-drawn equilateral with sub-pixel deviation */}
      <path d="M 10 3.4 L 17.2 16.4 L 2.8 16.4 Z" />
      <circle cx="10" cy="13.4" r="0.7" fill="currentColor" stroke="none" />
      <path d="M 10 8 L 10 11.4" strokeOpacity="0.7" />
    </svg>
  )
}

function tagLabel(tag: RiskItem['tag'], lang: 'de' | 'en'): string {
  if (lang === 'en') {
    return {
      ANNAHME: 'ASSUMPTION · UNVERIFIED',
      HINWEIS: 'NOTE',
      PRÜFEN: 'TO VERIFY',
    }[tag]
  }
  return {
    ANNAHME: 'ANNAHME · NICHT VERIFIZIERT',
    HINWEIS: 'HINWEIS',
    PRÜFEN: 'WICHTIG ZU PRÜFEN',
  }[tag]
}

function collectRisks(
  state: Partial<ProjectState>,
  lang: 'de' | 'en',
): RiskItem[] {
  const out: RiskItem[] = []

  // Assumed facts → ANNAHME
  ;(state.facts ?? []).forEach((f) => {
    if (f.qualifier?.quality !== 'ASSUMED') return
    const labelText = factLabel(f.key, lang).label
    const value = factValueWithUnit(f.key, f.value, lang)
    const body = f.evidence ?? `${labelText}: ${value}`
    out.push({ id: `f-${f.key}`, tag: 'ANNAHME', body })
  })

  // Procedures/documents/roles where rationale contains trigger words → HINWEIS
  const triggerRe =
    lang === 'en'
      ? /should|early|verify|check/i
      : /sollte|fr(ü|u)hzeitig|abkl(ä|a)ren|verifizieren|pr(ü|u)fen/i
  ;(state.procedures ?? []).forEach((p) => {
    const text = lang === 'en' ? p.rationale_en : p.rationale_de
    if (text && triggerRe.test(text)) {
      out.push({ id: `p-${p.id}`, tag: 'HINWEIS', body: text })
    }
  })

  // Assumed recommendations → PRÜFEN
  ;(state.recommendations ?? []).forEach((r) => {
    if (r.qualifier?.quality !== 'ASSUMED') return
    const text = lang === 'en' ? r.detail_en : r.detail_de
    if (text) out.push({ id: `r-${r.id}`, tag: 'PRÜFEN', body: text })
  })

  // Cap at 5 to keep section readable
  return out.slice(0, 5)
}
