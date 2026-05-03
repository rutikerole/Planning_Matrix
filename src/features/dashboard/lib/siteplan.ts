import { hashAddr } from './hashAddr'

/**
 * Deterministic site-plan SVG generator. Verbatim transcription of
 * the v3 prototype's `siteplan(addr)` JS function. Same input
 * always produces the same SVG output.
 *
 * The pattern id is suffixed with the address hash so multiple
 * thumbnails can co-exist on the same page without colliding
 * (the prototype uses a fixed `id="hatchPat"` which would conflict
 * across many cards).
 */
export function siteplanSvg(addr: string): string {
  const h = hashAddr(addr)
  let s = 0
  const r = () => {
    s++
    return (((Math.sin(h + s * 7.13) * 43758.5453) % 1) + 1) % 1
  }
  const px = 18 + r() * 8
  const py = 22 + r() * 10
  const pw = 22 + r() * 10
  const ph = 18 + r() * 8
  const buildings: Array<{ bx: number; by: number; bw: number; bh: number; hatch: boolean }> = []
  // v3 fix #1 — sample more candidates and tighten the bx/by range
  // so over-bound rejections drop. Overlap margin is 2 (was 4).
  // The verbatim prototype attempted 5–7 with bx/by spanning the
  // full canvas; on real data that produced 67% sparse thumbnails.
  for (let i = 0; i < 18 + Math.floor(r() * 6); i++) {
    const bx = 4 + r() * 52
    const by = 4 + r() * 52
    const bw = 8 + r() * 12
    const bh = 6 + r() * 10
    // skip overlap with parcel
    if (bx < px + pw + 2 && bx + bw > px - 2 && by < py + ph + 2 && by + bh > py - 2) continue
    if (bx + bw > 76 || by + bh > 72) continue
    buildings.push({ bx, by, bw, bh, hatch: r() > 0.4 })
  }
  const patternId = `hatchPat-${h}`
  return `
  <svg class="thumb-svg" viewBox="0 0 80 80" width="80" height="80">
    <defs>
      <pattern id="${patternId}" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="3" stroke="rgba(22,19,16,.55)" stroke-width=".6"/>
      </pattern>
    </defs>
    <rect x="0" y="0" width="80" height="80" fill="none"/>
    <line x1="0" y1="${30 + r() * 10}" x2="80" y2="${30 + r() * 10}" class="road"/>
    <line x1="${30 + r() * 10}" y1="0" x2="${30 + r() * 10}" y2="80" class="road"/>
    ${buildings
      .map((b) =>
        b.hatch
          ? `<rect x="${b.bx}" y="${b.by}" width="${b.bw}" height="${b.bh}" class="building" fill="url(#${patternId})" />`
          : `<rect x="${b.bx}" y="${b.by}" width="${b.bw}" height="${b.bh}" class="building" />`,
      )
      .join('')}
    <rect x="${px}" y="${py}" width="${pw}" height="${ph}" class="parcel"/>
    <text x="2" y="78" class="label">N ↑</text>
  </svg>`
}
