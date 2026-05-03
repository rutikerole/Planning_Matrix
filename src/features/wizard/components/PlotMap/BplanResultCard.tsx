// Phase 6a — inline card showing the B-Plan lookup detail under the map.
// Phase 6c — slimmed: the headline ("Im Bebauungsplan {Nr}") moved
// up into BplanStatusBanner above the map. The card now carries
// only the supplementary detail that doesn't fit on a single banner
// line: in-force date, PDF links, and the §34/§35 long-form copy
// that screen-reader users rely on for context.
//
// States:
//   • Loading: no card (banner already says "wird geprüft …")
//   • Found: in-force date + Plan-PDF + Text-PDF links
//   • Not found: §34 / §35 long-form copy
//   • Upstream error: silent (no card; banner is also empty)

import type { BplanLookupResult } from '@/types/bplan'

interface Props {
  result: BplanLookupResult | null
  isLoading: boolean
}

function formatGermanDate(iso?: string): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  return `${d}.${mo}.${y}`
}

export function BplanResultCard({ result, isLoading }: Props) {
  if (isLoading) return null
  if (!result) return null
  if (result.status === 'upstream_error') return null

  if (result.status === 'no_plan_found') {
    return (
      <div className="flex flex-col gap-1.5 mt-3 px-3 py-2.5 border-l-2 border-clay/35 bg-paper">
        <p className="text-[10px] font-medium uppercase tracking-[0.20em] text-clay/85">
          Bebauungsplan
        </p>
        <p className="font-serif italic text-[12px] text-clay-deep leading-relaxed">
          Für diese Adresse liegt im Datensatz kein rechtsgültiger Bebauungsplan
          vor — der Innenbereichscharakter (§ 34 BauGB) oder Außenbereich
          (§ 35 BauGB) wird im Gespräch geprüft.
        </p>
      </div>
    )
  }

  // status === 'found' — banner above already names the plan; the
  // card carries supplementary detail (in-force date + PDF links)
  // that wouldn't fit on a single banner line.
  const dateGerman = formatGermanDate(result.in_force_since)
  const planLabel = result.plan_name_de ??
    (result.plan_number ? `${result.plan_number} (Bebauungsplan)` : null)

  if (!dateGerman && !result.pdf_url_plan && !result.pdf_url_text) {
    return null
  }

  return (
    <div className="flex flex-col gap-1.5 mt-3 px-3 py-2.5 border-l-2 border-drafting-blue/45 bg-paper">
      <p className="text-[10px] font-medium uppercase tracking-[0.20em] text-clay/85">
        Bebauungsplan {planLabel ? `· ${planLabel}` : ''}
      </p>
      {dateGerman ? (
        <p className="font-serif italic text-[11px] text-clay-deep">
          Rechtsgültig seit {dateGerman}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3 mt-1">
        {result.pdf_url_plan ? (
          <a
            href={result.pdf_url_plan}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] text-drafting-blue underline underline-offset-4 decoration-drafting-blue/45 hover:decoration-drafting-blue"
          >
            Plan-PDF anzeigen ↗
          </a>
        ) : null}
        {result.pdf_url_text ? (
          <a
            href={result.pdf_url_text}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] text-drafting-blue underline underline-offset-4 decoration-drafting-blue/45 hover:decoration-drafting-blue"
          >
            Text-PDF anzeigen ↗
          </a>
        ) : null}
      </div>
    </div>
  )
}
