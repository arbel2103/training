import { Suspense, lazy } from 'react'
import App from './App'
import { useAppShell } from './lib/appShell'

// finance is a separate world — load it only when switched to, so TriLife stays light
const FinanceApp = lazy(() => import('./apps/finance/FinanceApp'))

export default function Shell() {
  const appId = useAppShell((s) => s.appId)

  if (appId === 'finance') {
    return (
      <Suspense
        fallback={
          <div className="h-[100dvh] grid place-items-center text-muted text-sm">טוען…</div>
        }
      >
        <FinanceApp />
      </Suspense>
    )
  }
  return <App />
}
