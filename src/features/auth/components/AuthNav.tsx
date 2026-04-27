import { Container } from '@/components/shared/Container'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'

/**
 * Simplified nav for auth pages. Logo on the left, language switcher
 * on the right — no other links, since we're already inside the auth
 * flow and the primary CTA / sign-in link belong on the form itself.
 */
export function AuthNav() {
  return (
    <header className="absolute top-0 inset-x-0 z-20">
      <Container className="flex h-16 md:h-[72px] items-center justify-between">
        <Wordmark />
        <LanguageSwitcher />
      </Container>
    </header>
  )
}
