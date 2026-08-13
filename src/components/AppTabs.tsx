import { useAppShell, type AppId } from '../lib/appShell'
import Icon, { type IconName } from './ui/Icon'

interface Tab {
  id: AppId
  name: string
  icon: IconName
}

// order is right → left because the app is RTL: the first item renders on the
// right. So this array reads habits (right), TriLife (centre), finance (left).
const TABS: Tab[] = [
  { id: 'habits', name: 'הרגלים', icon: 'checkCircle' },
  { id: 'tri', name: 'TriLife', icon: 'run' },
  { id: 'finance', name: 'פיננסים', icon: 'wallet' },
]

/**
 * A slim strip across the very top that switches between the mini-apps with a
 * single tap. Split into equal segments, one per app, so it always fills the
 * width whatever the app count. Deliberately not swipeable — horizontal swipes
 * belong to the page scroller inside each app — and kept thin so it reads as
 * chrome, not as part of any one app's design.
 */
export default function AppTabs() {
  const appId = useAppShell((s) => s.appId)
  const setAppId = useAppShell((s) => s.setAppId)

  return (
    <div
      data-guide="app-tabs"
      className="shrink-0 bg-surface border-b border-line"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-6xl mx-auto flex">
        {TABS.map((t) => {
          const active = t.id === appId
          return (
            <button
              key={t.id}
              onClick={() => setAppId(t.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex-1 min-w-0 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon name={t.icon} className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.name}</span>
              {active && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
