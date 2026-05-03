/**
 * Deterministic-per-day tagline picker. The tagline shifts daily
 * (or as soon as the user id changes) so the dashboard's mood
 * varies without flickering mid-session.
 *
 * Six taglines live in `dashboard.taglines.{0..5}`; this helper
 * picks one by `(date-of-month + first-char-of-userId) % 6`.
 */
export const TAGLINE_KEYS = ['0', '1', '2', '3', '4', '5'] as const
export type TaglineKey = (typeof TAGLINE_KEYS)[number]

export function pickTagline(userId: string | null | undefined): TaglineKey {
  const seed = (new Date().getDate() + (userId?.charCodeAt(0) ?? 0)) % TAGLINE_KEYS.length
  return TAGLINE_KEYS[seed]
}
