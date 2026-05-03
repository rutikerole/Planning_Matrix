import type { Intent } from './selectTemplate'

/**
 * 8 architectural sketches for the v3 Q1 Intent grid. Each SVG has
 * two stroke groups:
 *   • `.pri`  — primary stroke, always visible (ink-soft, 1.4)
 *   • `.sec`  — secondary stroke, hidden by default; draws on hover
 *               or when the chip is selected via stroke-dasharray
 *               transitions in `sketches.css`
 *
 * Copied VERBATIM from prototypes/makeover-v3.html (the prototype's
 * `sketches[]` JS array). Do not redraw — each is hand-tuned.
 */
export const SKETCH_SVGS: Record<Intent, string> = {
  neubau_einfamilienhaus: `
    <svg viewBox="0 0 120 80">
      <line class="pri pri-d" x1="14" y1="68" x2="106" y2="68"/>
      <path class="pri" d="M34 68 L34 38 L60 22 L86 38 L86 68 Z"/>
      <rect class="pri" x="56" y="50" width="10" height="18"/>
      <rect class="pri" x="42" y="42" width="8" height="8"/>
      <rect class="pri" x="72" y="42" width="8" height="8"/>
      <g class="sec">
        <line x1="34" y1="76" x2="86" y2="76"/>
        <line x1="34" y1="73" x2="34" y2="79"/>
        <line x1="86" y1="73" x2="86" y2="79"/>
        <text x="60" y="85" text-anchor="middle">8 m</text>
      </g>
    </svg>`,
  neubau_mehrfamilienhaus: `
    <svg viewBox="0 0 120 80">
      <line class="pri pri-d" x1="14" y1="68" x2="106" y2="68"/>
      <rect class="pri" x="36" y="20" width="48" height="48"/>
      <rect class="pri" x="42" y="26" width="6" height="6"/>
      <rect class="pri" x="52" y="26" width="6" height="6"/>
      <rect class="pri" x="62" y="26" width="6" height="6"/>
      <rect class="pri" x="72" y="26" width="6" height="6"/>
      <rect class="pri" x="42" y="38" width="6" height="6"/>
      <rect class="pri" x="52" y="38" width="6" height="6"/>
      <rect class="pri" x="62" y="38" width="6" height="6"/>
      <rect class="pri" x="72" y="38" width="6" height="6"/>
      <rect class="pri" x="42" y="50" width="6" height="6"/>
      <rect class="pri" x="52" y="50" width="6" height="6"/>
      <rect class="pri" x="62" y="50" width="6" height="6"/>
      <rect class="pri" x="72" y="50" width="6" height="6"/>
      <g class="sec">
        <line x1="28" y1="20" x2="36" y2="20"/>
        <line x1="28" y1="44" x2="36" y2="44"/>
        <line x1="28" y1="68" x2="36" y2="68"/>
        <text x="22" y="46" text-anchor="middle">3 OG</text>
      </g>
    </svg>`,
  sanierung: `
    <svg viewBox="0 0 120 80">
      <line class="pri pri-d" x1="14" y1="68" x2="106" y2="68"/>
      <path class="pri pri-d" d="M30 68 L30 36 L60 20 L90 36 L90 68 Z"/>
      <g class="sec">
        <rect class="sec-fill" x="34" y="40" width="52" height="28"/>
        <path d="M34 40 L86 40 M34 50 L86 50 M34 60 L86 60"/>
        <text x="60" y="32" text-anchor="middle">Erneuerung</text>
      </g>
    </svg>`,
  umnutzung: `
    <svg viewBox="0 0 120 80">
      <line class="pri pri-d" x1="14" y1="68" x2="106" y2="68"/>
      <!-- v3 fix #4 — dashed silhouette = existing structure changing use. -->
      <path class="pri pri-d" d="M34 68 L34 36 L60 20 L86 36 L86 68 Z"/>
      <g class="sec">
        <path d="M50 56 A12 12 0 1 1 70 56" />
        <path d="M70 56 L66 53 M70 56 L74 52" />
        <text x="60" y="78" text-anchor="middle">Büro → Wohnen</text>
      </g>
    </svg>`,
  abbruch: `
    <svg viewBox="0 0 120 80">
      <line class="pri pri-d" x1="14" y1="68" x2="106" y2="68"/>
      <path class="pri pri-d" d="M34 68 L34 36 L60 20 L86 36 L86 68 Z"/>
      <g class="sec">
        <line x1="30" y1="22" x2="90" y2="68"/>
        <line x1="36" y1="60" x2="46" y2="60"/>
        <line x1="58" y1="62" x2="68" y2="62"/>
        <text x="60" y="78" text-anchor="middle">Rückbau</text>
      </g>
    </svg>`,
  aufstockung: `
    <svg viewBox="0 0 120 80">
      <line class="pri pri-d" x1="14" y1="68" x2="106" y2="68"/>
      <rect class="pri" x="34" y="40" width="52" height="28"/>
      <rect class="pri" x="42" y="48" width="6" height="6"/>
      <rect class="pri" x="54" y="48" width="6" height="6"/>
      <rect class="pri" x="66" y="48" width="6" height="6"/>
      <rect class="pri" x="74" y="48" width="6" height="6"/>
      <g class="sec">
        <rect class="sec-fill" x="34" y="22" width="52" height="18"/>
        <path d="M34 22 L34 40 M86 22 L86 40 M34 22 L86 22"/>
        <path d="M60 14 L60 19 M58 17 L60 19 L62 17"/>
        <text x="60" y="34" text-anchor="middle">+1 Geschoss</text>
      </g>
    </svg>`,
  anbau: `
    <svg viewBox="0 0 120 80">
      <line class="pri pri-d" x1="14" y1="68" x2="106" y2="68"/>
      <path class="pri" d="M34 68 L34 36 L60 20 L86 36 L86 68 Z"/>
      <g class="sec">
        <rect class="sec-fill" x="86" y="44" width="22" height="24"/>
        <path d="M86 44 L108 44 M108 44 L108 68 M86 68 L108 68"/>
        <path d="M76 56 L82 56 M80 54 L82 56 L80 58"/>
        <text x="97" y="80" text-anchor="middle">Erweiterung</text>
      </g>
    </svg>`,
  sonstige: `
    <svg viewBox="0 0 120 80">
      <line class="pri pri-d" x1="14" y1="68" x2="106" y2="68"/>
      <path class="pri pri-d" d="M34 68 L34 38 L60 22 L86 38 L86 68 Z"/>
      <g class="sec">
        <circle cx="60" cy="48" r="3"/>
        <circle cx="50" cy="48" r="2"/>
        <circle cx="70" cy="48" r="2"/>
        <text x="60" y="78" text-anchor="middle">flexibel</text>
      </g>
    </svg>`,
}
