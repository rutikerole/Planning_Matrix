import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'

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
 * Phase 8 — pure-function composer for the Overview tab's executive
 * read. Two to three paragraphs synthesised from project state, no
 * LLM call, locale-aware.
 *
 * The shape of each paragraph follows a slot-template: project type
 * + plot anchor + primary statute → procedure pick + building class +
 * fallback → flag count + verification summary. When the input is too
 * sparse we return `isPopulated: false` so the caller can render a
 * calm "continue consultation" empty state instead of half-empty
 * boilerplate.
 */
export function composeExecutiveRead({
  project,
  state,
  lang,
}: Args): ExecutiveRead {
  const facts = state.facts ?? []
  const procedures = state.procedures ?? []
  const recommendations = state.recommendations ?? []

  // Project type from intent
  const intentLabel = describeIntent(project.intent, lang)
  const plotLine = project.plot_address ?? null

  // Primary statute = first DOMAIN-A-related fact's evidence cite, else generic
  const planungsrechtFact = facts.find((f) =>
    /baugb|baunvo|planungsrecht/i.test(`${f.key} ${f.evidence ?? ''}`),
  )
  const statuteCite =
    planungsrechtFact?.evidence ??
    (facts.find((f) => /§\s*\d+/.test(f.evidence ?? ''))?.evidence ?? null)

  // Procedure pick (first 'erforderlich', else first present)
  const primary =
    procedures.find((p) => p.status === 'erforderlich') ?? procedures[0]
  const fallback = procedures.find((p) => p !== primary)

  // Building class
  const klasseFact = facts.find((f) => /gebaeudeklasse|geb_klasse|gk_/i.test(f.key))
  const klasseValue =
    typeof klasseFact?.value === 'string'
      ? klasseFact.value
      : klasseFact?.value
        ? String(klasseFact.value)
        : null

  // Flag counts
  const assumedFacts = facts.filter((f) => f.qualifier?.quality === 'ASSUMED')
  const flagCount = assumedFacts.length

  // Sparse: no procedures, no recommendations, no plot.
  const isPopulated =
    procedures.length > 0 || recommendations.length > 0 || facts.length >= 4

  if (!isPopulated) {
    return { paragraphs: [], isPopulated: false }
  }

  // Locale-templated paragraphs — keep the slots aligned with the
  // brief's example template. Anything missing collapses gracefully:
  // empty-string slots flatten the surrounding sentence.
  const p1 = composeP1({ intentLabel, plotLine, statuteCite, lang })
  const p2 = composeP2({
    klasse: klasseValue,
    primaryTitle:
      primary?.[lang === 'en' ? 'title_en' : 'title_de'] ?? null,
    fallbackTitle:
      fallback?.[lang === 'en' ? 'title_en' : 'title_de'] ?? null,
    lang,
  })
  const p3 = composeP3({
    flagCount,
    primaryConcern: assumedFacts[0]?.evidence ?? null,
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
  lang,
}: {
  intentLabel: string
  plotLine: string | null
  statuteCite: string | null
  lang: 'de' | 'en'
}): string {
  if (lang === 'en') {
    const a = `A ${intentLabel.toLowerCase()}${plotLine ? ` at ${plotLine}` : ''}.`
    const b = statuteCite
      ? ` Planning law currently maps to ${statuteCite}; the architect confirms before submission.`
      : ` Planning law remains under assessment until the plot${'’'}s Bebauungsplan situation is verified.`
    return a + b
  }
  const a = `Ein ${intentLabel}${plotLine ? ` auf ${plotLine}` : ''}.`
  const b = statuteCite
    ? ` Das Planungsrecht stützt sich derzeit auf ${statuteCite}; bestätigt durch die Architekt:in vor Einreichung.`
    : ' Das Planungsrecht wird weiter eingeordnet, sobald die Bebauungsplan-Situation des Grundstücks geprüft ist.'
  return a + b
}

function composeP2({
  klasse,
  primaryTitle,
  fallbackTitle,
  lang,
}: {
  klasse: string | null
  primaryTitle: string | null
  fallbackTitle: string | null
  lang: 'de' | 'en'
}): string {
  if (lang === 'en') {
    const a = klasse
      ? `Building law maps to building class ${klasse}.`
      : 'Building class is still being narrowed down.'
    const b = primaryTitle
      ? ` The likely procedure is ${primaryTitle}${fallbackTitle ? `, with ${fallbackTitle} as a fallback` : ''}.`
      : ' Procedure assignment depends on the Bebauungsplan check.'
    return a + b
  }
  const a = klasse
    ? `Das Bauordnungsrecht ordnet sich aktuell der Gebäudeklasse ${klasse} zu.`
    : 'Die Gebäudeklasse wird noch eingegrenzt.'
  const b = primaryTitle
    ? ` Wahrscheinliches Verfahren: ${primaryTitle}${fallbackTitle ? `, fallback ${fallbackTitle}` : ''}.`
    : ' Die Verfahrenswahl hängt von der Bebauungsplan-Prüfung ab.'
  return a + b
}

function composeP3({
  flagCount,
  primaryConcern,
  lang,
}: {
  flagCount: number
  primaryConcern: string | null
  lang: 'de' | 'en'
}): string {
  if (flagCount === 0) {
    return lang === 'en'
      ? 'No open assumptions flagged at this time. Continue with the architect to firm up details before submission.'
      : 'Aktuell keine offenen Annahmen markiert. Setzen Sie die Beratung mit der Architekt:in fort, um die Details vor der Einreichung zu festigen.'
  }
  if (lang === 'en') {
    return `${flagCount} ${flagCount === 1 ? 'point requires' : 'points require'} architect verification${primaryConcern ? `; foremost: ${primaryConcern}` : ''}.`
  }
  return `${flagCount} ${flagCount === 1 ? 'Punkt benötigt' : 'Punkte benötigen'} die Bestätigung durch die Architekt:in${primaryConcern ? `; vorrangig: ${primaryConcern}` : ''}.`
}

function describeIntent(intent: string, lang: 'de' | 'en'): string {
  const map: Record<string, { de: string; en: string }> = {
    neubau_efh: { de: 'Neubau eines Einfamilienhauses', en: 'new single-family home' },
    neubau_mfh: { de: 'Neubau eines Mehrfamilienhauses', en: 'new multi-family building' },
    neubau_gewerbe: { de: 'Neubau eines Gewerbeobjekts', en: 'new commercial building' },
    sanierung: { de: 'Sanierungsvorhaben', en: 'renovation' },
    umnutzung: { de: 'Umnutzung', en: 'change-of-use project' },
    abbruch: { de: 'Abbruchvorhaben', en: 'demolition project' },
    sonstige: { de: 'Bauvorhaben', en: 'construction project' },
  }
  const entry = map[intent] ?? map.sonstige
  return entry[lang]
}
