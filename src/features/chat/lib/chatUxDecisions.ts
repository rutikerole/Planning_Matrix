// v1.0.29.2 — pure chat-UX decision logic, extracted so `smoke:chat-ux` can
// assert it without a DOM/browser runner (the repo has no jsdom/RTL/Playwright).
// The React hooks/components below import these; the smoke gate unit-tests them.

/** Stable DOM id on the streaming assistant bubble so useAutoScroll can target
 *  the in-flight section (persisted turns use `spec-tag-<id>`, which the
 *  streaming bubble does not have). */
export const STREAM_ANCHOR_ID = 'chamber-stream-anchor'

/** Distance (px) from the scroll container's bottom within which the user is
 *  considered "at the live edge" — auto-scroll engages; beyond it the user has
 *  scrolled up to re-read and must not be fought. */
export const STREAM_FOLLOW_THRESHOLD_PX = 240

/**
 * Bug 84 — on stream-start, scroll the new section's top to `topOffset` ONLY
 * when the user is near the live edge. Pure so the gate is unit-testable.
 */
export function shouldFollowStreamOnStart(
  distanceFromBottomPx: number,
  threshold: number = STREAM_FOLLOW_THRESHOLD_PX,
): boolean {
  return distanceFromBottomPx <= threshold
}
