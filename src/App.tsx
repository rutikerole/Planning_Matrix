import { Providers } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { CookieBanner } from '@/features/cookies/CookieBanner'

function App() {
  return (
    <Providers>
      <AppRouter />
      <CookieBanner />
    </Providers>
  )
}

export default App
