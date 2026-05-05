import type { ProjectRow } from '@/types/db'
import type { Fact, ProjectState } from '@/types/projectState'
import { deriveBaselineProcedure } from './deriveBaselineProcedure'
import { computeOpenItems } from './computeOpenItems'
import { approximateTotalWeeks } from './composeTimeline'
import {
  buildCostBreakdown,
  detectAreaSqm,
  detectKlasse,
  detectProcedure,
  formatEurRange,
} from './costNormsMuenchen'

interface Args {
  project: ProjectRow
  state: Partial<ProjectState>
  lang: 'de' | 'en'
}

export interface ExecutiveRead {
  paragraphs: string[]
  /** When false, the page renders the empty-state instead of the paragraphs. */
  isPopulated: boolean
}

/**
 * Phase 8.2 (B.1) — synthesis composer for the Overview tab's
 * executive read. Three short paragraphs:
 *
 *   1. STAKES — what the project is, what statute likely governs it,
 *      and the gating condition that resolves the uncertainty.
 *   2. OUTCOME — likely procedure + conditions + fallback + cost +
 *      timeline. Conditional language throughout ("if", "likely").
 *   3. ACTION — open-items summary cast as professional follow-up
 *      with named next-actor.
 *
 * No LLM call. The composer reads facts, procedures, areas + the
 * baseline-derivers from A.1 / A.3 so it never reads as recap on
 * fresh projects: even a just-created München EFH gets useful prose
 * because the baselines fill in the blanks (and are clearly labelled
 * "likely").
 *
 * Returns isPopulated: false only when literally nothing is known
 * (no plot, no facts, no project intent we recognise). The caller
 * renders an empty-state CTA in that case.
 */
export function composeExecutiveRead({
  project,
  state,
  lang,
}: Args): ExecutiveRead {
  const facts = state.facts ?? []
  const recommendations = state.recommendations ?? []
  const intent = project.intent
  const intentLabel = describeIntent(intent, lang)
  const plotLine = project.plot_address ?? null

  const isPopulated = !!intentLabel && (!!plotLine || facts.length > 0 || recommendations.length > 0)

  if (!isPopulated) {
    return { paragraphs: [], isPopulated: false }
  }

  // Resolve procedures (persona or baseline)
  const procs = state.procedures && state.procedures.length > 0
    ? state.procedures
    : deriveBaselineProcedure({ intent, bundesland: project.bundesland })
  const isBaselineProc = !state.procedures || state.procedures.length === 0
  const primary =
    procs.find((p) => p.status === 'erforderlich') ?? procs[0]
  const fallback = procs.find((p) => p.id !== primary?.id)

  // Cost + timeline
  const corpus = facts
    .map((f) => `${f.key} ${typeof f.value === 'string' ? f.value : ''}`)
    .join(' ')
    .toLowerCase()
  const procedureType = detectProcedure(primary?.rationale_de ?? '')
  const klasse = detectKlasse(corpus)
  const areaSqm = detectAreaSqm(corpus)
  const cost = buildCostBreakdown(procedureType, klasse, {
    areaSqm,
    bundesland: project.bundesland,
  })
  const weeks = approximateTotalWeeks()
  const months = Math.round((weeks.min + weeks.max) / 2 / 4)

  // Open-items summary
  const open = computeOpenItems(state, lang, 4)
  const flagCount = open.count
  const flagWords = lang === 'en' ? 'flags' : 'Punkte'
  const flagWordSingular = lang === 'en' ? 'flag' : 'Punkt'

  // Statute + gating condition.
  // Phase 8.5 (C.8): the previous read used `planungsrechtFact?.evidence`
  // directly, which leaks raw user quotes ("User input: 'proceed on
  // the assumption of § 34 BauGB'") into the executive prose. Now we
  // extract only the clean citation token (e.g. "§ 34 BauGB", "Art. 58
  // BayBO") via regex against either the fact's structured value or
  // the evidence string. If no clean citation can be extracted, we
  // pass null and the composer falls back to the gating-condition
  // copy. Quotes belong in the audit log, not analyst prose.
  const planungsrechtFact = facts.find((f) =>
    /baugb|baunvo|planungsrecht/i.test(`${f.key} ${f.evidence ?? ''}`),
  )
  const statuteCite = extractStatuteCite(planungsrechtFact)
  const hasArea = state.areas?.A?.state === 'ACTIVE'
  const gatingCondition = hasArea
    ? null
    : lang === 'en'
      ? 'the Bebauungsplan check returns'
      : 'die Bebauungsplan-Prüfung vorliegt'

  // Compose
  const p1 = composeP1({
    intentLabel,
    plotLine,
    statuteCite,
    statuteImplication: statuteImplicationFor(statuteCite, lang),
    gatingCondition,
    lang,
  })

  const p2 = composeP2({
    primary,
    fallback,
    isBaselineProc,
    costRange: formatEurRange(cost.total, lang),
    timelineMonths: months,
    intent,
    lang,
  })

  const p3 = composeP3({
    flagCount,
    flagWord: flagCount === 1 ? flagWordSingular : flagWords,
    primaryFlag: flagSummary(open.topPriority, lang),
    nextActor: namedActor(facts, lang),
    lang,
  })

  return {
    paragraphs: [p1, p2, p3].filter((s) => s.length > 0),
    isPopulated: true,
  }
}

function composeP1({
  intentLabel,
  plotLine,
  statuteCite,
  statuteImplication,
  gatingCondition,
  lang,
}: {
  intentLabel: string
  plotLine: string | null
  statuteCite: string | null
  statuteImplication: string
  gatingCondition: string | null
  lang: 'de' | 'en'
}): string {
  if (lang === 'en') {
    const a = `You're planning a ${intentLabel.toLowerCase()}${plotLine ? ` at ${plotLine}` : ''}.`
    const b = statuteCite
      ? ` The plot likely falls under ${statuteCite} — ${statuteImplication}`
      : ` Planning law for the plot is still being narrowed down — ${statuteImplication}`
    const c = gatingCondition
      ? ` Until ${gatingCondition}, the procedure path is uncertain.`
      : ''
    return a + b + c
  }
  const a = `Sie planen ${intentLabel}${plotLine ? ` am Standort ${plotLine}` : ''}.`
  const b = statuteCite
    ? ` Das Grundstück fällt voraussichtlich unter ${statuteCite} — ${statuteImplication}`
    : ` Das Planungsrecht für das Grundstück wird noch eingeordnet — ${statuteImplication}`
  const c = gatingCondition
    ? ` Bis ${gatingCondition}, ist der Verfahrensweg nicht endgültig.`
    : ''
  return a + b + c
}

function composeP2({
  primary,
  fallback,
  isBaselineProc,
  costRange,
  timelineMonths,
  intent,
  lang,
}: {
  primary: { title_de: string; title_en: string } | undefined
  fallback: { title_de: string; title_en: string } | undefined
  isBaselineProc: boolean
  costRange: string
  timelineMonths: number
  intent: string
  lang: 'de' | 'en'
}): string {
  const primaryTitle = primary
    ? lang === 'en'
      ? primary.title_en
      : primary.title_de
    : null
  const fallbackTitle = fallback
    ? lang === 'en'
      ? fallback.title_en
      : fallback.title_de
    : null
  const conditions = conditionsFor(intent, lang)

  if (lang === 'en') {
    const head = primaryTitle
      ? `Most likely outcome: ${primaryTitle}${isBaselineProc ? ' (preliminary)' : ''} if ${conditions}.`
      : 'Procedure path opens once the consultation has more data.'
    const fb = fallbackTitle
      ? ` Fallback: ${fallbackTitle} if any condition fails.`
      : ''
    const tail = ` Estimated total fees: ${costRange}, timeline ~${timelineMonths} months.`
    return head + fb + tail
  }
  const head = primaryTitle
    ? `Wahrscheinlicher Verfahrensweg: ${primaryTitle}${isBaselineProc ? ' (vorläufig)' : ''} sofern ${conditions}.`
    : 'Der Verfahrensweg öffnet sich, sobald die Beratung weiter ist.'
  const fb = fallbackTitle ? ` Fallback: ${fallbackTitle} bei Abweichung.` : ''
  const tail = ` Geschätzte Honorare: ${costRange}, Zeitrahmen ca. ${timelineMonths} Monate.`
  return head + fb + tail
}

function composeP3({
  flagCount,
  flagWord,
  primaryFlag,
  nextActor,
  lang,
}: {
  flagCount: number
  flagWord: string
  primaryFlag: string | null
  nextActor: string
  lang: 'de' | 'en'
}): string {
  if (flagCount === 0) {
    return lang === 'en'
      ? `No assumptions flagged yet. Continue the consultation; the architect (${nextActor}) confirms before submission.`
      : `Aktuell keine offenen Annahmen markiert. Setzen Sie die Beratung fort; die Architekt:in (${nextActor}) bestätigt vor Einreichung.`
  }
  if (lang === 'en') {
    const a = `${flagCount} ${flagWord} need professional eyes`
    const b = primaryFlag ? `: ${primaryFlag}.` : '.'
    const c = ` Named next actor: ${nextActor}.`
    return a + b + c
  }
  const a = `${flagCount} ${flagWord} bedürfen professioneller Prüfung`
  const b = primaryFlag ? `: ${primaryFlag}.` : '.'
  const c = ` Verantwortlich: ${nextActor}.`
  return a + b + c
}

/**
 * Phase 8.1 — keys here MUST be the DB enum values stored in
 * `projects.intent`. See selectTemplate.ts INTENT_VALUES_V3.
 */
function describeIntent(intent: string, lang: 'de' | 'en'): string {
  const map: Record<string, { de: string; en: string }> = {
    neubau_einfamilienhaus: {
      de: 'einen Neubau eines Einfamilienhauses',
      en: 'new single-family home',
    },
    neubau_mehrfamilienhaus: {
      de: 'einen Neubau eines Mehrfamilienhauses',
      en: 'new multi-family building',
    },
    sanierung: { de: 'ein Sanierungsvorhaben', en: 'renovation project' },
    umnutzung: { de: 'eine Umnutzung', en: 'change-of-use project' },
    abbruch: { de: 'einen Abbruch', en: 'demolition project' },
    aufstockung: { de: 'eine Aufstockung', en: 'storey-addition project' },
    anbau: { de: 'einen Anbau', en: 'extension project' },
    sonstige: { de: 'ein Bauvorhaben', en: 'construction project' },
  }
  const entry = map[intent] ?? map.sonstige
  return entry[lang]
}

function statuteImplicationFor(
  cite: string | null,
  lang: 'de' | 'en',
): string {
  if (!cite) {
    return lang === 'en'
      ? 'the inner-area / outer-area / qualified-plan classification opens after the Bebauungsplan inquiry.'
      : 'die Innen-/Außen-/B-Plan-Einordnung folgt aus der Bebauungsplan-Anfrage.'
  }
  if (/§\s*30/.test(cite)) {
    return lang === 'en'
      ? 'a binding development plan governs; the project must conform to its provisions.'
      : 'ein qualifizierter Bebauungsplan greift; das Vorhaben muss dessen Festsetzungen einhalten.'
  }
  if (/§\s*34/.test(cite)) {
    return lang === 'en'
      ? 'the plot is in an unplanned but built-up area; the project must fit the surrounding character.'
      : 'das Grundstück liegt im unbeplanten Innenbereich; das Vorhaben muss sich einfügen.'
  }
  if (/§\s*35/.test(cite)) {
    return lang === 'en'
      ? 'outer area — building is restricted to privileged exceptions only.'
      : 'Außenbereich — Bauen ist nur in privilegierten Ausnahmen zulässig.'
  }
  return lang === 'en'
    ? 'the cited provision shapes the procedure path.'
    : 'die genannte Vorschrift bestimmt den Verfahrensweg.'
}

function conditionsFor(intent: string, lang: 'de' | 'en'): string {
  const isNew = intent.startsWith('neubau_') || intent === 'aufstockung' || intent === 'anbau'
  if (isNew) {
    return lang === 'en'
      ? 'the plot is in a built-up area, no Sonderbau scope, and Gebäudeklasse 1–3'
      : 'Innenbereich vorliegt, kein Sonderbau und Gebäudeklasse 1–3'
  }
  if (intent === 'sanierung' || intent === 'umnutzung') {
    return lang === 'en'
      ? 'the structural envelope stays largely intact and no heritage protection applies'
      : 'die Tragstruktur weitgehend erhalten bleibt und kein Denkmalschutz greift'
  }
  if (intent === 'abbruch') {
    return lang === 'en'
      ? 'the enclosed volume stays under 300 m³'
      : 'der umbaute Raum unter 300 m³ bleibt'
  }
  return lang === 'en' ? 'standard conditions apply' : 'Standardbedingungen gelten'
}

function flagSummary(items: { label: string }[], lang: 'de' | 'en'): string | null {
  void lang
  if (items.length === 0) return null
  return items.slice(0, 2).map((it) => truncate(it.label, 60)).join('; ')
}

function namedActor(facts: Fact[], lang: 'de' | 'en'): string {
  // Heuristic: if there are open Planungsrecht items, primary actor is
  // the architect (B-Plan inquiry). Otherwise architect for now.
  void facts
  return lang === 'en' ? 'architect' : 'Architekt:in'
}

function truncate(s: string | undefined | null, max: number): string {
  if (!s) return ''
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trimEnd()}…`
}

/**
 * Phase 8.5 (C.8) — extract a clean statute citation from a fact.
 * Checks the structured value first (if it's already a citation
 * string), then scans the evidence text with a citation-pattern regex.
 * Returns null when no clean citation can be extracted; the composer
 * uses that to fall back to the no-statute copy rather than
 * interpolating the user's literal quote.
 */
const CITATION_RE =
  /(§\s*\d+(?:\s*[a-z])?\s+(?:BauGB|BauNVO|GEG))|((?:Art\.?|art\.?)\s*\d+(?:\s*[a-z])?\s*BayBO)|BauNVO|BayDSchG/i

function extractStatuteCite(fact: Fact | undefined): string | null {
  if (!fact) return null
  // 1. Structured value first.
  if (typeof fact.value === 'string' && CITATION_RE.test(fact.value)) {
    return normaliseCite(fact.value.match(CITATION_RE)?.[0] ?? null)
  }
  // 2. Evidence text — extract only the cite token, drop the surrounding
  //    user-quote framing.
  if (fact.evidence) {
    const m = fact.evidence.match(CITATION_RE)
    if (m) return normaliseCite(m[0])
  }
  return null
}

function normaliseCite(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  // Normalise "art. 58 baybo" → "Art. 58 BayBO" without enforcing strict
  // formatting; the executive read templates already wrap with prose
  // around it ("falls under {cite} — meaning ...").
  return trimmed
    .replace(/^art\.?/i, 'Art.')
    .replace(/baugb/i, 'BauGB')
    .replace(/baybo/i, 'BayBO')
    .replace(/baunvo/i, 'BauNVO')
    .replace(/baydschg/i, 'BayDSchG')
    .replace(/\s+/g, ' ')
}
