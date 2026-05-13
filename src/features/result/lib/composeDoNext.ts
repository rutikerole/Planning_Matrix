import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { computeOpenItems } from './computeOpenItems'
import { getStateCitations } from '@/legal/stateCitations'

export type DoNextSource = 'recommendation' | 'openItem' | 'baseline'

export interface DoNextItem {
  id: string
  title: string
  detail: string
  source: DoNextSource
  /** Higher = surfaced first. */
  priority: number
}

interface Args {
  project: ProjectRow
  state: Partial<ProjectState>
  lang: 'de' | 'en'
  /** Cap the result. Default 3 to fit the action card. */
  limit?: number
}

/**
 * Phase 8.1 (A.7) — single source of truth for the "Do next" action
 * card. Merges three sources by priority so the card is never empty
 * when there's any state at all:
 *
 *   - recommendations (priority 9–7) — persona-emitted; rank ascending.
 *   - openItems (priority 6) — top-priority assumptions cast as actions.
 *   - baseline (priority 5–3) — standard next-steps for the project's
 *     intent + Bundesland.
 *
 * Returns up to `limit` items (default 3). Returns an empty list only
 * when the project has literally zero state — fresh just-created.
 */
export function composeDoNext({
  project,
  state,
  lang,
  limit = 3,
}: Args): DoNextItem[] {
  const out: DoNextItem[] = []

  // 1. Persona recommendations — rank ascending, top 3 score 9 / 8 / 7.
  const recs = (state.recommendations ?? [])
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)
  recs.forEach((rec, idx) => {
    out.push({
      id: `rec-${rec.id}`,
      title: lang === 'en' ? rec.title_en : rec.title_de,
      detail: truncate(lang === 'en' ? rec.detail_en : rec.detail_de, 110),
      source: 'recommendation',
      priority: 9 - idx,
    })
  })

  // 2. Open items — top-priority assumptions framed as actions.
  const open = computeOpenItems(state, lang, 3)
  open.topPriority.forEach((item) => {
    out.push({
      id: `open-${item.id}`,
      title:
        lang === 'en'
          ? `Verify with architect: ${truncate(item.label, 60)}`
          : `Mit Architekt:in klären: ${truncate(item.label, 60)}`,
      detail:
        lang === 'en'
          ? 'This assumption gates downstream procedure / role / cost decisions.'
          : 'Diese Annahme beeinflusst Verfahren, Rollen und Kostenrahmen.',
      source: 'openItem',
      priority: 6,
    })
  })

  // 3. Baseline next-steps per intent. Always present; takes back-seat
  // when persona has emitted enough.
  baselineFor(project, lang).forEach((b, idx) => {
    out.push({
      id: `baseline-${b.id}`,
      title: b.title,
      detail: b.detail,
      source: 'baseline',
      priority: 5 - idx,
    })
  })

  // Dedupe by id, then sort by priority desc, slice to limit.
  const seen = new Set<string>()
  const unique = out.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
  return unique
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
}

function truncate(s: string | undefined | null, max: number): string {
  if (!s) return ''
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trimEnd()}…`
}

interface BaselineStep {
  id: string
  title: string
  detail: string
}

/**
 * Phase 8.1 (A.7) — baseline next-steps per intent. Hand-curated for
 * Bayern; the brief asks for "default-baseline next steps inferred from
 * project state (e.g., for any München single-family in inner-area:
 * 'Request Bebauungsplan from Referat HA II', ...)." Steps are
 * presented as italic-styled prompts; keep them ≤ ~80 chars title.
 */
function baselineFor(project: ProjectRow, lang: 'de' | 'en'): BaselineStep[] {
  const intent = project.intent
  const isNewBuild = intent.startsWith('neubau_') || intent === 'aufstockung' || intent === 'anbau'
  const isReno = intent === 'sanierung' || intent === 'umnutzung'
  // v1.0.21 Bug 23 — permit-submission § + DSchG short name resolve
  // from the project's Bundesland instead of hard-coded Bayern.
  const c = getStateCitations(project.bundesland)

  if (isNewBuild) {
    return lang === 'en'
      ? [
          {
            id: 'bplan',
            title: 'Request the Bebauungsplan from the Bauamt',
            detail: 'The plot’s development plan determines § 30 vs § 34 path; ask the Bauamt before drafting.',
          },
          {
            id: 'arch',
            title: 'Engage an architect for LP 1–2 and B-Plan check',
            detail: `Bauvorlageberechtigt is required by ${c.permitSubmissionCitation}; pick early so they can scope the procedure.`,
          },
          {
            id: 'energy',
            title: 'Bring the energy consultant in early',
            detail: 'GEG 2024 certificate is part of the application; consultant ideally engaged before LP 4.',
          },
        ]
      : [
          {
            id: 'bplan',
            title: 'Bebauungsplan vom Bauamt anfordern',
            detail: 'Der B-Plan entscheidet zwischen § 30 und § 34 — vor dem Vorentwurf einholen.',
          },
          {
            id: 'arch',
            title: 'Architekt:in für LP 1–2 und B-Plan-Prüfung beauftragen',
            detail: `Bauvorlageberechtigt nach ${c.permitSubmissionCitation} zwingend — frühzeitig binden.`,
          },
          {
            id: 'energy',
            title: 'Energieberater:in frühzeitig einbinden',
            detail: 'GEG-Nachweis 2024 gehört zum Antrag — möglichst vor LP 4 anstoßen.',
          },
        ]
  }

  if (isReno) {
    return lang === 'en'
      ? [
          {
            id: 'survey',
            title: 'Commission an existing-condition survey',
            detail: 'Renovation scope follows the existing structure; LP 1 starts here.',
          },
          {
            id: 'arch',
            title: 'Engage an architect for the permit application',
            detail: 'Bauvorlageberechtigt is required for any structural intervention.',
          },
          {
            id: 'denkmal',
            title: 'Check heritage-protection status',
            detail: `${c.denkmalSchutzAct} permits stack on top of the building permit; check before scoping.`,
          },
        ]
      : [
          {
            id: 'survey',
            title: 'Bestandsaufnahme beauftragen',
            detail: 'Sanierungsumfang ergibt sich aus dem Bestand — LP 1 startet hier.',
          },
          {
            id: 'arch',
            title: 'Architekt:in für den Bauantrag binden',
            detail: 'Bauvorlageberechtigt zwingend bei strukturellen Eingriffen.',
          },
          {
            id: 'denkmal',
            title: 'Denkmalschutz-Status prüfen',
            detail: `Erlaubnis nach ${c.denkmalSchutzAct} kommt zusätzlich zur Baugenehmigung — frühzeitig klären.`,
          },
        ]
  }

  // demolition + sonstige fall through
  return lang === 'en'
    ? [
        {
          id: 'arch',
          title: 'Engage an architect to scope the procedure',
          detail: 'Bauvorlageberechtigt is required for any application; scope determines notification vs. permit.',
        },
        {
          id: 'bauamt',
          title: 'Pre-meeting with the Bauamt',
          detail: 'A short alignment call surfaces unexpected obligations early.',
        },
      ]
    : [
        {
          id: 'arch',
          title: 'Architekt:in für die Verfahrenswahl binden',
          detail: 'Bauvorlageberechtigt zwingend; Umfang entscheidet zwischen Anzeige und Genehmigung.',
        },
        {
          id: 'bauamt',
          title: 'Vorbesprechung mit dem Bauamt',
          detail: 'Kurzer Abstimmungstermin macht versteckte Auflagen früh sichtbar.',
        },
      ]
}
