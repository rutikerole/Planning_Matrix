// ───────────────────────────────────────────────────────────────────────
// Phase 9 — Datadog-style search query parser.
//
// Subset implemented:
//   * key:value           equality on a known column
//   * key:>N / key:<N     numeric comparison
//   * key:>=N / key:<=N   numeric comparison
//   * from:YYYY-MM-DD     started_at >= start of day
//   * to:YYYY-MM-DD       started_at <= end of day
//   * <free text>         ILIKE match on error_message
//
// Known keys mapped to columns:
//   status, kind, error_class, model, project, user
//   cost_cents, duration_ms, total_input_tokens, total_output_tokens
//
// AND is implicit between tokens. OR / NOT not implemented in v1 —
// the six core questions in PHASE_9_FINDINGS §13 are answerable
// with implicit-AND alone. Add OR/NOT in Phase 9.5 if it becomes
// the bottleneck.
// ───────────────────────────────────────────────────────────────────────

export interface FilterClause {
  /** Column to query in logs.traces */
  column: string
  op: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'ilike'
  value: string | number
  /** Original token, for diagnostics */
  raw: string
}

export interface ParsedQuery {
  clauses: FilterClause[]
  freeText: string | null
  unknownKeys: string[]
  errors: string[]
}

const COLUMN_MAP: Record<string, { column: string; numeric?: boolean }> = {
  status:                { column: 'status' },
  kind:                  { column: 'kind' },
  error_class:           { column: 'error_class' },
  model:                 { column: 'model' },
  project:               { column: 'project_id' },
  user:                  { column: 'user_id' },
  cost_cents:            { column: 'total_cost_cents', numeric: true },
  duration_ms:           { column: 'duration_ms', numeric: true },
  input_tokens:          { column: 'total_input_tokens', numeric: true },
  output_tokens:         { column: 'total_output_tokens', numeric: true },
  cache_read:            { column: 'total_cache_read_tokens', numeric: true },
}

export function parseSearchQuery(input: string): ParsedQuery {
  const result: ParsedQuery = {
    clauses: [],
    freeText: null,
    unknownKeys: [],
    errors: [],
  }
  if (!input.trim()) return result

  // Tokenise on whitespace, respecting quoted strings
  const tokens = tokenise(input)
  const freeWords: string[] = []

  for (const tok of tokens) {
    const colonIdx = tok.indexOf(':')
    if (colonIdx < 0) {
      // No key — accumulate as free text
      freeWords.push(tok)
      continue
    }

    const key = tok.slice(0, colonIdx)
    const rawVal = tok.slice(colonIdx + 1)
    const lookup = COLUMN_MAP[key]

    if (!lookup) {
      // from/to are special — date ranges on started_at
      if (key === 'from') {
        result.clauses.push({
          column: 'started_at',
          op: 'gte',
          value: `${rawVal}T00:00:00Z`,
          raw: tok,
        })
        continue
      }
      if (key === 'to') {
        result.clauses.push({
          column: 'started_at',
          op: 'lte',
          value: `${rawVal}T23:59:59Z`,
          raw: tok,
        })
        continue
      }
      result.unknownKeys.push(key)
      continue
    }

    const m = rawVal.match(/^(>=|<=|>|<)?(.+)$/)
    if (!m) {
      result.errors.push(`could not parse value for ${key}`)
      continue
    }
    const opSym = m[1]
    let val: string | number = m[2]

    if (lookup.numeric) {
      const n = Number(val)
      if (!Number.isFinite(n)) {
        result.errors.push(`${key} expects a number; got "${m[2]}"`)
        continue
      }
      val = n
    }

    const op =
      opSym === '>'
        ? 'gt'
        : opSym === '<'
          ? 'lt'
          : opSym === '>='
            ? 'gte'
            : opSym === '<='
              ? 'lte'
              : 'eq'

    result.clauses.push({ column: lookup.column, op, value: val, raw: tok })
  }

  if (freeWords.length > 0) result.freeText = freeWords.join(' ')
  return result
}

// Simple tokeniser that respects "quoted strings" so a value with a
// space (rare in our domain but possible in error messages) survives.
function tokenise(input: string): string[] {
  const tokens: string[] = []
  let buf = ''
  let inQuote = false
  for (const ch of input) {
    if (ch === '"') {
      inQuote = !inQuote
      continue
    }
    if (ch === ' ' && !inQuote) {
      if (buf) tokens.push(buf)
      buf = ''
      continue
    }
    buf += ch
  }
  if (buf) tokens.push(buf)
  return tokens
}
