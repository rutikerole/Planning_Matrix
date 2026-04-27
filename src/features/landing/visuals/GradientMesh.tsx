/**
 * Hero gradient mesh: three warm radial blobs blended with multiply
 * so they darken paper rather than introduce a new color temperature.
 * Animations freeze under prefers-reduced-motion via the global rule.
 */
export function GradientMesh() {
  return (
    <div className="gradient-mesh" aria-hidden="true">
      <div className="mesh-blob mesh-blob-a animate-mesh-drift-a" />
      <div className="mesh-blob mesh-blob-b animate-mesh-drift-b" />
      <div className="mesh-blob mesh-blob-c animate-mesh-drift-c" />
    </div>
  )
}
