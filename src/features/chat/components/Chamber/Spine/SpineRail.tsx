// Phase 7.5 — SpineRail.
//
// The vertical clay line behind the stage dots. Single SVG so the
// gradient fade at top + bottom is a clean mask, not a series of
// per-row hairlines that would clip awkwardly.
//
// Mounted absolutely inside SpineStageList; the stage list is
// position: relative so this fills the column.

export function SpineRail() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-[28px] top-3 bottom-3 w-px spine-rail-mask"
      style={{ background: 'var(--spine-rail-color, rgba(123,92,63,0.32))' }}
    />
  )
}
