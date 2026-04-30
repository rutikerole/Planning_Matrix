// ───────────────────────────────────────────────────────────────────────
// Phase 6a — feature-flag gating for the map preview.
//
// The map experience (Leaflet + WMS proxy + B-Plan facts) is feature-
// flagged behind an admin allowlist while the Nutzungsvereinbarung
// with Stadt München is in flight. Only users whose Supabase auth UID
// appears in the set below see the map; everyone else gets the
// existing text-only Q2.
//
// The set is INTENTIONALLY EMPTY by default. After the first deploy,
// Rutik populates it with his own UID by:
//
//   1. Running this SQL in the Supabase Dashboard → SQL Editor:
//        select id from auth.users where email = 'rutikerole@gmail.com';
//   2. Pasting the returned UID into the array below.
//   3. Pushing the one-line change → Vercel re-deploys.
//
// Phase 6b (post-Nutzungsvereinbarung) deletes this entire allowlist
// gate and replaces it with an unconditional `return true`, plus
// adds a license-attribution footer. Two-line change.
//
// Why hardcoded vs DB-driven? The admin set is 1–3 entries today.
// A DB-driven feature-flag table is overkill for that scale and adds
// a per-render fetch we'd then have to cache. Hardcoded keeps the
// gate fast and review-able in PRs (anyone can see who's on the list
// in `git log`). When the list grows past 5 admins or needs run-time
// changes, migrate to a DB table — not before.
// ───────────────────────────────────────────────────────────────────────

const ADMIN_USER_IDS: ReadonlySet<string> = new Set<string>([
  // Add Rutik's primary user UID here after first prod deploy.
  // Format: '8f2c1d6b-12ab-4cde-9876-fedcba012345'
])

/**
 * True iff the given Supabase auth user UID is on the Phase-6a admin
 * allowlist. Returns false for null / undefined / unknown UIDs so the
 * non-admin path is always the safe default.
 */
export function isMapPreviewEnabled(userId: string | null | undefined): boolean {
  if (!userId) return false
  return ADMIN_USER_IDS.has(userId)
}
