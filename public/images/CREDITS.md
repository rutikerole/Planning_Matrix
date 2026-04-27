# Image Credits

All photographs are licensed for commercial use without attribution required (Unsplash License or Pexels License). Attributing voluntarily as good practice.

| File stem | Subject | Source | Photographer | License |
|---|---|---|---|---|
| `hero-altbau` | Berlin Altbau balconies, golden hour | [Pexels 17882001](https://www.pexels.com/photo/balconies-of-old-tenement-17882001/) | Ömer Gülen | [Pexels License](https://www.pexels.com/license/) |
| `problem-scaffolding` | Scaffolding-clad building at sunset | [Unsplash 4nDEdZZjaQQ](https://unsplash.com/photos/4nDEdZZjaQQ) | Cazper Vestblom | [Unsplash License](https://unsplash.com/license) |
| `threestep-blueprint` | 1893 architectural blueprint | [Unsplash sAlWjm2huck](https://unsplash.com/photos/sAlWjm2huck) | Peter Joseph Weber / Art Institute of Chicago | [Unsplash License](https://unsplash.com/license) |
| `domain-a-aerial` | Berlin aerial sunrise, urban grid | [Pexels 18909542](https://www.pexels.com/photo/aerial-view-of-berlin-at-sunrise-18909542/) | Naro K | [Pexels License](https://www.pexels.com/license/) |
| `domain-b-facade` | Industrial facade with geometric shadows | [Unsplash Jye5NmDCwGU](https://unsplash.com/photos/Jye5NmDCwGU) | Alex Lvrs | [Unsplash License](https://unsplash.com/license) |
| `domain-c-heritage` | Historic building under restoration with scaffolding | [Unsplash c6D7fHnQ-2U](https://unsplash.com/photos/c6D7fHnQ-2U) | Dan Begel | [Unsplash License](https://unsplash.com/license) |
| `trust-pen` | Fountain pen on paper, cinematic close-up | [Pexels 30633929](https://www.pexels.com/photo/close-up-of-fountain-pen-writing-on-paper-30633929/) | seymasungr | [Pexels License](https://www.pexels.com/license/) |
| `finalcta-windows` | Berlin building, lit windows at night | [Unsplash rEVhEQOy5QA](https://unsplash.com/photos/rEVhEQOy5QA) | Paul Lichtblau | [Unsplash License](https://unsplash.com/license) |

## Pipeline

Sources live in `public/images/source/` (committed for reproducibility).
Optimised variants regenerate via `npm run images` → AVIF (q 50) + WebP
(q 80) + mozJPEG (q 82), each at 1600w (desktop) and 900w (mobile).

Components consume via `<picture>` with `<source type="image/avif">` →
`<source type="image/webp">` → `<img>` JPG fallback.

To swap a photo: replace the source JPG (keep the same stem name),
re-run `npm run images`, commit. Sources can also be re-fetched via
`npm run images:download` if URLs change.
