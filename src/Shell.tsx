import { Suspense, lazy, useEffect } from 'react'
import App from './App'
import GuideOverlay from './components/GuideOverlay'
import { useAppShell } from './lib/appShell'

// finance is a separate world — load it only when switched to, so TriLife stays light
const FinanceApp = lazy(() => import('./apps/finance/FinanceApp'))

const GUIDE_SEEN_KEY = 'fitness-guide-seen'

export default function Shell() {
  const appId = useAppShell((s) => s.appId)
  const guideOpen = useAppShell((s) => s.guideOpen)
  const openGuide = useAppShell((s) => s.openGuide)
  const closeGuide = useAppShell((s) => s.closeGuide)

  // show the walkthrough automatically on the very first visit
  useEffect(() => {
    if (!localStorage.getItem(GUIDE_SEEN_KEY)) openGuide()
  }, [openGuide])

  const close = () => {
    localStorage.setItem(GUIDE_SEEN_KEY, '1')
    closeGuide()
  }

  return (
    <>
      {appId === 'finance' ? (
        <Suspense
          fallback={
            <div className="h-[100dvh] grid place-items-center text-muted text-sm">
              טוען…
            </div>
          }
        >
          <FinanceApp />
        </Suspense>
      ) : (
        <App />
      )}
      <GuideOverlay open={guideOpen} onClose={close} />
    </>
  )
}
