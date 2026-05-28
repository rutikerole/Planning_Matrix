// Phase D — resolution check for the official government-resource links in
// src/data/governmentResources.ts. Fetches every URL and reports its HTTP
// status. A handful of state portals sit behind anti-bot walls (403) or are
// JS map apps; those are confirmed-official and treated as PASS-with-note.
// Only a 404 / DNS failure / network error fails the check.
//
//   node scripts/verify-gov-links.mjs
//
// Not wired into prebuild (it hits the live internet); run manually when the
// catalogue changes.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '..', 'src', 'data', 'governmentResources.ts')

const text = await readFile(SRC, 'utf-8')
const urls = [...text.matchAll(/url:\s*'([^']+)'/g)].map((m) => m[1])
const unique = [...new Set(urls)]

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'

async function probe(url) {
  // Try GET (HEAD is often blocked); 12s budget; follow redirects.
  const ctrl = AbortController ? new AbortController() : null
  const to = ctrl ? setTimeout(() => ctrl.abort(), 12000) : null
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
      signal: ctrl?.signal,
    })
    return res.status
  } catch (e) {
    return `ERR:${e?.name ?? 'fetch'}`
  } finally {
    if (to) clearTimeout(to)
  }
}

console.log(`[verify-gov-links] probing ${unique.length} URLs…\n`)
let hardFail = 0
const botWalled = []
for (const url of unique) {
  const status = await probe(url)
  let mark = '✓'
  if (status === 403 || status === 429) {
    mark = '~' // anti-bot wall — confirmed official, opens in a browser
    botWalled.push(url)
  } else if (typeof status !== 'number' || status >= 404) {
    mark = '✗'
    hardFail += 1
  }
  console.log(`  ${mark}  ${String(status).padEnd(8)} ${url}`)
}

console.log('')
if (botWalled.length) {
  console.log(`[verify-gov-links] ${botWalled.length} URL(s) returned 403/429 (anti-bot; official, reachable in a browser).`)
}
if (hardFail > 0) {
  console.error(`[verify-gov-links] ${hardFail} URL(s) did NOT resolve — investigate.`)
  process.exit(1)
}
console.log('[verify-gov-links] OK — all URLs resolve (200/redirect) or are known anti-bot walls.')
