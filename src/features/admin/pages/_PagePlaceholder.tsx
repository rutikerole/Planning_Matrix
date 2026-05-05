import type { ReactNode } from 'react'

/**
 * Phase 9 — shared placeholder for admin pages still being built out.
 *
 * Used as the default body for ProjectInspectorList, LiveStream,
 * CostDashboard, Search, etc. between commit 7 (shell) and the
 * commits where each page receives its real implementation.
 *
 * Renders the page heading + a tag indicating which commit will
 * fill in the body. Visual posture matches the console — mono +
 * tight type, no decoration.
 */
export function PagePlaceholder({
  title,
  description,
  arrivingIn,
  children,
}: {
  title: string
  description: string
  arrivingIn?: string
  children?: ReactNode
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl tracking-tight text-[hsl(var(--ink))]">{title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[hsl(var(--ink))]/65">
          {description}
        </p>
      </header>

      {arrivingIn ? (
        <div className="rounded border border-dashed border-[hsl(var(--ink))]/20 bg-[hsl(var(--ink))]/[0.02] px-5 py-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--ink))]/45">
            arriving in {arrivingIn}
          </p>
        </div>
      ) : null}

      {children}
    </div>
  )
}
