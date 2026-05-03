import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { SectionHead, FadeRise } from './shared'
import { CountUp } from './CountUp'
import { addresses, type Address } from '../lib/addresses'
import { useReducedMotionPref } from '../hooks/useReducedMotionPref'

const EASE = [0.16, 1, 0.3, 1] as const

export function Analyzer() {
  const { t, i18n } = useTranslation()
  const [activeId, setActiveId] = useState(addresses[0].id)
  const active = useMemo(
    () => addresses.find((a) => a.id === activeId)!,
    [activeId],
  )
  const lang: 'de' | 'en' = i18n.language.startsWith('en') ? 'en' : 'de'
  const details = lang === 'en' ? active.details_en : active.details_de

  return (
    <section id="analyzer" className="bg-pm-paper py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHead
          eyebrow={t('landing.analyzer.eyebrow')}
          l1={t('landing.analyzer.h.l1')}
          l2={t('landing.analyzer.h.l2')}
          sub={t('landing.analyzer.sub')}
          align="left"
          maxWidth="max-w-3xl"
        />

        <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-[280px_1fr]">
          {/* Address list */}
          <FadeRise>
            <div>
              <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
                {t('landing.analyzer.list.label')}
              </div>
              <div className="flex flex-col gap-2">
                {addresses.map((a) => {
                  const isActive = a.id === activeId
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setActiveId(a.id)}
                      aria-pressed={isActive}
                      className={`border p-4 text-left transition-colors ${
                        isActive
                          ? 'border-pm-clay bg-pm-paper-tint'
                          : 'border-pm-hair hover:bg-pm-paper-soft'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-pm-clay animate-pm-pulse-clay"
                            aria-hidden
                          />
                        ) : null}
                        <span
                          className={`font-sans text-[14px] font-medium ${
                            isActive ? 'text-pm-clay' : 'text-pm-ink'
                          }`}
                        >
                          {a.line1}
                        </span>
                      </div>
                      <div
                        className={`mt-1 font-sans text-[12px] ${
                          isActive ? 'text-pm-clay/80' : 'text-pm-ink-mid'
                        }`}
                      >
                        {a.line2}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </FadeRise>

          {/* Output panel */}
          <FadeRise delay={0.1}>
            <div className="border border-pm-hair bg-pm-paper-tint p-6 lg:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-pm-ink-mute2">
                    FLST.
                  </span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={active.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="font-mono text-[12px] text-pm-clay"
                    >
                      {active.flst.replace('FLST. ', '')}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-pm-sage">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-pm-sage animate-pm-blink-soft"
                    aria-hidden
                  />
                  {t('landing.analyzer.out.live')}
                </div>
              </div>

              <ParcelSVG addr={active} />

              {/* Stats grid */}
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat
                  label={t('landing.analyzer.stats.proc')}
                  textValue={active.stats.proc}
                  addrKey={active.id}
                />
                <Stat
                  label={t('landing.analyzer.stats.docs')}
                  numValue={active.stats.docs}
                  addrKey={active.id}
                />
                <Stat
                  label={t('landing.analyzer.stats.roles')}
                  numValue={active.stats.roles}
                  addrKey={active.id}
                />
                <Stat
                  label={t('landing.analyzer.stats.weeks')}
                  numValue={active.stats.weeks}
                  addrKey={active.id}
                />
              </div>

              {/* Detail rows */}
              <div className="mt-8">
                <DetailRow
                  label={t('landing.analyzer.details.planungsrecht')}
                  value={details.planungsrecht}
                />
                <DetailRow
                  label={t('landing.analyzer.details.bauordnung')}
                  value={details.bauordnung}
                />
                <DetailRow
                  label={t('landing.analyzer.details.sonstige')}
                  value={details.sonstige}
                />
                <DetailRow
                  label={t('landing.analyzer.details.gebaeudeklasse')}
                  value={details.gebaeudeklasse}
                />
              </div>
            </div>
          </FadeRise>
        </div>
      </div>
    </section>
  )
}

function ParcelSVG({ addr }: { addr: Address }) {
  const reduce = useReducedMotionPref()
  return (
    <svg
      viewBox="0 0 600 360"
      className="h-auto w-full"
      role="img"
      aria-label={`Parzellengrafik ${addr.line1}, ${addr.line2}`}
    >
      <defs>
        <pattern id="pm-parcel-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="rgba(22,19,16,0.06)"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="600" height="360" fill="url(#pm-parcel-grid)" />

      {/* Plot outline (animated stroke draw) */}
      <motion.path
        key={`plot-${addr.id}`}
        d={`M ${addr.plot.x} ${addr.plot.y} h ${addr.plot.w} v ${addr.plot.h} h ${-addr.plot.w} z`}
        fill="none"
        stroke="var(--pm-clay)"
        strokeWidth={1.5}
        initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 0.8, ease: EASE }}
      />

      {/* Buildable inset (fade) */}
      <motion.rect
        key={`build-${addr.id}`}
        x={addr.buildable.x}
        y={addr.buildable.y}
        width={addr.buildable.w}
        height={addr.buildable.h}
        fill="var(--pm-clay-tint)"
        fillOpacity={0.45}
        stroke="var(--pm-clay-deep)"
        strokeWidth={0.8}
        strokeDasharray="3 3"
        initial={reduce ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.45 }}
      />

      {/* Dimension lines */}
      <line
        x1={addr.plot.x}
        y1={addr.plot.y - 14}
        x2={addr.plot.x + addr.plot.w}
        y2={addr.plot.y - 14}
        stroke="var(--pm-ink-mid)"
        strokeWidth={0.5}
      />
      <text
        x={addr.plot.x + addr.plot.w / 2}
        y={addr.plot.y - 20}
        textAnchor="middle"
        fontFamily="JetBrains Mono, monospace"
        fontSize={11}
        fill="var(--pm-ink-mid)"
      >
        {addr.dimWidthLabel}
      </text>
      <line
        x1={addr.plot.x - 14}
        y1={addr.plot.y}
        x2={addr.plot.x - 14}
        y2={addr.plot.y + addr.plot.h}
        stroke="var(--pm-ink-mid)"
        strokeWidth={0.5}
      />
      <text
        x={addr.plot.x - 22}
        y={addr.plot.y + addr.plot.h / 2}
        textAnchor="middle"
        fontFamily="JetBrains Mono, monospace"
        fontSize={11}
        fill="var(--pm-ink-mid)"
        transform={`rotate(-90 ${addr.plot.x - 22} ${addr.plot.y + addr.plot.h / 2})`}
      >
        {addr.dimHeightLabel}
      </text>

      {/* North arrow */}
      <g transform="translate(560 30)">
        <line x1="0" y1="-12" x2="0" y2="12" stroke="var(--pm-ink-mid)" strokeWidth="0.5" />
        <polygon points="0,-12 -4,-4 4,-4" fill="var(--pm-ink-mid)" />
        <text
          x="0"
          y="22"
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9"
          fill="var(--pm-ink-mute2)"
        >
          N
        </text>
      </g>
    </svg>
  )
}

function Stat({
  label,
  numValue,
  textValue,
  addrKey,
}: {
  label: string
  numValue?: number
  textValue?: string
  addrKey: string
}) {
  return (
    <div className="border-l-2 border-pm-hair pl-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${addrKey}-${textValue ?? numValue}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-none text-pm-clay"
        >
          {textValue !== undefined ? (
            textValue
          ) : (
            <CountUp
              from={0}
              to={numValue!}
              duration={1500}
              triggerKey={addrKey}
            />
          )}
        </motion.div>
      </AnimatePresence>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-wide text-pm-ink-mid">
        {label}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-pm-hair py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-pm-ink-mid">
        {label}
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="text-right font-sans text-[13px] text-pm-ink-mid"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
