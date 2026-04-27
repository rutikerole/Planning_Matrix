/**
 * One-shot image pipeline: source JPGs in public/images/source/
 * → AVIF + WebP + optimised JPG, at 1600w (desktop) and 900w (mobile).
 *
 * Run with `npm run images`. Outputs go to public/images/.
 *
 * Sharp is a devDep — never ships to client.
 */
import sharp from 'sharp'
import { readdir, mkdir } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'images-source')
const OUT = join(ROOT, 'public/images')

const WIDTHS = [1600, 900]
const FORMATS = [
  { name: 'avif', opts: { quality: 50, effort: 4 } },
  { name: 'webp', opts: { quality: 80, effort: 4 } },
  { name: 'jpg', opts: { quality: 82, mozjpeg: true } },
]

await mkdir(OUT, { recursive: true })

const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png)$/i.test(f))
console.log(`Processing ${files.length} sources...\n`)

let totalIn = 0
let totalOut = 0

for (const f of files) {
  const name = basename(f, extname(f))
  const src = join(SRC, f)
  const inMeta = await sharp(src).metadata()
  console.log(`◇ ${f}  (${inMeta.width}×${inMeta.height})`)

  for (const w of WIDTHS) {
    for (const fmt of FORMATS) {
      const dest = join(OUT, `${name}-${w}.${fmt.name}`)
      const info = await sharp(src)
        .resize({ width: w, withoutEnlargement: true })
        .toFormat(fmt.name, fmt.opts)
        .toFile(dest)
      const kb = Math.round(info.size / 1024)
      totalOut += info.size
      console.log(`  ${fmt.name.padEnd(4)} ${w.toString().padStart(4)} → ${String(kb).padStart(4)} kB`)
    }
  }

  const { size } = await import('node:fs').then((m) => m.promises.stat(src))
  totalIn += size
  console.log()
}

console.log(`Source total:  ${(totalIn / 1024).toFixed(0)} kB`)
console.log(`Output total:  ${(totalOut / 1024).toFixed(0)} kB`)
console.log(`Compression:   ${((1 - totalOut / (totalIn * FORMATS.length * WIDTHS.length)) * 100).toFixed(1)}% saved vs. naive`)
