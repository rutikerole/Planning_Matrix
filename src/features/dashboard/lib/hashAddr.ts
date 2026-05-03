/**
 * Deterministic 32-bit-ish address hash. Verbatim from the v3
 * prototype's `siteplan(addr)` → `hashAddr(a)`. The same address
 * must always produce the same value so site-plan thumbnails are
 * stable across renders.
 */
export function hashAddr(a: string): number {
  let h = 0
  for (let i = 0; i < a.length; i++) {
    h = ((h << 5) - h + a.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
