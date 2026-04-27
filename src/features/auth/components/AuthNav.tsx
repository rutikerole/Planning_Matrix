import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'

/**
 * Stripped-down auth header. On lg+ it's constrained to the form pane
 * (left half) so the wordmark and language switcher bracket the form
 * instead of floating across the photo pane on the right.
 *
 * Padding mirrors the AuthShell <main> exactly so the wordmark sits
 * on the same vertical line as the form's left edge.
 */
export function AuthNav() {
  return (
    <header className="absolute top-0 left-0 right-0 lg:right-1/2 z-20">
      <div className="flex h-16 md:h-[72px] items-center justify-between px-6 sm:px-10 lg:px-14 xl:px-20">
        <Wordmark />
        <LanguageSwitcher />
      </div>
    </header>
  )
}
