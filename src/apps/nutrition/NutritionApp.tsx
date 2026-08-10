import { useCallback, useEffect, useRef, useState } from 'react'
import TodayPage from './pages/TodayPage'
import MealLogPage from './pages/MealLogPage'
import AppSwitcher from '../../components/AppSwitcher'
import SyncModal from '../../components/SyncModal'
import ErrorBoundary from '../../components/ErrorBoundary'
import Icon, { type IconName } from '../../components/ui/Icon'
import { useAppShell } from '../../lib/appShell'
import { getTheme, toggleTheme, type Theme } from '../../lib/theme'

const PAGES: {
  key: string
  label: string
  short: string
  icon: IconName
  el: React.ReactNode
}[] = [
  { key: 'today', label: 'היום', short: 'היום', icon: 'flame', el: <TodayPage /> },
  {
    key: 'log',
    label: 'יומן אכילה',
    short: 'יומן',
    icon: 'utensils',
    el: <MealLogPage />,
  },
]

export default function NutritionApp() {
  const [index, setIndex] = useState(0)
  const [syncOpen, setSyncOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => getTheme())
  const openGuide = useAppShell((s) => s.openGuide)
  const guideNav = useAppShell((s) => s.guideNav)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(0)

  const onScroll = () => {
    const el = scrollerRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.min(
      PAGES.length - 1,
      Math.max(0, Math.round(Math.abs(el.scrollLeft) / el.clientWidth)),
    )
    indexRef.current = i
    setIndex(i)
  }

  const goTo = useCallback((i: number) => {
    const panel = scrollerRef.current?.children[i] as HTMLElement | undefined
    // tapping the already-active page scrolls it back to the top
    if (i === indexRef.current && panel) {
      panel.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    indexRef.current = i
    setIndex(i)
  }, [])

  // follow the guide's navigation requests aimed at this app
  useEffect(() => {
    if (guideNav && guideNav.app === 'nutrition') goTo(guideNav.page)
  }, [guideNav, goTo])

  const multiPage = PAGES.length > 1

  return (
    <div className="flex flex-col h-[100dvh]">
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 md:h-16 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <AppSwitcher />
            {multiPage && <span className="hidden md:block h-6 w-px bg-line" />}
          </div>
          {multiPage && (
            <nav className="hidden md:flex flex-1 gap-2 min-w-0">
              {PAGES.map((p, i) => {
                const active = i === index
                return (
                  <button
                    key={p.key}
                    data-guide={`nut-nav-${p.key}`}
                    onClick={() => goTo(i)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-semibold text-base transition ${
                      active
                        ? 'bg-ink text-bg shadow-card'
                        : 'text-muted hover:text-ink hover:bg-ink/5'
                    }`}
                  >
                    <Icon name={p.icon} className="w-5 h-5" />
                    <span>{p.label}</span>
                  </button>
                )
              })}
            </nav>
          )}
          <div className={multiPage ? 'flex-1 md:hidden' : 'flex-1'} />
          <button
            onClick={openGuide}
            className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl text-muted hover:text-ink hover:bg-ink/5 transition"
            title="מדריך שימוש"
            aria-label="מדריך שימוש"
          >
            <Icon name="help" className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTheme(toggleTheme())}
            className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl text-muted hover:text-ink hover:bg-ink/5 transition"
            aria-label={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
          >
            {theme === 'dark' ? (
              <Icon name="sun" className="w-5 h-5" />
            ) : (
              <Icon name="moon" className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setSyncOpen(true)}
            className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl text-muted hover:text-ink hover:bg-ink/5 transition"
            aria-label="גיבוי וסנכרון"
          >
            <Icon name="cloud" className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar"
      >
        {PAGES.map((p) => (
          <section
            key={p.key}
            className="min-w-full h-full overflow-y-auto snap-start no-scrollbar"
          >
            <div className="px-4 sm:px-6 md:px-10 py-6 max-w-6xl mx-auto">
              <ErrorBoundary>{p.el}</ErrorBoundary>
            </div>
          </section>
        ))}
      </div>

      {multiPage && (
        <nav
          className="md:hidden bg-surface/95 backdrop-blur border-t border-line"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex">
            {PAGES.map((p, i) => {
              const active = i === index
              return (
                <button
                  key={p.key}
                  data-guide={`nut-nav-${p.key}`}
                  onClick={() => goTo(i)}
                  className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-[11px] font-semibold transition ${
                    active ? 'text-accent' : 'text-muted'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span
                    className={`px-4 py-1 rounded-full transition ${active ? 'bg-accent-soft' : ''}`}
                  >
                    <Icon name={p.icon} className="w-6 h-6" />
                  </span>
                  <span>{p.short}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}

      <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />
    </div>
  )
}
