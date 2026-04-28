// ───────────────────────────────────────────────────────────────────────
// Phase 3.7 #78 — 30° axonometric projection
//
// Vertices defined in 3D space; this module projects them to 2D screen
// coordinates so the architectural illustrations stop looking
// hand-drawn-wonky and read as proper drafting.
//
// Convention: x = depth (into screen), y = width, z = height. Both
// visible side faces incline 30° from horizontal. Origin is the
// foot-of-front-corner; positive z grows up the page (so we subtract
// to land in screen-y).
// ───────────────────────────────────────────────────────────────────────

const COS_30 = Math.cos(Math.PI / 6) // ≈ 0.8660
const SIN_30 = Math.sin(Math.PI / 6) // = 0.5

export interface ProjectionOptions {
  /** Origin of the world frame, in screen coords. */
  originX: number
  originY: number
  /** World units per screen pixel. Higher = bigger drawing. */
  scale: number
}

/**
 * Project a 3D world point (x, y, z) to a 2D screen point (sx, sy).
 *
 *   sx = origin.x + (y − x) · cos30 · scale
 *   sy = origin.y − (z + (x + y) · sin30) · scale
 *
 * Visible front face is x = 0; visible side face is y = 0; visible
 * top face is z = top.
 */
export function project(
  x: number,
  y: number,
  z: number,
  opts: ProjectionOptions,
): { sx: number; sy: number } {
  const { originX, originY, scale } = opts
  return {
    sx: originX + (y - x) * COS_30 * scale,
    sy: originY - (z + (x + y) * SIN_30) * scale,
  }
}

/**
 * Convenience: project a list of world points and return the SVG
 * `d` path data tracing them as a closed polygon (starts with M, line
 * segments are L, ends with Z).
 */
export function pathFromVertices(
  vertices: Array<[number, number, number]>,
  opts: ProjectionOptions,
  close = true,
): string {
  if (vertices.length === 0) return ''
  const points = vertices.map(([x, y, z]) => project(x, y, z, opts))
  const head = `M ${points[0].sx.toFixed(1)} ${points[0].sy.toFixed(1)}`
  const tail = points
    .slice(1)
    .map((p) => `L ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`)
    .join(' ')
  return close ? `${head} ${tail} Z` : `${head} ${tail}`
}
