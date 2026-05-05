import { Sparkline } from './Sparkline'

interface Props {
  label: string
  value: string
  subtext?: string
  spark?: number[]
}

/**
 * Phase 9 — KPI card. Big number, label, optional sparkline.
 */
export function CostKpi({ label, value, subtext, spark }: Props) {
  return (
    <div className="rounded border border-[hsl(var(--ink))]/10 bg-[hsl(var(--paper))] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
        {label}
      </p>
      <p className="mt-1 text-3xl tracking-tight text-[hsl(var(--ink))]">{value}</p>
      {subtext ? (
        <p className="mt-0.5 font-mono text-[10px] text-[hsl(var(--ink))]/55">{subtext}</p>
      ) : null}
      {spark && spark.length > 0 ? (
        <div className="mt-3">
          <Sparkline data={spark} />
        </div>
      ) : null}
    </div>
  )
}
