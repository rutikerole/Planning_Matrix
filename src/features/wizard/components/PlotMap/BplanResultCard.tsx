// Phase 6a — inline card showing the B-Plan lookup result.
//
// Three states:
//   • Loading (isLoading=true): hairline progress + status text
//   • Found (result.status='found'): plan number, name, in-force date, PDF links
//   • Not found (result.status='no_plan_found'): honest § 34 / § 35 BauGB hedge
//   • Upstream error (result.status='upstream_error'): silent (no card rendered) —
//     the chat-turn pipeline still works without B-Plan facts and we don't
//     want to red-flag a transient WMS hiccup as a user-visible failure.
//
// Copy: formal Sie register, calm clay register, matches the wizard's
// existing voice. No exclamations, no emojis.

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
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-1 mt-3 px-3 py-2.5 border-l-2 border-clay/35 bg-paper"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.20em] text-clay/85">
          Bebauungsplan
        </p>
        <p className="font-serif italic text-[12px] text-clay/85 leading-relaxed">
          Wird geprüft…
        </p>
      </div>
    )
  }

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

  // status === 'found'
  const dateGerman = formatGermanDate(result.in_force_since)
  return (
    <div className="flex flex-col gap-1.5 mt-3 px-3 py-2.5 border-l-2 border-drafting-blue/45 bg-paper">
      <p className="text-[10px] font-medium uppercase tracking-[0.20em] text-clay/85">
        Bebauungsplan
      </p>
      <p className="text-[14px] font-medium text-ink leading-snug">
        {result.plan_name_de ??
          (result.plan_number ? `${result.plan_number} (Bebauungsplan)` : 'Bebauungsplan')}
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
