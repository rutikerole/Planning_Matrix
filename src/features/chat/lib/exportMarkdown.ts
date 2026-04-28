// ───────────────────────────────────────────────────────────────────────
// Phase 3.4 #55 — Markdown exporter
//
// Produces the architect-friendly checklist format from the brief.
// Pure string template — no library. UTF-8, LF line endings.
// ───────────────────────────────────────────────────────────────────────

import type { ProjectRow } from '@/types/db'
import type { ProjectState, AreaState } from '@/types/projectState'

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
  const procs = state.procedures ?? []
  if (procs.length > 0) {
    lines.push('')
    lines.push(`## ${t('Verfahren', 'Procedures')}`)
    lines.push('')
    procs.forEach((p) => {
      const title = lang === 'en' ? p.title_en : p.title_de
      const status = STATUS_LABEL_DE[p.status] ?? p.status
      lines.push(`- [ ] ${title} — *${status}*`)
      const rationale = lang === 'en' ? p.rationale_en : p.rationale_de
      if (rationale) lines.push(`  ${rationale}`)
    })
    lines.push('')
    lines.push('---')
  }

  // ── Dokumente ───────────────────────────────────────────────────
  const docs = state.documents ?? []
  if (docs.length > 0) {
    lines.push('')
    lines.push(`## ${t('Dokumente', 'Documents Required')}`)
    lines.push('')
    docs.forEach((d) => {
      const title = lang === 'en' ? d.title_en : d.title_de
      const status = STATUS_LABEL_DE[d.status] ?? d.status
      lines.push(`- [ ] ${title} — *${status}*`)
      if (d.required_for.length > 0) {
        lines.push(`  ${t('Erforderlich für', 'Required for')}: ${d.required_for.join(', ')}`)
      }
    })
    lines.push('')
    lines.push('---')
  }

  // ── Fachplaner ──────────────────────────────────────────────────
  const roles = state.roles ?? []
  if (roles.length > 0) {
    lines.push('')
    lines.push(`## ${t('Fachplaner', 'Specialists Needed')}`)
    lines.push('')
    roles
      .slice()
      .sort((a, b) => (a.needed === b.needed ? 0 : a.needed ? -1 : 1))
      .forEach((r) => {
        const title = lang === 'en' ? r.title_en : r.title_de
        const tag = r.needed
          ? t('erforderlich', 'needed')
          : t('nicht erforderlich', 'not needed')
        lines.push(`- [${r.needed ? ' ' : 'x'}] ${title} — *${tag}*`)
        if (r.rationale_de) lines.push(`  ${r.rationale_de}`)
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
      const value = typeof f.value === 'string' ? f.value : JSON.stringify(f.value)
      lines.push(`- **${f.key}:** ${value} *(${f.qualifier.source} · ${f.qualifier.quality})*`)
      if (f.evidence) lines.push(`  ${f.evidence}`)
    })
    lines.push('')
    lines.push('---')
  }

  // ── Audit trail ─────────────────────────────────────────────────
  if (events.length > 0) {
    lines.push('')
    lines.push(`## ${t('Auditspur', 'Audit log')}`)
    lines.push('')
    events.slice(0, 30).forEach((ev) => {
      const when = formatDate(ev.created_at, lang, true)
      lines.push(`- **${when}** — ${ev.triggered_by} · ${ev.event_type}${ev.reason ? ` *(${ev.reason})*` : ''}`)
    })
    lines.push('')
    lines.push('---')
  }

  // ── Footer ──────────────────────────────────────────────────────
  lines.push('')
  lines.push(
    t(
      '*Vorläufige Einschätzung — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in.*',
      '*Preliminary assessment — confirmed by a licensed architect (bauvorlageberechtigt).*',
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
  const date = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  if (!withTime) return date
  const time = d.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date}, ${time}`
}
