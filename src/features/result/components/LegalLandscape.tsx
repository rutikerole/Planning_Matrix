import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectState } from '@/types/projectState'
import { findCitation } from '../lib/legalCitations'

interface Props {
  state: Partial<ProjectState>
}

type Relevance = 'HIGH' | 'PARTIAL' | 'NONE'

interface DomainRow {
  /** What the user reads, e.g. `Art. 58 BayBO`. */
  label: string
  /** Hatched bar fill level. */
  relevance: Relevance
  /** Right-side status, e.g. "vereinfachtes Verfahren". */
  status: string
}

interface Domain {
  key: 'A' | 'B' | 'C'
  title: string
  relevance: Relevance
  rows: DomainRow[]
}

/**
 * Phase 3.5 #61 — Section IV: the legal landscape.
 *
 * Three vertically-stacked domain bands (A · Planungsrecht / B ·
 * Bauordnungsrecht / C · Sonstige Vorgaben). Inside each band: rows
 * for cited articles with a hatched-relevance bar (full clay = HIGH,
 * sparse = PARTIAL, dashed = NONE) and a right-aligned status text.
 * Click a row → popover with the article's public-source link.
 *
 * Domain content is composed from project state:
 *   • Domain A — facts/procedures referencing BauGB §§ 30/34/35, BauNVO
 *   • Domain B — BayBO articles + GEG + Brandschutz
 *   • Domain C — Stellplatzsatzung, Denkmalschutz, Baulasten
 *
 * The composition is heuristic (regex on rationale + facts text);
 * empty domains render with a calm "Keine zusätzlichen Vorgaben
 * festgestellt" line rather than empty bands.
 */
export function LegalLandscape({ state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [openCitationFor, setOpenCitationFor] = useState<string | null>(null)

  const domains = composeDomains(state, lang)

  return (
    <section
      id="sec-legal"
      className="px-6 sm:px-12 lg:px-20 py-20 sm:py-24 max-w-4xl mx-auto w-full scroll-mt-16 flex flex-col gap-8"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          IV
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.legal.eyebrow', { defaultValue: 'Die rechtliche Landschaft' })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      <div className="flex flex-col gap-6">
        {domains.map((d) => (
          <DomainBand
            key={d.key}
            domain={d}
            lang={lang}
            t={t}
            openCitationFor={openCitationFor}
            setOpenCitationFor={setOpenCitationFor}
          />
        ))}
      </div>

      <p className="font-serif italic text-[12px] text-clay/65 leading-relaxed mt-2">
        {t('result.legal.clickHint', {
          defaultValue:
            'Klicken Sie auf eine Norm, um die öffentliche Quelle zu öffnen.',
        })}
      </p>
    </section>
  )
}

function DomainBand({
  domain,
  lang,
  t,
  openCitationFor,
  setOpenCitationFor,
}: {
  domain: Domain
  lang: 'de' | 'en'
  t: (k: string, opts?: Record<string, unknown>) => string
  openCitationFor: string | null
  setOpenCitationFor: (v: string | null) => void
}) {
  const relevanceLabel = relevanceLabelFor(domain.relevance, lang)

  return (
    <div className="border border-ink/12 rounded-[2px] bg-paper">
      <header className="flex items-baseline justify-between px-4 sm:px-5 py-3 border-b border-ink/12">
        <span className="text-[11px] font-medium uppercase tracking-[0.20em] text-clay">
          {domain.key} · {domain.title}
        </span>
        <span
          className={
            'text-[10px] font-medium uppercase tracking-[0.20em] tabular-nums ' +
            relevanceTone(domain.relevance)
          }
        >
          {relevanceLabel}
        </span>
      </header>
      <ul className="flex flex-col">
        {domain.rows.length === 0 ? (
          <li className="px-4 sm:px-5 py-4 font-serif italic text-[13px] text-clay/65">
            {t('result.legal.empty', {
              defaultValue: 'Keine zusätzlichen Vorgaben festgestellt.',
            })}
          </li>
        ) : (
          domain.rows.map((row, idx) => {
            const cite = findCitation(row.label)
            const rowKey = `${domain.key}-${idx}`
            const open = openCitationFor === rowKey
            return (
              <li
                key={rowKey}
                className={
                  'relative grid grid-cols-[120px_1fr_auto] sm:grid-cols-[160px_1fr_auto] gap-x-4 items-center px-4 sm:px-5 py-3 ' +
                  (idx > 0 ? 'border-t border-ink/12' : '')
                }
              >
                <button
                  type="button"
                  disabled={!cite}
                  onClick={() => setOpenCitationFor(open ? null : rowKey)}
                  className={
                    'text-left text-[12px] leading-snug truncate font-medium ' +
                    (cite
                      ? 'text-ink hover:text-drafting-blue transition-colors duration-soft cursor-pointer underline-offset-4 hover:underline decoration-clay/55'
                      : 'text-ink/85')
                  }
                >
                  {row.label}
                </button>
                <RelevanceBar relevance={row.relevance} />
                <span className="text-[11px] italic text-clay/85 leading-snug truncate text-right">
                  {row.status}
                </span>
                {open && cite && (
                  <div className="absolute left-4 top-full z-20 mt-1 w-72 bg-paper border border-ink/15 rounded-[2px] shadow-[0_8px_32px_-12px_hsl(220_15%_11%/0.22)] p-4 flex flex-col gap-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.20em] text-clay/85 leading-none">
                      {t('result.legal.sourceEyebrow', {
                        defaultValue: 'Öffentliche Quelle',
                      })}
                    </p>
                    <p className="font-serif italic text-[14px] text-ink leading-snug">
                      {cite.label}
                    </p>
                    <a
                      href={cite.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-drafting-blue hover:text-ink underline underline-offset-4 decoration-drafting-blue/55 transition-colors duration-soft"
                    >
                      {cite.href.replace(/^https?:\/\//, '')} →
                    </a>
                  </div>
                )}
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}

function RelevanceBar({ relevance }: { relevance: Relevance }) {
  if (relevance === 'NONE') {
    return (
      <span
        aria-hidden="true"
        className="block h-1 w-full max-w-[180px] bg-transparent border-t border-dashed border-ink/25 mt-2"
      />
    )
  }
  const fillPct = relevance === 'HIGH' ? 100 : 50
  const cellColor = relevance === 'HIGH' ? 'bg-clay' : 'bg-clay/40'
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-px h-1 w-full max-w-[180px]"
    >
      {Array.from({ length: 12 }, (_, i) => {
        const filled = (i + 1) * (100 / 12) <= fillPct
        return (
          <span
            key={i}
            className={'block h-1 flex-1 ' + (filled ? cellColor : 'bg-ink/12')}
          />
        )
      })}
    </div>
  )
}

function relevanceLabelFor(r: Relevance, lang: 'de' | 'en'): string {
  if (r === 'HIGH') return lang === 'en' ? 'HIGHLY RELEVANT' : 'HOCH RELEVANT'
  if (r === 'PARTIAL') return lang === 'en' ? 'PARTIALLY RELEVANT' : 'TEILRELEVANT'
  return lang === 'en' ? 'NOT RELEVANT' : 'NICHT RELEVANT'
}

function relevanceTone(r: Relevance): string {
  if (r === 'HIGH') return 'text-clay'
  if (r === 'PARTIAL') return 'text-clay/60'
  return 'text-ink/35'
}

/* ── Domain composition ───────────────────────────────────────────── */

function composeDomains(state: Partial<ProjectState>, lang: 'de' | 'en'): Domain[] {
  const facts = state.facts ?? []
  const procedures = state.procedures ?? []
  const documents = state.documents ?? []
  const areas = state.areas

  // Build a giant searchable corpus from all the text we have. The
  // qualifier.reason and evidence fields differ slightly per shape;
  // we read what each carries.
  const corpus = [
    ...facts.map(
      (f) =>
        `${f.key} ${typeof f.value === 'string' ? f.value : ''} ${f.evidence ?? ''} ${f.qualifier?.reason ?? ''}`,
    ),
    ...procedures.map(
      (p) =>
        `${p.title_de} ${p.title_en} ${p.rationale_de ?? ''} ${p.rationale_en ?? ''} ${p.qualifier?.reason ?? ''}`,
    ),
    ...documents.map(
      (d) => `${d.title_de} ${d.title_en} ${d.qualifier?.reason ?? ''}`,
    ),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()

  const has = (re: RegExp) => re.test(corpus)

  // Domain A — Planungsrecht
  const aRows: DomainRow[] = []
  if (has(/§\s*30\s*baugb|baugb\s*§?\s*30/)) {
    aRows.push({
      label: '§ 30 BauGB',
      relevance: 'HIGH',
      status: lang === 'en' ? 'qualified inner area' : 'qualifizierter Innenbereich',
    })
  }
  if (has(/§\s*34\s*baugb|baugb\s*§?\s*34/)) {
    aRows.push({
      label: '§ 34 BauGB',
      relevance: 'HIGH',
      status: lang === 'en' ? 'unplanned inner area' : 'unbeplanter Innenbereich',
    })
  }
  if (has(/§\s*35\s*baugb|baugb\s*§?\s*35/)) {
    aRows.push({
      label: '§ 35 BauGB',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'outer area' : 'Außenbereich',
    })
  }
  if (has(/baunvo/)) {
    aRows.push({
      label: 'BauNVO',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'land use' : 'Nutzungsart',
    })
  }
  const areaA = areas?.A
  const aRelevance: Relevance =
    areaA?.state === 'ACTIVE'
      ? 'HIGH'
      : areaA?.state === 'PENDING'
        ? 'PARTIAL'
        : aRows.length > 0
          ? 'PARTIAL'
          : 'NONE'

  // Domain B — Bauordnungsrecht
  const bRows: DomainRow[] = []
  if (has(/baybo\s*art\.?\s*2\b/)) {
    bRows.push({
      label: 'BayBO Art. 2',
      relevance: 'HIGH',
      status: lang === 'en' ? 'building class' : 'Gebäudeklasse',
    })
  }
  if (has(/baybo\s*art\.?\s*58\b/)) {
    bRows.push({
      label: 'BayBO Art. 58',
      relevance: 'HIGH',
      status:
        lang === 'en' ? 'simplified procedure' : 'vereinfachtes Verfahren',
    })
  }
  if (has(/baybo\s*art\.?\s*57\b/)) {
    bRows.push({
      label: 'BayBO Art. 57',
      relevance: 'PARTIAL',
      status:
        lang === 'en' ? 'permit exemption check' : 'Genehmigungsfreistellung',
    })
  }
  if (has(/baybo\s*art\.?\s*60\b/)) {
    bRows.push({
      label: 'BayBO Art. 60',
      relevance: 'HIGH',
      status: lang === 'en' ? 'full permit' : 'Baugenehmigungsverfahren',
    })
  }
  if (has(/baybo\s*art\.?\s*6\b/)) {
    bRows.push({
      label: 'BayBO Art. 6',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'setbacks' : 'Abstandsflächen',
    })
  }
  if (has(/\bgeg\b/)) {
    bRows.push({
      label: 'GEG 2024',
      relevance: 'HIGH',
      status:
        lang === 'en' ? 'thermal protection' : 'Wärmeschutz · Energiebilanz',
    })
  }
  if (has(/brandschutz/)) {
    bRows.push({
      label: 'Brandschutz',
      relevance: 'PARTIAL',
      status:
        lang === 'en'
          ? 'GK-dependent fire protection'
          : 'gebäudeklassenabhängig',
    })
  }
  const areaB = areas?.B
  const bRelevance: Relevance =
    areaB?.state === 'ACTIVE'
      ? 'HIGH'
      : areaB?.state === 'PENDING'
        ? 'PARTIAL'
        : bRows.length > 0
          ? 'HIGH'
          : 'NONE'

  // Domain C — Sonstige Vorgaben
  const cRows: DomainRow[] = []
  if (has(/baybo\s*art\.?\s*47\b|stellplatz/)) {
    cRows.push({
      label: 'Stellplatzsatzung',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'municipal' : 'kommunal',
    })
  }
  if (has(/denkmal|baydschg/)) {
    cRows.push({
      label: 'Denkmalschutz',
      relevance: 'HIGH',
      status:
        lang === 'en' ? 'listed building applicable' : 'denkmalrechtlich',
    })
  }
  if (has(/baulast/)) {
    cRows.push({
      label: 'Baulasten',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'check land charges' : 'Baulastenverzeichnis',
    })
  }
  const areaC = areas?.C
  const cRelevance: Relevance =
    areaC?.state === 'ACTIVE'
      ? 'HIGH'
      : areaC?.state === 'PENDING'
        ? 'PARTIAL'
        : cRows.length > 0
          ? 'PARTIAL'
          : 'NONE'

  return [
    {
      key: 'A',
      title: lang === 'en' ? 'PLANNING LAW' : 'PLANUNGSRECHT',
      relevance: aRelevance,
      rows: aRows,
    },
    {
      key: 'B',
      title: lang === 'en' ? 'BUILDING LAW' : 'BAUORDNUNGSRECHT',
      relevance: bRelevance,
      rows: bRows,
    },
    {
      key: 'C',
      title: lang === 'en' ? 'OTHER REQUIREMENTS' : 'SONSTIGE VORGABEN',
      relevance: cRelevance,
      rows: cRows,
    },
  ]
}
