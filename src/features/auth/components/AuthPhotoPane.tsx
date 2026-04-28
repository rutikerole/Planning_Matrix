import { Picture } from '@/components/shared/Picture'

interface Props {
  /** Filename stem in /public/images/. */
  stem: string
  /** Italic-serif phrase laid lower-left over the photo. */
  phrase: string
  /** Phase 3.3 #49 — Inter 9 italic clay/70 caption tab anchored at
   *  the bottom-LEFT of the pane. Treats the photo as a credited image
   *  in an architectural monograph. Optional — no caption renders no tab. */
  caption?: string
}

/**
 * Right-side photo pane for the auth split-screen layout. Hidden below
 * lg breakpoint. Photo sits at full opacity behind a warm-paper
 * gradient overlay (~80% paper top → 20% paper bottom).
 *
 * Phase 3.3 #49: italic-serif phrase moves up to make room for the
 * caption tab at the bottom-left, which prints the photo's credit in
 * Inter 9 italic clay/70 — small, calm, premium.
 */
export function AuthPhotoPane({ stem, phrase, caption }: Props) {
  return (
    <div className="relative hidden lg:block lg:w-1/2 isolate overflow-hidden bg-paper">
      <Picture
        stem={stem}
        alt=""
        loading="lazy"
        sizes="50vw"
        className="absolute inset-0 w-full h-full"
        imgClassName="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--paper)/0.82)] via-[hsl(var(--paper)/0.55)] to-[hsl(var(--paper)/0.20)]"
      />
      {/* Italic-serif phrase, lower-left of the upper half so the
       * caption tab below has room. */}
      <div className="absolute inset-x-0 bottom-16 lg:bottom-20 p-10 lg:p-14 xl:p-20 z-10">
        <p
          className="font-serif italic text-display-3 lg:text-display-2 text-ink/85 max-w-[18ch] leading-[1.05]"
          aria-hidden="true"
        >
          {phrase}
        </p>
      </div>

      {caption && (
        <p
          className="absolute bottom-6 left-10 lg:left-14 xl:left-20 text-[9px] font-serif italic uppercase tracking-[0.18em] text-clay/70 z-10 leading-none"
          aria-hidden="true"
        >
          {caption}
        </p>
      )}
    </div>
  )
}
