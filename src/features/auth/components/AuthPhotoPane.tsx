import { Picture } from '@/components/shared/Picture'

interface Props {
  /** Filename stem in /public/images/. */
  stem: string
  /** Italic-serif phrase laid lower-left over the photo. */
  phrase: string
}

/**
 * Right-side photo pane for the auth split-screen layout. Hidden below
 * lg breakpoint. Photo sits at full opacity behind a warm-paper
 * gradient overlay (~80 % paper top → 20 % paper bottom) — keeps the
 * photo present without competing with the form on the left.
 *
 * Single italic-serif phrase positioned lower-left, ~30 % width,
 * pulls a callback line from the landing page so the auth surface
 * feels like a continuation, not a different room.
 */
export function AuthPhotoPane({ stem, phrase }: Props) {
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
      {/* Warm-paper gradient overlay — heaviest at top, easing toward
          bottom-left where the italic-serif phrase lives, so the
          phrase is legible while the lower-right of the photo breathes. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--paper)/0.82)] via-[hsl(var(--paper)/0.55)] to-[hsl(var(--paper)/0.20)]"
      />
      {/* Single italic-serif phrase, lower-left */}
      <div className="absolute inset-x-0 bottom-0 p-10 lg:p-14 xl:p-20 z-10">
        <p
          className="font-serif italic text-display-3 lg:text-display-2 text-ink/85 max-w-[18ch] leading-[1.05]"
          aria-hidden="true"
        >
          {phrase}
        </p>
      </div>
    </div>
  )
}
