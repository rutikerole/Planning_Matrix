#!/usr/bin/env -S npx tsx
// fix/plz-detect — postcode → Bundesland inference gate.
// Walk evidence (T-06 walk 2 attempt, Jena): the 2-digit sector table
// assigned the WHOLE 01-09 block to Sachsen, so 07743 Jena (Thüringen)
// ran a full consultation on SächsBO — cross-state silent-wrong at hop
// zero. Fixtures: one per state (the 16 capitals) + every boundary city
// the old table got wrong or could get wrong. RED pre-fix.
import { inferBundeslandFromPostcode } from '../src/features/wizard/lib/inferBundeslandFromPostcode.ts'

let pass = 0
let fail = 0
const ok = (cond: boolean, msg: string) => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`) }
  else { fail++; console.error(`  ✗ ${msg}`) }
}

const CASES: ReadonlyArray<readonly [string, string, string]> = [
  // 16 state capitals — one fixture per state
  ['70173 Stuttgart', 'bw', 'Stuttgart'],
  ['80331 München', 'bayern', 'München'],
  ['10115 Berlin', 'berlin', 'Berlin'],
  ['14467 Potsdam', 'brandenburg', 'Potsdam (old table said berlin!)'],
  ['28195 Bremen', 'bremen', 'Bremen'],
  ['20095 Hamburg', 'hamburg', 'Hamburg'],
  ['65185 Wiesbaden', 'hessen', 'Wiesbaden'],
  ['19053 Schwerin', 'mv', 'Schwerin'],
  ['30159 Hannover', 'niedersachsen', 'Hannover'],
  ['40213 Düsseldorf', 'nrw', 'Düsseldorf'],
  ['55116 Mainz', 'rlp', 'Mainz'],
  ['66111 Saarbrücken', 'saarland', 'Saarbrücken'],
  ['01067 Dresden', 'sachsen', 'Dresden'],
  ['39104 Magdeburg', 'sachsen-anhalt', 'Magdeburg'],
  ['24103 Kiel', 'sh', 'Kiel'],
  ['99084 Erfurt', 'thueringen', 'Erfurt'],
  // THE walk bug + the 0-block the old table glossed to 'sachsen'
  ['Wagnergasse 25, 07743 Jena', 'thueringen', 'Jena 07743 — THE walk bug'],
  ['07545 Gera', 'thueringen', 'Gera'],
  ['04109 Leipzig', 'sachsen', 'Leipzig'],
  ['06108 Halle (Saale)', 'sachsen-anhalt', 'Halle'],
  ['03046 Cottbus', 'brandenburg', 'Cottbus'],
  ['08056 Zwickau', 'sachsen', 'Zwickau'],
  ['09111 Chemnitz', 'sachsen', 'Chemnitz'],
  ['98527 Suhl', 'thueringen', 'Suhl'],
  ['99734 Nordhausen', 'thueringen', 'Nordhausen'],
  // Boundary prefixes flagged in the directive (17, 21/22, 34, 37, 57, 66, 68/69, 88/89)
  ['17291 Prenzlau', 'brandenburg', 'Prenzlau (17 is not all MV)'],
  ['17489 Greifswald', 'mv', 'Greifswald'],
  ['21335 Lüneburg', 'niedersachsen', 'Lüneburg (21 is not all Hamburg)'],
  ['22846 Norderstedt', 'sh', 'Norderstedt (22 is not all Hamburg)'],
  ['23552 Lübeck', 'sh', 'Lübeck'],
  ['27568 Bremerhaven', 'bremen', 'Bremerhaven (27 is not all Niedersachsen)'],
  ['34117 Kassel', 'hessen', 'Kassel'],
  ['34414 Warburg', 'nrw', 'Warburg (34 is not all Hessen)'],
  ['34346 Hann. Münden', 'niedersachsen', 'Hann. Münden'],
  ['37073 Göttingen', 'niedersachsen', 'Göttingen'],
  ['37213 Witzenhausen', 'hessen', 'Witzenhausen (37 is not all Niedersachsen)'],
  ['37308 Heilbad Heiligenstadt', 'thueringen', 'Heiligenstadt'],
  ['49477 Ibbenbüren', 'nrw', 'Ibbenbüren (49 is not all Niedersachsen)'],
  ['57610 Altenkirchen', 'rlp', 'Altenkirchen (57 is not all NRW)'],
  ['63739 Aschaffenburg', 'bayern', 'Aschaffenburg (63 is not all Hessen)'],
  ['66849 Landstuhl', 'rlp', 'Landstuhl (66 is not all Saarland)'],
  ['69434 Hirschhorn', 'hessen', 'Hirschhorn (69 is not all BW)'],
  ['88131 Lindau', 'bayern', 'Lindau (88 is not all BW)'],
  ['89073 Ulm', 'bw', 'Ulm (89 is not all Bayern)'],
  ['89231 Neu-Ulm', 'bayern', 'Neu-Ulm'],
  ['97877 Wertheim', 'bw', 'Wertheim (97 is not all Bayern)'],
]

console.log('PLZ → Bundesland inference (fixtures per state + boundary prefixes):')
for (const [addr, want, label] of CASES) {
  const got = inferBundeslandFromPostcode(addr)
  ok(got.bundesland === want, `${label}: '${addr}' → ${want} (got ${got.bundesland})`)
}

// API contract (pinned by smokeWalk too): fallback stays bayern + postcode null.
const fb = inferBundeslandFromPostcode('')
ok(fb.bundesland === 'bayern' && fb.postcode === null, 'empty input falls back to bayern with postcode null (v1.0.6 contract)')
const garbage = inferBundeslandFromPostcode('keine PLZ hier')
ok(garbage.bundesland === 'bayern' && garbage.postcode === null, 'no-postcode input falls back to bayern')

console.log(`\n${pass} passed · ${fail} failed`)
if (fail > 0) { console.error('[smoke-plz-bundesland] FAILED'); process.exit(1) }
console.log('[smoke-plz-bundesland] OK')
