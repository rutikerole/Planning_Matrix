// Phase 7 — assertion contracts (§B of the brief, locked precisely).
//
// Each function returns an array of { pass, message, detail? } records.
// A test "passes" only when every record across every contract has
// pass=true. Side-effect free; deterministic; unit-test-able by hand.
//
// The harness's `Fact` type nests source/quality under `.qualifier`,
// while the test JSON's `must_contain_facts` puts them at top level.
// `assertMustContainFacts` bridges that schema mismatch.

// ─── Helpers ────────────────────────────────────────────────────────────

function deepEqual(a, b) {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) {
    // Number-as-string tolerance: Anthropic occasionally emits "3" when
    // we expect 3. Both pass if the coerced equality holds.
    if (
      (typeof a === 'number' && typeof b === 'string' && String(a) === b) ||
      (typeof b === 'number' && typeof a === 'string' && String(b) === a)
    ) {
      return true
    }
    return false
  }
  if (typeof a !== 'object') return a === b
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false
    return true
  }
  const ka = Object.keys(a),
    kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) if (!deepEqual(a[k], b[k])) return false
  return true
}

function normaliseForSubstring(text) {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim()
}

// ─── 1. must_contain_facts ──────────────────────────────────────────────

export function assertMustContainFacts(projectState, expected) {
  if (!Array.isArray(expected) || expected.length === 0) {
    return [{ pass: true, message: 'must_contain_facts: empty (vacuously true)' }]
  }
  const facts = projectState?.facts ?? []
  const out = []
  for (const exp of expected) {
    const actual = facts.find((f) => f.key === exp.key)
    if (!actual) {
      out.push({
        pass: false,
        message: `MISSING_FACT: ${exp.key}`,
        detail: { expected: exp, actualKeys: facts.map((f) => f.key) },
      })
      continue
    }
    if (!deepEqual(actual.value, exp.value)) {
      out.push({
        pass: false,
        message: `VALUE_MISMATCH: ${exp.key}`,
        detail: { expected: exp.value, actual: actual.value },
      })
      continue
    }
    if (actual.qualifier?.source !== exp.source) {
      out.push({
        pass: false,
        message: `SOURCE_MISMATCH: ${exp.key}`,
        detail: { expected: exp.source, actual: actual.qualifier?.source },
      })
      continue
    }
    if (actual.qualifier?.quality !== exp.quality) {
      out.push({
        pass: false,
        message: `QUALITY_MISMATCH: ${exp.key}`,
        detail: { expected: exp.quality, actual: actual.qualifier?.quality },
      })
      continue
    }
    out.push({ pass: true, message: `OK: ${exp.key}` })
  }
  return out
}

// ─── 2. must_contain_recommendations_anchors ────────────────────────────

export function assertMustContainRecommendationsAnchors(projectState, expected) {
  if (!Array.isArray(expected) || expected.length === 0) {
    return [
      { pass: true, message: 'must_contain_recommendations_anchors: empty (vacuously true)' },
    ]
  }
  const recs = projectState?.recommendations ?? []
  const corpus = normaliseForSubstring(
    recs.map((r) => `${r.title_de ?? ''} ${r.detail_de ?? ''}`).join(' '),
  )
  const out = []
  for (const anchor of expected) {
    const needle = normaliseForSubstring(anchor)
    if (corpus.includes(needle)) {
      out.push({ pass: true, message: `OK_ANCHOR: ${anchor}` })
    } else {
      out.push({
        pass: false,
        message: `MISSING_ANCHOR: ${anchor}`,
        detail: { searched_chars: corpus.length },
      })
    }
  }
  return out
}

// ─── 3. must_not_contain ────────────────────────────────────────────────

export function assertMustNotContain(projectState, forbidden) {
  if (!Array.isArray(forbidden) || forbidden.length === 0) {
    return [{ pass: true, message: 'must_not_contain: empty (vacuously true)' }]
  }
  const serialised = normaliseForSubstring(JSON.stringify(projectState ?? {}))
  const out = []
  for (const banned of forbidden) {
    const needle = normaliseForSubstring(banned)
    if (serialised.includes(needle)) {
      out.push({ pass: false, message: `FORBIDDEN_PRESENT: ${banned}` })
    } else {
      out.push({ pass: true, message: `OK_NOT_PRESENT: ${banned}` })
    }
  }
  return out
}

// ─── 4. expected_specialist_voices_at_least ─────────────────────────────

export function assertExpectedVoices(transcript, expectedVoices) {
  if (!Array.isArray(expectedVoices) || expectedVoices.length === 0) {
    return [{ pass: true, message: 'expected_specialist_voices_at_least: empty (vacuously true)' }]
  }
  const observed = new Set(
    (transcript ?? []).map((m) => m?.specialist).filter(Boolean),
  )
  const out = []
  for (const voice of expectedVoices) {
    if (observed.has(voice)) out.push({ pass: true, message: `OK_VOICE: ${voice}` })
    else
      out.push({
        pass: false,
        message: `MISSING_VOICE: ${voice}`,
        detail: { observed: [...observed] },
      })
  }
  return out
}

// ─── 5. completion_signal ───────────────────────────────────────────────

export function assertCompletionSignal(transcript, expected) {
  if (!expected) return [{ pass: true, message: 'completion_signal: empty (vacuously true)' }]
  const last = (transcript ?? []).at(-1)
  const actual = last?.completion_signal ?? null
  if (actual === expected) {
    return [{ pass: true, message: `OK_SIGNAL: ${expected}` }]
  }
  return [
    {
      pass: false,
      message: `SIGNAL_MISMATCH`,
      detail: { expected, actual },
    },
  ]
}

// ─── Aggregate verdict for one test project ────────────────────────────

export function evaluateTest({ test, transcript, finalProjectState }) {
  const expected = test.expected_output ?? {}
  const groups = {
    facts: assertMustContainFacts(finalProjectState, expected.must_contain_facts),
    anchors: assertMustContainRecommendationsAnchors(
      finalProjectState,
      expected.must_contain_recommendations_anchors,
    ),
    forbidden: assertMustNotContain(finalProjectState, expected.must_not_contain),
    voices: assertExpectedVoices(transcript, test.expected_specialist_voices_at_least),
    signal: assertCompletionSignal(transcript, expected.completion_signal),
  }
  const all = Object.values(groups).flat()
  const passed = all.every((r) => r.pass)
  return { passed, groups }
}
