/**
 * Building elevation/section for Bauordnungsrecht.
 * Gabled silhouette with vertical measurement spine on the left
 * (±0 / 7 m / 13 m), setback indicators at the base, and a windowed
 * front face. Reads as an architect's section drawing.
 */
export function DomainBVisual() {
  return (
    <svg
      viewBox="0 0 360 280"
      className="w-full max-w-[440px] h-auto"
      role="img"
      aria-label="Bauordnungsrecht — Building section with measurements"
    >
      {/* Top label */}
      <text
        x="180"
        y="36"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="9"
        fontWeight="500"
        letterSpacing="1.6"
        fill="hsl(var(--muted-foreground))"
      >
        SCHNITT · LBO THÜRINGEN
      </text>

      {/* Ground line + dashed extension */}
      <line
        x1="20"
        y1="220"
        x2="340"
        y2="220"
        stroke="hsl(var(--ink))"
        strokeOpacity="0.32"
        strokeWidth="1"
      />
      <line
        x1="20"
        y1="225"
        x2="340"
        y2="225"
        stroke="hsl(var(--ink))"
        strokeOpacity="0.14"
        strokeWidth="0.5"
        strokeDasharray="2 3"
      />

      {/* Building silhouette (gabled) */}
      <path
        d="M 130 220 L 130 130 L 200 80 L 270 130 L 270 220"
        fill="none"
        stroke="hsl(var(--ink))"
        strokeWidth="1.4"
        strokeLinejoin="miter"
      />

      {/* Door */}
      <path
        d="M 188 220 L 188 184 L 212 184 L 212 220"
        fill="none"
        stroke="hsl(var(--ink))"
        strokeWidth="1"
      />

      {/* Windows */}
      <g
        fill="none"
        stroke="hsl(var(--ink))"
        strokeOpacity="0.5"
        strokeWidth="0.85"
      >
        <rect x="142" y="148" width="22" height="22" />
        <rect x="236" y="148" width="22" height="22" />
        <line x1="153" y1="148" x2="153" y2="170" />
        <line x1="247" y1="148" x2="247" y2="170" />
      </g>

      {/* Vertical measurement spine on the left */}
      <line
        x1="100"
        y1="80"
        x2="100"
        y2="220"
        stroke="hsl(var(--clay))"
        strokeOpacity="0.6"
        strokeWidth="0.8"
      />
      {/* Tick marks */}
      <g stroke="hsl(var(--clay))" strokeOpacity="0.7" strokeWidth="0.8">
        <line x1="94" y1="80" x2="106" y2="80" />
        <line x1="94" y1="130" x2="106" y2="130" />
        <line x1="94" y1="220" x2="106" y2="220" />
      </g>
      {/* Measurement labels */}
      <g fontFamily="Inter, system-ui, sans-serif" fontSize="9" fontWeight="500">
        <text
          x="88"
          y="84"
          textAnchor="end"
          fill="hsl(var(--clay))"
        >
          13 m
        </text>
        <text
          x="88"
          y="134"
          textAnchor="end"
          fill="hsl(var(--clay))"
        >
          7 m
        </text>
        <text
          x="88"
          y="224"
          textAnchor="end"
          fill="hsl(var(--muted-foreground))"
        >
          ±0
        </text>
      </g>

      {/* Setback indicators (Abstandsflächen) */}
      <g
        stroke="hsl(var(--clay))"
        strokeOpacity="0.55"
        strokeWidth="0.7"
        strokeDasharray="2 2"
      >
        <line x1="100" y1="244" x2="130" y2="244" />
        <line x1="270" y1="244" x2="300" y2="244" />
      </g>
      <g
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="8"
        fill="hsl(var(--muted-foreground))"
      >
        <text x="115" y="258" textAnchor="middle">
          3 m
        </text>
        <text x="285" y="258" textAnchor="middle">
          3 m
        </text>
      </g>

      {/* Right-side annotation column */}
      <g
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="9"
        fill="hsl(var(--muted-foreground))"
      >
        <text x="290" y="96">
          Brandschutz
        </text>
        <text x="290" y="112" fillOpacity="0.7">
          F30
        </text>
        <text x="290" y="156">
          Stellplätze
        </text>
        <text x="290" y="172" fillOpacity="0.7">
          1 / WE
        </text>
      </g>
    </svg>
  )
}
