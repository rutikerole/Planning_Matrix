/**
 * Aerial-view abstract for Planungsrecht (zoning law).
 * Central plot with hatching + clay outline, surrounded by faint context
 * plots, plus floating "§ 34 BauGB / WA / GRZ 0,4 / FH 13m" annotations
 * and a small north compass.
 */
export function DomainAVisual() {
  return (
    <svg
      viewBox="0 0 360 280"
      className="w-full max-w-[440px] h-auto"
      role="img"
      aria-label="Planungsrecht — Aerial diagram of plot, zoning, and context"
    >
      <defs>
        <pattern
          id="hatch-A"
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke="hsl(var(--clay))"
            strokeWidth="0.5"
            strokeOpacity="0.32"
          />
        </pattern>
      </defs>

      {/* Surrounding context plots — faint outlines */}
      <g stroke="hsl(var(--ink))" strokeOpacity="0.16" strokeWidth="0.7" fill="none">
        <rect x="20" y="32" width="55" height="38" />
        <rect x="288" y="22" width="55" height="42" />
        <rect x="14" y="216" width="58" height="46" />
        <rect x="288" y="218" width="55" height="46" />
      </g>

      {/* Implied streets — light dashes */}
      <g
        stroke="hsl(var(--ink))"
        strokeOpacity="0.10"
        strokeWidth="0.6"
        strokeDasharray="2 4"
      >
        <line x1="0" y1="78" x2="360" y2="78" />
        <line x1="0" y1="208" x2="360" y2="208" />
        <line x1="100" y1="0" x2="100" y2="280" />
        <line x1="260" y1="0" x2="260" y2="280" />
      </g>

      {/* Central plot */}
      <rect x="120" y="80" width="120" height="120" fill="url(#hatch-A)" />
      <rect
        x="120"
        y="80"
        width="120"
        height="120"
        fill="none"
        stroke="hsl(var(--clay))"
        strokeOpacity="0.75"
        strokeWidth="1.2"
      />

      {/* Top label */}
      <text
        x="180"
        y="62"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="9"
        fontWeight="500"
        letterSpacing="1.6"
        fill="hsl(var(--muted-foreground))"
      >
        § 34 BauGB
      </text>

      {/* Plot designation — large clay serif */}
      <text
        x="180"
        y="142"
        textAnchor="middle"
        fontFamily="'Instrument Serif', 'New York', Georgia, serif"
        fontStyle="italic"
        fontSize="34"
        fill="hsl(var(--clay))"
      >
        WA
      </text>
      <text
        x="180"
        y="162"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="9"
        letterSpacing="1.5"
        fill="hsl(var(--muted-foreground))"
      >
        Wohngebiet
      </text>

      {/* Bottom annotation */}
      <text
        x="180"
        y="222"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="9"
        fontWeight="500"
        letterSpacing="1.4"
        fill="hsl(var(--muted-foreground))"
      >
        GRZ 0,4 · FH 13 m
      </text>

      {/* North compass — bottom-right corner */}
      <g transform="translate(330, 256)">
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="-14"
          stroke="hsl(var(--ink))"
          strokeOpacity="0.35"
          strokeWidth="0.9"
        />
        <polygon
          points="-3,-9 0,-15 3,-9"
          fill="hsl(var(--ink))"
          fillOpacity="0.35"
        />
        <text
          x="0"
          y="6"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="8"
          fill="hsl(var(--ink))"
          fillOpacity="0.4"
        >
          N
        </text>
      </g>
    </svg>
  )
}
