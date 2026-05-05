import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWizardState } from '../hooks/useWizardState'
import { isPlotAddressValid, isMuenchenAddress } from '../lib/plotValidation'
import type { Intent } from '../lib/selectTemplate'
import { BPlanCheck } from './BPlanCheck'
import { PlotSidebar } from './PlotSidebar'
import { suggestProjectName } from '@/features/dashboard/lib/projectName'
import { districtFromAddress } from '@/data/muenchenPlzDistricts'
import type { BplanLookupResult } from '@/types/bplan'
import type { GeocodeResult } from './PlotMap/geocode'

/**
 * Phase 7.10g — derive the popover's "PLANNING LAW" string from the
 * live B-Plan WMS lookup. Updates per pin pick (the lookup runs on
 * resolved coords). `null` when there is nothing useful to show
 * (loading, upstream WMS error, etc.).
 *
 * `t` and `fallback` are passed in so this helper stays a pure
 * function of the input — no useTranslation calls outside of the
 * component body.
 */
function formatPlanningLaw(
  result: BplanLookupResult | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
  fallback: string,
): string | null {
  if (!result) return null
  if (result.status === 'upstream_error') return null
  if (result.status === 'no_plan_found') return fallback
  // status === 'found'
  if (result.plan_number && result.plan_name_de) {
    return t('wizard.q2.plot.planningLawFound', {
      number: result.plan_number,
      name: result.plan_name_de,
    })
  }
  if (result.plan_number) {
    return t('wizard.q2.plot.planningLawFoundNumber', {
      number: result.plan_number,
    })
  }
  return fallback
}

const PlotMap = lazy(() =>
  import('./PlotMap/PlotMap').then((mod) => ({ default: mod.PlotMap })),
)

interface Props {
  onSubmit: (input: {
    intent: Intent
    hasPlot: boolean
    plotAddress: string | null
    bplanResult: BplanLookupResult | null
    suggestedName: string | null
    /** Phase 5 — true when the user explicitly confirmed proceeding
     *  with a non-München PLZ. Persisted as a CLIENT/DECIDED fact so
     *  the system prompt can adjust honesty disclaimers. */
    outsideMunichAcknowledged?: boolean
  }) => Promise<void> | void
  submitError: string | null
}

/**
 * v3 Q2 — plot question. 30/70 grid on lg+ with the question lane
 * on the left and the map on the right; single column below lg.
 *
 * Phase 7.10g — Location profile is now a CLICK-TOGGLE POPOVER
 * (was always-visible in 7.10f). Behaviour:
 *   • Hidden by default. Map renders München zoom 13 with no pin,
 *     no popover. A small italic empty-state hint sits in the
 *     map's top-left chip slot.
 *   • A pin lands when the address is typed (geocode resolves) OR
 *     when the user clicks a point on the map (reverse-geocode).
 *     The popover auto-opens with that location's data.
 *   • Clicking a different point updates the popover (smooth fade
 *     keyed on coord identity).
 *   • Closes on × button, Esc, or click anywhere outside the
 *     right column (left column / page background). Map clicks
 *     stay inside the right column and just drop a new pin.
 *
 * Phase 7.10g — popover fields are limited to the THREE that
 * actually update per click:
 *   • DISTRICT       — PLZ → Stadtbezirk via curated lookup
 *   • PLANNING LAW   — derived from the live WMS B-Plan lookup
 *   • SUGGESTED NAME — derived from intent + address
 * The four mocked rows from earlier phases (estimated area,
 * buildable area, character, heritage proximity) are no longer
 * surfaced; their data computation paths in usePlotProfile.ts are
 * preserved as a future-Phase TODO.
 *
 * Out-of-coverage (non-München) addresses surface as a soft note
 * rather than a hard error.
 */
export function QuestionPlot({ onSubmit, submitError }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const intent = useWizardState((s) => s.intent)
  const hasPlot = useWizardState((s) => s.hasPlot)
  const plotAddress = useWizardState((s) => s.plotAddress)
  const setPlotChoice = useWizardState((s) => s.setPlotChoice)
  const setPlotAddress = useWizardState((s) => s.setPlotAddress)
  const goBackToQ1 = useWizardState((s) => s.goBackToQ1)

  const addressInputRef = useRef<HTMLInputElement>(null)
  const [touched, setTouched] = useState(false)
  const [bplanResult, setBplanResult] = useState<BplanLookupResult | null>(null)
  const [bplanLoading, setBplanLoading] = useState(false)
  // Phase 5 — Mode B PLZ gate: when the address is structurally valid
  // but the PLZ isn't in München, the primary CTA flips to "Adresse
  // prüfen" and the user must explicitly click "Trotzdem fortfahren"
  // (which sets this flag) before submission proceeds. The flag is
  // persisted as a CLIENT/DECIDED fact so the system prompt can adjust
  // its honesty disclaimers downstream.
  const [outsideMunichConfirmed, setOutsideMunichConfirmed] = useState(false)

  useEffect(() => {
    if (hasPlot === true && !plotAddress) {
      addressInputRef.current?.focus()
    }
  }, [hasPlot, plotAddress])

  // Reset the outside-München confirmation whenever the address text
  // changes — the user may have corrected to a München PLZ, or moved
  // to a different non-München address that needs its own ack. This
  // is the canonical "react to external value change" pattern: the
  // address is owned by the wizard zustand store, not local state, so
  // we sync the local confirmation flag in an effect. The lint rule
  // is suppressed inline (matching the existing convention in this
  // codebase, e.g. ChatWorkspacePage.tsx:181).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setOutsideMunichConfirmed(false)
  }, [plotAddress])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Phase 7.10g — popover data sources (each updates per pin pick):
  //   • district: PLZ → Stadtbezirk via curated lookup table
  //   • planningLawDisplay: from the live WMS B-Plan lookup
  //   • suggestedName: from intent + address
  const district = districtFromAddress(plotAddress)
  const planningLawDisplay = formatPlanningLaw(
    bplanResult,
    t,
    'Innenbereich, § 34 BauGB',
  )
  const suggestedName = intent ? suggestProjectName(intent, plotAddress) : null

  // Phase 7.10g — Location profile is a click-toggle popover. Opens
  // whenever a pin appears (geocode resolves OR map click); closes
  // on × / Esc / click anywhere outside the right column. Coords
  // are mirrored from PlotMap via onCoordinatesResolved so we can
  // trigger the open on coord identity change.
  const [coords, setCoords] = useState<GeocodeResult | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const rightColumnRef = useRef<HTMLDivElement>(null)

  // Auto-open whenever a NEW pin lands (coords transition by
  // value, not reference — same lat/lng must NOT re-open after a
  // user dismiss). When coords clear (address < 6 chars), close.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (coords) setPopoverOpen(true)
    else setPopoverOpen(false)
  }, [coords?.lat, coords?.lng])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // Esc key closes the popover (document-level so it works even when
  // focus has not entered the popover yet).
  useEffect(() => {
    if (!popoverOpen) return
    const handleKey = (e: KeyboardEvent<Document> | globalThis.KeyboardEvent) => {
      if ((e as globalThis.KeyboardEvent).key === 'Escape') {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey as EventListener)
    return () => document.removeEventListener('keydown', handleKey as EventListener)
  }, [popoverOpen])

  // Click anywhere outside the right column (which contains both
  // the map and the popover) closes the popover. Clicks INSIDE the
  // right column — including on the map itself — don't close,
  // because a map click drops a new pin and the auto-open effect
  // re-opens the popover with the new data.
  useEffect(() => {
    if (!popoverOpen) return
    const handleMouseDown = (e: MouseEvent) => {
      const node = rightColumnRef.current
      if (node && !node.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [popoverOpen])

  const addressValid = isPlotAddressValid(plotAddress)
  const isMunich = addressValid && isMuenchenAddress(plotAddress)
  const showFormatError = touched && hasPlot === true && !addressValid
  // Show the soft outside-München warning only after the address looks
  // structurally valid AND the user has touched the field — keeps the
  // warning out of the way during fresh typing.
  const showOutsideMunichWarning =
    hasPlot === true && addressValid && !isMunich

  const canSubmit =
    intent !== null &&
    (hasPlot === false ||
      (hasPlot === true && addressValid && (isMunich || outsideMunichConfirmed)))

  const handleSubmit = () => {
    if (!intent) return
    if (!canSubmit) {
      setTouched(true)
      return
    }
    void onSubmit({
      intent,
      hasPlot: hasPlot === true,
      plotAddress: hasPlot === true ? plotAddress.trim() : null,
      bplanResult,
      suggestedName,
      outsideMunichAcknowledged:
        hasPlot === true && addressValid && !isMunich && outsideMunichConfirmed,
    })
  }

  const handleAddressKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Phase 7.10f — Bug 2 fix: the map renders as soon as Yes is
  // selected, before any address is typed. With no coords yet it
  // sits at München zoom 13 with no pin, so the user can drag /
  // zoom / click-to-select even before typing.
  const showMap = hasPlot === true
  // Sub-gate for things that only make sense once an address is
  // typed and geocodable: the BPlanCheck pill (driven by the
  // Edge Function lookup against resolved coords), the mapHint
  // ("click on the map to inspect..."), and the floating Location
  // profile panel (whose data is derived from the address text).
  const hasGeocodableAddress = plotAddress.trim().length >= 6
  const showAddressDerived = hasPlot === true && hasGeocodableAddress

  return (
    <div className="flex flex-col gap-7">
      {/* Phase 7.10f — 30/70 grid on lg+, single column below.
        * When Yes is selected, the grid row clamps to [460, 720]
        * so both columns share the same height — left col has no
        * dead paper at the bottom and the map column has a
        * concrete numeric height for Leaflet to render against
        * (this is what fixed the Bug 1 empty-tiles regression).
        * When Yes is NOT selected the row auto-sizes to left col
        * content so the empty right column doesn't push 460px of
        * blank paper into view. */}
      <div
        className={cn(
          'grid grid-cols-1 gap-8 lg:grid-cols-[30%_70%] lg:gap-0',
          hasPlot === true && 'lg:grid-rows-[minmax(460px,720px)]',
        )}
      >
        {/* LEFT COLUMN — question lane.
          * Generous top/bottom padding plus a calmer right gutter
          * so the H1 wraps word-by-word against the divider. Left
          * padding stays light because the WizardShell already
          * supplies the page-edge gutter. */}
        <div className="flex flex-col gap-7 lg:gap-7 lg:pt-12 lg:pb-10 lg:pl-0 lg:pr-9">
          <header className="flex flex-col gap-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
              {t('wizard.q2.eyebrow')}
            </p>
            <h1
              id="q2-headline"
              className="font-serif text-[clamp(2.5rem,6vw,4rem)] leading-[1.05] -tracking-[0.02em] text-pm-ink lg:text-[44px] lg:leading-[1.05]"
            >
              {t('wizard.q2.h').replace(/[?]\s*$/, '')}
              <span className="text-pm-clay">?</span>
            </h1>
            <p className="font-sans text-[17px] italic leading-relaxed text-pm-ink-mid max-w-[36rem] lg:max-w-[15rem] lg:font-serif">
              {t('wizard.q2.sub')}
            </p>
          </header>

          <div role="radiogroup" aria-labelledby="q2-headline" className="flex gap-3">
            {[true, false].map((value) => {
              const isSelected = hasPlot === value
              return (
                <button
                  key={String(value)}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setPlotChoice(value)
                    if (value === false) setTouched(false)
                  }}
                  className={cn(
                    'group relative inline-flex items-center gap-2 border bg-pm-paper px-6 py-3 font-sans text-[14px] tracking-tight transition-colors duration-soft ease-soft',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper',
                    isSelected
                      ? 'border-pm-clay-soft bg-pm-paper-tint text-pm-ink'
                      : 'border-pm-hair text-pm-ink-mid hover:border-pm-hair-strong hover:text-pm-ink',
                  )}
                >
                  {isSelected ? (
                    <span aria-hidden="true" className="block size-1.5 rounded-full bg-pm-clay" />
                  ) : null}
                  <span>{t(value ? 'wizard.q2.yes' : 'wizard.q2.no')}</span>
                </button>
              )
            })}
          </div>

          <AnimatePresence initial={false}>
            {hasPlot === true ? (
              <m.div
                key="yes-left"
                initial={reduced ? { opacity: 1 } : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="plot-address"
                      className="font-mono text-[11px] uppercase tracking-[0.16em] text-pm-clay"
                    >
                      {t('wizard.q2.addressLabel')}
                    </label>
                    <input
                      id="plot-address"
                      ref={addressInputRef}
                      type="text"
                      inputMode="text"
                      autoComplete="street-address"
                      placeholder={t('wizard.q2.placeholder')}
                      value={plotAddress}
                      onChange={(e) => setPlotAddress(e.target.value)}
                      onBlur={() => setTouched(true)}
                      onKeyDown={handleAddressKey}
                      aria-invalid={showFormatError || undefined}
                      aria-describedby="plot-address-helper"
                      className={cn(
                        'w-full border-0 border-b bg-transparent py-2 font-sans text-[18px] text-pm-ink transition-colors duration-soft placeholder:text-pm-ink-mute2',
                        'focus:outline-none focus:ring-0',
                        showFormatError
                          ? 'border-pm-clay-deep/70 focus:border-pm-clay-deep'
                          : 'border-pm-hair-strong focus:border-pm-clay',
                      )}
                    />
                    <p id="plot-address-helper" className="font-serif text-[13px] italic leading-relaxed text-pm-clay">
                      {t('wizard.q2.helper')}
                    </p>
                    <p className="font-mono text-[11px] leading-relaxed text-pm-ink-mute2">
                      {t('wizard.q2.coverage')}
                    </p>
                  </div>

                  {/* BPlanCheck pill is driven by the resolved-
                    * coords B-Plan lookup, so it only renders once
                    * the address is geocodable. */}
                  {showAddressDerived ? (
                    <BPlanCheck result={bplanResult} isLoading={bplanLoading} />
                  ) : null}

                  {/* Phase 7.10f — same gate as BPlanCheck. The
                    * mapHint guides the user to click an
                    * already-rendered pin location, which only
                    * applies once a pin exists. */}
                  {showAddressDerived ? (
                    <p className="font-serif text-[13px] italic leading-relaxed text-pm-ink-mid">
                      {t('wizard.q2.mapHint')}
                    </p>
                  ) : null}
                </div>
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN — map lane (lg+ adds vertical hairline
          * divider). On lg+ this cell is stretched to the
          * grid-row height (clamped to [460, 720] when Yes is
          * selected, see grid-rows-[minmax(...)] above). On mobile
          * the inner wrapper has an explicit 460px height because
          * there's no row stretch in the single-column layout.
          *
          * The ref captures clicks on map+popover so the
          * document-level mousedown handler can leave them alone
          * (a map click drops a new pin and the auto-open effect
          * re-opens the popover with the new data). */}
        <div ref={rightColumnRef} className="lg:border-l lg:border-pm-hair lg:p-6">
          {showMap ? (
            <div className="relative h-[460px] lg:h-full">
              <Suspense
                fallback={
                  <div className="pm-plotmap-empty">Karte wird geladen…</div>
                }
              >
                <PlotMap
                  address={plotAddress}
                  onAddressChange={setPlotAddress}
                  onCoordinatesResolved={setCoords}
                  onBplanResolved={setBplanResult}
                  onBplanLoadingChange={setBplanLoading}
                />
              </Suspense>
              {/* Phase 7.10g — click-toggle Location profile. Hidden
                * by default; opens via the auto-open effect
                * whenever a pin appears (geocode resolves OR map
                * click drops a pin). Closes on × / Esc / click
                * outside the right column. AnimatePresence keys on
                * coord identity so a new pin smoothly fades in. */}
              <AnimatePresence initial={false}>
                {popoverOpen && coords && showAddressDerived ? (
                  <m.div
                    key={`profile-${coords.lat.toFixed(5)}-${coords.lng.toFixed(5)}`}
                    initial={reduced ? { opacity: 1 } : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    transition={{ duration: reduced ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-6 lg:absolute lg:right-[46px] lg:top-[46px] lg:z-[450] lg:mt-0 lg:w-[248px]"
                  >
                    <PlotSidebar
                      district={district}
                      planningLawDisplay={planningLawDisplay}
                      suggestedName={suggestedName}
                      onClose={() => setPopoverOpen(false)}
                    />
                  </m.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {hasPlot === false ? (
          <m.div
            key="no"
            initial={reduced ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 max-w-[34rem] border border-pm-hair bg-pm-paper-tint p-4">
              <p className="font-sans text-[14px] leading-relaxed text-pm-ink-mid">
                {t('wizard.q2.noPlot')}
              </p>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

      {/* Phase 5 — soft outside-München warning. Renders when the
        * address is structurally valid but the PLZ isn't in the
        * München Stadtgebiet set. The user can either correct the
        * address or click "Trotzdem fortfahren" to acknowledge the
        * reduced data state, which sets outsideMunichConfirmed. */}
      <AnimatePresence initial={false}>
        {showOutsideMunichWarning ? (
          <m.div
            key="outside-munich"
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            aria-live="polite"
            className="max-w-[40rem] border-l-2 border-pm-clay/55 bg-pm-paper-tint py-2 pl-4 pr-3"
          >
            <p className="font-sans text-[13px] leading-relaxed text-pm-ink">
              {t('wizard.q2.outsideMunich.warning')}
            </p>
            <p className="mt-1 font-serif text-[12px] italic leading-relaxed text-pm-ink-mid">
              {t('wizard.q2.outsideMunich.detail')}
            </p>
            {!outsideMunichConfirmed ? (
              <button
                type="button"
                onClick={() => setOutsideMunichConfirmed(true)}
                className="mt-2 inline-flex rounded-sm font-serif text-[12px] italic text-pm-clay underline underline-offset-4 decoration-pm-clay/45 transition-colors hover:text-pm-clay-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
              >
                {t('wizard.q2.outsideMunich.confirmLink')} →
              </button>
            ) : (
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-pm-clay">
                ● {t('wizard.q2.outsideMunich.confirmedNote')}
              </p>
            )}
          </m.div>
        ) : null}
      </AnimatePresence>

      {submitError ? (
        <p
          role="alert"
          className="border-l-2 border-pm-clay-deep/40 py-1 pl-4 font-sans text-[13px] leading-relaxed text-pm-clay-deep"
        >
          {submitError}
        </p>
      ) : null}

      <div className="mt-12 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBackToQ1}
          className="rounded-sm font-serif text-[13px] italic text-pm-clay underline underline-offset-4 decoration-pm-clay/40 transition-colors hover:text-pm-clay-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
        >
          ← {t('wizard.back')}
        </button>

        <div className="flex items-center gap-4">
          <span className="font-mono text-[12px] italic text-pm-ink-mute2">
            {t('wizard.progress.of', { current: 2, total: 2 })}
          </span>
          <button
            type="button"
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
            onClick={handleSubmit}
            className={cn(
              'inline-flex h-11 items-center justify-center px-5 font-sans text-[14px] tracking-tight transition-all duration-soft ease-soft',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper',
              canSubmit
                ? 'bg-pm-clay text-pm-paper hover:bg-pm-clay-deep'
                : 'cursor-not-allowed bg-pm-ink/15 text-pm-paper/80',
            )}
          >
            {showOutsideMunichWarning && !outsideMunichConfirmed
              ? t('wizard.q2.checkAddress')
              : `${t('wizard.q2.submit')} →`}
          </button>
        </div>
      </div>
    </div>
  )
}
