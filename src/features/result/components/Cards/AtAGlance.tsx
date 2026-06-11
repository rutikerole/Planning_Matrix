import { useTranslation } from 'react-i18next'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import {
  buildCostBreakdown,
  costModeShowsEuroFigure,
  resolveCostKlasse,
  formatEurRange,
  resolveCostAreaSqm,
  resolveCostDisplayMode,
  resolveHeadlineCostRange,
} from '../../lib/costNormsMuenchen'
import { resolveCostProcedureType } from '../../lib/resolveProcedures'
import { approximateTimelineMonths } from '../../lib/composeTimeline'
import { useResolvedRoles } from '../../hooks/useResolvedRoles'
import { useResolvedProcedures } from '../../hooks/useResolvedProcedures'
import { computeOpenItems } from '../../lib/computeOpenItems'
import {
  deriveGebaeudeklasse,
  deriveGkInputFromFacts,
  formatGebaeudeklasseValue,
} from '@/legal/deriveGebaeudeklasse'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

/**
 * Phase 8 — Overview tab "At a glance" right column. Six rows: procedure,
 * building class, estimated cost, timeline, specialists needed, open
 * questions. Each row is label + value with a hairline divider; values
 * fall back to em-dash when the underlying state isn't there yet.
 */
export function AtAGlance({ project, state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const resolved = useResolvedRoles(project, state)
  const resolvedProc = useResolvedProcedures(project, state)

  const facts = state.facts ?? []
  const open = computeOpenItems(state, lang, 4, project.bundesland)

  const primaryProcedure =
    resolvedProc.procedures.find((p) => p.status === 'erforderlich') ??
    resolvedProc.procedures[0]
  const baseLabel = primaryProcedure
    ? lang === 'en'
      ? primaryProcedure.title_en
      : primaryProcedure.title_de
    : t('result.workspace.ataglance.inProgress')
  const procedureLabel =
    primaryProcedure && !resolvedProc.isFromState
      ? `${baseLabel} · ${t('result.workspace.team.likelyBadge')}`
      : baseLabel

  // Phase 8.5 (C.5): the live Tengstraße project showed "Building
  // class: —" despite the conversation explicitly establishing
  // GK 3. The persona may emit any of several keys
  // (gebaeudeklasse_geplant / gebaeudeklasse_hypothese / geb_klasse_…),
  // or describe it only in message_de without emitting a fact at all.
  // v1.0.22 Bug C — explicit-key path stays; the geometric fallback
  // now routes through the unified deriveGebaeudeklasse (MBO § 2 Abs. 3)
  // so reasoning + qualifier are visible to the bauherr. Honest
  // deferral phrase when Höhe AND Geschosse are both missing — no
  // fabricated GK number.
  const explicitKlasse = resolveBuildingClass(facts, lang)
  const derivedKlasse = deriveGebaeudeklasse(
    deriveGkInputFromFacts(facts, state.templateId ?? null),
  )
  // v1.0.30 Bug 93 — a use conversion (T-04) does not re-classify the building's
  // Gebäudeklasse; show that honestly instead of the bare "—" tbd placeholder.
  // Campaign 5c (MV walk) — when no geometry signal exists, route the null case
  // through the SAME formatGebaeudeklasseValue the PDF Key Data renders, so both
  // surfaces show one honest-deferral string ("Building class — eaves height not
  // recorded; architect to confirm.") instead of this card diverging to a bare
  // "—". The walk showed At-a-Glance "—" vs PDF honest sentence for the identical
  // derivedKlasse — a two-sources-of-truth split (CLASS 1). The narrow row
  // truncates the sentence and the full text is in the row `title` hover.
  const klasseValue = explicitKlasse
    ? explicitKlasse
    : state.templateId === 'T-04'
      ? t('result.workspace.ataglance.gkUseConversion')
      : formatGebaeudeklasseValue(derivedKlasse, lang)

  // Cost — reuse the München heuristic engine, now with area + zone +
  // region inputs flowing through (A.4).
  const corpus = facts
    .map((f) => `${f.key} ${typeof f.value === 'string' ? f.value : ''}`)
    .join(' ')
    .toLowerCase()
  // Sprint 0 addendum — shared cost procedure-type resolver (same canonical
  // resolveProcedures the procedure label above already uses), so cost +
  // timeline + the other surfaces can't diverge.
  const procedureType = resolveCostProcedureType(project, state)
  const klasseDetected = resolveCostKlasse(facts, corpus)
  // Sprint 0 (P1-A) — single shared cost-area resolver (template-aware,
  // with corpus-regex backstop) so this card cannot diverge from the
  // Cost tab / PDF / Executive Read for a T-02 MFH.
  const areaSqm = resolveCostAreaSqm(facts, state.templateId)
  const cost = buildCostBreakdown(procedureType, klasseDetected, {
    areaSqm,
    bundesland: project.bundesland,
  })
  // T-03 sprint (P1) — route the headline cost through the SINGLE cost-display
  // mode resolver shared with the Cost tab / PDF / Executive Read. The three
  // Bestand modes (renovation/use-conversion/demolition) follow no HOAI
  // new-build schedule, so this card shows the honest "by quote" value instead
  // of a fabricated € range — fixing the Overview €30,900–57,800 vs Cost-tab
  // "request quotes" divergence. Sprint 1 (Y-1) headline band/engine resolver
  // still drives the € figure for the new-build/band modes.
  const costMode = resolveCostDisplayMode(state.templateId, project.intent)
  const costLabel =
    facts.length === 0
      ? t('result.workspace.ataglance.tbd')
      : costModeShowsEuroFigure(costMode)
        ? formatEurRange(resolveHeadlineCostRange(state.templateId, cost.total), lang)
        : t('result.workspace.ataglance.costByQuote')

  // Timeline — campaign 5b: the SINGLE procedure-aware timeline source shared with
  // Executive Read (and the PDF), so the figure can't diverge. Output is identical
  // to the prior inline ranges (freistellung 2–3 · full 6–9 · else 4–6).
  const tl = approximateTimelineMonths(procedureType)
  const timelineLabel =
    lang === 'en' ? `~ ${tl.min}–${tl.max} months` : `~ ${tl.min}–${tl.max} Monate`

  const specialistsCount = resolved.roles.filter((r) => r.needed).length
  const openQuestions = open.count

  const rows: Array<{ label: string; value: string }> = [
    { label: t('result.workspace.ataglance.procedure'), value: procedureLabel },
    { label: t('result.workspace.ataglance.buildingClass'), value: klasseValue },
    { label: t('result.workspace.ataglance.estimatedCost'), value: costLabel },
    { label: t('result.workspace.ataglance.timeline'), value: timelineLabel },
    { label: t('result.workspace.ataglance.specialists'), value: String(specialistsCount) },
    { label: t('result.workspace.ataglance.openQuestions'), value: String(openQuestions) },
  ]

  return (
    <section
      aria-labelledby="atglance-eyebrow"
      className="flex flex-col gap-3 lg:border-l lg:border-ink/12 lg:pl-6"
    >
      <p
        id="atglance-eyebrow"
        className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none"
      >
        {t('result.workspace.ataglance.eyebrow')}
      </p>
      <ul className="flex flex-col">
        {rows.map((row, idx) => (
          <li
            key={row.label}
            className={
              'flex items-center justify-between gap-3 py-2.5 ' +
              (idx === 0 ? '' : 'border-t border-ink/12')
            }
          >
            <span className="text-[11.5px] text-clay leading-snug">{row.label}</span>
            <span
              className="text-[12.5px] font-medium text-ink leading-snug tabular-nums text-right truncate"
              title={row.value}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Phase 8.5 (C.5) — try several explicit fact keys for building class,
 * then derive from BayBO Art. 2(3) thresholds (height + storeys) when
 * no explicit fact is present.
 */
function resolveBuildingClass(
  facts: { key: string; value: unknown }[],
  lang: 'de' | 'en',
): string | null {
  // 1. Explicit keys, in priority order. Persona may emit any of these.
  const KEYS = [
    'gebaeudeklasse_geplant',
    'gebaeudeklasse_hypothese',
    'geb_klasse',
    'gk_geplant',
    'gebaeudeklasse',
  ]
  for (const k of KEYS) {
    const f = facts.find((x) => x.key.toLowerCase() === k)
    if (!f) continue
    if (typeof f.value === 'string' && f.value.trim().length > 0) {
      return prettyClass(f.value)
    }
    if (typeof f.value === 'number') return `GK ${f.value}`
  }

  // 2. Generic regex fallback for any key containing "klasse".
  const regexHit = facts.find((f) =>
    /gebaeudeklasse|geb_klasse|gk_/i.test(f.key),
  )
  if (regexHit && typeof regexHit.value === 'string') {
    return prettyClass(regexHit.value)
  }
  // 3. Sprint 1 (Y-6) — VALUE-based scan. The persona emits free-form and
  // occasionally typo'd keys (the Friedrichstraße walk wrote `gebaeudekalsse`,
  // "kal" not "kla"), which steps 1-2 miss — so At-a-Glance showed "—" while
  // Key Data showed GK 5. The VALUE is canonical ("GK 5"); read it regardless
  // of the key so a key typo can never blank the building class again.
  for (const f of facts) {
    if (typeof f.value !== 'string') continue
    const m =
      f.value.trim().match(/^(?:geb[äa]udeklasse[\s:·-]*)?GK\s*([1-5])\b/i) ??
      f.value.trim().match(/^geb[äa]udeklasse[\s:·-]*([1-5])\b/i)
    if (m) return prettyClass(`GK ${m[1]}`)
  }
  // v1.0.22 Bug C — the geometric fallback (deriveGkFromGeometry)
  // was retired in favour of the unified MBO § 2 Abs. 3 derivation in
  // src/legal/deriveGebaeudeklasse.ts. The caller now consumes that
  // helper directly so the GK row carries reasoning + qualifier
  // alongside the number, and honest deferral fires when Höhe AND
  // Geschosse are both missing.
  void lang
  return null
}

function prettyClass(raw: string): string {
  // Persona may emit "GK 3", "Gebäudeklasse 3", "GK3", "3" etc.
  const trimmed = raw.trim()
  if (/^gk\s*\d/i.test(trimmed)) {
    return trimmed.replace(/^gk\s*/i, 'GK ')
  }
  if (/^geb(ä|ae)udeklasse\s*\d/i.test(trimmed)) {
    return trimmed.replace(/^geb(ä|ae)udeklasse\s*/i, 'GK ')
  }
  if (/^\d+$/.test(trimmed)) return `GK ${trimmed}`
  return trimmed
}

// v1.0.22 — numericValue retired alongside deriveGkFromGeometry.
