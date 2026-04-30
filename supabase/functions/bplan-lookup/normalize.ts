// Phase 6a — WMS GetFeatureInfo response → BplanLookupResult mapper.
//
// The Geoportal München returns a GeoJSON FeatureCollection. Each
// feature's `properties` carries:
//   • nr            — plan number (e.g. "117")
//   • nr_plan       — verfahrensaktenzeichen (Va) — combined identifier
//   • nr_va         — same as nr_plan in some layers
//   • bplan_te_1    — Textteil PDF URL
//   • bplan_te_3    — Planteil PDF URL
//   • bplan_suchtext — searchable name
//   • flaeche_qm    — area in m²
//   • art           — feature class (BEBPLAN, etc.)
//   • datum_rk      — date legally binding (in some layers)
//
// We pick the first feature when multiple cover a single point — the
// WMS `FEATURE_COUNT=5` ceiling means we get up to 5; multi-coverage
// is rare and the first is the highest-priority layer match.

export interface BplanLookupResult {
  status: 'found' | 'no_plan_found' | 'upstream_error'
  plan_number?: string
  plan_name_de?: string
  in_force_since?: string
  pdf_url_plan?: string
  pdf_url_text?: string
  feature_id?: string
  http_status?: number
}

interface FeatureCollection {
  type?: string
  features?: Feature[]
}

interface Feature {
  type?: string
  id?: string
  properties?: Record<string, unknown>
}

function asString(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const trimmed = v.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  if (typeof v === 'number') return String(v)
  return undefined
}

function asIsoDate(v: unknown): string | undefined {
  const s = asString(v)
  if (!s) return undefined
  // WMS datum_rk fields arrive as "YYYY-MM-DD" or epoch ms; accept both.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const ms = Number(s)
  if (Number.isFinite(ms)) return new Date(ms).toISOString().slice(0, 10)
  return undefined
}

export function normaliseFeatureCollection(fc: unknown): BplanLookupResult {
  if (!fc || typeof fc !== 'object') {
    return { status: 'no_plan_found' }
  }
  const features = (fc as FeatureCollection).features
  if (!Array.isArray(features) || features.length === 0) {
    return { status: 'no_plan_found' }
  }
  const first = features[0]
  const props = (first?.properties ?? {}) as Record<string, unknown>
  const number = asString(props.nr) ?? asString(props.nr_plan) ?? asString(props.nr_va)
  const name = asString(props.bplan_suchtext) ?? (number ? `${number} (Bebauungsplan)` : undefined)

  return {
    status: 'found',
    plan_number: number,
    plan_name_de: name,
    in_force_since: asIsoDate(props.datum_rk),
    pdf_url_plan: asString(props.bplan_te_3),
    pdf_url_text: asString(props.bplan_te_1),
    feature_id: asString(first?.id),
  }
}
