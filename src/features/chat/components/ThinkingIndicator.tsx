import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import type { Specialist } from '@/types/projectState'
import { SpecialistTag } from './SpecialistTag'

const ROTATING_LABELS: Record<Specialist, string[]> = {
  moderator: [
    'Das Team berät sich.',
    'Einen Moment, wir stimmen uns ab.',
    'Wir prüfen den nächsten Schritt.',
  ],
  planungsrecht: [
    'Planungsrecht prüft die Festsetzungen.',
    'Wir konsultieren §§ 30 ff. BauGB.',
    'Wir vergleichen mit dem Bebauungsplan.',
  ],
  bauordnungsrecht: [
    'Bauordnung prüft die Verfahrenspflicht.',
    'Wir konsultieren die BayBO.',
    'Wir leiten die Gebäudeklasse ab.',
  ],
  sonstige_vorgaben: [
    'Wir prüfen weitere Vorgaben.',
    'Denkmal- und Naturschutz werden geprüft.',
    'Wir konsultieren kommunale Satzungen.',
  ],
  verfahren: [
    'Wir synthetisieren die Verfahren.',
    'Wir stimmen die Domänen ab.',
  ],
  beteiligte: [
    'Wir leiten Fachplaner ab.',
    'Tragwerks- und Brandschutzbedarf wird geprüft.',
  ],
  synthesizer: [
    'Wir leiten die nächsten drei Schritte ab.',
    'Wir verdichten die Erkenntnisse.',
  ],
}

const FALLBACK_LABEL = 'Das Team berät sich.'

/**
 * Renders while isAssistantThinking is true. Specialist tag (the
 * incoming voice — falls back to moderator) above a clay 11 label
 * that rotates every ~3s through that specialist's repertoire when
 * the response runs longer than 6s. Below: three travel dots cycling.
 * Reduced-motion: static "denkt nach…" text, no dot animation, no
 * rotation.
 */
export function ThinkingIndicator() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const isThinking = useChatStore((s) => s.isAssistantThinking)
  const specialist = useChatStore((s) => s.currentSpecialist) ?? 'moderator'
  const seedLabel = useChatStore((s) => s.currentThinkingLabel)

  const [rotationIndex, setRotationIndex] = useState(0)
  const [tickedRotation, setTickedRotation] = useState(false)

  useEffect(() => {
    if (!isThinking) {
      setRotationIndex(0)
      setTickedRotation(false)
      return
    }
    // Start rotating the label after 6s; every ~3s after that.
    const startTimer = setTimeout(() => setTickedRotation(true), 6_000)
    return () => clearTimeout(startTimer)
  }, [isThinking])

  useEffect(() => {
    if (!isThinking || !tickedRotation || reduced) return
    const tick = setInterval(() => setRotationIndex((i) => i + 1), 3_000)
    return () => clearInterval(tick)
  }, [isThinking, tickedRotation, reduced])

  if (!isThinking) return null

  const labels = ROTATING_LABELS[specialist as Specialist] ?? [FALLBACK_LABEL]
  const label =
    seedLabel ??
    (tickedRotation ? labels[rotationIndex % labels.length] : labels[0])

  return (
    <article className="flex flex-col gap-3" aria-live="polite" aria-busy="true">
      {/* Phase 3.2 — Addition B "Pause moment". A small clay ink-blot
       * fades and grows in over 360ms before the SpecialistTag joins.
       * Reads as the moderator dipping the pen before the table speaks
       * again. Reduced-motion: blot renders instantly at full size, no
       * choreography. */}
      <span
        aria-hidden="true"
        className={
          reduced
            ? 'block size-2 rounded-full bg-clay/45'
            : 'block size-2 rounded-full bg-clay/45 pm-pause-blot'
        }
      />
      <div className={reduced ? '' : 'pm-pause-fade-in'}>
        <SpecialistTag specialist={specialist} isActive />
      </div>
      <p className={`text-[11px] text-clay/85 leading-relaxed italic ${reduced ? '' : 'pm-pause-fade-in pm-pause-delay-160'}`}>
        {label}
      </p>
      {reduced ? (
        <p className="text-[11px] text-clay/65">{t('chat.thinking.staticLabel')}</p>
      ) : (
        <div className="flex items-center gap-1.5 mt-1 pm-pause-fade-in pm-pause-delay-280">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className="block size-1 rounded-full bg-clay/70"
              style={{
                animation: `pmTravelDot 1.4s ease-in-out ${i * 0.18}s infinite`,
              }}
            />
          ))}
        </div>
      )}
      <style>{`
        @keyframes pmTravelDot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50%      { opacity: 1; transform: translateY(-2px); }
        }
        @keyframes pmPauseBlot {
          0%   { transform: scale(0.2); opacity: 0; }
          60%  { transform: scale(1.1); opacity: 0.95; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pmPauseFade {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pm-pause-blot      { animation: pmPauseBlot 360ms cubic-bezier(0.16, 1, 0.3, 1) both; transform-origin: center; }
        .pm-pause-fade-in   { animation: pmPauseFade 320ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .pm-pause-delay-160 { animation-delay: 160ms; }
        .pm-pause-delay-280 { animation-delay: 280ms; }
      `}</style>
    </article>
  )
}
