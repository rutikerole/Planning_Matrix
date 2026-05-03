import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { BplanLookupResult } from '@/types/bplan'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: BplanLookupResult | null
}

function formatGermanDate(iso?: string): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  return `${d}.${mo}.${y}`
}

export function BPlanDetailDialog({ open, onOpenChange, result }: Props) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('wizard.q2.bplan.detailH')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('wizard.q2.bplan.detailDescription')}
          </DialogDescription>
        </DialogHeader>

        {result?.status === 'found' ? <FoundBody result={result} /> : <NoPlanBody />}
      </DialogContent>
    </Dialog>
  )
}

function NoPlanBody() {
  return (
    <p className="font-serif text-[15px] italic leading-relaxed text-pm-ink-mid">
      Für diese Adresse liegt im Datensatz kein rechtsgültiger Bebauungsplan
      vor — der Innenbereichscharakter (§ 34 BauGB) oder Außenbereich (§ 35
      BauGB) wird im Gespräch geprüft.
    </p>
  )
}

function FoundBody({ result }: { result: BplanLookupResult }) {
  const dateGerman = formatGermanDate(result.in_force_since)
  const planLabel =
    result.plan_name_de ??
    (result.plan_number ? `${result.plan_number} (Bebauungsplan)` : null)

  return (
    <div className="flex flex-col gap-4">
      {planLabel ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-pm-clay">
          {planLabel}
        </p>
      ) : null}

      {dateGerman ? (
        <p className="font-serif text-[14px] italic text-pm-ink-mid">
          Rechtsgültig seit {dateGerman}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-4">
        {result.pdf_url_plan ? (
          <a
            href={result.pdf_url_plan}
            target="_blank"
            rel="noreferrer"
            className="font-sans text-[13px] text-pm-clay underline underline-offset-4 decoration-pm-clay/40 hover:decoration-pm-clay"
          >
            Plan-PDF anzeigen ↗
          </a>
        ) : null}
        {result.pdf_url_text ? (
          <a
            href={result.pdf_url_text}
            target="_blank"
            rel="noreferrer"
            className="font-sans text-[13px] text-pm-clay underline underline-offset-4 decoration-pm-clay/40 hover:decoration-pm-clay"
          >
            Text-PDF anzeigen ↗
          </a>
        ) : null}
      </div>
    </div>
  )
}
