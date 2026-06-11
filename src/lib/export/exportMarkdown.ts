// ───────────────────────────────────────────────────────────────────────
// Phase 3.4 #55 — Markdown exporter
//
// Produces the architect-friendly checklist format from the brief.
// Pure string template — no library. UTF-8, LF line endings.
// ───────────────────────────────────────────────────────────────────────

import type { ProjectRow } from '@/types/db'
import type { ProjectState, AreaState } from '@/types/projectState'
import { factLabel, factValueWithUnit } from '@/lib/factLabel'
import { resolveRoles } from '@/features/result/lib/resolveRoles'
import { resolveDocuments } from '@/features/result/lib/resolveDocuments'
import {
  resolveProcedures,
  selectProcedures,
} from '@/features/result/lib/resolveProcedures'
import {
  MEANINGFUL_EVENT_TYPES,
  summarizeEvent,
} from '@/features/dashboard/lib/recentActivity'

interface ProjectEventRow {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

interface BuildArgs {
  project: ProjectRow
  events: ProjectEventRow[]
  lang: 'de' | 'en'
}

const STATE_LABELS_DE: Record<AreaState, string> = {
  ACTIVE: 'AKTIV',
  PENDING: 'AUSSTEHEND',
  VOID: 'NICHT ERMITTELBAR',
}
const STATE_LABELS_EN: Record<AreaState, string> = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  VOID: 'NOT DETERMINABLE',
}

const STATUS_LABEL_DE: Record<string, string> = {
  nicht_erforderlich: 'nicht erforderlich',
  erforderlich: 'erforderlich',
  liegt_vor: 'liegt vor',
  freigegeben: 'freigegeben',
  eingereicht: 'eingereicht',
  genehmigt: 'genehmigt',
}

const AREA_LABELS = {
  de: { A: 'Planungsrecht', B: 'Bauordnungsrecht', C: 'Sonstige Vorgaben' },
  en: { A: 'Planning law', B: 'Building law', C: 'Other requirements' },
}

export function buildExportMarkdown({ project, events, lang }: BuildArgs): string {
  const state = (project.state ?? {}) as Partial<ProjectState>
  const lines: string[] = []
  const t = (de: string, en: string) => (lang === 'en' ? en : de)
  const stateLabels = lang === 'en' ? STATE_LABELS_EN : STATE_LABELS_DE
  const areaLabels = AREA_LABELS[lang]

  // ── Header ──────────────────────────────────────────────────────
  lines.push(`# ${project.name}`)
  lines.push('')
  if (project.plot_address) {
    lines.push(`**${t('Adresse', 'Address')}:** ${project.plot_address}`)
  }
  lines.push(`**${t('Erstellt', 'Created')}:** ${formatDate(project.created_at, lang)}`)
  lines.push(`**${t('Status', 'Status')}:** ${project.status}`)
  lines.push('')
  lines.push('---')

  // ── Top-3 ───────────────────────────────────────────────────────
  const recs = (state.recommendations ?? []).slice().sort((a, b) => a.rank - b.rank)
  if (recs.length > 0) {
    lines.push('')
    lines.push(`## ${t('Top 3 Schritte', 'Top 3 Next Steps')}`)
    lines.push('')
    recs.slice(0, 3).forEach((rec, idx) => {
      const title = lang === 'en' ? rec.title_en : rec.title_de
      const detail = lang === 'en' ? rec.detail_en : rec.detail_de
      lines.push(`${idx + 1}. **${title}**`)
      if (detail) lines.push(`   ${detail}`)
      lines.push('')
    })
    lines.push('---')
  }

  // ── Bereiche ────────────────────────────────────────────────────
  const areas = state.areas
  if (areas) {
    lines.push('')
    lines.push(`## ${t('Bereiche', 'Areas')}`)
    lines.push('')
    ;(['A', 'B', 'C'] as const).forEach((key) => {
      const a = areas[key]
      if (!a) return
      lines.push(`- **${key} — ${areaLabels[key]}:** ${stateLabels[a.state]}`)
      if (a.reason) lines.push(`  *${a.reason}*`)
    })
    lines.push('')
    lines.push('---')
  }

  // ── Verfahren ───────────────────────────────────────────────────
  // YELLOW-2 — route through the SAME canonical selection as the Procedure tab
  // (selectProcedures), NOT raw state.procedures. The persona can over-emit two
  // identical §-verdicts (different rationale strings: "warehouse → office" /
  // "Lager → Büro"); PDF/tab show ONE, so the .md must too. Dedup is on the
  // structured verdict key, never the free-text rationale.
  // T-05 sprint — `supplementary` carries ADDITIONAL REGIMES (DSchG-Erlaubnis
  // etc.). They list under the decision as their own bullets — never collapsed
  // into the decision, never dropped, and never mislabeled as a "Fallback".
  const { primary: proc, fallback: procFallback, supplementary: procSupplementary } =
    selectProcedures(resolveProcedures(project, state).procedures)
  if (proc) {
    lines.push('')
    lines.push(`## ${t('Verfahren', 'Procedures')}`)
    lines.push('')
    const title = lang === 'en' ? proc.title_en : proc.title_de
    const status = STATUS_LABEL_DE[proc.status] ?? proc.status
    lines.push(`- [ ] ${title} — *${status}*`)
    const rationale = lang === 'en' ? proc.rationale_en : proc.rationale_de
    if (rationale) lines.push(`  ${rationale}`)
    if (procFallback) {
      const ftitle = lang === 'en' ? procFallback.title_en : procFallback.title_de
      lines.push(`  ${t('Fallback', 'Fallback')}: ${ftitle}`)
    }
    for (const s of procSupplementary) {
      const stitle = lang === 'en' ? s.title_en : s.title_de
      const sstatus = STATUS_LABEL_DE[s.status] ?? s.status
      lines.push(`- [ ] ${stitle} — *${sstatus}* (${t('weiteres Verfahren', 'additional procedure')})`)
      const srat = lang === 'en' ? s.rationale_en : s.rationale_de
      if (srat) lines.push(`  ${srat}`)
    }
    lines.push('')
    lines.push('---')
  }

  // ── Dokumente ───────────────────────────────────────────────────
  // Meta-sweep item 5 — route through the SAME resolveDocuments the web tab
  // and the PDF page 7 use (the v1.0.22 Bug F resolver), NOT raw
  // state.documents. The raw read re-created the exact Bug-F drift on the
  // .md: zero/thin persona docs rendered an empty section while the PDF
  // listed the mandatory Anlagen for the identical project, and the
  // hard-blocker suppression never reached the .md. On-file (uploaded)
  // documents still list, after the resolver-derived required set.
  const resolvedDocs = resolveDocuments(project, state)
  const docStatusLabels: Record<string, { de: string; en: string }> = {
    required: { de: 'erforderlich', en: 'required' },
    conditional: { de: 'bedingt', en: 'conditional' },
    recommended: { de: 'empfohlen', en: 'recommended' },
  }
  if (resolvedDocs.blockedByVoranfrage) {
    lines.push('')
    lines.push(`## ${t('Dokumente', 'Documents Required')}`)
    lines.push('')
    lines.push(
      `- ${lang === 'en' ? resolvedDocs.blockedLabelEn : resolvedDocs.blockedLabelDe}`,
    )
    lines.push('')
    lines.push('---')
  } else if (resolvedDocs.required.length > 0 || resolvedDocs.onFile.length > 0) {
    lines.push('')
    lines.push(`## ${t('Dokumente', 'Documents Required')}`)
    lines.push('')
    resolvedDocs.required.forEach((r) => {
      const name = lang === 'en' ? r.name_en : r.name_de
      const tag = docStatusLabels[r.status]?.[lang] ?? r.status
      // v1.0.30 Bug 98 (same as the PDF): suppress the per-row stub-state
      // deferral citation; substantive § citations still show.
      const cleanCitation =
        r.citation && !/noch nicht hinterlegt/i.test(r.citation) ? r.citation : ''
      lines.push(`- [ ] ${name} — *${tag}*${cleanCitation ? ` (${cleanCitation})` : ''}`)
      if (r.status === 'conditional') {
        const note = lang === 'en' ? r.condition_note_en : r.condition_note_de
        if (note) lines.push(`  ${note}`)
      }
    })
    if (resolvedDocs.onFile.length > 0) {
      lines.push('')
      lines.push(`**${t('Vorliegend', 'On file')}:**`)
      resolvedDocs.onFile.forEach((d) => {
        const title = lang === 'en' ? d.title_en : d.title_de
        const status = STATUS_LABEL_DE[d.status] ?? d.status
        lines.push(`- [ ] ${title} — *${status}*`)
        if (d.required_for.length > 0) {
          lines.push(`  ${t('Erforderlich für', 'Required for')}: ${d.required_for.join(', ')}`)
        }
      })
    }
    lines.push('')
    lines.push('---')
  }

  // ── Fachplaner ──────────────────────────────────────────────────
  // pre-test #1 (MV walk) — route through the SAME resolveRoles the PDF Team
  // section (exportPdf) and the Team tab use, NOT raw state.roles. resolveRoles
  // applies forceStructuralWhenCaptured: when eingriff_tragende_teile=true the
  // structural engineer is forced NEEDED. Reading raw state.roles made the .md
  // contradict the PDF ("not needed" vs "NEEDED") for the identical project —
  // the exact surface-bypasses-canonical-resolver class the campaign kills.
  const roles = resolveRoles(project, state).roles
  if (roles.length > 0) {
    lines.push('')
    lines.push(`## ${t('Fachplaner', 'Specialists Needed')}`)
    lines.push('')
    // RED-1 — three states: needed → conditional ("likely if …") → not-needed.
    const roleRank = (r: (typeof roles)[number]): number =>
      r.needed ? 0 : r.conditional ? 1 : 2
    roles
      .slice()
      .sort((a, b) => roleRank(a) - roleRank(b))
      .forEach((r) => {
        const title = lang === 'en' ? r.title_en : r.title_de
        const tag = r.needed
          ? t('erforderlich', 'needed')
          : r.conditional
            ? t('bedingt', 'conditional')
            : t('nicht erforderlich', 'not needed')
        // Open checkbox for needed AND conditional (both stay on the radar);
        // checked only when genuinely not needed.
        const box = r.needed || r.conditional ? ' ' : 'x'
        lines.push(`- [${box}] ${title} — *${tag}*`)
        // Meta-sweep item 5 — lang-aware rationale (was hardcoded rationale_de,
        // so the EN export carried German rationales under English titles).
        const rationale = lang === 'en' ? r.rationale_en : r.rationale_de
        if (rationale) lines.push(`  ${rationale}`)
      })
    lines.push('')
    lines.push('---')
  }

  // ── Eckdaten (extracted facts) ──────────────────────────────────
  const facts = state.facts ?? []
  if (facts.length > 0) {
    lines.push('')
    lines.push(`## ${t('Eckdaten', 'Key data')}`)
    lines.push('')
    facts.forEach((f) => {
      const label = factLabel(f.key, lang).label
      const value = factValueWithUnit(f.key, f.value, lang)
      lines.push(`- **${label}:** ${value} *(${f.qualifier.source} · ${f.qualifier.quality})*`)
      if (f.evidence) lines.push(`  ${f.evidence}`)
    })
    lines.push('')
    lines.push('---')
  }

  // ── Audit trail (Bauherr-grade: only meaningful events) ────────
  // Phase 6 A.7 — filter to MEANINGFUL_EVENT_TYPES so the export
  // doesn't drown in `turn_processed` and high-volume `fact_extracted`
  // rows. The architect-grade JSON export shows everything.
  const meaningful = events.filter((ev) =>
    MEANINGFUL_EVENT_TYPES.has(ev.event_type),
  )
  if (meaningful.length > 0) {
    lines.push('')
    lines.push(`## ${t('Auditspur', 'Audit log')}`)
    lines.push('')
    meaningful.slice(0, 30).forEach((ev) => {
      const when = formatDate(ev.created_at, lang, true)
      const summary = summarizeEvent(ev.event_type, lang)
      lines.push(
        `- **${when}** — ${summary}${ev.reason ? ` *(${ev.reason})*` : ''}`,
      )
    })
    lines.push('')
    lines.push('---')
  }

  // ── Footer ──────────────────────────────────────────────────────
  lines.push('')
  lines.push(
    t(
      '*Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in.*',
      '*Preliminary — to be confirmed by a certified architect (Bauvorlageberechtigte/r).*',
    ),
  )
  lines.push('')
  lines.push(
    t(
      `*Generiert mit Planning Matrix am ${formatDate(new Date().toISOString(), 'de')}.*`,
      `*Generated with Planning Matrix on ${formatDate(new Date().toISOString(), 'en')}.*`,
    ),
  )
  lines.push('')

  return lines.join('\n')
}

function formatDate(iso: string, lang: 'de' | 'en', withTime = false): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // ITEM E — UTC basis (timeZone:'UTC') so the displayed Created date matches
  // the DOC NO, which is derived from created_at via getUTCDate (cover.ts
  // deriveDocNo). Without this they disagreed by one day across the UTC
  // midnight boundary (docno 0610 on a local-"11 June" header).
  const date = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  if (!withTime) return date
  const time = d.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
  return `${date}, ${time}`
}
