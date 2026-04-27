/**
 * Calm loading state shown by ProtectedRoute while the auth store
 * resolves its initial-session probe. A single hairline pulses on
 * warm paper — no spinner, no shimmer skeleton, no protected-content
 * flash. Visible for at most ~800 ms in real life.
 */
export function AuthSkeleton() {
  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center" aria-busy="true">
      <span className="sr-only">Lädt…</span>
      <div
        aria-hidden="true"
        className="h-px w-24 bg-clay/55 origin-center motion-safe:animate-[breath-dot_1.6s_ease-in-out_infinite]"
        style={{ transformOrigin: 'center' }}
      />
    </div>
  )
}
