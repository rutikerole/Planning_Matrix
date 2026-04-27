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

    const typeText = (
      target: string,
      setter: (s: string) => void,
      totalMs: number,
    ) =>
      new Promise<void>((resolve) => {
        let i = 0
        const step = totalMs / Math.max(target.length, 1)
        const id = window.setInterval(() => {
          if (cancelled) {
            window.clearInterval(id)
            resolve()
            return
          }
          i += 1
          setter(target.substring(0, i))
          if (i >= target.length) {
            window.clearInterval(id)
            resolve()
          }
        }, step)
        cleanups.push(() => window.clearInterval(id))
      })

    void (async () => {
      while (!cancelled) {
        setPhase('q1')
        setA1('')
        setA2('')

        await wait(950)
        if (cancelled) return

        setPhase('a1')
        await typeText(fullA1, setA1, 1450)
        if (cancelled) return
        await wait(900)
        if (cancelled) return

        setPhase('q2')
        await wait(900)
        if (cancelled) return

        setPhase('a2')
        await typeText(fullA2, setA2, 1850)
        if (cancelled) return
        await wait(800)
        if (cancelled) return

        setPhase('thinking')
        await wait(1900)
        if (cancelled) return

        setPhase('result')
        await wait(5500)
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
      className="relative rounded-xl border border-border-strong/45 bg-paper/85 backdrop-blur-md shadow-[0_4px_14px_-6px_hsl(220_15%_11%/0.08),0_28px_56px_-20px_hsl(220_15%_11%/0.12)] overflow-hidden"
    >
      <BrowserChrome url={t('demo.url')} />

      <div className="px-5 sm:px-7 md:px-9 py-6 md:py-8 min-h-[460px] md:min-h-[500px] flex flex-col gap-4">
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

        {/* Chat — fades to 50% in result phase so result card takes focus */}
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

        {phase === 'thinking' && <ThinkingDots label={t('demo.analyzing')} />}
        {phase === 'result' && <ResultCard />}
      </div>
    </div>
  )
}

/* ── Browser chrome ───────────────────────────────────────────────────── */
function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-strong/40 bg-paper/95 backdrop-blur-sm">
      <div
        aria-hidden="true"
        className="flex gap-1.5 shrink-0"
      >
        <span className="size-2.5 rounded-full bg-ink/12" />
        <span className="size-2.5 rounded-full bg-ink/12" />
        <span className="size-2.5 rounded-full bg-ink/12" />
      </div>
      <div className="flex-1 max-w-[440px] mx-auto rounded-sm bg-muted/55 px-3 py-1.5 text-[12px] text-muted-foreground tabular-nums text-center truncate">
        {url}
      </div>
      <span
        aria-hidden="true"
        className="size-2.5 rounded-full bg-clay/40 shrink-0"
      />
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

/* ── Thinking dots ────────────────────────────────────────────────────── */
function ThinkingDots({ label }: { label: string }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 mt-2"
    >
      <span className="eyebrow text-muted-foreground">{label}</span>
      <span className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="size-1.5 rounded-full bg-clay/70"
            style={{
              animation: 'blink-cursor 1.05s ease-in-out infinite',
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </span>
    </m.div>
  )
}

/* ── Result card ──────────────────────────────────────────────────────── */
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
      <p className="text-[13px] text-muted-foreground mb-5 tabular-nums">
        {t('demo.resultSub')}
      </p>

      <ul className="flex flex-col gap-2.5 mb-6">
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
              className="size-1.5 rounded-full bg-clay shrink-0"
            />
            <span className="leading-tight">{t(item.key)}</span>
            {item.tag && (
              <span className="ml-auto inline-flex items-center text-[10px] tracking-[0.18em] uppercase text-clay border border-clay/55 px-1.5 py-0.5 rounded-sm font-medium">
                {t(item.tag)}
              </span>
            )}
          </m.li>
        ))}
      </ul>

      <div className="flex items-center justify-between pt-4 border-t border-border-strong/30 flex-wrap gap-y-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground shrink-0">
            {t('demo.verifiedBy')}
          </span>
          <span className="font-display text-[16px] text-ink truncate">
            {t('demo.verifiedName')}
          </span>
        </div>
        <span
          aria-label={t('mockups.stampVerified')}
          className="inline-flex items-center gap-1.5 -rotate-[6deg] border-[1.5px] border-clay/70 px-2.5 py-1 text-clay font-medium text-[10px] tracking-[0.22em] uppercase"
        >
          <Check className="size-3 stroke-[3]" aria-hidden="true" />
          {t('mockups.stampVerified')}
        </span>
      </div>
    </m.div>
  )
}
