/**
 * Network diagram for Sonstige Vorgaben (adjacent rules).
 * Central Vorhaben node with six satellite authorities radiating
 * outward — Denkmalschutz, Immissionsschutz, Wasserrecht, Naturschutz,
 * GEG/Energie, Baulast — connected by hairlines.
 */

const CX = 180
const CY = 140
const R = 100

interface Sat {
  angle: number
  label: string
}

const SATELLITES: Sat[] = [
  { angle: 0, label: 'Denkmalschutz' },
  { angle: 60, label: 'Immissionsschutz' },
  { angle: 120, label: 'Wasserrecht' },
  { angle: 180, label: 'Naturschutz' },
  { angle: 240, label: 'GEG / Energie' },
  { angle: 300, label: 'Baulast' },
]

function polar(angle: number): [number, number] {
  const a = (angle * Math.PI) / 180
  return [CX + R * Math.sin(a), CY - R * Math.cos(a)]
}

interface LabelPos {
  x: number
  y: number
  anchor: 'start' | 'middle' | 'end'
}

function labelFor(angle: number, x: number, y: number): LabelPos {
  if (angle === 0) return { x, y: y - 14, anchor: 'middle' }
  if (angle === 180) return { x, y: y + 18, anchor: 'middle' }
  if (angle < 180) return { x: x + 9, y: y + 4, anchor: 'start' }
  return { x: x - 9, y: y + 4, anchor: 'end' }
}

export function DomainCVisual() {
  return (
    <svg
      viewBox="0 0 360 280"
      className="w-full max-w-[440px] h-auto"
      role="img"
      aria-label="Sonstige Vorgaben — Network of adjacent regulatory bodies"
    >
      {/* Connection hairlines from center to each satellite */}
      <g stroke="hsl(var(--ink))" strokeOpacity="0.18" strokeWidth="0.7">
        {SATELLITES.map((s) => {
          const [x, y] = polar(s.angle)
          return (
            <line key={s.angle} x1={CX} y1={CY} x2={x} y2={y} />
          )
        })}
      </g>

      {/* Satellite dots and labels */}
      {SATELLITES.map((s) => {
        const [x, y] = polar(s.angle)
        const lbl = labelFor(s.angle, x, y)
        return (
          <g key={s.angle}>
            <circle
              cx={x}
              cy={y}
              r="3.5"
              fill="hsl(var(--clay))"
              fillOpacity="0.75"
            />
            <circle
              cx={x}
              cy={y}
              r="7"
              fill="none"
              stroke="hsl(var(--clay))"
              strokeOpacity="0.18"
              strokeWidth="0.6"
            />
            <text
              x={lbl.x}
              y={lbl.y}
              textAnchor={lbl.anchor}
              fontFamily="Inter, system-ui, sans-serif"
              fontSize="10"
              fontWeight="500"
              fill="hsl(var(--ink))"
              fillOpacity="0.78"
            >
              {s.label}
            </text>
          </g>
        )
      })}

      {/* Central Vorhaben node */}
      <circle
        cx={CX}
        cy={CY}
        r="22"
        fill="none"
        stroke="hsl(var(--ink))"
        strokeOpacity="0.18"
        strokeWidth="0.7"
        strokeDasharray="2 3"
      />
      <circle
        cx={CX}
        cy={CY}
        r="14"
        fill="hsl(var(--paper))"
        stroke="hsl(var(--ink))"
        strokeOpacity="0.6"
        strokeWidth="1.1"
      />
      <circle cx={CX} cy={CY} r="4" fill="hsl(var(--clay))" />

      {/* Center label */}
      <text
        x={CX}
        y={CY + 38}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="9"
        fontWeight="500"
        letterSpacing="1.6"
        fill="hsl(var(--muted-foreground))"
      >
        VORHABEN
      </text>
    </svg>
  )
}
