/**
 * v3 architectural map overlay — pure SVG layered over Leaflet via
 * `pointer-events: none`. Copied verbatim from the prototype's
 * `<svg class="map-overlay">` block. Includes:
 *   - 4 hatched neighbouring buildings
 *   - Clay-hatched parcel rectangle with corner ticks
 *   - Dimension arrow + "≈ 28,4 m" label
 *   - Two `<pattern>` defs (mapHatch + parcelHatch)
 *
 * The viewBox stretches to the map container; preserveAspectRatio
 * is "none" so the parcel aligns with the visual centre regardless
 * of the wrapper's aspect ratio.
 */
export function PlotMapOverlay() {
  return (
    <svg
      className="absolute inset-0 z-[401] pointer-events-none"
      viewBox="0 0 800 460"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="mapHatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(22,19,16,.55)" strokeWidth="1" />
        </pattern>
        <pattern
          id="parcelHatch"
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="5" stroke="hsl(26 56% 44% / .45)" strokeWidth="1" />
        </pattern>
      </defs>
      {/* neighbouring buildings (hatched) */}
      <rect x="120" y="80" width="180" height="86" fill="url(#mapHatch)" stroke="rgba(22,19,16,.7)" strokeWidth="1" />
      <rect x="540" y="60" width="160" height="100" fill="url(#mapHatch)" stroke="rgba(22,19,16,.7)" strokeWidth="1" />
      <rect x="80" y="280" width="240" height="120" fill="url(#mapHatch)" stroke="rgba(22,19,16,.7)" strokeWidth="1" />
      <rect x="500" y="280" width="220" height="130" fill="url(#mapHatch)" stroke="rgba(22,19,16,.7)" strokeWidth="1" />
      {/* parcel (clay) */}
      <rect x="350" y="190" width="120" height="84" fill="url(#parcelHatch)" stroke="hsl(26 56% 44%)" strokeWidth="2" />
      {/* corner ticks on parcel */}
      <g stroke="hsl(26 56% 44%)" strokeWidth="1.5">
        <line x1="346" y1="190" x2="354" y2="190" />
        <line x1="350" y1="186" x2="350" y2="194" />
        <line x1="466" y1="190" x2="474" y2="190" />
        <line x1="470" y1="186" x2="470" y2="194" />
        <line x1="346" y1="274" x2="354" y2="274" />
        <line x1="350" y1="270" x2="350" y2="278" />
        <line x1="466" y1="274" x2="474" y2="274" />
        <line x1="470" y1="270" x2="470" y2="278" />
      </g>
      {/* dim arrow */}
      <g stroke="hsl(26 56% 44%)" strokeWidth=".8" fill="none">
        <line x1="350" y1="282" x2="470" y2="282" />
        <line x1="350" y1="278" x2="350" y2="286" />
        <line x1="470" y1="278" x2="470" y2="286" />
      </g>
      <text
        x="410"
        y="296"
        textAnchor="middle"
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="hsl(26 60% 30%)"
      >
        ≈ 28,4 m
      </text>
    </svg>
  )
}
