/**
 * v3 plot-profile hook. Returns a structured `PlotProfile` for the
 * Q2 sidebar derived from the current address. v1 ships with a
 * Munich-postcode fallback table; out-of-region addresses get
 * `null` fields and the sidebar renders a soft "data not yet
 * available" notice.
 *
 * No external geocoder or API call here — keep this synchronous so
 * the sidebar can re-render in step with the address input.
 */

import { isMuenchenAddress } from '../lib/plotValidation'

export interface PlotProfile {
  stadtbezirk: string | null
  areaEstimate: number | null
  areaBuildable: number | null
  planningLaw: string | null
  character: string | null
  heritageDistance: number | null
}

const MUNICH_FALLBACK: PlotProfile = {
  stadtbezirk: '2 — Ludwigsvorstadt-Isarvorstadt',
  areaEstimate: 412,
  areaBuildable: 286,
  planningLaw: 'Innenbereich, § 34 BauGB',
  character: 'dichtes Mischgebiet',
  heritageDistance: 1.2,
}

const EMPTY_PROFILE: PlotProfile = {
  stadtbezirk: null,
  areaEstimate: null,
  areaBuildable: null,
  planningLaw: null,
  character: null,
  heritageDistance: null,
}

export function usePlotProfile(address: string | null | undefined): PlotProfile {
  if (!address || address.trim().length < 6) return EMPTY_PROFILE
  return isMuenchenAddress(address) ? MUNICH_FALLBACK : EMPTY_PROFILE
}
