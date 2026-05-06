import { lazy, Suspense, useState } from 'react'
import { ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsAdmin } from '@/hooks/useIsAdmin'

const InlineLogsDrawer = lazy(() => import('./InlineLogsDrawer'))

interface Props {
  projectId: string
  projectName: string
  /**
   * Visual variant.
   *   - `pill`    — for the Result page bottom action bar (h-9 pill,
   *                 matches the back-to-consultation + send-to-architect
   *                 row).
   *   - `sidebar` — for the chat workspace Spine sidebar (full-width
   *                 row, low-key, lives between BriefingCTA and the
   *                 auth strip).
   */
  variant?: 'pill' | 'sidebar'
  className?: string
}

/**
 * Phase 9.1 — admin-only "Logs" affordance.
 *
 * Renders nothing for non-admins or while the admin status is being
 * resolved (no flash-then-disappear). On click, lazy-imports the
 * drawer and opens it. The drawer + its dependencies (SpanGantt,
 * JsonViewer, Vaul, react-query trace hooks) live in a separate
 * chunk; the main bundle gets only this component + the lazy ref.
 *
 * Two buttons (Result page + Chat sidebar) each maintain their own
 * open state; in practice the user clicks one and the drawer covers
 * both contexts equivalently.
 */
export function InlineLogsButton({
  projectId,
  projectName,
  variant = 'pill',
  className,
}: Props) {
  const { isAdmin, isLoading } = useIsAdmin()
  const [open, setOpen] = useState(false)

  // Render nothing while loading and for non-admins. No skeleton —
  // a button that appears-then-disappears is worse UX than a brief
  // pause, and non-admins should never see the affordance at all.
  if (isLoading || !isAdmin) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open project logs"
        className={cn(
          variant === 'pill'
            ? 'inline-flex items-center gap-1.5 h-9 px-3 bg-paper border border-clay/35 rounded-full text-[12px] text-clay/85 hover:text-ink hover:border-clay transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card'
            : 'inline-flex w-full items-center justify-center gap-1.5 px-3 py-1.5 border border-clay/30 rounded text-[11.5px] font-mono uppercase tracking-[0.14em] text-clay/85 hover:text-ink hover:border-clay/60 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card',
          className,
        )}
      >
        <ScrollText aria-hidden="true" className="size-3" />
        Logs
      </button>
      {open ? (
        <Suspense fallback={null}>
          <InlineLogsDrawer
            projectId={projectId}
            projectName={projectName}
            open={open}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      ) : null}
    </>
  )
}
