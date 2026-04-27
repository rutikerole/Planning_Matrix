import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useInView, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Phase = 'q1' | 'a1' | 'q2' | 'a2' | 'thinking' | 'result'

const PHASE_ORDER: Phase[] = ['q1', 'a1', 'q2', 'a2', 'thinking', 'result']

const RESULT_ITEMS = [
  { key: 'demo.item1', tag: null },
  { key: 'demo.item2', tag: null },
  { key: 'demo.item3', tag: 'demo.annahme' as const },
  { key: 'demo.item4', tag: null },
  { key: 'demo.item5', tag: null },
  { key: 'demo.item6', tag: null },
] as const

export function DemoBrowser() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const [isHovered, setIsHovered] = useState(false)
  const isRunning = !reduced && inView && !isHovered

  const fullA1 = t('demo.a1')
  const fullA2 = t('demo.a2')

  const [phase, setPhase] = useState<Phase>(reduced ? 'result' : 'q1')
  const [a1, setA1] = useState(reduced ? fullA1 : '')
  const [a2, setA2] = useState(reduced ? fullA2 : '')

  useEffect(() => {
    if (!isRunning) return
    let cancelled = false
    const cleanups: Array<() => void> = []

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        if (cancelled) {
          resolve()
          return
        }
        const id = window.setTimeout(() => resolve(), ms)
        cleanups.push(() => window.clearTimeout(id))
      })

    /** Variable-rhythm typing: 50 ± 30 ms per char with a 5 % chance of a
     *  ~200 ms "thinking" pause, simulating an actual person typing. */
    const typeText = (target: string, setter: (s: string) => void) =>
      new Promise<void>((resolve) => {
        let i = 0
        const tick = () => {
          if (cancelled) return resolve()
          i += 1
          setter(target.substring(0, i))
          if (i >= target.length) return resolve()
          const jitter = (Math.random() - 0.5) * 60 // -30 to +30 ms
          const isPause = Math.random() < 0.05
          const delay = isPause ? 220 : 50 + jitter
          const id = window.setTimeout(tick, delay)
          cleanups.push(() => window.clearTimeout(id))
        }
        // First-keystroke delay so the cursor sits idle for a beat first.
        const initial = window.setTimeout(tick, 240)
        cleanups.push(() => window.clearTimeout(initial))
      })

    void (async () => {
      while (!cancelled) {
        setPhase('q1')
        setA1('')
        setA2('')

        await wait(950)
        if (cancelled) return

        setPhase('a1')
        await typeText(fullA1, setA1)
        if (cancelled) return
        await wait(900)
        if (cancelled) return

        setPhase('q2')
        await wait(900)
        if (cancelled) return

        setPhase('a2')
        await typeText(fullA2, setA2)
        if (cancelled) return
        await wait(800)
        if (cancelled) return

        setPhase('thinking')
        await wait(1900)
        if (cancelled) return

        setPhase('result')
        await wait(6000)
      }
    })()

    return () => {
      cancelled = true
      cleanups.forEach((fn) => fn())
    }
  }, [isRunning, fullA1, fullA2])

  const phaseIdx = PHASE_ORDER.indexOf(phase)
  const inResult = phase === 'result'

  return (
    <div
      ref={ref}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative rounded-xl border border-border-strong/45 bg-paper/90 backdrop-blur-md overflow-hidden shadow-[0_8px_18px_-6px_hsl(220_15%_11%/0.10),0_36px_72px_-24px_hsl(220_15%_11%/0.20),0_72px_140px_-40px_hsl(220_15%_11%/0.18)]"
    >
      <BrowserChrome url={t('demo.url')} />

      <div className="px-5 sm:px-7 md:px-9 py-7 md:py-9 min-h-[480px] md:min-h-[540px] flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-1">
          <h4 className="font-display text-[20px] text-ink leading-none">
            {t('demo.projectTitle')}
          </h4>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full bg-clay animate-blink-cursor"
            />
            <span className="eyebrow text-muted-foreground">
              {t('demo.liveLabel')}
            </span>
          </span>
        </div>

        {/* Chat — fades to 50 % in result phase so the result card takes focus */}
        <div
          className={cn(
            'flex flex-col gap-4 transition-opacity duration-calm ease-calm',
            inResult ? 'opacity-50' : 'opacity-100',
          )}
        >
          {phaseIdx >= 0 && <SystemRow text={t('demo.q1')} />}
          {phaseIdx >= 1 && (
            <UserAnswer
              value={a1}
              showCursor={phase === 'a1'}
              done={phase !== 'q1' && phase !== 'a1'}
            />
          )}
          {phaseIdx >= 2 && <SystemRow text={t('demo.q2')} />}
          {phaseIdx >= 3 && (
            <UserAnswer
              value={a2}
              showCursor={phase === 'a2'}
              done={phase !== 'a2' && phase !== 'q2'}
            />
          )}
        </div>

        {phase === 'thinking' && <ThinkingGraph label={t('demo.analyzing')} />}
        {phase === 'result' && <ResultCard />}
      </div>
    </div>
  )
}

/* ── Browser chrome ───────────────────────────────────────────────────── */
function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-strong/40 bg-paper/95 backdrop-blur-sm">
      <div aria-hidden="true" className="flex gap-1.5 shrink-0">
        <span className="size-2.5 rounded-full bg-ink/12" />
        <span className="size-2.5 rounded-full bg-ink/12" />
        <span className="size-2.5 rounded-full bg-ink/12" />
      </div>
      <div className="flex-1 max-w-[440px] mx-auto rounded-sm bg-muted/55 px-3 py-1.5 text-[12px] text-muted-foreground tabular-nums text-center truncate">
        {url}
      </div>
      <span aria-hidden="true" className="size-2.5 rounded-full bg-clay/40 shrink-0" />
    </div>
  )
}

/* ── Chat rows ────────────────────────────────────────────────────────── */
function SystemRow({ text }: { text: string }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3"
    >
      <span
        aria-hidden="true"
        className="mt-1.5 size-1.5 rounded-full bg-clay shrink-0"
      />
      <p className="text-[14px] text-muted-foreground leading-relaxed">{text}</p>
    </m.div>
  )
}

interface UserAnswerProps {
  value: string
  showCursor: boolean
  done: boolean
}

function UserAnswer({ value, showCursor, done }: UserAnswerProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'rounded-sm border bg-background px-3.5 py-2.5 text-[14px] text-ink min-h-[42px] flex items-center transition-colors duration-soft',
        done ? 'border-ink/30' : 'border-ink/20',
      )}
    >
      <span>{value}</span>
      {showCursor && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block w-[1.5px] h-[15px] bg-ink animate-blink-cursor align-middle"
        />
      )}
    </m.div>
  )
}

/* ── Thinking graph ───────────────────────────────────────────────────── *
 * Three satellite nodes connected to a central node. Each satellite
 * pulses to full opacity in sequence, suggesting "the system is reasoning
 * across multiple inputs," not a generic loading dot.
 */
function ThinkingGraph({ label }: { label: string }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 mt-2"
    >
      <span className="eyebrow text-muted-foreground">{label}</span>
      <svg
        viewBox="0 0 64 22"
        className="w-16 h-[22px]"
        aria-hidden="true"
      >
        {/* edges */}
        <line x1="8" y1="6" x2="32" y2="11" stroke="hsl(var(--clay))" strokeOpacity="0.4" strokeWidth="0.6" />
        <line x1="56" y1="6" x2="32" y2="11" stroke="hsl(var(--clay))" strokeOpacity="0.4" strokeWidth="0.6" />
        <line x1="32" y1="20" x2="32" y2="11" stroke="hsl(var(--clay))" strokeOpacity="0.4" strokeWidth="0.6" />
        {/* center */}
        <circle cx="32" cy="11" r="2.2" fill="hsl(var(--clay))" />
        {/* satellites */}
        {[
          { x: 8, y: 6 },
          { x: 56, y: 6 },
          { x: 32, y: 20 },
        ].map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1.8"
            fill="hsl(var(--clay))"
            style={{
              animation: 'blink-cursor 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.35}s`,
            }}
          />
        ))}
      </svg>
    </m.div>
  )
}

/* ── Result card ──────────────────────────────────────────────────────── *
 * Two-column grid inside the card:
 *   left  — 6 permit recommendations, each appearing 0.18 s apart.
 *   right — a clay-bordered "Grundstück" frame containing 6 plot markers,
 *           each lighting up at the same delay as its corresponding item,
 *           with a small trail-line drawing in alongside it. The visual
 *           equivalent of "this rule comes from this part of the plot."
 */
function ResultCard() {
  const { t } = useTranslation()
  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mt-2 rounded-md border border-border-strong/45 bg-card p-5 md:p-6"
    >
      <p className="eyebrow text-clay mb-2 inline-flex items-center">
        <span className="accent-dot" aria-hidden="true" />
        {t('demo.eyebrow')}
      </p>
      <h5 className="font-display text-[22px] text-ink leading-tight mb-1">
        {t('demo.resultTitle')}
      </h5>
      <p className="text-[13px] text-muted-foreground mb-6 tabular-nums">
        {t('demo.resultSub')}
      </p>

      <div className="grid grid-cols-12 gap-4 md:gap-5 mb-6">
        {/* Items column */}
        <ul className="col-span-12 sm:col-span-8 flex flex-col gap-2.5">
          {RESULT_ITEMS.map((item, i) => (
            <m.li
              key={item.key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                delay: i * 0.18,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex items-center gap-3 text-[14px] text-ink/85"
            >
              <span
                aria-hidden="true"
                className="size-4 rounded-full bg-clay/15 inline-flex items-center justify-center shrink-0"
              >
                <Check className="size-2.5 text-clay stroke-[3]" />
              </span>
              <span className="leading-tight">{t(item.key)}</span>
              {item.tag && (
                <span className="ml-auto inline-flex items-center text-[10px] tracking-[0.18em] uppercase text-clay border border-clay/55 px-1.5 py-0.5 rounded-sm font-medium">
                  {t(item.tag)}
                </span>
              )}
            </m.li>
          ))}
        </ul>

        {/* Plot column — markers light up as items appear, visually
            tying each recommendation back to a position on the plot */}
        <div className="hidden sm:flex sm:col-span-4 items-stretch">
          <PlotColumn />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border-strong/30 flex-wrap gap-y-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground shrink-0">
            {t('demo.verifiedBy')}
          </span>
          <span className="font-display text-[16px] text-ink truncate">
            {t('demo.verifiedName')}
          </span>
        </div>
        <m.span
          aria-label={t('mockups.stampVerified')}
          initial={{ opacity: 0, scale: 0.9, rotate: -6 }}
          animate={{ opacity: 1, scale: [0.9, 1.06, 1], rotate: -6 }}
          transition={{
            duration: 0.55,
            delay: 1.45,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.65, 1],
          }}
          className="inline-flex items-center gap-1.5 border-[1.5px] border-clay/70 px-2.5 py-1 text-clay font-medium text-[10px] tracking-[0.22em] uppercase"
        >
          <Check className="size-3 stroke-[3]" aria-hidden="true" />
          {t('mockups.stampVerified')}
        </m.span>
      </div>
    </m.div>
  )
}

/**
 * Plot column — six markers framed by a clay outline (the plot footprint).
 * Each row's hairline trail and dot animate in at 0.18 s intervals,
 * synced with the items list on the left so the eye reads "this item
 * → this point on the plot."
 */
function PlotColumn() {
  return (
    <div className="relative w-full flex">
      {/* faint plot frame */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-[64%] border border-clay/35 rounded-sm bg-clay/[0.025]"
      />

      {/* eyebrow on top of plot */}
      <span
        aria-hidden="true"
        className="absolute -top-3 right-2 text-[9px] tracking-[0.16em] uppercase font-medium text-clay/80 bg-card px-1"
      >
        Grundstück
      </span>

      {/* 6 marker rows aligned with item list */}
      <ul className="relative w-full flex flex-col justify-around py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-2 justify-end pr-2"
          >
            <m.span
              aria-hidden="true"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.05 + i * 0.18,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{ transformOrigin: 'left center' }}
              className="block h-px w-5 bg-clay/55"
            />
            <m.span
              aria-hidden="true"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.3,
                delay: 0.18 + i * 0.18,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="size-1.5 rounded-full bg-clay shrink-0"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
