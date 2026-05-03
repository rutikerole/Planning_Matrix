import type { TemplateId } from '@/types/projectState'

/**
 * Per-template archetype silhouettes drawn inside the v3 loader's
 * drafting-board illustration. The prototype uses a single EFH
 * silhouette; here we expand to all 8 templates. Each entry returns
 * one or more SVG path `d` strings that draw on (delay-4) when the
 * loader runs.
 *
 * Coordinates are sized for the 340×200 drafting-board viewBox,
 * centred around the paper sheet at ~(150–200, 80–130).
 */
export const SILHOUETTE_PATHS: Record<TemplateId, string[]> = {
  // T-01 — single-family house. Verbatim from the prototype.
  'T-01': [
    'M 150 130 L 150 100 L 175 80 L 200 100 L 200 130 Z',
    'M 170 130 L 170 113 L 182 113 L 182 130',
  ],
  // T-02 — taller block, multiple floor lines.
  'T-02': [
    'M 152 130 L 152 78 L 198 78 L 198 130 Z',
    'M 152 92 L 198 92',
    'M 152 106 L 198 106',
    'M 152 120 L 198 120',
  ],
  // T-03 — existing (dashed) + visible renewal layer.
  'T-03': [
    'M 150 130 L 150 100 L 175 80 L 200 100 L 200 130 Z',
    'M 158 122 L 192 122',
    'M 158 114 L 192 114',
    'M 158 106 L 192 106',
  ],
  // T-04 — house with arrow-cycle indicating change of use.
  'T-04': [
    'M 150 130 L 150 100 L 175 80 L 200 100 L 200 130 Z',
    'M 165 116 A 10 10 0 1 1 185 116',
    'M 185 116 L 181 113 M 185 116 L 188 112',
  ],
  // T-05 — slashed house indicating demolition.
  'T-05': [
    'M 150 130 L 150 100 L 175 80 L 200 100 L 200 130 Z',
    'M 145 132 L 205 78',
  ],
  // T-06 — house with new top floor (clay-highlighted in render).
  'T-06': [
    'M 150 130 L 150 104 L 200 104 L 200 130 Z',
    'M 150 104 L 175 86 L 200 104',
    'M 150 92 L 200 92',
  ],
  // T-07 — house with side extension.
  'T-07': [
    'M 150 130 L 150 100 L 175 80 L 200 100 L 200 130 Z',
    'M 200 110 L 224 110 L 224 130 L 200 130',
  ],
  // T-08 — house with question mark.
  'T-08': [
    'M 150 130 L 150 100 L 175 80 L 200 100 L 200 130 Z',
    'M 171 105 A 4 4 0 1 1 179 105',
    'M 175 109 L 175 113',
    'M 175 118 L 175 119',
  ],
}
