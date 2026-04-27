/**
 * Fixed full-viewport SVG noise layer giving the warm paper background its tooth.
 * 3.5% opacity, multiply blend, never reads as decorative — only as warmth.
 */
export function GrainOverlay() {
  return <div className="grain-overlay" aria-hidden="true" />
}
