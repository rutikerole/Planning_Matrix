import { useTranslation } from 'react-i18next'

interface Props {
  className?: string
}

/**
 * Phase 3.2 #42 — atelier-empty illustration.
 *
 * 320×320 axonometric drawing of an architect's drafting table:
 * tracing paper, fountain pen, rolled-up plans, open ledger,
 * coffee cup with a small steam curl. 1px lines in drafting-blue.
 *
 * Per Q1 (locked): the focal animation is the pen drawing a precise
 * 1cm scale line on the paper. 6-second loop, owned inside the SVG
 * via a <style> block. Reduced-motion: pen + line at rest, no glide.
 */
export function AtelierIllustration({ className }: Props) {
  const { t } = useTranslation()
  return (
    <svg
      role="img"
      aria-label={t('chat.empty.illustrationAlt')}
      viewBox="0 0 320 320"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={
        'text-drafting-blue/45 ' +
        (className ?? 'w-[280px] sm:w-[320px] aspect-square')
      }
    >
      <style>{`
        @keyframes pm-pen-trace {
          0%   { stroke-dashoffset: 60; opacity: 0; }
          8%   { opacity: 0.85; }
          35%  { stroke-dashoffset: 0; opacity: 0.85; }
          78%  { stroke-dashoffset: 0; opacity: 0.85; }
          88%  { opacity: 0; stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 60; opacity: 0; }
        }
        @keyframes pm-pen-glide {
          0%   { transform: translate(-46px, -2px); }
          8%   { transform: translate(-46px, -2px); }
          35%  { transform: translate(0, 0); }
          78%  { transform: translate(0, 0); }
          88%  { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(-46px, -2px); opacity: 1; }
        }
        @keyframes pm-steam {
          0%   { opacity: 0; transform: translate(0, 4px); }
          40%  { opacity: 0.55; transform: translate(-1px, 0); }
          80%  { opacity: 0; transform: translate(-2px, -4px); }
          100% { opacity: 0; transform: translate(0, 4px); }
        }
        .pm-scale-line {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: pm-pen-trace 6s ease-in-out infinite;
        }
        .pm-pen-group {
          transform-origin: 215px 192px;
          animation: pm-pen-glide 6s ease-in-out infinite;
        }
        .pm-steam {
          transform-origin: 252px 145px;
          animation: pm-steam 5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pm-scale-line { animation: none; stroke-dashoffset: 0; }
          .pm-pen-group { animation: none; transform: none; }
          .pm-steam     { animation: none; opacity: 0.4; }
        }
      `}</style>

      <g opacity="0.95">
        {/* Drafting table top — axonometric parallelogram */}
        <path d="M 60 220 L 260 220 L 280 160 L 80 160 Z" strokeOpacity="0.95" />
        <path d="M 64 218 L 256 218" strokeOpacity="0.35" />

        {/* Legs + cross brace */}
        <path d="M 60 220 L 58 282" />
        <path d="M 260 220 L 262 282" />
        <path d="M 80 160 L 78 222" strokeOpacity="0.55" />
        <path d="M 280 160 L 282 222" strokeOpacity="0.55" />
        <path d="M 80 195 L 280 195" strokeOpacity="0.35" />

        {/* Tracing paper */}
        <path d="M 124 205 L 215 198 L 222 174 L 132 180 Z" strokeOpacity="0.85" />
        <path d="M 215 198 Q 220 200 222 196" strokeOpacity="0.55" />
        {/* Faint title-block in lower-right of the sheet */}
        <path d="M 188 202 L 213 200 L 215 191 L 190 193 Z" strokeOpacity="0.25" />

        {/* Animated 1 cm scale line */}
        <line
          className="pm-scale-line"
          x1="155"
          y1="192"
          x2="215"
          y2="188"
          strokeOpacity="0.95"
          strokeWidth="1"
        />
        {/* Tick marks at the ends */}
        <path d="M 155 189 L 155 195 M 215 185 L 215 191" strokeOpacity="0.55" />
        {/* "1 cm" label */}
        <text
          x="178"
          y="208"
          fontFamily="Georgia, 'Instrument Serif', serif"
          fontStyle="italic"
          fontSize="7"
          fill="currentColor"
          stroke="none"
          fillOpacity="0.55"
        >
          1 cm
        </text>

        {/* Fountain pen — glides toward end of scale line */}
        <g className="pm-pen-group">
          <path d="M 218 190 L 268 152 L 274 156 L 222 195 Z" strokeOpacity="0.85" />
          <path d="M 250 168 L 256 173" strokeOpacity="0.55" />
          {/* Nib */}
          <path d="M 218 190 L 215 192 L 220 193 Z" strokeOpacity="0.95" />
          {/* Cap clip */}
          <path d="M 268 152 L 271 148 L 274 152" strokeOpacity="0.55" />
        </g>

        {/* Rolled plans, back-left */}
        <g strokeOpacity="0.7">
          <ellipse cx="100" cy="173" rx="4" ry="2.4" />
          <line x1="100" y1="170.6" x2="148" y2="166" />
          <line x1="100" y1="175.4" x2="148" y2="171" />
          <ellipse cx="148" cy="168.5" rx="3.8" ry="2.4" strokeOpacity="0.55" />
          <ellipse cx="98" cy="167" rx="3.6" ry="2.2" />
          <line x1="98" y1="164.8" x2="142" y2="160" />
          <line x1="98" y1="169.2" x2="142" y2="164" />
          <ellipse cx="142" cy="162" rx="3.4" ry="2.2" strokeOpacity="0.55" />
          <ellipse cx="96" cy="178" rx="3" ry="1.8" strokeOpacity="0.55" />
          <line x1="96" y1="176.2" x2="135" y2="172" strokeOpacity="0.55" />
          <line x1="96" y1="179.8" x2="135" y2="175.6" strokeOpacity="0.55" />
        </g>

        {/* Open ledger */}
        <g strokeOpacity="0.65">
          <path d="M 224 184 L 244 181 L 246 168 L 226 171 Z" />
          <path d="M 244 181 L 264 178 L 266 166 L 246 168 Z" />
          <line x1="244" y1="181" x2="246" y2="168" strokeOpacity="0.4" />
          <line x1="229" y1="174" x2="241" y2="172.5" strokeOpacity="0.3" />
          <line x1="229" y1="177" x2="240" y2="175.5" strokeOpacity="0.3" />
          <line x1="229" y1="180" x2="238" y2="178.5" strokeOpacity="0.3" />
        </g>

        {/* Coffee cup */}
        <g strokeOpacity="0.7">
          <ellipse cx="252" cy="160" rx="9" ry="3" strokeOpacity="0.4" />
          <ellipse cx="252" cy="153" rx="5.5" ry="2" />
          <path d="M 246.5 153 L 247.5 159 M 257.5 153 L 256.5 159" />
          <path d="M 247.5 159 Q 252 160.4 256.5 159" />
          <path d="M 257 154 Q 261 154.5 260 158" strokeOpacity="0.55" />
        </g>
        {/* Steam curl */}
        <g className="pm-steam" strokeOpacity="0.5">
          <path d="M 250 148 Q 252 145 250 142 Q 248 139 250 137" />
        </g>

        {/* Ground hairline under the table */}
        <path d="M 64 286 L 280 286" strokeOpacity="0.18" />
      </g>
    </svg>
  )
}
