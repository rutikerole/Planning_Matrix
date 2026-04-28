/**
 * Phase 3.5 #60 — sessionStorage flag for the cover-hero one-time
 * animation. Subsequent visits to the same result page within the
 * same browser session render the cover statically.
 *
 * Scope key includes the project id so opening different projects
 * each plays the cover animation once. For the public share route
 * (#65) the key is scoped to the share token instead, so a recipient
 * sees the choreography once per token.
 */

const STORAGE_PREFIX = 'pm-result-cover-animated-'

export function shouldAnimateCover(scopeKey: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(STORAGE_PREFIX + scopeKey) !== '1'
  } catch {
    return true
  }
}

export function markCoverAnimated(scopeKey: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + scopeKey, '1')
  } catch {
    // private mode / disabled storage — animation just plays again next time
  }
}
