import { Suspense, lazy, useEffect } from 'react'
import App from './App'
import GuideOverlay from './components/GuideOverlay'
import { useAppShell } from './lib/appShell'

// each mini-app is a separate world — loaded only when switched to, so TriLife stays light
const FinanceApp = lazy(() => import('./apps/finance/FinanceApp'))
const HabitsApp = lazy(() => import('./apps/habits/HabitsApp'))

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
      {appId === 'tri' ? (
        <App />
      ) : (
        <Suspense
          fallback={
            <div className="h-[100dvh] grid place-items-center text-muted text-sm">
              טוען…
            </div>
          }
        >
          {appId === 'habits' ? <HabitsApp /> : <FinanceApp />}
        </Suspense>
      )}
      <GuideOverlay open={guideOpen} onClose={close} />
    </>
  )
}
