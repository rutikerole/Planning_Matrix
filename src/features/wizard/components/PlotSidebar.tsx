import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { PlotProfile } from '../hooks/usePlotProfile'

interface Props {
  profile: PlotProfile
  /** Friendly auto-suggested name (`suggestProjectName(intent, address)`). */
  suggestedName: string | null
}

/**
 * v3 right column on Q2. Paper-tint card with the project's
 * structured plot profile + the auto-suggested project name. All
 * values render with `≈` prefixes so the user reads them as
 * approximations, not authoritative measurements.
 */
export function PlotSidebar({ profile, suggestedName }: Props) {
  const { t } = useTranslation()

  const hasAny =
    profile.stadtbezirk !== null ||
    profile.areaEstimate !== null ||
    profile.areaBuildable !== null ||
    profile.planningLaw !== null ||
    profile.character !== null ||
    profile.heritageDistance !== null

  return (
    <aside className="flex flex-col gap-[18px] border border-pm-hair bg-pm-paper-tint p-[22px] pb-[26px]">
      <p className="-mb-2 pt-1 font-serif text-[14px] italic text-pm-ink">
        {t('wizard.q2.plot.head')}
      </p>

      <Row label={t('wizard.q2.plot.stadtbezirk')} value={profile.stadtbezirk} />

      {!hasAny ? (
        <p className="font-sans text-[13px] italic leading-relaxed text-pm-ink-mid">
          {t('wizard.q2.plot.outsideRegion')}
        </p>
      ) : null}

      {profile.stadtbezirk ? <hr className="m-0 h-px border-0 bg-pm-hair" /> : null}

      <Row
        label={t('wizard.q2.plot.areaEstimate')}
        valueMono={profile.areaEstimate !== null ? `≈ ${profile.areaEstimate} m²` : null}
      />
      <Row
        label={t('wizard.q2.plot.areaBuildable')}
        valueMono={profile.areaBuildable !== null ? `≈ ${profile.areaBuildable} m²` : null}
      />

      <hr className="m-0 h-px border-0 bg-pm-hair" />

      <Row
        labelClay
        label={t('wizard.q2.plot.planningLaw')}
        valueItalic={profile.planningLaw}
      />
      <Row
        label={t('wizard.q2.plot.character')}
        valueItalic={profile.character}
      />
      <Row
        label={t('wizard.q2.plot.heritageDistance')}
        valueItalic={profile.heritageDistance !== null ? `≈ ${formatKm(profile.heritageDistance)}` : null}
      />

      <hr className="m-0 h-px border-0 bg-pm-hair" />

      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-pm-ink-mute2">
          {t('wizard.q2.plot.suggestedName')}
        </span>
        <span className="font-serif text-[18px] leading-tight text-pm-ink">
          {suggestedName ?? '—'}
        </span>
      </div>
      <p className="font-mono text-[11px] tracking-[0.04em] text-pm-ink-mute2">
        {t('wizard.q2.plot.editLater')}
      </p>
    </aside>
  )
}

function Row({
  label,
  labelClay,
  value,
  valueMono,
  valueItalic,
}: {
  label: string
  labelClay?: boolean
  value?: string | null
  valueMono?: string | null
  valueItalic?: string | null
}) {
  const v = value ?? valueMono ?? valueItalic
  if (!v) {
    return (
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            'font-mono text-[10px] uppercase tracking-[0.16em]',
            labelClay ? 'text-pm-clay' : 'text-pm-ink-mute2',
          )}
        >
          {label}
        </span>
        <span className="font-mono text-[13px] text-pm-ink-mute2">—</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          'font-mono text-[10px] uppercase tracking-[0.16em]',
          labelClay ? 'text-pm-clay' : 'text-pm-ink-mute2',
        )}
      >
        {label}
      </span>
      {value ? (
        <span className="font-serif text-[18px] leading-tight text-pm-ink">{value}</span>
      ) : valueMono ? (
        <span className="font-mono text-[13px] tracking-[0.02em] text-pm-ink">{valueMono}</span>
      ) : (
        <span className="font-serif text-[14px] italic text-pm-ink-mid">{valueItalic}</span>
      )}
    </div>
  )
}

function formatKm(n: number): string {
  return `${n.toFixed(1).replace('.', ',')} km`
}
